const Member = require('../models/Member');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');

// ── GET /api/analytics — All analytics data in one call ───────
const mongoose = require('mongoose');


const getAnalytics = async (req, res) => {
    try {
        const gymId = new mongoose.Types.ObjectId(req.user.gymId);

        // Last 6 months date range
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const [
            revenueByMonth,
            memberGrowth,
            attendanceTrend,
            membershipBreakdown,
            topMembers,
        ] = await Promise.all([

            // 1. Revenue per month (last 6 months)
            Payment.aggregate([
                {
                    $match: {
                        gymId,
                        status: 'paid',
                        paidDate: { $gte: sixMonthsAgo }
                    }
                },
                {
                    $group: {
                        _id: {
                            // $month and $year are MongoDB date operators
                            // They extract the month/year from a date field
                            year: { $year: '$paidDate' },
                            month: { $month: '$paidDate' }
                        },
                        revenue: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]),

            // 2. New members per month (last 6 months)
            Member.aggregate([
                {
                    $match: {
                        gymId,
                        createdAt: { $gte: sixMonthsAgo }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' }
                        },
                        newMembers: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]),

            // 3. Attendance per day (last 30 days)
            Attendance.aggregate([
                {
                    $match: {
                        gymId,
                        // date is stored as string "2025-07-01"
                        // We compare strings directly — works because format is consistent
                        date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
                    }
                },
                {
                    $group: {
                        _id: '$date',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } },
                { $limit: 30 }
            ]),

            // 4. Membership type breakdown (pie chart data)
            Member.aggregate([
                { $match: { gymId, status: 'active' } },
                {
                    $group: {
                        _id: '$plan',
                        count: { $sum: 1 }
                    }
                }
            ]),

            // 5. Top 5 most active members (highest attendance)
            Attendance.aggregate([
                { $match: { gymId } },
                {
                    $group: {
                        _id: '$memberId',
                        memberName: { $first: '$memberName' },
                        visits: { $sum: 1 }
                    }
                },
                { $sort: { visits: -1 } },
                { $limit: 5 }
            ]),

        ]);

        // ── Format the month names for Chart.js labels ─────────────
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const formatMonthData = (data) =>
            data.map(d => ({
                label: `${monthNames[d._id.month - 1]} ${d._id.year}`,
                ...d
            }));

        res.json({
            success: true,
            analytics: {
                revenueByMonth: formatMonthData(revenueByMonth),
                memberGrowth: formatMonthData(memberGrowth),
                attendanceTrend: attendanceTrend.map(d => ({ date: d._id, count: d.count })),
                membershipBreakdown: membershipBreakdown.map(d => ({ plan: d._id, count: d.count })),
                topMembers: topMembers.map(d => ({ name: d.memberName, visits: d.visits })),
            }
        });

    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getAnalytics };
