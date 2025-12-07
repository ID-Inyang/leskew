// server/middleware/uploadAvatar.js
import upload from '../config/multer.js';
import cloudinary from '../config/cloudinary.js';
import fs from 'fs';

// Local upload middleware
export const uploadAvatarLocal = upload.single('avatar');

// Cloudinary upload middleware
export const uploadAvatarCloudinary = (req, res, next) => {
  upload.single('avatar')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    
    if (!req.file) {
      return next(); // No file uploaded, continue
    }
    
    try {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'leskew/avatars',
        width: 500,
        height: 500,
        crop: 'fill',
        gravity: 'face'
      });
      
      // Delete local file
      fs.unlinkSync(req.file.path);
      
      // Add Cloudinary info to request
      req.cloudinaryResult = {
        url: result.secure_url,
        publicId: result.public_id
      };
      
      next();
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      // Clean up local file
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ message: 'Failed to upload image' });
    }
  });
};

// Use Cloudinary if available, otherwise local
export const uploadAvatar = process.env.CLOUDINARY_CLOUD_NAME 
  ? uploadAvatarCloudinary 
  : uploadAvatarLocal;