import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import prismaPkg from "@prisma/client";
import * as adapterPkg from "@prisma/adapter-better-sqlite3";

const { PrismaClient } = prismaPkg;
const { PrismaBetterSqlite3 } = adapterPkg;

function usage() {
  console.log(
    "Usage: npm run import:events -- <path-to-json> [--createdBy=<userId>]",
  );
}

function parseArgs(args) {
  const fileArg = args.find((arg) => !arg.startsWith("--"));
  const createdByArg = args
    .find((arg) => arg.startsWith("--createdBy="))
    ?.slice("--createdBy=".length);

  if (!fileArg) {
    usage();
    throw new Error("Missing JSON file path");
  }

  return {
    filePath: resolve(process.cwd(), fileArg),
    createdByArg,
  };
}

async function readEconomyDefaults() {
  const content = await readFile(
    resolve(process.cwd(), "src/config/economy.ts"),
    "utf8",
  );
  const feeMatch = content.match(/export const DEFAULT_AMM_FEE_BPS = (\d+);/);
  const poolMatch = content.match(/export const DEFAULT_OUTCOME_POOL = (\d+);/);

  if (!feeMatch || !poolMatch) {
    throw new Error("Could not read economy defaults from src/config/economy.ts");
  }

  return {
    defaultAmmFeeBps: Number(feeMatch[1]),
    defaultOutcomePool: Number(poolMatch[1]),
  };
}

function normalizePayload(payload) {
  if (Array.isArray(payload)) {
    return { events: payload, createdBy: undefined };
  }

  if (!payload || !Array.isArray(payload.events)) {
    throw new Error("JSON must be an array or an object with an events array");
  }

  return {
    events: payload.events,
    createdBy: payload.createdBy,
  };
}

function toSlug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeYesStartPercent(value, context) {
  const normalized = typeof value === "number" ? value : 50;

  if (normalized < 3 || normalized > 97) {
    throw new Error(`yesStartPercent must be between 3 and 97 (${context})`);
  }

  return normalized;
}

function normalizeMarkets(markets, fallbackYesStartPercent, eventIndex) {
  if (!Array.isArray(markets) || markets.length === 0) {
    throw new Error("Each event must include at least one market");
  }

  return markets.map((market, marketIndex) => {
    const asObject = typeof market === "string" ? { name: market } : market;
    const name = String(asObject?.name ?? "").trim();
    const slug = toSlug(name);

    if (!name) {
      throw new Error(
        `Market name is required (event index ${eventIndex}, market index ${marketIndex})`,
      );
    }

    if (!slug) {
      throw new Error(`Invalid market name for slug generation: ${name}`);
    }

    const yesStartPercent = normalizeYesStartPercent(
      asObject?.yesStartPercent ?? fallbackYesStartPercent,
      `event index ${eventIndex}, market index ${marketIndex}`,
    );

    return {
      name,
      slug,
      yesStartPercent,
      description:
        typeof asObject?.description === "string" ? asObject.description : null,
    };
  });
}

function collectCreatorIds(events, createdByArg, payloadCreatedBy) {
  return [
    ...new Set(
      events
        .map((event) => event?.createdBy ?? createdByArg ?? payloadCreatedBy)
        .filter((value) => typeof value === "string" && value.trim().length > 0),
    ),
  ];
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const { filePath, createdByArg } = parseArgs(process.argv.slice(2));
  const raw = JSON.parse(await readFile(filePath, "utf8"));
  const { events, createdBy: payloadCreatedBy } = normalizePayload(raw);
  const { defaultAmmFeeBps, defaultOutcomePool } = await readEconomyDefaults();

  if (!Array.isArray(events) || events.length === 0) {
    throw new Error("No events found in input JSON");
  }

  const totalPool = defaultOutcomePool * 2;

  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter, log: ["error", "warn"] });

  try {
    const creatorIds = collectCreatorIds(events, createdByArg, payloadCreatedBy);
    const existingCreators = await prisma.user.findMany({
      where: {
        id: {
          in: creatorIds,
        },
      },
      select: { id: true },
    });
    const existingCreatorIds = new Set(existingCreators.map((user) => user.id));
    const missingCreatorIds = creatorIds.filter((id) => !existingCreatorIds.has(id));

    if (missingCreatorIds.length > 0) {
      throw new Error(
        `Unknown createdBy user id(s): ${missingCreatorIds.join(", ")}. ` +
          "The importer only accepts existing User ids, because Event.createdBy and Market.createdBy have foreign-key constraints.",
      );
    }

    let imported = 0;

    for (const [index, event] of events.entries()) {
      const createdBy = event?.createdBy ?? createdByArg ?? payloadCreatedBy;
      if (!createdBy) {
        throw new Error(
          `Missing createdBy for event at index ${index}. Provide --createdBy or createdBy in JSON.`,
        );
      }

      const question = String(event?.question ?? "").trim();
      if (!question) {
        throw new Error(`Question is required for event at index ${index}`);
      }

      const bettingCloseAt = new Date(String(event?.bettingCloseAt ?? ""));
      if (Number.isNaN(bettingCloseAt.getTime())) {
        throw new Error(`Invalid bettingCloseAt for event at index ${index}`);
      }

      const resolveAt =
        event?.resolveAt == null ? null : new Date(String(event.resolveAt));
      if (resolveAt && Number.isNaN(resolveAt.getTime())) {
        throw new Error(`Invalid resolveAt for event at index ${index}`);
      }

      if (resolveAt && resolveAt <= bettingCloseAt) {
        throw new Error(
          `resolveAt must be after bettingCloseAt for event at index ${index}`,
        );
      }

      const eventYesStartPercent = normalizeYesStartPercent(
        event?.yesStartPercent,
        `event index ${index}`,
      );

      const markets = normalizeMarkets(
        event?.markets,
        eventYesStartPercent,
        index,
      );

      await prisma.$transaction(async (tx) => {
        const createdEvent = await tx.event.create({
          data: {
            question,
            description:
              typeof event?.description === "string" ? event.description : null,
            bettingCloseAt,
            resolveAt,
            feeBps: defaultAmmFeeBps,
            createdBy,
          },
        });

        for (const market of markets) {
          const yesPool = Math.round((totalPool * market.yesStartPercent) / 100);
          const noPool = totalPool - yesPool;

          await tx.market.create({
            data: {
              eventId: createdEvent.id,
              question: market.name,
              description: market.description,
              status: "OPEN",
              type: "BINARY",
              bettingCloseAt,
              resolveAt: resolveAt ?? bettingCloseAt,
              createdBy,
              ammConfig: {
                create: {
                  curve: "CPMM",
                  feeBps: defaultAmmFeeBps,
                  lmsrB: null,
                },
              },
              outcomes: {
                create: [
                  {
                    slug: market.slug,
                    label: market.name,
                    position: 0,
                    status: "ACTIVE",
                    liquidity: {
                      create: {
                        yesPool,
                        noPool,
                      },
                    },
                  },
                ],
              },
            },
          });
        }
      });

      imported += 1;
    }

    console.log(`Imported ${imported} event(s) from ${filePath}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Event import failed:", error);
  process.exit(1);
});
