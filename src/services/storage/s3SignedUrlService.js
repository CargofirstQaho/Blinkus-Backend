import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import s3Client from '../../config/s3.js';

const BUCKET = process.env.AWS_S3_BUCKET_NAME;
const EXPIRY  = parseInt(process.env.AWS_S3_SIGNED_URL_EXPIRY || '86400', 10);

export async function getSignedUrl(key) {
  if (!key) return null;
  return awsGetSignedUrl(
    s3Client, 
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: EXPIRY }
  );
}
