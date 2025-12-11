const { dynamoDB } = require('../config/dynamodb');
const { PutCommand, GetCommand, ScanCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const TABLE_NAME = process.env.DYNAMODB_QUOTE_REQUESTS_TABLE || 'exceptionz-quote-requests';

class QuoteRequest {
    // Create a new quote request
    static async create(data) {
        const id = uuidv4();
        const now = new Date().toISOString();

        const item = {
            id,
            clientId: data.clientId,
            clientName: data.clientName || '',
            clientEmail: data.clientEmail || '',
            clientPhone: data.clientPhone || '',
            projectType: data.projectType,
            platform: data.platform || null,
            paymentGateway: data.paymentGateway || null,
            webType: data.webType || null,
            seo: data.seo || null,
            businessType: data.businessType || null,
            description: data.description || '',
            calculatedQuote: data.calculatedQuote || null,
            status: 'Pending', // Pending, Reviewed, Accepted, Rejected
            adminNotes: '',
            createdAt: now,
            updatedAt: now,
        };

        try {
            const command = new PutCommand({
                TableName: TABLE_NAME,
                Item: item,
            });
            await dynamoDB.send(command);
            return item;
        } catch (error) {
            console.error('Error creating quote request:', error.message);
            if (error.name === 'ResourceNotFoundException') {
                console.warn(`Table ${TABLE_NAME} does not exist. Quote request not saved.`);
                return item; // Return the item even if not saved
            }
            throw error;
        }
    }

    // Find by ID
    static async findById(id) {
        try {
            const command = new GetCommand({
                TableName: TABLE_NAME,
                Key: { id },
            });
            const result = await dynamoDB.send(command);
            return result.Item || null;
        } catch (error) {
            console.error('Error finding quote request:', error.message);
            if (error.name === 'ResourceNotFoundException') {
                return null;
            }
            throw error;
        }
    }

    // Find all quote requests
    static async findAll() {
        try {
            const command = new ScanCommand({
                TableName: TABLE_NAME,
            });
            const result = await dynamoDB.send(command);
            // Sort by createdAt descending
            return (result.Items || []).sort((a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
            );
        } catch (error) {
            console.error('Error finding all quote requests:', error.message);
            if (error.name === 'ResourceNotFoundException') {
                console.warn(`Table ${TABLE_NAME} does not exist. Returning empty array.`);
                return [];
            }
            throw error;
        }
    }

    // Find by client ID
    static async findByClientId(clientId) {
        try {
            const command = new ScanCommand({
                TableName: TABLE_NAME,
                FilterExpression: 'clientId = :clientId',
                ExpressionAttributeValues: {
                    ':clientId': clientId,
                },
            });
            const result = await dynamoDB.send(command);
            return (result.Items || []).sort((a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
            );
        } catch (error) {
            console.error('Error finding quote requests by client:', error);
            throw error;
        }
    }

    // Update quote request
    static async update(id, updates) {
        try {
            const updateExpressions = [];
            const expressionAttributeNames = {};
            const expressionAttributeValues = {};

            Object.keys(updates).forEach((key) => {
                if (key !== 'id') {
                    updateExpressions.push(`#${key} = :${key}`);
                    expressionAttributeNames[`#${key}`] = key;
                    expressionAttributeValues[`:${key}`] = updates[key];
                }
            });

            updateExpressions.push('#updatedAt = :updatedAt');
            expressionAttributeNames['#updatedAt'] = 'updatedAt';
            expressionAttributeValues[':updatedAt'] = new Date().toISOString();

            const command = new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { id },
                UpdateExpression: `SET ${updateExpressions.join(', ')}`,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                ReturnValues: 'ALL_NEW',
            });

            const result = await dynamoDB.send(command);
            return result.Attributes;
        } catch (error) {
            console.error('Error updating quote request:', error);
            throw error;
        }
    }

    // Delete quote request
    static async delete(id) {
        try {
            const command = new DeleteCommand({
                TableName: TABLE_NAME,
                Key: { id },
            });
            await dynamoDB.send(command);
            return true;
        } catch (error) {
            console.error('Error deleting quote request:', error);
            throw error;
        }
    }
}

module.exports = QuoteRequest;
