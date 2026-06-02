const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

let notifications = [];
let queue = []; // Simple in-memory queue (use SQS in production)

// Templates
const templates = {
  order_created: (data) => ({
    subject: `Order Confirmed #${data.orderId}`,
    body: `Hi! Your order #${data.orderId} for $${data.total?.toFixed(2)} has been placed and is being processed.`,
  }),
  order_shipped: (data) => ({
    subject: `Your Order Has Shipped! #${data.orderId}`,
    body: `Great news! Your order #${data.orderId} is on its way. Tracking: ${data.trackingNumber}`,
  }),
  order_delivered: (data) => ({
    subject: `Order Delivered! #${data.orderId}`,
    body: `Your order #${data.orderId} has been delivered. Enjoy your purchase!`,
  }),
  welcome: (data) => ({
    subject: `Welcome to ShopCloud, ${data.name}!`,
    body: `Hi ${data.name}, welcome aboard! Start shopping at ShopCloud.`,
  }),
};

const processNotification = async (notification) => {
  const template = templates[notification.type];
  if (!template) { console.log(`Unknown notification type: ${notification.type}`); return; }
  const { subject, body } = template(notification.data || notification);

  // In production: send via AWS SES / SNS
  console.log(`📧 [EMAIL] To: user-${notification.userId} | Subject: ${subject}`);
  console.log(`   Body: ${body}`);

  const record = {
    id: uuidv4(),
    userId: notification.userId,
    type: notification.type,
    subject,
    body,
    status: 'sent',
    sentAt: new Date().toISOString(),
  };
  notifications.push(record);
  return record;
};

// Worker: process queue every 2 seconds
setInterval(async () => {
  if (queue.length > 0) {
    const notif = queue.shift();
    await processNotification(notif);
  }
}, 2000);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'notification-service', queueSize: queue.length }));

// Send notification (enqueue)
app.post('/notifications', (req, res) => {
  const { type, userId, ...data } = req.body;
  if (!type || !userId) return res.status(400).json({ error: 'type and userId required' });

  const job = { id: uuidv4(), type, userId, ...data, enqueuedAt: new Date().toISOString() };
  queue.push(job);

  res.status(202).json({ message: 'Notification queued', jobId: job.id });
});

// Get notifications for a user
app.get('/notifications/user/:userId', (req, res) => {
  const userNotifs = notifications.filter(n => n.userId === req.params.userId);
  res.json(userNotifs);
});

// Get queue status
app.get('/notifications/queue/status', (req, res) => {
  res.json({ queueSize: queue.length, processed: notifications.length });
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`Notification service running on port ${PORT}`));
