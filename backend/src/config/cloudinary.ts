import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

const isMock = 
  !process.env.CLOUDINARY_CLOUD_NAME || 
  process.env.CLOUDINARY_CLOUD_NAME.startsWith('mock_') ||
  !process.env.CLOUDINARY_API_KEY ||
  process.env.CLOUDINARY_API_KEY.startsWith('mock_');

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

export const uploadToCloudinary = async (fileBufferOrDataUrl: string | Buffer, folder: string): Promise<string> => {
  if (isMock) {
    // Save locally and return server relative URL
    const filename = `${folder}_${Date.now()}_${Math.round(Math.random() * 1E9)}.jpg`;
    const uploadDir = path.join(__dirname, '../../uploads');
    const filePath = path.join(uploadDir, filename);

    if (typeof fileBufferOrDataUrl === 'string' && fileBufferOrDataUrl.startsWith('data:')) {
      // Decode dataurl
      const base64Data = fileBufferOrDataUrl.split(',')[1];
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    } else if (Buffer.isBuffer(fileBufferOrDataUrl)) {
      fs.writeFileSync(filePath, fileBufferOrDataUrl);
    } else if (typeof fileBufferOrDataUrl === 'string') {
      // Treat as path or buffer
      fs.copyFileSync(fileBufferOrDataUrl, filePath);
    }

    // Return mock url (which will serve static files from /uploads)
    const port = process.env.PORT || 5000;
    return `http://localhost:${port}/uploads/${filename}`;
  } else {
    // Actual Cloudinary upload
    try {
      let content = '';
      if (typeof fileBufferOrDataUrl === 'string') {
        content = fileBufferOrDataUrl;
      } else {
        content = `data:image/jpeg;base64,${fileBufferOrDataUrl.toString('base64')}`;
      }

      const response = await cloudinary.uploader.upload(content, {
        folder: `shinestaff/${folder}`,
        resource_type: 'image'
      });
      return response.secure_url;
    } catch (error) {
      console.error('Cloudinary Upload Error:', error);
      throw new Error('Image upload failed');
    }
  }
};
