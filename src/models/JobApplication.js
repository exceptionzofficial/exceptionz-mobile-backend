const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand, GetCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = 'exceptionz-job-applications';

class JobApplication {
    static async create(applicationData) {
        const application = {
            id: uuidv4(),
            ...applicationData,
            status: 'New', // New, Review, Interview, Shortlisted, Rejected
            appliedAt: new Date().toISOString()
        };

        const command = new PutCommand({
            TableName: TABLE_NAME,
            Item: application
        });

        await docClient.send(command);
        return application;
    }

    static async findAll() {
        const command = new ScanCommand({
            TableName: TABLE_NAME
        });

        const response = await docClient.send(command);
        return response.Items;
    }

    static async findByJobId(jobId) {
        const command = new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: 'jobId = :jobId',
            ExpressionAttributeValues: {
                ':jobId': jobId
            }
        });

        const response = await docClient.send(command);
        return response.Items;
    }

    static async updateStatus(id, status) {
        const command = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { id },
            UpdateExpression: 'SET #status = :status',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':status': status
            },
            ReturnValues: 'ALL_NEW'
        });

        const response = await docClient.send(command);
        return response.Attributes;
    }
}

module.exports = JobApplication;
