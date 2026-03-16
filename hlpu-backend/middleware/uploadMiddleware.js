const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/profile-pics');
    },
    filename: (req, file, cb) => {
        cb(null, `profile-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed'), false);
    }
};

const roadmapStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/roadmaps');
    },
    filename: (req, file, cb) => {
        const slug = req.body.slug || 'temp';
        cb(null, `roadmap-${slug}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const roadmapFileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed for roadmaps'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadRoadmap = multer({
    storage: roadmapStorage,
    fileFilter: roadmapFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB for PDFs
});

const startupStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/startups');
    },
    filename: (req, file, cb) => {
        cb(null, `pitch-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const uploadStartup = multer({
    storage: startupStorage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

module.exports = { upload, uploadRoadmap, uploadStartup };
