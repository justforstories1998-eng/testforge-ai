import React, { useState, useRef } from 'react';
import './ImageUpload.css';

const ImageUpload = ({ onImageSelect, onImageRemove }) => {
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  const handleFileSelect = (file) => {
    setError('');

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('Image size must be less than 10MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setPreview(base64String);
      onImageSelect(base64String);
    };
    reader.onerror = () => {
      setError('Failed to read the image file');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onImageRemove();
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="image-upload-container">
      <label className="image-upload-label">
        <span className="label-icon">🖼️</span>
        Upload Screenshot / Mockup / Wireframe (Optional)
      </label>

      {!preview ? (
        <div
          className={`image-upload-dropzone ${isDragging ? 'dragging' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleInputChange}
            className="file-input-hidden"
          />
          
          <div className="dropzone-content">
            <div className="upload-icon">📤</div>
            <p className="dropzone-text">
              <span className="highlight">Click to upload</span> or drag and drop
            </p>
            <p className="dropzone-hint">
              PNG, JPG, GIF or WebP (max 10MB)
            </p>
          </div>
        </div>
      ) : (
        <div className="image-preview-container">
          <div className="image-preview-wrapper">
            <img src={preview} alt="Preview" className="image-preview" />
            <button 
              type="button"
              className="remove-image-btn"
              onClick={handleRemove}
              title="Remove image"
            >
              ✕
            </button>
          </div>
          <p className="preview-info">
            ✅ Image uploaded successfully. The AI will analyze this image to generate test cases.
          </p>
        </div>
      )}

      {error && (
        <div className="image-upload-error">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <p className="image-upload-tip">
        💡 <strong>Tip:</strong> Upload screenshots of login pages, forms, dashboards, or any UI screen. 
        The AI will analyze the image and generate relevant test cases.
      </p>
    </div>
  );
};

export default ImageUpload;