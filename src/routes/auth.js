const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email and password',
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters',
            });
        }

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists',
            });
        }

        // Create new user
        const user = await User.create({
            name,
            email,
            password,
            phone,
        });

        // Generate token
        const token = generateToken(user.id);

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    createdAt: user.createdAt,
                },
                token,
            },
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password',
            });
        }

        // Find user by email (includes password)
        const user = await User.findByEmail(email);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        // Check password
        const isMatch = await User.comparePassword(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        // Check if user is blocked
        if (user.blocked) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been blocked. Please contact support.',
                blocked: true
            });
        }

        // Generate token
        const token = generateToken(user.id);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    createdAt: user.createdAt,
                },
                token,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
});

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    avatar: user.avatar,
                    createdAt: user.createdAt,
                },
            },
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching profile',
        });
    }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { name, phone } = req.body;

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Update user
        const updatedUser = await User.update(req.user.id, { name, phone });

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: {
                    id: updatedUser.id,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    phone: updatedUser.phone,
                    createdAt: updatedUser.createdAt,
                },
            },
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating profile',
        });
    }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide current and new password',
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters',
            });
        }

        // Get user with password
        const user = await User.findByEmail(req.user.email);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Verify current password
        const isMatch = await User.comparePassword(currentPassword, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect',
            });
        }

        // Update password
        await User.updatePassword(req.user.id, newPassword);

        res.json({
            success: true,
            message: 'Password changed successfully',
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error changing password',
        });
    }
});

// @route   GET /api/auth/invoices
// @desc    Get logged-in user's invoices
// @access  Private
router.get('/invoices', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByIdWithPassword(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        const invoices = user.invoices || [];

        res.json({
            success: true,
            count: invoices.length,
            invoices: invoices,
        });
    } catch (error) {
        console.error('Get user invoices error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching invoices',
        });
    }
});

// Nodemailer configuration
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'exceptionzofficial@gmail.com',
        pass: 'qurb pdnk eqcw dfqv'
    }
});

// In-memory OTP storage (in production, use Redis or database)
const otpStore = new Map();

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// @route   POST /api/auth/send-otp
// @desc    Send OTP to user's email for password reset
// @access  Public
router.post('/send-otp', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide your email address',
            });
        }

        // Find user by email
        const user = await User.findByEmail(email);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this email address',
            });
        }

        // Generate OTP
        const otp = generateOTP();

        // Store OTP with 10 minute expiration
        otpStore.set(email.toLowerCase(), {
            otp,
            expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
            userId: user.id,
            userName: user.name
        });

        // Send OTP via email
        const mailOptions = {
            from: '"Exceptionz" <exceptionzofficial@gmail.com>',
            to: email,
            subject: '🔐 Password Reset OTP - Exceptionz',
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 2px; border-radius: 16px;">
                    <div style="background: #ffffff; border-radius: 14px; padding: 40px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #667eea; margin: 0; font-size: 28px;">Exceptionz</h1>
                            <p style="color: #888; margin-top: 5px;">Password Reset</p>
                        </div>
                        
                        <p style="color: #333; font-size: 16px; line-height: 1.6;">Hello <strong>${user.name}</strong>,</p>
                        
                        <p style="color: #555; font-size: 15px; line-height: 1.6;">
                            We received a request to reset your password. Use the OTP below to verify your identity:
                        </p>
                        
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; margin: 25px 0; text-align: center;">
                            <p style="margin: 0 0 10px 0; color: #fff; font-size: 14px; opacity: 0.9;">Your One-Time Password</p>
                            <p style="margin: 0; color: #fff; font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: monospace;">
                                ${otp}
                            </p>
                        </div>
                        
                        <p style="color: #e74c3c; font-size: 14px; line-height: 1.6; text-align: center;">
                            ⏱️ This OTP expires in <strong>10 minutes</strong>
                        </p>
                        
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        
                        <p style="color: #999; font-size: 12px; text-align: center;">
                            If you didn't request this password reset, please ignore this email.
                        </p>
                        
                        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
                            © ${new Date().getFullYear()} Exceptionz. All rights reserved.
                        </p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        res.json({
            success: true,
            message: 'OTP has been sent to your email address',
        });

    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP. Please try again later.',
        });
    }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP for password reset
// @access  Public
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and OTP',
            });
        }

        const storedData = otpStore.get(email.toLowerCase());

        if (!storedData) {
            return res.status(400).json({
                success: false,
                message: 'OTP expired or not found. Please request a new OTP.',
            });
        }

        if (Date.now() > storedData.expiresAt) {
            otpStore.delete(email.toLowerCase());
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new OTP.',
            });
        }

        if (storedData.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP. Please try again.',
            });
        }

        // OTP verified - mark as verified but keep for password reset
        storedData.verified = true;
        otpStore.set(email.toLowerCase(), storedData);

        res.json({
            success: true,
            message: 'OTP verified successfully. You can now reset your password.',
        });

    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify OTP. Please try again.',
        });
    }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password after OTP verification
// @access  Public
router.post('/reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and new password',
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters',
            });
        }

        const storedData = otpStore.get(email.toLowerCase());

        if (!storedData || !storedData.verified) {
            return res.status(400).json({
                success: false,
                message: 'Please verify OTP first before resetting password.',
            });
        }

        // Update password
        await User.updatePassword(storedData.userId, newPassword);

        // Clear OTP data
        otpStore.delete(email.toLowerCase());

        res.json({
            success: true,
            message: 'Password reset successfully. You can now login with your new password.',
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password. Please try again.',
        });
    }
});

// @route   POST /api/auth/request-deletion
// @desc    Request account deletion (sends email to admin)
// @access  Public
router.post('/request-deletion', async (req, res) => {
    try {
        const { name, email, reason } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide your name and email address',
            });
        }

        // Send email notification to admin
        const mailOptions = {
            from: '"Exceptionz App" <exceptionzofficial@gmail.com>',
            to: 'exceptionzofficial@gmail.com',
            subject: '🗑️ Account Deletion Request - Exceptionz',
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px 12px 0 0;">
                        <h1 style="color: #fff; margin: 0; font-size: 24px;">Account Deletion Request</h1>
                    </div>
                    <div style="background: #fff; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e9ecef; border-top: none;">
                        <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
                            A user has requested to delete their account and all associated data.
                        </p>
                        
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666; width: 120px;"><strong>Name:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;"><strong>Email:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${email}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;"><strong>Reason:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${reason || 'Not provided'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; color: #666;"><strong>Requested At:</strong></td>
                                <td style="padding: 10px; color: #333;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                            </tr>
                        </table>
                        
                        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                            <p style="margin: 0; color: #856404; font-size: 14px;">
                                <strong>⚠️ Action Required:</strong> Please verify this request and delete the user's account and data from DynamoDB within 48 hours to comply with data protection regulations.
                            </p>
                        </div>
                        
                        <p style="color: #999; font-size: 12px; margin-top: 20px;">
                            This is an automated message from the Exceptionz App.
                        </p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        // Also send confirmation to user
        const userMailOptions = {
            from: '"Exceptionz Support" <exceptionzofficial@gmail.com>',
            to: email,
            subject: '✅ Account Deletion Request Received - Exceptionz',
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 2px; border-radius: 16px;">
                    <div style="background: #ffffff; border-radius: 14px; padding: 40px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #667eea; margin: 0; font-size: 28px;">Exceptionz</h1>
                            <p style="color: #888; margin-top: 5px;">Account Deletion Request</p>
                        </div>
                        
                        <p style="color: #333; font-size: 16px; line-height: 1.6;">Hello <strong>${name}</strong>,</p>
                        
                        <p style="color: #555; font-size: 15px; line-height: 1.6;">
                            We have received your request to delete your Exceptionz account and all associated data.
                        </p>
                        
                        <div style="background: #d4edda; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
                            <p style="margin: 0; color: #155724; font-size: 16px;">
                                ✅ Your request has been submitted successfully!
                            </p>
                        </div>
                        
                        <p style="color: #555; font-size: 14px; line-height: 1.6;">
                            Our team will process your request within <strong>48 hours</strong>. You will receive a confirmation email once your account has been deleted.
                        </p>
                        
                        <p style="color: #555; font-size: 14px; line-height: 1.6;">
                            If you did not make this request, please contact us immediately at <a href="mailto:exceptionzofficial@gmail.com" style="color: #667eea;">exceptionzofficial@gmail.com</a>.
                        </p>
                        
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        
                        <p style="color: #999; font-size: 12px; text-align: center;">
                            © ${new Date().getFullYear()} Exceptionz. All rights reserved.
                        </p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(userMailOptions);

        res.json({
            success: true,
            message: 'Account deletion request submitted successfully',
        });

    } catch (error) {
        console.error('Request deletion error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit request. Please try again.',
        });
    }
});

module.exports = router;

