"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getFavorites, getProvider } from "@/lib/firestore";
import AuthGuard from "@/components/auth/AuthGuard";
import ProviderCard from "@/components/search/ProviderCard";
import BottomNav from "@/components/common/BottomNav";

export default function FavoritesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const fetchFavorites = async () => {
      setLoading(true);
      try {
        const ids = await getFavorites(user.uid);
        if (ids.length === 0) { setProviders([]); return; }
        const results = await Promise.all(
          ids.map((id: string) => getProvider(id).catch(() => null))
        );
        setProviders(results.filter(Boolean).map((p: any) => ({ ...p, id: p.id || p.uid })));
      } catch {
        setProviders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, [user?.uid]);

  return (
    <AuthGuard>
      <main className="min-h-screen bg-white pb-24 lg:pb-8">

        {/* Header */}
        <header className="sticky top-0 z-50 bg-white px-4 pt-5 pb-3 border-b border-gray-100 lg:px-8 lg:pt-6">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <button
              onClick={() => router.back()}
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-all active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-[20px] font-black text-gray-900">Saved Providers</h1>
              {!loading && (
                <p className="text-[11px] font-medium text-gray-400">
                  {providers.length} {providers.length === 1 ? "provider" : "providers"} saved
                </p>
              )}
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-6 lg:px-8">

          {/* Loading skeletons */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-36 rounded-[1.5rem] bg-gray-100 animate-pulse" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && providers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 mb-5">
                <Heart className="h-9 w-9 text-red-300" />
              </div>
              <h2 className="text-[17px] font-black text-gray-800">No saved providers yet</h2>
              <p className="mt-2 text-[13px] font-medium text-gray-400 max-w-[240px]">
                Tap the star icon on any provider profile to save them here
              </p>
              <button
                onClick={() => router.push("/search")}
                className="mt-6 rounded-full bg-primary px-6 py-3 text-[13px] font-bold text-white shadow-md shadow-primary/20 active:scale-95 transition-all"
              >
                Browse Providers
              </button>
            </div>
          )}

          {/* Provider list */}
          {!loading && providers.length > 0 && (
            <div className="space-y-4">
              {providers.map(provider => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          )}

        </div>

        <BottomNav />
      </main>
    </AuthGuard>
  );
}
