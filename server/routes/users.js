// server/routes/users.js - Add avatar update
import express from 'express';
import { protect } from '../middleware/auth.js';
import { uploadAvatar } from '../middleware/uploadAvatar.js';
import User from '../models/User.js';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();

// Add this to server/routes/users.js
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/avatar
// @desc    Update user avatar
router.put('/avatar', protect, uploadAvatar, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prepare new avatar data
    let newAvatarData = {};
    
    if (req.file) {
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        // Cloudinary upload
        newAvatarData = {
          url: req.cloudinaryResult.url,
          publicId: req.cloudinaryResult.publicId
        };
        
        // Delete old avatar from Cloudinary if exists
        if (user.avatar.publicId) {
          try {
            await cloudinary.uploader.destroy(user.avatar.publicId);
          } catch (error) {
            console.error('Error deleting old avatar:', error);
          }
        }
      } else {
        // Local upload
        const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
        newAvatarData = {
          url: `${baseUrl}/${req.file.path.replace(/\\/g, '/')}`,
          publicId: ''
        };
      }
    } else {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    // Update user avatar
    user.avatar = newAvatarData;
    await user.save();

    res.json({
      message: 'Avatar updated successfully',
      avatar: user.avatar
    });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/users/avatar
// @desc    Remove user avatar
router.delete('/avatar', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete from Cloudinary if exists
    if (user.avatar.publicId && process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        await cloudinary.uploader.destroy(user.avatar.publicId);
      } catch (error) {
        console.error('Error deleting avatar from Cloudinary:', error);
      }
    }

    // Set default avatar
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&size=256`;
    user.avatar = {
      url: defaultAvatar,
      publicId: ''
    };
    
    await user.save();

    res.json({
      message: 'Avatar removed successfully',
      avatar: user.avatar
    });
  } catch (error) {
    console.error('Remove avatar error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;