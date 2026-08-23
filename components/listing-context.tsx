'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const COOKIE = 'pm_listing';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

interface ListingCtx {
  listingId: number | null;
  setListingId: (id: number | null) => void;
}

const ListingContext = createContext<ListingCtx>({ listingId: null, setListingId: () => {} });

// Shared "selected listing" across Dashboard / Khuyến mãi / Nền tảng (SPEC v1.1).
// Persisted in a cookie so the choice survives navigation and reload.
export function ListingProvider({ children }: { children: ReactNode }) {
  const [listingId, setListingIdState] = useState<number | null>(null);

  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)pm_listing=(\d+)/);
    if (m) setListingIdState(Number(m[1]));
  }, []);

  const setListingId = useCallback((id: number | null) => {
    setListingIdState(id);
    document.cookie = `${COOKIE}=${id ?? ''}; path=/; max-age=${MAX_AGE}`;
  }, []);

  return <ListingContext.Provider value={{ listingId, setListingId }}>{children}</ListingContext.Provider>;
}

export function useListing() {
  return useContext(ListingContext);
}
