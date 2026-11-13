import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Where master photos and cut crops live. On Vercel: a PRIVATE Blob store
 * (nothing in it has a public URL; the crop route checks the token and
 * streams the bytes). Off Vercel, with no store configured: a local folder,
 * so the whole pipeline runs and can be tested without one.
 */
export interface PhotoStore {
  readonly kind: "blob" | "disk";
  put(pathname: string, data: Buffer, contentType: string): Promise<void>;
  /** The file's bytes, or null when there's no such file. */
  get(pathname: string): Promise<Buffer | null>;
}

export class PhotoStoreMissingError extends Error {}

function blobStore(): PhotoStore {
  return {
    kind: "blob",
    async put(pathname, data, contentType) {
      const { put } = await import("@vercel/blob");
      // Paths are content-addressed (see lib/crops.ts), so an overwrite
      // only ever rewrites identical bytes.
      await put(pathname, data, { access: "private", contentType, addRandomSuffix: false, allowOverwrite: true });
    },
    async get(pathname) {
      const { get } = await import("@vercel/blob");
      const r = await get(pathname, { access: "private" });
      if (!r || r.statusCode !== 200) return null;
      return Buffer.from(await new Response(r.stream).arrayBuffer());
    },
  };
}

function diskStore(root: string): PhotoStore {
  const resolve = (p: string) => {
    const full = path.resolve(root, p);
    if (!full.startsWith(path.resolve(root) + path.sep)) throw new Error(`bad photo path: ${p}`);
    return full;
  };
  return {
    kind: "disk",
    async put(pathname, data) {
      const full = resolve(pathname);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, data);
    },
    async get(pathname) {
      try {
        return await readFile(resolve(pathname));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw err;
      }
    },
  };
}

export function photoStore(): PhotoStore {
  // A connected private store sets BLOB_STORE_ID (OIDC) or a read-write token.
  if (process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN) return blobStore();
  if (process.env.VERCEL) {
    throw new PhotoStoreMissingError(
      "No Blob store is connected to this deployment. Create a private one and connect it to the project.",
    );
  }
  return diskStore(process.env.PHOTO_STORE_DIR ?? path.join(process.cwd(), ".photos"));
}
