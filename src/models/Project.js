const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { dynamoDB } = require('../config/dynamodb');

const TABLE_NAME = process.env.DYNAMODB_PROJECTS_TABLE || 'exceptionz-projects';

class Project {
    static async create(projectData) {
        const project = {
            id: uuidv4(),
            clientId: projectData.clientId,
            clientName: projectData.clientName,
            email: projectData.email,
            phone: projectData.phone,
            projectName: projectData.projectName,
            projectValue: projectData.projectValue,
            amountPaid: projectData.amountPaid || 0,
            initialPaymentDate: projectData.initialPaymentDate,
            secondDueDate: projectData.secondDueDate,
            thumbnail: projectData.thumbnail || '',
            location: projectData.location || '',
            description: projectData.description || '',
            status: projectData.status || 'Planning',
            progress: 0,
            modules: projectData.modules || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const command = new PutCommand({
            TableName: TABLE_NAME,
            Item: project
        });

        await dynamoDB.send(command);
        return project;
    }

    static async findById(projectId) {
        const command = new GetCommand({
            TableName: TABLE_NAME,
            Key: { id: projectId }
        });

        const result = await dynamoDB.send(command);
        return result.Item;
    }

    static async findAll() {
        const command = new ScanCommand({
            TableName: TABLE_NAME
        });

        const result = await dynamoDB.send(command);
        return result.Items || [];
    }

    static async findByClientId(clientId) {
        const command = new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: 'clientId = :clientId',
            ExpressionAttributeValues: {
                ':clientId': clientId
            }
        });

        const result = await dynamoDB.send(command);
        return result.Items || [];
    }

    static async update(projectId, updates) {
        const project = await this.findById(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        const updateData = {
            ...updates,
            updatedAt: new Date().toISOString()
        };

        // Build update expression
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};

        Object.keys(updateData).forEach((key, index) => {
            updateExpressions.push(`#attr${index} = :val${index}`);
            expressionAttributeNames[`#attr${index}`] = key;
            expressionAttributeValues[`:val${index}`] = updateData[key];
        });

        const command = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { id: projectId },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        });

        const result = await dynamoDB.send(command);
        return result.Attributes;
    }

    static async updateModule(projectId, moduleId, moduleUpdates) {
        const project = await this.findById(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        const modules = project.modules || [];
        const moduleIndex = modules.findIndex(m => m.id === moduleId);

        if (moduleIndex === -1) {
            throw new Error('Module not found');
        }

        modules[moduleIndex] = {
            ...modules[moduleIndex],
            ...moduleUpdates,
            updatedAt: new Date().toISOString()
        };

        // Calculate overall project progress
        const totalProgress = modules.reduce((sum, m) => sum + (m.progress || 0), 0);
        const averageProgress = modules.length > 0 ? Math.round(totalProgress / modules.length) : 0;

        return await this.update(projectId, {
            modules,
            progress: averageProgress,
            updatedAt: new Date().toISOString()
        });
    }

    static async delete(projectId) {
        const command = new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { id: projectId }
        });

        await dynamoDB.send(command);
        return { success: true };
    }
}

module.exports = Project;
