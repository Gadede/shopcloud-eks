const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory store (use DynamoDB/RDS in production)
let products = [
  { id: "1", name: "Wireless Headphones", price: 89.99, category: "Electronics", image: "🎧", stock: 15, description: "Premium noise-cancelling wireless headphones with 30hr battery." },
  { id: "2", name: "Mechanical Keyboard", price: 149.99, category: "Electronics", image: "⌨️", stock: 8, description: "Tactile mechanical switches, RGB backlit, USB-C." },
  { id: "3", name: "Running Shoes", price: 119.99, category: "Sports", image: "👟", stock: 20, description: "Lightweight foam sole, breathable mesh upper." },
  { id: "4", name: "Leather Wallet", price: 49.99, category: "Accessories", image: "👜", stock: 30, description: "Slim genuine leather bifold with RFID blocking." },
  { id: "5", name: "Coffee Grinder", price: 79.99, category: "Kitchen", image: "☕", stock: 12, description: "Burr grinder with 15 grind settings, 200g hopper." },
  { id: "6", name: "Yoga Mat", price: 39.99, category: "Sports", image: "🧘", stock: 25, description: "Non-slip 6mm thick with alignment lines." },
];

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'product-service' }));

// Get all products
app.get('/products', (req, res) => {
  const { category, minPrice, maxPrice } = req.query;
  let result = [...products];
  if (category) result = result.filter(p => p.category === category);
  if (minPrice) result = result.filter(p => p.price >= parseFloat(minPrice));
  if (maxPrice) result = result.filter(p => p.price <= parseFloat(maxPrice));
  res.json(result);
});

// Get product by ID
app.get('/products/:id', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// Create product
app.post('/products', (req, res) => {
  const product = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() };
  products.push(product);
  res.status(201).json(product);
});

// Update product
app.put('/products/:id', (req, res) => {
  const idx = products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  products[idx] = { ...products[idx], ...req.body };
  res.json(products[idx]);
});

// Update stock
app.patch('/products/:id/stock', (req, res) => {
  const { quantity } = req.body;
  const idx = products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  products[idx].stock = Math.max(0, products[idx].stock + quantity);
  res.json({ id: req.params.id, stock: products[idx].stock });
});

// Delete product
app.delete('/products/:id', (req, res) => {
  products = products.filter(p => p.id !== req.params.id);
  res.json({ deleted: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Product service running on port ${PORT}`));
