const getSupportedVideoMimeType = () => {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
};

const createMergedVideo = (imageBlob, audioBlob) => {
  const mimeType = getSupportedVideoMimeType();
  if (!mimeType) return Promise.resolve(null);
  const baseType = mimeType.split(";")[0];

  return new Promise((resolve, reject) => {
    const imgUrl = URL.createObjectURL(imageBlob);
    const img = new Image();

    img.onload = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 320;
      canvas.height = img.naturalHeight || 320;
      const ctx = canvas.getContext("2d");

      let rafId = null;
      const drawFrame = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        rafId = requestAnimationFrame(drawFrame);
      };

      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        await audioCtx.resume();

        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        const canvasStream = canvas.captureStream(25);
        const streamDest = audioCtx.createMediaStreamDestination();
        const bufferSource = audioCtx.createBufferSource();
        bufferSource.buffer = audioBuffer;
        bufferSource.connect(streamDest);

        const combined = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...streamDest.stream.getAudioTracks(),
        ]);

        const chunks = [];
        const recorder = new MediaRecorder(combined, { mimeType });

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          cancelAnimationFrame(rafId);
          audioCtx.close();
          URL.revokeObjectURL(imgUrl);
          resolve(new Blob(chunks, { type: baseType }));
        };

        recorder.onerror = (e) => {
          cancelAnimationFrame(rafId);
          audioCtx.close();
          URL.revokeObjectURL(imgUrl);
          reject(e.error);
        };

        bufferSource.onended = () => recorder.stop();

        drawFrame();
        recorder.start();
        bufferSource.start();
      } catch (err) {
        cancelAnimationFrame(rafId);
        URL.revokeObjectURL(imgUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(imgUrl);
      reject(new Error("Image load failed"));
    };

    img.src = imgUrl;
  });
};

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

      const videoBlob = await createMergedVideo(imageBlob, audioBlob).catch((err) => {
        console.warn("Video merge failed, falling back to separate files", err);
        return null;
      });

      if (videoBlob) {
        const ext = videoBlob.type === "video/mp4" ? "mp4" : "webm";
        const videoFile = new File([videoBlob], `${meme.id}.${ext}`, { type: videoBlob.type });
        const videoShareData = { files: [videoFile], title: meme.title, text: meme.description };
        if (navigator.canShare(videoShareData)) {
          await navigator.share(videoShareData);
          return;
        }
      }

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
