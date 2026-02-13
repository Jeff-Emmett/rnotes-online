'use client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { EncryptIDProvider } from '@encryptid/sdk/ui/react';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Cast to any to bypass React 18/19 type mismatch between SDK and app
  const Provider = EncryptIDProvider as any;
  return (
    <Provider serverUrl={process.env.NEXT_PUBLIC_ENCRYPTID_SERVER_URL}>
      {children}
    </Provider>
  );
}
