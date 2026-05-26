const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { products: seedProducts } = require('../data/mockData');
const { getDbMode } = require('../config/db');

const state = {
  users: [],
  products: [],
  orders: []
};

function newId() {
  return crypto.randomUUID();
}

function publicUser(user) {
  if (!user) return null;
  const id = user._id ? String(user._id) : user.id;
  return { id, name: user.name, email: user.email, role: user.role };
}

function normalizeProduct(product) {
  const raw = product.toObject ? product.toObject() : product;
  return { ...raw, id: raw._id ? String(raw._id) : raw.id, _id: undefined };
}

function normalizeOrder(order) {
  const raw = order.toObject ? order.toObject() : order;
  return {
    ...raw,
    id: raw._id ? String(raw._id) : raw.id,
    user: raw.user && raw.user._id ? String(raw.user._id) : String(raw.user),
    _id: undefined
  };
}

function isMongo() {
  return getDbMode() === 'mongo';
}

async function seedIfEmpty() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  if (isMongo()) {
    const userCount = await User.countDocuments();
    const productCount = await Product.countDocuments();

    if (userCount === 0) {
      await User.create([
        { name: 'Admin User', email: 'admin@shop.com', password: adminPassword, role: 'admin' },
        { name: 'Demo User', email: 'user@shop.com', password: userPassword, role: 'user' }
      ]);
      console.log('Default admin and user accounts created.');
    }

    if (productCount === 0) {
      await Product.insertMany(seedProducts);
      console.log('Sample products inserted into MongoDB.');
    }
    return;
  }

  if (state.users.length === 0) {
    state.users.push(
      { id: newId(), name: 'Admin User', email: 'admin@shop.com', password: adminPassword, role: 'admin' },
      { id: newId(), name: 'Demo User', email: 'user@shop.com', password: userPassword, role: 'user' }
    );
  }

  if (state.products.length === 0) {
    state.products = seedProducts.map((product) => ({ ...product, id: newId(), createdAt: new Date(), updatedAt: new Date() }));
  }
}

async function findUserByEmail(email) {
  const cleanEmail = String(email).toLowerCase().trim();
  if (isMongo()) return User.findOne({ email: cleanEmail });
  return state.users.find((user) => user.email === cleanEmail) || null;
}

async function findUserById(id) {
  if (isMongo()) return User.findById(id);
  return state.users.find((user) => user.id === id) || null;
}

async function createUser({ name, email, password, role = 'user' }) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const cleanEmail = String(email).toLowerCase().trim();

  if (isMongo()) {
    const user = await User.create({ name, email: cleanEmail, password: hashedPassword, role });
    return publicUser(user);
  }

  const user = { id: newId(), name, email: cleanEmail, password: hashedPassword, role, createdAt: new Date(), updatedAt: new Date() };
  state.users.push(user);
  return publicUser(user);
}

async function listProducts(filters = {}) {
  const { category, q } = filters;

  if (isMongo()) {
    const query = {};
    if (category && category !== 'All') query.category = category;
    if (q) query.$or = [
      { name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { category: { $regex: q, $options: 'i' } }
    ];
    const products = await Product.find(query).sort({ featured: -1, createdAt: -1 });
    return products.map(normalizeProduct);
  }

  return state.products
    .filter((product) => !category || category === 'All' || product.category === category)
    .filter((product) => {
      if (!q) return true;
      const term = q.toLowerCase();
      return [product.name, product.description, product.category].some((text) => text.toLowerCase().includes(term));
    })
    .sort((a, b) => Number(b.featured) - Number(a.featured));
}

async function getProduct(id) {
  if (isMongo()) {
    const product = await Product.findById(id);
    return product ? normalizeProduct(product) : null;
  }
  return state.products.find((product) => product.id === id) || null;
}

async function createProduct(payload) {
  const data = {
    name: payload.name,
    description: payload.description,
    price: Number(payload.price),
    category: payload.category,
    image: payload.image,
    stock: Number(payload.stock),
    rating: Number(payload.rating || 4.5),
    featured: Boolean(payload.featured)
  };

  if (isMongo()) {
    const product = await Product.create(data);
    return normalizeProduct(product);
  }

  const product = { ...data, id: newId(), createdAt: new Date(), updatedAt: new Date() };
  state.products.unshift(product);
  return product;
}

async function updateProduct(id, payload) {
  if (isMongo()) {
    const product = await Product.findByIdAndUpdate(
      id,
      {
        ...payload,
        price: payload.price !== undefined ? Number(payload.price) : undefined,
        stock: payload.stock !== undefined ? Number(payload.stock) : undefined,
        rating: payload.rating !== undefined ? Number(payload.rating) : undefined
      },
      { new: true, runValidators: true }
    );
    return product ? normalizeProduct(product) : null;
  }

  const index = state.products.findIndex((product) => product.id === id);
  if (index === -1) return null;
  state.products[index] = {
    ...state.products[index],
    ...payload,
    price: payload.price !== undefined ? Number(payload.price) : state.products[index].price,
    stock: payload.stock !== undefined ? Number(payload.stock) : state.products[index].stock,
    rating: payload.rating !== undefined ? Number(payload.rating) : state.products[index].rating,
    updatedAt: new Date()
  };
  return state.products[index];
}

async function deleteProduct(id) {
  if (isMongo()) {
    const product = await Product.findByIdAndDelete(id);
    return Boolean(product);
  }
  const before = state.products.length;
  state.products = state.products.filter((product) => product.id !== id);
  return state.products.length !== before;
}

async function createOrder({ user, address, items }) {
  const productIds = items.map((item) => item.productId || item.id);
  const products = [];

  for (const productId of productIds) {
    const product = await getProduct(productId);
    if (!product) throw new Error('Product not found in order.');
    products.push(product);
  }

  const orderItems = items.map((item) => {
    const productId = item.productId || item.id;
    const product = products.find((candidate) => candidate.id === productId);
    const quantity = Number(item.quantity || 1);
    if (quantity > product.stock) throw new Error(`${product.name} has only ${product.stock} items left.`);
    return {
      productId,
      name: product.name,
      price: product.price,
      quantity,
      image: product.image
    };
  });

  const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  for (const item of orderItems) {
    const product = products.find((candidate) => candidate.id === item.productId);
    await updateProduct(item.productId, { stock: product.stock - item.quantity });
  }

  const data = {
    user: user.id,
    customerName: user.name,
    customerEmail: user.email,
    address,
    items: orderItems,
    total,
    status: 'Pending'
  };

  if (isMongo()) {
    const order = await Order.create(data);
    return normalizeOrder(order);
  }

  const order = { ...data, id: newId(), createdAt: new Date(), updatedAt: new Date() };
  state.orders.unshift(order);
  return order;
}

async function listOrders() {
  if (isMongo()) {
    const orders = await Order.find().sort({ createdAt: -1 });
    return orders.map(normalizeOrder);
  }
  return [...state.orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function listOrdersByUser(userId) {
  const orders = await listOrders();
  return orders.filter((order) => String(order.user) === String(userId));
}

async function updateOrderStatus(id, status) {
  const allowed = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
  if (!allowed.includes(status)) throw new Error('Invalid order status.');

  if (isMongo()) {
    const order = await Order.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
    return order ? normalizeOrder(order) : null;
  }

  const order = state.orders.find((item) => item.id === id);
  if (!order) return null;
  order.status = status;
  order.updatedAt = new Date();
  return order;
}

module.exports = {
  publicUser,
  seedIfEmpty,
  findUserByEmail,
  findUserById,
  createUser,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  createOrder,
  listOrders,
  listOrdersByUser,
  updateOrderStatus
};
