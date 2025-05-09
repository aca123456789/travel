import { ActionFunction, json } from "@remix-run/node";
import { getLoggedInUser } from "~/services/auth.server";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

export const action: ActionFunction = async ({ request }) => {
  try {
    // Check if user is authenticated
    const user = await getLoggedInUser(request);
    if (!user) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if request is multipart/form-data
    const contentType = request.headers.get("Content-Type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return json({ error: "Content type must be multipart/form-data" }, { status: 400 });
    }

    const formData = await request.formData();
    const uploadedFile = formData.get("file") as File | null;
    const fileType = formData.get("fileType") as string || "image"; // "image" or "video"

    if (!uploadedFile) {
      return json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    if (fileType === "image" && !["image/jpeg", "image/png"].includes(uploadedFile.type)) {
      return json({ error: "Only JPEG and PNG files are allowed for images" }, { status: 400 });
    }

    if (fileType === "video" && !uploadedFile.type.startsWith("video/")) {
      return json({ error: "Only video files are allowed for videos" }, { status: 400 });
    }

    // Generate unique filename
    let fileExt = "";
    if (fileType === "image") {
      fileExt = uploadedFile.type === "image/jpeg" ? ".jpg" : ".png";
    } else if (fileType === "video") {
      // Extract extension from MIME type (e.g., video/mp4 -> .mp4)
      const mimeExtMatch = uploadedFile.type.match(/\/([a-z0-9]+)$/i);
      fileExt = mimeExtMatch ? `.${mimeExtMatch[1]}` : ".mp4"; // Default to .mp4 if can't determine
    }

    const fileName = `${randomUUID()}${fileExt}`;
    
    // Create upload directory path
    const uploadDir = path.join(process.cwd(), "public", "upload");
    
    // Ensure upload directory exists
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (err) {
      console.error("Error creating upload directory:", err);
    }
    
    // Set file path
    const filePath = path.join(uploadDir, fileName);
    
    // Save file
    const buffer = Buffer.from(await uploadedFile.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    
    // Return the file URL path
    const fileUrl = `/upload/${fileName}`;
    
    return json({ success: true, url: fileUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return json({ error: "File upload failed" }, { status: 500 });
  }
}; 
