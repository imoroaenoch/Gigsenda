"use client";

interface StatusTimelineProps {
  currentStatus: "pending" | "pending_payment" | "confirmed" | "paid" | "in_progress" | "completed" | "disputed" | "refunded" | "cancelled";
}

const StatusTimeline = ({ currentStatus }: StatusTimelineProps) => {
  const steps = [
    { id: "pending", label: "Booking Requested", icon: "📋" },
    { id: "confirmed", label: "Booking Confirmed", icon: "✅" },
    { id: "paid", label: "Payment Made", icon: "💳" },
    { id: "in_progress", label: "Service In Progress", icon: "🔧" },
    { id: "completed", label: "Completed", icon: "⭐" },
  ];

  const getCurrentStepIndex = () => {
    const statusOrder = ["pending", "confirmed", "paid", "in_progress", "completed"];
    return statusOrder.indexOf(currentStatus);
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200 -z-10"></div>
        <div 
          className="absolute top-6 left-0 h-0.5 bg-gradient-to-r from-orange-400 to-orange-600 -z-10 transition-all duration-500"
          style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
        ></div>
        
        {/* Steps */}
        <div className="flex justify-between relative">
          {steps.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            
            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                {/* Step Circle */}
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    isCompleted
                      ? "bg-gradient-to-r from-orange-400 to-orange-600 text-white shadow-lg"
                      : "bg-gray-200 text-gray-500"
                  } ${isCurrent ? "ring-4 ring-orange-100 scale-110" : ""}`}
                >
                  {step.icon}
                </div>
                
                {/* Step Label */}
                <p
                  className={`text-xs font-medium mt-2 text-center leading-tight ${
                    isCompleted ? "text-orange-600" : "text-gray-500"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StatusTimeline;
