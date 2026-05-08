"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
      // Render children without Convex if URL missing — display will show a setup banner
      return null;
    }
    return new ConvexReactClient(url);
  }, []);

  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-lg space-y-3 rounded-lg border bg-white p-6 shadow">
          <h1 className="text-xl font-semibold">screeen — setup needed</h1>
          <p className="text-sm text-muted-foreground">
            <code className="rounded bg-muted px-1 py-0.5">NEXT_PUBLIC_CONVEX_URL</code>{" "}
            is not set. Run <code>npx convex dev</code> to provision a
            deployment, then add the URL to <code>.env.local</code>.
          </p>
        </div>
      </div>
    );
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
