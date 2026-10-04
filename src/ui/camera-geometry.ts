/** Resize the complete sensor frame: no crop, padding or aspect deformation. */
export async function captureCameraFrame(video: HTMLVideoElement): Promise<ImageBitmap> {
  const scale = Math.min(1, 1024 / Math.max(video.videoWidth, video.videoHeight));
  return createImageBitmap(video, {
    resizeWidth: Math.round(video.videoWidth * scale),
    resizeHeight: Math.round(video.videoHeight * scale),
  });
}
