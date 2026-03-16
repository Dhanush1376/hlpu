const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const User = require('../models/User');

        const email = 'dhanush1376@gmail.com';
        const user = await User.findOneAndUpdate(
            { email },
            {
                isVerified: true,
                verificationStatus: 'approved'
            },
            { new: true }
        );

        if (user) {
            console.log(`Successfully verified ${email}`);
            console.log(`New status: isVerified=${user.isVerified}, verificationStatus=${user.verificationStatus}`);
        } else {
            console.log(`User ${email} not found`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixUser();
