import React from 'react';
import { FiUsers, FiClipboard, FiXCircle } from 'react-icons/fi';

const RegistrationSettingsSection = ({ formData, handleInputChange }) => {
  // Handle the change to map 'registration' to 'internal' for backend compatibility
  const handleRegistrationTypeChange = (e) => {
    const value = e.target.value;
    // When 'registration' is selected, we store it as 'internal' 
    // The actual type (internal/external) will be chosen in RegistrationFormBuilder
    handleInputChange({
      target: {
        name: 'registrationType',
        value: value === 'registration' ? 'internal' : value
      }
    });
  };

  // Check if registration is enabled (either 'internal' or 'registration')
  const isRegistrationEnabled = formData.registrationType === 'internal' || formData.registrationType === 'external';

  return (
    <div className="glass-card p-6">
      <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <FiUsers className="text-purple-600" />
        Registration Settings
      </h2>
      <p className="text-slate-600 text-sm mb-6">
        Choose whether participants need to register for your event
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Registration Enabled */}
        <label
          className={`relative p-5 border-2 rounded-xl cursor-pointer transition-all ${
            isRegistrationEnabled
              ? 'border-purple-500 bg-purple-50 shadow-lg'
              : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
          }`}
        >
          <input
            type="radio"
            name="registrationType"
            value="registration"
            checked={isRegistrationEnabled}
            onChange={handleRegistrationTypeChange}
            className="sr-only"
          />
          <div className="flex flex-col items-center text-center gap-3">
            <div className={`p-3 rounded-full ${
              isRegistrationEnabled
                ? 'bg-purple-500 text-white'
                : 'bg-slate-100 text-slate-500'
            }`}>
              <FiClipboard size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Registration</h3>
              <p className="text-xs text-slate-500 mt-1">
                Require participants to register for your event
              </p>
            </div>
            {isRegistrationEnabled && (
              <span className="absolute top-2 right-2 w-3 h-3 bg-purple-500 rounded-full"></span>
            )}
          </div>
        </label>

        {/* No Registration */}
        <label
          className={`relative p-5 border-2 rounded-xl cursor-pointer transition-all ${
            formData.registrationType === 'none'
              ? 'border-slate-500 bg-slate-50 shadow-lg'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
          }`}
        >
          <input
            type="radio"
            name="registrationType"
            value="none"
            checked={formData.registrationType === 'none'}
            onChange={handleRegistrationTypeChange}
            className="sr-only"
          />
          <div className="flex flex-col items-center text-center gap-3">
            <div className={`p-3 rounded-full ${
              formData.registrationType === 'none'
                ? 'bg-slate-500 text-white'
                : 'bg-slate-100 text-slate-500'
            }`}>
              <FiXCircle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">No Registration</h3>
              <p className="text-xs text-slate-500 mt-1">
                Open event, no registration required
              </p>
            </div>
            {formData.registrationType === 'none' && (
              <span className="absolute top-2 right-2 w-3 h-3 bg-slate-500 rounded-full"></span>
            )}
          </div>
        </label>
      </div>

      {/* Registration Info */}
      {isRegistrationEnabled && (
        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-xl">
          <div className="flex items-start gap-3">
            <FiClipboard className="text-purple-600 mt-1" size={20} />
            <div>
              <h4 className="font-semibold text-purple-800">Registration Form Setup</h4>
              <p className="text-sm text-purple-700 mt-1">
                After creating this event, you'll be taken to the Registration Form Builder where you can either build a custom registration form or provide an external registration link (e.g., Google Forms).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationSettingsSection;
