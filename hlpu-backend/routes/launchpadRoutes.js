const express = require('express');
const router = express.Router();
const {
    createProject,
    getProjects,
    getProject,
    getMyProjects,
    updateProject,
    deleteProject,
    applyToProject,
    getMyApplications,
    getReceivedApplications,
    getApplicationStats,
    getAllApplicationsAdmin,
    getProjectApplicants,
    respondToApplication,
    updateStartupStage,
    updateEvaluation,
    manageTeam,
    updateMilestone,
    updateReadiness,
    approveProject,
    uploadPitchDeck
} = require('../controllers/launchpadController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { uploadStartup } = require('../middleware/uploadMiddleware');

// Public routes
router.get('/projects', getProjects);
router.get('/projects/:id', getProject);

// Protected routes (All authenticated users)
router.use(protect);

// Stats (Used by all roles for their respective dashboards)
router.get('/applications/stats', getApplicationStats);

// Admin Only route
router.get('/applications/admin/all', authorizeRoles('admin'), getAllApplicationsAdmin);

// Student/Alumni protected routes (Project management & application)
router.post('/projects', authorizeRoles('student', 'alumni'), createProject);
router.get('/my-projects', authorizeRoles('student', 'alumni'), getMyProjects);
router.patch('/projects/:id', authorizeRoles('student', 'alumni'), updateProject);
router.delete('/projects/:id', authorizeRoles('student', 'alumni'), deleteProject);

router.post('/apply/:projectId', authorizeRoles('student', 'alumni'), applyToProject);
router.get('/applications/me', authorizeRoles('student', 'alumni'), getMyApplications);
router.get('/applications/received', authorizeRoles('student', 'alumni'), getReceivedApplications);
router.get('/projects/:id/applicants', authorizeRoles('student', 'alumni'), getProjectApplicants);

// Response route (Owner OR Admin)
router.patch('/applications/:id/respond', authorizeRoles('student', 'alumni', 'admin'), respondToApplication);

// --- Incubation Studio Routes ---
router.patch('/startups/:id/stage', authorizeRoles('admin'), updateStartupStage);
router.patch('/startups/:id/evaluation', authorizeRoles('admin'), updateEvaluation);
router.patch('/startups/:id/team', authorizeRoles('student', 'alumni'), manageTeam);
router.patch('/startups/:id/milestones/:milestoneId', authorizeRoles('student', 'alumni', 'admin'), updateMilestone);
router.patch('/startups/:id/readiness', authorizeRoles('student', 'alumni'), updateReadiness);
router.patch('/projects/:id/approve', authorizeRoles('admin'), approveProject);
router.post('/upload-pitch', protect, uploadStartup.single('pitchDeck'), uploadPitchDeck);

module.exports = router;
