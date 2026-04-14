"use client";

import { useState } from "react";
import { Calendar, Clock, X, Plus } from "lucide-react";

interface TimeSlot {
  start: string;
  end: string;
}

interface DayAvailability {
  available: boolean;
  timeSlots: TimeSlot[];
}

interface AvailabilityCalendarProps {
  initialAvailability?: Record<string, DayAvailability>;
  onSave: (availability: Record<string, DayAvailability>) => void;
  loading?: boolean;
}

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { start: "09:00", end: "17:00" }
];

export default function AvailabilityCalendar({ 
  initialAvailability = {}, 
  onSave, 
  loading = false 
}: AvailabilityCalendarProps) {
  const [availability, setAvailability] = useState<Record<string, DayAvailability>>(
    DAYS_OF_WEEK.reduce((acc, day) => ({
      ...acc,
      [day.key]: initialAvailability[day.key] || {
        available: false,
        timeSlots: DEFAULT_TIME_SLOTS
      }
    }), {})
  );

  const toggleDayAvailability = (dayKey: string) => {
    setAvailability(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        available: !prev[dayKey].available
      }
    }));
  };

  const updateTimeSlot = (dayKey: string, slotIndex: number, field: 'start' | 'end', value: string) => {
    setAvailability(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        timeSlots: prev[dayKey].timeSlots.map((slot, index) =>
          index === slotIndex ? { ...slot, [field]: value } : slot
        )
      }
    }));
  };

  const addTimeSlot = (dayKey: string) => {
    setAvailability(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        timeSlots: [...prev[dayKey].timeSlots, { start: "09:00", end: "17:00" }]
      }
    }));
  };

  const removeTimeSlot = (dayKey: string, slotIndex: number) => {
    setAvailability(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        timeSlots: prev[dayKey].timeSlots.filter((_, index) => index !== slotIndex)
      }
    }));
  };

  const handleSave = () => {
    onSave(availability);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="h-5 w-5 text-orange-500" />
        <h2 className="text-lg font-semibold text-gray-900">Weekly Availability</h2>
      </div>

      <div className="space-y-4">
        {DAYS_OF_WEEK.map((day) => {
          const dayAvailability = availability[day.key];
          
          return (
            <div
              key={day.key}
              className={`border rounded-xl p-4 transition-all ${
                dayAvailability.available
                  ? "border-orange-200 bg-orange-50/50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleDayAvailability(day.key)}
                    className={`w-5 h-5 rounded-full border-2 transition-all ${
                      dayAvailability.available
                        ? "bg-orange-500 border-orange-500"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    {dayAvailability.available && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </button>
                  <span className={`font-medium ${
                    dayAvailability.available ? "text-gray-900" : "text-gray-400"
                  }`}>
                    {day.label}
                  </span>
                </div>
                
                {dayAvailability.available && (
                  <div className="flex items-center gap-2 text-sm text-orange-600">
                    <Clock className="h-4 w-4" />
                    <span>{dayAvailability.timeSlots.length} slot{dayAvailability.timeSlots.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>

              {dayAvailability.available && (
                <div className="space-y-2 ml-8">
                  {dayAvailability.timeSlots.map((slot, slotIndex) => (
                    <div key={slotIndex} className="flex items-center gap-2">
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) => updateTimeSlot(day.key, slotIndex, 'start', e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                        <span className="text-gray-400 text-sm">to</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) => updateTimeSlot(day.key, slotIndex, 'end', e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                      </div>
                      
                      {dayAvailability.timeSlots.length > 1 && (
                        <button
                          onClick={() => removeTimeSlot(day.key, slotIndex)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  <button
                    onClick={() => addTimeSlot(day.key)}
                    className="flex items-center gap-2 px-3 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    Add time slot
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full mt-6 bg-orange-500 text-white py-3 px-4 rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Saving...
          </>
        ) : (
          <>
            <Calendar className="h-4 w-4" />
            Save Availability
          </>
        )}
      </button>
    </div>
  );
}
