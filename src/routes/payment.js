const express = require('express');
const router = express.Router();
const { getPayments, recordPayment } = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getPayments);
router.put('/:id/pay', recordPayment);

module.exports = router;
