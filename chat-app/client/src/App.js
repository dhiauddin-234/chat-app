import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';
import authService from './services/authService';
import './App.css';

let socket = null;

function App() {
  const [user, setUser] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      if (authService.isAuthenticated() && !authService.isTokenExpired()) {
        try {
          const profileData = await authService.getProfile();
          setUser(profileData.user);
          setIsAuthenticated(true);
          initializeSocket();
        } catch (error) {
          console.error('Auth check failed:', error);
          authService.logout();
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const initializeSocket = () => {
    if (socket) {
      socket.disconnect();
    }

    // Use environment variable for socket URL
    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    console.log('Connecting to socket:', socketUrl);
    socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket']
    });

    socket.on('connect', () => {
      console.log('Connected to server');
      // Authenticate with JWT token
      const token = authService.getToken();
      if (token) {
        socket.emit('authenticate', token);
      }
    });

    socket.on('authenticated', (userData) => {
      console.log('Socket authenticated:', userData);
      setIsConnected(true);
    });

    socket.on('auth_error', (error) => {
      console.error('Socket auth error:', error);
      handleLogout();
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });
  };

  const handleLogin = async (credentials) => {
    try {
      const loginData = await authService.login(credentials);
      setUser(loginData.user);
      setIsAuthenticated(true);
      initializeSocket();
    } catch (error) {
      throw error;
    }
  };

  const handleRegister = async (userData) => {
    try {
      const registerData = await authService.register(userData);
      setUser(registerData.user);
      setIsAuthenticated(true);
      initializeSocket();
    } catch (error) {
      throw error;
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setIsConnected(false);
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (showRegister) {
      return (
        <Register 
          onRegister={handleRegister}
          onSwitchToLogin={() => setShowRegister(false)}
        />
      );
    }
    
    return (
      <Login 
        onLogin={handleLogin}
        onSwitchToRegister={() => setShowRegister(true)}
      />
    );
  }

  if (!isConnected) {
    return (
      <div className="connecting-container">
        <div className="connecting-spinner"></div>
        <p>Connecting to chat...</p>
      </div>
    );
  }

  return (
    <Chat 
      socket={socket} 
      username={user.username}
      user={user}
      onLogout={handleLogout} 
    />
  );
}

export default App;
