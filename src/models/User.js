const { PutCommand, GetCommand, QueryCommand, UpdateCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { dynamoDB, TABLE_NAME } = require('../config/dynamodb');

class User {
    // Create a new user
    static async create(userData) {
        const { name, email, password, phone } = userData;

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = {
            id: uuidv4(),
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            phone: phone || null,
            avatar: null,
            isVerified: false,
            blocked: false,
            role: 'user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const command = new PutCommand({
            TableName: TABLE_NAME,
            Item: user,
            ConditionExpression: 'attribute_not_exists(id)',
        });

        await dynamoDB.send(command);

        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    // Find user by ID
    static async findById(id) {
        const command = new GetCommand({
            TableName: TABLE_NAME,
            Key: { id },
        });

        const result = await dynamoDB.send(command);

        if (!result.Item) {
            return null;
        }

        // Return without password by default
        const { password: _, ...userWithoutPassword } = result.Item;
        return userWithoutPassword;
    }

    // Find user by ID with password (for login)
    static async findByIdWithPassword(id) {
        const command = new GetCommand({
            TableName: TABLE_NAME,
            Key: { id },
        });

        const result = await dynamoDB.send(command);
        return result.Item || null;
    }

    // Find user by email
    static async findByEmail(email) {
        const command = new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: 'email = :email',
            ExpressionAttributeValues: {
                ':email': email.toLowerCase(),
            },
        });

        const result = await dynamoDB.send(command);

        if (!result.Items || result.Items.length === 0) {
            return null;
        }

        return result.Items[0];
    }

    // Compare password
    static async comparePassword(candidatePassword, hashedPassword) {
        return await bcrypt.compare(candidatePassword, hashedPassword);
    }

    // Update user
    static async update(id, updates) {
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};

        // Build update expression dynamically
        Object.keys(updates).forEach((key, index) => {
            if (key !== 'id' && key !== 'password') {
                updateExpressions.push(`#attr${index} = :val${index}`);
                expressionAttributeNames[`#attr${index}`] = key;
                expressionAttributeValues[`:val${index}`] = updates[key];
            }
        });

        // Always update updatedAt
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

        // Return without password
        const { password: _, ...userWithoutPassword } = result.Attributes;
        return userWithoutPassword;
    }

    // Update password
    static async updatePassword(id, newPassword) {
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const command = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { id },
            UpdateExpression: 'SET #password = :password, #updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#password': 'password',
                '#updatedAt': 'updatedAt',
            },
            ExpressionAttributeValues: {
                ':password': hashedPassword,
                ':updatedAt': new Date().toISOString(),
            },
            ReturnValues: 'ALL_NEW',
        });

        const result = await dynamoDB.send(command);

        // Return without password
        const { password: _, ...userWithoutPassword } = result.Attributes;
        return userWithoutPassword;
    }

    // Delete user
    static async delete(id) {
        const { DeleteCommand } = require('@aws-sdk/lib-dynamodb');

        const command = new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { id }
        });

        await dynamoDB.send(command);
        return { success: true };
    }

    // Block/Unblock user
    static async setBlockedStatus(id, blocked) {
        return await this.update(id, { blocked });
    }
}

module.exports = User;
