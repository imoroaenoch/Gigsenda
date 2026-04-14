"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Star, MapPin, CheckCircle2, User } from "lucide-react";

interface ProviderCardProps {
  provider: {
    id: string;
    name: string;
    serviceTitle: string;
    category: string;
    hourlyRate: number;
    city: string;
    rating?: number;
    reviewCount?: number;
    photoURL?: string;
    isApproved?: boolean;
    availability?: string[];
  };
}

export default function ProviderCard({ provider }: ProviderCardProps) {
  const router = useRouter();

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${
          i < Math.floor(rating)
            ? "fill-yellow-400 text-yellow-400"
            : "text-gray-300"
        }`}
      />
    ));
  };

  return (
    <div 
      className="group relative overflow-hidden rounded-[1.5rem] bg-white p-3 shadow-sm border border-gray-100 active:scale-[0.98] transition-all cursor-pointer"
      onClick={() => router.push(`/provider/${provider.id}`)}
    >
      <div className="flex items-start gap-3">
        {/* Profile Photo */}
        <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100 border border-gray-100 shadow-sm">
          {provider.photoURL ? (
            <Image 
              src={provider.photoURL} 
              alt={provider.name} 
              fill 
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-400">
              <User className="h-12 w-12" />
            </div>
          )}
          {provider.isApproved && (
            <div className="absolute -bottom-1 -right-1 rounded-full bg-white p-0.5">
              <CheckCircle2 className="h-5 w-5 fill-primary text-white" />
            </div>
          )}
        </div>

        {/* Provider Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black text-text mb-0.5">
            {provider.name}
          </h3>
          
          <p className="text-[10px] font-bold text-text-light mb-1">
            {provider.serviceTitle || provider.category}
          </p>

          {/* Rating Stars */}
          <div className="flex items-center gap-0.5 mb-1">
            {renderStars(provider.rating || 5.0)}
            <span className="text-[9px] font-black text-text ml-1">
              {provider.rating?.toFixed(1) || "5.0"}
            </span>
          </div>

          {/* Availability */}
          {provider.availability && provider.availability.length > 0 && (
            <div className="flex items-center gap-1 text-text-light mb-1">
              <span className="text-[7px] font-bold uppercase tracking-wider text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">
                {provider.availability.length} days/wk
              </span>
            </div>
          )}

          {/* Location */}
          <div className="flex items-center gap-0.5 text-text-light">
            <MapPin className="h-2.5 w-2.5" />
            <span className="text-[8px] font-bold uppercase tracking-wider">{provider.city || "Lagos"}</span>
          </div>

          {/* Button and Price in line */}
          <div className="flex items-center gap-2 mt-3">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/provider/${provider.id}`);
              }}
              className="w-20 rounded-lg bg-primary py-1.5 text-[8px] font-black text-white shadow-sm shadow-primary/20 hover:bg-primary-dark transition-all"
            >
              View
            </button>
            <div>
              <span className="text-[10px] font-black text-primary">₦{provider.hourlyRate?.toLocaleString()}</span>
              <span className="text-[8px] font-bold text-text-light">/service</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
