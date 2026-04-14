"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getBookingsData } from '@/lib/analytics';
import { useState, useEffect } from 'react';

interface BookingsData {
  date: string;
  bookings: number;
}

export default function BookingsChart({ days }: { days: number }) {
  const [data, setData] = useState<BookingsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBookings, setTotalBookings] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const bookingsData = await getBookingsData(days);
        setData(bookingsData);
        
        const total = bookingsData.reduce((sum: number, item: any) => sum + item.bookings, 0);
        setTotalBookings(total);
      } catch (error) {
        console.error('Error fetching bookings data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [days]);

  if (loading) {
    return (
      <div className="h-80 flex items-center justify-center bg-white rounded-2xl border border-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-text">Bookings</h3>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{totalBookings}</p>
          <p className="text-xs font-medium text-text-light">Total Bookings</p>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            formatter={(value: any) => [value, 'Bookings']}
          />
          <Bar 
            dataKey="bookings" 
            fill="#FF8C00"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
