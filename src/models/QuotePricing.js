const dbConfig = require('../config/dynamodb');
console.log('Loaded DB Config:', dbConfig);
const { dynamoDB } = dbConfig;
const { PutCommand, GetCommand, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE_NAME = process.env.DYNAMODB_QUOTE_PRICING_TABLE || 'exceptionz-quote-pricing';

class QuotePricing {
    // Default pricing structure
    static defaultPricing = {
        // Base prices by project type
        basePrices: {
            'Mobile App': 50000,
            'Web Development': 30000,
            'AI Based App': 80000,
            'Business Apps': 40000,
        },
        // Platform add-ons
        platform: {
            'Android': 0,
            'Android + iOS': 25000,
        },
        // Payment Gateway add-on
        paymentGateway: {
            'Yes': 15000,
            'No': 0,
        },
        // Web type pricing
        webType: {
            'Static': 0,
            'Dynamic': 20000,
        },
        // SEO add-on
        seo: {
            'Yes': 10000,
            'No': 0,
        },
        // Business app type add-ons
        businessType: {
            'Ecommerce Website': 25000,
            'Ecommerce App': 35000,
            'CRM Website': 20000,
            'Invoice Generator Website': 15000,
            'Invoice Generator App': 20000,
            'Appointment Booking Website': 15000,
            'Appointment Booking App': 20000,
        },
    };

    // Get all pricing or create default if not exists
    static async getPricing() {
        try {
            const command = new GetCommand({
                TableName: TABLE_NAME,
                Key: { id: 'global-pricing' },
            });
            const result = await dynamoDB.send(command);

            if (result.Item) {
                return result.Item.pricing;
            }

            // If no pricing exists, try to create default
            try {
                await this.savePricing(this.defaultPricing);
            } catch (saveError) {
                console.error('Could not save default pricing:', saveError.message);
            }
            return this.defaultPricing;
        } catch (error) {
            console.error('Error getting pricing:', error.message);
            // Return default pricing if table doesn't exist or any other error
            return this.defaultPricing;
        }
    }

    // Save pricing configuration
    static async savePricing(pricing) {
        try {
            const command = new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                    id: 'global-pricing',
                    pricing,
                    updatedAt: new Date().toISOString(),
                },
            });
            await dynamoDB.send(command);
            return pricing;
        } catch (error) {
            console.error('Error saving pricing:', error.message);
            // If table doesn't exist, just return the pricing without saving
            if (error.name === 'ResourceNotFoundException') {
                console.warn(`Table ${TABLE_NAME} does not exist. Please create it in AWS DynamoDB.`);
                return pricing;
            }
            throw error;
        }
    }

    // Calculate quote based on user selections
    static async calculateQuote(selections) {
        const pricing = await this.getPricing();
        let totalPrice = 0;
        const breakdown = [];

        const { projectType, platform, paymentGateway, webType, seo, businessType } = selections;

        // Base price
        if (projectType && pricing.basePrices[projectType]) {
            totalPrice += pricing.basePrices[projectType];
            breakdown.push({
                item: `Base Price (${projectType})`,
                price: pricing.basePrices[projectType],
            });
        }

        // Platform add-on (for Mobile App and AI Based App)
        if (platform && pricing.platform[platform]) {
            totalPrice += pricing.platform[platform];
            if (pricing.platform[platform] > 0) {
                breakdown.push({
                    item: `Platform: ${platform}`,
                    price: pricing.platform[platform],
                });
            }
        }

        // Payment Gateway
        if (paymentGateway && pricing.paymentGateway[paymentGateway]) {
            totalPrice += pricing.paymentGateway[paymentGateway];
            if (pricing.paymentGateway[paymentGateway] > 0) {
                breakdown.push({
                    item: 'Payment Gateway Integration',
                    price: pricing.paymentGateway[paymentGateway],
                });
            }
        }

        // Web Type (for Web Development)
        if (webType && pricing.webType[webType]) {
            totalPrice += pricing.webType[webType];
            if (pricing.webType[webType] > 0) {
                breakdown.push({
                    item: `${webType} Website`,
                    price: pricing.webType[webType],
                });
            }
        }

        // SEO
        if (seo && pricing.seo[seo]) {
            totalPrice += pricing.seo[seo];
            if (pricing.seo[seo] > 0) {
                breakdown.push({
                    item: 'SEO Optimization',
                    price: pricing.seo[seo],
                });
            }
        }

        // Business Type add-on
        if (businessType && pricing.businessType[businessType]) {
            totalPrice += pricing.businessType[businessType];
            breakdown.push({
                item: businessType,
                price: pricing.businessType[businessType],
            });
        }

        return {
            totalPrice,
            breakdown,
            currency: 'INR',
        };
    }
}

module.exports = QuotePricing;
