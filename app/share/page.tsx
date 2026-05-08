"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { readSessionId } from "@/lib/secret";
import { Peer } from "@/lib/webrtc";
import { Camera, Monitor, Mic, MicOff, X } from "lucide-react";

type Status = "idle" | "requesting" | "live" | "ended" | "error";

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

interface PerViewer {
  peer: Peer;
  /** number of remote viewer candidates we've already applied */
  viewerCandidatesApplied: number;
  answered: boolean;
}

function ShareInner({ sessionId }: { sessionId: string }) {
  const session = useQuery(api.signaling.getBySession, { sessionId });
  const viewers = useQuery(api.viewers.listForSession, { sessionId });
  const markLive = useMutation(api.signaling.markLive);
  const setPublisherOffer = useMutation(api.viewers.setPublisherOffer);
  const addCandidate = useMutation(api.viewers.addCandidate);
  const endSession = useMutation(api.signaling.end);

  // viewerId → per-viewer state (peer connection + bookkeeping)
  const peersRef = useRef<Map<string, PerViewer>>(new Map());
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [withAudio, setWithAudio] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    if (session?.hasAudio) setWithAudio(true);
  }, [session?.hasAudio]);

  // Attach local stream to <video> for self-preview.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !stream) return;
    v.srcObject = stream;
    v.play().catch(() => {});
    return () => {
      v.srcObject = null;
    };
  }, [stream]);

  // For each viewer row in the session, ensure we have a peer.
  // - New viewer (no peer yet): create peer, addTracks, createOffer, write offer.
  // - Existing viewer with viewerSdp answer: acceptAnswer.
  // - New ICE candidates from viewer side: sync them to peer.
  useEffect(() => {
    if (!stream || !viewers) return;
    setViewerCount(viewers.length);

    for (const v of viewers) {
      let entry = peersRef.current.get(v.viewerId);

      if (!entry) {
        const peer = new Peer({
          role: "publisher",
          onIceCandidate: (candidate) => {
            addCandidate({
              sessionId,
              viewerId: v.viewerId,
              role: "publisher",
              candidate,
            }).catch(console.error);
          },
        });
        entry = { peer, viewerCandidatesApplied: 0, answered: false };
        peersRef.current.set(v.viewerId, entry);

        (async () => {
          try {
            const offer = await peer.createOffer(streamRef.current!);
            await setPublisherOffer({
              sessionId,
              viewerId: v.viewerId,
              sdp: offer,
            });
          } catch (e) {
            console.error("publisher offer failed", e);
          }
        })();
      }

      // Accept answer if it just arrived
      if (v.viewerSdp && !entry.answered) {
        entry.answered = true;
        entry.peer.acceptAnswer(v.viewerSdp).catch(console.error);
      }

      // Sync new viewer ICE candidates
      if (v.viewerCandidates.length > entry.viewerCandidatesApplied) {
        const fresh = v.viewerCandidates.slice(entry.viewerCandidatesApplied);
        entry.viewerCandidatesApplied = v.viewerCandidates.length;
        for (const c of fresh) {
          try {
            entry.peer.pc.addIceCandidate(JSON.parse(c)).catch(console.error);
          } catch (e) {
            console.warn(e);
          }
        }
      }
    }

    // Tear down peers for viewers that no longer exist
    const liveIds = new Set(viewers.map((v) => v.viewerId));
    for (const [id, entry] of peersRef.current) {
      if (!liveIds.has(id)) {
        entry.peer.close();
        peersRef.current.delete(id);
      }
    }
  }, [viewers, stream, sessionId, addCandidate, setPublisherOffer]);

  const startStream = async () => {
    if (!session) return;
    setStatus("requesting");
    setError(null);
    try {
      const audio = withAudio;
      let mediaStream: MediaStream;
      if (session.sourceType === "camera") {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio,
        });
      } else {
        mediaStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30, max: 60 } },
          audio,
        });
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);

      mediaStream.getVideoTracks().forEach((t) => {
        t.addEventListener("ended", () => stopStream(true));
      });

      await markLive({ sessionId, userAgent: navigator.userAgent });
      setStatus("live");
    } catch (e) {
      console.error("startStream failed", e);
      const msg = e instanceof Error ? e.message : "Failed to start";
      setError(msg);
      setStatus("error");
    }
  };

  const stopStream = (notify = true) => {
    for (const entry of peersRef.current.values()) entry.peer.close();
    peersRef.current.clear();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    setStatus("ended");
    if (notify) endSession({ sessionId }).catch(console.error);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const entry of peersRef.current.values()) entry.peer.close();
      peersRef.current.clear();
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

  // Capability check — getDisplayMedia is desktop-only; getUserMedia
  // requires HTTPS (Vercel gives us that) and a real device.
  const supported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    (session.sourceType === "screen"
      ? typeof navigator.mediaDevices.getDisplayMedia === "function"
      : typeof navigator.mediaDevices.getUserMedia === "function");

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

        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-contain"
            style={{
              transform:
                session.sourceType === "camera" ? "scaleX(-1)" : undefined,
            }}
          />
          {!stream && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
              {status === "requesting"
                ? "Requesting permission…"
                : `Click start to share your ${sourceLabel}`}
            </div>
          )}
        </div>

        {!supported && (
          <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
            <strong>Not supported on this browser.</strong>{" "}
            {session.sourceType === "screen"
              ? "Screen sharing isn't available on mobile browsers. Open this URL on a desktop browser (Chrome, Firefox, Safari, or Edge on macOS, Windows, or Linux)."
              : "This browser doesn't expose camera access. Try Chrome, Safari, Firefox, or Edge."}
          </div>
        )}

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
                disabled={!supported}
                className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
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

          <div className="ml-auto flex items-center gap-3 text-xs">
            {status === "live" && (
              <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">
                {viewerCount} viewer{viewerCount === 1 ? "" : "s"}
              </span>
            )}
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                status === "live"
                  ? "bg-green-400"
                  : status === "requesting"
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
