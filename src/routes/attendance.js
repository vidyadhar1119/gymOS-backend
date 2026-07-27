const express = require('express');
const router = express.Router();
const { markAttendance, getTodayAttendance, undoAttendance, getActiveMembers } = require('../controllers/attendanceController');
const { protect } = require('../middleware/auth');

router.use(protect); // All routes require login

router.get('/today', getTodayAttendance);
router.get('/members', getActiveMembers);
router.post('/checkin', markAttendance);
router.delete('/:id', undoAttendance);

module.exports = router;
