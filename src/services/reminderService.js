const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Member = require('../models/Member');
const Gym = require('../models/Gym');
const { memberExpiryEmail } = require('../utils/emailTemplates');

// ── Email Transporter ─────────────────────────────────────────
// For development, we use Gmail. In production, use SendGrid or Resend.
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,  // Use Gmail App Password (not your real password)
        }
    });
};

// ── Send reminder to one member ───────────────────────────────
const sendReminder = async (memberEmail, memberName, gymName, expiryDate, daysLeft) => {
    if (!memberEmail) return; // Skip if no email on file

    try {
        const transporter = createTransporter();
        const template = memberExpiryEmail(memberName, gymName, expiryDate, daysLeft);

        await transporter.sendMail({
            from: `"${gymName} via GymOS" <${process.env.EMAIL_USER}>`,
            to: memberEmail,
            subject: template.subject,
            html: template.html,
        });

        console.log(`📧 Reminder sent to ${memberName} (${memberEmail}) — expires in ${daysLeft}d`);
    } catch (error) {
        console.error(`❌ Failed to send email to ${memberEmail}:`, error.message);
    }
};

// ── Main reminder job ─────────────────────────────────────────
const checkAndSendReminders = async () => {
    console.log('⏰ Running daily membership reminder check...');

    const now = new Date();

    // Find members expiring in exactly 1, 3, or 7 days
    const reminderDays = [1, 3, 7];

    for (const days of reminderDays) {
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + days);

        // Match members whose membership ends on that exact date
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

        const expiringMembers = await Member.find({
            membershipEnd: { $gte: startOfDay, $lte: endOfDay },
            status: 'active',
            email: { $ne: '' } // Only members with an email
        }).populate('gymId', 'name');

        console.log(`📋 Found ${expiringMembers.length} members expiring in ${days} day(s)`);

        for (const member of expiringMembers) {
            const gymName = member.gymId?.name || 'Your Gym';
            const expiryDate = new Date(member.membershipEnd).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'long', year: 'numeric'
            });

            await sendReminder(member.email, member.name, gymName, expiryDate, days);
        }
    }
};

// ── Schedule: Runs every day at 9:00 AM ──────────────────────
const startReminderScheduler = () => {
    // Cron format: second minute hour day month weekday
    cron.schedule('0 9 * * *', checkAndSendReminders, {
        timezone: 'Asia/Kolkata'
    });

    console.log('✅ Reminder scheduler started — runs daily at 9:00 AM IST');
};

// Export both, so we can also trigger it manually for testing
module.exports = { startReminderScheduler, checkAndSendReminders };
