// server/routes/users.js - COMPLETE VERSION
import express from 'express';
import { protect } from '../middleware/auth.js';
import { uploadAvatar } from '../middleware/uploadAvatar.js';
import User from '../models/User.js';
import cloudinary from '../config/cloudinary.js';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// ================ GET USER PROFILE ================

// @route   GET /api/users/profile
// @desc    Get current user profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// ================ UPDATE USER PROFILE (THIS IS THE MISSING ROUTE!) ================

// @route   PUT /api/users/profile
// @desc    Update user profile
router.put('/profile', protect, [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional().isString().withMessage('Phone must be a string'),
  body('currentPassword').optional().isString(),
  body('newPassword').optional().isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }

  try {
    const { name, email, phone, currentPassword, newPassword } = req.body;
    
    console.log('📝 PUT /api/users/profile - Updating user profile');
    console.log('User ID:', req.user._id);
    console.log('Update data:', req.body);

    // Find user
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ 
          success: false,
          message: 'Email is already registered' 
        });
      }
      user.email = email;
    }

    // Update basic info
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;

    // Handle password change if requested
    if (currentPassword && newPassword) {
      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      
      if (!isPasswordValid) {
        return res.status(400).json({ 
          success: false,
          message: 'Current password is incorrect' 
        });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
      
      console.log('🔑 Password updated for user:', user.email);
    }

    // Save updated user
    await user.save();

    // Get user without password hash
    const updatedUser = await User.findById(user._id).select('-passwordHash');

    console.log('✅ Profile updated for user:', updatedUser.email);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: 'Validation error', 
        errors 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ================ UPDATE AVATAR ================

// @route   PUT /api/users/avatar
// @desc    Update user avatar
router.put('/avatar', protect, uploadAvatar, async (req, res) => {
  try {
    console.log('🖼️ PUT /api/users/avatar - Updating avatar');
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
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
            console.log('🗑️ Deleted old avatar from Cloudinary');
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
      return res.status(400).json({ 
        success: false,
        message: 'No image uploaded' 
      });
    }

    // Update user avatar
    user.avatar = newAvatarData;
    await user.save();

    console.log('✅ Avatar updated for user:', user.email);

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      avatar: user.avatar
    });
  } catch (error) {
    console.error('❌ Update avatar error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// ================ DELETE AVATAR ================

// @route   DELETE /api/users/avatar
// @desc    Remove user avatar
router.delete('/avatar', protect, async (req, res) => {
  try {
    console.log('🗑️ DELETE /api/users/avatar - Removing avatar');
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Delete from Cloudinary if exists
    if (user.avatar.publicId && process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        await cloudinary.uploader.destroy(user.avatar.publicId);
        console.log('🗑️ Deleted avatar from Cloudinary:', user.avatar.publicId);
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

    console.log('✅ Avatar removed for user:', user.email);

    res.json({
      success: true,
      message: 'Avatar removed successfully',
      avatar: user.avatar
    });
  } catch (error) {
    console.error('❌ Remove avatar error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// ================ GET USER BY ID (ADMIN) ================

// @route   GET /api/users/:id
// @desc    Get user by ID (admin or self)
router.get('/:id', protect, async (req, res) => {
  try {
    // Check if user is admin or accessing their own profile
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized' 
      });
    }
    
    const user = await User.findById(req.params.id).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// ================ DELETE USER (ADMIN) ================

// @route   DELETE /api/users/:id
// @desc    Delete user (admin only)
router.delete('/:id', protect, async (req, res) => {
  try {
    // Only admin can delete users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Admin access required' 
      });
    }
    
    // Cannot delete self
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot delete your own account' 
      });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    // Delete avatar from Cloudinary if exists
    if (user.avatar.publicId && process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        await cloudinary.uploader.destroy(user.avatar.publicId);
      } catch (error) {
        console.error('Error deleting avatar from Cloudinary:', error);
      }
    }
    
    await User.findByIdAndDelete(req.params.id);
    
    console.log(`✅ User deleted: ${user.email} (by admin: ${req.user.email})`);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// ================ GET ALL USERS (ADMIN) ================

// @route   GET /api/users
// @desc    Get all users (admin only)
router.get('/', protect, async (req, res) => {
  try {
    // Only admin can get all users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Admin access required' 
      });
    }
    
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

export default router;