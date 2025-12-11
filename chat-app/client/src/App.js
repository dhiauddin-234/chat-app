
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';

const socket = io('http://localhost:5000');

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    }
  }, [token]);

  useEffect(() => {
    socket.on('chat message', (msg) => {
      setMessages([...messages, msg]);
    });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (message) {
      socket.emit('chat message', message);
      setMessage('');
    }
  };

  if (!token) {
    return (
      <div>
        <Login setToken={setToken} />
        <Register setToken={setToken} />
      </div>
    );
  }

  return (
    <div className="App">
      <button onClick={() => {
        setToken(null);
        localStorage.removeItem('token');
      }}>Logout</button>
      <ul id="messages">
        {messages.map((msg, index) => (
          <li key={index}>{msg}</li>
        ))}
      </ul>
      <form id="form" onSubmit={sendMessage}>
        <input id="input" value={message} onChange={(e) => setMessage(e.target.value)} autoComplete="off" /><button>Send</button>
      </form>
    </div>
  );
}

export default App;
