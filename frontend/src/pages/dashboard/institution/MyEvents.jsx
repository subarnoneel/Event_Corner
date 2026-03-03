import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../../providers/AuthContext';
import { API_ENDPOINTS } from '../../../config/api';
import { FiCalendar, FiMapPin, FiClock, FiEdit, FiXCircle, FiMoreVertical } from 'react-icons/fi';
import { Toaster } from 'react-hot-toast';
import CancelEventModal from '../../../components/CancelEventModal';

const MyEvents = () => {
  const { user, userData } = useContext(AuthContext);
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelModal, setCancelModal] = useState({ open: false, eventId: null, eventTitle: '' });
  const [openMenuId, setOpenMenuId] = useState(null);

  // Close kebab menu when clicking outside
  useEffect(() => {
    if (openMenuId !== null) {
      const handleClickOutside = () => setOpenMenuId(null);
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  useEffect(() => {
    fetchMyEvents();
  }, [user]);

  const fetchMyEvents = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Build query parameters - fetch events created by this specific user
      const params = new URLSearchParams();
      if (userData?.user_id || user.uid) {
        params.append('created_by', userData?.user_id || user.uid);
      }
      params.append('limit', '100'); // Fetch more events

      const url = `${API_ENDPOINTS.EVENTS}${params.toString() ? '?' + params.toString() : ''}`;
      console.log('Fetching events from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${user.token || user.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      console.log('API Response:', data);

      // Check if the response has the events array
      if (data.success && Array.isArray(data.events)) {
        setEvents(data.events);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-600">Error loading events: {error}</p>
        <button
          onClick={fetchMyEvents}
          className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Events</h2>
          <p className="text-gray-600 mt-1">Events you have created</p>
        </div>
        <div className="text-sm text-gray-600">
          Total Events: <span className="font-bold text-blue-600">{events.length}</span>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCalendar size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Events Yet</h3>
          <p className="text-gray-600 mb-6">You haven't created any events yet.</p>
          <a
            href="/events/create"
            className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            Create Your First Event
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div
              key={event.event_id}
              onClick={() => navigate(`/event/${event.id || event.event_id}`)}
              className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer"
            >
              {/* Event Image */}
              <div className="h-48 bg-gradient-to-br from-blue-400 to-blue-600">
                {event.banner_url || event.thumbnail_url ? (
                  <img
                    src={event.banner_url || event.thumbnail_url}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <FiCalendar size={48} />
                  </div>
                )}
              </div>

              {/* Event Details */}
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                  {event.title || 'Untitled Event'}
                </h3>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <FiClock className="mr-2 flex-shrink-0" size={16} />
                    <span>{formatDate(event.created_at)}</span>
                  </div>

                  {event.venue_name && (
                    <div className="flex items-center text-sm text-gray-600">
                      <FiMapPin className="mr-2 flex-shrink-0" size={16} />
                      <span className="line-clamp-1">{event.venue_name}</span>
                    </div>
                  )}

                  {/* Status Badges - Side by Side */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {event.status && (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${event.status === 'published'
                        ? 'bg-green-100 text-green-800'
                        : event.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : event.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </span>
                    )}

                    {event.approval_status && (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${event.approval_status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : event.approval_status === 'pending_approval'
                          ? 'bg-amber-100 text-amber-800'
                          : event.approval_status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                        {event.approval_status === 'pending_approval'
                          ? '⏳ Pending Approval'
                          : event.approval_status === 'approved'
                            ? '✅ Approved'
                            : event.approval_status === 'rejected'
                              ? '❌ Rejected'
                              : event.approval_status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Icons */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/event/${event.id || event.event_id}`); }}
                      className="group relative p-2 rounded-full hover:bg-blue-50 transition-colors"
                    >
                      <FiEdit size={18} className="text-blue-600" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Edit Event
                      </span>
                    </button>
                  </div>
                  {event.status !== 'cancelled' && (
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setOpenMenuId(openMenuId === (event.id || event.event_id) ? null : (event.id || event.event_id)); }}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <FiMoreVertical size={18} className="text-gray-500" />
                      </button>
                      {openMenuId === (event.id || event.event_id) && (
                        <div className="absolute right-0 bottom-full mb-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setCancelModal({ open: true, eventId: event.id || event.event_id, eventTitle: event.title }); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <FiXCircle size={16} />
                            Cancel Event
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Toaster position="top-right" />
      <CancelEventModal
        isOpen={cancelModal.open}
        eventId={cancelModal.eventId}
        eventTitle={cancelModal.eventTitle}
        userId={userData?.user_id}
        onClose={() => setCancelModal({ open: false, eventId: null, eventTitle: '' })}
        onCancelled={fetchMyEvents}
      />
    </div>
  );
};

export default MyEvents;
