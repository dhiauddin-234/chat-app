import React, { useState, useEffect, useRef } from 'react';
import RoomList from './RoomList';
import roomService from '../services/roomService';
import './Chat.css';

const Chat = ({ socket, username, user, onLogout }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentRoomInfo, setCurrentRoomInfo] = useState(null);
  const [showRoomList, setShowRoomList] = useState(true);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom of messages
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Socket event handlers
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
        setMessages(prev => [...prev, {
          userId: data.userId,
          username: data.username,
          message: 'has joined the room',
          isSystem: true,
          roomId: data.roomId
        }]);
      }
    });

    socket.on('user_left', (data) => {
      if (data.roomId === currentRoom) {
        setMessages(prev => [...prev, {
          userId: data.userId,
          username: data.username,
          message: 'has left the room',
          isSystem: true,
          roomId: data.roomId
        }]);
      }
    });

    socket.on('room_joined', (data) => {
      setCurrentRoom(data.roomId);
      setUsers(data.users || []);
      setMessages(data.messages || []);
    });

    socket.on('room_users', (data) => {
      if (data.roomId === currentRoom) {
        setUsers(data.users || []);
      }
    });

    socket.on('message_deleted', (data) => {
      if (data.roomId === currentRoom) {
        setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
      }
    });

    socket.on('delete_error', (data) => {
      alert('Error: ' + data.message);
    });

    socket.on('message_edited', (data) => {
      if (data.roomId === currentRoom) {
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, message: data.newMessage, edited: true, editedAt: data.editedAt }
            : msg
        ));
      }
    });

    socket.on('edit_error', (data) => {
      alert('Error: ' + data.message);
    });

    socket.on('user_typing', (data) => {
      if (data.roomId === currentRoom) {
        setTypingUsers(prev => {
          if (!prev.includes(data.username)) {
            return [...prev, data.username];
          }
          return prev;
        });
      }
    });

    socket.on('user_stopped_typing', (data) => {
      if (data.roomId === currentRoom) {
        setTypingUsers(prev => prev.filter(user => user !== data.username));
      }
    });

    return () => {
      socket.off('authenticated');
      socket.off('receive_message');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('room_joined');
      socket.off('room_users');
      socket.off('message_deleted');
      socket.off('delete_error');
      socket.off('message_edited');
      socket.off('edit_error');
      socket.off('user_typing');
      socket.off('user_stopped_typing');
    };
  }, [socket, currentRoom]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() === '') return;
    
    socket.emit('send_message', { message });
    setMessage('');
    handleStopTyping();
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    
    // Handle typing indicators
    if (e.target.value.length > 0) {
      handleStartTyping();
    } else {
      handleStopTyping();
    }
  };

  const handleStartTyping = () => {
    socket.emit('typing_start');
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 3000);
  };

  const handleStopTyping = () => {
    socket.emit('typing_stop');
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleLogout = () => {
    socket.disconnect();
    onLogout();
  };

  const handleRoomSelect = async (room) => {
    try {
      await roomService.joinRoom(room.id);
      socket.emit('join_room', room.id);
      setCurrentRoomInfo(room);
      setShowRoomList(false);
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  const handleCreateRoom = (room) => {
    // Automatically join the newly created room
    handleRoomSelect(room);
  };

  const toggleRoomList = () => {
    setShowRoomList(!showRoomList);
  };

  const handleDeleteMessage = (messageId) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      socket.emit('delete_message', { messageId });
    }
  };

  const handleEditMessage = (messageId, currentMessage) => {
    setEditingMessage(messageId);
    setEditText(currentMessage);
  };

  const handleSaveEdit = (messageId) => {
    if (editText.trim() === '') return;
    socket.emit('edit_message', { messageId, newMessage: editText.trim() });
    setEditingMessage(null);
    setEditText('');
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditText('');
  };

  const formatMessageTime = (timestamp) => {
    const messageDate = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - messageDate) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      // Same day - show time only
      return messageDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } else if (diffInHours < 48) {
      // Yesterday
      return `Yesterday ${messageDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } else if (diffInHours < 168) {
      // Within a week - show day and time
      return messageDate.toLocaleDateString([], {weekday: 'short', hour: '2-digit', minute:'2-digit'});
    } else {
      // Older - show full date and time
      return messageDate.toLocaleDateString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'});
    }
  };

  const filteredMessages = searchTerm 
    ? messages.filter(msg => 
        (msg.message && msg.message.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (msg.username && msg.username.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : messages;

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchTerm('');
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-info">
          <button className="room-toggle-btn" onClick={toggleRoomList}>
            {showRoomList ? 'Hide Rooms' : 'Show Rooms'}
          </button>
          <div className="room-info">
            <h2>
              {currentRoomInfo ? (
                <>
                  {currentRoomInfo.isPrivate && '[Private] '} {currentRoomInfo.name}
                </>
              ) : (
                'General'
              )}
            </h2>
            <span className="username-display">Welcome, {username}!</span>
          </div>
        </div>
        <div className="header-actions">
          <button className="search-toggle-btn" onClick={toggleSearch}>
            🔍
          </button>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>

      <div className="chat-content">
        {showRoomList && (
          <div className="room-sidebar">
            <RoomList
              currentRoom={currentRoom}
              onRoomSelect={handleRoomSelect}
              onCreateRoom={handleCreateRoom}
            />
          </div>
        )}

        <div className="sidebar">
          <h3>Online Users ({users.length})</h3>
          <ul className="users-list">
            {users.map((user) => (
              <li key={user.id} className="user-item">
                <span className="user-dot"></span>
                <span className="user-name">
                  {user.username} {user.id === socket.id && '(You)'}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="chat-main">
          {showSearch && (
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
                autoFocus
              />
              {searchTerm && (
                <span className="search-results">
                  {filteredMessages.length} result{filteredMessages.length !== 1 ? 's' : ''} found
                </span>
              )}
            </div>
          )}
          <div className="chat-messages">
            {filteredMessages.length === 0 ? (
              <div className="empty-chat">
                {searchTerm ? (
                  <p>No messages found matching "{searchTerm}"</p>
                ) : (
                  <>
                    <p>No messages yet. Start the conversation!</p>
                    {currentRoomInfo?.description && (
                      <p className="room-description">{currentRoomInfo.description}</p>
                    )}
                  </>
                )}
              </div>
            ) : (
              filteredMessages.map((msg, index) => (
                <div 
                  key={msg.id || index} 
                  className={`message ${msg.isSystem ? 'system' : ''}`}
                >
                  {msg.isSystem ? (
                    <div className="message-content">
                      <span className="system-message">
                        <strong>{msg.username}</strong> {msg.message}
                      </span>
                    </div>
                  ) : (
                    <div className="message-content">
                      <div className="message-header">
                        <span className="message-username">
                          {msg.userId === socket.id ? 'You' : msg.username}
                        </span>
                        <div className="message-actions">
                          <span className="message-time">
                            {formatMessageTime(msg.timestamp)}
                            {msg.edited && <span className="edited-indicator"> (edited)</span>}
                          </span>
                          {msg.userId === socket.id && msg.id && (
                            <>
                              <button 
                                className="edit-btn"
                                onClick={() => handleEditMessage(msg.id, msg.message)}
                                title="Edit message"
                              >
                                ✏
                              </button>
                              <button 
                                className="delete-btn"
                                onClick={() => handleDeleteMessage(msg.id)}
                                title="Delete message"
                              >
                                ×
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {editingMessage === msg.id ? (
                        <div className="edit-form">
                          <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveEdit(msg.id);
                              } else if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                            className="edit-input"
                            autoFocus
                          />
                          <div className="edit-buttons">
                            <button onClick={() => handleSaveEdit(msg.id)} className="save-btn">Save</button>
                            <button onClick={handleCancelEdit} className="cancel-btn">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="message-text">
                          {msg.message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
            {typingUsers.length > 0 && (
              <div className="typing-indicator">
                <span className="typing-text">
                  {typingUsers.length === 1 
                    ? `${typingUsers[0]} is typing...`
                    : `${typingUsers.join(', ')} are typing...`
                  }
                </span>
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="message-form">
            <div className="input-container">
              <input
                type="text"
                value={message}
                onChange={handleInputChange}
                placeholder={`Type your message${currentRoomInfo ? ` in ${currentRoomInfo.name}` : ''}...`}
                autoFocus
                maxLength={500}
                disabled={!currentRoom}
              />
              <button type="submit" disabled={!message.trim() || !currentRoom}>
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;
