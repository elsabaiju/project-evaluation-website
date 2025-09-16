const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        console.log('Auth middleware - Headers:', req.headers);
        const token = req.header('Authorization')?.replace('Bearer ', '');
        console.log('Auth middleware - Token:', token ? 'Present' : 'Missing');
        
        if (!token) {
            console.log('Auth middleware - No token provided');
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Auth middleware - Decoded token:', decoded);
        
        const user = await User.findById(decoded.userId).select('-password');
        console.log('Auth middleware - User found:', user ? user.username : 'Not found');
        
        if (!user) {
            console.log('Auth middleware - User not found in database');
            return res.status(401).json({ message: 'Token is not valid' });
        }

        req.user = user;
        console.log('Auth middleware - Success, proceeding to next middleware');
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ message: 'Token is not valid' });
    }
};

const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        next();
    };
};

module.exports = { auth, requireRole };
