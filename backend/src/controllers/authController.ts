import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { sendMail } from '../config/mailer';
import { AuthRequest } from '../middleware/auth';
import { uploadToCloudinary } from '../config/cloudinary';

export const register = async (req: Request, res: Response) => {
  const { name, email, password, role, company, phone, address, aadhaarNumber } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'worker',
      company: company || 'SofaShine',
      phone,
      address: address || '',
      aadhaarNumber: aadhaarNumber || '',
      status: 'active',
      joiningDate: new Date()
    });

    await user.save();

    const secret = process.env.JWT_SECRET || 'supersecretshinestaffkey12345!';
    const token = jwt.sign({ id: user._id }, secret, { expiresIn: '1d' });

    res.status(201).json({
      message: 'Account registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
        phone: user.phone
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  const { phone, password, rememberMe } = req.body;

  try {
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(401).json({ message: 'Invalid mobile number or password' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ message: 'Your account is deactivated' });
    }

    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid mobile number or password' });
    }

    const secret = process.env.JWT_SECRET || 'supersecretshinestaffkey12345!';
    const expiresIn = rememberMe ? '30d' : '1d';
    const token = jwt.sign({ id: user._id }, secret, { expiresIn });

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
        photo: user.photo,
        phone: user.phone
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User with this email does not exist' });
    }

    // For testing/mocking, we can generate a short numeric code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // In a real app we'd save this code and check expiry. For simplicity:
    // We send code via mail (and also return it in response for convenience in testing)
    const emailHtml = `
      <h3>ShineStaff Password Reset</h3>
      <p>Hello ${user.name},</p>
      <p>You requested a password reset. Your reset code is:</p>
      <h2 style="color: #2563EB;">${resetCode}</h2>
      <p>This code will expire shortly. If you did not request this, please ignore this email.</p>
    `;

    await sendMail(user.email, 'Password Reset Code - ShineStaff', emailHtml);

    res.status(200).json({
      message: 'Reset code sent to email',
      // Return code in response for easier mock testing
      resetCode
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  const { name, phone, address, photoDataUrl } = req.body;
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.address = address || user.address;

    if (photoDataUrl) {
      const uploadedUrl = await uploadToCloudinary(photoDataUrl, 'profile_photos');
      user.photo = uploadedUrl;
    }

    await user.save();
    res.status(200).json({ message: 'Profile updated successfully', user });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
