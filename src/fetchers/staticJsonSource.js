import fs from "node:fs/promises";

export async function fetchStaticJsonSource(source) {
  const text = await fs.readFile(source.path, "utf8");
  const items = JSON.parse(text);
  if (!Array.isArray(items)) {
    throw new Error(`Source ${source.id} expected an array from static-json file.`);
  }
  return items;
}
