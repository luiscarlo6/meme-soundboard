import { shareMeme } from "./share.js";

const detail = document.querySelector("#memeDetail");
const dataEndpoint = new URL("../data/memes.json", import.meta.url);

let audioContext;
const audioCache = new Map();
let currentAudio = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new window.AudioContext();
  }

  return audioContext;
};

const playTone = async (sound) => {
  const context = getAudioContext();

  if (context.state === "suspended") {
    await context.resume();
  }

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = sound.type;
  oscillator.frequency.setValueAtTime(sound.frequency, now);
  oscillator.frequency.linearRampToValueAtTime(
    Math.max(80, sound.frequency + sound.wobble),
    now + sound.duration
  );

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + sound.duration);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + sound.duration + 0.05);
};

const playAudioFile = async (source) => {
  if (currentAudio && !currentAudio.paused) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  let audio = audioCache.get(source);

  if (!audio) {
    audio = new Audio(source);
    audio.preload = "auto";
    audioCache.set(source, audio);
  }

  currentAudio = audio;
  audio.currentTime = 0;
  await audio.play();
};

const resolveAssetUrl = (assetPath) => new URL(`../${assetPath}`, import.meta.url).href;

const renderMeme = (meme) => {
  const article = document.createElement("article");
  article.className = "meme-detail";

  const frame = document.createElement("div");
  frame.className = "media-frame meme-detail-frame";

  const img = document.createElement("img");
  img.src = resolveAssetUrl(meme.image);
  img.alt = meme.title;
  img.loading = "lazy";
  frame.appendChild(img);

  const info = document.createElement("div");
  info.className = "meme-detail-info";

  const h1 = document.createElement("h1");
  h1.className = "meme-detail-title";
  h1.textContent = meme.title;

  const desc = document.createElement("p");
  desc.className = "meme-detail-description";
  desc.textContent = meme.description;

  const button = document.createElement("button");
  button.className = "play-button";
  button.type = "button";
  button.textContent = meme.buttonLabel;

  button.addEventListener("click", async () => {
    button.classList.add("is-playing");
    if (meme.audio) {
      await playAudioFile(resolveAssetUrl(meme.audio));
    } else {
      await playTone(meme.sound);
    }
    window.setTimeout(() => button.classList.remove("is-playing"), 160);
  });

  const shareButton = document.createElement("button");
  shareButton.className = "share-button";
  shareButton.type = "button";
  shareButton.setAttribute("aria-label", "Share on WhatsApp");
  shareButton.textContent = "Share";

  shareButton.addEventListener("click", async () => {
    shareButton.classList.add("is-sharing");
    shareButton.disabled = true;
    try {
      await shareMeme(meme, window.location.href, resolveAssetUrl);
    } finally {
      shareButton.classList.remove("is-sharing");
      shareButton.disabled = false;
    }
  });

  info.appendChild(h1);
  info.appendChild(desc);
  info.appendChild(button);
  info.appendChild(shareButton);

  article.appendChild(frame);
  article.appendChild(info);

  detail.appendChild(article);
};

const renderNotFound = () => {
  const p = document.createElement("p");
  p.className = "empty-state";
  p.textContent = "Meme not found.";
  detail.appendChild(p);
};

const bootstrap = async () => {
  const id = decodeURIComponent(window.location.hash.slice(1)).trim();

  if (!id) {
    renderNotFound();
    return;
  }

  try {
    const response = await fetch(dataEndpoint, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Failed to load meme catalog: ${response.status}`);
    }

    const memes = await response.json();
    const meme = memes.find((m) => m.id === id);

    if (meme) {
      document.title = `${meme.title} — Meme Soundboard`;
      renderMeme(meme);
    } else {
      renderNotFound();
    }
  } catch (error) {
    console.error(error);
    renderNotFound();
  }
};

bootstrap();
