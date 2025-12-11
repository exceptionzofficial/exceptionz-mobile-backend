const express = require('express');
const ClientData = require('../models/ClientData');
const Quote = require('../models/Quote');
const Project = require('../models/Project');
const Appointment = require('../models/Appointment');
const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const QuotePricing = require('../models/QuotePricing');
const QuoteRequest = require('../models/QuoteRequest');
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
// @desc    Submit a quote request with auto-calculated price
// @access  Private
router.post('/quote', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const quoteData = req.body;

        // Calculate quote based on selections
        const calculatedQuote = await QuotePricing.calculateQuote(quoteData);

        // Create quote request record
        const quoteRequest = await QuoteRequest.create({
            clientId: req.user.id,
            clientName: user.name,
            clientEmail: user.email,
            clientPhone: user.phone || quoteData.phone || '',
            projectType: quoteData.projectType,
            platform: quoteData.platform,
            paymentGateway: quoteData.paymentGateway,
            webType: quoteData.webType,
            seo: quoteData.seo,
            businessType: quoteData.businessType,
            description: quoteData.description,
            calculatedQuote,
        });

        // Also save to old Quote model for backward compatibility
        await Quote.create(req.user.id, { ...quoteData, userEmail: user.email, userName: user.name });

        res.json({
            success: true,
            message: 'Quote submitted successfully',
            quote: calculatedQuote,
            requestId: quoteRequest.id
        });
    } catch (error) {
        console.error('Client quote error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/client/quote-requests
// @desc    Get my quote requests
// @access  Private
router.get('/quote-requests', authMiddleware, async (req, res) => {
    try {
        const requests = await QuoteRequest.findByClientId(req.user.id);
        res.json({ success: true, requests });
    } catch (error) {
        console.error('Get quote requests error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/client/appointments
// @desc    Book an appointment
// @access  Private
router.post('/appointments', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const appointmentData = {
            ...req.body,
            clientId: req.user.id,
            name: user.name,
            email: user.email,
            phone: user.phone || req.body.phone
        };
        const appointment = await Appointment.create(appointmentData);
        res.json({ success: true, appointment, message: 'Appointment booked successfully' });
    } catch (error) {
        console.error('Book appointment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/client/appointments
// @desc    Get my appointments
// @access  Private
router.get('/appointments', authMiddleware, async (req, res) => {
    try {
        const appointments = await Appointment.findByClientId(req.user.id);
        res.json({ success: true, appointments });
    } catch (error) {
        console.error('Get appointments error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/client/tickets
// @desc    Submit a support ticket
// @access  Private
router.post('/tickets', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const ticketData = {
            ...req.body,
            clientId: req.user.id,
            name: user.name,
            email: user.email,
            phone: user.phone || req.body.phone
        };
        const ticket = await SupportTicket.create(ticketData);
        res.json({ success: true, ticket, message: 'Support ticket submitted successfully' });
    } catch (error) {
        console.error('Submit ticket error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/client/tickets
// @desc    Get my support tickets
// @access  Private
router.get('/tickets', authMiddleware, async (req, res) => {
    try {
        const tickets = await SupportTicket.findByClientId(req.user.id);
        res.json({ success: true, tickets });
    } catch (error) {
        console.error('Get tickets error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
