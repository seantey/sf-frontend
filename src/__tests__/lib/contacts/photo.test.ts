import { File as NodeFile } from "node:buffer";
import { PHOTO_MAX_BYTES, fileToPhotoDataUrl } from "@/lib/contacts/photo";

// The server action receives Node's File, which has arrayBuffer(); jsdom's
// polyfill does not, so build the fixtures with the real one.
function makeFile(content: BlobPart, name: string, type: string): File {
  return new NodeFile([content as never], name, { type }) as unknown as File;
}

const PNG_HEADER = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("fileToPhotoDataUrl", () => {
  it("encodes an accepted image as a data URL", async () => {
    const file = makeFile(PNG_HEADER, "avatar.png", "image/png");

    await expect(fileToPhotoDataUrl(file)).resolves.toEqual({
      photo: "data:image/png;base64,iVBORw0KGgo=",
    });
  });

  it("rejects a file that is not an accepted image type", async () => {
    const file = makeFile("hello", "notes.txt", "text/plain");

    await expect(fileToPhotoDataUrl(file)).resolves.toEqual({
      error: "Photo must be a PNG, JPEG, WebP, or GIF image",
    });
  });

  it("rejects a file over the size limit", async () => {
    const file = makeFile(new Uint8Array(PHOTO_MAX_BYTES + 1), "big.png", "image/png");

    await expect(fileToPhotoDataUrl(file)).resolves.toEqual({
      error: "Photo must be 500KB or smaller",
    });
  });
});
