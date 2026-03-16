const mongoose = require('mongoose');
const CoursePath = require('./models/CoursePath');
const dotenv = require('dotenv');
dotenv.config();

const uri = process.env.MONGO_URI;

async function seed() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        await CoursePath.updateMany(
            { role: /Software Engineer/i },
            { $set: { skills: ['JavaScript', 'Node.js', 'MongoDB', 'React', 'Problem Solving', 'Git', 'CSS', 'HTML', 'REST API'] } }
        );

        await CoursePath.updateMany(
            { role: /UI\/UX/i },
            { $set: { skills: ['Figma', 'UI Design', 'UX Research', 'Prototyping', 'Adobe XD', 'Color Theory', 'Typography', 'Usability Testing'] } }
        );

        await CoursePath.updateMany(
            { role: /Data Analyst/i },
            { $set: { skills: ['Python', 'SQL', 'Tableau', 'Excel', 'Statistics', 'Data Visualization', 'Pandas', 'NumPy'] } }
        );

        console.log('Skills seeded successfully');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
