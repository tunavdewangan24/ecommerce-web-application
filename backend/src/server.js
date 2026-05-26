require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB, getDbMode } = require('./config/db');
const { seedIfEmpty } = require('./db/store');
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => {
  res.json({
    app: 'E-Commerce Web Application API',
    status: 'online',
    databaseMode: getDbMode(),
    endpoints: ['/api/auth', '/api/products', '/api/orders']
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', databaseMode: getDbMode() });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));

async function start() {
  await connectDB();
  await seedIfEmpty();
  app.listen(PORT, () => {
    console.log(`E-Commerce API running on http://localhost:${PORT}`);
    console.log(`Database mode: ${getDbMode()}`);
    console.log('Demo logins -> admin@shop.com/admin123 and user@shop.com/user123');
  });
}

start().catch((error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});
