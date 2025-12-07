const { PutCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDB } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');

const TABLE_NAME = 'exceptionz-users-progress';

class ClientData {
    // initialize client data for a user if not exists
    static async init(userId) {
        const command = new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                id: userId,
                projects: [],
                invoices: [],
                updatedAt: new Date().toISOString(),
            },
            ConditionExpression: 'attribute_not_exists(id)',
        });

        try {
            await dynamoDB.send(command);
            return { id: userId, projects: [], invoices: [] };
        } catch (error) {
            if (error.name === 'ConditionalCheckFailedException') {
                return await this.findById(userId);
            }
            throw error;
        }
    }

    // Find client data by User ID
    static async findById(userId) {
        const command = new GetCommand({
            TableName: TABLE_NAME,
            Key: { id: userId },
        });

        const result = await dynamoDB.send(command);
        return result.Item || null;
    }

    // Add or Update Project
    static async updateProject(userId, projectData) {
        const clientData = await this.findById(userId);
        let projects = clientData ? clientData.projects || [] : [];

        const existingIndex = projects.findIndex(p => p.id === projectData.id);

        if (existingIndex >= 0) {
            // Update existing project
            projects[existingIndex] = { ...projects[existingIndex], ...projectData, updatedAt: new Date().toISOString() };
        } else {
            // Add new project
            projects.push({
                id: projectData.id || uuidv4(),
                ...projectData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
        }

        const command = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { id: userId },
            UpdateExpression: 'SET projects = :projects, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
                ':projects': projects,
                ':updatedAt': new Date().toISOString(),
            },
            ReturnValues: 'ALL_NEW',
        });

        const result = await dynamoDB.send(command);
        return result.Attributes;
    }

    // Add Invoice
    static async addInvoice(userId, invoiceData) {
        const clientData = await this.findById(userId);
        let invoices = clientData ? clientData.invoices || [] : [];

        invoices.push({
            id: invoiceData.id || uuidv4(),
            ...invoiceData,
            createdAt: new Date().toISOString(),
        });

        const command = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { id: userId },
            UpdateExpression: 'SET invoices = :invoices, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
                ':invoices': invoices,
                ':updatedAt': new Date().toISOString(),
            },
            ReturnValues: 'ALL_NEW',
        });

        const result = await dynamoDB.send(command);
        return result.Attributes;
    }
}

module.exports = ClientData;
