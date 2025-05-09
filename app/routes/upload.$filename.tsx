import { LoaderFunction } from "@remix-run/node";
import path from "path";
import { promises as fs } from "fs";

// This route isn't strictly necessary since we're storing files in the public directory,
// but it provides a centralized place to handle file retrieval if we change the storage method later

export const loader: LoaderFunction = async ({ params }) => {
  const { filename } = params;
  
  if (!filename) {
    return new Response("File not found", { status: 404 });
  }
  
  try {
    // Get file path
    const filePath = path.join(process.cwd(), "public", "upload", filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return new Response("File not found", { status: 404 });
    }
    
    // Read file
    const fileBuffer = await fs.readFile(filePath);
    
    // Determine content type based on extension
    let contentType = "application/octet-stream";
    if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
      contentType = "image/jpeg";
    } else if (filename.endsWith(".png")) {
      contentType = "image/png";
    }
    
    // Return file
    return new Response(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000", // Cache for 1 year
      },
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return new Response("Error serving file", { status: 500 });
  }
}; 
