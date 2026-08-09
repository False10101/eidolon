import { NextResponse } from "next/server";
import { transcriptorQueue } from "@/lib/queue";
import { rateLimit, checkRateLimit, acquireConcurrencyLock, releaseConcurrencyLock, getClientIp } from "@/lib/rateLimit";
import { mkdir, unlink } from 'fs/promises';
import { createWriteStream } from 'fs';
import { verifyUserData } from "@/lib/auth/verify";
import { sql } from "@/lib/storage/db";
import getAudioDuration from "@/lib/audio-converter-queues/duration";
import path from "path";
import Busboy from 'busboy';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { normalizeParticipantIds, refundGroupTranscriptHold } from '@/lib/groupGeneration';
import { resolveCategorization } from '@/lib/categories';
import { ceilCredits, getGroupPerParticipantPrice, getGroupTotalPrice } from '@/lib/groupPricing';

const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;
const DEFAULT_MODEL = 'openai/whisper-large-v3-turbo';
const ALLOWED_AUDIO_EXTS = new Set(['.mp3', '.wav', '.m4a', '.mp4', '.ogg', '.flac', '.aac', '.webm']);
const PREMIUM_MODEL = 'openai/whisper-large-v3';
const TURBO_MODEL = 'openai/whisper-large-v3-turbo';
const PREMIUM_PER_MINUTE_RATE = 0.09;
const TURBO_PER_MINUTE_RATE = 0.04;

function normalizeTranscriptionModel(value) {
    const model = String(value || '').trim().toLowerCase();

    if (!model) return null;

    if (
        model === 'premium' ||
        model === 'whisper-v3' ||
        model === 'openai/whisper-large-v3'
    ) {
        return PREMIUM_MODEL;
    }

    if (
        model === 'turbo' ||
        model === 'whisper-v3-turbo' ||
        model === 'openai/whisper-large-v3-turbo'
    ) {
        return TURBO_MODEL;
    }

    return null;
}

function getPerMinuteRate(model) {
    return model === PREMIUM_MODEL ? PREMIUM_PER_MINUTE_RATE : TURBO_PER_MINUTE_RATE;
}

export function getTranscriptGroupPrice(durationSeconds, model, participantCount) {
    const durationMinutes = durationSeconds / 60;
    const rate = getPerMinuteRate(model);
    const basePrice = ceilCredits(durationMinutes * rate);
    return getGroupPerParticipantPrice(basePrice, participantCount);
}

async function cleanupTempFile(inputPath) {
    if (!inputPath) return;
    await unlink(inputPath).catch(() => {});
}

export async function POST(req) {
    let inputPath = null;
    let userId = null;
    let transcriptId = null;
    let jobQueued = false;

    try {
        userId = await verifyUserData(req);

        if (userId === null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const ip = getClientIp(req);
        if (ip) {
            const isUnderLimit = await checkRateLimit(ip, 10, 60);
            if (!isUnderLimit) {
                return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
            }
        }

        const limited = await rateLimit(`rl:transcript:${userId}`, 10, 60);
        if (limited) return limited;

        const hasLock = await acquireConcurrencyLock(userId, 'transcript_group', 12 * 60 * 60);
        if (!hasLock) {
            return NextResponse.json({ error: 'You already have a generation in progress. Please wait for it to complete.' }, { status: 429 });
        }

        const contentLength = Number(req.headers.get('content-length'));
        if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES) {
            await releaseConcurrencyLock(userId, 'transcript_group');
            return NextResponse.json({ error: 'File is too large. Maximum size is 500MB.' }, { status: 400 });
        }

        const inProgress = await sql`
            SELECT 1 FROM note
            WHERE user_id = ${userId}
            AND status IN ('pending', 'reading', 'generating', 'saving')
            UNION ALL
            SELECT 1 FROM note
            WHERE status IN ('pending', 'reading', 'generating', 'saving')
            AND id IN (
                SELECT note_id FROM note_access WHERE user_id = ${userId}
            )
            UNION ALL
            SELECT 1 FROM exam_prep
            WHERE user_id = ${userId}
            AND status IN ('Pending', 'Reading', 'Generating', 'Saving')
            UNION ALL
            SELECT 1 FROM exam_prep
            WHERE status IN ('Pending', 'Reading', 'Generating', 'Saving')
            AND id IN (
                SELECT exam_prep_id FROM exam_prep_access WHERE user_id = ${userId}
            )
            UNION ALL
            SELECT 1 FROM transcript
            WHERE user_id = ${userId}
            AND status IN ('Initializing', 'Transcribing')
            LIMIT 1
        `;
        if (inProgress.length > 0) {
            await releaseConcurrencyLock(userId, 'transcript_group');
            return NextResponse.json({ error: 'You already have a generation in progress. Please wait for it to complete.' }, { status: 400 });
        }

        const counts = await transcriptorQueue.getJobCounts('wait', 'active');
        if (counts.wait + counts.active >= 11) {
            await releaseConcurrencyLock(userId, 'transcript_group');
            return NextResponse.json({ error: "Queue is full" }, { status: 429 });
        }

        const tempDir = './tmp-transcript';
        await mkdir(tempDir, { recursive: true });

        const headers = Object.fromEntries(req.headers);
        const busboy = Busboy({
            headers,
            limits: {
                files: 1,
                fileSize: MAX_UPLOAD_BYTES,
            },
        });

        let fileName = '';
        let label = '';
        let model = DEFAULT_MODEL;
        let outputFormat = 'text';
        let selectedMemberIds = [];
        let requestedCategorizationId = null;
        let sawFile = false;
        let writeStream = null;
        let uploadError = null;

        const uploadPromise = new Promise((resolve, reject) => {
            busboy.on('file', (name, file, info) => {
                sawFile = true;
                fileName = path.basename(info.filename);
                const fileExt = path.extname(fileName).toLowerCase();

                if (!ALLOWED_AUDIO_EXTS.has(fileExt)) {
                    uploadError = new Error('Invalid file type. Allowed: mp3, wav, m4a, mp4, ogg, flac, aac, webm');
                    file.resume();
                    return;
                }

                if (!label) {
                    label = fileName.split('.')[0];
                }

                inputPath = path.join(tempDir, `input-${Date.now()}-${fileName}`);
                writeStream = createWriteStream(inputPath);
                file.pipe(writeStream);

                file.on('limit', () => {
                    uploadError = new Error('File is too large. Maximum size is 500MB.');
                    writeStream.destroy(uploadError);
                });

                file.on('error', reject);
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });

            busboy.on('field', (name, val) => {
                if (name === 'label' && val) label = String(val).slice(0, 255);
                if (name === 'model') {
                    const normalizedModel = normalizeTranscriptionModel(val);
                    if (normalizedModel) model = normalizedModel;
                }
                if (name === 'outputFormat' && ['text', 'verbose_json'].includes(val)) outputFormat = val;
                if (name === 'member_ids') {
                    try {
                        selectedMemberIds = JSON.parse(val);
                    } catch (e) {
                        console.error('Failed to parse member_ids', e);
                    }
                }
                if (name === 'categorization_id' && val) requestedCategorizationId = val;
            });

            busboy.on('filesLimit', () => reject(new Error('Only one file is allowed.')));
            busboy.on('error', reject);
            busboy.on('finish', () => {
                if (uploadError) return reject(uploadError);
                if (!sawFile || !writeStream) return reject(new Error('No file provided'));
            });
        });

        const nodeStream = Readable.fromWeb(req.body);
        nodeStream.pipe(busboy);
        await uploadPromise;
        selectedMemberIds = normalizeParticipantIds(selectedMemberIds, userId);

        const durationSeconds = await getAudioDuration(inputPath);
        const durationHours = durationSeconds / 3600;

        if (durationHours <= 0) {
            await cleanupTempFile(inputPath);
            inputPath = null;
            await releaseConcurrencyLock(userId, 'transcript_group');
            return NextResponse.json({ error: 'Could not determine audio duration.' }, { status: 400 });
        }

        if (durationHours >= 10) {
            await cleanupTempFile(inputPath);
            inputPath = null;
            await releaseConcurrencyLock(userId, 'transcript_group');
            return NextResponse.json({ error: "Audio duration exceeds our 10-hour limit." }, { status: 400 });
        }

        if (selectedMemberIds.length === 0) {
            await cleanupTempFile(inputPath);
            inputPath = null;
            await releaseConcurrencyLock(userId, 'transcript_group');
            return NextResponse.json({ error: "Please select at least one participant." }, { status: 400 });
        }

        const [membership] = await sql`SELECT group_id FROM "group_member" WHERE user_id = ${userId} LIMIT 1`;
        if (!membership) {
            await cleanupTempFile(inputPath);
            inputPath = null;
            await releaseConcurrencyLock(userId, 'transcript_group');
            return NextResponse.json({ error: "You are not in a group." }, { status: 400 });
        }

        const categorizationId = await resolveCategorization(userId, requestedCategorizationId);
        if (requestedCategorizationId && !categorizationId) {
            await cleanupTempFile(inputPath);
            inputPath = null;
            await releaseConcurrencyLock(userId, 'transcript_group');
            return NextResponse.json({ error: "Invalid category." }, { status: 400 });
        }

        const members = await sql`
            SELECT gm.user_id, u.balance
            FROM "group_member" gm
            JOIN "user" u ON u.id = gm.user_id
            WHERE gm.group_id = ${membership.group_id}
            AND gm.user_id = ANY(${selectedMemberIds}::bigint[])
        `;

        if (members.length !== selectedMemberIds.length) {
            await cleanupTempFile(inputPath);
            inputPath = null;
            await releaseConcurrencyLock(userId, 'transcript_group');
            return NextResponse.json({ error: "Some selected members are not in this group." }, { status: 400 });
        }

        const basePrice = ceilCredits((durationSeconds / 60) * getPerMinuteRate(model));
        const perParticipantPrice = getGroupPerParticipantPrice(basePrice, members.length);
        const totalPrice = getGroupTotalPrice(basePrice, members.length);

        const broke = members.find(m => {
            return parseFloat(m.balance) < perParticipantPrice;
        });

        if (broke) {
            await cleanupTempFile(inputPath);
            inputPath = null;
            await releaseConcurrencyLock(userId, 'transcript_group');
            return NextResponse.json({ error: "A selected participant has insufficient balance." }, { status: 400 });
        }

        const publicId = uuidv4();
        const nextUnlockPrice = getTranscriptGroupPrice(durationSeconds, model, members.length + 1);

        await sql.begin(async (tx) => {
            const [transcript] = await tx`
                INSERT INTO transcript (
                    user_id, label, status, charge_amount, created_at, filename, public_id,
                    duration, model, output_format, vad_enabled, group_id, generation_type,
                    is_trial, unlock_price, categorization_id
                )
                VALUES (
                    ${userId}, ${label}, 'Initializing', ${totalPrice}, NOW(), ${fileName}, ${publicId},
                    ${durationSeconds}, ${model}, ${outputFormat || 'text'}, false, ${membership.group_id},
                    'group', false, ${nextUnlockPrice}, ${categorizationId}
                )
                RETURNING id
            `;
            transcriptId = transcript.id;

            for (const member of members) {
                const [held] = await tx`
                    UPDATE "user"
                    SET balance = balance - ${perParticipantPrice}
                    WHERE id = ${member.user_id} AND balance >= ${perParticipantPrice}
                    RETURNING id
                `;
                if (!held) throw new Error(`Member ${member.user_id} has insufficient balance.`);

                await tx`
                    INSERT INTO transcript_access (
                        transcript_id, user_id, paid_amount, is_original, unlocked_at
                    )
                    VALUES (${transcriptId}, ${member.user_id}, ${perParticipantPrice}, 1, NOW())
                `;
            }
        });

        const job = await transcriptorQueue.add('transcribe', {
            inputPath,
            userId,
            label,
            model,
            fileName,
            outputFormat,
            transcriptionPrice: perParticipantPrice,
            totalPrice,
            groupId: membership.group_id,
            selectedMemberIds,
            generationType: 'group',
            isTrial: false,
            transcriptId,
            publicId,
            categorizationId,
            concurrencyScope: 'transcript_group',
        });

        jobQueued = true;
        inputPath = null;
        return NextResponse.json({ jobId: job.id })

    } catch (error) {
        if (transcriptId && !jobQueued) await refundGroupTranscriptHold(sql, transcriptId).catch(() => {});
        if (userId) await releaseConcurrencyLock(userId, 'transcript_group');
        await cleanupTempFile(inputPath);
        console.error(error);

        const message = error instanceof Error ? error.message : '';
        if (
            message === 'No file provided' ||
            message === 'Only one file is allowed.' ||
            message === 'File is too large. Maximum size is 500MB.' ||
            message === 'Invalid file type. Allowed: mp3, wav, m4a, mp4, ogg, flac, aac, webm'
        ) {
            return NextResponse.json({ error: message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
