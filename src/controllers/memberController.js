const Member = require('../models/Member');
const { createMemberPayment } = require('./paymentController');

const planPrices = {
    'Monthly': 999,
    'Quarterly': 2499,
    'Half-Yearly': 4499,
    'Yearly': 7999,
};

const planDays = {
    'Monthly': 30,
    'Quarterly': 90,
    'Half-Yearly': 180,
    'Yearly': 365,
};

const getMembers = async (req, res) => {
    try {
        const { status, search } = req.query;
        let query = { gymId: req.user.gymId };

        if (status && status !== 'all') query.status = status;

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        const members = await Member.find(query).sort({ createdAt: -1 });
        res.json({ success: true, count: members.length, members });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── POST add a new member ────────────────────────────────────
const addMember = async (req, res) => {
    try {
        // ✅ FIX: intercept startDate → membershipStart/End before Mongoose validation
        const { startDate, plan, ...rest } = req.body;

        if (!startDate) {
            return res.status(400).json({ success: false, message: 'startDate is required' });
        }
        if (!plan) {
            return res.status(400).json({ success: false, message: 'plan is required' });
        }

        const membershipStart = new Date(startDate);
        if (isNaN(membershipStart.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid startDate format' });
        }

        // Calculate membershipEnd based on plan duration
        const days = planDays[plan] || 30;
        const membershipEnd = new Date(membershipStart);
        membershipEnd.setDate(membershipEnd.getDate() + days);

        const member = await Member.create({
            ...rest,
            plan,
            membershipStart,
            membershipEnd,
            gymId: req.user.gymId,
            addedBy: req.user.id,
        });

        // Auto-create a pending payment for this member
        await createMemberPayment({
            gymId: req.user.gymId,
            memberId: member._id,
            memberName: member.name,
            plan: member.plan,
            amount: planPrices[member.plan] || 999,
            dueDate: member.membershipEnd,
        });

        res.status(201).json({ success: true, message: 'Member added!', member });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── PUT update a member ──────────────────────────────────────
const updateMember = async (req, res) => {
    try {
        const member = await Member.findOneAndUpdate(
            { _id: req.params.id, gymId: req.user.gymId },
            req.body,
            { new: true, runValidators: true }
        );
        if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
        res.json({ success: true, member });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── DELETE a member ──────────────────────────────────────────
const deleteMember = async (req, res) => {
    try {
        const member = await Member.findOneAndDelete({ _id: req.params.id, gymId: req.user.gymId });
        if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
        res.json({ success: true, message: 'Member removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── GET dashboard stats ──────────────────────────────────────
const getDashboardStats = async (req, res) => {
    try {
        const gymId = req.user.gymId;

        const [total, active, expired, expiringCount] = await Promise.all([
            Member.countDocuments({ gymId }),
            Member.countDocuments({ gymId, status: 'active' }),
            Member.countDocuments({ gymId, status: 'expired' }),
            Member.countDocuments({
                gymId,
                membershipEnd: {
                    $gte: new Date(),
                    $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            }),
        ]);

        res.json({ success: true, stats: { total, active, expired, expiringCount } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getMembers, addMember, updateMember, deleteMember, getDashboardStats };
