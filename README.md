# Demo Frontend Notes

## Files

- `index.html`: static demo page entry
- `styles.css`: page styling
- `app.js`: rendering logic
- `demo-data.js`: placeholder sample metadata, SI-SNRi values, and audio paths

## How to use real outputs later

1. Export real wav files and SI-SNRi scores with the evaluation script.
2. Put audio assets under a directory structure that matches your preferred paths.
3. Update `demo-data.js`:
   - `references.*.path`
   - `subsets[*].audio.target-1`
   - `subsets[*].audio.target-2`
   - `subsets[*].targetScores`
   - `subsets[*].meanSiSnri`
   - set `available: true` when the wav file exists

## Suggested local preview

Open `index.html` directly, or run a simple static server from `paper_demo/web`.
