export const calculateOtpExpiry = (now: Date, ttlSeconds: number): Date => {
  return new Date(now.getTime() + ttlSeconds * 1000);
};

export const isOtpExpired = (expiresAt: Date, now: Date): boolean => {
  return expiresAt.getTime() < now.getTime();
};

export const isOtpAttemptAllowed = (attempts: number, maxAttempts: number): boolean => {
  return attempts < maxAttempts;
};
