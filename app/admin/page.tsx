"use client";

import { FormEvent, useEffect, useState } from "react";
import { useConvex, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { readSecret, saveSecret, clearSecret } from "@/lib/secret";
import { AdminCanvas } from "@/components/canvas/AdminCanvas";
import { Library } from "@/components/admin/Library";
import { Inspector } from "@/components/admin/Inspector";
import { Toolbar } from "@/components/admin/Toolbar";
import { TopBar } from "@/components/admin/TopBar";
import { ScenesPanel } from "@/components/admin/ScenesPanel";

export default function AdminPage() {
  const [secret, setSecret] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const ensure = useMutation(api.display.ensure);

  useEffect(() => {
    setSecret(readSecret());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (secret) ensure().catch(console.error);
  }, [secret, ensure]);

  if (!hydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center text-sm">
        Loading…
      </div>
    );
  }

  if (!secret) {
    return (
      <Login
        onSuccess={(pw) => {
          saveSecret(pw);
          setSecret(pw);
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white">
      <TopBar
        secret={secret}
        onLogout={() => {
          clearSecret();
          setSecret(null);
        }}
      />
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

function Login({ onSuccess }: { onSuccess: (pw: string) => void }) {
  const convex = useConvex();
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const ok = await convex.query(api.auth.verify, { secret: pw });
      if (ok) onSuccess(pw);
      else setError("Wrong password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center p-8">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-lg border bg-white p-6 shadow"
      >
        <div>
          <h1 className="text-xl font-semibold">screeen admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the admin password to continue.
          </p>
        </div>
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && (
          <div className="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={busy || !pw}
          className="w-full rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {busy ? "Checking…" : "Sign in"}
        </button>
        <p className="text-[11px] text-muted-foreground">
          Set or rotate via{" "}
          <code className="rounded bg-muted px-1">npx convex env set ADMIN_SECRET</code>.
        </p>
      </form>
    </div>
  );
}
