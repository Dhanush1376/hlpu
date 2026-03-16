const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

const changeAdminPassword = async (newPassword) => {
    try {
        if (!newPassword) {
            console.error('Usage: node changeAdminPassword.js <your_new_password>');
            process.exit(1);
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected successfully!');

        const email = 'hlpuscholar@gmail.com';

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Find and update user
        const result = await User.findOneAndUpdate(
            { email },
            { $set: { password: hashedPassword } },
            { new: true }
        );

        if (result) {
            console.log(`Password updated successfully for ${email}!`);
        } else {
            console.error(`User ${email} not found.`);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error changing password:', err);
        process.exit(1);
    }
};

const passwordArg = process.argv[2];
changeAdminPassword(passwordArg);
