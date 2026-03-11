import { createApp } from "./app.js";
import { env } from "./env.js";

const start = async () => {
  const app = await createApp();

  try {
    await app.listen({ port: env.API_PORT, host: env.API_HOST });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

await start();
