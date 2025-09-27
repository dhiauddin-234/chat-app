import React, { useState, useEffect } from 'react';
import CreateRoom from './CreateRoom';
import roomService from '../services/roomService';
import authService from '../services/authService';
import './RoomList.css';

const RoomList = ({ currentRoom, onRoomSelect, onCreateRoom }) => {
  const [rooms, setRooms] = useState([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [deletingRoom, setDeletingRoom] = useState(null);

  useEffect(() => {
    loadRooms();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = authService.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Failed to get current user:', error);
    }
  };

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

  const handleDeleteRoom = async (roomId, roomName) => {
    if (!window.confirm(`Are you sure you want to delete the room "${roomName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingRoom(roomId);
      await roomService.deleteRoom(roomId);
      await loadRooms(); // Refresh room list
      setError('');
    } catch (error) {
      setError(`Failed to delete room: ${error.message}`);
      console.error('Delete room error:', error);
    } finally {
      setDeletingRoom(null);
    }
  };

  const canDeleteRoom = (room) => {
    return currentUser && room.createdBy === currentUser.id && room.id !== 'general';
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
                      {canDeleteRoom(room) && (
                        <button
                          className="delete-room-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRoom(room.id, room.name);
                          }}
                          disabled={deletingRoom === room.id}
                          title="Delete room"
                        >
                          {deletingRoom === room.id ? 'Deleting...' : 'Delete'}
                        </button>
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
