export const PHOTO_MAX_BYTES = 500_000;
export const PHOTO_MEDIA_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

/** `accept` attribute for the file input. */
export const PHOTO_ACCEPT = PHOTO_MEDIA_TYPES.join(",");

export type PhotoResult = { photo: string } | { error: string };

/**
 * Turn an uploaded file into the data URL the API stores, or say why it can't
 * be. Limits mirror the API's own (`PHOTO_MAX_BYTES`, the four media types),
 * so the user sees the problem before a round trip; the API stays the authority.
 */
export async function fileToPhotoDataUrl(file: File): Promise<PhotoResult> {
  if (!(PHOTO_MEDIA_TYPES as readonly string[]).includes(file.type)) {
    return { error: "Photo must be a PNG, JPEG, WebP, or GIF image" };
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return { error: `Photo must be ${PHOTO_MAX_BYTES / 1000}KB or smaller` };
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  return { photo: `data:${file.type};base64,${bytes.toString("base64")}` };
}
