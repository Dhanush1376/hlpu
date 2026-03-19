const mongoose = require('mongoose');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

const connectDB = async (retryCount = 0) => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });

        console.log(`[db] MongoDB connected: ${conn.connection.host}`);
    } catch (err) {
        console.error(`[db] Connection error (attempt ${retryCount + 1}/${MAX_RETRIES}): ${err.message}`);

        if (retryCount < MAX_RETRIES - 1) {
            const delay = RETRY_DELAY_MS * Math.pow(2, retryCount); // Exponential backoff
            console.log(`[db] Retrying in ${delay / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return connectDB(retryCount + 1);
        }

        console.error('[db] All connection attempts failed. Exiting.');
        process.exit(1);
    }
};

// Connection event listeners
mongoose.connection.on('error', (err) => {
    console.error(`[db] Mongoose error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected. Attempting reconnect...');
});

mongoose.connection.on('reconnected', () => {
    console.log('[db] MongoDB reconnected.');
});

module.exports = connectDB;
