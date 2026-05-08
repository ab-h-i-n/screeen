# screeen — project plan

A web-based digital signage system. One laptop drives an external monitor in fullscreen kiosk mode, displaying a layered, drawable canvas. An admin web UI controls the canvas in real time: drag/drop content, draw on the whiteboard, swap layouts, stream a remote camera, etc.

---

## 1. Vision

**One sentence:** the display is a whiteboard you can draw on, with infinitely many layers (websites, videos, images, text, clocks, todos, camera feeds) you can drag, resize, rotate, and stack — all updating in realtime from a separate admin page.

**Surfaces**

| Surface | Path | Role |
|---|---|---|
| Display | `/` | Read-only, fullscreen, kiosk; renders canvas live |
| Admin | `/admin#k=<secret>` | Drag/draw/edit; mirrors display 1:1 |
| Stream publisher | `/share#s=<sessionId>` | Phone/laptop streams **camera or screen** to the display |

---

## 2. Stack — chosen with rationale

| Concern | Choice | Why |
|---|---|---|
| **Frontend framework** | Next.js 15 (App Router) + React 19 + TypeScript | First-class Vercel deploy, RSC for static admin shell, mature ecosystem |
| **Styling / UI** | Tailwind v4 + shadcn/ui + Radix primitives | Owned components, no runtime cost, fast iteration |
| **State (server)** | Convex | Reactive `useQuery` removes all subscription plumbing; built-in file storage; TS-native schema |
| **State (client)** | Zustand | Tiny (~1kb), no provider noise; for selection / current tool / drag-in-progress |
| **Forms** | React Hook Form + Zod | Type-safe, minimal re-renders, schema shared with Convex validators |
| **Drag / resize / rotate** | `react-moveable` | Supports drag, resize from 8 handles, rotation, snap, group selection, edge guidelines — covers all canvas needs in one library |
| **Drawing engine** | `perfect-freehand` + SVG | Pressure-aware vector strokes by tldraw author; small (~3kb); produces beautiful pen output |
| **WebRTC** | `simple-peer` | Thin wrapper over `RTCPeerConnection`; Convex acts as signaling channel |
| **STUN / TURN** | Google STUN free; Twilio NTS for TURN if needed | Free path covers ~80% of networks; pay only when symmetric NAT bites |
| **Icons** | `lucide-react` | Tree-shakeable, ~250 icons we'll actually use |
| **QR codes** | `qrcode.react` | For sharing the camera publisher link |
| **Date/time** | `date-fns` + browser `Intl.DateTimeFormat` | No moment.js bloat; timezone-aware clocks |
| **Hosting (frontend)** | **Vercel** (Hobby tier) | Confirmed; auto-HTTPS (required for `getUserMedia`), edge CDN, GitHub auto-deploy |
| **Backend / DB** | **Convex** (free tier) | Confirmed; reactive queries + storage + signaling all in one |
| **Domain** | Optional, e.g. `screeen.app` via Vercel | Skip until we ship; `*.vercel.app` works for camera and kiosk |

### Stack non-choices (and why)

- **No Supabase/Firebase** — Convex's reactivity is the better primitive for a live-editing canvas.
- **No Liveblocks/Yjs/CRDTs** — single admin in v1; conflict resolution unnecessary. Add if multi-admin becomes real.
- **No tldraw embed** — overkill for our needs; we want layers + strokes, not a full whiteboard product. Cherry-pick `perfect-freehand` instead.
- **No Redux/Jotai/Recoil** — Convex covers server state; Zustand handles the rest.
- **No Pusher/Ably/Socket.io** — Convex reactive queries replace them.
- **No native app** — laptop opens a URL. Chrome `--kiosk --app=URL` is the install story.

---

## 3. Architecture

```
┌──────────────┐         ┌──────────────┐
│   Browser    │◄───────►│   Convex     │
│   (Display)  │ reactive│ (DB + files  │
│   /          │  query  │  + signaling)│
└──────────────┘         └──────────────┘
       ▲                         ▲
       │ WebRTC                  │ mutations
       │ peer-to-peer            │ + queries
       ▼                         │
┌──────────────┐         ┌──────────────┐
│   Browser    │         │   Browser    │
│  (Camera     │         │   (Admin)    │
│   publisher) │         │   /admin     │
│   /camera    │         └──────────────┘
└──────────────┘
```

- Display, Admin, Camera publisher are all the same Next.js app, different routes.
- Convex is the only server-side dependency. It holds: layers, contents, strokes, signaling messages, uploaded files.
- After WebRTC handshake, video flows **peer-to-peer** between camera publisher and display — Convex is no longer in the data path.

---

## 4. Data model (Convex schema)

```ts
// convex/schema.ts

display: {
  slug: 'main',                  // single display in v1
  background: '#ffffff',         // whiteboard default
  updatedAt: number,
}

contents: {
  type: 'website' | 'video' | 'image' | 'text' | 'stream'
      | 'clock' | 'todo' | 'pdf' | 'qr' | 'countdown' | 'weather' | 'iframe-html',
  label: string,                 // human name in the library
  payload: any,                  // shape varies by type — see §7
  createdAt: number,
}
// index by ('type', 'createdAt')

layers: {                        // each layer = ONE INSTANCE on the canvas
  contentId: Id<'contents'>,     // many layers can share one contentId (multi-instance)
  x: number, y: number,          // 0..1 fraction of canvas
  width: number, height: number, // 0..1
  zIndex: number,
  rotation: number,              // degrees
  opacity: number,               // 0..1
  locked: boolean,
  visible: boolean,
  // optional per-instance overrides (e.g. mute for one of two video instances)
  overrides: {} | null,
  updatedAt: number,
}
// index by zIndex

strokes: {
  points: [{ x: number, y: number, pressure: number }],
  color: string,
  width: number,                 // px at 1080p; scales with viewport
  tool: 'pen' | 'highlighter' | 'eraser',
  createdAt: number,
}
// index by createdAt

scenes: {                        // saved layouts
  name: string,
  layers: [/* full layer snapshots */],
  strokes: [/* optional snapshot */] | null,
  thumbnail: Id<'_storage'> | null,
  createdAt: number,
}

signaling: {                     // WebRTC handshake relay
  sessionId: string,             // also used as URL secret for /share
  sourceType: 'camera' | 'screen', // pre-set by admin; publisher page respects it
  hasAudio: boolean,             // request audio track? (tab/system audio for screen)
  publisherSdp: string | null,
  viewerSdp: string | null,
  publisherCandidates: string[],
  viewerCandidates: string[],
  status: 'waiting' | 'live' | 'ended',
  publisherUserAgent: string | null, // for admin info
  startedAt: number | null,
  createdAt: number,
}

config: {                        // single row, key/value
  adminSecretHash: string,       // sha256 of the admin URL secret
  // ...future settings
}
```

**Multi-instance design:** layers reference contents by id. Placing the same component twice = two `layers` rows pointing to the same `contentId`. Editing the content (e.g. todo items, clock format) updates everywhere. Per-instance tweaks (e.g. one video muted, one not) live in `layers.overrides`.

---

## 5. Routes

```
/                  → Display (canvas viewer, fullscreen, no controls)
/admin             → Admin (gated by URL hash secret)
/share             → Stream publisher (camera or screen, gated by hash session id)
/health            → Public JSON: { status, lastSeen, displayVersion }
                     for monitoring; no PII
```

Convex backend functions live in `/convex/*.ts` — not HTTP routes, called via the typed client.

---

## 6. Core features

### 6.1 Layered canvas
- Coordinates as 0..1 fractions → resolution-independent.
- z-index integer per layer; "bring to front / send to back / +1 / -1" buttons.
- Drag, resize (8 handles, optional aspect-lock), rotate, opacity, lock, hide.
- Snap to canvas edges, center, and other layers within 8px tolerance.
- Multi-select with `Shift+click` → group move.
- Keyboard: arrows nudge 1px, `Shift+arrows` 10px, `Delete` removes, `L` lock, `H` hide, `[`/`]` z-order.

### 6.2 Drawable whiteboard
- Strokes live behind all layers (display has implicit z-index 0 for SVG; layers are 1+).
- Tools: pen, highlighter (multiply blend, 40% opacity), eraser (whole-stroke).
- Color swatches + custom picker; width slider 1–30px.
- Undo (last stroke), Clear board (with confirm).
- Pressure support via Pointer Events API → iPad + Apple Pencil works natively.
- `perfect-freehand` produces SVG path data per stroke.

### 6.3 Multi-instance components
Same `contentId`, multiple `layers` rows. Examples:
- Two clocks showing different timezones → two `clock` content rows, two layers.
- Same clock at two sizes → ONE `clock` content row, two layers.
- One stream (camera or screen) mirrored at two positions → one content, two layers, one peer connection, two `<video>` elements sharing the same `MediaStream`. No extra bandwidth.
- One uploaded video looping in three corners → browser caches the file, three independent `<video>` elements.
- Camera feed AND screen share at the same time → two separate `stream` contents, two sessions, two publisher tabs/devices.

### 6.4 Saved scenes
- Snapshot all layers (and optionally strokes) → store as a `scenes` row.
- Apply a scene → replace current layers with snapshot atomically.
- Generate thumbnail from admin canvas via `html-to-image` on save.
- Foundation for the "playlist" feature (timed scene rotation) in phase 9.

### 6.5 Realtime sync
Convex `useQuery` is reactive — every component using it re-renders when underlying data changes. We add throttling for two high-frequency cases:

- **Layer drag** → local optimistic state at 60fps; mutation every 100ms; final on release.
- **Stroke drawing** → same pattern; one row per stroke, `patch`-ed as it grows.

Everything else (z-order, opacity, content edit, scene apply) is single-shot and immediate.

### 6.6 Remote streams (camera + screen)

One pipeline, two sources. The publisher page reads `sourceType` from its session row and calls the matching browser API:

| Source | Browser API | OS prompt | Mobile support |
|---|---|---|---|
| Camera | `navigator.mediaDevices.getUserMedia({video: true, audio: hasAudio})` | Camera permission dialog | iOS Safari + Android Chrome ✅ |
| Screen | `navigator.mediaDevices.getDisplayMedia({video: true, audio: hasAudio})` | OS picker: choose monitor / window / Chrome tab | iOS Safari 16+ (limited), Android Chrome ✅ |

**Flow (identical for both):**
1. Admin picks layer type — "Add Camera" or "Add Screen".
2. Convex mutation creates a `signaling` row with the chosen `sourceType` and a fresh `sessionId`. A `stream` content + layer is also created and placed on the canvas (showing a "waiting…" placeholder).
3. Admin sees a panel with the `/share#s=<sessionId>` URL **and** a QR code. Sends to whoever has the source device.
4. Publisher opens link → page sees `sourceType=camera` or `sourceType=screen` from the session and calls the matching API → user grants permission / picks screen.
5. `simple-peer` initiator creates SDP offer → mutation writes `publisherSdp` + `publisherUserAgent`.
6. Display's reactive query observes the offer → creates non-initiator peer → answer back via mutation.
7. ICE candidates appended to arrays in same row.
8. Once connected, `signaling.status = 'live'`, `startedAt = Date.now()`. Video flows P2P (Convex out of the path).
9. Layer placeholder swaps to `<video autoplay playsinline>` with `srcObject = stream`.

**Audio handling:**
- Camera: includes microphone audio if `hasAudio: true`.
- Screen on Chrome: `audio: true` captures **tab audio** (when sharing a tab) or **system audio** (when sharing a screen, only on macOS/Win/ChromeOS — Linux limited). Safari and Firefox don't capture screen audio.
- Display unmutes the `<video>` only if admin opts in per layer (avoids autoplay-with-sound block).

**"Stop sharing" handling:**
- Browser shows a floating "Stop sharing" toolbar during `getDisplayMedia` capture. When the user clicks it, the track fires `ended`. Publisher catches that event → mutation sets `status = 'ended'` → display swaps the video back to a "stream ended" placeholder. Layer remains so admin can restart by reusing the session URL.

**Reconnect:**
- `iceconnectionstate === 'failed'` → publisher recreates the peer and re-signals. Same sessionId is reused; display picks up the new offer automatically.

**Multi-instance**: a `stream` content placed on N layers = ONE peer connection on the display, N `<video>` elements sharing the same `MediaStream`. No extra bandwidth.

**Combining camera + screen**: open `/share` on two devices (or two tabs) for two separate sessions; both layers can sit on the canvas simultaneously — e.g., a screen share filling the canvas with the presenter's camera in a corner.

### 6.7 No-auth admin (URL secret)
- On first run, server generates a random 32-char secret; stores `sha256(secret)` in `config.adminSecretHash`.
- Admin URL: `https://screeen.app/admin#k=<secret>`. Hash never sent to server in HTTP requests.
- Admin client reads hash, passes secret with every mutation.
- Each mutation calls `assertAdmin(ctx, secret)` which compares `sha256(secret)` to stored hash.
- Display queries are unauthenticated read-only.
- "Rotate secret" button regenerates → invalidates old admin links.

---

## 7. Layer types catalog

| Type | Payload fields | Notes |
|---|---|---|
| **website** | `url` | Rendered as `<iframe>`. Detect `X-Frame-Options` blocking → admin warning. |
| **video** | `source: 'url' \| 'upload'`, `url \| storageId`, `loop`, `muted`, `autoplay` | YouTube/Vimeo URLs auto-converted to `/embed/`. Uploads via Convex storage. |
| **image** | `source`, `url \| storageId`, `fit: 'cover' \| 'contain' \| 'fill'` | |
| **text** | `text`, `fontFamily`, `fontSize`, `fontWeight`, `color`, `align`, `padding`, `bgColor`, `borderRadius` | Markdown? skip v1 — plain text only. |
| **stream** | `sessionId`, `sourceType: 'camera' \| 'screen'`, `hasAudio`, `unmuted`, `mirror` (camera only), `objectFit: 'cover' \| 'contain'` | References a `signaling` row. Same renderer for camera and screen — only the publisher API differs. |
| **clock** | `format: '12h'\|'24h'`, `showSeconds`, `showDate`, `dateFormat`, `timezone`, typography | Local interval; no Convex traffic to tick. |
| **todo** | `title`, `items: [{id,text,done}]`, `showCompleted`, `strikethroughDone`, typography, `accentColor` | Admin-only edits. |
| **pdf** | `storageId`, `page` | Rendered with `pdf.js`; admin can flip pages. |
| **qr** | `data` (URL or text), `fgColor`, `bgColor`, `logoStorageId?` | Useful for "scan to view menu" use cases. |
| **countdown** | `targetIso`, `format: 'dhms'\|'hms'\|'ms'`, `expiredText`, typography | Local tick. |
| **weather** | `lat`, `lon`, `units`, `style: 'compact'\|'detailed'` | Open-Meteo (free, no key). Hourly poll cached server-side. |
| **iframe-html** | `html` (raw HTML/CSS) | Sandboxed iframe with inline content; for one-off custom widgets. Admin-only since arbitrary code. |

---

## 8. Drawing system in detail

```
┌──────────────────────────────────────────────────────┐
│ Admin /admin                                         │
│  ┌────────────────────────────────────────────┐      │
│  │ Toolbar: Select | Pen | Highlight | Eraser │      │
│  │          Color swatches | Width slider     │      │
│  │          Undo | Clear                      │      │
│  └────────────────────────────────────────────┘      │
│  ┌────────────────────────────────────────────┐      │
│  │ Canvas (16:9 aspect-locked, white bg)      │      │
│  │  - Strokes layer (SVG)                     │      │
│  │  - Layers (positioned divs)                │      │
│  │  - In Pen mode: pointer events go to       │      │
│  │    drawing handler; layer drag is disabled │      │
│  └────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────┘
```

**Stroke flow:**
1. `pointerdown` (in pen mode) → start collecting points in local React state.
2. `pointermove` → append point with pressure.
3. Every 100ms while moving → mutation: upsert partial stroke to Convex.
4. `pointerup` → final mutation with complete stroke.
5. Display's reactive query renders all strokes via `<polyline>` (or path data from `perfect-freehand`).

**Eraser:** point-in-path hit test on `pointerdown`; delete the matched stroke row.

**Performance ceiling:** SVG renders ~5k strokes smoothly. Beyond that, batch-flatten old strokes onto a `<canvas>` snapshot. Not v1.

---

## 9. WebRTC pipeline (camera + screen)

```
  Publisher (/share#s=…)          Convex (signaling)            Display (/)
  ──────────────────              ──────────────────            ────────────
  read session.sourceType
  if 'camera' → getUserMedia()
  if 'screen' → getDisplayMedia()
  new SimplePeer({initiator:true, stream})
  on 'signal' (offer)         →   patch publisherSdp           →   useQuery sees offer
                                                                    new SimplePeer({initiator:false})
                                                                    on 'signal' (answer)
                              ←   patch viewerSdp              ←
  setRemoteDescription
  ICE candidates              ⇄   append to arrays             ⇄   ICE candidates
  ─────────── once 'connect' fires, P2P stream flows ───────────
  video → display via attached <video>.srcObject = stream

  on track.ended (user clicks "Stop sharing"):
    mutation: status = 'ended'                                  →   useQuery → swap to placeholder
```

**Track constraints applied at publisher:**
- Camera: `{ video: { width: {ideal: 1280}, height: {ideal: 720}, facingMode: 'user' }, audio: hasAudio }`
- Screen: `{ video: { frameRate: {ideal: 30, max: 60} }, audio: hasAudio }`
  - Picker is OS-level; we can't pick which screen for the user.

**Multi-instance**: when N layers reference the same `sessionId`, the display creates ONE `RTCPeerConnection`, attaches the resulting `MediaStream` to all N `<video>` elements. Bandwidth is paid once.

---

## 10. Admin UX

```
┌────────────────────────────────────────────────────────────────────┐
│ screeen ▸ admin                                          [Settings]│
├──────────┬─────────────────────────────────────────────┬───────────┤
│ Tools    │                                             │ Inspector │
│  Select  │                                             │ ────────  │
│  Pen     │                                             │ Layer:    │
│  Hilite  │       Canvas (16:9, mirrors display)        │  Clock 1  │
│  Eraser  │                                             │ Position  │
│ ────     │                                             │  x: 0.4   │
│ Library  │                                             │  y: 0.1   │
│  Add ▾   │                                             │ Size      │
│ • Clock  │                                             │  w: 0.2   │
│ • Todo   │                                             │  h: 0.1   │
│ • Web…   │                                             │ Z-order   │
│ • Cam…   │                                             │  [↑][↓]   │
│          │                                             │ Opacity ▬ │
│ Scenes   │                                             │ Rotation° │
│  Save    │                                             │ Lock ☐    │
│ • Lobby  │                                             │ Visible ☑ │
│ • Demo   │                                             │           │
│          │                                             │ Content   │
│          │                                             │ (clock)   │
│          │                                             │  format ▾ │
│          │                                             │  tz ▾     │
└──────────┴─────────────────────────────────────────────┴───────────┘
```

- **Left sidebar**: tool picker, content library, scene list.
- **Center**: WYSIWYG canvas, aspect-ratio locked to display.
- **Right sidebar**: inspector for selected layer; bottom half edits the underlying content.
- **Top bar**: settings (rotate admin secret, set display background, manage uploads).
- **Bottom-status**: connection state to display (heartbeat indicator).

---

## 11. Display UX

- Pure render, no chrome.
- On first load, shows a centered "Enter fullscreen" button (browsers require user gesture).
- After fullscreen, button disappears. Cursor auto-hides after 3s of no movement.
- Press `F` toggles fullscreen, `R` reloads, `C` shows cursor temporarily.
- Heartbeat: every 30s posts `{ lastSeen: Date.now(), agent: navigator.userAgent }` to a Convex mutation; admin sees online/offline indicator.
- Error boundary: any layer that crashes shows a small red badge at its corner instead of breaking the whole display.

---

## 12. Security

- **Admin gate**: URL hash secret + sha256 server check. Adequate for low-risk personal use; not bank-grade.
- **CSP** on display + admin: `default-src 'self'; frame-src *; img-src * data:; media-src * blob:; script-src 'self' 'unsafe-inline'` — iframes need wildcard, but XSS is constrained.
- **Iframe sandbox** for `iframe-html` content: `<iframe sandbox="allow-scripts">` (no `allow-same-origin` → can't access parent).
- **Camera signaling**: sessionId is the secret; expires after `status='closed'` or 1h idle.
- **File uploads**: Convex generates short-lived upload URLs; max 100MB per file by default; admin-only mutation gate.
- **Rate limit**: Convex functions naturally cap free-tier abuse; add explicit per-IP throttle if we expose more endpoints later.

---

## 13. Performance

| Concern | Budget | Mitigation |
|---|---|---|
| Layer count | 30 mixed types | Browser GPU compositor handles this; flag warning at 30+ |
| Concurrent videos | ~4 | Browsers throttle hardware decoders; warn in admin |
| Strokes | 5,000 | SVG fine; flatten beyond |
| Convex calls during drag | ~10/sec/admin | Throttled mutations; well under free-tier limits |
| WebRTC bitrate | ~1.5 Mbps for 720p30 | STUN-only path; TURN if NAT-blocked |
| Display memory | <500MB ideally | Revoke `URL.createObjectURL` for upload previews; lazy-load offscreen iframes |

---

## 14. Build phases

| # | Phase | Outcome |
|---|---|---|
| 1 | **Scaffold**: Next.js 15 + Convex + Tailwind + shadcn; Vercel deploy; CI on push | URL is live; empty pages |
| 2 | **Schema + admin secret + content library CRUD** for `text`, `website`, `image` | Admin can create/edit/delete content rows |
| 3 | **Display canvas + admin WYSIWYG + react-moveable** drag/resize/rotate; layers schema | Drag a Text layer → display updates live |
| 4 | **Drawable whiteboard**: `perfect-freehand`, pen/highlighter/eraser, undo/clear | Draw on admin → strokes appear on display |
| 5 | **Polish layer ops**: z-order, opacity, lock, hide, snap, multi-select, keyboard shortcuts | Editor feels real |
| 6 | **Uploads + Video + Image + Clock + Todo + Countdown** | First "useful" demo: a clock layer + video + todo |
| 7 | **WebRTC streams**: signaling table + `/share` page (camera + screen) + viewer in display + QR + stop-sharing handling | Phone camera or laptop screen shows on monitor |
| 8 | **Multi-instance polish + Scenes**: snapshot/apply layouts, thumbnails | Two clocks at once; save & restore layouts |
| 9 | **Extras**: PDF, QR widget, Weather, RSS ticker, Audio | Catalog complete |
| 10 | **Production polish**: kiosk launch script, CSP, error boundaries, heartbeat, README | Ship to Vercel |

Estimated build time for one focused engineer: phases 1–7 in ~2 weeks; full plan in ~3–4 weeks.

---

## 15. Future features (post-v1, prioritized)

| Idea | Value | Effort | Notes |
|---|---|---|---|
| **Scene scheduling** | High | Medium | Cron-like rules: "show Lobby scene 9am–5pm, Demo otherwise". Convex scheduled functions. |
| **Multi-display** | High | Medium | Add `displayId` to layers/strokes; admin picks which display to control. |
| **PWA + offline cache** | High | Medium | Display survives wifi blips; cached layers re-render. |
| **Multi-admin with cursors** | Medium | Large | Liveblocks-style presence. Needs CRDT for stroke conflicts. |
| **Stream Deck integration** | Medium | Small | HID API in Chrome for hardware scene-switch buttons. |
| **Audio layer** | Medium | Small | `<audio>` background track while videos play muted. |
| **Spotify now-playing** | Medium | Medium | OAuth + polling; adds env vars. |
| **Public message wall** | Medium | Medium | Visitors text or web-form a message; moderated queue → display. |
| **Animations** | Medium | Medium | Layer entry/exit (fade, slide, scale). Framer Motion. |
| **Templates / starter scenes** | Low | Small | Bundled "lobby clock", "menu board", "kiosk attract". |
| **Voice control** | Low | Medium | Web Speech API on admin: "switch to demo scene". |
| **Screen recording export** | Low | Medium | `MediaRecorder` on display; download mp4. |
| **Edit history / undo stack** | Low | Large | Beyond stroke-undo; full action log with rewind. |
| **Mobile admin** | Low | Medium | Responsive admin layout; canvas pinch-zoom. |
| **Webhook triggers** | Low | Small | POST → Convex HTTP action → swap scene. Useful for IFTTT/Zapier. |

---

## 16. Costs (as of 2026-05)

| Service | Tier | Limits | Cost |
|---|---|---|---|
| Vercel | Hobby | 100GB bandwidth, no commercial use | $0 |
| Convex | Free | 1M function calls/mo, 1GB storage, 8GB bandwidth | $0 |
| Domain | Optional | screeen.app | ~$30/yr |
| TURN (Twilio NTS) | Pay-as-go | $0.40 / GB relayed | $0–10/mo if needed |
| Open-Meteo (weather) | Free, no key | 10k req/day | $0 |

**Expected spend at v1 launch: $0/month.** Domain optional.

If usage grows: Vercel Pro ($20/mo) for commercial use; Convex Pro ($25/mo) for higher caps.

---

## 17. Repository layout

```
screeen/
├── app/
│   ├── page.tsx                  # / (display)
│   ├── admin/page.tsx            # /admin
│   ├── share/page.tsx            # /share (camera + screen publisher)
│   ├── health/route.ts           # /health JSON
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── canvas/
│   │   ├── DisplayCanvas.tsx     # render-only
│   │   ├── AdminCanvas.tsx       # WYSIWYG editor
│   │   ├── Layer.tsx             # one layer router → renderer
│   │   ├── StrokeLayer.tsx       # SVG strokes
│   │   └── ResizableLayer.tsx    # react-moveable wrapper
│   ├── renderers/                # one file per content type
│   │   ├── WebsiteRenderer.tsx
│   │   ├── VideoRenderer.tsx
│   │   ├── ImageRenderer.tsx
│   │   ├── TextRenderer.tsx
│   │   ├── StreamRenderer.tsx        # camera + screen (same component)
│   │   ├── ClockRenderer.tsx
│   │   ├── TodoRenderer.tsx
│   │   ├── PdfRenderer.tsx
│   │   ├── QrRenderer.tsx
│   │   ├── CountdownRenderer.tsx
│   │   └── WeatherRenderer.tsx
│   ├── admin/
│   │   ├── Toolbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Inspector.tsx
│   │   ├── Library.tsx
│   │   └── ScenesPanel.tsx
│   └── ui/                       # shadcn primitives
├── convex/
│   ├── schema.ts
│   ├── display.ts                # display row mutations/queries
│   ├── contents.ts
│   ├── layers.ts
│   ├── strokes.ts
│   ├── scenes.ts
│   ├── signaling.ts
│   ├── files.ts
│   ├── auth.ts                   # assertAdmin helper
│   └── _generated/               # convex codegen
├── lib/
│   ├── coords.ts                 # 0..1 ↔ px helpers
│   ├── throttle.ts               # rAF + interval throttler
│   ├── webrtc.ts                 # simple-peer wiring
│   ├── perfect-freehand.ts       # stroke-to-path
│   └── secret.ts                 # admin URL secret read/check
├── stores/
│   └── editor.ts                 # Zustand: tool, selection, drag state
├── public/
├── scripts/
│   └── kiosk.sh                  # launch Chrome in kiosk mode
├── plan.md                       # this file
├── README.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

---

## 18. Kiosk launch (laptop side)

```sh
# scripts/kiosk.sh
#!/usr/bin/env bash
URL="${1:-https://screeen.vercel.app}"
open -na "Google Chrome" --args \
  --kiosk \
  --app="$URL" \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --autoplay-policy=no-user-gesture-required
```

Add to macOS Login Items so the display auto-launches on boot.

---

## 19. Open questions (defer until building)

- Default size & position of newly-added layers? Probably center, 30% × 30%.
- Stroke order vs layer order — strokes always behind layers in v1. Future: stroke layers interleaved.
- Should admin canvas show a faint "TV-safe" margin (5% inset) to remind that overscan can crop edges? Cheap to add.
- Time of cursor auto-hide on display: 3s feels right; tunable.
- Per-instance overrides UI — show only when user clicks "edit just this instance" on a layer? Avoids confusing the shared-content model.

---

## 20. Definition of done (v1)

- [ ] Vercel deploys on push to main
- [ ] Convex schema migrated and seeded with one display row
- [ ] `/` renders fullscreen with white background
- [ ] `/admin#k=<secret>` lets you add Website/Text/Image/Clock/Todo/Video/Camera/Screen layers
- [ ] Drag, resize, rotate, z-order all sync to display under 200ms
- [ ] Pen, highlighter, eraser, undo, clear all sync
- [ ] Same content placed twice → both instances render correctly
- [ ] Phone opens `/share#s=...` → camera appears on display within 5s
- [ ] Laptop opens `/share#s=...` → screen share appears on display within 5s; Stop-sharing handled gracefully
- [ ] Save scene, apply scene → full layout swap
- [ ] Display heartbeat shown in admin
- [ ] Kiosk script in repo + README explains setup
