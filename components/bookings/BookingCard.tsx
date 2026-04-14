"use client";

import { useRouter } from "next/navigation";

interface BookingCardProps {
  serviceName: string;
  category: string;
  date: string;
  time: string;
  location: string;
  amount: number;
  referenceNumber: string;
}

const BookingCard = ({
  serviceName,
  category,
  date,
  time,
  location,
  amount,
  referenceNumber,
}: BookingCardProps) => {
  const router = useRouter();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="space-y-3">
        {/* Service Name and Category */}
        <div>
          <h3 className="text-lg text-gray-900">{serviceName}</h3>
          <p className="text-sm text-gray-500">{category}</p>
        </div>

        {/* Date and Time */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm text-gray-600">{date}</span>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-gray-600">{time}</span>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-start space-x-2">
          <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm text-gray-600 flex-1">{location}</span>
        </div>

        {/* Amount and Reference */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-500">Amount</p>
            <p className="text-lg text-orange-600">{formatCurrency(amount)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Reference</p>
            <p className="text-sm font-mono text-gray-700">{referenceNumber}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingCard;
