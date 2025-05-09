import { useState, useRef, useEffect } from "react";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
  useFetcher,
} from "@remix-run/react";
import { json, redirect } from "@remix-run/node";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { getLoggedInUser } from "~/services/auth.server";
import { db, users } from "~/db";
import { eq } from "drizzle-orm";
import { Camera, UserCircle, Upload } from "lucide-react";

// Type for upload API response
interface UploadResponse {
  success?: boolean;
  url?: string;
  error?: string;
}

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getLoggedInUser(request);
  
  if (!user) {
    return redirect("/login?redirectTo=/settings");
  }
  
  return json({ user });
};

export const action: ActionFunction = async ({ request }) => {
  const user = await getLoggedInUser(request);
  
  if (!user) {
    return json({ error: "未登录" }, { status: 401 });
  }
  
  const formData = await request.formData();
  const nickname = formData.get("nickname")?.toString();
  const avatarUrl = formData.get("avatarUrl")?.toString();
  
  console.log('Updating profile with:', { nickname, avatarUrl });
  
  // Validation
  if (!nickname || nickname.trim() === "") {
    return json({ error: "昵称不能为空" }, { status: 400 });
  }
  
  try {
    // Update user profile
    await db.update(users).set({
      nickname,
      avatarUrl: avatarUrl || user.avatarUrl, // Only update if provided
    }).where(eq(users.id, user.id));
    
    return json({ success: true });
  } catch (error) {
    console.error("Error updating profile:", error);
    return json({ error: "更新资料失败，请稍后再试" }, { status: 500 });
  }
};

export default function SettingsPage() {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const submit = useSubmit();
  const uploadFetcher = useFetcher();
  
  const [nickname, setNickname] = useState(user.nickname || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Reset form data when user data changes
  useEffect(() => {
    setNickname(user.nickname || "");
    setAvatarUrl(user.avatarUrl || "");
    setPreviewUrl(null); // Reset preview when user data changes
  }, [user]);
  
  // Handle avatar file upload
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Create a preview URL for immediate feedback
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setIsUploading(true);
    
    // Upload the file using our API
    const formData = new FormData();
    formData.append("file", file);
    
    uploadFetcher.submit(formData, {
      method: "post",
      action: "/api/upload",
      encType: "multipart/form-data",
    });
  };
  
  // Update the avatar URL when upload completes
  useEffect(() => {
    const data = uploadFetcher.data as UploadResponse | undefined;
    
    if (data?.success && data?.url) {
      setAvatarUrl(data.url);
      setIsUploading(false);
      // Clear the preview URL so the actual server URL is used
      setPreviewUrl(null);
    } else if (data?.error) {
      // Handle upload error
      setIsUploading(false);
      alert("头像上传失败: " + data.error);
      
      // Reset preview if there was an error
      setPreviewUrl(null);
    }
  }, [uploadFetcher]);
  
  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append("nickname", nickname);
    if (avatarUrl) {
      formData.append("avatarUrl", avatarUrl);
    }
    
    submit(formData, { method: "post" });
  };
  
  // Get the correct avatar display URL
  // When uploading, show the preview. Otherwise, show the server URL
  const displayAvatar = isUploading && previewUrl ? previewUrl : avatarUrl || "";
  
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">账号设置</h1>
      
      {actionData?.error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg">
          {actionData.error}
        </div>
      )}
      
      {actionData?.success && (
        <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg">
          资料更新成功！
        </div>
      )}
      
      {uploadFetcher.data && (uploadFetcher.data as UploadResponse).error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg">
          图片上传失败: {(uploadFetcher.data as UploadResponse).error}
        </div>
      )}
      
      <Form method="post" onSubmit={handleSubmit}>
        {/* Avatar Upload */}
        <div className="mb-6">
          <label htmlFor="avatar-upload" className="block text-sm font-medium text-gray-700 mb-2">
            头像
          </label>
          <div className="flex items-center">
            <div className="relative">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                  <UserCircle className="w-16 h-16 text-gray-400" />
                </div>
              )}
              <button
                type="button"
                onClick={triggerFileInput}
                disabled={isUploading}
                className="absolute bottom-0 right-0 bg-primary-600 text-white p-1 rounded-full"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div className="ml-4">
              <button
                type="button"
                onClick={triggerFileInput}
                disabled={isUploading}
                className={`flex items-center text-sm text-primary-600 border border-primary-600 px-3 py-1.5 rounded-lg ${
                  isUploading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isUploading ? (
                  <span>上传中...</span>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-1" />
                    上传头像
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 mt-1">
                支持 JPG, PNG 格式
              </p>
            </div>
            <input
              type="file"
              id="avatar-upload"
              ref={fileInputRef}
              className="hidden"
              accept="image/jpeg,image/png"
              onChange={handleAvatarChange}
              disabled={isUploading}
            />
            <input type="hidden" name="avatarUrl" value={avatarUrl} />
          </div>
        </div>
        
        {/* Nickname */}
        <div className="mb-6">
          <label 
            htmlFor="nickname" 
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            昵称
          </label>
          <input
            type="text"
            id="nickname"
            name="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="输入你的昵称"
            required
          />
        </div>
        
        {/* Submit Button */}
        <div className="mt-8">
          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className={`w-full py-3 px-4 bg-primary-600 text-white font-medium rounded-lg transition-colors duration-200 ${
              isSubmitting || isUploading
                ? "opacity-70 cursor-not-allowed"
                : "hover:bg-primary-700"
            }`}
          >
            {isSubmitting ? "保存中..." : "保存修改"}
          </button>
        </div>
      </Form>
    </div>
  );
} 
