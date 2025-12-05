
const API_BASE_URL = 'http://localhost:5000/api';

class AuthService {
  async login(credentials) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to login');
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }
}

const authService = new AuthService();
export default authService;
