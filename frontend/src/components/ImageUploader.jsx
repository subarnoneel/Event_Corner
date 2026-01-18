import React, { useState, useRef } from 'react';
import { FiUpload, FiX, FiImage } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { uploadToCloudinary } from '../utils/cloudinary';

/**
 * ImageUploader Component
 * A reusable component for uploading images to Cloudinary
 * 
 * @param {Object} props
 * @param {Function} props.onUploadSuccess - Callback with uploaded image URL
 * @param {string} props.folder - Cloudinary folder (default: 'event-corner')
 * @param {string} props.currentImage - Current image URL to display
 * @param {string} props.label - Label for the upload button
 * @param {string} props.type - Type of image ('profile' or 'banner')
 */
const ImageUploader = ({ 
  onUploadSuccess, 
  folder = 'event-corner',
  currentImage = null,
  label = 'Upload Image',
  type = 'image'
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload to Cloudinary
    try {
      setUploading(true);
      const result = await uploadToCloudinary(file, folder);
      toast.success('Image uploaded successfully!');
      onUploadSuccess(result.url);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image. Please try again.');
      setPreview(currentImage);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onUploadSuccess('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const getImageClass = () => {
    if (type === 'profile') {
      return 'w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg';
    } else if (type === 'banner') {
      return 'w-full h-56 object-cover';
    }
    return 'w-full h-40 rounded-lg object-cover';
  };

  const getContainerClass = () => {
    if (type === 'profile') {
      return 'w-32 h-32 rounded-full border-4 border-white shadow-lg';
    } else if (type === 'banner') {
      return 'w-full h-56';
    }
    return 'w-full h-40 rounded-lg';
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview ? (
        <div className="relative group">
          <img
            src={preview}
            alt="Preview"
            className={getImageClass()}
          />
          <div className={`absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center gap-2 ${type === 'profile' ? 'rounded-full' : ''}`}>
            <button
              onClick={handleClick}
              disabled={uploading}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white text-gray-900 p-2 rounded-full hover:bg-gray-100"
              title="Change image"
            >
              <FiUpload size={18} />
            </button>
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
              title="Remove image"
            >
              <FiX size={18} />
            </button>
          </div>
          {uploading && (
            <div className={`absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center ${type === 'profile' ? 'rounded-full' : ''}`}>
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={handleClick}
          disabled={uploading}
          className={`${getContainerClass()} border-2 border-dashed border-gray-300 hover:border-blue-500 bg-gray-50 hover:bg-blue-50 transition-all duration-200 flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <span className="text-sm font-medium">Uploading...</span>
            </>
          ) : (
            <>
              <FiImage size={32} />
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs text-gray-500">Max 5MB</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ImageUploader;
