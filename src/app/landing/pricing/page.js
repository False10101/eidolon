'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth0 } from '@auth0/auth0-react';
import CreditIcon from '@/app/CreditIcon';

// ─── Data ──────────────────────────────────────────────────────────────────────
const NOTE_TIERS = [
    {
        tier: 'Tier 1',
        price: 9,
        range: 'Under 25k tokens',
        volume: '~1–1.5 hr lecture',
        example: 'Short seminar, single topic class',
        color: '#22c55e',
        bg: 'rgba(34,197,94,0.08)',
        border: 'rgba(34,197,94,0.2)',
    },
    {
        tier: 'Tier 2',
        price: 17,
        range: '25k – 50k tokens',
        volume: '~1.5–3 hr lecture',
        example: 'Standard university lecture — most notes land here',
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.08)',
        border: 'rgba(245,158,11,0.2)',
        default: true,
    },
    {
        tier: 'Tier 3',
        price: 29,
        range: '50k – 75k tokens',
        volume: '~3–4 hr lecture',
        example: 'Long lecture, dense content, multiple topics',
        color: '#f97316',
        bg: 'rgba(249,115,22,0.08)',
        border: 'rgba(249,115,22,0.2)',
    },
    {
        tier: 'Tier 4',
        price: 37,
        range: '75k – 100k tokens',
        volume: '~4+ hr lecture',
        example: 'Full-day session or very dense material. Hard cap at 100k tokens.',
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.08)',
        border: 'rgba(239,68,68,0.2)',
    },
];

const TRANSCRIPT_TIERS = [
    { tier: 'Tier 1', turbo: 2.4, premium: 5.4, range: 'Under 1 hour' },
    { tier: 'Tier 2', turbo: 4.8, premium: 10.8, range: '1 – 2 hours' },
    { tier: 'Tier 3', turbo: 7.2, premium: 16.2, range: '2 – 3 hours' },
    { tier: 'Tier 4', turbo: '2.4', premium: '5.4', range: 'Over 3 hours', perHr: true },
];

const FAQS = [
    {
        q: 'How do I know which tier my note will be?',
        a: 'You don\'t need to figure it out — Eidolon calculates it automatically based on your input. Most standard university lectures (1.5–3 hrs) land in Tier 2 at 17 Credits.',
    },
    {
        q: 'Do I get charged if generation fails?',
        a: 'No. Your balance is only deducted when a note is successfully completed. If something goes wrong mid-generation, you are not charged.',
    },
    {
        q: 'Do credits expire?',
        a: 'Never. Credits carry over indefinitely — top up once and use them whenever.',
    },
    {
        q: 'What if I already have a transcript?',
        a: 'You skip transcription entirely. Just upload your transcript and only pay the note generation cost.',
    },
];

// ─── Components ────────────────────────────────────────────────────────────────
function FaqItem({ q, a }) {
    const [open, setOpen] = React.useState(false);
    return (
        <div
            style={{
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                overflow: 'hidden',
            }}
        >
            <button
                onClick={() => setOpen(v => !v)}
                style={{
                    width: '100%', textAlign: 'left', background: 'none', border: 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 20px', cursor: 'pointer', gap: 12,
                }}
            >
                <span style={{ fontSize: 13, color: open ? '#e8e8ed' : '#b4b4c2' }}>{q}</span>
                <svg
                    viewBox="0 0 24 24"
                    style={{ width: 14, height: 14, flexShrink: 0, stroke: '#7a7a8a', fill: 'none', strokeWidth: 2, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>
            {open && (
                <p style={{ padding: '0 20px 14px', fontSize: 13, color: '#7a7a8a', lineHeight: 1.75 }}>
                    {a}
                </p>
            )}
        </div>
    );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
import React from 'react';

export default function LandingPricing() {
    const router = useRouter();
    const { loginWithRedirect } = useAuth0();

    const handleSignIn = () => {
        loginWithRedirect({ authorizationParams: { connection: 'google-oauth2' } });
    };

    return (
        <div style={{
            background: '#0c0c0e',
            color: '#e8e8ed',
            minHeight: '100vh',
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
        }}>

            {/* ── Nav ── */}
            <nav style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 40px', borderBottom: '1px solid rgba(255,255,255,0.07)',
                position: 'sticky', top: 0, background: '#0c0c0e', zIndex: 10,
            }}>
                <button
                    onClick={() => router.push('/landing')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                    <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: '#9a9aaa', fill: 'none', strokeWidth: 2 }}>
                        <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                    </svg>
                    <span style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: '#00d4c8' }}>Eidolon</span>
                </button>
                <button
                    onClick={handleSignIn}
                    style={{ background: '#00d4c8', border: 'none', color: '#0c0c0e', padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                    Sign in
                </button>
            </nav>

            <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px 80px' }}>

                {/* ── Header ── */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ marginBottom: 48 }}>
                    <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 32, fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 10 }}>
                        Simple pricing.<br />
                        <span style={{ color: '#00d4c8' }}>Pay per note.</span>
                    </h1>
                    <p style={{ fontSize: 14, color: '#9a9aaa', lineHeight: 1.7, maxWidth: 480 }}>
                        No subscription. No monthly fees. Top up credits and spend them whenever you generate.
                        <strong> $1.00 USD securely buys 100 Credits.</strong>
                    </p>
                </motion.div>

                {/* ── Note tiers ── */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }} style={{ marginBottom: 40 }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7a7a8a', marginBottom: 14 }}>
                        Inclass note generation
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {NOTE_TIERS.map((t) => (
                            <div
                                key={t.tier}
                                style={{
                                    background: t.default ? t.bg : '#111116',
                                    border: `1px solid ${t.default ? t.border : 'rgba(255,255,255,0.07)'}`,
                                    borderRadius: 12,
                                    padding: '16px 20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16,
                                    position: 'relative',
                                }}
                            >
                                {/* Tier badge */}
                                <div style={{
                                    background: t.bg, border: `1px solid ${t.border}`,
                                    color: t.color, fontSize: 10, padding: '3px 10px',
                                    borderRadius: 20, letterSpacing: '0.04em', flexShrink: 0, fontWeight: 500,
                                }}>
                                    {t.tier}
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, color: '#e8e8ed', marginBottom: 2, fontWeight: 500 }}>
                                        {t.range}
                                        <span style={{ fontSize: 11, color: '#7a7a8a', fontWeight: 400, marginLeft: 8 }}>
                                            {t.volume}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 12, color: '#7a7a8a', lineHeight: 1.5 }}>
                                        {t.example}
                                    </div>
                                </div>

                                {/* Price */}
                                <div style={{ fontSize: 20, fontWeight: 500, color: t.default ? t.color : '#e8e8ed', fontFamily: 'monospace', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {t.price} <CreditIcon size={18} />
                                </div>

                                {/* Default badge */}
                                {t.default && (
                                    <div style={{
                                        position: 'absolute', top: -10, right: 16,
                                        background: t.color, color: '#0c0c0e',
                                        fontSize: 9, fontWeight: 700, padding: '2px 10px',
                                        borderRadius: 20, letterSpacing: '0.05em', textTransform: 'uppercase',
                                    }}>
                                        Most common
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <p style={{ marginTop: 10, fontSize: 12, color: '#5a5a6a' }}>
                        Tier is calculated automatically — you'll see it before confirming any generation.
                    </p>
                </motion.div>

                {/* ── Transcription ── */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.14 }} style={{ marginBottom: 40 }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7a7a8a', marginBottom: 14 }}>
                        Transcription (optional — skip if you already have a transcript)
                    </div>
                    <div style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
                        {/* Header */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 0, padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ fontSize: 11, color: '#5a5a6a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Duration</span>
                            <span style={{ fontSize: 11, color: '#5a5a6a', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Turbo</span>
                            <span style={{ fontSize: 11, color: '#5a5a6a', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Premium</span>
                        </div>
                        {TRANSCRIPT_TIERS.map((t, i) => (
                            <div key={t.tier} style={{
                                display: 'grid', gridTemplateColumns: '1fr 80px 80px',
                                padding: '12px 20px',
                                borderBottom: i < TRANSCRIPT_TIERS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                            }}>
                                <div>
                                    <span style={{ fontSize: 13, color: '#b4b4c2' }}>{t.range}</span>
                                    {t.perHr && <span style={{ fontSize: 11, color: '#5a5a6a', marginLeft: 6 }}>per hour after</span>}
                                </div>
                                <div style={{ textAlign: 'right', fontSize: 13, color: '#e8e8ed', fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                                    {t.turbo}{t.perHr ? '/hr' : ''} <CreditIcon size={12} />
                                </div>
                                <div style={{ textAlign: 'right', fontSize: 13, color: '#e8e8ed', fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                                    {t.premium}{t.perHr ? '/hr' : ''} <CreditIcon size={12} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <p style={{ marginTop: 10, fontSize: 12, color: '#5a5a6a' }}>
                        Turbo = faster, slightly less accurate. Premium = better accuracy for complex audio.
                    </p>
                </motion.div>

                {/* ── Top up nudge ── */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} style={{ marginBottom: 40 }}>
                    <div style={{
                        background: 'rgba(0,212,200,0.06)', border: '1px solid rgba(0,212,200,0.15)',
                        borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                    }}>
                        <div>
                            <div style={{ fontSize: 14, color: '#e8e8ed', fontWeight: 500, marginBottom: 4 }}>
                                Start with 170 Credits — about 10 notes
                            </div>
                            <div style={{ fontSize: 12.5, color: '#9a9aaa', lineHeight: 1.6 }}>
                                Top up once and use them for the whole semester. Credits never expire.
                            </div>
                        </div>
                        <button
                            onClick={handleSignIn}
                            style={{
                                background: '#00d4c8', border: 'none', color: '#0c0c0e',
                                padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                                cursor: 'pointer', flexShrink: 0,
                            }}
                        >
                            Get started
                        </button>
                    </div>
                </motion.div>

                {/* ── FAQ ── */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.26 }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7a7a8a', marginBottom: 14 }}>
                        Common questions
                    </div>
                    <div style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
                        {FAQS.map((f, i) => <FaqItem key={i} {...f} />)}
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
