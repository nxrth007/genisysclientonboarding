import { isHeic, isImageFile } from "./intake-uploads";

/**
 * A photo made ready to upload, in the browser: big ones are shrunk to 2000 px on
 * the long side and saved as JPEG (PNG stays PNG, so a logo keeps its transparent
 * background), and iPhone HEIC photos become JPEG, which every browser can show.
 * A 10 MB phone photo comes out around half a megabyte, so twenty of them upload
 * in seconds instead of minutes, and the Hub's photo check (which can't read
 * images over about 5 MB) sees every one. Anything that can't be decoded here is
 * sent as it is.
 */

/** Photos smaller than this, and not HEIC, go up untouched. */
const SHRINK_OVER_BYTES = 1_500_000;
const LONG_EDGE = 2000;
const JPEG_QUALITY = 0.85;

export const HEIC_NOTE =
  "This is an iPhone HEIC photo, which websites can’t show. It’s uploaded, but please also add it as a JPEG if you can (on iPhone: Photos → Share → Save to Files, or set Camera → Formats → Most Compatible).";

export type PreparedPhoto = { file: File; shrunk: boolean; note?: string };

/** Whether the page can show a small picture of this file itself. */
export function canPreview(f: { name: string; type: string }): boolean {
  return isImageFile(f) && !isHeic(f) && !/\.(tiff?)$/i.test(f.name);
}

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (!isImageFile(file)) return { file, shrunk: false };
  // Logos as SVG and animated GIFs are kept exactly as they are.
  if (/svg|gif/i.test(file.type) || /\.(svg|gif)$/i.test(file.name)) return { file, shrunk: false };
  const heic = isHeic(file);
  if (!heic && file.size <= SHRINK_OVER_BYTES) return { file, shrunk: false };
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return heic ? { file, shrunk: false, note: HEIC_NOTE } : { file, shrunk: false };
  }
  let bitmap: ImageBitmap;
  try {
    // from-image: a phone photo taken sideways comes out the right way up.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return heic ? { file, shrunk: false, note: HEIC_NOTE } : { file, shrunk: false };
  }
  try {
    const scale = Math.min(1, LONG_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { file, shrunk: false };
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);
    const png = file.type === "image/png" || /\.png$/i.test(file.name);
    const type = png ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, JPEG_QUALITY));
    if (!blob) return { file, shrunk: false };
    // A photo that didn't get smaller is sent as it was (a small PNG can grow when redrawn).
    if (!heic && blob.size >= file.size) return { file, shrunk: false };
    const name = `${file.name.replace(/\.[^.]+$/, "") || "photo"}${png ? ".png" : ".jpg"}`;
    return { file: new File([blob], name, { type, lastModified: file.lastModified }), shrunk: true };
  } catch {
    return heic ? { file, shrunk: false, note: HEIC_NOTE } : { file, shrunk: false };
  } finally {
    bitmap.close();
  }
}
