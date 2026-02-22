import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';
import {
  FiPlus, FiTrash2, FiEdit2, FiSave, FiArrowLeft, FiCalendar, FiClock,
  FiUser, FiUsers, FiCheckSquare, FiList, FiType, FiAlignLeft, FiUpload,
  FiToggleLeft, FiToggleRight, FiEye, FiX, FiExternalLink, FiLink, FiClipboard,
  FiArrowRight, FiInfo
} from 'react-icons/fi';
import AuthContext from '../../../providers/AuthContext';
import { API_ENDPOINTS } from '../../../config/api';
import axios from 'axios';

// Field type configurations
const FIELD_TYPES = [
  { id: 'short_text', label: 'Short Text', icon: FiType, description: 'Single line text input' },
  { id: 'long_text', label: 'Long Text', icon: FiAlignLeft, description: 'Multi-line text area' },
  { id: 'email', label: 'Email', icon: FiUser, description: 'Email address input' },
  { id: 'phone', label: 'Phone Number', icon: FiUser, description: 'Phone number input' },
  { id: 'multiple_choice', label: 'Multiple Choice', icon: FiList, description: 'Select one option' },
  { id: 'checkbox', label: 'Checkboxes', icon: FiCheckSquare, description: 'Select multiple options' },
  { id: 'dropdown', label: 'Dropdown', icon: FiList, description: 'Dropdown selection' },
  { id: 'file_upload', label: 'File Upload', icon: FiUpload, description: 'Upload documents/images' },
];

// Individual registration template
const INDIVIDUAL_TEMPLATE = {
  fields: [
    { id: 'name', label: 'Full Name', type: 'short_text', required: true, placeholder: 'Enter your full name', isLocked: true },
    { id: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'Enter your email', isLocked: true },
    { id: 'phone', label: 'Phone Number', type: 'phone', required: true, placeholder: 'Enter your phone number' },
    { id: 'institution', label: 'Institution/Organization', type: 'short_text', required: false, placeholder: 'Enter your institution name' },
  ]
};

// Function to generate team template based on min/max sizes
const generateTeamTemplate = (minSize, maxSize) => {
  const fields = [];
  
  for (let i = 1; i <= maxSize; i++) {
    const isRequired = i <= minSize; // Members up to minSize are required
    const isLocked = i <= minSize; // Lock required member fields
    const memberLabel = i === 1 ? 'Team Leader' : `Member ${i}`;
    
    // Name field
    fields.push({
      id: `member${i}_name`,
      label: `${memberLabel} Name`,
      type: 'short_text',
      required: isRequired,
      placeholder: `Enter ${memberLabel.toLowerCase()} name`,
      memberNumber: i,
      isLocked: isLocked && (i === 1), // Only lock Team Leader name
      isRequiredMember: isRequired // Custom flag to identify required members
    });
    
    // Email field
    fields.push({
      id: `member${i}_email`,
      label: `${memberLabel} Email`,
      type: 'email',
      required: isRequired,
      placeholder: `Enter ${memberLabel.toLowerCase()} email`,
      memberNumber: i,
      isLocked: isLocked && (i === 1), // Only lock Team Leader email
      isRequiredMember: isRequired
    });
    
    // Phone field (optional for all)
    fields.push({
      id: `member${i}_phone`,
      label: `${memberLabel} Phone`,
      type: 'phone',
      required: false,
      placeholder: `Enter ${memberLabel.toLowerCase()} phone`,
      memberNumber: i,
      isRequiredMember: isRequired
    });
    
    // Institution field (optional for all)
    fields.push({
      id: `member${i}_institution`,
      label: `${memberLabel} Institution`,
      type: 'short_text',
      required: false,
      placeholder: 'Enter institution',
      memberNumber: i,
      isRequiredMember: isRequired
    });
  }
  
  return { fields };
};

const RegistrationFormBuilder = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { userData } = useContext(AuthContext);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [registrationType, setRegistrationType] = useState(null); // null = not selected, 'internal', 'external'
  const [externalRegistrationUrl, setExternalRegistrationUrl] = useState('');
  const [templateType, setTemplateType] = useState(null); // null = not selected, 'individual', 'team'
  const [showTeamConfig, setShowTeamConfig] = useState(false); // New state for team config step
  const [fields, setFields] = useState([]);
  const [teamConfig, setTeamConfig] = useState({ minSize: 2, maxSize: 5 });
  const [deadline, setDeadline] = useState({ date: '', time: '' });
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // New field form state
  const [newField, setNewField] = useState({
    label: '',
    type: 'short_text',
    required: false,
    placeholder: '',
    options: [''],
    memberNumber: null
  });

  useEffect(() => {
    fetchEventDetails();
    fetchExistingConfig();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.EVENT_BY_ID(eventId));
      if (response.data.success) {
        setEventTitle(response.data.event.title);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };

  const fetchExistingConfig = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.REGISTRATION_CONFIG(eventId));
      if (response.data.success && response.data.config) {
        const config = response.data.config;
        setRegistrationType(config.registration_type);
        if (config.registration_type === 'external') {
          setExternalRegistrationUrl(config.external_registration_url || '');
        } else {
          setTemplateType(config.template_type);
          setFields(config.form_config?.fields || []);
          setTeamConfig({
            minSize: config.team_min_size || 2,
            maxSize: config.team_max_size || 5
          });
          // If team template already exists, skip the config step
          if (config.template_type === 'team') {
            setShowTeamConfig(false);
          }
        }
        if (config.registration_deadline) {
          const deadlineDate = new Date(config.registration_deadline);
          setDeadline({
            date: deadlineDate.toISOString().split('T')[0],
            time: deadlineDate.toTimeString().slice(0, 5)
          });
        }
      }
    } catch (error) {
      // No existing config, that's fine
      console.log('No existing registration config');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (type) => {
    if (type === 'individual') {
      setTemplateType(type);
      setFields(INDIVIDUAL_TEMPLATE.fields.map(f => ({ ...f, id: `${f.id}_${Date.now()}` })));
    } else if (type === 'team') {
      // Show team configuration step instead of directly going to form builder
      setShowTeamConfig(true);
    }
  };

  // Handle team configuration confirmation
  const handleTeamConfigConfirm = () => {
    // Validate team config
    if (teamConfig.minSize < 1) {
      toast.error('Minimum team size must be at least 1');
      return;
    }
    if (teamConfig.maxSize < teamConfig.minSize) {
      toast.error('Maximum team size cannot be less than minimum size');
      return;
    }
    if (teamConfig.maxSize > 10) {
      toast.error('Maximum team size cannot exceed 10');
      return;
    }
    
    // Generate team template based on config
    const template = generateTeamTemplate(teamConfig.minSize, teamConfig.maxSize);
    setFields(template.fields.map(f => ({ ...f, id: `${f.id}_${Date.now()}` })));
    setTemplateType('team');
    setShowTeamConfig(false);
  };

  const handleAddField = () => {
    if (!newField.label.trim()) {
      toast.error('Field label is required');
      return;
    }

    const field = {
      id: `field_${Date.now()}`,
      label: newField.label,
      type: newField.type,
      required: newField.required,
      placeholder: newField.placeholder,
      options: ['multiple_choice', 'checkbox', 'dropdown'].includes(newField.type) 
        ? newField.options.filter(o => o.trim()) 
        : undefined,
      memberNumber: newField.memberNumber
    };

    if (editingField) {
      setFields(fields.map(f => f.id === editingField.id ? { ...field, id: editingField.id, isLocked: editingField.isLocked, isRequiredMember: editingField.isRequiredMember } : f));
      setEditingField(null);
    } else {
      setFields([...fields, field]);
    }

    setNewField({ label: '', type: 'short_text', required: false, placeholder: '', options: [''], memberNumber: null });
    setShowAddFieldModal(false);
    toast.success(editingField ? 'Field updated!' : 'Field added!');
  };

  const handleEditField = (field) => {
    setEditingField(field);
    setNewField({
      label: field.label,
      type: field.type,
      required: field.required,
      placeholder: field.placeholder || '',
      options: field.options || [''],
      memberNumber: field.memberNumber
    });
    setShowAddFieldModal(true);
  };

  const handleRemoveField = (fieldId) => {
    const field = fields.find(f => f.id === fieldId);
    if (field.isLocked) {
      toast.error('This field cannot be removed');
      return;
    }
    // Prevent removing required member name/email fields
    if (field.isRequiredMember && (field.id.includes('_name') || field.id.includes('_email'))) {
      toast.error('Required member name and email fields cannot be removed');
      return;
    }
    setFields(fields.filter(f => f.id !== fieldId));
    toast.success('Field removed');
  };

  const handleToggleRequired = (fieldId) => {
    const field = fields.find(f => f.id === fieldId);
    // Prevent toggling required status for required member name/email fields
    if (field.isRequiredMember && (field.id.includes('_name') || field.id.includes('_email'))) {
      toast.error('Required member name and email fields must remain required');
      return;
    }
    setFields(fields.map(f => f.id === fieldId ? { ...f, required: !f.required } : f));
  };

  const handleAddOption = () => {
    setNewField({ ...newField, options: [...newField.options, ''] });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...newField.options];
    newOptions[index] = value;
    setNewField({ ...newField, options: newOptions });
  };

  const handleRemoveOption = (index) => {
    setNewField({ ...newField, options: newField.options.filter((_, i) => i !== index) });
  };

  const handleSubmit = async () => {
    // Validation for external registration
    if (registrationType === 'external') {
      if (!externalRegistrationUrl.trim()) {
        toast.error('Please enter an external registration URL');
        return;
      }
      // Basic URL validation
      try {
        new URL(externalRegistrationUrl);
      } catch {
        toast.error('Please enter a valid URL (e.g., https://example.com/register)');
        return;
      }
    } else {
      // Validation for internal registration
      if (fields.length === 0) {
        toast.error('Please add at least one field to the form');
        return;
      }
    }

    setSaving(true);

    try {
      // Combine date and time for deadline
      let registrationDeadline = null;
      if (deadline.date && deadline.time) {
        registrationDeadline = new Date(`${deadline.date}T${deadline.time}`).toISOString();
      }

      const payload = {
        registration_type: registrationType,
        registration_deadline: registrationDeadline
      };

      if (registrationType === 'external') {
        payload.external_registration_url = externalRegistrationUrl;
      } else {
        payload.template_type = templateType;
        payload.team_min_size = teamConfig.minSize;
        payload.team_max_size = teamConfig.maxSize;
        payload.form_config = { fields, settings: {} };
      }

      const response = await axios.post(API_ENDPOINTS.REGISTRATION_CONFIG(eventId), payload);

      if (response.data.success) {
        toast.success('Registration settings saved successfully!');
        setTimeout(() => navigate('/organizer/events'), 1500);
      } else {
        toast.error(response.data.error || 'Failed to save registration settings');
      }
    } catch (error) {
      console.error('Error saving registration settings:', error);
      toast.error('Failed to save registration settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  // Registration type selection screen (first step)
  if (!registrationType) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Toaster position="top-right" />
        
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <FiArrowLeft /> Back
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Setup Registration</h1>
          <p className="text-gray-600 mt-2">for {eventTitle}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Internal Registration Option */}
          <div 
            onClick={() => setRegistrationType('internal')}
            className="bg-white rounded-xl border-2 border-gray-200 p-8 cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all group"
          >
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-blue-100 rounded-full group-hover:bg-blue-200 transition">
                <FiClipboard size={48} className="text-blue-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Build Registration Form</h2>
            <p className="text-gray-600 text-center mb-4">
              Create a custom registration form using Event Corner
            </p>
            <div className="text-sm text-gray-500">
              <p className="font-medium mb-2">Features:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Custom form fields</li>
                <li>Individual or team registration</li>
                <li>Participant management</li>
                <li>Approval workflow</li>
              </ul>
            </div>
          </div>

          {/* External Registration Option */}
          <div 
            onClick={() => setRegistrationType('external')}
            className="bg-white rounded-xl border-2 border-gray-200 p-8 cursor-pointer hover:border-green-500 hover:shadow-lg transition-all group"
          >
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-green-100 rounded-full group-hover:bg-green-200 transition">
                <FiExternalLink size={48} className="text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">External Registration Link</h2>
            <p className="text-gray-600 text-center mb-4">
              Use your own registration system or Google Form
            </p>
            <div className="text-sm text-gray-500">
              <p className="font-medium mb-2">Use cases:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Google Forms</li>
                <li>Microsoft Forms</li>
                <li>Your own website</li>
                <li>Third-party platforms</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // External registration URL input screen
  if (registrationType === 'external') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Toaster position="top-right" />
        
        <button 
          onClick={() => setRegistrationType(null)} 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <FiArrowLeft /> Change Registration Type
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">External Registration</h1>
          <p className="text-gray-600 mt-2">for {eventTitle}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-100 rounded-full">
              <FiLink size={24} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Registration Link</h3>
              <p className="text-sm text-gray-500">Participants will be redirected to this URL</p>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              External Registration URL *
            </label>
            <input
              type="url"
              value={externalRegistrationUrl}
              onChange={(e) => setExternalRegistrationUrl(e.target.value)}
              placeholder="https://forms.google.com/... or https://your-site.com/register"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
            />
            <p className="text-sm text-gray-500 mt-2">
              Enter the full URL including https://
            </p>
          </div>

          {/* Registration Deadline (Optional) */}
          <div className="bg-orange-50 rounded-xl p-6 mb-6 border border-orange-200">
            <h3 className="font-semibold text-orange-800 mb-4 flex items-center gap-2">
              <FiCalendar /> Registration Deadline (Optional)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={deadline.date}
                  onChange={(e) => setDeadline({ ...deadline, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={deadline.time}
                  onChange={(e) => setDeadline({ ...deadline, time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
            <p className="text-sm text-orange-600 mt-2">
              After the deadline, participants will see that registration is closed.
            </p>
          </div>

          {/* Preview */}
          {externalRegistrationUrl && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">Preview:</p>
              <a 
                href={externalRegistrationUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 break-all"
              >
                <FiExternalLink size={16} />
                {externalRegistrationUrl}
              </a>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button
              onClick={() => navigate('/organizer/events')}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !externalRegistrationUrl.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-teal-700 transition disabled:opacity-50"
            >
              <FiSave /> {saving ? 'Saving...' : 'Save External Link'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Team Configuration Screen (NEW - between template selection and form builder)
  if (showTeamConfig) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Toaster position="top-right" />
        
        <button 
          onClick={() => setShowTeamConfig(false)} 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <FiArrowLeft /> Back to Template Selection
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Team Configuration</h1>
          <p className="text-gray-600 mt-2">for {eventTitle}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-purple-100 rounded-full">
              <FiUsers size={24} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Set Team Size Limits</h3>
              <p className="text-sm text-gray-500">Define the minimum and maximum number of team members</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Team Size *
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={teamConfig.minSize}
                onChange={(e) => setTeamConfig({ ...teamConfig, minSize: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg text-center"
              />
              <p className="text-xs text-gray-500 mt-1">
                Members required to register
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Team Size *
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={teamConfig.maxSize}
                onChange={(e) => setTeamConfig({ ...teamConfig, maxSize: Math.min(10, parseInt(e.target.value) || 1) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg text-center"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum members allowed
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <FiInfo className="text-purple-600 mt-0.5 flex-shrink-0" size={20} />
              <div className="text-sm text-purple-800">
                <p className="font-medium mb-2">How this works:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>
                    <strong>Required members (1 to {teamConfig.minSize}):</strong> Name and email fields will be <strong>mandatory</strong> and cannot be left empty by participants.
                  </li>
                  <li>
                    <strong>Optional members ({teamConfig.minSize + 1} to {teamConfig.maxSize}):</strong> Fields will be provided but are <strong>optional</strong>. Participants can fill them if they have more members.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Preview of member structure */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Preview of team structure:</p>
            <div className="space-y-2">
              {Array.from({ length: teamConfig.maxSize }, (_, i) => i + 1).map(num => (
                <div 
                  key={num} 
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    num <= teamConfig.minSize 
                      ? 'bg-green-100 border border-green-300' 
                      : 'bg-gray-100 border border-gray-300'
                  }`}
                >
                  <span className={`text-sm font-medium ${num <= teamConfig.minSize ? 'text-green-700' : 'text-gray-600'}`}>
                    {num === 1 ? 'Team Leader' : `Member ${num}`}
                  </span>
                  {num <= teamConfig.minSize ? (
                    <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">Required</span>
                  ) : (
                    <span className="text-xs bg-gray-400 text-white px-2 py-0.5 rounded-full">Optional</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Validation error */}
          {teamConfig.maxSize < teamConfig.minSize && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-red-600">
                ⚠️ Maximum team size cannot be less than minimum team size.
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-4">
            <button
              onClick={() => setShowTeamConfig(false)}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleTeamConfigConfirm}
              disabled={teamConfig.maxSize < teamConfig.minSize}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition disabled:opacity-50"
            >
              Next: Build Form <FiArrowRight />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Template selection screen (for internal registration)
  if (!templateType) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Toaster position="top-right" />
        
        <button 
          onClick={() => setRegistrationType(null)} 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <FiArrowLeft /> Change Registration Type
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Choose Registration Template</h1>
          <p className="text-gray-600 mt-2">for {eventTitle}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Individual Template */}
          <div 
            onClick={() => handleSelectTemplate('individual')}
            className="bg-white rounded-xl border-2 border-gray-200 p-8 cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all group"
          >
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-blue-100 rounded-full group-hover:bg-blue-200 transition">
                <FiUser size={48} className="text-blue-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Individual Registration</h2>
            <p className="text-gray-600 text-center mb-4">
              For events where participants register individually
            </p>
            <div className="text-sm text-gray-500">
              <p className="font-medium mb-2">Includes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Name</li>
                <li>Email</li>
                <li>Phone Number</li>
                <li>Institution</li>
              </ul>
            </div>
          </div>

          {/* Team Template */}
          <div 
            onClick={() => handleSelectTemplate('team')}
            className="bg-white rounded-xl border-2 border-gray-200 p-8 cursor-pointer hover:border-purple-500 hover:shadow-lg transition-all group"
          >
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-purple-100 rounded-full group-hover:bg-purple-200 transition">
                <FiUsers size={48} className="text-purple-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Team Registration</h2>
            <p className="text-gray-600 text-center mb-4">
              For competitions and team-based events
            </p>
            <div className="text-sm text-gray-500">
              <p className="font-medium mb-2">Features:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Configure team size limits</li>
                <li>Team Leader + Members</li>
                <li>Required & optional members</li>
                <li>Custom fields per member</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Helper function to check if a field can be edited for required status
  const canToggleRequired = (field) => {
    if (field.isRequiredMember && (field.id.includes('_name') || field.id.includes('_email'))) {
      return false;
    }
    return true;
  };

  // Helper function to check if a field can be removed
  const canRemoveField = (field) => {
    if (field.isLocked) return false;
    if (field.isRequiredMember && (field.id.includes('_name') || field.id.includes('_email'))) {
      return false;
    }
    return true;
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button 
            onClick={() => {
              if (templateType === 'team') {
                // Go back to team config for team registration
                setTemplateType(null);
                setShowTeamConfig(true);
              } else {
                setTemplateType(null);
              }
            }} 
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <FiArrowLeft /> {templateType === 'team' ? 'Change Team Configuration' : 'Change Template'}
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Registration Form Builder</h1>
          <p className="text-gray-600">{eventTitle} - {templateType === 'individual' ? 'Individual' : 'Team'} Registration</p>
        </div>
        <button 
          onClick={() => setShowPreview(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          <FiEye /> Preview
        </button>
      </div>

      {/* Team Configuration Summary (for team registration) */}
      {templateType === 'team' && (
        <div className="bg-purple-50 rounded-xl p-6 mb-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-purple-800 mb-2">Team Configuration</h3>
              <p className="text-sm text-purple-700">
                Team size: <strong>{teamConfig.minSize}</strong> (minimum) to <strong>{teamConfig.maxSize}</strong> (maximum) members
              </p>
              <p className="text-xs text-purple-600 mt-1">
                • Members 1-{teamConfig.minSize}: Required (name & email mandatory)
                {teamConfig.maxSize > teamConfig.minSize && ` • Members ${teamConfig.minSize + 1}-${teamConfig.maxSize}: Optional`}
              </p>
            </div>
            <button
              onClick={() => {
                setTemplateType(null);
                setShowTeamConfig(true);
              }}
              className="px-4 py-2 text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 transition text-sm font-medium"
            >
              Edit Configuration
            </button>
          </div>
        </div>
      )}

      {/* Registration Deadline */}
      <div className="bg-orange-50 rounded-xl p-6 mb-6 border border-orange-200">
        <h3 className="font-semibold text-orange-800 mb-4 flex items-center gap-2">
          <FiCalendar /> Registration Deadline
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={deadline.date}
              onChange={(e) => setDeadline({ ...deadline, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
            <input
              type="time"
              value={deadline.time}
              onChange={(e) => setDeadline({ ...deadline, time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
        <p className="text-sm text-orange-600 mt-2">
          Leave empty for no deadline. Registration will close automatically after the deadline.
        </p>
      </div>

      {/* Form Fields */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Form Fields</h3>
          <button
            onClick={() => {
              setEditingField(null);
              setNewField({ label: '', type: 'short_text', required: false, placeholder: '', options: [''], memberNumber: null });
              setShowAddFieldModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <FiPlus /> Add Field
          </button>
        </div>

        {fields.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FiList size={48} className="mx-auto mb-4 opacity-50" />
            <p>No fields added yet. Click "Add Field" to start building your form.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div 
                key={field.id} 
                className={`flex items-center justify-between p-4 rounded-lg border transition ${
                  field.isRequiredMember 
                    ? 'bg-green-50 border-green-200 hover:border-green-300' 
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-gray-400 font-medium">{index + 1}</span>
                  <div>
                    <p className="font-medium text-gray-800">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                      {field.isLocked && <span className="ml-2 text-xs bg-gray-500 text-white px-2 py-0.5 rounded">Locked</span>}
                      {field.isRequiredMember && !field.isLocked && (
                        <span className="ml-2 text-xs bg-green-600 text-white px-2 py-0.5 rounded">Required Member</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      {FIELD_TYPES.find(t => t.id === field.type)?.label || field.type}
                      {field.memberNumber && ` • ${field.memberNumber === 1 ? 'Team Leader' : `Member ${field.memberNumber}`}`}
                      {field.isRequiredMember === false && field.memberNumber && ' (Optional)'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canToggleRequired(field) ? (
                    <button
                      onClick={() => handleToggleRequired(field.id)}
                      className={`p-2 rounded-lg transition ${field.required ? 'text-green-600 bg-green-100' : 'text-gray-400 bg-gray-100'}`}
                      title={field.required ? 'Required' : 'Optional'}
                    >
                      {field.required ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}
                    </button>
                  ) : (
                    <div
                      className="p-2 rounded-lg text-green-600 bg-green-100 cursor-not-allowed opacity-60"
                      title="Required field cannot be made optional"
                    >
                      <FiToggleRight size={20} />
                    </div>
                  )}
                  <button
                    onClick={() => handleEditField(field)}
                    className="p-2 text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition"
                    title="Edit field"
                  >
                    <FiEdit2 size={18} />
                  </button>
                  {canRemoveField(field) ? (
                    <button
                      onClick={() => handleRemoveField(field.id)}
                      className="p-2 text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition"
                      title="Remove field"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  ) : (
                    <div
                      className="p-2 text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed opacity-60"
                      title="This field cannot be removed"
                    >
                      <FiTrash2 size={18} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <button
          onClick={() => navigate('/organizer/events')}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || fields.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50"
        >
          <FiSave /> {saving ? 'Saving...' : 'Save Registration Form'}
        </button>
      </div>

      {/* Add/Edit Field Modal */}
      {showAddFieldModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">
                  {editingField ? 'Edit Field' : 'Add New Field'}
                </h3>
                <button onClick={() => setShowAddFieldModal(false)} className="text-gray-500 hover:text-gray-700">
                  <FiX size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {/* Field Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field Label *</label>
                <input
                  type="text"
                  value={newField.label}
                  onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                  placeholder="e.g., Full Name, T-Shirt Size"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Field Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field Type</label>
                <select
                  value={newField.type}
                  onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {FIELD_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.label} - {type.description}</option>
                  ))}
                </select>
              </div>

              {/* Placeholder */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder Text</label>
                <input
                  type="text"
                  value={newField.placeholder}
                  onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                  placeholder="e.g., Enter your name here"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Options for multiple choice/checkbox/dropdown */}
              {['multiple_choice', 'checkbox', 'dropdown'].includes(newField.type) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                  <div className="space-y-2">
                    {newField.options.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {newField.options.length > 1 && (
                          <button
                            onClick={() => handleRemoveOption(index)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={handleAddOption}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      <FiPlus /> Add Option
                    </button>
                  </div>
                </div>
              )}

              {/* Required Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="required"
                  checked={newField.required}
                  onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="required" className="text-sm font-medium text-gray-700">
                  Make this field required
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAddFieldModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddField}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {editingField ? 'Update Field' : 'Add Field'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">Form Preview</h3>
                <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-gray-700">
                  <FiX size={24} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{eventTitle}</h2>
              <p className="text-gray-600 mb-6">Registration Form</p>
              
              {deadline.date && deadline.time && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                  <p className="text-orange-800 font-medium flex items-center gap-2">
                    <FiClock /> Registration Deadline: {new Date(`${deadline.date}T${deadline.time}`).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Team info for preview */}
              {templateType === 'team' && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                  <p className="text-purple-800 font-medium flex items-center gap-2">
                    <FiUsers /> Team Registration
                  </p>
                  <p className="text-sm text-purple-700 mt-1">
                    Team size: {teamConfig.minSize} - {teamConfig.maxSize} members
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {fields.map(field => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                      {field.memberNumber && !field.isRequiredMember && (
                        <span className="ml-2 text-xs text-gray-500">(Optional)</span>
                      )}
                    </label>
                    {['short_text', 'email', 'phone'].includes(field.type) && (
                      <input
                        type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        disabled
                      />
                    )}
                    {field.type === 'long_text' && (
                      <textarea
                        placeholder={field.placeholder}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        disabled
                      />
                    )}
                    {field.type === 'dropdown' && (
                      <select className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50" disabled>
                        <option>Select an option</option>
                        {field.options?.map((opt, i) => <option key={i}>{opt}</option>)}
                      </select>
                    )}
                    {field.type === 'multiple_choice' && field.options && (
                      <div className="space-y-2">
                        {field.options.map((opt, i) => (
                          <label key={i} className="flex items-center gap-2">
                            <input type="radio" name={field.id} disabled className="text-blue-600" />
                            <span className="text-gray-700">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {field.type === 'checkbox' && field.options && (
                      <div className="space-y-2">
                        {field.options.map((opt, i) => (
                          <label key={i} className="flex items-center gap-2">
                            <input type="checkbox" disabled className="text-blue-600 rounded" />
                            <span className="text-gray-700">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {field.type === 'file_upload' && (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500">
                        <FiUpload size={24} className="mx-auto mb-2" />
                        <p>Click or drag to upload</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button className="w-full mt-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold" disabled>
                Register
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationFormBuilder;
