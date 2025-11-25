/**
 * Image optimization utilities for Cloudinary and external images
 */

// Cloudinary cloud name from environment
const CLOUDINARY_CLOUD_NAME = 'dj8qukx9d';

/**
 * Check if a URL is a Cloudinary URL
 */
export function isCloudinaryUrl(url: string): boolean {
  return url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
}

/**
 * Optimize a Cloudinary image URL with transformations
 * @param url - Original Cloudinary URL
 * @param options - Optimization options
 * @returns Optimized URL with transformations applied
 */
export function optimizeCloudinaryUrl(
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | number;
    format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
    crop?: 'fill' | 'fit' | 'scale' | 'thumb';
  } = {}
): string {
  if (!isCloudinaryUrl(url)) {
    return url;
  }

  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
  } = options;

  // Build transformation string
  const transforms: string[] = [];
  
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  transforms.push(`c_${crop}`);
  transforms.push(`q_${quality}`);
  transforms.push(`f_${format}`);

  const transformString = transforms.join(',');

  // Insert transformations into Cloudinary URL
  // Format: https://res.cloudinary.com/cloud_name/image/upload/TRANSFORMS/path
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) {
    return url;
  }

  const beforeUpload = url.substring(0, uploadIndex + 8); // includes '/upload/'
  const afterUpload = url.substring(uploadIndex + 8);

  return `${beforeUpload}${transformString}/${afterUpload}`;
}

/**
 * Get an optimized image URL for display
 * Handles both Cloudinary and regular URLs
 * @param url - Original image URL
 * @param size - Preset size ('thumbnail' | 'card' | 'hero' | 'full')
 */
export function getOptimizedImageUrl(
  url: string | undefined | null,
  size: 'thumbnail' | 'card' | 'hero' | 'full' = 'card'
): string {
  if (!url) {
    return '';
  }

  // Size presets for different use cases
  const sizePresets = {
    thumbnail: { width: 100, height: 100 },
    card: { width: 400, height: 250 },
    hero: { width: 1200, height: 600 },
    full: { width: 1600, height: 900 },
  };

  const preset = sizePresets[size];

  // If it's a Cloudinary URL, apply optimizations
  if (isCloudinaryUrl(url)) {
    return optimizeCloudinaryUrl(url, {
      ...preset,
      quality: 'auto',
      format: 'auto',
    });
  }

  // For Unsplash URLs, add size parameters
  if (url.includes('unsplash.com')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}w=${preset.width}&h=${preset.height}&fit=crop&auto=format`;
  }

  return url;
}

/**
 * Generate srcSet for responsive images
 * Only works with Cloudinary URLs
 */
export function generateSrcSet(url: string): string | undefined {
  if (!isCloudinaryUrl(url)) {
    return undefined;
  }

  const widths = [400, 800, 1200, 1600];
  
  return widths
    .map((w) => {
      const optimized = optimizeCloudinaryUrl(url, {
        width: w,
        quality: 'auto',
        format: 'auto',
      });
      return `${optimized} ${w}w`;
    })
    .join(', ');
}
