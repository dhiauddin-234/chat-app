import React, { useState } from 'react';
import './CreateRoom.css';

const CreateRoom = ({ onCreateRoom, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
      newErrors.name = 'Group name is required';
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
      });
      onClose();
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to create group. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="create-room-overlay">
      <div className="create-room-modal">
        <div className="create-room-header">
          <h2>New Group</h2>
          <button className="close-button" onClick={onClose} disabled={isLoading}>
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="create-room-form">
          <div className="input-group">
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Group name"
              value={formData.name}
              onChange={handleChange}
              disabled={isLoading}
              autoFocus
              required
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="input-group">
            <textarea
              id="description"
              name="description"
              placeholder="Group description (optional)"
              value={formData.description}
              onChange={handleChange}
              disabled={isLoading}
              rows={3}
            />
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
              {isLoading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoom;
