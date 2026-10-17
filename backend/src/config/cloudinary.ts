import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

const isMock = 
  !process.env.CLOUDINARY_CLOUD_NAME || 
  process.env.CLOUDINARY_CLOUD_NAME.startsWith('mock_') ||
  !process.env.CLOUDINARY_API_KEY ||
  process.env.CLOUDINARY_API_KEY.startsWith('mock_') ||
  !process.env.CLOUDINARY_API_SECRET ||
  process.env.CLOUDINARY_API_SECRET.startsWith('mock_');

if (!isMock) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
} else {
  console.log('Using Local Storage (Mock Cloudinary Mode)');
  const uploadDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

export const saveLocally = (data: string | Buffer, folder: string): string => {
  const filename = `${folder}_${Date.now()}_${Math.round(Math.random() * 1E9)}.jpg`;
  const uploadDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const filePath = path.join(uploadDir, filename);

  let buffer: Buffer;
  if (Buffer.isBuffer(data)) {
    buffer = data;
  } else if (typeof data === 'string') {
    if (data.includes(',')) {
      buffer = Buffer.from(data.split(',')[1], 'base64');
    } else {
      buffer = Buffer.from(data, 'base64');
    }
  } else {
    buffer = Buffer.from('');
  }

  fs.writeFileSync(filePath, buffer);
  const baseUrl = process.env.BACKEND_URL ? process.env.BACKEND_URL.replace(/\/+$/, '') : '';
  return baseUrl ? `${baseUrl}/uploads/${filename}` : `/uploads/${filename}`;
};

export const uploadToCloudinary = async (fileBufferOrDataUrl: string | Buffer, folder: string): Promise<string> => {
  if (!fileBufferOrDataUrl) return '';

  // Already uploaded web URL - preserve directly
  if (typeof fileBufferOrDataUrl === 'string' && (fileBufferOrDataUrl.startsWith('http://') || fileBufferOrDataUrl.startsWith('https://') || fileBufferOrDataUrl.startsWith('/uploads/'))) {
    return fileBufferOrDataUrl;
  }

  if (isMock) {
    return saveLocally(fileBufferOrDataUrl, folder);
  } else {
    try {
      let content = '';
      if (typeof fileBufferOrDataUrl === 'string') {
        content = fileBufferOrDataUrl.startsWith('data:') 
          ? fileBufferOrDataUrl 
          : `data:image/jpeg;base64,${fileBufferOrDataUrl}`;
      } else {
        content = `data:image/jpeg;base64,${fileBufferOrDataUrl.toString('base64')}`;
      }

      const response = await cloudinary.uploader.upload(content, {
        folder: `shinestaff/${folder}`,
        resource_type: 'image',
        timeout: 25000
      });
      return response.secure_url;
    } catch (error) {
      console.warn('[Cloudinary] Upload failed, falling back to local file storage:', error);
      return saveLocally(fileBufferOrDataUrl, folder);
    }
  }
};
