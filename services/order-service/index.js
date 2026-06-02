const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

let orders = [];

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'order-service' }));

// Get all orders (admin)
app.get('/orders', (req, res) => res.json(orders));

// Get orders by user
app.get('/orders/user/:userId', (req, res) => {
  const userOrders = orders.filter(o => o.userId === req.params.userId);
  res.json(userOrders);
});

// Get order by ID
app.get('/orders/:id', (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// Create order
app.post('/orders', async (req, res) => {
  const { userId, items, total, paymentId } = req.body;
  if (!userId || !items || !total) return res.status(400).json({ error: 'Missing required fields' });

  const order = {
    id: `ord_${uuidv4().slice(0, 8)}`,
    userId,
    items,
    total,
    paymentId,
    status: 'processing',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  orders.push(order);

  // Simulate async status updates
  setTimeout(() => {
    const idx = orders.findIndex(o => o.id === order.id);
    if (idx !== -1) { orders[idx].status = 'confirmed'; orders[idx].updatedAt = new Date().toISOString(); }
  }, 5000);
  setTimeout(() => {
    const idx = orders.findIndex(o => o.id === order.id);
    if (idx !== -1) { orders[idx].status = 'delivered'; orders[idx].updatedAt = new Date().toISOString(); }
  }, 30000);

  // Notify notification service
  try {
    await fetch(process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3005/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'order_created', userId, orderId: order.id, total }),
    });
  } catch (e) { console.log('Notification service unavailable'); }

  res.status(201).json(order);
});

// Update order status
app.patch('/orders/:id/status', (req, res) => {
  const { status } = req.body;
  const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });
  orders[idx].status = status;
  orders[idx].updatedAt = new Date().toISOString();
  res.json(orders[idx]);
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Order service running on port ${PORT}`));
