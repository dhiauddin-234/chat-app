import React, { useState } from 'react';
import './CreateRoom.css';

const CreateRoom = ({ onCreateRoom, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPrivate: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Room name is required';
    } else if (formData.name.trim().length < 1 || formData.name.trim().length > 50) {
      newErrors.name = 'Room name must be 1-50 characters';
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = 'Description must be less than 200 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await onCreateRoom({
        name: formData.name.trim(),
        description: formData.description.trim(),
        isPrivate: formData.isPrivate
      });
      onClose();
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to create room. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="create-room-overlay">
      <div className="create-room-modal">
        <div className="create-room-header">
          <h2>🏢 Create New Room</h2>
          <button className="close-button" onClick={onClose} disabled={isLoading}>
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="create-room-form">
          <div className="input-group">
            <label htmlFor="name">Room Name *</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Enter room name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? 'error' : ''}
              disabled={isLoading}
              autoFocus
              required
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="input-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              placeholder="Describe what this room is about (optional)"
              value={formData.description}
              onChange={handleChange}
              className={errors.description ? 'error' : ''}
              disabled={isLoading}
              rows={3}
            />
            {errors.description && <span className="error-message">{errors.description}</span>}
          </div>

          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isPrivate"
                checked={formData.isPrivate}
                onChange={handleChange}
                disabled={isLoading}
              />
              <span className="checkbox-custom"></span>
              <span className="checkbox-text">
                🔒 Private Room
                <small>Only invited members can join</small>
              </span>
            </label>
          </div>

          {errors.submit && (
            <div className="error-message submit-error">{errors.submit}</div>
          )}
          
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-button"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="create-button"
              disabled={isLoading || !formData.name.trim()}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Creating...
                </>
              ) : (
                'Create Room'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoom;