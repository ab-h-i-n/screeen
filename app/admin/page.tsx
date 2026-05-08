"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { readSecret } from "@/lib/secret";
import { AdminCanvas } from "@/components/canvas/AdminCanvas";
import { Library } from "@/components/admin/Library";
import { Inspector } from "@/components/admin/Inspector";
import { Toolbar } from "@/components/admin/Toolbar";
import { TopBar } from "@/components/admin/TopBar";
import { ScenesPanel } from "@/components/admin/ScenesPanel";

export default function AdminPage() {
  const [secret, setSecret] = useState<string | null>(null);
  const [secretError, setSecretError] = useState(false);
  const ensure = useMutation(api.display.ensure);

  useEffect(() => {
    const s = readSecret();
    if (!s) {
      setSecretError(true);
      return;
    }
    setSecret(s);
    // Probe: ensure() requires no auth, so we can't validate here directly.
    // Mutations will fail on first attempt if the secret is wrong.
    ensure().catch(console.error);
  }, [ensure]);

  if (secretError) {
    return <SecretMissing />;
  }
  if (!secret) {
    return (
      <div className="flex h-screen w-screen items-center justify-center text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white">
      <TopBar secret={secret} />
      <Toolbar secret={secret} />
      <div className="grid flex-1 grid-cols-[240px_1fr_300px] overflow-hidden">
        <aside className="flex flex-col overflow-hidden border-r">
          <div className="flex-1 overflow-hidden">
            <Library secret={secret} />
          </div>
          <ScenesPanel secret={secret} />
        </aside>
        <main className="overflow-hidden bg-zinc-100 p-4">
          <AdminCanvas secret={secret} />
        </main>
        <aside className="overflow-hidden border-l">
          <Inspector secret={secret} />
        </aside>
      </div>
    </div>
  );
}

function SecretMissing() {
  return (
    <div className="flex h-screen w-screen items-center justify-center p-8">
      <div className="max-w-lg space-y-3 rounded-lg border bg-white p-6 shadow">
        <h1 className="text-xl font-semibold">Admin secret missing</h1>
        <p className="text-sm text-muted-foreground">
          Append <code className="rounded bg-muted px-1 py-0.5">#k=YOUR_SECRET</code> to
          this URL. The secret must match the <code>ADMIN_SECRET</code> set in
          your Convex deployment.
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>
            Generate one: <code className="rounded bg-muted px-1 py-0.5">npm run secret:gen</code>
          </li>
          <li>
            Set it: <code className="rounded bg-muted px-1 py-0.5">npx convex env set ADMIN_SECRET &lt;value&gt;</code>
          </li>
          <li>
            Visit: <code className="rounded bg-muted px-1 py-0.5">/admin#k=&lt;value&gt;</code>
          </li>
        </ol>
      </div>
    </div>
  );
}
