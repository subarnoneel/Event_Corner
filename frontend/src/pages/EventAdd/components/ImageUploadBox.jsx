import React from 'react';
import { FiImage } from 'react-icons/fi';

const ImageUploadBox = ({ onUpload, preview, onRemove, label, dimensions, height = 'h-48' }) => {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        {label}
      </label>
      {preview ? (
        <div className="relative group">
          <img
            src={preview}
            alt={label}
            className={`w-full ${height} object-cover rounded-xl`}
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
            <button
              type="button"
              onClick={onRemove}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label className={`image-upload-box ${height === 'h-40' ? 'h-40' : ''}`}>
          <input
            type="file"
            accept="image/*"
            onChange={onUpload}
            className="hidden"
          />
          <div className="upload-placeholder">
            <FiImage className={`${height === 'h-40' ? 'text-3xl' : 'text-4xl'} text-slate-400 mb-2`} />
            <p className={`${height === 'h-40' ? 'text-xs' : 'text-sm'} text-slate-600 font-semibold`}>
              {height === 'h-40' ? `Upload ${label.toLowerCase()}` : `Click to upload ${label.toLowerCase()}`}
            </p>
            {dimensions && (
              <p className="text-xs text-slate-500 mt-1">
                {dimensions}
              </p>
            )}
          </div>
        </label>
      )}
    </div>
  );
};

export default ImageUploadBox;
