import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
import prismaPkg from "@prisma/client";
import * as adapterPkg from "@prisma/adapter-pg";

const { PrismaClient } = prismaPkg;
const { PrismaPg } = adapterPkg;

function usage() {
  console.log(
    "Usage: npm run import:achievements -- <path-to-json> [--deactivate-missing]",
  );
}

function parseArgs(args) {
  const fileArg = args.find((arg) => !arg.startsWith("--"));
  const deactivateMissing = args.includes("--deactivate-missing");

  if (!fileArg) {
    usage();
    throw new Error("Missing JSON file path");
  }

  return {
    filePath: resolve(process.cwd(), fileArg),
    deactivateMissing,
  };
}

function normalizePayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || !Array.isArray(payload.achievements)) {
    throw new Error(
      "JSON must be an array or an object with an achievements array",
    );
  }

  return payload.achievements;
}

function normalizeAchievement(input, index) {
  const number = Number(input?.number);
  const code = String(input?.code ?? "").trim();
  const title = String(input?.title ?? "").trim();
  const description =
    input?.description == null ? null : String(input.description).trim();
  const reward = Number(input?.reward);
  const category = String(input?.category ?? "").trim().toUpperCase();
  const targetValue =
    input?.targetValue == null ? null : Number(input.targetValue);
  const isActive = input?.isActive == null ? true : Boolean(input.isActive);

  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`Invalid number at achievements[${index}]`);
  }

  if (!code) {
    throw new Error(`Missing code at achievements[${index}]`);
  }

  if (!title) {
    throw new Error(`Missing title at achievements[${index}]`);
  }

  if (!Number.isInteger(reward) || reward < 0) {
    throw new Error(`Invalid reward at achievements[${index}]`);
  }

  if (!category) {
    throw new Error(`Missing category at achievements[${index}]`);
  }

  if (targetValue != null && (!Number.isInteger(targetValue) || targetValue < 0)) {
    throw new Error(`Invalid targetValue at achievements[${index}]`);
  }

  return {
    number,
    code,
    title,
    description,
    reward,
    category,
    targetValue,
    isActive,
  };
}

function validateUnique(definitions) {
  const numberSet = new Set();
  const codeSet = new Set();

  for (const definition of definitions) {
    if (numberSet.has(definition.number)) {
      throw new Error(`Duplicate number in JSON: ${definition.number}`);
    }

    if (codeSet.has(definition.code)) {
      throw new Error(`Duplicate code in JSON: ${definition.code}`);
    }

    numberSet.add(definition.number);
    codeSet.add(definition.code);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const { filePath, deactivateMissing } = parseArgs(process.argv.slice(2));
  const raw = JSON.parse(await readFile(filePath, "utf8"));
  const achievements = normalizePayload(raw);

  if (!Array.isArray(achievements) || achievements.length === 0) {
    throw new Error("No achievements found in input JSON");
  }

  const definitions = achievements.map(normalizeAchievement);
  validateUnique(definitions);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter, log: ["error", "warn"] });

  try {
    await prisma.$transaction(async (tx) => {
      for (const definition of definitions) {
        await tx.achievementDefinition.upsert({
          where: { code: definition.code },
          create: definition,
          update: {
            number: definition.number,
            title: definition.title,
            description: definition.description,
            reward: definition.reward,
            category: definition.category,
            targetValue: definition.targetValue,
            isActive: definition.isActive,
          },
        });
      }

      if (deactivateMissing) {
        await tx.achievementDefinition.updateMany({
          where: {
            code: {
              notIn: definitions.map((definition) => definition.code),
            },
          },
          data: { isActive: false },
        });
      }
    });

    console.log(
      `Imported ${definitions.length} achievement(s) from ${filePath}${
        deactivateMissing ? " (deactivate missing enabled)" : ""
      }`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Achievement import failed:", error);
  process.exit(1);
});
