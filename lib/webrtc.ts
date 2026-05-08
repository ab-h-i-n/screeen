/**
 * Minimal WebRTC peer wrapper. No dependencies — uses the browser's native
 * RTCPeerConnection API. Convex acts as the signaling channel; we exchange
 * SDP offer/answer and ICE candidates through reactive queries + mutations.
 */

export type PeerRole = "publisher" | "viewer";

export interface PeerConfig {
  role: PeerRole;
  iceServers?: RTCIceServer[];
  onIceCandidate: (candidate: string) => void;
  onTrack?: (stream: MediaStream) => void;
  onConnectionState?: (state: RTCPeerConnectionState) => void;
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function buildIceServers(): RTCIceServer[] {
  const list = [...DEFAULT_ICE_SERVERS];
  const turn = process.env.NEXT_PUBLIC_TURN_URL;
  if (turn) {
    list.push({
      urls: turn,
      username: process.env.NEXT_PUBLIC_TURN_USER,
      credential: process.env.NEXT_PUBLIC_TURN_CRED,
    });
  }
  return list;
}

export class Peer {
  pc: RTCPeerConnection;
  private role: PeerRole;
  private remoteStream: MediaStream | null = null;
  private cfg: PeerConfig;
  private appliedCandidates = 0;

  constructor(cfg: PeerConfig) {
    this.cfg = cfg;
    this.role = cfg.role;
    this.pc = new RTCPeerConnection({
      iceServers: cfg.iceServers ?? buildIceServers(),
    });

    this.pc.addEventListener("icecandidate", (ev) => {
      if (ev.candidate) {
        cfg.onIceCandidate(JSON.stringify(ev.candidate.toJSON()));
      }
    });

    this.pc.addEventListener("track", (ev) => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        cfg.onTrack?.(this.remoteStream);
      }
      this.remoteStream.addTrack(ev.track);
    });

    this.pc.addEventListener("connectionstatechange", () => {
      cfg.onConnectionState?.(this.pc.connectionState);
    });
  }

  /** Publisher: attach local stream, create offer. */
  async createOffer(stream: MediaStream): Promise<string> {
    for (const track of stream.getTracks()) {
      this.pc.addTrack(track, stream);
    }
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return JSON.stringify(offer);
  }

  /** Viewer: receive offer, create answer. */
  async createAnswer(offerJson: string): Promise<string> {
    const offer = JSON.parse(offerJson) as RTCSessionDescriptionInit;
    await this.pc.setRemoteDescription(offer);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return JSON.stringify(answer);
  }

  /** Publisher: receive answer. */
  async acceptAnswer(answerJson: string) {
    const answer = JSON.parse(answerJson) as RTCSessionDescriptionInit;
    if (this.pc.signalingState === "have-local-offer") {
      await this.pc.setRemoteDescription(answer);
    }
  }

  /** Apply remote ICE candidates, idempotent: tracks how many we've consumed. */
  async syncCandidates(candidates: string[]) {
    for (let i = this.appliedCandidates; i < candidates.length; i++) {
      try {
        const c = JSON.parse(candidates[i]) as RTCIceCandidateInit;
        await this.pc.addIceCandidate(c);
      } catch (e) {
        console.warn("addIceCandidate failed", e);
      }
    }
    this.appliedCandidates = candidates.length;
  }

  close() {
    this.pc.getSenders().forEach((s) => s.track?.stop());
    this.pc.close();
  }
}
