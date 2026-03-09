# Meme Soundboard

Static meme soundboard with:

- responsive card grid
- one-tap sound playback
- installable PWA basics
- zero build step for Cloudflare Pages

## Local development

Because this project uses a service worker, serve it over a local web server instead of opening `index.html` directly.

### Option 1: Python

```bash
python -m http.server 4173
```

### Option 2: Node

```bash
npx serve .
```

Then open `http://localhost:4173`.

## Customize the memes

1. Replace the placeholder images in `public/media`.
2. Update the entries in `src/memes.js`.
3. If you switch from generated sounds to real audio files, replace the `sound` object with an audio file path and update `src/app.js` accordingly.

## Deploy to Cloudflare Pages

1. Push this repository to GitHub.
2. In Cloudflare Pages, create a new project from the GitHub repo.
3. Use these settings:
   - Framework preset: `None`
   - Build command: leave empty
   - Build output directory: `/`
4. After the first deploy, add the custom domain `meme.luiscarlo.com`.
5. In Cloudflare DNS, ensure the subdomain is delegated to Pages as prompted.

## Optional GitHub Pages deployment

This project is static, so GitHub Pages also works if you prefer to host there and then proxy through Cloudflare.
