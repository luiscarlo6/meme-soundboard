const grid = document.querySelector("#soundboardGrid");
const template = document.querySelector("#cardTemplate");
const installButton = document.querySelector("#installButton");
const dataEndpoint = "./data/memes.json";

let audioContext;
let deferredPrompt;
const audioCache = new Map();

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
  let audio = audioCache.get(source);

  if (!audio) {
    audio = new Audio(source);
    audio.preload = "auto";
    audioCache.set(source, audio);
  }

  audio.currentTime = 0;
  await audio.play();
};

const renderCards = (memes) => {
  const fragment = document.createDocumentFragment();

  memes.forEach((meme) => {
    const card = template.content.firstElementChild.cloneNode(true);
    const image = card.querySelector("img");
    const title = card.querySelector("h3");
    const description = card.querySelector("p");
    const button = card.querySelector(".play-button");

    image.src = meme.image;
    image.alt = meme.title;
    title.textContent = meme.title;
    description.textContent = meme.description;
    button.textContent = meme.buttonLabel;

    button.addEventListener("click", async () => {
      button.classList.add("is-playing");
      if (meme.audio) {
        await playAudioFile(meme.audio);
      } else {
        await playTone(meme.sound);
      }
      window.setTimeout(() => button.classList.remove("is-playing"), 160);
    });

    const cardLink = card.querySelector(".meme-card-link");
    const memeUrl = `meme.html#${encodeURIComponent(meme.id)}`;

    cardLink.href = memeUrl;

    fragment.appendChild(card);
  });

  grid.appendChild(fragment);
};

const renderErrorState = (message) => {
  grid.innerHTML = `<p class="empty-state">${message}</p>`;
};

const loadMemes = async () => {
  const response = await fetch(dataEndpoint, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to load meme catalog: ${response.status}`);
  }

  return response.json();
};

const setupInstallPrompt = () => {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installButton.hidden = false;
  });

  installButton.addEventListener("click", async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installButton.hidden = true;
  });
};

const registerServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("./service-worker.js");
  } catch (error) {
    console.error("Service worker registration failed", error);
  }
};

const bootstrap = async () => {
  try {
    const memes = await loadMemes();
    renderCards(memes);
  } catch (error) {
    console.error(error);
    renderErrorState("Could not load the meme catalog.");
  }

  setupInstallPrompt();
  registerServiceWorker();
};

bootstrap();
