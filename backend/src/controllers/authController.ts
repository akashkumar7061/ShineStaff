import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import RefreshToken from '../models/RefreshToken';
import { sendMail } from '../config/mailer';
import { AuthRequest } from '../middleware/auth';
import { uploadToCloudinary } from '../config/cloudinary';

// Helper to parse cookies manually from headers
const parseCookies = (req: Request) => {
  const list: { [key: string]: string } = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      list[parts.shift()!.trim()] = decodeURI(parts.join('='));
    });
  }
  return list;
};

// Helper to generate and save both access and refresh tokens
const generateTokens = async (userId: string, res: Response) => {
  const secret = process.env.JWT_SECRET || 'supersecretshinestaffkey12345!';
  
  // Access Token expires in 15 minutes
  const accessToken = jwt.sign({ id: userId }, secret, { expiresIn: '15m' });
  
  // Refresh Token expires in 30 days
  const refreshTokenString = jwt.sign({ id: userId }, secret, { expiresIn: '30d' });

  // Save the refresh token in the database
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  
  const newRefreshToken = new RefreshToken({
    token: refreshTokenString,
    userId,
    expiresAt
  });
  await newRefreshToken.save();

  // Set the refresh token as an HttpOnly, Secure, SameSite=None cookie for cross-domain support
  res.cookie('refreshToken', refreshTokenString, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });

  // Set a non-HttpOnly cookie to notify the client that a refresh token exists
  res.cookie('hasRefreshToken', 'true', {
    secure: true,
    sameSite: 'none',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });

  return { accessToken, refreshToken: refreshTokenString };
};

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

    const { accessToken, refreshToken } = await generateTokens(user._id.toString(), res);

    res.status(201).json({
      message: 'Account registered successfully',
      token: accessToken,
      refreshToken,
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
  const { phone, password } = req.body;

  try {
    const user = await User.findOne({
      $or: [
        { phone },
        { phone: `+91${phone}` },
        { phone: phone.replace(/^\+91/, '') }
      ]
    });
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

    const { accessToken, refreshToken } = await generateTokens(user._id.toString(), res);

    res.status(200).json({
      token: accessToken,
      refreshToken,
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

export const refresh = async (req: Request, res: Response) => {
  const cookies = parseCookies(req);
  const token = cookies.refreshToken || req.body?.refreshToken;

  if (!token) {
    return res.status(401).json({ message: 'Refresh token not found' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'supersecretshinestaffkey12345!';
    const decoded = jwt.verify(token, secret) as { id: string };

    const savedToken = await RefreshToken.findOne({ token, userId: decoded.id });
    if (!savedToken) {
      return res.status(401).json({ message: 'Refresh token invalid or revoked' });
    }

    if (savedToken.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: savedToken._id });
      return res.status(401).json({ message: 'Refresh token expired' });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.status === 'inactive') {
      return res.status(401).json({ message: 'User not found or deactivated' });
    }

    const newAccessToken = jwt.sign({ id: user._id }, secret, { expiresIn: '15m' });
    res.status(200).json({ token: newAccessToken });
  } catch (error: any) {
    return res.status(401).json({ message: 'Invalid refresh token', error: error.message });
  }
};

export const logout = async (req: Request, res: Response) => {
  const cookies = parseCookies(req);
  const token = cookies.refreshToken || req.body?.refreshToken;

  if (token) {
    try {
      await RefreshToken.deleteOne({ token });
    } catch (err) {
      console.error('Failed to revoke refresh token:', err);
    }
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });
  res.clearCookie('hasRefreshToken', {
    secure: true,
    sameSite: 'none'
  });

  res.status(200).json({ message: 'Logged out successfully' });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User with this email does not exist' });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

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
