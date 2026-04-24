import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { readdir, stat, unlink } from "fs/promises";
import { join } from "path";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_DUMP_BUCKET_NAME;
const MAX_AGE_MS = 10 * 60 * 1000;
const INTERVAL_MS = 3 * 60 * 1000;

const TMP_DIRS = [
  join(process.cwd(), "tmp-convert"),
  join(process.cwd(), "tmp-transcript"),
  join(process.cwd(), "tmp-slips"),
];

async function cleanR2() {
  try {
    const now = Date.now();
    let continuationToken;

    do {
      const res = await r2.send(
        new ListObjectsV2Command({
          Bucket: BUCKET,
          ContinuationToken: continuationToken,
        })
      );

      const toDelete = (res.Contents || [])
        .filter((obj) => now - new Date(obj.LastModified).getTime() > MAX_AGE_MS)
        .map((obj) => ({ Key: obj.Key }));

      if (toDelete.length > 0) {
        await r2.send(
          new DeleteObjectsCommand({
            Bucket: BUCKET,
            Delete: { Objects: toDelete },
          })
        );
        console.log(`[R2] Deleted ${toDelete.length} file(s)`);
      }

      continuationToken = res.IsTruncated ? res.NextContinuationToken : null;
    } while (continuationToken);
  } catch (err) {
    console.error("[R2] Cleanup error:", err.message);
  }
}

async function cleanTmpDirs() {
  const now = Date.now();

  for (const dir of TMP_DIRS) {
    try {
      const files = await readdir(dir);
      let deleted = 0;

      for (const file of files) {
        const filePath = join(dir, file);
        try {
          const s = await stat(filePath);
          if (now - s.mtimeMs > MAX_AGE_MS) {
            await unlink(filePath);
            deleted++;
          }
        } catch {
          // file already gone, skip
        }
      }

      if (deleted > 0) console.log(`[TMP] ${dir}: deleted ${deleted} file(s)`);
    } catch {
      // dir doesn't exist yet, skip
    }
  }
}

async function runCleanup() {
  console.log(`[Cleanup] Running at ${new Date().toISOString()}`);
  await Promise.all([cleanR2(), cleanTmpDirs()]);
}

runCleanup();
setInterval(runCleanup, INTERVAL_MS);