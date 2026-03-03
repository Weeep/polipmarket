import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const PUBLIC_ASSETS_DIR = path.join(process.cwd(), "public", "assets");

function isPdf(fileName: string) {
  return fileName.toLowerCase().endsWith(".pdf");
}

export async function listPublicAssetPdfFileNames(): Promise<string[]> {
  const entries = await readdir(PUBLIC_ASSETS_DIR, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && isPdf(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

export async function readPublicAssetPdf(fileName: string): Promise<Uint8Array> {
  const normalized = path.basename(fileName);

  if (!isPdf(normalized)) {
    throw new Error("Csak PDF dokumentum választható.");
  }

  const available = await listPublicAssetPdfFileNames();

  if (!available.includes(normalized)) {
    throw new Error("A kiválasztott dokumentum nem található a public/assets könyvtárban.");
  }

  const fullPath = path.join(PUBLIC_ASSETS_DIR, normalized);
  const fileBuffer = await readFile(fullPath);

  return new Uint8Array(fileBuffer);
}
