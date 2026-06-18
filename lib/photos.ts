export type GalleryPhoto = {
  url: string;
  pathname?: string;
  uploadedAt: string;
  caption?: string;
};

const imageExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "avif"]);

function getImageExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
  if (extension) return extension;
  return file.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
}

export function isAllowedImage(file: File) {
  return file.type.startsWith("image/") || imageExtensions.has(getImageExtension(file));
}

function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function listPhotos(): Promise<GalleryPhoto[]> {
  if (!hasBlobToken()) return [];

  const { list } = await import("@vercel/blob");
  const result = await list({ prefix: "kimons-birthday/" });

  const photos = result.blobs.map((blob) => ({
    url: blob.url,
    pathname: blob.pathname,
    uploadedAt: blob.uploadedAt.toISOString(),
    caption: blob.pathname.split("/").pop()?.replace(/\.[^.]+$/, "").replaceAll("-", " ")
  }));

  return photos.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function uploadPhoto(file: File) {
  if (!hasBlobToken()) {
    throw new Error("BLOB_READ_WRITE_TOKEN fehlt. Lege auf Vercel einen Blob Store an und verbinde ihn mit dem Projekt.");
  }

  const { put } = await import("@vercel/blob");
  const extension = getImageExtension(file);
  const safeName = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const pathname = `kimons-birthday/${Date.now()}-${safeName || "foto"}.${extension}`;

  return put(pathname, file, {
    access: "public",
    addRandomSuffix: false
  });
}
