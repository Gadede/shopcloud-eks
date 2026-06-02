const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

let payments = [];

const validateCard = (cardNumber) => {
  // Luhn algorithm
  const digits = cardNumber.replace(/\D/g, '');
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i]);
    if (isEven) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    isEven = !isEven;
  }
  return sum % 10 === 0;
};

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'payment-service' }));

// Process payment
app.post('/payments/process', async (req, res) => {
  const { amount, card, userId, orderId } = req.body;

  if (!amount || !card) return res.status(400).json({ error: 'Missing amount or card details' });
  if (amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

  const cardNumber = card.cardNumber?.replace(/\s/g, '') || '';

  // Simulate card validation
  if (!validateCard(cardNumber) && cardNumber !== '4242424242424242') {
    return res.status(402).json({ error: 'Card declined' });
  }

  // Simulate processing delay
  await new Promise(r => setTimeout(r, 500));

  // Simulate 5% failure rate (except for test card)
  if (cardNumber !== '4242424242424242' && Math.random() < 0.05) {
    return res.status(402).json({ error: 'Insufficient funds' });
  }

  const payment = {
    paymentId: `pay_${uuidv4().slice(0, 16)}`,
    userId,
    orderId,
    amount,
    currency: 'USD',
    status: 'succeeded',
    cardLast4: cardNumber.slice(-4),
    createdAt: new Date().toISOString(),
  };

  payments.push(payment);
  res.status(201).json(payment);
});

// Get payment by ID
app.get('/payments/:paymentId', (req, res) => {
  const payment = payments.find(p => p.paymentId === req.params.paymentId);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  res.json(payment);
});

// Get payments by user
app.get('/payments/user/:userId', (req, res) => {
  const userPayments = payments.filter(p => p.userId === req.params.userId);
  res.json(userPayments);
});

// Refund
app.post('/payments/:paymentId/refund', (req, res) => {
  const idx = payments.findIndex(p => p.paymentId === req.params.paymentId);
  if (idx === -1) return res.status(404).json({ error: 'Payment not found' });
  payments[idx].status = 'refunded';
  payments[idx].refundedAt = new Date().toISOString();
  res.json(payments[idx]);
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`Payment service running on port ${PORT}`));
