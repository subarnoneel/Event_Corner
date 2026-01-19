import React from 'react';
import { FiImage } from 'react-icons/fi';
import ImageUploadBox from './ImageUploadBox';

const MediaSection = ({ formData, setFormData, handleImageUpload, removeAdditionalImage }) => {
  return (
    <div className="glass-card p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center">
        <FiImage className="mr-2 text-blue-600" />
        Event Media
      </h2>

      <div className="space-y-4">
        <ImageUploadBox
          label="Banner Image (1920x1080)"
          dimensions="Recommended: 1920x1080px"
          preview={formData.bannerImage}
          onUpload={(e) => handleImageUpload(e, 'banner')}
          onRemove={() => setFormData(prev => ({ ...prev, bannerImage: '' }))}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImageUploadBox
            label="Thumbnail (800x600)"
            dimensions="800x600px"
            height="h-40"
            preview={formData.thumbnailImage}
            onUpload={(e) => handleImageUpload(e, 'thumbnail')}
            onRemove={() => setFormData(prev => ({ ...prev, thumbnailImage: '' }))}
          />

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Additional Images
            </label>
            <label className="image-upload-box h-40">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'additional')}
                className="hidden"
              />
              <div className="upload-placeholder">
                <FiImage className="text-3xl text-slate-400 mb-2" />
                <p className="text-xs text-slate-600 font-semibold">Add more images</p>
                <p className="text-xs text-slate-500">Any size</p>
              </div>
            </label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {formData.additionalImages.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img src={img} alt={`Additional ${idx + 1}`} className="w-full h-20 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => removeAdditionalImage(idx)}
                    className="absolute -top-2 -right-2 bg-red-600 text-white w-6 h-6 rounded-full hover:bg-red-700 text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaSection;
