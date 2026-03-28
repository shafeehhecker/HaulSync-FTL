const { PrismaClient } = require('@prisma/client');

// Single shared instance across all routes.
// Node.js module cache ensures this is only ever instantiated once.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['warn', 'error']
    : ['error'],
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
