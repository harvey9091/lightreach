import { timingSafeEqual } from "crypto";

export function requireCronSecret(req: Request): boolean {
  const secret = process.env["CRON_SECRET"];
  if (!secret) return false;

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const provided = authHeader.slice(7);
  try {
    const a = Buffer.from(secret, "utf8");
    const b = Buffer.from(provided, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function getCronLockId(operation: string): number {
  let hash = 0;
  for (let i = 0; i < operation.length; i++) {
    const char = operation.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
