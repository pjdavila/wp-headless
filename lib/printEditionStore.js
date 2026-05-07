import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "print-edition-interest.jsonl");

export async function appendInterest(record) {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  await fs.promises.appendFile(FILE_PATH, JSON.stringify(record) + "\n", "utf8");
}

export async function readAllInterests() {
  let raw;
  try {
    raw = await fs.promises.readFile(FILE_PATH, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
  const lines = raw.split("\n");
  const out = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed));
    } catch {
      // skip corrupt line
    }
  }
  return out;
}

export const PRINT_EDITION_FILE_PATH = FILE_PATH;
