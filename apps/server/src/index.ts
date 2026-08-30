import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { createDb } from "./db";
import { getEnv } from "./env";

const db = createDb();

serve({ fetch: createApp(db).fetch, port: getEnv().PORT }, (info) => {
  console.log(`Interest Led API listening on http://localhost:${info.port}`);
});
