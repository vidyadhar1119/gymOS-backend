const express = require('express');
const router = express.Router();
const { getTrainers, addTrainer, deleteTrainer, assignMembers, getTrainerMembers } = require('../controllers/trainerController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All routes need login

router.get('/', getTrainers);
router.post('/', authorize('owner'), addTrainer);
router.delete('/:id', authorize('owner'), deleteTrainer);
router.post('/:id/assign', authorize('owner'), assignMembers);
router.get('/:id/members', getTrainerMembers);

module.exports = router;
