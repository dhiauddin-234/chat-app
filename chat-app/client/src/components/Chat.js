import React, { useState, useEffect, useRef } from 'react';
import socket from '../socket';
import './Chat.css';

const Chat = ({ room }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

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
  }, [room]);

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
        <h2>{room ? room.name : 'Chat'}</h2>
      </div>
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className="message">
            <span className="message-sender">{msg.sender.substring(0,5)}:</span>
            <span className="message-content">{msg.content}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default Chat;
