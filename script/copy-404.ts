import { readFile, writeFile, copyFile } from "fs/promises";
import { join } from "path";

async function copy404Html() {
  const distPath = join(process.cwd(), "dist");
  const indexPath = join(distPath, "index.html");
  const target404Path = join(distPath, "404.html");

  try {
    // Read the built index.html
    const indexContent = await readFile(indexPath, "utf-8");
    
    // Write it as 404.html
    // GitHub Pages will serve this for 404 errors, and the SPA router will handle routing
    await writeFile(target404Path, indexContent, "utf-8");
    
    console.log("✓ Created 404.html for GitHub Pages SPA routing");
  } catch (error) {
    console.error("Failed to create 404.html:", error);
    process.exit(1);
  }
}

copy404Html();

