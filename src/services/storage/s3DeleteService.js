import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import s3Client from '../../config/s3.js';

const BUCKET = process.env.AWS_S3_BUCKET_NAME;

export async function deleteFile(key) {
  if (!key) return;
  await s3Client.send(
    new DeleteObjectCommand({ Bucket: BUCKET, Key: key })
  );
}
