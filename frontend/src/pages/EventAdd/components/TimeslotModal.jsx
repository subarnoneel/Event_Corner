import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

const TimeslotModal = ({ onClose, onAdd }) => {
  const [slotData, setSlotData] = useState({
    title: '',
    start: '',
    end: ''
  });

  const handleSubmit = () => {
    if (slotData.title && slotData.start && slotData.end) {
      onAdd(slotData);
      onClose();
    } else {
      toast.error('Please fill all fields');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-card p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold text-slate-800 mb-4">Add Timeslot</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={slotData.title}
              onChange={(e) => setSlotData({ ...slotData, title: e.target.value })}
              className="glass-input"
              placeholder="e.g., Opening Ceremony"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Start Time
            </label>
            <input
              type="datetime-local"
              value={slotData.start}
              onChange={(e) => setSlotData({ ...slotData, start: e.target.value })}
              className="glass-input"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              End Time
            </label>
            <input
              type="datetime-local"
              value={slotData.end}
              onChange={(e) => setSlotData({ ...slotData, end: e.target.value })}
              className="glass-input"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Add Timeslot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeslotModal;
