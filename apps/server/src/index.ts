import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { createDb } from "./db";
import { env } from "./env";

const db = createDb();

serve({ fetch: createApp(db).fetch, port: env.PORT }, (info) => {
  console.log(`LearnLoop API listening on http://localhost:${info.port}`);
});
