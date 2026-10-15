import { moderateMedia } from "./media-safety.functions";

const PREVIEW_EDGE = 768;

function imagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, PREVIEW_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error("MEDIA_PREVIEW_FAILED"));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("MEDIA_PREVIEW_FAILED"));
    };
    image.src = url;
  });
}

function videoPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    const cleanup = () => URL.revokeObjectURL(url);
    video.onloadeddata = () => {
      video.currentTime = Math.min(1, Math.max(0, (video.duration || 1) / 3));
    };
    video.onseeked = () => {
      const scale = Math.min(1, PREVIEW_EDGE / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        cleanup();
        reject(new Error("MEDIA_PREVIEW_FAILED"));
        return;
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      cleanup();
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("MEDIA_PREVIEW_FAILED"));
    };
    video.src = url;
  });
}

export async function verifyMediaFiles(files: File[], contentType: string): Promise<void> {
  for (const file of files) {
    const previewDataUrl = file.type.startsWith("video/")
      ? await videoPreview(file)
      : await imagePreview(file);
    const result = await moderateMedia({
      data: { contentType, originalName: file.name, mediaType: file.type, previewDataUrl },
    });
    // Unavailable moderation is non-blocking: let the upload proceed.
    if (!result.ok) continue;
    if (result.verdict === "EXPLICIT") {
      window.location.assign("/safety-review");
      throw new Error(
        "This media violates ASH safety rules. It was not uploaded and your account is under review.",
      );
    }
    if (result.verdict === "UNCERTAIN") {
      throw new Error(
        "This media needs a safety review and was not published. Please choose another file.",
      );
    }
  }
}
