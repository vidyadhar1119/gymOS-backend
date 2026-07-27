const Attendance = require('../models/Attendance');
const Member = require('../models/Member');

const markAttendance = async (req, res) => {
    try {
        const { memberId } = req.body;
        const gymId = req.user.gymId;

        // Verify member belongs to this gym
        const member = await Member.findOne({ _id: memberId, gymId });
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        // Today's date as string "2025-06-26" (for easy querying & unique index)
        const today = new Date().toISOString().split('T')[0];

        // Check if already marked today (the unique index in model prevents duplicate)
        const existing = await Attendance.findOne({ memberId, date: today });
        if (existing) {
            return res.status(400).json({ success: false, message: `${member.name} is already marked present today` });
        }

        // Get current time as "09:30 AM"
        const checkInTime = new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        const record = await Attendance.create({
            gymId,
            memberId,
            memberName: member.name,
            date: today,
            checkInTime,
            markedBy: req.user.id,
        });

        res.status(201).json({ success: true, message: `${member.name} marked present`, record });

    } catch (error) {
        // Handles MongoDB duplicate key error gracefully
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Member already marked today' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── GET /api/attendance/today ────────────────────────────────
const getTodayAttendance = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const gymId = req.user.gymId;

        const records = await Attendance.find({ gymId, date: today })
            .populate('memberId', 'name plan')
            .sort({ createdAt: -1 });

        // Also get total active member count for the stat card
        const totalActive = await Member.countDocuments({ gymId, status: 'active' });

        res.json({
            success: true,
            records,
            totalActive,
            presentCount: records.length
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── DELETE /api/attendance/:id ───────────────────────────────
const undoAttendance = async (req, res) => {
    try {
        const record = await Attendance.findOneAndDelete({
            _id: req.params.id,
            gymId: req.user.gymId
        });

        if (!record) {
            return res.status(404).json({ success: false, message: 'Attendance record not found' });
        }

        res.json({ success: true, message: 'Attendance removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── GET /api/attendance/members ──────────────────────────────
// Returns all active members for the search dropdown
const getActiveMembers = async (req, res) => {
    try {
        const members = await Member.find({ gymId: req.user.gymId, status: 'active' })
            .select('name phone plan')
            .sort({ name: 1 });

        res.json({ success: true, members });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { markAttendance, getTodayAttendance, undoAttendance, getActiveMembers };
