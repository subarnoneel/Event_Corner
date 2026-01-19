import React from 'react';
import { FiInfo, FiPlus, FiX } from 'react-icons/fi';

const AdditionalInfoSection = ({ 
  formData, 
  handleInputChange, 
  additionalInfoFields,
  handleAddInfoField,
  handleRemoveInfoField,
  handleInfoFieldChange
}) => {
  return (
    <div className="glass-card p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-4">
        <FiInfo className="inline mr-2 text-blue-600" />
        Additional Information
      </h2>

      {/* Requirements Field */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Requirements / Prerequisites
        </label>
        <textarea
          name="requirements"
          value={formData.requirements || ''}
          onChange={handleInputChange}
          placeholder="E.g., Prior knowledge of programming, Bring your own laptop, Age 18+, etc."
          rows="4"
          className="glass-input resize-none"
        />
        <p className="text-xs text-slate-500 mt-1">
          List any prerequisites or requirements for participants
        </p>
      </div>

      {/* Additional Info (Key-Value pairs) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-semibold text-slate-700">
            Custom Information Fields
          </label>
          <button
            type="button"
            onClick={handleAddInfoField}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
          >
            <FiPlus size={16} />
            Add Field
          </button>
        </div>
        
        <p className="text-xs text-slate-500 mb-4">
          Add custom key-value pairs for any additional information (e.g., Dress Code: Formal, Certificate: Yes, etc.)
        </p>

        {additionalInfoFields.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
            <FiInfo size={32} className="mx-auto text-slate-400 mb-2" />
            <p className="text-slate-500 text-sm">No additional fields yet. Click "Add Field" to create one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {additionalInfoFields.map((field) => (
              <div 
                key={field.id} 
                className="flex gap-3 items-start p-4 bg-white/50 rounded-lg border border-slate-200"
              >
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Field name (e.g., Dress Code)"
                      value={field.key}
                      onChange={(e) => handleInfoFieldChange(field.id, 'key', e.target.value)}
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Value (e.g., Formal)"
                      value={field.value}
                      onChange={(e) => handleInfoFieldChange(field.id, 'value', e.target.value)}
                      className="glass-input"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveInfoField(field.id)}
                  className="mt-3 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove field"
                >
                  <FiX size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdditionalInfoSection;
