// Imports src/lib/archive.ts the way the site build does, so its assertions run without a page.
//   node scripts/check_archive.mjs        (Node 22.18 or later, for type stripping)
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier)) return next(`${specifier}.ts`, context);
      throw error;
    }
  },
});

const archive = await import("../src/lib/archive.ts");
const { tableA, tableC, diffAB, diffAC, presets, rewind } = archive;
console.log(`tables : A ${tableA.caption}, C ${tableC.caption}`);
console.log(`diffs  : A to B ${diffAB.length} cell, A to C ${diffAC.length} cells`);
console.log(`presets: ${presets.map((p) => `${p.rebuilt}/${p.fetched}`).join(", ")} rebuilt/fetched`);
console.log(`rewind : fingerprint ${rewind.fingerprint}, build revision ${rewind.buildRevision}, ${rewind.requests} requests`);
console.log("RESULT: archive.ts imports and every assertion holds");
