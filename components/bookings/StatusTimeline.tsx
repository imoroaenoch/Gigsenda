"use client";

interface StatusTimelineProps {
  currentStatus: string;
  viewerType?: "customer" | "provider";
}

const StatusTimeline = ({ currentStatus, viewerType = "customer" }: StatusTimelineProps) => {
  const steps = [
    { id: "pending",     label: "Requested",                                               icon: "📋" },
    { id: "accepted",    label: viewerType === "provider" ? "Awaiting Payment" : "Awaiting Payment", icon: "🟡" },
    { id: "paid",        label: viewerType === "provider" ? "Payment Received" : "Payment Confirmed", icon: "�" },
    { id: "in_progress", label: "In Progress",                                              icon: "�" },
    { id: "completed",   label: "Completed",                                                icon: "✅" },
  ];

  const getCurrentStepIndex = () => {
    const statusOrder = ["pending", "accepted", "paid", "in_progress", "completed"];
    // Map legacy/alternate statuses onto the order
    const mapped: Record<string, string> = {
      confirmed:       "paid",        // legacy: confirmed = payment done
      upcoming:        "paid",        // legacy: upcoming = payment done
      pending_payment: "accepted",    // legacy: pending_payment = accepted, awaiting payment
      rejected:        "pending",
      cancelled:       "pending",
      disputed:        "in_progress",
      refunded:        "completed",
    };
    const s = mapped[currentStatus] ?? currentStatus;
    return statusOrder.indexOf(s);
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
