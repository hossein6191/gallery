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

function mb(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Written out in full on purpose. Next only inlines NEXT_PUBLIC_ variables
// into the client bundle when they are referenced as process.env.NAME; a
// process.env[name] lookup is left alone and reads an empty object in the
// browser, so the page would keep saying 250 while the server enforced
// whatever the host was set to — the exact drift this file exists to stop.
export const MAX_IMAGE_MB = mb(process.env.NEXT_PUBLIC_MAX_IMAGE_MB, 8);
export const MAX_VIDEO_MB = mb(process.env.NEXT_PUBLIC_MAX_VIDEO_MB, 250);
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * MB;
export const MAX_VIDEO_BYTES = MAX_VIDEO_MB * MB;
