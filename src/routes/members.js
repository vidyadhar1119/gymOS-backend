const express = require('express');
const router = express.Router();
const { getMembers, addMember, updateMember, deleteMember, getDashboardStats } = require('../controllers/memberController');
const { protect, authorize } = require('../middleware/auth');

// All routes below require a valid token
router.use(protect);

router.get('/stats', getDashboardStats);
router.get('/', getMembers);
router.post('/', authorize('owner', 'receptionist'), addMember);
router.put('/:id', authorize('owner', 'receptionist'), updateMember);
router.delete('/:id', authorize('owner'), deleteMember);

router.put('/:id/assign-trainer', authorize('owner'), async (req, res) => {
    try {
        const { trainerId } = req.body;
        const member = await require('../models/Member').findOneAndUpdate(
            { _id: req.params.id, gymId: req.user.gymId },
            { assignedTrainer: trainerId || null },
            { new: true }
        );
        if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
        res.json({ success: true, message: 'Trainer assigned', member });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


module.exports = router;
