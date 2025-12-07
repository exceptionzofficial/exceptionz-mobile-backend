const { PutCommand, GetCommand, ScanCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { dynamoDB } = require('../config/dynamodb');

const APPOINTMENTS_TABLE = process.env.DYNAMODB_APPOINTMENTS_TABLE || 'exceptionz-appointments';

class Appointment {
    static async create(appointmentData) {
        const { clientId, name, email, phone, date, time, purpose, status = 'Pending' } = appointmentData;

        const appointment = {
            id: uuidv4(),
            clientId,
            name,
            email,
            phone,
            date,
            time,
            purpose,
            status, // Pending, Confirmed, Completed, Cancelled
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const command = new PutCommand({
            TableName: APPOINTMENTS_TABLE,
            Item: appointment,
        });

        await dynamoDB.send(command);
        return appointment;
    }

    static async findById(id) {
        const command = new GetCommand({
            TableName: APPOINTMENTS_TABLE,
            Key: { id },
        });

        const result = await dynamoDB.send(command);
        return result.Item || null;
    }

    static async findAll() {
        const command = new ScanCommand({
            TableName: APPOINTMENTS_TABLE,
        });

        const result = await dynamoDB.send(command);
        return result.Items || [];
    }

    static async findByClientId(clientId) {
        const command = new ScanCommand({
            TableName: APPOINTMENTS_TABLE,
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
            TableName: APPOINTMENTS_TABLE,
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
            TableName: APPOINTMENTS_TABLE,
            Key: { id },
        });

        await dynamoDB.send(command);
        return { success: true };
    }
}

module.exports = Appointment;
