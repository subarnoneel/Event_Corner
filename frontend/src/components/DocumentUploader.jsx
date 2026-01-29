import React, { useState, useRef } from 'react';
import { FiUpload, FiX, FiFile, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

/**
 * DocumentUploader Component
 * A component for uploading verification documents (PDF, JPG, PNG)
 * Supports multiple file uploads with validation
 */
const DocumentUploader = ({ 
  onUploadSuccess, 
  maxFiles = 5,
  currentDocuments = [],
  label = 'Upload Documents',
  instructions = 'Upload verification documents (PDF, JPG, PNG)',
  required = true
}) => {
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState(currentDocuments);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    // Check if total files exceed max limit
    if (documents.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} documents allowed`);
      return;
    }

    // Validate each file
    for (const file of files) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}: Invalid file type. Only PDF, JPG, and PNG allowed.`);
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: File size exceeds 10MB limit`);
        return;
      }
    }

    // Upload files
    try {
      setUploading(true);
      const formData = new FormData();
      files.forEach(file => {
        formData.append('documents', file);
      });

      const response = await axios.post(API_ENDPOINTS.UPLOAD_DOCUMENTS, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        const newDocuments = [...documents, ...response.data.files.map((path, index) => ({
          path,
          name: files[index].name,
          type: files[index].type
        }))];
        
        setDocuments(newDocuments);
        onUploadSuccess(newDocuments.map(doc => doc.path));
        toast.success(`${files.length} document(s) uploaded successfully!`);
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.error || 'Failed to upload documents. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (index) => {
    const newDocuments = documents.filter((_, i) => i !== index);
    setDocuments(newDocuments);
    onUploadSuccess(newDocuments.map(doc => doc.path));
    toast.success('Document removed');
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const getFileIcon = (type) => {
    if (type === 'application/pdf') {
      return <FiFile className="text-red-500" size={24} />;
    }
    return <FiFile className="text-blue-500" size={24} />;
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <p className="text-xs text-gray-500">{instructions}</p>
      </div>

      {/* Display uploaded documents */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getFileIcon(doc.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {doc.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {doc.type === 'application/pdf' ? 'PDF Document' : 'Image'}
                  </p>
                </div>
                <FiCheckCircle className="text-green-500" size={20} />
              </div>
              <button
                onClick={() => handleRemove(index)}
                disabled={uploading}
                className="ml-3 text-red-500 hover:text-red-700 disabled:opacity-50"
                title="Remove document"
              >
                <FiX size={20} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {documents.length < maxFiles && (
        <button
          onClick={handleClick}
          disabled={uploading}
          className="w-full border-2 border-dashed border-gray-300 hover:border-blue-500 bg-gray-50 hover:bg-blue-50 rounded-lg p-6 transition-all duration-200 flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <span className="text-sm font-medium">Uploading...</span>
            </>
          ) : (
            <>
              <FiUpload size={32} />
              <span className="text-sm font-medium">
                {documents.length > 0 ? 'Add More Documents' : 'Click to Upload Documents'}
              </span>
              <span className="text-xs text-gray-500">
                PDF, JPG, PNG (Max 10MB each, up to {maxFiles} files)
              </span>
              <span className="text-xs text-gray-500">
                {documents.length}/{maxFiles} uploaded
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default DocumentUploader;