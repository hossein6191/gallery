/**
 * Upload limits, in one place, readable by the route that enforces them and
 * the page that states them — so the label and the refusal can never disagree.
 *
 * NEXT_PUBLIC_ so the client bundle sees the same number at build time. Set
 * NEXT_PUBLIC_MAX_VIDEO_MB on the host to change it without a code change.
 *
 * A note on memory: the route parses the multipart body with formData(),
 * which holds the whole file in RAM before a byte reaches disk. The cap is
 * therefore also a per-upload memory ceiling on the server. Raise it with an
 * eye on the container's memory, not just the disk.
 */
const MB = 1024 * 1024;

function mb(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export const MAX_IMAGE_MB = mb("NEXT_PUBLIC_MAX_IMAGE_MB", 8);
export const MAX_VIDEO_MB = mb("NEXT_PUBLIC_MAX_VIDEO_MB", 250);
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * MB;
export const MAX_VIDEO_BYTES = MAX_VIDEO_MB * MB;
