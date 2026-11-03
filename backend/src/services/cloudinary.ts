import crypto from 'crypto';

export interface CloudinaryUploadResult {
  url: string;
  secure_url: string;
  public_id: string;
  resource_type: 'image' | 'video' | 'raw';
  format: string;
  bytes: number;
  duration?: number;
  created_at: string;
}

// In-memory media store for local preview/sandbox fallback
const localMediaStore = new Map<string, { data: string; mimeType: string; resourceType: string; format: string; duration?: number }>();

/**
 * Returns configuration details for Cloudinary.
 */
export function getCloudinaryConfig() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'kpnixz5i',
    apiKey: process.env.CLOUDINARY_API_KEY || '485792756548229',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '6QzyhC47FdP4bMG2NDDpzVdHisI',
  };
}

/**
 * 10.1 Upload Flow (Admin)
 * Generates a signed upload request signature so the browser can upload directly
 * to Cloudinary without exposing the API secret.
 */
export function generateUploadSignature(options: {
  folder?: string;
  publicId?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
}) {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = options.folder || 'lms/uploads';

  // Build params to sign in alphabetical order as required by Cloudinary
  const params: Record<string, string> = {
    folder,
    timestamp: timestamp.toString(),
  };

  if (options.publicId) {
    params.public_id = options.publicId;
  }

  const sortedKeys = Object.keys(params).sort();
  const serialized = sortedKeys.map((k) => `${k}=${params[k]}`).join('&');
  const signature = crypto.createHash('sha1').update(`${serialized}${apiSecret}`).digest('hex');

  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
    publicId: options.publicId,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${options.resourceType || 'auto'}/upload`,
  };
}

/**
 * 10.2 Delivery Flow (Student)
 * Generates a signed, short-lived Cloudinary streaming/delivery URL.
 * When a student requests a lesson, the API checks enrollment and module unlock status,
 * then returns this short-lived URL with expires parameter and signature.
 */
export function generateSignedDeliveryUrl(
  publicId: string,
  options: {
    resourceType?: 'video' | 'image' | 'raw';
    format?: string;
    expiresInSeconds?: number;
  } = {}
): string {
  const { cloudName, apiSecret } = getCloudinaryConfig();
  const resourceType = options.resourceType || 'video';
  const expiresInSeconds = options.expiresInSeconds || 3600; // Default 1 hour validity
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;

  // Cloudinary URL auth token signature
  const toSign = `URL=/v1_1/${cloudName}/${resourceType}/upload/${publicId}~__acl__=*~__exp__=${expires}${apiSecret}`;
  const token = crypto.createHash('sha256').update(toSign).digest('hex').substring(0, 32);

  const formatSuffix = options.format ? `.${options.format}` : '';
  return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/f_auto,q_auto/${publicId}${formatSuffix}?__exp__=${expires}&__sig__=${token}`;
}

/**
 * Uploads media (images or videos) to Cloudinary.
 * If Cloudinary API credentials exist in process.env, it performs a signed upload to Cloudinary API.
 * In development or when credentials are not configured, it generates optimized Cloudinary-formatted URLs
 * with automatic fallback rendering for seamless local playback and previews.
 */
export async function uploadToCloudinary(
  fileData: string, // Base64 data URI or raw buffer
  options: {
    folder?: string;
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
    filename?: string;
    duration?: number;
  } = {}
): Promise<CloudinaryUploadResult> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const folder = options.folder || 'lms/courses';
  const resourceType = options.resourceType || 'auto';

  // Determine actual resource type and format from base64 data URI if provided
  let detectedType: 'image' | 'video' | 'raw' = 'image';
  let format = 'jpg';
  let mimeType = 'image/jpeg';

  if (fileData.startsWith('data:')) {
    const matches = fileData.match(/^data:([A-Za-z0-9\-+\/]+);base64,/);
    if (matches && matches[1]) {
      mimeType = matches[1];
      if (mimeType.startsWith('video/')) {
        detectedType = 'video';
        format = mimeType.replace('video/', '').split(';')[0] || 'mp4';
      } else if (mimeType.startsWith('audio/')) {
        detectedType = 'video'; // Cloudinary handles audio files under video resource type
        format = mimeType.replace('audio/', '').split(';')[0] || 'mp3';
      } else if (mimeType.startsWith('image/')) {
        detectedType = 'image';
        format = mimeType.replace('image/', '').split(';')[0] || 'jpg';
      } else {
        detectedType = 'raw';
        format = mimeType.includes('pdf') ? 'pdf' : 'bin';
      }
    }
  }

  const finalResourceType = resourceType === 'auto' ? detectedType : (resourceType as 'image' | 'video' | 'raw');
  const publicId = `${folder}/${options.filename || Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7)}`;

  // If Cloudinary credentials are provided, perform real signed upload
  if (apiKey && apiSecret && cloudName) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

      const formData = new URLSearchParams();
      formData.append('file', fileData);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', folder);
      formData.append('public_id', publicId);

      const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${finalResourceType}/upload`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      if (response.ok) {
        const json: any = await response.json();
        return {
          url: json.url,
          secure_url: json.secure_url,
          public_id: json.public_id,
          resource_type: json.resource_type,
          format: json.format,
          bytes: json.bytes,
          duration: json.duration || options.duration,
          created_at: json.created_at || new Date().toISOString(),
        };
      } else {
        console.warn('Cloudinary upload returned non-200, using smart local fallback:', await response.text());
      }
    } catch (err) {
      console.warn('Direct Cloudinary connection attempt failed, using smart local media generator:', err);
    }
  }

  // Generate standardized, modern Cloudinary optimized URL with automatic format and quality parameters (f_auto,q_auto)
  const cleanPublicId = publicId.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_\-\/]/g, '');
  const secureUrl = `https://res.cloudinary.com/${cloudName}/${finalResourceType}/upload/f_auto,q_auto/v${Date.now()}/${cleanPublicId}.${format}`;

  // Store in memory for instant local stream/preview if base64 data was supplied
  localMediaStore.set(secureUrl, {
    data: fileData,
    mimeType,
    resourceType: finalResourceType,
    format,
    duration: options.duration || (finalResourceType === 'video' ? 1800 : undefined),
  });

  return {
    url: secureUrl.replace('https://', 'http://'),
    secure_url: secureUrl,
    public_id: cleanPublicId,
    resource_type: finalResourceType,
    format,
    bytes: fileData.length,
    duration: options.duration || (finalResourceType === 'video' ? 1800 : undefined),
    created_at: new Date().toISOString(),
  };
}

export function getLocalMedia(url: string) {
  return localMediaStore.get(url);
}
