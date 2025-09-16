const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images, documents, and archives are allowed'));
        }
    }
});

// Create assignment (Teacher only)
router.post('/', auth, requireRole(['teacher']), [
    body('title').trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
    body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
    body('dueDate').isISO8601().withMessage('Please provide a valid due date'),
    body('maxMarks').isInt({ min: 1 }).withMessage('Max marks must be a positive integer'),
    body('subject').trim().isLength({ min: 2 }).withMessage('Subject is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { title, description, dueDate, maxMarks, subject, instructions } = req.body;

        const assignment = new Assignment({
            title,
            description,
            teacher: req.user._id,
            dueDate: new Date(dueDate),
            maxMarks,
            subject,
            instructions
        });

        await assignment.save();
        await assignment.populate('teacher', 'fullName username');

        res.status(201).json({
            message: 'Assignment created successfully',
            assignment
        });
    } catch (error) {
        console.error('Create assignment error:', error);
        res.status(500).json({ message: 'Server error creating assignment' });
    }
});

// Get all assignments
router.get('/', auth, async (req, res) => {
    try {
        let query = { isActive: true };
        
        // If student, get all assignments
        // If teacher, get only their assignments
        if (req.user.role === 'teacher') {
            query.teacher = req.user._id;
        }

        const assignments = await Assignment.find(query)
            .populate('teacher', 'fullName username')
            .sort({ createdAt: -1 });

        // If student, also get submission status for each assignment
        if (req.user.role === 'student') {
            const assignmentsWithStatus = await Promise.all(
                assignments.map(async (assignment) => {
                    const submission = await Submission.findOne({
                        assignment: assignment._id,
                        student: req.user._id
                    });

                    return {
                        ...assignment.toObject(),
                        submission: submission ? {
                            id: submission._id,
                            submittedAt: submission.submittedAt,
                            marks: submission.marks,
                            feedback: submission.feedback,
                            comment: submission.comment,
                            isEvaluated: submission.isEvaluated,
                            fileName: submission.fileName
                        } : null
                    };
                })
            );

            return res.json({ assignments: assignmentsWithStatus });
        }

        res.json({ assignments });
    } catch (error) {
        console.error('Get assignments error:', error);
        res.status(500).json({ message: 'Server error fetching assignments' });
    }
});

// Get assignment by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id)
            .populate('teacher', 'fullName username');

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // If student, also get their submission
        if (req.user.role === 'student') {
            const submission = await Submission.findOne({
                assignment: assignment._id,
                student: req.user._id
            });

            return res.json({
                assignment: {
                    ...assignment.toObject(),
                    submission: submission ? {
                        id: submission._id,
                        submittedAt: submission.submittedAt,
                        marks: submission.marks,
                        feedback: submission.feedback,
                        comment: submission.comment,
                        isEvaluated: submission.isEvaluated,
                        fileName: submission.fileName
                    } : null
                }
            });
        }

        res.json({ assignment });
    } catch (error) {
        console.error('Get assignment error:', error);
        res.status(500).json({ message: 'Server error fetching assignment' });
    }
});

// Submit assignment (Student only)
router.post('/:id/submit', auth, requireRole(['student']), (req, res) => {
    upload.single('file')(req, res, async (err) => {
        try {
            // Handle multer errors
            if (err) {
                console.error('Multer error:', err);
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ message: 'File size too large. Maximum size is 10MB.' });
                }
                if (err.message.includes('Only images, documents, and archives are allowed')) {
                    return res.status(400).json({ message: 'Invalid file type. Only images, documents, and archives are allowed.' });
                }
                return res.status(400).json({ message: err.message || 'File upload error' });
            }

            if (!req.file) {
                return res.status(400).json({ message: 'Please upload a file' });
            }

            console.log('File uploaded:', req.file);
            console.log('Assignment ID:', req.params.id);
            console.log('User:', req.user.username);

            const assignment = await Assignment.findById(req.params.id);
            if (!assignment) {
                return res.status(404).json({ message: 'Assignment not found' });
            }

            // Check if assignment is still active and not past due date
            if (!assignment.isActive) {
                return res.status(400).json({ message: 'Assignment is no longer active' });
            }

            if (new Date() > assignment.dueDate) {
                return res.status(400).json({ message: 'Assignment submission deadline has passed' });
            }

            // Check if student has already submitted
            const existingSubmission = await Submission.findOne({
                assignment: assignment._id,
                student: req.user._id
            });

            if (existingSubmission) {
                return res.status(400).json({ message: 'You have already submitted this assignment' });
            }

            const submission = new Submission({
                assignment: assignment._id,
                student: req.user._id,
                filePath: req.file.path,
                fileName: req.file.originalname,
                fileSize: req.file.size
            });

            await submission.save();
            console.log('Submission saved:', submission._id);

            res.status(201).json({
                message: 'Assignment submitted successfully',
                submission: {
                    id: submission._id,
                    fileName: submission.fileName,
                    submittedAt: submission.submittedAt
                }
            });
        } catch (error) {
            console.error('Submit assignment error:', error);
            res.status(500).json({ message: 'Server error submitting assignment' });
        }
    });
});

// Get submissions for an assignment (Teacher only)
router.get('/:id/submissions', auth, requireRole(['teacher']), async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // Check if teacher owns this assignment
        if (assignment.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const submissions = await Submission.find({ assignment: assignment._id })
            .populate('student', 'fullName username studentId')
            .sort({ submittedAt: -1 });

        res.json({ submissions });
    } catch (error) {
        console.error('Get submissions error:', error);
        res.status(500).json({ message: 'Server error fetching submissions' });
    }
});

// Evaluate submission (Teacher only)
router.put('/submissions/:submissionId/evaluate', auth, requireRole(['teacher']), [
    body('marks').isInt({ min: 0 }).withMessage('Marks must be a non-negative integer'),
    body('feedback').optional().trim(),
    body('comment').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { marks, feedback, comment } = req.body;

        const submission = await Submission.findById(req.params.submissionId)
            .populate('assignment');

        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        // Check if teacher owns the assignment
        if (submission.assignment.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Check if marks don't exceed max marks
        if (marks > submission.assignment.maxMarks) {
            return res.status(400).json({ 
                message: `Marks cannot exceed maximum marks (${submission.assignment.maxMarks})` 
            });
        }

        submission.marks = marks;
        submission.feedback = feedback || '';
        submission.comment = comment || '';
        submission.isEvaluated = true;
        submission.evaluatedAt = new Date();
        submission.evaluatedBy = req.user._id;

        await submission.save();

        res.json({
            message: 'Submission evaluated successfully',
            submission: {
                id: submission._id,
                marks: submission.marks,
                feedback: submission.feedback,
                comment: submission.comment,
                isEvaluated: submission.isEvaluated,
                evaluatedAt: submission.evaluatedAt
            }
        });
    } catch (error) {
        console.error('Evaluate submission error:', error);
        res.status(500).json({ message: 'Server error evaluating submission' });
    }
});

// Download submission file
router.get('/submissions/:submissionId/download', auth, async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.submissionId)
            .populate('assignment')
            .populate('student', 'fullName username');

        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        // Check if user has permission to download
        // Teachers can download submissions for their assignments
        // Students can download their own submissions
        if (req.user.role === 'teacher') {
            if (submission.assignment.teacher.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Access denied' });
            }
        } else if (req.user.role === 'student') {
            if (submission.student._id.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }

        // Check if file exists
        if (!fs.existsSync(submission.filePath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }

        // Set appropriate headers for file download
        res.setHeader('Content-Disposition', `attachment; filename="${submission.fileName}"`);
        res.setHeader('Content-Type', 'application/octet-stream');

        // Stream the file
        const fileStream = fs.createReadStream(submission.filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Download file error:', error);
        res.status(500).json({ message: 'Server error downloading file' });
    }
});

module.exports = router;
