import React, { useState, useEffect, useContext, useCallback } from 'react';
import { FiCalendar, FiCheckCircle, FiBookmark } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../../providers/AuthContext';
import { API_ENDPOINTS } from '../../../config/api';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

// Color palette for events
const EVENT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#06B6D4', // Cyan
];

const Calendar = () => {
  const [viewMode, setViewMode] = useState('registered'); // 'registered' or 'all'
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [bookmarkedEvents, setBookmarkedEvents] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [eventColorMap, setEventColorMap] = useState({});
  const [loading, setLoading] = useState(true);
  const { userData } = useContext(AuthContext);
  const navigate = useNavigate();

  const fetchRegisteredEvents = useCallback(async () => {
    try {
      const response = await fetch(
        API_ENDPOINTS.USER_REGISTERED_EVENTS(userData?.user_id) + '?status=approved'
      );
      
      if (!response.ok) throw new Error('Failed to fetch registered events');
      
      const result = await response.json();
      setRegisteredEvents(result.registrations || []);
    } catch (error) {
      console.error('Error fetching registered events:', error);
      toast.error('Failed to load registered events');
    }
  }, [userData?.user_id]);

  const fetchBookmarkedEvents = useCallback(async () => {
    try {
      const response = await fetch(API_ENDPOINTS.USER_BOOKMARKS(userData?.user_id));
      
      if (!response.ok) throw new Error('Failed to fetch bookmarked events');
      
      const result = await response.json();
      setBookmarkedEvents(result.bookmarks || []);
    } catch (error) {
      console.error('Error fetching bookmarked events:', error);
      toast.error('Failed to load bookmarked events');
    }
  }, [userData?.user_id]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchRegisteredEvents(), fetchBookmarkedEvents()]);
      setLoading(false);
    };
    fetchData();
  }, [fetchRegisteredEvents, fetchBookmarkedEvents]);

  // Convert events to calendar format with color coding
  useEffect(() => {
    const colorMap = {};
    let colorIndex = 0;
    const allEvents = [];

    // Process registered events
    registeredEvents.forEach((event) => {
      if (!colorMap[event.event_id]) {
        colorMap[event.event_id] = {
          color: EVENT_COLORS[colorIndex % EVENT_COLORS.length],
          title: event.title,
          type: 'registered'
        };
        colorIndex++;
      }

      if (event.timeslots && event.timeslots.length > 0) {
        event.timeslots.forEach((slot, idx) => {
          allEvents.push({
            id: `reg-${event.event_id}-${idx}`,
            title: event.title,
            start: slot.start_time,
            end: slot.end_time,
            backgroundColor: colorMap[event.event_id].color,
            borderColor: colorMap[event.event_id].color,
            extendedProps: {
              eventId: event.event_id,
              venue: event.venue_name,
              status: event.registration_status,
              type: 'registered'
            }
          });
        });
      }
    });

    // Process bookmarked events (only if viewMode is 'all')
    if (viewMode === 'all') {
      bookmarkedEvents.forEach((event) => {
        if (!colorMap[event.event_id]) {
          colorMap[event.event_id] = {
            color: EVENT_COLORS[colorIndex % EVENT_COLORS.length],
            title: event.title,
            type: 'bookmarked'
          };
          colorIndex++;
        }

        // Fetch timeslots for bookmarked events from the event details
        // For now, we'll create a placeholder - in production, you'd fetch full event details
        if (event.timeslots && event.timeslots.length > 0) {
          event.timeslots.forEach((slot, idx) => {
            allEvents.push({
              id: `book-${event.event_id}-${idx}`,
              title: `📌 ${event.title}`,
              start: slot.start_time,
              end: slot.end_time,
              backgroundColor: colorMap[event.event_id].color,
              borderColor: colorMap[event.event_id].color,
              extendedProps: {
                eventId: event.event_id,
                venue: event.venue_name,
                type: 'bookmarked'
              }
            });
          });
        }
      });
    }

    setEventColorMap(colorMap);
    setCalendarEvents(allEvents);
  }, [registeredEvents, bookmarkedEvents, viewMode]);

  const handleEventClick = (clickInfo) => {
    const eventId = clickInfo.event.extendedProps.eventId;
    navigate(`/event/${eventId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-blue-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <FiCalendar size={32} />
          <h2 className="text-3xl font-bold">Event Calendar</h2>
        </div>
        <p className="text-teal-50">View your events in calendar format with color-coded timeslots</p>
      </div>

      {/* View Mode Selector */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Calendar View</h3>
        <div className="flex gap-4">
          <button
            onClick={() => setViewMode('registered')}
            className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
              viewMode === 'registered'
                ? 'bg-teal-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FiCheckCircle size={20} />
            Registered Events Only
            <span className="ml-2 px-2 py-1 bg-white/20 rounded-full text-xs">
              {registeredEvents.length}
            </span>
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
              viewMode === 'all'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FiBookmark size={20} />
            All Events (Registered + Bookmarked)
            <span className="ml-2 px-2 py-1 bg-white/20 rounded-full text-xs">
              {registeredEvents.length + bookmarkedEvents.length}
            </span>
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="calendar-container">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={calendarEvents}
            eventClick={handleEventClick}
            height="700px"
            eventDisplay="block"
            dayMaxEvents={true}
            weekends={true}
            slotMinTime="06:00:00"
            slotMaxTime="23:00:00"
            allDaySlot={false}
            nowIndicator={true}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Event Rooster</h3>
        
        {Object.keys(eventColorMap).length === 0 ? (
          <p className="text-gray-500 text-center py-4">No events to display</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(eventColorMap).map(([eventId, info]) => (
              <div
                key={eventId}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => navigate(`/event/${eventId}`)}
              >
                <div
                  className="w-6 h-6 rounded flex-shrink-0"
                  style={{ backgroundColor: info.color }}
                ></div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">
                    {info.type === 'bookmarked' && '📌 '}
                    {info.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {info.type === 'registered' ? (
                      <span className="flex items-center gap-1">
                        <FiCheckCircle size={12} />
                        Registered
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <FiBookmark size={12} />
                        Bookmarked
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CSS for FullCalendar */}
      <style>{`
        .calendar-container {
          background: white;
        }
        .fc {
          font-family: inherit;
        }
        .fc-theme-standard .fc-scrollgrid {
          border-color: #e5e7eb;
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border-color: #e5e7eb;
        }
        .fc .fc-button-primary {
          background-color: #0d9488;
          border-color: #0d9488;
        }
        .fc .fc-button-primary:hover {
          background-color: #0f766e;
          border-color: #0f766e;
        }
        .fc .fc-button-primary:not(:disabled).fc-button-active {
          background-color: #0f766e;
          border-color: #0f766e;
        }
        .fc-event {
          cursor: pointer;
        }
        .fc-event:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
};

export default Calendar;
