import React, { useState, useEffect, useContext } from 'react';
import { FiCalendar, FiMapPin, FiClock, FiExternalLink, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../../providers/AuthContext';
import { API_ENDPOINTS } from '../../../config/api';

const RegisteredEvents = () => {
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, upcoming, past
  const [statusFilter, setStatusFilter] = useState('all'); // all, approved, pending, rejected
  const { userData } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (userData?.user_id) {
      fetchRegisteredEvents();
    }
  }, [userData, statusFilter]);

  const fetchRegisteredEvents = async () => {
    if (!userData?.user_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Build URL with status filter
      let url = API_ENDPOINTS.USER_REGISTERED_EVENTS(userData.user_id);
      if (statusFilter !== 'all') {
        url += `?status=${statusFilter}`;
      }
      
      console.log('Fetching registered events from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to fetch registered events');
      }

      const result = await response.json();
      console.log('Registered events response:', result);
      
      if (result.success) {
        setRegisteredEvents(result.registrations || []);
      } else {
        throw new Error(result.error || 'Failed to load events');
      }
    } catch (error) {
      console.error('Error fetching registered events:', error);
      toast.error('Failed to load registered events');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredEvents = () => {
    const now = new Date();
    if (filter === 'upcoming') {
      return registeredEvents.filter(event => {
        const eventDate = new Date(event.event_start_date || event.start_date);
        return eventDate >= now;
      });
    } else if (filter === 'past') {
      return registeredEvents.filter(event => {
        const eventDate = new Date(event.event_start_date || event.start_date);
        return eventDate < now;
      });
    }
    return registeredEvents;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      approved: { color: 'bg-green-100 text-green-700', label: 'Approved' },
      pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
      rejected: { color: 'bg-red-100 text-red-700', label: 'Rejected' },
      cancelled: { color: 'bg-gray-100 text-gray-700', label: 'Cancelled' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const filteredEvents = getFilteredEvents();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your registered events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">My Registered Events</h2>
          <p className="text-gray-600 mt-1">Track and manage your event registrations</p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Status:</label>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              statusFilter === 'all'
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Registrations
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              statusFilter === 'approved'
                ? 'bg-green-600 text-white'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            ✓ Approved
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              statusFilter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
            }`}
          >
            ⏳ Pending
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              statusFilter === 'rejected'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            ✗ Rejected
          </button>
        </div>
      </div>

      {/* Time Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`px-6 py-3 font-semibold transition-all ${
            filter === 'all'
              ? 'border-b-2 border-teal-600 text-teal-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All Events ({registeredEvents.length})
        </button>
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-6 py-3 font-semibold transition-all ${
            filter === 'upcoming'
              ? 'border-b-2 border-teal-600 text-teal-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setFilter('past')}
          className={`px-6 py-3 font-semibold transition-all ${
            filter === 'past'
              ? 'border-b-2 border-teal-600 text-teal-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Past
        </button>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
          <FiAlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Events Found</h3>
          <p className="text-gray-600 mb-6">
            {filter === 'all' 
              ? "You haven't registered for any events yet."
              : `You have no ${filter} registered events.`}
          </p>
          <button
            onClick={() => navigate('/explore')}
            className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors"
          >
            Explore Events
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredEvents.map((registration) => (
            <div
              key={registration.id}
              className="bg-white rounded-2xl border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden"
            >
              <div className="flex flex-col md:flex-row">
                {/* Event Image */}
                <div className="md:w-64 h-48 md:h-auto bg-gradient-to-br from-teal-400 to-blue-500 flex-shrink-0">
                  {registration.banner_url || registration.thumbnail_url ? (
                    <img
                      src={registration.banner_url || registration.thumbnail_url}
                      alt={registration.event_title || registration.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <FiCalendar size={48} />
                    </div>
                  )}
                </div>

                {/* Event Details */}
                <div className="flex-1 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {registration.event_title || registration.title || 'Untitled Event'}
                      </h3>
                      <div className="flex gap-2 mb-3">
                        {getStatusBadge(registration.status)}
                        {registration.category && (
                          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                            {registration.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <FiCalendar className="text-teal-600" />
                      <span className="text-sm">
                        {formatDate(registration.event_start_date || registration.start_date)}
                      </span>
                    </div>
                    {(registration.venue_name || registration.venue_type) && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <FiMapPin className="text-teal-600" />
                        <span className="text-sm">
                          {registration.venue_name || registration.venue_type}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-600">
                      <FiClock className="text-teal-600" />
                      <span className="text-sm">
                        Registered on {formatDate(registration.registered_at)}
                      </span>
                    </div>
                  </div>

                  {registration.status === 'pending' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-yellow-800">
                        <FiAlertCircle className="inline mr-2" />
                        Your registration is pending approval from the organizer.
                      </p>
                    </div>
                  )}

                  {registration.status === 'rejected' && registration.rejection_reason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-red-800">
                        <strong>Rejection Reason:</strong> {registration.rejection_reason}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => navigate(`/event/${registration.event_id}`)}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors flex items-center gap-2"
                    >
                      <FiExternalLink size={16} />
                      View Event
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RegisteredEvents;
