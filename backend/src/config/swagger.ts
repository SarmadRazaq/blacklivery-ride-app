import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Blacklivery Backend API',
            version: '1.0.0',
            description: 'API documentation for the Blacklivery backend services',
            contact: {
                name: 'API Support',
                email: 'blackliveryinc@gmail.com',
            },
        },
        servers: [
            {
                url: 'http://localhost:5000/api/v1',
                description: 'Local Development Server',
            },
            {
                url: 'http://localhost:5000/api',
                description: 'Local Development Server (Driver Routes)',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);
