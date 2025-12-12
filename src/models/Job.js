const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = 'exceptionz-jobs';

class Job {
    static async create(jobData) {
        const job = {
            id: uuidv4(),
            ...jobData,
            postedAt: new Date().toISOString(),
            status: jobData.status || 'Active', // Active, Draft, Closed
            applicationsCount: 0
        };

        const command = new PutCommand({
            TableName: TABLE_NAME,
            Item: job
        });

        await docClient.send(command);
        return job;
    }

    static async findAll() {
        const command = new ScanCommand({
            TableName: TABLE_NAME
        });

        const response = await docClient.send(command);
        return response.Items;
    }

    static async findById(id) {
        const command = new GetCommand({
            TableName: TABLE_NAME,
            Key: { id }
        });

        const response = await docClient.send(command);
        return response.Item;
    }

    static async update(id, updates) {
        const job = await this.findById(id);
        if (!job) return null;

        const updatedJob = { ...job, ...updates };

        const command = new PutCommand({
            TableName: TABLE_NAME,
            Item: updatedJob
        });

        await docClient.send(command);
        return updatedJob;
    }

    static async incrementApplicationsCount(id) {
        const command = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { id },
            UpdateExpression: 'SET applicationsCount = if_not_exists(applicationsCount, :start) + :inc',
            ExpressionAttributeValues: {
                ':inc': 1,
                ':start': 0
            },
            ReturnValues: 'ALL_NEW'
        });

        const response = await docClient.send(command);
        return response.Attributes;
    }

    static async delete(id) {
        const command = new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { id }
        });

        await docClient.send(command);
        return true;
    }
}

module.exports = Job;
