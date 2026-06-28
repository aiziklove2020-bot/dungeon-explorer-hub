

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dya5cymnl';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'TBDSM-ING';

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
}

export const uploadPartyImage = async (file, partyId) => {
  try {
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Image size must be less than 5MB');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    
    if (response.ok && data?.secure_url) {
      return {
        url: data.secure_url,
        publicId: data.public_id || null,
        assetId: data.asset_id || null
      };
    }

    throw new Error(data?.error?.message || 'Failed to upload image');
  } catch (error) {
    throw error;
  }
};
