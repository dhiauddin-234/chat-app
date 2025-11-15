import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './components/Landing';
import Register from './components/Register';
import Chat from './components/Chat';
import RoomList from './components/RoomList';
import ProtectedRoute from './components/ProtectedRoute';
import authService from './services/authService';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/rooms" 
          element={
            <ProtectedRoute isAllowed={authService.isAuthenticated()}>
              <RoomList />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/chat/:roomId" 
          element={
            <ProtectedRoute isAllowed={authService.isAuthenticated()}>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
