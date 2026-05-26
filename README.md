# E-Commerce Web Application

This project is built for the assignment shown in the screenshot: **Build a basic online store with product management and order tracking.**

## Features covered

- Product catalog with search, categories, stock, ratings, and product images
- Add to cart and checkout functionality
- User login and role-based access: Admin/User
- Backend APIs for product and order management
- MongoDB integration with automatic fallback demo mode
- Admin product CRUD: create, edit, delete, and update products
- Admin order tracking: update order status
- User order history
- Responsive modern UI

## Tech stack

- Frontend: React + Vite + CSS
- Backend: Node.js + Express
- Auth: JWT + bcryptjs
- Database: MongoDB with Mongoose
- Demo fallback: memory mode if MongoDB URI is empty or invalid

## Folder structure

```text
ecommerce-web-application/
  backend/
    src/
      config/
      data/
      db/
      middleware/
      models/
      routes/
      server.js
    .env.example
    package.json
  frontend/
    src/
      App.jsx
      api.js
      main.jsx
      styles.css
    .env.example
    package.json
  README.md
```

## How to run on Windows CMD

### 1. Start backend

```cmd
cd ecommerce-web-application\backend
copy .env.example .env
npm install
npm run dev
```

Backend will run here:

```text
http://localhost:5000
```

### 2. Start frontend in another CMD window

```cmd
cd ecommerce-web-application\frontend
copy .env.example .env
npm install
npm run dev
```

Frontend will run here:

```text
http://localhost:5173
```

## Demo login accounts

Admin:

```text
Email: admin@shop.com
Password: admin123
```

User:

```text
Email: user@shop.com
Password: user123
```

## MongoDB setup

The project works even without MongoDB in demo memory mode. For real database integration, open:

```text
backend/.env
```

Paste your MongoDB Atlas connection string:

```text
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/ecommerce_app?retryWrites=true&w=majority
```

Then restart the backend.

## Important API routes

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/products
POST   /api/products        Admin only
PUT    /api/products/:id    Admin only
DELETE /api/products/:id    Admin only
POST   /api/orders          Logged-in user
GET    /api/orders/my       Logged-in user
GET    /api/orders          Admin only
PATCH  /api/orders/:id/status Admin only
```

## Submission note

You can submit this as the task project because it directly matches the screenshot requirements: product catalog, cart, checkout, admin/user login, backend APIs, product/order management, and MongoDB integration.
