import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaUser, FaBuilding, FaUserTie } from 'react-icons/fa';
import Lottie from 'lottie-react';
import loginAnimation from '../assets/ladylog.json';
import AuthContext from '../providers/AuthContext';
import SearchableInstitution from '../components/SearchableInstitution';

const Register = () => {
  const { register, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    institution: '',
    institution_id: null,
    institution_name: ''
  });

  const roles = [
    { id: 'participant', label: 'Participant', icon: FaUser, color: 'from-purple-500 to-pink-500' },
    { id: 'organizer', label: 'Organizer', icon: FaUserTie, color: 'from-green-500 to-emerald-500' },
    { id: 'institution', label: 'Institution', icon: FaBuilding, color: 'from-blue-500 to-cyan-500' }
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
  };

  const handleInstitutionSelect = (institutionData) => {
    // Store both institution_id and institution name
    setFormData({
      ...formData,
      institution_id: institutionData.id,
      institution_name: institutionData.name
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    
    // Validate institution selection for organizers
    if (selectedRole === 'organizer' && !formData.institution_id) {
      alert('Please select an institution!');
      return;
    }
    
    // Prepare registration data
    const registrationData = {
      role: selectedRole,
      fullName: formData.fullName,
      username: formData.username,
      email: formData.email,
      password: formData.password,
    };
    
    // Add role-specific data
    if (selectedRole === 'organizer') {
      registrationData.institution_id = formData.institution_id;
    } else if (selectedRole === 'participant') {
      registrationData.institution = formData.institution;
    }
    
    // Call the register function from AuthProvider
    const result = await register(
      formData.email,
      formData.password,
      registrationData
    );
    
    // If registration successful, redirect to login
    if (result.success) {
      setTimeout(() => {
        navigate('/login');
      }, 1500); // Wait for toast to show
    }
  };

  const getRoleButtonLabel = () => {
    if (selectedRole === 'participant') return 'Register as Participant';
    if (selectedRole === 'organizer') return 'Register as Organizer';
    if (selectedRole === 'institution') return 'Register as Institution';
    return 'Register';
  };

  const getRoleButtonColor = () => {
    if (selectedRole === 'participant') return 'from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700';
    if (selectedRole === 'organizer') return 'from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700';
    if (selectedRole === 'institution') return 'from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700';
    return 'from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="flex w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Left Side - Illustration */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 items-center justify-center p-12 relative overflow-hidden">
          <div className="w-full max-w-md">
            <Lottie 
              animationData={loginAnimation} 
              loop={true}
              className="w-full h-full"
            />
          </div>
          <div className="absolute bottom-12 left-12 right-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-3">Join Event Lagbe</h2>
            <p className="text-white/90">Create your account and start organizing or participating in amazing events</p>
          </div>
        </div>

        {/* Right Side - Registration Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col overflow-y-auto">
          <div className="max-w-md mx-auto w-full my-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Create Account</h2>
            <p className="text-gray-500 mb-6">Choose your role and join our community</p>

            {/* Role Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Your Role
              </label>
              <div className="grid grid-cols-3 gap-3">
                {roles.map((role) => {
                  const Icon = role.icon;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleRoleSelect(role.id)}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                        selectedRole === role.id
                          ? 'border-transparent bg-gradient-to-br ' + role.color + ' text-white shadow-lg scale-105'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <Icon className="text-2xl mb-2" />
                      <span className="text-xs font-medium text-center">{role.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Registration Form - Only show if role is selected */}
            {selectedRole && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>

                {/* Username */}
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Choose a username"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Institution Field - Only for Organizer role */}
                {selectedRole === 'organizer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Institution Name <span className="text-red-500">*</span>
                    </label>
                    <SearchableInstitution
                      value={formData.institution_name}
                      onSelect={handleInstitutionSelect}
                      selectedInstitutionId={formData.institution_id}
                      placeholder="Start typing institution name..."
                    />
                  </div>
                )}
                
                {/* Institution Field - Only for Participant role */}
                {selectedRole === 'participant' && (
                  <div>
                    <label htmlFor="institution" className="block text-sm font-medium text-gray-700 mb-2">
                      Institution Name (Optional)
                    </label>
                    <input
                      type="text"
                      id="institution"
                      name="institution"
                      value={formData.institution}
                      onChange={handleChange}
                      placeholder="Enter your institution name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                )}

                {/* Register Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full bg-gradient-to-r ${getRoleButtonColor()} text-white py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 mt-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? 'Registering...' : getRoleButtonLabel()}
                </button>
              </form>
            )}

            {/* Sign In Link */}
            <p className="text-center mt-6 text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
