const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');

dotenv.config();

connectDB();

const app = express();

const allowedOrigins = [
    'http://localhost:4200',
    'https://gym-os-frontend-omega.vercel.app'
];
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

app.use(express.json());

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/members', require('./src/routes/members'));
app.use('/api/attendance', require('./src/routes/attendance'));
app.use('/api/payments', require('./src/routes/payment'));
app.use('/api/dashboard', require('./src/routes/dashboard'));
app.use('/api/trainers', require('./src/routes/trainers'));
app.use('/api/analytics', require('./src/routes/analytics'));


app.get('/', (req, res) => {
    res.json({
        message: '💪 GymOS API is running!',
        version: '1.0.0',
        status: 'healthy'
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
});

const { startReminderScheduler } = require('./src/services/reminderService');
startReminderScheduler();

// TEMP: Test route — remove before production
const { checkAndSendReminders } = require('./src/services/reminderService');
app.get('/test-reminders', async (req, res) => {
    await checkAndSendReminders();
    res.json({ message: 'Reminders checked! See terminal for output.' });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 GymOS server running on http://localhost:${PORT}`);
});