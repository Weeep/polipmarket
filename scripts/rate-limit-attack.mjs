#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3382";

function buildUrl(path) {
  return `${BASE_URL}${path}`;
}

async function fetchJson(path, init) {
  const res = await fetch(buildUrl(path), init);
  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { res, data };
}

async function discoverIds() {
  let marketsData;
  try {
    ({ data: marketsData } = await fetchJson("/api/markets"));
  } catch (error) {
    throw new Error(`Nem sikerült elérni a szervert: ${BASE_URL}. Indítsd el az appot (npm run dev), majd próbáld újra. Eredeti hiba: ${error.message}`);
  }
  const markets = Array.isArray(marketsData) ? marketsData : [];
  const marketId = markets[0]?.id ?? null;

  let outcomeId = null;
  if (marketId) {
    const { data: outcomesData } = await fetchJson(`/api/markets/${marketId}/outcomes`);
    const outcomes = Array.isArray(outcomesData) ? outcomesData : [];
    outcomeId = outcomes[0]?.id ?? null;
  }

  const { data: eventsData } = await fetchJson("/api/events");
  const events = Array.isArray(eventsData) ? eventsData : [];
  const eventId = events[0]?.id ?? null;

  return { marketId, outcomeId, eventId };
}

function endpointCatalog(ids) {
  return [
    {
      label: "GET /api/events",
      method: "GET",
      path: "/api/events",
    },
    {
      label: "GET /api/markets",
      method: "GET",
      path: "/api/markets",
    },
    {
      label: "GET /api/events/:id",
      method: "GET",
      path: ids.eventId ? `/api/events/${ids.eventId}` : null,
      missingReason: "Nincs event ID (az /api/events üres).",
    },
    {
      label: "GET /api/markets/:id/outcomes",
      method: "GET",
      path: ids.marketId ? `/api/markets/${ids.marketId}/outcomes` : null,
      missingReason: "Nincs market ID (az /api/markets üres).",
    },
    {
      label: "GET /api/markets/:id/stats",
      method: "GET",
      path: ids.marketId ? `/api/markets/${ids.marketId}/stats` : null,
      missingReason: "Nincs market ID (az /api/markets üres).",
    },
    {
      label: "POST /api/markets/:id/quote",
      method: "POST",
      path: ids.marketId ? `/api/markets/${ids.marketId}/quote` : null,
      body: ids.outcomeId
        ? { outcomeId: ids.outcomeId, position: "YES", amount: 10 }
        : null,
      missingReason: ids.marketId
        ? "Nincs outcome ID (nincs outcome az adott markethez)."
        : "Nincs market ID (az /api/markets üres).",
    },
    {
      label: "POST /api/markets/:id/quote-sell",
      method: "POST",
      path: ids.marketId ? `/api/markets/${ids.marketId}/quote-sell` : null,
      body: ids.outcomeId
        ? { outcomeId: ids.outcomeId, position: "YES", shares: 1 }
        : null,
      missingReason: ids.marketId
        ? "Nincs outcome ID (nincs outcome az adott markethez)."
        : "Nincs market ID (az /api/markets üres).",
    },
  ];
}

function printCatalog(catalog) {
  console.log("\nPublikus API-k (teszthez):");
  catalog.forEach((endpoint, idx) => {
    const status = endpoint.path && (endpoint.method === "GET" || endpoint.body)
      ? "elérhető"
      : "nem választható";
    console.log(`${idx + 1}. ${endpoint.label} [${status}]`);
  });
  console.log("");
}

async function sendOnce(endpoint) {
  const init = {
    method: endpoint.method,
    headers: {},
  };

  if (endpoint.method === "POST") {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(endpoint.body);
  }

  const startedAt = Date.now();
  const res = await fetch(buildUrl(endpoint.path), init);
  const durationMs = Date.now() - startedAt;
  const retryAfter = res.headers.get("retry-after");
  const endpointType = res.headers.get("x-ratelimit-endpoint-type");

  let body = null;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }

  return {
    status: res.status,
    retryAfter,
    endpointType,
    durationMs,
    body,
  };
}

async function runBurst(endpoint, requestCount) {
  console.log(`\nBurst támadás indul: ${requestCount} kérés azonnal...`);
  const jobs = Array.from({ length: requestCount }, () => sendOnce(endpoint));
  const results = await Promise.all(jobs);

  const first429 = results.find((result) => result.status === 429);
  const statusHistogram = results.reduce((acc, result) => {
    acc[result.status] = (acc[result.status] ?? 0) + 1;
    return acc;
  }, {});

  console.log("Státusz eloszlás:", statusHistogram);

  if (first429) {
    console.log("\n✅ Talált 429 választ:");
    console.log("retry-after:", first429.retryAfter);
    console.log("x-ratelimit-endpoint-type:", first429.endpointType);
    console.log("response body:", first429.body);
  } else {
    console.log("\n⚠️ Nem jött 429. Növeld a kérés számot vagy nézd meg, hogy a middleware aktív-e.");
  }
}

async function runSustained(endpoint, maxRequests, intervalMs) {
  console.log(`\nSustained támadás indul: max ${maxRequests} kérés, ${intervalMs}ms szünettel...`);

  for (let i = 1; i <= maxRequests; i += 1) {
    const result = await sendOnce(endpoint);
    console.log(`#${i} -> status=${result.status}, retry-after=${result.retryAfter ?? "-"}, t=${result.durationMs}ms`);

    if (result.status === 429) {
      console.log("\n✅ Talált 429 választ:");
      console.log("retry-after:", result.retryAfter);
      console.log("x-ratelimit-endpoint-type:", result.endpointType);
      console.log("response body:", result.body);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  console.log("\n⚠️ Nem jött 429 a megadott sustained tartományban.");
}

async function main() {
  const rl = createInterface({ input, output });

  try {
    console.log("Rate-limit attack tester");
    console.log(`Base URL: ${BASE_URL}`);

    const ids = await discoverIds();
    const catalog = endpointCatalog(ids);
    printCatalog(catalog);

    const selectedRaw = await rl.question("Válassz API sorszámot: ");
    const selectedIndex = Number.parseInt(selectedRaw, 10) - 1;
    const endpoint = catalog[selectedIndex];

    if (!endpoint) {
      console.error("Hibás sorszám.");
      process.exitCode = 1;
      return;
    }

    if (!endpoint.path || (endpoint.method === "POST" && !endpoint.body)) {
      console.error(endpoint.missingReason ?? "A kiválasztott endpoint most nem tesztelhető.");
      process.exitCode = 1;
      return;
    }

    console.log(`Kiválasztva: ${endpoint.label} -> ${endpoint.path}`);

    const modeRaw = await rl.question("Mód (1 = burst, 2 = sustained): ");
    const mode = Number.parseInt(modeRaw, 10);

    if (mode === 1) {
      const countRaw = await rl.question("Hány kérést küldjön egyszerre? (alap: 120): ");
      const requestCount = Number.parseInt(countRaw || "120", 10);
      await runBurst(endpoint, Number.isFinite(requestCount) ? requestCount : 120);
      return;
    }

    if (mode === 2) {
      const maxRaw = await rl.question("Max hány kérés menjen? (alap: 240): ");
      const intervalRaw = await rl.question("Kérések közti szünet ms-ben? (alap: 200): ");

      const maxRequests = Number.parseInt(maxRaw || "240", 10);
      const intervalMs = Number.parseInt(intervalRaw || "200", 10);

      await runSustained(
        endpoint,
        Number.isFinite(maxRequests) ? maxRequests : 240,
        Number.isFinite(intervalMs) ? intervalMs : 200,
      );
      return;
    }

    console.error("Ismeretlen mód. Használd: 1 vagy 2.");
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error("Váratlan hiba:", error);
  process.exit(1);
});
