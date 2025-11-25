import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'crypto';

const isReplitEnvironment = () => {
  return process.env.REPL_ID !== undefined;
};

export class CloudinaryStorageService {
  constructor() {
    // Configure Cloudinary whenever credentials are available
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
    }
  }

  async getUploadSignature(): Promise<{
    signature: string;
    timestamp: number;
    cloudName: string;
    apiKey: string;
    publicId: string;
    folder: string;
  }> {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'tripfolio';
    const publicId = `${folder}/${randomUUID()}`;

    // Sign the request with folder parameter
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        public_id: publicId,
        folder,
      },
      process.env.CLOUDINARY_API_SECRET!
    );

    return {
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
      apiKey: process.env.CLOUDINARY_API_KEY!,
      publicId,
      folder,
    };
  }

  normalizeImageUrl(rawUrl: string): string {
    if (!rawUrl) return rawUrl;
    
    // If it's already a Cloudinary URL, return as-is
    if (rawUrl.includes('cloudinary.com')) {
      return rawUrl;
    }
    
    // If it's a Replit object storage path, return as-is
    if (rawUrl.startsWith('/objects/')) {
      return rawUrl;
    }
    
    return rawUrl;
  }

  isCloudinaryUrl(url: string): boolean {
    return url?.includes('cloudinary.com') || false;
  }
}

export const shouldUseCloudinary = () => {
  // Use Cloudinary whenever credentials are available (handles HEIC conversion automatically)
  return process.env.CLOUDINARY_CLOUD_NAME && 
         process.env.CLOUDINARY_API_KEY && 
         process.env.CLOUDINARY_API_SECRET;
};
