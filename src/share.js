export const shareMeme = async (meme, memeUrl, resolveAssetUrl) => {
  if (meme.audio && navigator.share && navigator.canShare) {
    try {
      const [imageRes, audioRes] = await Promise.all([
        fetch(resolveAssetUrl(meme.image)),
        fetch(resolveAssetUrl(meme.audio)),
      ]);
      const [imageBlob, audioBlob] = await Promise.all([
        imageRes.blob(),
        audioRes.blob(),
      ]);
      const files = [
        new File([imageBlob], meme.image.split("/").pop(), { type: imageBlob.type }),
        new File([audioBlob], meme.audio.split("/").pop(), { type: audioBlob.type }),
      ];
      const fileShareData = { files, title: meme.title, text: meme.description };
      if (navigator.canShare(fileShareData)) {
        await navigator.share(fileShareData);
        return;
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("File share failed, falling back", err);
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({ title: meme.title, text: meme.description, url: memeUrl });
      return;
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Web Share failed, falling back to WhatsApp link", err);
    }
  }

  const waText = encodeURIComponent(`${meme.title} — ${memeUrl}`);
  window.open(`https://wa.me/?text=${waText}`, "_blank", "noopener,noreferrer");
};
