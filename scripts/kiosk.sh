#!/usr/bin/env bash
# Launch Chrome in kiosk mode pointed at the screeen display.
# Usage: ./scripts/kiosk.sh https://your-deployment.vercel.app
#
# macOS uses `open -na`; Linux falls back to `google-chrome`.

URL="${1:-http://localhost:3000}"

if [[ "$OSTYPE" == "darwin"* ]]; then
  open -na "Google Chrome" --args \
    --kiosk \
    --app="$URL" \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-features=TranslateUI \
    --autoplay-policy=no-user-gesture-required
else
  google-chrome \
    --kiosk \
    --app="$URL" \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-features=TranslateUI \
    --autoplay-policy=no-user-gesture-required &
fi
