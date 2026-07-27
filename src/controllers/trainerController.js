const User = require('../models/User');
const Member = require('../models/Member');

// ── GET /api/trainers — List all trainers for this gym ────────
const getTrainers = async (req, res) => {
    try {
        const trainers = await User.find({
            gymId: req.user.gymId,
            role: 'trainer'
        }).select('-password'); // Never send passwords to frontend

        // For each trainer, count how many members they have
        // We do this with Promise.all so all counts run in parallel
        const trainersWithStats = await Promise.all(
            trainers.map(async (trainer) => {
                const memberCount = await Member.countDocuments({
                    gymId: req.user.gymId,
                    assignedTrainer: trainer._id,
                });

                // .toObject() converts Mongoose document to plain JavaScript object
                // so we can add new properties to it
                return {
                    ...trainer.toObject(),
                    assignedMembersCount: memberCount,
                };
            })
        );

        res.json({ success: true, trainers: trainersWithStats });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── POST /api/trainers — Add a new trainer ────────────────────
const addTrainer = async (req, res) => {
    try {
        const { name, email, phone, specialization, experience, salary } = req.body;

        // Check if this email is already registered
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        // Create the trainer as a User with role: 'trainer'
        // Default password is their phone number — they can change it later
        const trainer = await User.create({
            name,
            email,
            password: phone,        // temp password = their phone number
            role: 'trainer',
            gymId: req.user.gymId,
            // Extra info stored in a 'profile' subdocument
            profile: {
                phone,
                specialization,
                experience: parseInt(experience) || 0,
                salary: parseInt(salary) || 0,
            }
        });

        res.status(201).json({
            success: true,
            message: `Trainer ${name} added! Default password is their phone number.`,
            trainer: { ...trainer.toObject(), password: undefined } // Don't send password back
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── DELETE /api/trainers/:id — Remove a trainer ───────────────
const deleteTrainer = async (req, res) => {
    try {
        const trainer = await User.findOneAndDelete({
            _id: req.params.id,
            gymId: req.user.gymId,
            role: 'trainer'
        });

        if (!trainer) {
            return res.status(404).json({ success: false, message: 'Trainer not found' });
        }

        // Unassign this trainer from all their members
        await Member.updateMany(
            { gymId: req.user.gymId, assignedTrainer: req.params.id },
            { $unset: { assignedTrainer: '' } }
        );

        res.json({ success: true, message: 'Trainer removed and unassigned from members' });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── POST /api/trainers/:id/assign — Assign members to a trainer ──
const assignMembers = async (req, res) => {
    try {
        const { memberIds } = req.body; // Array of member IDs

        if (!Array.isArray(memberIds)) {
            return res.status(400).json({ success: false, message: 'memberIds must be an array' });
        }

        // Verify the trainer belongs to this gym
        const trainer = await User.findOne({ _id: req.params.id, gymId: req.user.gymId, role: 'trainer' });
        if (!trainer) {
            return res.status(404).json({ success: false, message: 'Trainer not found' });
        }

        // Update all those members to have this trainer
        // $in means "where _id is IN this array"
        await Member.updateMany(
            { _id: { $in: memberIds }, gymId: req.user.gymId },
            { assignedTrainer: trainer._id }
        );

        res.json({ success: true, message: `Members assigned to ${trainer.name}` });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── GET /api/trainers/:id/members — Get trainer's members ─────
const getTrainerMembers = async (req, res) => {
    try {
        const members = await Member.find({
            gymId: req.user.gymId,
            assignedTrainer: req.params.id,
        }).select('name phone plan status membershipEnd');

        res.json({ success: true, members });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getTrainers, addTrainer, deleteTrainer, assignMembers, getTrainerMembers };
