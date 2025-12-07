const express = require('express');
const ClientData = require('../models/ClientData');
const Quote = require('../models/Quote');
const Project = require('../models/Project');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/client/projects
// @desc    Get my projects
// @access  Private
router.get('/projects', authMiddleware, async (req, res) => {
    try {
        const projects = await Project.findByClientId(req.user.id);
        res.json({ success: true, projects });
    } catch (error) {
        console.error('Client projects error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/client/projects/:id
// @desc    Get project details with modules
// @access  Private
router.get('/projects/:id', authMiddleware, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        if (project.clientId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        res.json({ success: true, project });
    } catch (error) {
        console.error('Client project details error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/client/invoices
// @desc    Get my invoices
// @access  Private
router.get('/invoices', authMiddleware, async (req, res) => {
    try {
        const clientData = await ClientData.findById(req.user.id);
        res.json({ success: true, invoices: clientData ? clientData.invoices : [] });
    } catch (error) {
        console.error('Client invoices error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/client/quote
// @desc    Submit a quote (Authenticated)
// @access  Private
router.post('/quote', authMiddleware, async (req, res) => {
    try {
        const quoteData = req.body;
        await Quote.create(req.user.id, { ...quoteData, userEmail: req.user.email, userName: req.user.name });
        res.json({ success: true, message: 'Quote submitted successfully' });
    } catch (error) {
        console.error('Client quote error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
