import React, { useState, useEffect } from 'react';
import CreateRoom from './CreateRoom';
import roomService from '../services/roomService';
import './RoomList.css';

const RoomList = ({ currentRoom, onRoomSelect, onCreateRoom }) => {
  const [rooms, setRooms] = useState([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await roomService.getRooms();
      setRooms(response.rooms || []);
    } catch (error) {
      setError('Failed to load rooms');
      console.error('Load rooms error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async (roomData) => {
    try {
      const response = await roomService.createRoom(roomData);
      await loadRooms(); // Refresh room list
      if (onCreateRoom) {
        onCreateRoom(response.room);
      }
    } catch (error) {
      throw error; // Let CreateRoom component handle the error
    }
  };

  const handleRoomClick = (room) => {
    if (onRoomSelect) {
      onRoomSelect(room);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (isLoading) {
    return (
      <div className="room-list-loading">
        <div className="loading-spinner"></div>
        <p>Loading rooms...</p>
      </div>
    );
  }

  return (
    <div className="room-list">
      <div className="room-list-header">
        <h3>Professional Rooms</h3>
        <button 
          className="create-room-btn"
          onClick={() => setShowCreateRoom(true)}
          title="Create New Room"
        >
          +
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={loadRooms} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      <div className="rooms-container">
        {rooms.length === 0 ? (
          <div className="no-rooms">
            <p>No rooms available</p>
            <button 
              className="create-first-room-btn"
              onClick={() => setShowCreateRoom(true)}
            >
              Create your first room
            </button>
          </div>
        ) : (
          <div className="rooms-list">
            {rooms.map((room) => (
              <div
                key={room.id}
                className={`room-item ${currentRoom === room.id ? 'active' : ''}`}
                onClick={() => handleRoomClick(room)}
              >
                <div className="room-item-content">
                  <div className="room-header">
                    <span className="room-name">
                      {room.isPrivate && '[Private] '} {room.name}
                    </span>
                    <span className="member-count">
                      {room.memberCount} members
                    </span>
                  </div>
                  {room.description && (
                    <p className="room-description">{room.description}</p>
                  )}
                  <div className="room-meta">
                    <span className="room-date">
                      Created {formatDate(room.createdAt)}
                    </span>
                    <div className="room-actions">
                      {room.isMember && (
                        <span className="member-badge">Member</span>
                      )}
                    </div>
                  </div>
                </div>
                {currentRoom === room.id && (
                  <div className="active-indicator">
                    <div className="pulse"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateRoom && (
        <CreateRoom
          onCreateRoom={handleCreateRoom}
          onClose={() => setShowCreateRoom(false)}
        />
      )}
    </div>
  );
};

export default RoomList;
