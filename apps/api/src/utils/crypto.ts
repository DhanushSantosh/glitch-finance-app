import { createHash, randomBytes } from "node:crypto";

export const hashValue = (raw: string, secret: string): string => {
  const digest = createHash("sha256");
  digest.update(raw);
  digest.update(":");
  digest.update(secret);
  return digest.digest("hex");
};

export const generateOtpCode = (): string => {
  // Rejection sampling avoids modulo bias: discard values >= the largest multiple
  // of 1_000_000 that fits in a uint32 (4_294_000_000) and retry.
  const ceiling = Math.floor(0x1_0000_0000 / 1_000_000) * 1_000_000;
  let value: number;
  do {
    value = randomBytes(4).readUInt32BE(0);
  } while (value >= ceiling);
  return (value % 1_000_000).toString().padStart(6, "0");
};

export const generateSessionToken = (): string => randomBytes(32).toString("hex");
