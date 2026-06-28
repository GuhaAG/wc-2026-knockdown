# WC 2026 Knockout Predictor

Fill in your FIFA World Cup 2026 knockout bracket (Round of 32 → Final, plus the
3rd-place playoff), then share it with friends via a single URL — no login, no
accounts. Predictions are scored against live results from TheSportsDB.

## How it works
- Your whole prediction is encoded in the URL after `#`. Share the link; whoever
  opens it sees your bracket. Nothing is stored on a server.
- Real results are fetched from TheSportsDB (free, keyless). Matches not yet
  decided show as pending; correct/incorrect picks are marked once known.

## Scoring
Round-weighted per correct advancing pick: R32=1, R16=2, QF=4, SF=8, Final=16,
3rd-place=2.

## Develop
- `npm test` runs the unit tests (Node ≥ 18, no dependencies).
- Serve locally: `python3 -m http.server 8000` then open http://localhost:8000/

## Deploy
Hosted on GitHub Pages from the `main` branch root. See repository Settings → Pages.
