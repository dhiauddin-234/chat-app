import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initSocket } from '../socket';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3002/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();
      if (data.success) {
        localStorage.setItem('token', data.token);
        initSocket(); // Initialize socket after login
        navigate('/');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to login');
    }
  };

  return (
    <div className="login-container">
        <div className="login-card">
            <div className="login-header">
                <h2>Welcome</h2>
                <p>
                    Enter your username to start chatting.
                </p>
            </div>
            <form onSubmit={handleLoginSubmit} className="login-form">
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    required
                />
                <button type="submit" className="login-button">Login</button>
                {error && <p className="error-message">{error}</p>}
            </form>
        </div>
    </div>
  );
};

export default Login;
