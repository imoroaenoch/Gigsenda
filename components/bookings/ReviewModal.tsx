"use client";

import { useState } from "react";
import { X, Star, MessageSquare, Send } from "lucide-react";
import toast from "react-hot-toast";
import { addReview } from "@/lib/reviews";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    providerId: string;
    providerName: string;
    customerId: string;
    customerName: string;
    customerPhoto?: string;
  };
  onSuccess: () => void;
}

export default function ReviewModal({ isOpen, onClose, booking, onSuccess }: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsUpdating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error("Please add a comment");
      return;
    }

    setIsUpdating(true);
    try {
      await addReview({
        bookingId: booking.id,
        customerId: booking.customerId,
        customerName: booking.customerName,
        customerPhoto: booking.customerPhoto,
        providerId: booking.providerId,
        rating,
        comment: comment.trim(),
      });
      
      toast.success("Review submitted! Thank you.");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Review failed:", error);
      toast.error(error.message || "Failed to submit review");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-300 rounded-[2.5rem] bg-white p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-text">Rate your experience</h2>
          <button 
            onClick={onClose}
            className="rounded-full bg-gray-50 p-2 text-text-light hover:bg-gray-100 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="text-center mb-8">
          <p className="text-sm font-bold text-text-light">How was your service with</p>
          <h3 className="text-lg font-black text-primary mt-1">{booking.providerName}?</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Star Rating */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="group relative transition-all active:scale-90"
              >
                <Star 
                  className={`h-10 w-10 transition-all ${
                    star <= rating 
                      ? "fill-primary text-primary drop-shadow-[0_0_8px_rgba(255,140,0,0.3)]" 
                      : "text-gray-200"
                  }`} 
                />
              </button>
            ))}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-light pl-1">
              <MessageSquare className="h-3 w-3" />
              Your Feedback
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us about the service quality..."
              rows={4}
              className="w-full rounded-2xl bg-gray-50 border border-gray-100 p-4 text-sm font-bold text-text outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-primary py-5 text-sm font-black text-white shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Review
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
