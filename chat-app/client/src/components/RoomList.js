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
      setError('');
      const allRooms = await roomService.getRooms();
      setRooms(allRooms || []);
    } catch (err) {
      setError('Connection failed. Unable to sync with the grid.');
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
        // Error is handled in the CreateRoom component
    }
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const getAvatar = (name) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="room-list-container">
      <div className="room-list-header">
        <h3>WhatsApp</h3>
        <div className="header-icons">
          <button className="icon-button">&#128269;</button> 
          <button className="icon-button">&#8942;</button>
        </div>
      </div>
      
      <div className="room-list-tabs">
          <div className="tab-item active">Chats</div>
          <div className="tab-item">Status</div>
          <div className="tab-item">Calls</div>
      </div>

      <div className="rooms-list">
        {filteredRooms.length > 0 ? (
          filteredRooms.map(room => (
            <div key={room.id} className="room-item" onClick={() => onRoomSelect(room)}>
              <div className="room-avatar">{getAvatar(room.name)}</div>
              <div className="room-details">
                <div class="room-info">
                    <div className="room-name">{room.name}</div>
                    <div className="room-timestamp">{new Date(room.createdAt).toLocaleTimeString()}</div>
                </div>
                <div class="room-last-message">
                    <div className="room-description">{room.description || 'No channel briefing'}</div>
                    <div className="unread-count">3</div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-rooms-message">
            <p>No chats, contacts or messages found.</p>
          </div>
        )}
      </div>

      <div className="fab-container">
        <button onClick={() => setShowCreateRoom(true)} className="fab">
          &#128221; 
        </button>
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
