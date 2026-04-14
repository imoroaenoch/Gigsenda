"use client";

import { Suspense } from "react";

interface SearchParamsProviderProps {
  children: React.ReactNode;
}

export default function SearchParamsProvider({ children }: SearchParamsProviderProps) {
  return <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>;
}
