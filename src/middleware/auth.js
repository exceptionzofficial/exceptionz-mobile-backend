const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.',
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'default-secret-key'
        );

        // Check if user exists and is not blocked
        const User = require('../models/User');
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
            });
        }

        if (user.blocked) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been blocked. Please contact support.',
                blocked: true
            });
        }

        // Add user info to request
        req.user = { id: decoded.id, email: user.email };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token',
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error during authentication',
        });
    }
};

module.exports = authMiddleware;
