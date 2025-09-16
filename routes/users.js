const express = require('express');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all students (Teacher only)
router.get('/students', auth, requireRole(['teacher']), async (req, res) => {
    try {
        const students = await User.find({ role: 'student' })
            .select('-password')
            .sort({ fullName: 1 });

        res.json({ students });
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ message: 'Server error fetching students' });
    }
});

// Get all teachers (for reference)
router.get('/teachers', auth, async (req, res) => {
    try {
        const teachers = await User.find({ role: 'teacher' })
            .select('-password')
            .sort({ fullName: 1 });

        res.json({ teachers });
    } catch (error) {
        console.error('Get teachers error:', error);
        res.status(500).json({ message: 'Server error fetching teachers' });
    }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
    try {
        const { fullName, department, studentId } = req.body;
        const updateData = { fullName, department };

        // Only allow students to update studentId
        if (req.user.role === 'student' && studentId) {
            updateData.studentId = studentId;
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            message: 'Profile updated successfully',
            user
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error updating profile' });
    }
});

module.exports = router;
