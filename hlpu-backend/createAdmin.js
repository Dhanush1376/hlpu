const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

const setupAdmin = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected successfully!');

        const email = 'hlpuscholar@gmail.com';
        const password = 'admin123';
        const name = 'hLPU Admin';

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Find or create user
        let user = await User.findOne({ email });

        if (user) {
            console.log('User found, updating to admin...');
            user.role = 'admin';
            user.password = hashedPassword;
            user.name = name;
            await user.save();
            console.log('User updated successfully!');
        } else {
            console.log('User not found, creating new admin...');
            user = await User.create({
                name,
                email,
                password: hashedPassword,
                role: 'admin',
                department: 'Administration'
            });
            console.log('User created successfully!');
        }

        console.log(`\nCREDENTIALS:\nEmail: ${email}\nPassword: ${password}\nRole: admin\n`);
        process.exit(0);
    } catch (err) {
        console.error('Error setting up admin:', err);
        process.exit(1);
    }
};

setupAdmin();
