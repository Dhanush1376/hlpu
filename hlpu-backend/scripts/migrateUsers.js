const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB...');

        const User = require('../models/User');
        const users = await User.find({}).lean();

        console.log(`Processing ${users.length} users...`);

        let count = 0;
        for (const user of users) {
            if (user.settings) {
                const updates = {};

                // Fields to move out of settings
                const fieldsToMove = [
                    'accountStatus', 'otp', 'otpExpires', 'isVerified',
                    'verificationStatus', 'resetPasswordToken', 'resetPasswordExpire'
                ];

                let hasUpdates = false;
                for (const field of fieldsToMove) {
                    if (user.settings[field] !== undefined) {
                        updates[field] = user.settings[field];
                        hasUpdates = true;
                    }
                }

                if (hasUpdates) {
                    await User.findByIdAndUpdate(user._id, {
                        $set: updates,
                        $unset: {
                            'settings.accountStatus': '',
                            'settings.otp': '',
                            'settings.otpExpires': '',
                            'settings.isVerified': '',
                            'settings.verificationStatus': '',
                            'settings.resetPasswordToken': '',
                            'settings.resetPasswordExpire': ''
                        }
                    });
                    count++;
                }
            }
        }

        console.log(`Successfully migrated ${count} users.`);
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
