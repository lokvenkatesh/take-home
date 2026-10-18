   import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
   import postgres from "postgres";
   import * as schema from "./schema";

   // prepare: false is needed for Neon's pooled connection; max keeps serverless connections low
const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 5 });

   export const db = drizzle(client, { schema });