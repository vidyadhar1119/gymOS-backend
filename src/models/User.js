const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 8 },
    role: { type: String, enum: ['owner', 'trainer', 'receptionist'], default: 'owner' },
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym' },
    isActive: { type: Boolean, default: true },
    // Add this INSIDE the userSchema definition, after 'isActive':
    profile: {
        phone: { type: String, default: '' },
        specialization: { type: String, default: '' },
        experience: { type: Number, default: 0 },
        salary: { type: Number, default: 0 },
        rating: { type: Number, default: 0, min: 0, max: 5 },
    },

}, {
    timestamps: true
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);