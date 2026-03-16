const mongoose = require('mongoose');
const dotenv = require('dotenv');
const CollegeDataset = require('./models/CollegeDataset');

dotenv.config();

const seedData = [
    { regNo: 'ALUM001', name: 'John Doe', passoutYear: 2020, department: 'CSE', stream: 'B.Tech' },
    { regNo: 'ALUM002', name: 'Jane Smith', passoutYear: 2021, department: 'ECE', stream: 'B.Tech' },
    { regNo: 'ALUM003', name: 'Bob Johnson', passoutYear: 2019, department: 'ME', stream: 'M.Tech' },
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        await CollegeDataset.deleteMany();
        await CollegeDataset.insertMany(seedData);
        console.log('College Dataset seeded successfully');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedDB();
