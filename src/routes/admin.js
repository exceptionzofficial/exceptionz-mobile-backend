const express = require('express');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { s3Client, BUCKET_NAME } = require('../config/s3');
const ClientData = require('../models/ClientData');
const User = require('../models/User');
const Quote = require('../models/Quote');
const Project = require('../models/Project');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware to check if user is admin (Simple check for now)
const adminCheck = async (req, res, next) => {
    // In a real app, check req.user.role === 'admin'
    next();
};

// @route   GET /api/admin/users
// @desc    Get all users (for analytics/list)
// @access  Admin
router.get('/users', authMiddleware, adminCheck, async (req, res) => {
    try {
        const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
        const { dynamoDB, TABLE_NAME } = require('../config/dynamodb');

        const command = new ScanCommand({
            TableName: TABLE_NAME,
            ProjectionExpression: 'id, #name, email, phone, createdAt',
            ExpressionAttributeNames: { '#name': 'name' }
        });

        const result = await dynamoDB.send(command);
        res.json({ success: true, count: result.Count, users: result.Items });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/admin/users/search
// @desc    Search users for autocomplete (by name or phone)
// @access  Admin
router.get('/users/search', authMiddleware, adminCheck, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.json({ success: true, users: [] });
        }

        const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
        const { dynamoDB, TABLE_NAME } = require('../config/dynamodb');

        const command = new ScanCommand({
            TableName: TABLE_NAME,
            ProjectionExpression: 'id, #name, email, phone',
            ExpressionAttributeNames: { '#name': 'name' }
        });

        const result = await dynamoDB.send(command);
        const users = result.Items || [];

        const searchQuery = q.toLowerCase();
        const filtered = users.filter(user =>
            (user.name && user.name.toLowerCase().includes(searchQuery)) ||
            (user.phone && user.phone.includes(searchQuery))
        );

        res.json({ success: true, users: filtered.slice(0, 10) });
    } catch (error) {
        console.error('User search error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ===== PROJECT ROUTES =====

// @route   POST /api/admin/projects
// @desc    Create new project
// @access  Admin
router.post('/projects', authMiddleware, adminCheck, async (req, res) => {
    try {
        const projectData = req.body;
        const project = await Project.create(projectData);
        res.json({ success: true, project });
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
});

// @route   GET /api/admin/projects
// @desc    Get all projects
// @access  Admin
router.get('/projects', authMiddleware, adminCheck, async (req, res) => {
    try {
        const projects = await Project.findAll();
        res.json({ success: true, projects });
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/admin/projects/:id
// @desc    Get project by ID
// @access  Admin
router.get('/projects/:id', authMiddleware, adminCheck, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        res.json({ success: true, project });
    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   PUT /api/admin/projects/:id
// @desc    Update project
// @access  Admin
router.put('/projects/:id', authMiddleware, adminCheck, async (req, res) => {
    try {
        const updates = req.body;
        const project = await Project.update(req.params.id, updates);
        res.json({ success: true, project });
    } catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
});

// @route   PUT /api/admin/projects/:projectId/modules/:moduleId
// @desc    Update module status/progress
// @access  Admin
router.put('/projects/:projectId/modules/:moduleId', authMiddleware, adminCheck, async (req, res) => {
    try {
        const { projectId, moduleId } = req.params;
        const moduleUpdates = req.body;

        const project = await Project.updateModule(projectId, moduleId, moduleUpdates);
        res.json({ success: true, project });
    } catch (error) {
        console.error('Update module error:', error);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
});

// @route   DELETE /api/admin/projects/:id
// @desc    Delete project
// @access  Admin
router.delete('/projects/:id', authMiddleware, adminCheck, async (req, res) => {
    try {
        await Project.delete(req.params.id);
        res.json({ success: true, message: 'Project deleted' });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ===== OLD CLIENTDATA ROUTES (Legacy) =====

// @route   POST /api/admin/project
// @desc    Add/Update Project for a user (Legacy)
// @access  Admin
router.post('/project', authMiddleware, adminCheck, async (req, res) => {
    try {
        const { userId, project } = req.body;
        if (!userId || !project) return res.status(400).json({ success: false, message: 'Missing data' });

        await ClientData.init(userId);
        const updatedData = await ClientData.updateProject(userId, project);
        res.json({ success: true, data: updatedData });
    } catch (error) {
        console.error('Admin project error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/admin/invoice
// @desc    Upload invoice and add record
// @access  Admin
router.post('/invoice', authMiddleware, adminCheck, upload.single('file'), async (req, res) => {
    try {
        const { userId, invoiceData } = req.body;
        const file = req.file;

        if (!userId || !file || !invoiceData) {
            return res.status(400).json({ success: false, message: 'Missing data' });
        }

        const parsedInvoiceData = JSON.parse(invoiceData);
        const fileKey = `invoices/${userId}/${uuidv4()}-${file.originalname}`;

        const uploadParams = {
            Bucket: BUCKET_NAME,
            Key: fileKey,
            Body: file.buffer,
            ContentType: file.mimetype,
        };

        await s3Client.send(new PutObjectCommand(uploadParams));

        const invoiceRecord = {
            ...parsedInvoiceData,
            s3Key: fileKey,
            fileName: file.originalname,
            url: `https://${BUCKET_NAME}.s3.amazonaws.com/${fileKey}`
        };

        await ClientData.init(userId);
        const updatedData = await ClientData.addInvoice(userId, invoiceRecord);

        res.json({ success: true, data: updatedData });
    } catch (error) {
        console.error('Admin invoice error:', error);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
});

// @route   GET /api/admin/quotes
// @desc    Get all quotes
// @access  Admin
router.get('/quotes', authMiddleware, adminCheck, async (req, res) => {
    try {
        const quotes = await Quote.findAll();
        res.json({ success: true, quotes });
    } catch (error) {
        console.error('Admin quotes error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/admin/quotes/submit
// @desc    Submit a quote (Public/User)
// @access  Public
router.post('/quotes/submit', async (req, res) => {
    try {
        const quoteData = req.body;
        await Quote.create(quoteData.userId || 'anonymous', quoteData);
        res.json({ success: true, message: 'Quote submitted' });
    } catch (error) {
        console.error('Submit quote error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
