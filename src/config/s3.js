const { S3Client } = require('@aws-sdk/client-s3');

// Configure AWS S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const BUCKET_NAME = 'invoice-customers-exceptionz';

module.exports = { s3Client, BUCKET_NAME };
