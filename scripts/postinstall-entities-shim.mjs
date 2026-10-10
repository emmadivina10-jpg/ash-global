// entities v6 removed the legacy "entities/lib/decode.js" subpath that
// @react-email/render still imports, while parse5 needs v6's "entities/decode".
// The bundler resolves both against the top-level copy, so we provide v4-style
// shim files inside the installed v6 package. Re-run after every install.
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const entitiesDir = join(process.cwd(), "node_modules", "entities");
const pkgPath = join(entitiesDir, "package.json");

if (!existsSync(pkgPath)) {
  console.log("[postinstall] entities not installed yet, skipping shim");
  process.exit(0);
}

const libDir = join(entitiesDir, "lib");
mkdirSync(libDir, { recursive: true });
writeFileSync(join(libDir, "decode.js"), 'export * from "../dist/esm/decode.js";\n');
writeFileSync(join(libDir, "escape.js"), 'export * from "../dist/esm/escape.js";\n');
console.log("[postinstall] entities lib/ compatibility shims written");
