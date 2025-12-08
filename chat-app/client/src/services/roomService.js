
// Use local development server for demo
const API_BASE_URL = 'http://localhost:5001/api';

class RoomService {
  async createRoom(roomData) {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms`, {
        method: 'POST',
        headers: {
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
      const response = await fetch(`${API_BASE_URL}/rooms`, {
        method: 'GET',
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
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/join`, {
        method: 'POST',
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
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
        method: 'DELETE',
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
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
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
