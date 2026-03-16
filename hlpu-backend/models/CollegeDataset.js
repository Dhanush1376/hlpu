const mongoose = require('mongoose');

const collegeDatasetSchema = new mongoose.Schema({
    regNo: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    name: String,
    passoutYear: {
        type: Number,
        required: true,
        index: true
    },
    department: String,
    stream: String
}, { timestamps: true });

module.exports = mongoose.model('CollegeDataset', collegeDatasetSchema);
