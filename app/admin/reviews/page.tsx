"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { Star, Trash2, Search, MessageSquare, User, Briefcase } from "lucide-react";
import { getAllReviews, deleteReview, Review } from "@/lib/reviews";
import { format } from "date-fns";
import toast from "react-hot-toast";
import Image from "next/image";

export default function AdminReviewsPage() {
  const [reviews, setReviews]     = useState<Review[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setReviews(await getAllReviews());
    } catch {
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteReview(id);
      setReviews(prev => prev.filter(r => r.id !== id));
      toast.success("Review deleted and provider rating updated");
    } catch {
      toast.error("Failed to delete review");
    } finally {
      setDeleting(null);
      setConfirmId(null);
    }
  };

  const filtered = reviews.filter(r =>
    r.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    r.comment?.toLowerCase().includes(search.toLowerCase()) ||
    r.providerId?.toLowerCase().includes(search.toLowerCase())
  );

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  const starCounts = [5, 4, 3, 2, 1].map(s => ({
    star: s,
    count: reviews.filter(r => r.rating === s).length,
    pct: reviews.length ? Math.round((reviews.filter(r => r.rating === s).length / reviews.length) * 100) : 0,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-text">Reviews</h1>
          <p className="text-sm font-medium text-text-light mt-1 uppercase tracking-wider">
            Manage customer reviews and ratings
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm min-w-[280px]">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by customer, comment..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-text outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
          <p className="text-[10px] font-medium text-text-light uppercase tracking-widest mb-1">Total Reviews</p>
          <h3 className="text-3xl font-medium text-text">{reviews.length}</h3>
        </div>
        <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
          <p className="text-[10px] font-medium text-text-light uppercase tracking-widest mb-1">Avg Rating</p>
          <div className="flex items-center gap-2">
            <h3 className="text-3xl font-medium text-text">{avgRating}</h3>
            <Star className="h-5 w-5 fill-primary text-primary" />
          </div>
        </div>
        <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
          <p className="text-[10px] font-medium text-text-light uppercase tracking-widest mb-1">5-Star Reviews</p>
          <h3 className="text-3xl font-medium text-green-500">{reviews.filter(r => r.rating === 5).length}</h3>
        </div>
        <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
          <p className="text-[10px] font-medium text-text-light uppercase tracking-widest mb-1">Low Ratings (≤2)</p>
          <h3 className="text-3xl font-medium text-red-500">{reviews.filter(r => r.rating <= 2).length}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Rating breakdown */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
          <h2 className="text-base font-medium text-text mb-6">Rating Breakdown</h2>
          <div className="space-y-4">
            {starCounts.map(({ star, count, pct }) => (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-12 shrink-0">
                  <span className="text-xs font-medium text-text">{star}</span>
                  <Star className="h-3 w-3 fill-primary text-primary" />
                </div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-text-light w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews list */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] p-12 border border-gray-100 shadow-sm text-center">
              <MessageSquare className="h-12 w-12 text-gray-200 mx-auto mb-4" />
              <h3 className="text-base font-medium text-text">No reviews found</h3>
              <p className="text-sm font-medium text-text-light mt-1">
                {search ? "Try a different search" : "Reviews will appear here once customers submit them"}
              </p>
            </div>
          ) : (
            filtered.map(review => (
              <div key={review.id} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  {/* Reviewer info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {review.customerPhoto ? (
                        <Image src={review.customerPhoto} alt={review.customerName} width={40} height={40} className="object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text truncate">{review.customerName}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Briefcase className="h-3 w-3 text-text-light" />
                        <p className="text-[10px] font-medium text-text-light truncate">
                          Provider ID: {review.providerId.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stars + date + delete */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star
                          key={s}
                          className={`h-3.5 w-3.5 ${s <= review.rating ? "fill-primary text-primary" : "text-gray-200"}`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] font-medium text-text-light">
                      {review.createdAt?.toDate ? format(review.createdAt.toDate(), "MMM dd, yyyy") : "—"}
                    </p>
                    {confirmId === review.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(review.id)}
                          disabled={deleting === review.id}
                          className="text-[9px] font-medium text-white bg-red-500 px-2.5 py-1 rounded-lg active:scale-95 transition-all disabled:opacity-50"
                        >
                          {deleting === review.id ? "..." : "Confirm"}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="text-[9px] font-medium text-text-light bg-gray-100 px-2.5 py-1 rounded-lg active:scale-95 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(review.id)}
                        className="flex items-center gap-1 text-[9px] font-medium text-red-400 hover:text-red-600 transition-all"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Comment */}
                <p className="mt-4 text-sm font-medium text-text-light leading-relaxed border-t border-gray-50 pt-4">
                  "{review.comment}"
                </p>

                {/* Booking ID tag */}
                <div className="mt-3 inline-flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-full px-3 py-1">
                  <span className="text-[9px] font-medium text-text-light uppercase tracking-widest">
                    Booking: {review.bookingId.slice(0, 12)}...
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Confirm delete modal */}
      {confirmId && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setConfirmId(null)}>
        </div>
      )}
    </div>
  );
}
