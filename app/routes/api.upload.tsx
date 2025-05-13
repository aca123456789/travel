import { ActionFunction, json } from "@remix-run/node";
import { getLoggedInUser } from "~/services/auth.server";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";

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
    
    if (fileType === "image") {
      // 使用 sharp 压缩图片，保持较高的质量（85）
      let sharpInstance = sharp(buffer);
      
      // 根据图片类型设置输出格式
      if (uploadedFile.type === "image/jpeg") {
        sharpInstance = sharpInstance.jpeg({ quality: 85 });
      } else if (uploadedFile.type === "image/png") {
        sharpInstance = sharpInstance.png({ quality: 85 });
      }
      
      // 保存压缩后的图片
      const compressedBuffer = await sharpInstance.toBuffer();
      await fs.writeFile(filePath, compressedBuffer);
      console.log(`图片压缩完成: ${fileName} (原大小: ${buffer.length} 字节, 压缩后: ${compressedBuffer.length} 字节)`);
    } else {
      // 对于视频或其他文件类型，直接保存原始文件
      await fs.writeFile(filePath, buffer);
    }
    
    // Return the file URL path
    const fileUrl = `/upload/${fileName}`;
    
    return json({ success: true, url: fileUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return json({ error: "File upload failed" }, { status: 500 });
  }
}; 
