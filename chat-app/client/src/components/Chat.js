import React, { useState, useEffect, useRef } from 'react';
import RoomList from './RoomList';
import roomService from '../services/roomService';
import './Chat.css';

const Chat = ({ socket, username, user, onLogout }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentRoomInfo, setCurrentRoomInfo] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    socket.on('authenticated', (data) => {
      setCurrentRoom(data.currentRoom);
    });

    socket.on('receive_message', (data) => {
      if (data.roomId === currentRoom) {
        setMessages(prev => [...prev, data]);
      }
    });

    socket.on('user_joined', (data) => {
      if (data.roomId === currentRoom) {
        setMessages(prev => [...prev, { ...data, isSystem: true }]);
      }
    });

    socket.on('user_left', (data) => {
      if (data.roomId === currentRoom) {
        setMessages(prev => [...prev, { ...data, isSystem: true }]);
      }
    });

    socket.on('room_joined', (data) => {
      setCurrentRoom(data.roomId);
      setMessages(data.messages || []);
    });

    return () => {
      socket.off('authenticated');
      socket.off('receive_message');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('room_joined');
    };
  }, [socket, currentRoom]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() === '') return;
    socket.emit('send_message', { message });
    setMessage('');
  };

  const handleRoomSelect = async (room) => {
    try {
      await roomService.joinRoom(room.id);
      socket.emit('join_room', room.id);
      setCurrentRoomInfo(room);
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  const handleCreateRoom = (room) => {
    handleRoomSelect(room);
  };

  return (
    <div className="chat-container">
      <div className="sidebar">
        <h2>Rooms</h2>
        <RoomList
          currentRoom={currentRoom}
          onRoomSelect={handleRoomSelect}
          onCreateRoom={handleCreateRoom}
        />
      </div>
      <div className="chat-main">
        <div className="chat-header">
          <h2>{currentRoomInfo ? currentRoomInfo.name : 'Select a Room'}</h2>
          <button onClick={onLogout} className="logout-button">Logout</button>
        </div>
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.userId === user.id ? 'my-message' : ''}`}>
              <div className="message-content">
                {msg.isSystem ? (
                  <em>{msg.username} {msg.message}</em>
                ) : (
                  <>
                    <div className="message-meta">
                      <strong>{msg.username}</strong> - <small>{new Date(msg.timestamp).toLocaleTimeString()}</small>
                    </div>
                    <p>{msg.message}</p>
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSubmit} className="message-form">
          <div className="input-container">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
            />
            <button type="submit">Send</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Chat;
