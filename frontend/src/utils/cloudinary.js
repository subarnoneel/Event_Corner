// Cloudinary Upload Utility
// Upload images directly to Cloudinary using unsigned upload

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Upload an image to Cloudinary
 * @param {File} file - The image file to upload
 * @param {string} folder - The folder to upload to (default: 'event-corner')
 * @returns {Promise<{url: string, public_id: string}>} The uploaded image URL and public ID
 */
export const uploadToCloudinary = async (file, folder = 'event-corner') => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const data = await response.json();
    return {
      url: data.secure_url,
      public_id: data.public_id,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Upload a profile picture to Cloudinary
 * @param {File} file - The image file to upload
 * @returns {Promise<{url: string, public_id: string}>}
 */
export const uploadProfilePicture = async (file) => {
  return uploadToCloudinary(file, 'event-corner/profiles');
};

/**
 * Upload a banner image to Cloudinary
 * @param {File} file - The image file to upload
 * @returns {Promise<{url: string, public_id: string}>}
 */
export const uploadBanner = async (file) => {
  return uploadToCloudinary(file, 'event-corner/banners');
};

export { CLOUDINARY_CLOUD_NAME };
