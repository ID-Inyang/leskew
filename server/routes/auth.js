// server/routes/auth.js - COMPLETE VERSION with login
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

// ================ REGISTER ROUTE ================

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
        isApproved: process.env.NODE_ENV === 'development'  // Auto-approve vendors upon registration
      });
      await vendor.save();
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
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
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// ================ LOGIN ROUTE ================

// @route   POST /api/auth/login
// @desc    Authenticate user & get token (THIS IS THE MISSING ROUTE!)
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }

  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login attempt for:', email);

    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // If vendor, check if profile exists and get vendor data
    let vendorProfile = null;
    if (user.role === 'vendor') {
      vendorProfile = await Vendor.findOne({ userId: user._id });
    }

    // Generate token
    const token = generateToken(user._id);
    
    console.log('✅ Login successful for:', email);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      },
      vendorProfile: vendorProfile ? {
        businessName: vendorProfile.businessName,
        isApproved: vendorProfile.isApproved,
        hasProfile: true
      } : {
        hasProfile: false
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// ================ GET CURRENT USER ================

// @route   GET /api/auth/me
// @desc    Get current user profile
router.get('/me', async (req, res) => {
  try {
    // Check for token in header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'No token, authorization denied' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user
    const user = await User.findById(decoded.id).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // If vendor, get vendor profile
    let vendorProfile = null;
    if (user.role === 'vendor') {
      vendorProfile = await Vendor.findOne({ userId: user._id });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      },
      vendorProfile: vendorProfile ? {
        businessName: vendorProfile.businessName,
        isApproved: vendorProfile.isApproved,
        hasProfile: true
      } : {
        hasProfile: false
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// ================ LOGOUT ROUTE ================

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// ================ CHECK EMAIL AVAILABILITY ================

// @route   POST /api/auth/check-email
// @desc    Check if email is available
router.post('/check-email', [
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    res.json({
      success: true,
      available: !user,
      message: user ? 'Email already registered' : 'Email is available'
    });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

export default router;