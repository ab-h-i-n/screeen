"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Peer } from "@/lib/webrtc";
import { uid } from "@/lib/utils";
import type { RendererProps } from "./types";

export interface StreamPayload {
  sessionId: string;
  sourceType: "camera" | "screen";
  hasAudio?: boolean;
  unmuted?: boolean;
  mirror?: boolean;
  objectFit?: "cover" | "contain";
}

/**
 * StreamRenderer = a WebRTC viewer. Both admin and display run an
 * instance, each with a unique viewerId, so the publisher can fan out
 * separate peer connections per viewer.
 */
export function StreamRenderer({
  payload,
  overrides,
}: RendererProps<StreamPayload>) {
  const p = { ...payload, ...(overrides ?? {}) };

  // Stable viewerId per StreamRenderer instance, kept across re-renders.
  // Each layer (and each browser tab) gets its own.
  const viewerIdRef = useRef<string | null>(null);
  if (viewerIdRef.current === null) viewerIdRef.current = uid();
  const viewerId = viewerIdRef.current;

  const session = useQuery(
    api.signaling.getBySession,
    p.sessionId ? { sessionId: p.sessionId } : "skip",
  );
  const myViewer = useQuery(
    api.viewers.getOne,
    p.sessionId ? { sessionId: p.sessionId, viewerId } : "skip",
  );
  const announce = useMutation(api.viewers.announce);
  const remove = useMutation(api.viewers.remove);
  const setViewerAnswer = useMutation(api.viewers.setViewerAnswer);
  const addCandidate = useMutation(api.viewers.addCandidate);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const candidatesAppliedRef = useRef(0);
  const answeredRef = useRef(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [state, setState] = useState<RTCPeerConnectionState | "idle">("idle");

  // Announce ourselves once we have a sessionId. Re-announce when
  // session re-opens after end (so we get a fresh row).
  useEffect(() => {
    if (!p.sessionId) return;
    announce({ sessionId: p.sessionId, viewerId }).catch(console.error);
  }, [p.sessionId, viewerId, announce, session?.status]);

  // Best-effort cleanup when the component unmounts or session ends.
  useEffect(() => {
    return () => {
      if (p.sessionId) {
        remove({ sessionId: p.sessionId, viewerId }).catch(() => {});
      }
      peerRef.current?.close();
      peerRef.current = null;
    };
  }, [p.sessionId, viewerId, remove]);

  // When the publisher writes our offer, build a peer and answer.
  useEffect(() => {
    if (!myViewer?.publisherSdp || !p.sessionId) return;
    if (peerRef.current) return;

    const peer = new Peer({
      role: "viewer",
      onIceCandidate: (candidate) => {
        addCandidate({
          sessionId: p.sessionId,
          viewerId,
          role: "viewer",
          candidate,
        }).catch(console.error);
      },
      onTrack: (s) => setStream(s),
      onConnectionState: (s) => setState(s),
    });
    peerRef.current = peer;
    answeredRef.current = false;
    candidatesAppliedRef.current = 0;

    (async () => {
      try {
        const answer = await peer.createAnswer(myViewer.publisherSdp!);
        await setViewerAnswer({
          sessionId: p.sessionId,
          viewerId,
          sdp: answer,
        });
      } catch (e) {
        console.error("answer failed", e);
      }
    })();
  }, [myViewer?.publisherSdp, p.sessionId, viewerId, addCandidate, setViewerAnswer]);

  // Sync remote ICE candidates from publisher.
  useEffect(() => {
    if (!peerRef.current || !myViewer) return;
    const total = myViewer.publisherCandidates.length;
    const applied = candidatesAppliedRef.current;
    if (total <= applied) return;
    const fresh = myViewer.publisherCandidates.slice(applied);
    candidatesAppliedRef.current = total;
    for (const c of fresh) {
      try {
        peerRef.current.pc.addIceCandidate(JSON.parse(c)).catch(console.error);
      } catch (e) {
        console.warn(e);
      }
    }
  }, [myViewer?.publisherCandidates]);

  // Attach stream to <video>.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !stream) return;
    v.srcObject = stream;
    v.play().catch(() => {});
    return () => {
      v.srcObject = null;
    };
  }, [stream]);

  // If session ends, tear down the peer so we accept a future restart.
  useEffect(() => {
    if (session?.status === "ended" && peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
      setStream(null);
      setState("idle");
      answeredRef.current = false;
      candidatesAppliedRef.current = 0;
    }
  }, [session?.status]);

  const placeholder = useMemo(() => {
    if (!p.sessionId) return "No session";
    if (!session) return "Connecting…";
    if (session.status === "ended") return "Stream ended";
    if (session.status === "waiting" || !stream)
      return `Waiting for ${p.sourceType === "screen" ? "screen share" : "camera"}…`;
    return null;
  }, [p.sessionId, session, stream, p.sourceType]);

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
          opacity: stream ? 1 : 0,
        }}
      />
      {placeholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-sm text-zinc-300">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
            {placeholder}
          </div>
        </div>
      )}
      {stream && state !== "connected" && (
        <div className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
          {state}
        </div>
      )}
    </div>
  );
}
