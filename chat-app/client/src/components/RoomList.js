import React, { useState, useEffect } from 'react';
import CreateRoom from './CreateRoom';
import roomService from '../services/roomService';
import './RoomList.css';

const RoomList = ({ onRoomSelect }) => {
  const [rooms, setRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setIsLoading(true);
      const allRooms = await roomService.getRooms();
      setRooms(allRooms || []);
    } catch (err) {
      setError('Failed to load rooms. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async (roomData) => {
    try {
      await roomService.createRoom(roomData);
      await loadRooms();
      setShowCreateRoom(false);
    } catch (err) {
      // The CreateRoom component will handle showing the error
    }
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getAvatar = (name) => {
    return name.charAt(0).toUpperCase();
  };

  if (isLoading) {
    return <div className="loading-container">Loading rooms...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="room-list-container">
      <div className="room-list-header">
        <h3>Chats</h3>
        <button onClick={() => setShowCreateRoom(true)} className="create-room-btn">
          +
        </button>
      </div>

      <div className="search-container">
        <input
          type="text"
          placeholder="Search or start a new chat"
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="rooms-list">
        {filteredRooms.length > 0 ? (
          filteredRooms.map(room => (
            <div key={room.id} className="room-item" onClick={() => onRoomSelect(room.id)}>
              <div className="room-avatar">{getAvatar(room.name)}</div>
              <div className="room-details">
                <div className="room-name">{room.name}</div>
                <div className="room-description">{room.description || 'No description'}</div>
              </div>
              <div className="room-meta">
                <div className="room-timestamp">{formatDate(room.createdAt)}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-rooms-message">
            <p>No rooms found.</p>
            <button onClick={() => setShowCreateRoom(true)} className="create-first-room-btn">
              Create a New Room
            </button>
          </div>
        )}
      </div>

      {showCreateRoom && (
        <CreateRoom
          onClose={() => setShowCreateRoom(false)}
          onCreateRoom={handleCreateRoom}
        />
      )}
    </div>
  );
};

export default RoomList;
