import crypto from "node:crypto";

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function buildFingerprint(parts) {
  return sha256(parts.filter(Boolean).join("::"));
}
