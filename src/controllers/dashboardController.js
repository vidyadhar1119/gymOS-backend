const Member = require('../models/Member');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');

// ── GET /api/dashboard/stats ─────────────────────────────────
// Returns all the numbers the dashboard needs in ONE request
const mongoose = require('mongoose');


const getDashboardStats = async (req, res) => {
    try {
        const gymId = new mongoose.Types.ObjectId(req.user.gymId);

        // Today's date as string "2025-07-02"
        const today = new Date().toISOString().split('T')[0];

        // First and last day of the current month (for revenue)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // 7 days from now (for expiring members)
        const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // ── Run ALL queries at the same time using Promise.all ─────
        // This is like asking 5 waiters to go to the kitchen simultaneously
        // instead of sending one waiter 5 times
        const [
            totalMembers,
            activeMembers,
            todayAttendance,
            revenueResult,
            expiringCount,
            newMembersThisMonth,
            pendingFees,
        ] = await Promise.all([

            // 1. Total members in this gym
            Member.countDocuments({ gymId }),

            // 2. Active members only
            Member.countDocuments({ gymId, status: 'active' }),

            // 3. How many members checked in today
            Attendance.countDocuments({ gymId, date: today }),

            // 4. Sum of all PAID payments this month
            // .aggregate() is MongoDB's powerful data transformation tool
            Payment.aggregate([
                {
                    // $match = filter (like WHERE in SQL)
                    $match: {
                        gymId: gymId,
                        status: 'paid',
                        paidDate: { $gte: startOfMonth, $lte: endOfMonth }
                    }
                },
                {
                    // $group = combine results (like GROUP BY in SQL)
                    // _id: null means "group everything together"
                    // totalRevenue: add up all 'amount' fields
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$amount' }
                    }
                }
            ]),

            // 5. Members whose membership ends within 7 days
            Member.countDocuments({
                gymId,
                status: 'active',
                membershipEnd: { $gte: new Date(), $lte: sevenDaysLater }
            }),

            // 6. New members who joined this month
            Member.countDocuments({
                gymId,
                createdAt: { $gte: startOfMonth, $lte: endOfMonth }
            }),

            // 7. Total pending/overdue fee amount
            Payment.aggregate([
                {
                    $match: {
                        gymId,
                        status: { $in: ['pending', 'overdue'] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: '$amount' }
                    }
                }
            ]),

        ]);

        // ── Build the response ─────────────────────────────────────
        // aggregate() always returns an array. If no results, it's []
        // So we safely access [0]?.totalRevenue with a fallback of 0
        const revenueThisMonth = revenueResult[0]?.totalRevenue || 0;
        const feesDue = pendingFees[0]?.totalAmount || 0;

        res.json({
            success: true,
            stats: {
                totalMembers,
                activeMembers,
                todayAttendance,
                revenueThisMonth,
                feesDue,
                expiringCount,
                newMembersThisMonth,
            }
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getDashboardStats };
