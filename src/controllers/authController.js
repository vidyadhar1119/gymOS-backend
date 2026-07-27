const User = require('../models/User');
const Gym = require('../models/Gym');
const generateToken = require('../utils/generateToken');

// ── @route  POST /api/auth/register ─────────────────────────
// ── @desc   Register a new gym + owner account ───────────────
// ── @access Public ───────────────────────────────────────────
const registerGym = async (req, res) => {
    try {
        const { gymName, gymPhone, city, pincode, address, ownerName, email, password } = req.body;

        // 1. Check if email already registered
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        // 2. Create the Gym first
        const gym = await Gym.create({
            name: gymName,
            phone: gymPhone,
            address,
            city,
            pincode,
        });

        // 3. Create the Owner user linked to this gym
        const user = await User.create({
            name: ownerName,
            email,
            password, // will be auto-hashed by model's pre-save hook
            role: 'owner',
            gymId: gym._id,
        });

        // 4. Link the owner to the gym
        gym.owner = user._id;
        await gym.save();

        // 5. Generate token and send response
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'Gym registered successfully!',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                gymId: gym._id,
                gym: {
                    name: gym.name,
                    city: gym.city,
                }
            }
        });
    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// ── @route  POST /api/auth/login ────────────────────────────
// ── @desc   Login and get token ─────────────────────────────
// ── @access Public ──────────────────────────────────────────
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Check email and password provided
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        // 2. Find user by email (include password for comparison)
        const user = await User.findOne({ email }).select('+password').populate('gymId', 'name city');

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // 3. Check password using our model method
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // 4. Generate token
        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                gymId: user.gymId?._id,
                gym: user.gymId,
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// ── @route  GET /api/auth/me ─────────────────────────────────
// ── @desc   Get current logged-in user ──────────────────────
// ── @access Private (needs token) ───────────────────────────
const getMe = async (req, res) => {
    const user = await User.findById(req.user.id).populate('gymId', 'name city address');
    res.json({ success: true, user });
};

module.exports = { registerGym, login, getMe };
