import { readFile } from "fs/promises";
import path from "path";

export async function getCollaborators() {
  try {
    const dataPath = path.join(process.cwd(), "data", "collaborators.json");
    const buf = await readFile(dataPath, "utf8");
    return JSON.parse(buf);
  } catch (err) {
    return [];
  }
}
