import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CF_ACCESS_KEY,
    secretAccessKey: process.env.CF_SECRET_KEY
  }
});

// upload helper
export const uploadToS3 = async (bucket, key, fileBuffer, mimeType) => {
  // ensure key has no leading/trailing spaces
  const safeKey = String(key).replace(/\s+/g, ' ').trim();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: safeKey,
    Body: fileBuffer,
    ContentType: mimeType
  });

  try {
    await r2.send(command);
  } catch (err) {
    console.error('[R2 Upload:error]', { bucket, key: safeKey, error: err?.message });
    throw err;
  }

  // Prefer explicit public domain if provided (to avoid account-id mismatch)
  const publicDomain = process.env.CF_R2_PUBLIC_DOMAIN || `${process.env.CF_ACCOUNT_ID}.r2.dev`;
  // For Public Development URLs (pub-*.r2.dev), bucket is not part of the path
  const isPubDev = /^pub-.*\.r2\.dev$/i.test(publicDomain);
  const publicUrl = isPubDev
    ? `https://${publicDomain}/${safeKey}`
    : `https://${publicDomain}/${bucket}/${safeKey}`;
  return publicUrl;
};
