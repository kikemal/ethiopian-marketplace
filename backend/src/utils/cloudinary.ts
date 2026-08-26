import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import { toStoredMediaPath } from './mediaUrl';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

const uploadsDir = path.join(process.cwd(), 'uploads');

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

export async function uploadImageBuffer(
  buffer: Buffer,
  folder = 'ethiopian-marketplace'
): Promise<string> {
  if (!isCloudinaryConfigured()) {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filename = `${randomUUID()}.jpg`;
    fs.writeFileSync(path.join(uploadsDir, filename), buffer);
    // Store a relative path so each environment can serve via its own BACKEND_PUBLIC_URL.
    return toStoredMediaPath(filename);
  }

  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto:good' }],
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload failed'));
          return;
        }
        resolve(result.secure_url);
      }
    );
    bufferToStream(buffer).pipe(upload);
  });
}

export async function uploadPrivateKyc(buffer: Buffer): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured');
  }
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: 'ethiopian-marketplace/kyc',
        resource_type: 'image',
        type: 'private',
        transformation: [{ width: 1600, height: 1600, crop: 'limit' }],
      },
      (error, result) => {
        if (error || !result?.public_id) {
          reject(error ?? new Error('Cloudinary KYC upload failed'));
          return;
        }
        resolve(`cloudinary:${result.public_id}`);
      }
    );
    bufferToStream(buffer).pipe(upload);
  });
}

export async function fetchPrivateKyc(
  publicId: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!isCloudinaryConfigured()) return null;
  const url = cloudinary.url(publicId, {
    resource_type: 'image',
    type: 'private',
    sign_url: true,
    secure: true,
  });
  const res = await fetch(url);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  return { buffer: buf, contentType };
}

