const express = require('express');
const router = express.Router();
const { protect, authorizeRoles, verifiedAlumniOnly } = require('../middleware/authMiddleware');
const { saasGuard } = require('../middleware/saasMiddleware');
const {
    createJob,
    getAllJobs,
    getMyPostedJobs,
    getAppliedJobs,
    applyToJob,
    getJobApplicants,
    getAlumniApplications,
    updateJob,
    deleteJob,
    getRecommendedJobs,
    updateApplicationStatus,
    flagJob,
    moderateJob,
    getAdminJobStats,
    exportJobsAdmin,
    saveJob,
    unsaveJob,
    getSavedJobs,
    updateJobStatus,
    withdrawApplication,
    getJobInsights,
    getJobById
} = require('../controllers/jobController');

// --- SAVED JOBS ---
router.get('/saved', protect, getSavedJobs);
router.post('/:id/save', protect, saveJob);
router.delete('/:id/save', protect, unsaveJob);

// --- JOB POSTING & DISCOVERY ---
router.post('/', protect, authorizeRoles('alumni', 'recruiter', 'admin'), verifiedAlumniOnly, saasGuard('job_postings'), createJob);
router.get('/recommended', protect, authorizeRoles('student'), getRecommendedJobs);
router.get('/applied', protect, authorizeRoles('student'), getAppliedJobs);
router.get('/my', protect, authorizeRoles('alumni', 'recruiter', 'admin'), getMyPostedJobs);
router.get('/', protect, getAllJobs);
router.get('/:id', protect, getJobById);

// --- JOB LIFECYCLE ---
router.patch('/:id/status', protect, authorizeRoles('alumni', 'recruiter', 'admin'), updateJobStatus);

// --- JOB INSIGHTS ---
router.get('/:id/insights', protect, authorizeRoles('alumni', 'recruiter', 'admin'), getJobInsights);

router.put('/:id', protect, authorizeRoles('alumni', 'recruiter', 'admin'), verifiedAlumniOnly, updateJob);
router.delete('/:id', protect, authorizeRoles('alumni', 'recruiter', 'admin'), verifiedAlumniOnly, deleteJob);

// --- APPLICATIONS (STUDENT SIDE) ---
router.post('/:id/apply', protect, authorizeRoles('student'), saasGuard('job_applications'), applyToJob);
router.patch('/:id/withdraw', protect, authorizeRoles('student'), withdrawApplication);
router.get('/applications/student', protect, authorizeRoles('student'), getAppliedJobs);

// --- APPLICATIONS (ALUMNI SIDE) ---
router.get('/applications/alumni', protect, authorizeRoles('alumni', 'recruiter', 'admin'), getAlumniApplications);
router.get('/:id/applicants', protect, authorizeRoles('alumni', 'recruiter', 'admin'), getJobApplicants);

// Status Update Routes (Both PATCH and PUT for compatibility)
router.patch('/applications/:id/:userId/status', protect, authorizeRoles('alumni', 'recruiter', 'admin'), updateApplicationStatus);
router.put('/:id/applicants/:userId/status', protect, authorizeRoles('alumni', 'recruiter', 'admin'), updateApplicationStatus);

// --- ADMIN ROUTES ---
router.get('/admin/stats', protect, authorizeRoles('admin'), getAdminJobStats);
router.get('/admin/export', protect, authorizeRoles('admin'), exportJobsAdmin);
router.patch('/:id/moderate', protect, authorizeRoles('admin'), moderateJob);

module.exports = router;
