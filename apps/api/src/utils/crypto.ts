import { createHash, randomBytes } from "node:crypto";

export const hashValue = (raw: string, secret: string): string => {
  const digest = createHash("sha256");
  digest.update(raw);
  digest.update(":");
  digest.update(secret);
  return digest.digest("hex");
};

export const generateOtpCode = (): string => {
  const value = randomBytes(4).readUInt32BE(0) % 1000000;
  return value.toString().padStart(6, "0");
};

export const generateSessionToken = (): string => randomBytes(32).toString("hex");
