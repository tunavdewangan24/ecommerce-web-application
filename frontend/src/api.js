const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('shop_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong.');
  }

  return data;
}

export const api = {
  login: (body) => apiRequest('/auth/login', { method: 'POST', body }),
  register: (body) => apiRequest('/auth/register', { method: 'POST', body }),
  getProducts: (query = '') => apiRequest(`/products${query}`),
  createProduct: (body) => apiRequest('/products', { method: 'POST', body }),
  updateProduct: (id, body) => apiRequest(`/products/${id}`, { method: 'PUT', body }),
  deleteProduct: (id) => apiRequest(`/products/${id}`, { method: 'DELETE' }),
  checkout: (body) => apiRequest('/orders', { method: 'POST', body }),
  myOrders: () => apiRequest('/orders/my'),
  adminOrders: () => apiRequest('/orders'),
  updateOrderStatus: (id, status) => apiRequest(`/orders/${id}/status`, { method: 'PATCH', body: { status } })
};
