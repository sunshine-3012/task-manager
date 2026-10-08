/**
 * Central Authenticated API Client
 * Automatically attaches Supabase JWT token to Express REST API requests
 */

const API = {
  baseUrl: '/api',

  async request(endpoint, options = {}) {
    const token = await getAuthToken();

    if (!token) {
      console.warn('No active session token found. Redirecting to login.');
      if (!window.location.pathname.includes('login') && !window.location.pathname.includes('register')) {
        window.location.href = '/login.html';
      }
      throw new Error('No authentication token available');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };

    const config = {
      ...options,
      headers
    };

    const res = await fetch(`${this.baseUrl}${endpoint}`, config);

    if (res.status === 401) {
      const client = await getSupabase();
      if (client) await client.auth.signOut();
      window.location.href = '/login.html';
      throw new Error('Session expired. Please log in again.');
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.error || (data.errors && data.errors.join(', ')) || 'Request failed';
      throw new Error(errorMsg);
    }

    return data;
  },

  async getTasks(params = {}) {
    const query = new URLSearchParams();
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        query.append(k, params[k]);
      }
    });
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/tasks${qs}`, { method: 'GET' });
  },

  async getTask(id) {
    return this.request(`/tasks/${id}`, { method: 'GET' });
  },

  async createTask(taskData) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  },

  async updateTask(id, taskData) {
    return this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData)
    });
  },

  async toggleComplete(id, status) {
    return this.request(`/tasks/${id}/complete`, {
      method: 'PATCH',
      body: JSON.stringify(status ? { status } : {})
    });
  },

  async deleteTask(id) {
    return this.request(`/tasks/${id}`, {
      method: 'DELETE'
    });
  },

  async getStats() {
    return this.request('/tasks/stats', { method: 'GET' });
  },

  async getProfile() {
    return this.request('/users/profile', { method: 'GET' });
  },

  async updateProfile(profileData) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },

  async getCategories() {
    return this.request('/users/categories', { method: 'GET' });
  },

  async createCategory(categoryData) {
    return this.request('/users/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData)
    });
  },

  async deleteCategory(id) {
    return this.request(`/users/categories/${id}`, {
      method: 'DELETE'
    });
  }
};

window.API = API;
