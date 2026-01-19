import React from 'react';

const VisibilitySection = ({ formData, handleInputChange }) => {
  return (
    <div className="glass-card p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-4">
        Event Visibility
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <label className={`radio-card ${formData.visibility === 'public' ? 'radio-card-active' : ''}`}>
          <input
            type="radio"
            name="visibility"
            value="public"
            checked={formData.visibility === 'public'}
            onChange={handleInputChange}
            className="sr-only"
          />
          <div>
            <span className="font-semibold block mb-1">🌍 Public</span>
            <span className="text-xs text-slate-600">Everyone can see and register</span>
          </div>
        </label>

        <label className={`radio-card ${formData.visibility === 'private' ? 'radio-card-active' : ''}`}>
          <input
            type="radio"
            name="visibility"
            value="private"
            checked={formData.visibility === 'private'}
            onChange={handleInputChange}
            className="sr-only"
          />
          <div>
            <span className="font-semibold block mb-1">🔒 Private</span>
            <span className="text-xs text-slate-600">Only invited people can see</span>
          </div>
        </label>
      </div>
    </div>
  );
};

export default VisibilitySection;
