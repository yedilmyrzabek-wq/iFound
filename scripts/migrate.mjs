// Applies supabase/migrations/*.sql in order (each once), then upserts data/venues/*.json.
// Usage: DATABASE_URL=postgres://... node scripts/migrate.mjs   (reads .env.local if present)
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import pg from "pg";

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false } });
await client.connect();
await client.query(`create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())`);

const dir = path.join("supabase", "migrations");
for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  const done = await client.query("select 1 from _migrations where name = $1", [file]);
  if (done.rowCount) continue;
  process.stdout.write(`applying ${file} … `);
  await client.query("begin");
  try {
    await client.query(readFileSync(path.join(dir, file), "utf8"));
    await client.query("insert into _migrations (name) values ($1)", [file]);
    await client.query("commit");
    console.log("ok");
  } catch (e) {
    await client.query("rollback");
    console.log("FAILED");
    throw e;
  }
}

const vdir = path.join("data", "venues");
if (existsSync(vdir)) {
  for (const file of readdirSync(vdir).filter((f) => f.endsWith(".json"))) {
    const city = file.replace(/\.json$/, "");
    const venues = JSON.parse(readFileSync(path.join(vdir, file), "utf8"));
    for (const v of venues) {
      await client.query(
        `insert into venues (city_slug, name, address, category, lat, lng, osm_ref)
         values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (osm_ref) do update set name = excluded.name, address = excluded.address,
           category = excluded.category, lat = excluded.lat, lng = excluded.lng`,
        [city, v.name, v.address, v.category, v.lat, v.lng, v.osm_ref],
      );
    }
    console.log(`venues ${city}: ${venues.length}`);
  }
}

await client.end();
