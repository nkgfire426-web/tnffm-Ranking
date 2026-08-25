import { unstable_cache } from "next/cache";

export function createSheetDataCache<T>(loader: () => Promise<T>) {
  return unstable_cache(loader, ["tnffm-google-sheet-payload"], {
    revalidate: 5,
    tags: ["tnffm-sheet"],
  });
}
