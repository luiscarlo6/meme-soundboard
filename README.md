# Meme Soundboard

Static meme soundboard with:

- responsive card grid
- one-tap sound playback
- share to WhatsApp (image + audio)
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

## Share to WhatsApp

Every meme card and detail page has a green **Share** button.

- On mobile (Android/iOS): tapping **Share** invokes the native share sheet so you can pick WhatsApp directly. When the meme has an audio file the sheet attaches both the image and the MP3, so the recipient can see the GIF and play the sound right from their inbox.
- On desktop or browsers that don't support file-sharing via the Web Share API: tapping **Share** opens `https://wa.me/` in a new tab pre-filled with the meme title and a link to the detail page.

## Customize the memes

The catalog now lives in `data/memes.json` and media files live in `public/media`.

### Manual edits

1. Add the media files to `public/media`.
2. Add an entry to `data/memes.json`.

### Automated ingest

You can also add a meme from direct asset URLs with:

```bash
node scripts/add-meme.mjs
```

The script reads these environment variables:

- `MEME_TITLE`
- `MEME_DESCRIPTION`
- `MEME_GIF_URL`
- `MEME_AUDIO_URL`
- `MEME_BUTTON_LABEL` (optional)

It downloads the files, stores them in `public/media`, and updates `data/memes.json`.

## GitHub request flow

The repo includes a GitHub Action that listens for `/add-meme` requests in:

- new issues
- edited issues
- issue comments

Use direct asset URLs only. A valid request looks like:

```text
/add-meme
title: Dramatic Fail
description: Para cuando todo sale mal.
gif_url: https://example.com/file.gif
audio_url: https://example.com/file.mp3
button_label: Play fail
```

When the workflow succeeds, it opens a pull request with the downloaded assets and catalog update.

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
