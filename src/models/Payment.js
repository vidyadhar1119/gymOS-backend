const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    memberName: { type: String },
    plan: { type: String },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    paidDate: { type: Date, default: null },
    method: { type: String, enum: ['cash', 'upi', 'card', null], default: null },
    status: { type: String, enum: ['paid', 'pending', 'overdue'], default: 'pending' },
    notes: { type: String, default: '' },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
    timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);
