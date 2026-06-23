'use client';

import { createContext, useContext } from 'react';

// The signed API bearer token (app/auth.py generate_api_token) for the logged-in
// user. Provided once at the dashboard layout so every client component can send
// it as `Authorization: Bearer <api_token>` without threading a prop through
// every parent. Undefined only on pre-upgrade sessions (the layout forces a
// re-login before rendering, so in practice it is always set for the dashboard).
const ApiTokenContext = createContext<string | undefined>(undefined);

export function ApiTokenProvider({
  token,
  children,
}: {
  token?: string;
  children: React.ReactNode;
}) {
  return <ApiTokenContext.Provider value={token}>{children}</ApiTokenContext.Provider>;
}

export function useApiToken(): string | undefined {
  return useContext(ApiTokenContext);
}
