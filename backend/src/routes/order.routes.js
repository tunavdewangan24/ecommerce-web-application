const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { createOrder, listOrders, listOrdersByUser, updateOrderStatus } = require('../db/store');

const router = express.Router();

router.post('/', protect, async (req, res) => {
  try {
    const { address, items } = req.body;
    if (!address || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Address and cart items are required.' });
    }

    const order = await createOrder({ user: req.user, address, items });
    return res.status(201).json(order);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.get('/my', protect, async (req, res) => {
  try {
    const orders = await listOrdersByUser(req.user.id);
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const orders = await listOrders();
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const order = await updateOrderStatus(req.params.id, req.body.status);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    return res.json(order);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

module.exports = router;
