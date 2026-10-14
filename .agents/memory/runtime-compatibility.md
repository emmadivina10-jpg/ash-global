---
name: Runtime compatibility
description: Replit runtime precedence affecting the imported Vite 8 app
---

Use the Node.js module's bundled Bun rather than installing a separate Bun module.

**Why:** Adding the separate Bun module hid Node from PATH in this environment.
Bun then ran Node-shebang tools through its compatibility mode. Vite's native
bindings aborted with an N-API function/object error, and an isolated Vitest
suite reported an undefined Zod export. Both issues disappeared when real Node
was restored; neither required app-code or payment-code changes.

**How to apply:** When changing toolchains or investigating native Vite crashes,
check that `command -v node` succeeds and that Vite/Vitest actually run under
Node. Keep Bun for dependency management without replacing the tools' runtime.
