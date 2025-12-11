const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

const BUCKET_NAME = 'invoice-customers-exceptionz';

// Create S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

/**
 * Upload a file to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} mimeType - File MIME type
 * @returns {Promise<string>} - S3 URL of uploaded file
 */
async function uploadToS3(fileBuffer, fileName, mimeType) {
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `invoices/${uniqueFileName}`,
        Body: fileBuffer,
        ContentType: mimeType,
        ACL: 'private', // Keep files private, accessed via presigned URLs if needed
    });

    await s3Client.send(command);

    // Return the S3 URL
    const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/invoices/${uniqueFileName}`;
    return fileUrl;
}

module.exports = {
    s3Client,
    uploadToS3,
    BUCKET_NAME,
};
