"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getRevenueData } from '@/lib/analytics';
import { useState, useEffect } from 'react';

interface RevenueData {
  date: string;
  amount: number;
}

export default function RevenueChart({ days }: { days: number }) {
  const [data, setData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const revenueData = await getRevenueData(days);
        setData(revenueData);
        
        const total = revenueData.reduce((sum: number, item: any) => sum + item.amount, 0);
        setTotalRevenue(total);
      } catch (error) {
        console.error('Error fetching revenue data:', error);
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
        <h3 className="text-lg font-semibold text-text">Revenue</h3>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">₦{totalRevenue.toLocaleString()}</p>
          <p className="text-xs font-medium text-text-light">Total Revenue</p>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value) => `₦${value.toLocaleString()}`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            formatter={(value: any) => [`₦${value.toLocaleString()}`, 'Revenue']}
          />
          <Line 
            type="monotone" 
            dataKey="amount" 
            stroke="#FF8C00" 
            strokeWidth={2}
            dot={{ fill: '#FF8C00', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
