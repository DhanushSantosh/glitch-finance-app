import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    auth: {
      userId: string;
      sessionId: string;
      email: string;
    } | null;
  }
}
