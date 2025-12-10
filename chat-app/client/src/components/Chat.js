import React, { useState, useEffect, useRef } from 'react';
import { getSocket } from '../socket';
import './Chat.css';

const Chat = ({ room, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const socket = getSocket();

  useEffect(() => {
    if (room) {
      socket.emit('join_room', room.id);

      socket.on('receive_message', (message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
      });

      socket.on('room_joined', (data) => {
        setMessages(data.messages);
      });

      return () => {
        socket.off('receive_message');
        socket.off('room_joined');
      };
    }
  }, [room, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      socket.emit('send_message', { message: newMessage });
      setNewMessage('');
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-header-left">
          <button className="back-button" onClick={onBack}>&#8592;</button>
          <div className="chat-header-info">
            <h2>{room ? room.name : 'Chat'}</h2>
            <p>online</p>
          </div>
        </div>
        <div className="chat-header-right">
          <button className="icon-button">&#128249;</button> 
          <button className="icon-button">&#128222;</button>
          <button className="icon-button">&#8942;</button>
        </div>
      </div>
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sender === socket.id ? 'my-message' : 'other-message'}`}>
             <div className="message-content">
                <p>{msg.content}</p>
                <small>{new Date(msg.timestamp).toLocaleTimeString()}</small>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <div className='input-container'>
            <button className="icon-button">&#128512;</button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
            />
            <button className="icon-button">&#128206;</button>
            <button className="icon-button">&#128247;</button>
        </div>
        <button type="submit" className="send-button">&#10148;</button>
      </form>
    </div>
  );
};

export default Chat;
