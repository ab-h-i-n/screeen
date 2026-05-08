"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Peer } from "@/lib/webrtc";
import type { RendererProps } from "./types";
import { Camera, Monitor } from "lucide-react";

export interface StreamPayload {
  sessionId: string;
  sourceType: "camera" | "screen";
  hasAudio?: boolean;
  unmuted?: boolean;
  mirror?: boolean;
  objectFit?: "cover" | "contain";
}

/**
 * Stream renderer routes to either the admin placeholder or the live
 * WebRTC viewer based on `isAdmin`.
 *
 * IMPORTANT: there is only ONE viewer slot in the signaling table. If
 * both admin and display ran the viewer simultaneously they would race
 * to write `viewerSdp` and one would be silently locked out at the
 * publisher (signalingState moves past have-local-offer after the
 * first answer). So admin gets a placeholder, display owns the stream.
 */
export function StreamRenderer({
  payload,
  overrides,
  isAdmin,
}: RendererProps<StreamPayload>) {
  const p = { ...payload, ...(overrides ?? {}) };
  if (isAdmin) {
    return <AdminPlaceholder sessionId={p.sessionId} sourceType={p.sourceType} />;
  }
  return <ViewerStream payload={p} />;
}

function AdminPlaceholder({
  sessionId,
  sourceType,
}: {
  sessionId: string;
  sourceType: "camera" | "screen";
}) {
  const session = useQuery(
    api.signaling.getBySession,
    sessionId ? { sessionId } : "skip",
  );
  const live = session?.status === "live";
  const Icon = sourceType === "screen" ? Monitor : Camera;

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-2 ${
        live
          ? "bg-emerald-950 text-emerald-200"
          : "bg-zinc-800 text-zinc-300"
      }`}
      style={{ containerType: "size" }}
    >
      <Icon style={{ width: "min(18cqw, 30cqh)", height: "min(18cqw, 30cqh)" }} />
      <div
        className="flex items-center gap-1.5"
        style={{ fontSize: "min(7cqw, 12cqh)", fontWeight: 600 }}
      >
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            live ? "bg-green-400" : "animate-pulse bg-amber-400"
          }`}
        />
        {live
          ? `${sourceType === "screen" ? "Screen" : "Camera"} live`
          : `Awaiting ${sourceType}`}
      </div>
      <div
        className="text-center opacity-60"
        style={{ fontSize: "min(4cqw, 7cqh)" }}
      >
        Visible on the display
      </div>
    </div>
  );
}

function ViewerStream({ payload: p }: { payload: StreamPayload }) {
  const session = useQuery(
    api.signaling.getBySession,
    p.sessionId ? { sessionId: p.sessionId } : "skip",
  );
  const setViewerSdp = useMutation(api.signaling.setViewerSdp);
  const addCandidate = useMutation(api.signaling.addCandidate);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [state, setState] = useState<RTCPeerConnectionState | "idle">("idle");

  // Create peer + answer when offer arrives
  useEffect(() => {
    if (!session?.publisherSdp || !p.sessionId) return;
    if (peerRef.current) return;
    if (session.status === "ended") return;

    const peer = new Peer({
      role: "viewer",
      onIceCandidate: (candidate) => {
        addCandidate({
          sessionId: p.sessionId,
          role: "viewer",
          candidate,
        }).catch(console.error);
      },
      onTrack: (s) => setStream(s),
      onConnectionState: (s) => setState(s),
    });
    peerRef.current = peer;

    (async () => {
      try {
        const answer = await peer.createAnswer(session.publisherSdp!);
        await setViewerSdp({ sessionId: p.sessionId, sdp: answer });
      } catch (e) {
        console.error("answer failed", e);
      }
    })();

    return () => {
      peer.close();
      peerRef.current = null;
      setStream(null);
      setState("idle");
    };
  }, [session?.publisherSdp, session?.status, p.sessionId, addCandidate, setViewerSdp]);

  // Sync remote ICE candidates
  useEffect(() => {
    if (!peerRef.current || !session) return;
    peerRef.current.syncCandidates(session.publisherCandidates);
  }, [session?.publisherCandidates, session]);

  // Attach stream to <video>
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !stream) return;
    v.srcObject = stream;
    return () => {
      v.srcObject = null;
    };
  }, [stream]);

  // Reset peer when session ends so we accept future re-publishes
  useEffect(() => {
    if (session?.status === "ended" && peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
      setStream(null);
    }
  }, [session?.status]);

  if (!p.sessionId) {
    return <Placeholder>No session</Placeholder>;
  }
  if (!session) {
    return <Placeholder>Connecting…</Placeholder>;
  }
  if (session.status === "waiting" || !session.publisherSdp) {
    return (
      <Placeholder>
        Waiting for {p.sourceType === "screen" ? "screen share" : "camera"}…
      </Placeholder>
    );
  }
  if (session.status === "ended") {
    return <Placeholder>Stream ended</Placeholder>;
  }

  return (
    <div className="relative h-full w-full bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={!p.unmuted}
        className="h-full w-full"
        style={{
          objectFit: p.objectFit ?? "contain",
          transform:
            p.mirror && p.sourceType === "camera" ? "scaleX(-1)" : undefined,
        }}
      />
      {state !== "connected" && (
        <div className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
          {state}
        </div>
      )}
    </div>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-sm text-zinc-300">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
        {children}
      </div>
    </div>
  );
}
