// Use local development server for demo
const API_BASE_URL = 'http://localhost:3001/api/rooms';

class RoomService {
  async createRoom(roomData) {
    try {
      const response = await fetch(`${API_BASE_URL}`, {
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
      const response = await fetch(`${API_BASE_URL}`, {
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
      const response = await fetch(`${API_BASE_URL}/${roomId}/join`, {
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
      const response = await fetch(`${API_BASE_URL}/${roomId}`, {
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
}

const roomService = new RoomService();
export default roomService;
