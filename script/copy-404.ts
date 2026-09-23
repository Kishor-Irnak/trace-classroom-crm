import { readFile, writeFile, copyFile, access } from "fs/promises";
import { join } from "path";
import { constants } from "fs";

async function copy404Html() {
  const distPath = join(process.cwd(), "dist");
  const indexPath = join(distPath, "index.html");
  const target404Path = join(distPath, "404.html");
  const cnameSourcePath = join(process.cwd(), "client", "public", "CNAME");
  const cnameDestPath = join(distPath, "CNAME");

  try {
    // Read the built index.html
    const indexContent = await readFile(indexPath, "utf-8");
    
    // Write it as 404.html
    // GitHub Pages will serve this for 404 errors, and the SPA router will handle routing
    await writeFile(target404Path, indexContent, "utf-8");
    
    console.log("✓ Created 404.html for GitHub Pages SPA routing");

    // Copy CNAME file if it exists and is not just a comment
    try {
      await access(cnameSourcePath, constants.F_OK);
      const cnameContent = await readFile(cnameSourcePath, "utf-8");
      const trimmedContent = cnameContent.trim();
      
      // Only copy if it's not empty and not just a comment
      if (trimmedContent && !trimmedContent.startsWith("#")) {
        await copyFile(cnameSourcePath, cnameDestPath);
        console.log("✓ Copied CNAME file for custom domain");
      }
    } catch {
      // CNAME file doesn't exist or is just a comment, that's fine
      console.log("ℹ No CNAME file found (or it's just a comment) - using GitHub Pages subpath");
    }
  } catch (error) {
    console.error("Failed to create 404.html:", error);
    process.exit(1);
  }
}

copy404Html();
