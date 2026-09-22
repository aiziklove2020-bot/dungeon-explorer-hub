const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dya5cymnl';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'TBDSM-ING';

// Used by ForumImageUpload (blog post image attachments) via ForumPostEditor.
export const uploadForumImage = async (file) => {
  if (!file.type.startsWith('image/')) throw new Error('File must be an image');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be under 5 MB');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );
  const data = await res.json();
  if (res.ok && data?.secure_url) return data.secure_url;
  throw new Error(data?.error?.message || 'Image upload failed');
};
