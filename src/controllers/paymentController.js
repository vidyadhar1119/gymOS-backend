const Payment = require('../models/Payment');
const Member = require('../models/Member');

// ── GET /api/payments ────────────────────────────────────────
const getPayments = async (req, res) => {
    try {
        const { status } = req.query;
        let query = { gymId: req.user.gymId };
        if (status && status !== 'all') query.status = status;

        const payments = await Payment.find(query).sort({ dueDate: 1 });

        // Stats for the cards
        const all = await Payment.find({ gymId: req.user.gymId });
        const collected = all.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
        const pending = all.filter(p => p.status !== 'paid').reduce((s, p) => s + p.amount, 0);
        const overdue = all.filter(p => p.status === 'overdue').length;

        res.json({
            success: true,
            payments,
            stats: { totalCollected: collected, totalPending: pending, overdueCount: overdue }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── PUT /api/payments/:id/pay ────────────────────────────────
const recordPayment = async (req, res) => {
    try {
        const { method, notes, paidDate } = req.body;

        const payment = await Payment.findOneAndUpdate(
            { _id: req.params.id, gymId: req.user.gymId },
            {
                status: 'paid',
                method,
                notes: notes || '',
                paidDate: paidDate ? new Date(paidDate) : new Date(),
                recordedBy: req.user.id,
            },
            { new: true }
        );

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        res.json({ success: true, message: 'Payment recorded', payment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Called automatically when a new member joins
const createMemberPayment = async ({ gymId, memberId, memberName, plan, amount, dueDate }) => {
    return await Payment.create({ gymId, memberId, memberName, plan, amount, dueDate });
};

module.exports = { getPayments, recordPayment, createMemberPayment };
