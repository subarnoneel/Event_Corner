import React, { useState } from 'react';
import { FiUpload, FiLoader, FiCheckCircle, FiAlertCircle, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { API_ENDPOINTS } from '../../../config/api';

const BannerAnalyzer = ({ onDataExtracted, onClose }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAnalysisResult(null);
      setError(null);
    }
  };

  const analyzeBanner = async () => {
    if (!selectedFile) {
      toast.error('Please select a banner image first');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('banner', selectedFile);

      const response = await fetch(API_ENDPOINTS.AI_ANALYZE_BANNER, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      setAnalysisResult(data);
      toast.success('Banner analyzed successfully!');
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to analyze banner');
      toast.error(err.message || 'Failed to analyze banner');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const useExtractedData = () => {
    if (!analysisResult || !analysisResult.event_data) {
      toast.error('No data to use');
      return;
    }

    onDataExtracted(analysisResult.event_data);
    toast.success('Data filled into form!');
    onClose();
  };

  const getConfidenceBadge = (confidence) => {
    const colors = {
      high: 'bg-green-100 text-green-700 border-green-300',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      low: 'bg-red-100 text-red-700 border-red-300'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${colors[confidence] || colors.medium}`}>
        {confidence.toUpperCase()} CONFIDENCE
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">AI Banner Analyzer</h2>
            <p className="text-blue-100 text-sm mt-1">
              Upload your event banner and let AI extract the details
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* File Upload Section */}
          {!analysisResult && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Upload Event Banner
              </label>
              
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
                {previewUrl ? (
                  <div className="space-y-4">
                    <img
                      src={previewUrl}
                      alt="Banner preview"
                      className="max-h-64 mx-auto rounded-lg shadow-lg"
                    />
                    <div className="flex gap-3 justify-center">
                      <label className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors cursor-pointer font-semibold">
                        Change Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                      <button
                        onClick={analyzeBanner}
                        disabled={isAnalyzing}
                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold disabled:opacity-50 flex items-center gap-2"
                      >
                        {isAnalyzing ? (
                          <>
                            <FiLoader className="animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          'Analyze Banner'
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <FiUpload className="mx-auto text-slate-400 mb-3" size={48} />
                    <p className="text-slate-700 font-semibold mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-slate-500 text-sm">
                      PNG, JPG, GIF up to 10MB
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <FiAlertCircle className="text-red-600 mt-0.5" size={20} />
                  <div>
                    <p className="text-red-800 font-semibold">Analysis Failed</p>
                    <p className="text-red-600 text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Analysis Results */}
          {analysisResult && analysisResult.success && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FiCheckCircle className="text-green-600" size={24} />
                  <h3 className="text-lg font-bold text-slate-800">
                    Analysis Complete
                  </h3>
                </div>
                {getConfidenceBadge(analysisResult.event_data.confidence)}
              </div>

              {/* Preview extracted image */}
              {previewUrl && (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Analyzed banner"
                    className="w-full max-h-48 object-cover rounded-lg shadow-md"
                  />
                </div>
              )}

              {/* Extracted Data Preview */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <h4 className="font-semibold text-slate-800 mb-3">
                  Extracted Information:
                </h4>

                {analysisResult.event_data.title && (
                  <div>
                    <span className="text-xs text-slate-600 font-semibold uppercase">
                      Title
                    </span>
                    <p className="text-slate-800">{analysisResult.event_data.title}</p>
                  </div>
                )}

                {analysisResult.event_data.description && (
                  <div>
                    <span className="text-xs text-slate-600 font-semibold uppercase">
                      Description
                    </span>
                    <p className="text-slate-800">{analysisResult.event_data.description}</p>
                  </div>
                )}

                {analysisResult.event_data.category && (
                  <div>
                    <span className="text-xs text-slate-600 font-semibold uppercase">
                      Category
                    </span>
                    <p className="text-slate-800 capitalize">{analysisResult.event_data.category}</p>
                  </div>
                )}

                {analysisResult.event_data.venue_name && (
                  <div>
                    <span className="text-xs text-slate-600 font-semibold uppercase">
                      Venue
                    </span>
                    <p className="text-slate-800">{analysisResult.event_data.venue_name}</p>
                    {analysisResult.event_data.venue_address && (
                      <p className="text-slate-600 text-sm">{analysisResult.event_data.venue_address}</p>
                    )}
                  </div>
                )}

                {analysisResult.event_data.contact_email && (
                  <div>
                    <span className="text-xs text-slate-600 font-semibold uppercase">
                      Contact Email
                    </span>
                    <p className="text-slate-800">{analysisResult.event_data.contact_email}</p>
                  </div>
                )}

                {analysisResult.event_data.contact_phone && (
                  <div>
                    <span className="text-xs text-slate-600 font-semibold uppercase">
                      Contact Phone
                    </span>
                    <p className="text-slate-800">{analysisResult.event_data.contact_phone}</p>
                  </div>
                )}

                {analysisResult.event_data.entry_fee && (
                  <div>
                    <span className="text-xs text-slate-600 font-semibold uppercase">
                      Entry Fee
                    </span>
                    <p className="text-slate-800">
                      {analysisResult.event_data.entry_fee === "0" ? "Free" : `BDT ${analysisResult.event_data.entry_fee}`}
                    </p>
                  </div>
                )}

                {analysisResult.event_data.tags && analysisResult.event_data.tags.length > 0 && (
                  <div>
                    <span className="text-xs text-slate-600 font-semibold uppercase block mb-2">
                      Tags
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.event_data.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Debug Info (collapsible) */}
              {analysisResult.raw_ocr_text && (
                <details className="bg-slate-100 rounded-lg p-4">
                  <summary className="cursor-pointer font-semibold text-slate-700 text-sm">
                    View Raw OCR Text
                  </summary>
                  <pre className="text-xs text-slate-600 mt-2 whitespace-pre-wrap">
                    {analysisResult.raw_ocr_text}
                  </pre>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4">
                <button
                  onClick={() => {
                    setAnalysisResult(null);
                    setPreviewUrl(null);
                    setSelectedFile(null);
                  }}
                  className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold"
                >
                  Analyze Another
                </button>
                <button
                  onClick={useExtractedData}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold"
                >
                  Use This Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BannerAnalyzer;
