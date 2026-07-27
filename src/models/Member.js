const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    email: { type: String, default: '' },
    age: { type: Number },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    address: { type: String, default: '' },
    emergencyContact: { type: String, default: '' },
    plan: {
        type: String,
        enum: ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'],
        required: true
    },
    membershipStart: { type: Date, required: true },
    membershipEnd: { type: Date, required: true },
    status: { type: String, enum: ['active', 'expired', 'paused'], default: 'active' },
    assignedTrainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
    timestamps: true
});

// ── Auto-calculate membership end date (REWRITTEN WITHOUT NEXT) ──
memberSchema.pre('save', function () {

    if (this.isModified('membershipStart') || this.isModified('plan')) {
        const start = new Date(this.membershipStart);
        const planDays = {
            'Monthly': 30,
            'Quarterly': 90,
            'Half-Yearly': 180,
            'Yearly': 365
        };
        const days = planDays[this.plan] || 30;
        this.membershipEnd = new Date(start.setDate(start.getDate() + days));
    }

});

module.exports = mongoose.model('Member', memberSchema);
