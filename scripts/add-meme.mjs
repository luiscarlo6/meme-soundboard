import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

const catalogPath = "data/memes.json";
const mediaDirectory = "public/media";
const allowedImageTypes = new Map([
  ["image/gif", ".gif"],
  ["image/webp", ".webp"],
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"]
]);
const allowedAudioTypes = new Map([
  ["audio/mpeg", ".mp3"],
  ["audio/mp3", ".mp3"],
  ["audio/wav", ".wav"],
  ["audio/x-wav", ".wav"],
  ["audio/ogg", ".ogg"]
]);

const requiredEnv = [
  "MEME_TITLE",
  "MEME_DESCRIPTION",
  "MEME_GIF_URL",
  "MEME_AUDIO_URL"
];

const getEnv = (name) => process.env[name]?.trim() ?? "";

const slugify = (value) =>
  value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const ensureRequiredEnv = () => {
  const missing = requiredEnv.filter((name) => !getEnv(name));

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
};

const inferExtensionFromUrl = (url) => {
  const parsedUrl = new URL(url);
  const extension = extname(parsedUrl.pathname).toLowerCase();
  return extension || "";
};

const downloadAsset = async ({ url, allowedTypes, fallbackExtension, fileBaseName }) => {
  const response = await fetch(url, {
    headers: {
      "user-agent": "meme-soundboard-bot/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
  const extensionFromType = allowedTypes.get(contentType);
  const extensionFromUrl = inferExtensionFromUrl(url);
  const hasAllowedUrlExtension = Array.from(allowedTypes.values()).includes(extensionFromUrl);
  const canTrustUrlExtension =
    !contentType ||
    contentType === "application/octet-stream" ||
    contentType === "binary/octet-stream";
  const extension =
    extensionFromType ||
    (hasAllowedUrlExtension && canTrustUrlExtension ? extensionFromUrl : "") ||
    fallbackExtension;

  if (!extensionFromType && !(hasAllowedUrlExtension && canTrustUrlExtension)) {
    throw new Error(`Unsupported asset type for ${url}. Received content-type: ${contentType || "unknown"}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = `${fileBaseName}${extension}`;
  const filePath = join(mediaDirectory, fileName);

  await writeFile(filePath, buffer);

  return {
    fileName,
    filePath: filePath.replace(/\\/g, "/")
  };
};

const main = async () => {
  ensureRequiredEnv();

  const title = getEnv("MEME_TITLE");
  const description = getEnv("MEME_DESCRIPTION");
  const gifUrl = getEnv("MEME_GIF_URL");
  const audioUrl = getEnv("MEME_AUDIO_URL");
  const buttonLabel = getEnv("MEME_BUTTON_LABEL") || `Play ${title}`;
  const slug = slugify(title);

  if (!slug) {
    throw new Error("Could not derive a valid slug from MEME_TITLE.");
  }

  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));

  if (catalog.some((entry) => entry.id === slug)) {
    throw new Error(`A meme with id "${slug}" already exists in ${catalogPath}.`);
  }

  await mkdir(mediaDirectory, { recursive: true });

  const imageAsset = await downloadAsset({
    url: gifUrl,
    allowedTypes: allowedImageTypes,
    fallbackExtension: ".gif",
    fileBaseName: slug
  });

  const audioAsset = await downloadAsset({
    url: audioUrl,
    allowedTypes: allowedAudioTypes,
    fallbackExtension: ".mp3",
    fileBaseName: `${slug}-audio`
  });

  const nextEntry = {
    id: slug,
    title,
    description,
    image: imageAsset.filePath,
    buttonLabel,
    audio: audioAsset.filePath,
    source: {
      gifUrl,
      audioUrl
    },
    createdAt: new Date().toISOString().slice(0, 10)
  };

  catalog.push(nextEntry);
  catalog.sort((left, right) => left.title.localeCompare(right.title));

  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);

  process.stdout.write(
    `Added ${title} with image ${basename(imageAsset.fileName)} and audio ${basename(audioAsset.fileName)}.\n`
  );
};

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
