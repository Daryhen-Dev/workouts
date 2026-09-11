// Ambient declaration for CSS side-effect imports (e.g. `import "./globals.css"`).
// next-env.d.ts normally covers this at build time; this shim keeps editors
// and language servers consistent with the generated declarations.
declare module "*.css";
