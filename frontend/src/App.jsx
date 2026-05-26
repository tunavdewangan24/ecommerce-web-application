import React, { useEffect, useMemo, useState } from 'react';
import { api } from './api';

const emptyProduct = {
  name: '',
  category: 'Electronics',
  price: '',
  stock: '',
  rating: '4.5',
  image: '',
  description: '',
  featured: false
};

function formatPrice(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value || 0);
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('shop_cart') || '[]'));
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('shop_user') || 'null'));
  const [view, setView] = useState('store');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [checkoutAddress, setCheckoutAddress] = useState('');
  const [orders, setOrders] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);

  const categories = useMemo(() => ['All', ...new Set(products.map((product) => product.category))], [products]);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    localStorage.setItem('shop_cart', JSON.stringify(cart));
  }, [cart]);

  async function loadProducts() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (category !== 'All') params.set('category', category);
      const data = await api.getProducts(params.toString() ? `?${params.toString()}` : '');
      setProducts(data);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(loadProducts, 250);
    return () => clearTimeout(timer);
  }, [query, category]);

  function saveSession(payload) {
    localStorage.setItem('shop_token', payload.token);
    localStorage.setItem('shop_user', JSON.stringify(payload.user));
    setUser(payload.user);
    setNotice(`Welcome, ${payload.user.name}!`);
  }

  async function handleLogin(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const payload = await api.login({ email: form.get('email'), password: form.get('password') });
      saveSession(payload);
      setView('store');
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const payload = await api.register({
        name: form.get('name'),
        email: form.get('email'),
        password: form.get('password')
      });
      saveSession(payload);
      setView('store');
    } catch (error) {
      setNotice(error.message);
    }
  }

  function logout() {
    localStorage.removeItem('shop_token');
    localStorage.removeItem('shop_user');
    setUser(null);
    setView('store');
    setNotice('Logged out successfully.');
  }

  function addToCart(product) {
    if (product.stock <= 0) return setNotice('This product is currently out of stock.');
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item
        );
      }
      return [...current, { ...product, quantity: 1 }];
    });
    setNotice(`${product.name} added to cart.`);
  }

  function changeQuantity(id, delta) {
    setCart((current) =>
      current
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  }

  async function handleCheckout(event) {
    event.preventDefault();
    if (!user) return setNotice('Please login before checkout.');
    if (cart.length === 0) return setNotice('Cart is empty.');

    try {
      const order = await api.checkout({
        address: checkoutAddress,
        items: cart.map((item) => ({ productId: item.id, quantity: item.quantity }))
      });
      setNotice(`Order placed successfully! Order total: ${formatPrice(order.total)}`);
      setCart([]);
      setCheckoutAddress('');
      setView('orders');
      await loadProducts();
      await loadMyOrders();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function loadMyOrders() {
    if (!user) return;
    try {
      const data = await api.myOrders();
      setOrders(data);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function loadAdminOrders() {
    if (!user || user.role !== 'admin') return;
    try {
      const data = await api.adminOrders();
      setAdminOrders(data);
    } catch (error) {
      setNotice(error.message);
    }
  }

  useEffect(() => {
    if (view === 'orders') loadMyOrders();
    if (view === 'admin') loadAdminOrders();
  }, [view, user]);

  function fillProductForm(product) {
    setEditingId(product.id);
    setProductForm({
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
      rating: product.rating,
      image: product.image,
      description: product.description,
      featured: product.featured
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submitProduct(event) {
    event.preventDefault();
    try {
      if (editingId) {
        await api.updateProduct(editingId, productForm);
        setNotice('Product updated successfully.');
      } else {
        await api.createProduct(productForm);
        setNotice('Product created successfully.');
      }
      setProductForm(emptyProduct);
      setEditingId(null);
      await loadProducts();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function removeProduct(id) {
    if (!confirm('Delete this product?')) return;
    try {
      await api.deleteProduct(id);
      setNotice('Product deleted.');
      await loadProducts();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function changeOrderStatus(orderId, status) {
    try {
      await api.updateOrderStatus(orderId, status);
      setNotice('Order status updated.');
      await loadAdminOrders();
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <div className="app-shell">
      <header className="nav">
        <div className="brand">
          <span className="brand-icon">S</span>
          <div>
            <strong>ShopSphere</strong>
            <small>Full-stack e-commerce</small>
          </div>
        </div>
        <nav className="nav-actions">
          <button className={view === 'store' ? 'active' : ''} onClick={() => setView('store')}>Store</button>
          <button className={view === 'cart' ? 'active' : ''} onClick={() => setView('cart')}>Cart ({cartCount})</button>
          {user && <button className={view === 'orders' ? 'active' : ''} onClick={() => setView('orders')}>My Orders</button>}
          {user?.role === 'admin' && <button className={view === 'admin' ? 'active' : ''} onClick={() => setView('admin')}>Admin</button>}
          {user ? <button onClick={logout}>Logout</button> : <button className="primary-small" onClick={() => setView('login')}>Login</button>}
        </nav>
      </header>

      {notice && (
        <div className="notice" onClick={() => setNotice('')}>
          {notice}
        </div>
      )}

      {view === 'store' && (
        <main>
          <section className="hero">
            <div>
              <p className="eyebrow">Product catalog • Cart • Checkout • Orders</p>
              <h1>Build, manage, and track your online store.</h1>
              <p>
                A complete assignment-ready e-commerce web app with role-based login,
                product management, checkout, and order tracking APIs.
              </p>
              <div className="hero-actions">
                <button className="primary" onClick={() => setView('cart')}>Open Cart</button>
                {!user && <button className="ghost" onClick={() => setView('login')}>Try Demo Login</button>}
              </div>
            </div>
            <div className="stats-card">
              <span>Live Summary</span>
              <strong>{products.length}</strong>
              <p>Products available</p>
              <strong>{cartCount}</strong>
              <p>Items in cart</p>
            </div>
          </section>

          <section className="toolbar">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products..." />
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </section>

          {loading ? <p className="muted">Loading products...</p> : (
            <section className="product-grid">
              {products.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="image-wrap">
                    {product.featured && <span className="badge">Featured</span>}
                    <img src={product.image} alt={product.name} />
                  </div>
                  <div className="product-content">
                    <div className="row between">
                      <span className="category">{product.category}</span>
                      <span className="rating">★ {product.rating}</span>
                    </div>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <div className="row between product-footer">
                      <strong>{formatPrice(product.price)}</strong>
                      <small>{product.stock} left</small>
                    </div>
                    <button className="primary full" onClick={() => addToCart(product)}>Add to Cart</button>
                  </div>
                </article>
              ))}
            </section>
          )}
        </main>
      )}

      {view === 'login' && (
        <main className="auth-grid">
          <section className="panel">
            <h2>Login</h2>
            <p className="muted">Demo admin: admin@shop.com / admin123</p>
            <p className="muted">Demo user: user@shop.com / user123</p>
            <form onSubmit={handleLogin} className="form">
              <input name="email" type="email" placeholder="Email" defaultValue="admin@shop.com" required />
              <input name="password" type="password" placeholder="Password" defaultValue="admin123" required />
              <button className="primary full">Login</button>
            </form>
          </section>

          <section className="panel">
            <h2>Create User Account</h2>
            <form onSubmit={handleRegister} className="form">
              <input name="name" placeholder="Your name" required />
              <input name="email" type="email" placeholder="Email" required />
              <input name="password" type="password" placeholder="Password" minLength="6" required />
              <button className="ghost full">Register</button>
            </form>
          </section>
        </main>
      )}

      {view === 'cart' && (
        <main className="two-column">
          <section className="panel">
            <h2>Shopping Cart</h2>
            {cart.length === 0 ? <p className="muted">No items in cart yet.</p> : cart.map((item) => (
              <div className="cart-item" key={item.id}>
                <img src={item.image} alt={item.name} />
                <div>
                  <strong>{item.name}</strong>
                  <p>{formatPrice(item.price)} × {item.quantity}</p>
                  <div className="quantity-controls">
                    <button onClick={() => changeQuantity(item.id, -1)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => changeQuantity(item.id, 1)}>+</button>
                  </div>
                </div>
              </div>
            ))}
            <div className="cart-total">
              <span>Total</span>
              <strong>{formatPrice(cartTotal)}</strong>
            </div>
          </section>

          <section className="panel">
            <h2>Checkout</h2>
            <p className="muted">Login is required to create a real order.</p>
            <form className="form" onSubmit={handleCheckout}>
              <textarea value={checkoutAddress} onChange={(event) => setCheckoutAddress(event.target.value)} placeholder="Delivery address" required />
              <button className="primary full">Place Order</button>
            </form>
          </section>
        </main>
      )}

      {view === 'orders' && (
        <main className="panel">
          <div className="row between">
            <h2>My Orders</h2>
            <button className="ghost" onClick={loadMyOrders}>Refresh</button>
          </div>
          {!user ? <p className="muted">Please login to see orders.</p> : orders.length === 0 ? <p className="muted">No orders yet.</p> : (
            <div className="orders-list">
              {orders.map((order) => <OrderCard key={order.id} order={order} />)}
            </div>
          )}
        </main>
      )}

      {view === 'admin' && user?.role === 'admin' && (
        <main className="admin-layout">
          <section className="panel">
            <h2>{editingId ? 'Edit Product' : 'Add Product'}</h2>
            <form className="form" onSubmit={submitProduct}>
              <input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} placeholder="Product name" required />
              <div className="form-row">
                <input value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} placeholder="Category" required />
                <input value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} placeholder="Price" type="number" required />
              </div>
              <div className="form-row">
                <input value={productForm.stock} onChange={(event) => setProductForm({ ...productForm, stock: event.target.value })} placeholder="Stock" type="number" required />
                <input value={productForm.rating} onChange={(event) => setProductForm({ ...productForm, rating: event.target.value })} placeholder="Rating" type="number" step="0.1" />
              </div>
              <input value={productForm.image} onChange={(event) => setProductForm({ ...productForm, image: event.target.value })} placeholder="Image URL" required />
              <textarea value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} placeholder="Description" required />
              <label className="checkbox"><input type="checkbox" checked={productForm.featured} onChange={(event) => setProductForm({ ...productForm, featured: event.target.checked })} /> Featured product</label>
              <button className="primary full">{editingId ? 'Update Product' : 'Create Product'}</button>
              {editingId && <button type="button" className="ghost full" onClick={() => { setEditingId(null); setProductForm(emptyProduct); }}>Cancel Edit</button>}
            </form>
          </section>

          <section className="panel">
            <div className="row between">
              <h2>Product Management</h2>
              <button className="ghost" onClick={loadProducts}>Refresh</button>
            </div>
            <div className="manage-list">
              {products.map((product) => (
                <div className="manage-item" key={product.id}>
                  <img src={product.image} alt={product.name} />
                  <div>
                    <strong>{product.name}</strong>
                    <p>{formatPrice(product.price)} • Stock {product.stock}</p>
                  </div>
                  <button onClick={() => fillProductForm(product)}>Edit</button>
                  <button className="danger" onClick={() => removeProduct(product.id)}>Delete</button>
                </div>
              ))}
            </div>
          </section>

          <section className="panel wide">
            <div className="row between">
              <h2>Order Tracking</h2>
              <button className="ghost" onClick={loadAdminOrders}>Refresh</button>
            </div>
            {adminOrders.length === 0 ? <p className="muted">No customer orders yet.</p> : adminOrders.map((order) => (
              <div className="order-card" key={order.id}>
                <div className="row between">
                  <div>
                    <strong>{order.customerName}</strong>
                    <p>{order.customerEmail} • {formatPrice(order.total)}</p>
                  </div>
                  <select value={order.status} onChange={(event) => changeOrderStatus(order.id, event.target.value)}>
                    {['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((status) => <option key={status}>{status}</option>)}
                  </select>
                </div>
                <small>{order.address}</small>
              </div>
            ))}
          </section>
        </main>
      )}
    </div>
  );
}

function OrderCard({ order }) {
  return (
    <article className="order-card">
      <div className="row between">
        <div>
          <strong>Order #{String(order.id).slice(0, 8)}</strong>
          <p>{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <span className="status">{order.status}</span>
      </div>
      <div className="order-items">
        {order.items.map((item) => (
          <span key={item.productId}>{item.name} × {item.quantity}</span>
        ))}
      </div>
      <div className="row between">
        <small>{order.address}</small>
        <strong>{formatPrice(order.total)}</strong>
      </div>
    </article>
  );
}
