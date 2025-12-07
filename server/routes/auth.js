// server/routes/auth.js - Update register route
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import { uploadAvatar } from '../middleware/uploadAvatar.js';

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @route   POST /api/auth/register
// @desc    Register user/vendor with avatar
router.post('/register', uploadAvatar, [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['customer', 'vendor']).withMessage('Role must be customer or vendor')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email, password, phone, role } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Prepare avatar data
    let avatarData = {};
    if (req.file) {
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        // Cloudinary upload
        avatarData = {
          url: req.cloudinaryResult.url,
          publicId: req.cloudinaryResult.publicId
        };
      } else {
        // Local upload
        const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
        avatarData = {
          url: `${baseUrl}/${req.file.path.replace(/\\/g, '/')}`,
          publicId: ''
        };
      }
    } else {
      // Generate default avatar based on name
      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=256`;
      avatarData = {
        url: defaultAvatar,
        publicId: ''
      };
    }

    // Create user
    user = new User({
      name,
      email,
      phone,
      passwordHash,
      role,
      avatar: avatarData
    });

    await user.save();

    // If vendor, create vendor profile
    if (role === 'vendor') {
      const vendor = new Vendor({
        userId: user._id,
        businessName: req.body.businessName || `${name}'s Business`,
        address: req.body.address || '',
        contactInfo: req.body.contactInfo || '',
        serviceCategories: req.body.serviceCategories || [],
        isApproved: false
      });
      await vendor.save();
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
export default router;