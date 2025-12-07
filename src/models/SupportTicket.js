const { PutCommand, GetCommand, ScanCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { dynamoDB } = require('../config/dynamodb');

const TICKETS_TABLE = process.env.DYNAMODB_TICKETS_TABLE || 'exceptionz-support-tickets';

class SupportTicket {
    static async create(ticketData) {
        const { clientId, name, email, phone, subject, description, priority = 'Medium', status = 'Active' } = ticketData;

        const ticket = {
            id: uuidv4(),
            clientId,
            name,
            email,
            phone,
            subject,
            description,
            priority, // Low, Medium, High, Urgent
            status, // Active, In Progress, Resolved, Closed
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const command = new PutCommand({
            TableName: TICKETS_TABLE,
            Item: ticket,
        });

        await dynamoDB.send(command);
        return ticket;
    }

    static async findById(id) {
        const command = new GetCommand({
            TableName: TICKETS_TABLE,
            Key: { id },
        });

        const result = await dynamoDB.send(command);
        return result.Item || null;
    }

    static async findAll() {
        const command = new ScanCommand({
            TableName: TICKETS_TABLE,
        });

        const result = await dynamoDB.send(command);
        return result.Items || [];
    }

    static async findByClientId(clientId) {
        const command = new ScanCommand({
            TableName: TICKETS_TABLE,
            FilterExpression: 'clientId = :clientId',
            ExpressionAttributeValues: {
                ':clientId': clientId,
            },
        });

        const result = await dynamoDB.send(command);
        return result.Items || [];
    }

    static async update(id, updates) {
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};

        Object.keys(updates).forEach((key, index) => {
            if (key !== 'id') {
                updateExpressions.push(`#attr${index} = :val${index}`);
                expressionAttributeNames[`#attr${index}`] = key;
                expressionAttributeValues[`:val${index}`] = updates[key];
            }
        });

        updateExpressions.push('#updatedAt = :updatedAt');
        expressionAttributeNames['#updatedAt'] = 'updatedAt';
        expressionAttributeValues[':updatedAt'] = new Date().toISOString();

        const command = new UpdateCommand({
            TableName: TICKETS_TABLE,
            Key: { id },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW',
        });

        const result = await dynamoDB.send(command);
        return result.Attributes;
    }

    static async delete(id) {
        const command = new DeleteCommand({
            TableName: TICKETS_TABLE,
            Key: { id },
        });

        await dynamoDB.send(command);
        return { success: true };
    }
}

module.exports = SupportTicket;
