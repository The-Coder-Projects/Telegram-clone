"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useSession } from "next-auth/react";
import { SocketProvider } from "@/contexts/SocketContext";

function AuthSync() {
  const { data } = useSession();
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const u = data?.user as { id?: string; name?: string; image?: string } | undefined;
    if (!u?.id || !u.name) return setUser(null);

    setUser({
      id: u.id,
      name: u.name,
      username: u.name.toLowerCase(),
      avatarUrl: u.image ?? null,
      lastSeen: null,
    });
  }, [data?.user, setUser]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {/* SocketProvider lives here so it has access to both session and
            queryClient, and creates exactly ONE socket for the entire app. */}
        <SocketProvider>
          <AuthSync />
          {children}
        </SocketProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
