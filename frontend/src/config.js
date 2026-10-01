export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Uploaded files are either full URLs (Cloudinary) or older local paths like /uploads/x.pdf
export const fileUrl = (path) => {
  if (!path) return '';
  return /^https?:\/\//i.test(path) ? path : `${API_URL}${path}`;
};