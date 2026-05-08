"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { readSessionId } from "@/lib/secret";
import { Peer } from "@/lib/webrtc";
import { Camera, Monitor, Mic, MicOff, X } from "lucide-react";

type Status = "idle" | "requesting" | "connecting" | "live" | "ended" | "error";

export default function SharePage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  useEffect(() => setSessionId(readSessionId()), []);

  if (!sessionId) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-8">
        <div className="max-w-lg space-y-3 rounded-lg border bg-white p-6 shadow">
          <h1 className="text-xl font-semibold">Missing session</h1>
          <p className="text-sm text-muted-foreground">
            This page needs a session ID. Open the link from the admin panel —
            it should look like <code>/share#s=…</code>.
          </p>
        </div>
      </div>
    );
  }
  return <ShareInner sessionId={sessionId} />;
}

function ShareInner({ sessionId }: { sessionId: string }) {
  const session = useQuery(api.signaling.getBySession, { sessionId });
  const setPublisherSdp = useMutation(api.signaling.setPublisherSdp);
  const addCandidate = useMutation(api.signaling.addCandidate);
  const endSession = useMutation(api.signaling.end);

  const peerRef = useRef<Peer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [withAudio, setWithAudio] = useState(false);

  useEffect(() => {
    if (session?.hasAudio) setWithAudio(true);
  }, [session?.hasAudio]);

  // Sync remote ICE candidates from viewer
  useEffect(() => {
    if (!peerRef.current || !session) return;
    peerRef.current.syncCandidates(session.viewerCandidates);
    if (session.viewerSdp && peerRef.current) {
      peerRef.current.acceptAnswer(session.viewerSdp).catch(console.error);
    }
  }, [session?.viewerCandidates, session?.viewerSdp, session]);

  const startStream = async () => {
    if (!session) return;
    setStatus("requesting");
    setError(null);
    try {
      const audio = withAudio;
      let stream: MediaStream;
      if (session.sourceType === "camera") {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio,
        });
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30, max: 60 } },
          audio,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      // Detect "Stop sharing"
      stream.getVideoTracks().forEach((t) => {
        t.addEventListener("ended", () => stopStream(true));
      });

      const peer = new Peer({
        role: "publisher",
        onIceCandidate: (candidate) => {
          addCandidate({ sessionId, role: "publisher", candidate }).catch(
            () => {},
          );
        },
        onConnectionState: (s) => {
          if (s === "connected") setStatus("live");
          if (s === "failed" || s === "disconnected") setStatus("connecting");
          if (s === "closed") setStatus("ended");
        },
      });
      peerRef.current = peer;

      const offer = await peer.createOffer(stream);
      await setPublisherSdp({ sessionId, sdp: offer, userAgent: navigator.userAgent });
      setStatus("connecting");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to start";
      setError(msg);
      setStatus("error");
    }
  };

  const stopStream = (notify = true) => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("ended");
    if (notify) endSession({ sessionId }).catch(console.error);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      peerRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (!session) {
    return (
      <div className="flex h-screen w-screen items-center justify-center text-sm">
        Loading session…
      </div>
    );
  }

  const Icon = session.sourceType === "screen" ? Monitor : Camera;
  const sourceLabel = session.sourceType === "screen" ? "screen" : "camera";

  return (
    <div className="flex min-h-screen w-screen flex-col items-center justify-center bg-zinc-900 text-white">
      <div className="w-full max-w-2xl space-y-4 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-zinc-800 p-3">
            <Icon size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold capitalize">
              Share your {sourceLabel}
            </h1>
            <p className="text-xs text-zinc-400">
              This stream goes to the screeen display via direct peer-to-peer
              connection.
            </p>
          </div>
        </div>

        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          {status === "idle" || status === "requesting" ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-400">
              {status === "idle" ? `Click start to share your ${sourceLabel}` : "Requesting permission…"}
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-contain"
            />
          )}
        </div>

        {error && (
          <div className="rounded border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2">
          {status === "idle" || status === "ended" || status === "error" ? (
            <>
              <button
                type="button"
                onClick={startStream}
                className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200"
              >
                Start sharing
              </button>
              <label className="flex items-center gap-1 text-xs text-zinc-300">
                <button
                  type="button"
                  onClick={() => setWithAudio((v) => !v)}
                  className="rounded border border-zinc-700 p-1.5 hover:bg-zinc-800"
                >
                  {withAudio ? <Mic size={12} /> : <MicOff size={12} />}
                </button>
                {withAudio ? "Audio on" : "Audio off"}
              </label>
            </>
          ) : (
            <button
              type="button"
              onClick={() => stopStream(true)}
              className="flex items-center gap-1 rounded-md border border-rose-500/50 px-4 py-2 text-sm hover:bg-rose-500/10"
            >
              <X size={14} />
              Stop sharing
            </button>
          )}

          <div className="ml-auto flex items-center gap-2 text-xs">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                status === "live"
                  ? "bg-green-400"
                  : status === "connecting" || status === "requesting"
                    ? "animate-pulse bg-amber-400"
                    : status === "error"
                      ? "bg-rose-500"
                      : "bg-zinc-500"
              }`}
            />
            <span className="font-medium uppercase tracking-wide">{status}</span>
          </div>
        </div>

        <p className="text-[11px] text-zinc-500">
          {session.sourceType === "screen"
            ? "When prompted, choose which screen, window, or browser tab to share. On Chrome you can also include tab audio."
            : "Allow camera (and mic if enabled). On phones, tap the camera icon in the address bar if denied."}
        </p>
      </div>
    </div>
  );
}
