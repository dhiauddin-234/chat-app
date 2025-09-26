import authService from './authService';

// Use HTTPS for production, HTTP for local development
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://chat-app-gmfn.onrender.com/api'
  : 'http://localhost:5000/api';

class RoomService {
  async createRoom(roomData) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${API_BASE_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roomData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create room');
      }

      return data;
    } catch (error) {
      console.error('Create room error:', error);
      throw error;
    }
  }

  async getRooms() {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${API_BASE_URL}/rooms`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch rooms');
      }

      return data;
    } catch (error) {
      console.error('Get rooms error:', error);
      throw error;
    }
  }

  async joinRoom(roomId) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to join room');
      }

      return data;
    } catch (error) {
      console.error('Join room error:', error);
      throw error;
    }
  }

  async leaveRoom(roomId) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to leave room');
      }

      return data;
    } catch (error) {
      console.error('Leave room error:', error);
      throw error;
    }
  }

  async deleteRoom(roomId) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete room');
      }

      return data;
    } catch (error) {
      console.error('Delete room error:', error);
      throw error;
    }
  }
}

const roomService = new RoomService();
export default roomService;
