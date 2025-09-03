import { execSync } from "node:child_process";

/**
 * Seed the database with mock Hostaway data. When run via
 * `pnpm db:seed`, this script invokes the ingestion script to upsert
 * mocked reviews into the database. Adjust this file if you need to
 * seed additional data.
 */
function runIngest() {
  execSync("ts-node scripts/ingest_hostaway.ts", { stdio: "inherit" });
}

runIngest();