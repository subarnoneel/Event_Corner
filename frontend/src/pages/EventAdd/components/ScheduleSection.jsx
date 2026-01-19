import React, { useState } from 'react';
import { FiCalendar, FiClock } from 'react-icons/fi';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import TimeslotModal from './TimeslotModal';

const ScheduleSection = ({events, addTimeslot, removeTimeslot, userTimezone }) => {
  const [showTimeslotModal, setShowTimeslotModal] = useState(false);
  const [showTimezoneInfo, setShowTimezoneInfo] = useState(false);

  const handleDateClick = () => {
    setShowTimeslotModal(true);
  };

  const handleEventClick = (clickInfo) => {
    if (window.confirm(`Delete timeslot '${clickInfo.event.title}'?`)) {
      removeTimeslot(clickInfo.event.id);
    }
  };

  const handleAddTimeslot = (slotData) => {
    addTimeslot(slotData);
    setShowTimeslotModal(false);
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center">
          <FiCalendar className="mr-2 text-blue-600" />
          Schedule & Timeslots
        </h2>
        <button
          type="button"
          onClick={() => setShowTimezoneInfo(!showTimezoneInfo)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          <FiClock className="inline mr-1" />
          Timezone: {userTimezone}
        </button>
      </div>

      {showTimezoneInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-sm text-blue-800">
          All times will be stored in {userTimezone} timezone
        </div>
      )}

      <div className="space-y-4">
        <div className="calendar-container">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={events}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            weekends={true}
            height="500px"
          />
        </div>

        {events.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center">
              <FiClock className="mr-2 text-blue-600" />
              Added Timeslots ({events.length})
            </h3>
            <div className="space-y-2">
              {events.map((event, index) => (
                <div key={event.id || index} className="glass-input p-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-800">{event.title}</h4>
                    <p className="text-sm text-slate-600 mt-1">
                      {new Date(event.start).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                      {' → '}
                      {new Date(event.end).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTimeslot(event.id)}
                    className="text-red-600 hover:text-red-800 font-semibold text-sm px-3 py-1 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {showTimeslotModal && (
          <TimeslotModal
            onClose={() => setShowTimeslotModal(false)}
            onAdd={handleAddTimeslot}
          />
        )}
      </div>
    </div>
  );
};

export default ScheduleSection;
