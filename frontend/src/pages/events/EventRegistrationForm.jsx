import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';
import {
  FiArrowLeft, FiCalendar, FiClock, FiMapPin, FiUser, FiUsers,
  FiCheck, FiX, FiUpload, FiAlertCircle, FiCheckCircle, FiInfo, FiDollarSign
} from 'react-icons/fi';
import AuthContext from '../../providers/AuthContext';
import { API_ENDPOINTS } from '../../config/api';
import axios from 'axios';

const EventRegistrationForm = () => {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const { userData, user } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [event, setEvent] = useState(null);
  const [config, setConfig] = useState(null);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [formData, setFormData] = useState({});
  const [teamName, setTeamName] = useState('');
  const [errors, setErrors] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [autoFillChecked, setAutoFillChecked] = useState(false);
  const [nameFieldId, setNameFieldId] = useState(null);
  const [emailFieldId, setEmailFieldId] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const fileInputRefs = useRef({});

  useEffect(() => {
    if (eventId && userData?.user_id) {
      fetchEventAndConfig();
      checkRegistrationStatus();
      fetchPaymentConfig();
    }
  }, [eventId, userData]);

  const fetchPaymentConfig = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.PAYMENT_CONFIG(eventId));
      if (response.data.success && response.data.config) {
        setPaymentConfig(response.data.config);
      }
    } catch (error) {
      console.log('No payment config for this event');
    }
  };

  const fetchEventAndConfig = async () => {
    try {
      // Fetch event details
      const eventResponse = await axios.get(API_ENDPOINTS.EVENT_BY_ID(eventId));
      if (eventResponse.data.success) {
        setEvent(eventResponse.data.event);
      }

      // Fetch registration config
      const configResponse = await axios.get(API_ENDPOINTS.REGISTRATION_CONFIG(eventId));
      if (configResponse.data.success && configResponse.data.config) {
        setConfig(configResponse.data.config);

        // Initialize form data with empty values
        const initialData = {};
        const fields = configResponse.data.config.form_config?.fields || [];

        // Find name and email field IDs for auto-fill functionality
        let foundNameFieldId = null;
        let foundEmailFieldId = null;

        fields.forEach(field => {
          if (field.type === 'checkbox') {
            initialData[field.id] = [];
          } else {
            initialData[field.id] = '';
          }

          // Identify name and email fields (locked fields from template)
          if (field.isLocked && field.type === 'short_text' && (field.id.includes('name') || field.label.toLowerCase().includes('name'))) {
            foundNameFieldId = field.id;
          }
          if (field.isLocked && field.type === 'email') {
            foundEmailFieldId = field.id;
          }
        });

        setNameFieldId(foundNameFieldId);
        setEmailFieldId(foundEmailFieldId);
        setFormData(initialData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load registration form');
    } finally {
      setLoading(false);
    }
  };

  const checkRegistrationStatus = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.REGISTRATION_STATUS(eventId, userData.user_id));
      if (response.data.success) {
        setRegistrationStatus(response.data);
      }
    } catch (error) {
      console.error('Error checking registration status:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const fields = config?.form_config?.fields || [];

    fields.forEach(field => {
      if (field.required) {
        const value = formData[field.id];
        if (!value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && !value.trim())) {
          newErrors[field.id] = `${field.label} is required`;
        }
      }

      // Email validation
      if (field.type === 'email' && formData[field.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.id])) {
          newErrors[field.id] = 'Please enter a valid email address';
        }
      }

      // Phone validation
      if (field.type === 'phone' && formData[field.id]) {
        const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
        if (!phoneRegex.test(formData[field.id])) {
          newErrors[field.id] = 'Please enter a valid phone number';
        }
      }
    });

    // Team name validation for team registrations
    if (config?.template_type === 'team' && !teamName.trim()) {
      newErrors.team_name = 'Team name is required';
    }

    // Team size validation for team registrations
    if (config?.template_type === 'team') {
      const minSize = config.team_min_size || 2;
      const maxSize = config.team_max_size || 5;

      // Count filled team members by checking member name fields
      const memberNameFields = fields.filter(f =>
        f.memberNumber && (f.id.toLowerCase().includes('name') || f.label.toLowerCase().includes('name'))
      );

      let filledMemberCount = 0;
      memberNameFields.forEach(field => {
        const value = formData[field.id];
        if (value && value.trim()) {
          filledMemberCount++;
        }
      });

      // If no member fields found, try counting by unique member numbers
      if (memberNameFields.length === 0) {
        const memberNumbers = new Set();
        fields.forEach(field => {
          if (field.memberNumber) {
            // Check if at least one field for this member is filled
            const memberFields = fields.filter(f => f.memberNumber === field.memberNumber);
            const hasFilledField = memberFields.some(f => {
              const value = formData[f.id];
              return value && (typeof value === 'string' ? value.trim() : true);
            });
            if (hasFilledField) {
              memberNumbers.add(field.memberNumber);
            }
          }
        });
        filledMemberCount = memberNumbers.size;
      }

      // Validate team size
      if (filledMemberCount < minSize) {
        newErrors.team_size = `Team must have at least ${minSize} member${minSize > 1 ? 's' : ''}. Currently: ${filledMemberCount}`;
      } else if (filledMemberCount > maxSize) {
        newErrors.team_size = `Team cannot have more than ${maxSize} member${maxSize > 1 ? 's' : ''}. Currently: ${filledMemberCount}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const handleCheckboxChange = (fieldId, option, checked) => {
    setFormData(prev => {
      const currentValues = prev[fieldId] || [];
      if (checked) {
        return { ...prev, [fieldId]: [...currentValues, option] };
      } else {
        return { ...prev, [fieldId]: currentValues.filter(v => v !== option) };
      }
    });
  };

  const handleFileUpload = async (fieldId, file) => {
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only PDF, JPG, and PNG files are allowed');
        return;
      }

      // Show uploading state
      setUploadedFiles(prev => ({ ...prev, [fieldId]: { name: file.name, uploading: true } }));

      try {
        // Upload file to server
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        const response = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/registration/upload-file`,
          formDataUpload,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );

        if (response.data.success) {
          // Store the file info with URL
          setUploadedFiles(prev => ({
            ...prev,
            [fieldId]: {
              name: file.name,
              url: response.data.file.url,
              originalName: response.data.file.originalName,
              uploading: false
            }
          }));

          // Store the file URL in formData (this will be saved to database)
          setFormData(prev => ({
            ...prev,
            [fieldId]: JSON.stringify({
              url: response.data.file.url,
              filename: response.data.file.filename,
              originalName: response.data.file.originalName
            })
          }));

          toast.success('File uploaded successfully');
        } else {
          throw new Error(response.data.error || 'Upload failed');
        }
      } catch (error) {
        console.error('File upload error:', error);
        toast.error('Failed to upload file. Please try again.');
        setUploadedFiles(prev => {
          const newFiles = { ...prev };
          delete newFiles[fieldId];
          return newFiles;
        });
        return;
      }

      // Clear error
      if (errors[fieldId]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[fieldId];
          return newErrors;
        });
      }
    }
  };

  const handleAutoFillChange = (checked) => {
    setAutoFillChecked(checked);
    if (checked && userData) {
      // Auto-fill the name and email fields with user's account info
      if (nameFieldId) {
        setFormData(prev => ({ ...prev, [nameFieldId]: userData.full_name || '' }));
        // Clear error if exists
        if (errors[nameFieldId]) {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[nameFieldId];
            return newErrors;
          });
        }
      }
      if (emailFieldId) {
        setFormData(prev => ({ ...prev, [emailFieldId]: userData.email || '' }));
        // Clear error if exists
        if (errors[emailFieldId]) {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[emailFieldId];
            return newErrors;
          });
        }
      }
    } else {
      // Clear the auto-filled values when unchecked
      if (nameFieldId) {
        setFormData(prev => ({ ...prev, [nameFieldId]: '' }));
      }
      if (emailFieldId) {
        setFormData(prev => ({ ...prev, [emailFieldId]: '' }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      // PAID EVENT — go straight to payment, registration created after payment succeeds
      if (paymentConfig?.is_paid_event && paymentConfig.fee_amount > 0) {
        try {
          const nameField = config?.form_config?.fields?.find(f => f.isLocked && (f.id.includes('name') || f.label.toLowerCase().includes('name')));
          const emailField = config?.form_config?.fields?.find(f => f.isLocked && f.type === 'email');
          const cusName = (nameField ? formData[nameField.id] : null) || userData.full_name || 'Participant';
          const cusEmail = (emailField ? formData[emailField.id] : null) || userData.email || 'participant@example.com';

          const paymentResponse = await axios.post(API_ENDPOINTS.PAYMENT_INITIATE(eventId), {
            user_id: userData.user_id,
            cus_name: cusName,
            cus_email: cusEmail,
            cus_phone: '01700000000',
            form_data: formData,
            team_name: config?.template_type === 'team' ? teamName : null
          });

          if (paymentResponse.data.success && paymentResponse.data.redirectUrl) {
            toast('Redirecting to payment gateway...', { icon: '🔄' });
            window.location.href = paymentResponse.data.redirectUrl;
            return;
          } else {
            toast.error('Failed to initiate payment. Please try again.');
            setSubmitting(false);
            return;
          }
        } catch (paymentError) {
          console.error('Payment initiation error:', paymentError);
          toast.error('Payment gateway error. Please try again.');
          setSubmitting(false);
          return;
        }
      }

      // FREE EVENT — submit registration directly
      const response = await axios.post(API_ENDPOINTS.REGISTRATION_SUBMIT(eventId), {
        user_id: userData.user_id,
        form_data: formData,
        team_name: config?.template_type === 'team' ? teamName : null,
        team_members: [],
        uploaded_files: []
      });

      if (response.data.success) {
        toast.success('Registration submitted successfully! Waiting for approval.');
        setTimeout(() => navigate(`/event/${eventId}`), 2000);
      } else {
        toast.error(response.data.error || 'Failed to submit registration');
      }
    } catch (error) {
      console.error('Error submitting registration:', error);
      toast.error(error.response?.data?.error || 'Failed to submit registration');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field) => {
    const error = errors[field.id];
    const baseInputClass = `w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
      }`;

    switch (field.type) {
      case 'short_text':
        return (
          <input
            type="text"
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
          />
        );

      case 'long_text':
        return (
          <textarea
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={baseInputClass}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
          />
        );

      case 'phone':
        return (
          <input
            type="tel"
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
          />
        );

      case 'dropdown':
        return (
          <select
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={baseInputClass}
          >
            <option value="">Select an option</option>
            {field.options?.map((option, i) => (
              <option key={i} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'multiple_choice':
        return (
          <div className="space-y-2">
            {field.options?.map((option, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={formData[field.id] === option}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(formData[field.id] || []).includes(option)}
                  onChange={(e) => handleCheckboxChange(field.id, option, e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'file_upload':
        const fileState = uploadedFiles[field.id];
        return (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition cursor-pointer ${fileState?.uploading
              ? 'border-blue-400 bg-blue-50 cursor-wait'
              : fileState?.url
                ? 'border-green-400 bg-green-50 hover:border-green-500'
                : 'border-gray-300 hover:border-blue-400'
              }`}
            onClick={() => !fileState?.uploading && fileInputRefs.current[field.id]?.click()}
          >
            {fileState?.uploading ? (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-200 border-t-blue-600 mx-auto mb-2"></div>
                <p className="text-blue-600 font-medium">Uploading {fileState.name}...</p>
                <p className="text-sm text-blue-400 mt-1">Please wait</p>
              </>
            ) : fileState?.url ? (
              <>
                <FiCheckCircle size={32} className="mx-auto text-green-500 mb-2" />
                <p className="text-green-600 font-medium">{fileState.name || fileState.originalName}</p>
                <p className="text-sm text-green-500 mt-1">✓ File uploaded successfully</p>
                <p className="text-xs text-gray-400 mt-2">Click to change file</p>
              </>
            ) : (
              <>
                <FiUpload size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600">Click or drag to upload</p>
                <p className="text-sm text-gray-400 mt-1">PDF, JPG, PNG up to 10MB</p>
              </>
            )}
            <input
              ref={el => fileInputRefs.current[field.id] = el}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              disabled={fileState?.uploading}
              onChange={(e) => handleFileUpload(field.id, e.target.files[0])}
            />
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
          />
        );
    }
  };

  // Helper function to count filled team members for display
  const getFilledTeamMemberCount = () => {
    if (config?.template_type !== 'team') return 0;

    const fields = config?.form_config?.fields || [];
    const memberNameFields = fields.filter(f =>
      f.memberNumber && (f.id.toLowerCase().includes('name') || f.label.toLowerCase().includes('name'))
    );

    let count = 0;
    memberNameFields.forEach(field => {
      const value = formData[field.id];
      if (value && value.trim()) {
        count++;
      }
    });

    // Fallback: count by unique member numbers with filled fields
    if (memberNameFields.length === 0) {
      const memberNumbers = new Set();
      fields.forEach(field => {
        if (field.memberNumber) {
          const memberFields = fields.filter(f => f.memberNumber === field.memberNumber);
          const hasFilledField = memberFields.some(f => {
            const value = formData[f.id];
            return value && (typeof value === 'string' ? value.trim() : true);
          });
          if (hasFilledField) {
            memberNumbers.add(field.memberNumber);
          }
        }
      });
      count = memberNumbers.size;
    }

    return count;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  if (!config || config.registration_type === 'external') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <Toaster position="top-right" />
        <div className="max-w-2xl mx-auto">
          <Link to={`/event/${eventId}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
            <FiArrowLeft /> Back to Event
          </Link>
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <FiAlertCircle size={48} className="mx-auto text-yellow-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Registration Not Available</h2>
            <p className="text-gray-600">
              {config?.registration_type === 'external'
                ? 'This event uses an external registration process. Please check the event details for registration information.'
                : 'Online registration is not set up for this event yet.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check if user already registered (but allow re-registration if rejected)
  if (registrationStatus?.is_registered && registrationStatus.registration_status !== 'rejected') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <Toaster position="top-right" />
        <div className="max-w-2xl mx-auto">
          <Link to={`/event/${eventId}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
            <FiArrowLeft /> Back to Event
          </Link>
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            {registrationStatus.registration_status === 'approved' ? (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiCheckCircle size={32} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-green-800 mb-2">You're Registered!</h2>
                <p className="text-gray-600">Your registration has been approved. See you at the event!</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiClock size={32} className="text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold text-yellow-800 mb-2">Registration Pending</h2>
                <p className="text-gray-600">Your registration is awaiting approval from the organizer.</p>
              </>
            )}
            <p className="text-sm text-gray-500 mt-4">
              Submitted: {new Date(registrationStatus.submitted_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check if registration is closed
  if (!config.is_registration_open) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <Toaster position="top-right" />
        <div className="max-w-2xl mx-auto">
          <Link to={`/event/${eventId}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
            <FiArrowLeft /> Back to Event
          </Link>
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <FiX size={48} className="mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Registration Closed</h2>
            <p className="text-gray-600">
              {config.is_deadline_passed
                ? 'The registration deadline has passed.'
                : 'Registration is currently closed for this event.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const fields = config.form_config?.fields || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4">
      <Toaster position="top-right" />

      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <Link to={`/event/${eventId}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <FiArrowLeft /> Back to Event
        </Link>

        {/* Event Header */}
        {event && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
            {event.banner_url && (
              <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url(${event.banner_url})` }}>
                <div className="h-full bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <h1 className="text-2xl font-bold text-white">{event.title}</h1>
                </div>
              </div>
            )}
            {!event.banner_url && (
              <div className="p-6 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-800">{event.title}</h1>
              </div>
            )}
            <div className="p-4 flex flex-wrap gap-4 text-sm text-gray-600">
              {event.venue_name && (
                <span className="flex items-center gap-1">
                  <FiMapPin /> {event.venue_name}
                </span>
              )}
              {config.registration_deadline && (
                <span className="flex items-center gap-1 text-orange-600">
                  <FiClock /> Deadline: {new Date(config.registration_deadline).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Registration Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            {config.template_type === 'team' ? (
              <FiUsers size={28} className="text-purple-600" />
            ) : (
              <FiUser size={28} className="text-blue-600" />
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {config.template_type === 'team' ? 'Team Registration' : 'Individual Registration'}
              </h2>
              <p className="text-gray-500 text-sm">Fill in the details below to register</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Auto-fill checkbox - only show for individual registration when name/email fields are detected */}
            {config.template_type === 'individual' && (nameFieldId || emailFieldId) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoFillChecked}
                    onChange={(e) => handleAutoFillChange(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-medium text-blue-800">Fill in existing information</span>
                    <p className="text-sm text-blue-600 mt-0.5">
                      Auto-fill your name and email from your account. Leave unchecked if registering for someone else.
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Team Name for team registrations */}
            {config.template_type === 'team' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => {
                    setTeamName(e.target.value);
                    if (errors.team_name) {
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.team_name;
                        return newErrors;
                      });
                    }
                  }}
                  placeholder="Enter your team name"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition ${errors.team_name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'
                    }`}
                />
                {errors.team_name && (
                  <p className="mt-1 text-sm text-red-500">{errors.team_name}</p>
                )}
              </div>
            )}

            {/* Team Size Info */}
            {config.template_type === 'team' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-center gap-3">
                <FiInfo size={20} className="text-purple-600" />
                <div>
                  <p className="text-sm text-purple-800">
                    Team size must be between {config.team_min_size || 2} and {config.team_max_size || 5} members.
                  </p>
                  <p className="text-sm text-purple-600">
                    Currently filled: {getFilledTeamMemberCount()} member(s).
                  </p>
                </div>
              </div>
            )}

            {/* Dynamic Fields */}
            {fields.map(field => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                  {field.memberNumber && (
                    <span className="ml-2 text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                      Member {field.memberNumber}
                    </span>
                  )}
                </label>
                {renderField(field)}
                {errors[field.id] && (
                  <p className="mt-1 text-sm text-red-500">{errors[field.id]}</p>
                )}
              </div>
            ))}

            {/* Payment Info Banner */}
            {paymentConfig?.is_paid_event && paymentConfig.fee_amount > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-200 rounded-lg">
                    <FiDollarSign size={20} className="text-green-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-800">Registration Fee Required</h3>
                    <p className="text-sm text-green-600">Payment will be processed via SSLCommerz</p>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-white/60 rounded-lg p-3">
                  <span className="text-sm text-green-700">
                    {paymentConfig.fee_type === 'per_team' ? 'Per Team Fee' : 'Per Person Fee'}
                  </span>
                  <span className="text-xl font-bold text-green-800">৳{paymentConfig.fee_amount}</span>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  Refund Policy: {
                    paymentConfig.refund_policy === 'full_refund' ? '100% refund on cancellation' :
                      paymentConfig.refund_policy === 'partial_refund' ? `${paymentConfig.refund_percentage}% refund on cancellation` :
                        paymentConfig.refund_policy === 'no_refund' ? 'No refunds' :
                          'Refund decided case-by-case'
                  }
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-4 text-white rounded-xl font-semibold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${paymentConfig?.is_paid_event
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  }`}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    {paymentConfig?.is_paid_event ? 'Processing...' : 'Submitting...'}
                  </>
                ) : paymentConfig?.is_paid_event ? (
                  <>
                    <FiDollarSign size={20} />
                    Pay ৳{paymentConfig.fee_amount} & Register
                  </>
                ) : (
                  <>
                    <FiCheck size={20} />
                    Submit Registration
                  </>
                )}
              </button>
              <p className="text-center text-sm text-gray-500 mt-3">
                {paymentConfig?.is_paid_event
                  ? 'You will be redirected to a secure payment page after submission.'
                  : 'Your registration will be reviewed by the event organizer.'}
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EventRegistrationForm;
