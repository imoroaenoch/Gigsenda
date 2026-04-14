"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getProvidersData } from '@/lib/analytics';
import { useState, useEffect } from 'react';

interface ProvidersData {
  week: string;
  providers: number;
}

export default function ProvidersChart({ weeks }: { weeks: number }) {
  const [data, setData] = useState<ProvidersData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalProviders, setTotalProviders] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const providersData = await getProvidersData(weeks);
        setData(providersData);
        
        const total = providersData.reduce((sum: number, item: any) => sum + item.providers, 0);
        setTotalProviders(total);
      } catch (error) {
        console.error('Error fetching providers data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [weeks]);

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
        <h3 className="text-lg font-semibold text-text">New Providers</h3>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{totalProviders}</p>
          <p className="text-xs font-medium text-text-light">Total New Providers</p>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="week" 
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
            formatter={(value: any) => [value, 'New Providers']}
          />
          <Bar 
            dataKey="providers" 
            fill="#FF8C00"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
