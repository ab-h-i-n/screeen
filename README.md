# screeen

A web-based digital signage system. One laptop drives an external monitor in fullscreen kiosk mode, displaying a layered, drawable canvas. A separate admin web UI controls the canvas in real time — drag content, draw on the whiteboard, swap layouts, stream a remote camera or screen.

See [plan.md](./plan.md) for the full design.

## Features

- **Drawable whiteboard** as the default surface (white bg + pen / highlighter / eraser, pressure support on iPad/stylus)
- **Layered canvas** with drag, resize, rotate, opacity, lock, hide, z-order, snap-to-edges
- **Layer types**: Website, Video (YouTube/Vimeo/upload), Image, Text, Clock, Todo, Camera, Screen, Countdown, QR code, Weather, Custom HTML
- **Multi-instance**: place the same content multiple times, edit once, all update
- **Remote streams**: WebRTC pipe for both camera and screen sharing, with QR-code share link
- **Saved scenes**: snapshot a layout, restore later
- **Realtime sync**: every admin change reaches the display in <200 ms via Convex reactive queries
- **No-auth admin**: gated by an unguessable URL hash secret

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 + React 19 + TypeScript + Tailwind |
| Backend / DB | Convex (reactive queries + storage + signaling) |
| Drag/resize/rotate | `react-moveable` |
| Drawing | `perfect-freehand` + SVG |
| WebRTC | Native `RTCPeerConnection` (no Buffer polyfill) |
| State | Zustand (client) + Convex (server) |
| Hosting | Vercel (frontend) + Convex Cloud (backend) |

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Provision a Convex deployment (interactive — creates account if needed)
npx convex dev
# Copy the URL it prints into NEXT_PUBLIC_CONVEX_URL in .env.local

# 3. Generate and set an admin secret
npm run secret:gen           # prints a random 32-char string
npx convex env set ADMIN_SECRET <paste-the-string>

# 4. Run dev server
npm run dev                  # frontend on http://localhost:3000
# (keep `npx convex dev` running in another terminal)

# 5. Open the admin UI
# http://localhost:3000/admin#k=<your-secret>
#
# Open the display on your other monitor:
# http://localhost:3000/
```

## Deployment

### Frontend → Vercel

1. Push this repo to GitHub.
2. Import on Vercel; it auto-detects Next.js.
3. Add env var: `NEXT_PUBLIC_CONVEX_URL = https://your-deployment.convex.cloud`.
4. Deploy.

### Backend → Convex

```bash
npx convex deploy
npx convex env set ADMIN_SECRET <secret>   # production env
```

Update `NEXT_PUBLIC_CONVEX_URL` in Vercel to the production Convex URL after first deploy.

## Kiosk mode (display laptop)

```bash
./scripts/kiosk.sh https://your-deployment.vercel.app
```

Add it to macOS Login Items so the display auto-launches on boot.

In kiosk Chrome, the display opens in fullscreen with no UI chrome. If the URL is wrong or the display is offline, hit `Cmd+W` to close.

## Sharing camera / screen from another device

1. In admin: click **Camera** or **Screen** in the "Add new" panel — a layer is placed on the canvas.
2. Select the layer; the inspector shows a QR code and a link.
3. Open the link on the source device (phone for camera, laptop for screen). Allow the permission / pick the screen.
4. The stream appears on the display (via direct WebRTC; no relay).

If WebRTC fails to connect (some symmetric NAT setups), set up a TURN server and add to `.env.local`:
```
NEXT_PUBLIC_TURN_URL=turn:...
NEXT_PUBLIC_TURN_USER=...
NEXT_PUBLIC_TURN_CRED=...
```

## Keyboard shortcuts (admin)

| Key | Action |
|---|---|
| `Delete` / `Backspace` | Remove selected layer |
| `[` / `]` | Send backward / forward |
| `{` / `}` | Send to back / bring to front |

## Project structure

```
app/                    Next.js routes
  page.tsx              Display
  admin/page.tsx        Admin
  share/page.tsx        Camera/screen publisher
  health/route.ts       Health JSON
components/
  canvas/               DisplayCanvas, AdminCanvas, MoveableLayer, StrokeLayer, Layer router
  renderers/            One per content type
  admin/                Toolbar, Library, Inspector, ContentEditor, ScenesPanel, StreamSessionPanel, TopBar
convex/
  schema.ts             Tables (display, contents, layers, strokes, scenes, signaling)
  *.ts                  Queries + mutations
lib/
  webrtc.ts             RTCPeerConnection wrapper
  throttle.ts           Drag/draw mutation throttle
  coords.ts             Fractional ↔ pixel helpers
  secret.ts             Read URL hash secret/session
stores/editor.ts        Zustand: selected layer, current tool, pen color/width
scripts/kiosk.sh        Chrome kiosk launcher
plan.md                 Design document
```

## Troubleshooting

- **Admin shows "secret missing"** — append `#k=YOUR_SECRET` to the URL. The secret must match `ADMIN_SECRET` in Convex env.
- **Display shows "setup needed"** — `NEXT_PUBLIC_CONVEX_URL` not set in `.env.local`.
- **Camera/screen stream stays on "Waiting…"** — the publisher device hasn't completed the WebRTC handshake. Check the browser console on the publisher; common causes are blocked permissions or symmetric-NAT (need TURN).
- **YouTube video shows blank** — the URL must be a video URL; use `/watch?v=...` or `/embed/...`. The renderer auto-converts watch URLs.
- **Iframe-embedded site shows blank** — many sites set `X-Frame-Options: DENY` and refuse to render in iframes. Try a different URL.

## License

MIT
