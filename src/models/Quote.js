const { PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDB } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');

const TABLE_NAME = 'exceptionz-quotes'; // We can use a separate table or reuse main if preferred, but separate is cleaner for admins.
// Ideally, creating a new table in code is not best practice, but for simulation let's assume it exists or we use a single table design.
// Given User instructions "exceptionz-users-progress" is for progress, let's just make a new one or store in User? 
// User mentioned "setting quick quotes section in admin also". 
// Let's stick to a simple table for quotes. "exceptionz-quotes" 
// Since user didn't specify table name for quotes explicitly, I'll create a model that assumes a table 'exceptionz-quotes' exists or creates items in a generic way.
// Wait, user gave "exceptionz-users-progress" for client details.
// I will assume a new table 'exceptionz-quotes' for now, or I can put it in user's profile which might be hidden?
// No, quotes might come from unauthenticated users too (Login page has it? No, Quick Quote is inside app).
// Quick Quote is in app, so user is logged in.
// Let's store quotes in a separate table 'exceptionz-quotes' with partition key 'id'.

class Quote {
    static async create(userId, quoteData) {
        const quote = {
            id: uuidv4(),
            userId,
            ...quoteData,
            status: 'Pending',
            createdAt: new Date().toISOString(),
        };

        const command = new PutCommand({
            TableName: 'exceptionz-quotes', // Assuming this table exists or will be created
            Item: quote,
        });

        await dynamoDB.send(command);
        return quote;
    }

    static async findAll() {
        const command = new ScanCommand({
            TableName: 'exceptionz-quotes',
        });

        const result = await dynamoDB.send(command);
        return result.Items || [];
    }
}

module.exports = Quote;
