const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const { v4: uuidv4 } = require('uuid');

// Middleware to check admin authorization (simplified for now, ideally reused from auth middleware)
const isAdmin = (req, res, next) => {
    // For now, assuming admin routes are protected at the app level or via simplified check
    // In production, you'd verify the JWT token and check for admin role
    next();
};

// --- Public Routes ---

// @route   GET /api/career/jobs
// @desc    Get all active jobs
// @access  Public
router.get('/jobs', async (req, res) => {
    try {
        const jobs = await Job.findAll();
        const activeJobs = jobs.filter(job => job.status === 'Active');
        res.json({ success: true, jobs: activeJobs });
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/career/jobs/:id
// @desc    Get a single job by ID
// @access  Public
router.get('/jobs/:id', async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }
        res.json({ success: true, job });
    } catch (error) {
        console.error('Error fetching job:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/career/apply
// @desc    Submit a job application
// @access  Public
router.post('/apply', async (req, res) => {
    try {
        const { jobId, name, email, phone, experience, resumeUrl } = req.body;

        if (!jobId || !name || !email) {
            return res.status(400).json({ success: false, message: 'Please provide required fields' });
        }

        const application = await JobApplication.create({
            jobId,
            name,
            email,
            phone,
            experience,
            resumeUrl
        });

        await Job.incrementApplicationsCount(jobId);

        res.status(201).json({ success: true, application });
    } catch (error) {
        console.error('Error submitting application:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// --- Admin Routes ---

// @route   GET /api/career/admin/jobs
// @desc    Get all jobs (including drafts/closed)
// @access  Admin
router.get('/admin/jobs', isAdmin, async (req, res) => {
    try {
        const jobs = await Job.findAll();
        res.json({ success: true, jobs });
    } catch (error) {
        console.error('Error fetching all jobs:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/career/admin/jobs
// @desc    Create a new job
// @access  Admin
router.post('/admin/jobs', isAdmin, async (req, res) => {
    try {
        const job = await Job.create(req.body);
        res.status(201).json({ success: true, job });
    } catch (error) {
        console.error('Error creating job:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   PUT /api/career/admin/jobs/:id
// @desc    Update a job
// @access  Admin
router.put('/admin/jobs/:id', isAdmin, async (req, res) => {
    try {
        const updatedJob = await Job.update(req.params.id, req.body);
        if (!updatedJob) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }
        res.json({ success: true, job: updatedJob });
    } catch (error) {
        console.error('Error updating job:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   DELETE /api/career/admin/jobs/:id
// @desc    Delete a job
// @access  Admin
router.delete('/admin/jobs/:id', isAdmin, async (req, res) => {
    try {
        await Job.delete(req.params.id);
        res.json({ success: true, message: 'Job deleted' });
    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/career/admin/applications
// @desc    Get all applications
// @access  Admin
router.get('/admin/applications', isAdmin, async (req, res) => {
    try {
        const applications = await JobApplication.findAll();

        // Enrich applications with job titles
        const jobs = await Job.findAll();
        const jobMap = {};
        jobs.forEach(job => {
            jobMap[job.id] = job.title;
        });

        const enrichedApplications = applications.map(app => ({
            ...app,
            position: jobMap[app.jobId] || 'Unknown Position'
        }));

        res.json({ success: true, applications: enrichedApplications });
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   PUT /api/career/admin/applications/:id
// @desc    Update application status
// @access  Admin
router.put('/admin/applications/:id', isAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const updatedApp = await JobApplication.updateStatus(req.params.id, status);
        res.json({ success: true, application: updatedApp });
    } catch (error) {
        console.error('Error updating application:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
