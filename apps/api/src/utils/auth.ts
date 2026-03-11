import { FastifyRequest } from "fastify";
import { AppError } from "../errors.js";

export const requireAuth = (request: FastifyRequest): NonNullable<FastifyRequest["auth"]> => {
  if (!request.auth) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  }
  return request.auth;
};
