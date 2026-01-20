export const eventAddStyles = `
  .event-add-page {
    background: linear-gradient(135deg, #f5f7fa 0%, #e4e9f0 100%);
    min-height: 100vh;
  }

  .glass-card {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(20px);
    border-radius: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }

  .glass-input {
    width: 100%;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.85);
    border: 2px solid rgba(148, 163, 184, 0.3);
    border-radius: 12px;
    outline: none;
    transition: all 0.3s;
    font-size: 14px;
    color: #1e293b;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  .glass-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    background: rgba(255, 255, 255, 0.95);
  }

  .glass-input::placeholder {
    color: #94a3b8;
  }

  .image-upload-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 200px;
    border: 2px dashed rgba(148, 163, 184, 0.4);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    transition: all 0.3s;
  }

  .image-upload-box:hover {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.05);
  }

  .upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .calendar-container {
    background: rgba(255, 255, 255, 0.6);
    border-radius: 12px;
    padding: 16px;
    border: 2px solid rgba(148, 163, 184, 0.2);
  }

  .map-container {
    border-radius: 16px;
    overflow: hidden;
    border: 2px solid rgba(148, 163, 184, 0.3);
    position: relative;
  }

  .map-container .leaflet-container {
    border-radius: 16px;
    z-index: 1;
  }

  .glass-button {
    padding: 8px 16px;
    background: rgba(59, 130, 246, 0.9);
    color: white;
    border-radius: 8px;
    font-weight: 600;
    transition: all 0.3s;
    border: none;
    cursor: pointer;
  }

  .glass-button:hover {
    background: rgba(37, 99, 235, 1);
    transform: translateY(-2px);
  }

  .tag-badge {
    display: inline-flex;
    align-items: center;
    padding: 6px 12px;
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 20px;
    font-size: 13px;
    color: #1e40af;
    font-weight: 500;
  }

  .radio-card {
    padding: 16px;
    background: rgba(255, 255, 255, 0.6);
    border: 2px solid rgba(148, 163, 184, 0.3);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s;
  }

  .radio-card:hover {
    border-color: #3b82f6;
    background: rgba(255, 255, 255, 0.8);
  }

  .radio-card-active {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
  }

  /* Markdown Editor Styling */
  .markdown-editor-wrapper {
    border-radius: 12px;
    overflow: hidden;
  }

  .markdown-editor-wrapper .w-md-editor {
    background: rgba(255, 255, 255, 0.85) !important;
    border: 2px solid rgba(148, 163, 184, 0.3) !important;
    border-radius: 12px !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04) !important;
  }

  .markdown-editor-wrapper .w-md-editor:focus-within {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
  }

  .markdown-editor-wrapper .w-md-editor-toolbar {
    background: rgba(241, 245, 249, 0.8) !important;
    border-bottom: 1px solid rgba(148, 163, 184, 0.2) !important;
    padding: 8px !important;
  }

  .markdown-editor-wrapper .w-md-editor-toolbar button {
    color: #475569 !important;
  }

  .markdown-editor-wrapper .w-md-editor-toolbar button:hover {
    background: rgba(59, 130, 246, 0.1) !important;
    color: #3b82f6 !important;
  }

  .markdown-editor-wrapper .w-md-editor-text {
    background: transparent !important;
  }

  .markdown-editor-wrapper .w-md-editor-text-pre,
  .markdown-editor-wrapper .w-md-editor-text-input {
    font-size: 14px !important;
    line-height: 1.6 !important;
    color: #1e293b !important;
  }

  .markdown-editor-wrapper .w-md-editor-text-pre > code,
  .markdown-editor-wrapper .w-md-editor-text-input {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif !important;
  }

  .markdown-editor-wrapper .w-md-editor-preview {
    background: rgba(255, 255, 255, 0.9) !important;
    padding: 16px !important;
  }
`;
