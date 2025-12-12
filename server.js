require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes = require('./src/routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/client', require('./src/routes/client'));
app.use('/api/career', require('./src/routes/career'));

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Exceptionz API is running!',
        version: '1.0.0',
        database: 'AWS DynamoDB',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                profile: 'GET /api/auth/profile',
            },
        },
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📦 Using AWS DynamoDB (${process.env.AWS_REGION})`);
    console.log(`📋 Table: ${process.env.DYNAMODB_TABLE_NAME}`);
    console.log(`📱 Mobile app can connect to this server`);
});
