import { PutObjectCommand } from '@aws-sdk/client-s3';
import s3Client from '../../config/s3.js';

const BUCKET = process.env.AWS_S3_BUCKET_NAME;

export async function uploadFile({ buffer, mimetype, key }) {
  await s3Client.send(
    new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         key,
      Body:        buffer,
      ContentType: mimetype,
    })
  );
  return { key };
}
