const express = require('express');
const { adminOnly, protect } = require('../middleware/auth');
const { listProducts, getProduct, createProduct, updateProduct, deleteProduct } = require('../db/store');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const products = await listProducts({ category: req.query.category, q: req.query.q });
    return res.json(products);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await getProduct(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    return res.json(product);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const required = ['name', 'description', 'price', 'category', 'image', 'stock'];
    const missing = required.find((key) => req.body[key] === undefined || req.body[key] === '');
    if (missing) return res.status(400).json({ message: `${missing} is required.` });

    const product = await createProduct(req.body);
    return res.status(201).json(product);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await updateProduct(req.params.id, req.body);
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    return res.json(product);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const removed = await deleteProduct(req.params.id);
    if (!removed) return res.status(404).json({ message: 'Product not found.' });
    return res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
