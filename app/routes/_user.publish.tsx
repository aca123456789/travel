import { useState, useRef, useEffect } from "react";
import { Form, useActionData, useNavigation, useSubmit, useFetcher } from "@remix-run/react";
import { json, redirect } from "@remix-run/node";
import type { ActionFunction, MetaFunction, LoaderFunction } from "@remix-run/node";
import { Image, X, Loader2, Video, Upload, MapPin } from "lucide-react";
import { requireLoggedInUser } from "~/services/auth.server";
import { createNote } from "~/services/notes.server";
import type { User } from "~/types";

export const meta: MetaFunction = () => {
  return [
    { title: "发布游记 - 旅游日记" },
    { name: "description", content: "发布您的旅游日记，分享旅行记忆" },
  ];
};

// Require authentication for this route
export const loader: LoaderFunction = async ({ request }) => {
  const user = await requireLoggedInUser(request);
  return json({ user });
};

interface ActionData {
  errors?: {
    title?: string;
    content?: string;
    images?: string;
    general?: string;
  };
  formData?: {
    title?: string;
    content?: string;
    location?: string;
  };
}

// Interface for our media items
interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  isUploaded: boolean; // Track if the file has been uploaded to server
  file?: File;
}

// Interface for upload API response
interface UploadResponse {
  success?: boolean;
  url?: string;
  error?: string;
}

export const action: ActionFunction = async ({ request }) => {
  // Ensure user is authenticated
  const user = await requireLoggedInUser(request) as User;
  
  const formData = await request.formData();
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const location = formData.get("location") as string;
  const mediaUrls = formData.getAll("mediaUrls[]") as string[];
  const mediaTypes = formData.getAll("mediaTypes[]") as string[];
  
  const errors: ActionData["errors"] = {};
  
  // Validate form input
  if (!title?.trim()) {
    errors.title = "请输入游记标题";
  }
  
  if (!content?.trim()) {
    errors.content = "请输入游记内容";
  }
  
  // 验证媒体文件
  if (mediaUrls.length === 0) {
    errors.images = "请至少上传一张图片或一个视频";
  }
  
  // Return errors if validation failed
  if (Object.keys(errors).length > 0) {
    return json<ActionData>(
      { errors, formData: { title, content, location } },
      { status: 400 }
    );
  }
  
  try {
    // Process media items
    const mediaArray = mediaUrls.map((url, index) => ({
      type: mediaTypes[index] as "image" | "video",
      url,
      order: index
    }));
    
    // Create the note in the database
    const noteResult = await createNote({
      userId: user.id,
      title,
      content,
      location,
      media: mediaArray
    });
    
    if (!noteResult) {
      throw new Error("Failed to create note");
    }
    
    // Redirect to the user's travel notes page
    return redirect("/my-notes");
  } catch (error) {
    console.error("Error creating note:", error);
    return json<ActionData>(
      { 
        errors: { 
          general: "游记发布失败，请稍后重试"
        },
        formData: { title, content, location } 
      },
      { status: 500 }
    );
  }
};

export default function Publish() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const submit = useSubmit();
  const uploadFetcher = useFetcher<UploadResponse>();
  
  // References for file inputs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  // State for uploaded media
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [currentUpload, setCurrentUpload] = useState<File | null>(null);
  const [location, setLocation] = useState(actionData?.formData?.location || "");
  
  // Open file pickers
  const openImagePicker = () => {
    imageInputRef.current?.click();
  };
  
  const openVideoPicker = () => {
    videoInputRef.current?.click();
  };
  
  // Process the upload queue
  const processUploadQueue = async () => {
    if (uploadQueue.length === 0 || isUploading) return;
    
    setIsUploading(true);
    const fileToUpload = uploadQueue[0];
    setCurrentUpload(fileToUpload);
    
    try {
      // Create form data for upload
      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("fileType", fileToUpload.type.startsWith('image/') ? 'image' : 'video');
      
      // Upload the file
      uploadFetcher.submit(formData, {
        method: "post",
        action: "/api/upload",
        encType: "multipart/form-data",
      });
    } catch (error) {
      console.error("上传文件失败:", error);
      // Remove file from queue
      setUploadQueue(prev => prev.slice(1));
      setIsUploading(false);
    }
  };
  
  // Effect to process upload queue
  useEffect(() => {
    processUploadQueue();
  }, [uploadQueue, isUploading]);
  
  // Effect to handle upload response
  useEffect(() => {
    if (uploadFetcher.data && uploadFetcher.state === "idle") {
      // Upload completed
      if (uploadFetcher.data.success && uploadFetcher.data.url) {
        // Update the media item with the real URL
        if (currentUpload) {
          setMediaItems(prev => {
            return prev.map(item => {
              // Find item by file comparison
              if (item.file && item.file.name === currentUpload.name &&
                  item.file.size === currentUpload.size &&
                  item.file.lastModified === currentUpload.lastModified) {
                return {
                  ...item,
                  url: uploadFetcher.data?.url || "",
                  isUploaded: true,
                };
              }
              return item;
            });
          });
        }
      } else if (uploadFetcher.data.error) {
        // Handle upload error
        alert(`上传失败: ${uploadFetcher.data.error}`);
        
        // Remove the failed item
        if (currentUpload) {
          setMediaItems(prev => 
            prev.filter(item => 
              !(item.file && item.file.name === currentUpload.name &&
                item.file.size === currentUpload.size &&
                item.file.lastModified === currentUpload.lastModified)
            )
          );
        }
      }
      
      // Remove processed file from queue
      setUploadQueue(prev => prev.slice(1));
      setCurrentUpload(null);
      setIsUploading(false);
    }
  }, [uploadFetcher.data, uploadFetcher.state, currentUpload]);
  
  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Process each selected file
    Array.from(files).forEach(file => {
      // File type validation
      if (!file.type.startsWith('image/')) {
        console.error("只能上传图片文件");
        return;
      }
      
      // Create temporary URL for preview
      const imageUrl = URL.createObjectURL(file);
      
      // Generate a temporary ID
      const newImageId = Math.random().toString(36).substring(2, 10);
      
      // Add to media items
      setMediaItems(prev => [
        ...prev, 
        { 
          id: newImageId, 
          url: imageUrl, 
          type: "image", 
          isUploaded: false,
          file
        }
      ]);
      
      // Add to upload queue
      setUploadQueue(prev => [...prev, file]);
    });
    
    // Reset the input
    e.target.value = '';
  };
  
  // Handle video selection
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0]; // We only take the first video file
    
    // File type validation
    if (!file.type.startsWith('video/')) {
      console.error("只能上传视频文件");
      return;
    }
    
    // File size validation (max 100MB)
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB in bytes
    if (file.size > MAX_SIZE) {
      alert("视频文件太大，最大允许100MB");
      e.target.value = '';
      return;
    }
    
    // Create temporary URL for preview
    const videoUrl = URL.createObjectURL(file);
    
    // Generate a temporary ID
    const newVideoId = Math.random().toString(36).substring(2, 10);
    
    // Add to media items
    setMediaItems(prev => [
      ...prev, 
      { 
        id: newVideoId, 
        url: videoUrl, 
        type: "video", 
        isUploaded: false,
        file
      }
    ]);
    
    // Add to upload queue
    setUploadQueue(prev => [...prev, file]);
    
    // Reset the input
    e.target.value = '';
  };
  
  // Remove a media item
  const removeMediaItem = (id: string) => {
    setMediaItems(prev => {
      const itemToRemove = prev.find(item => item.id === id);
      
      // If the item has a file that's in the upload queue, remove it
      if (itemToRemove?.file && !itemToRemove.isUploaded) {
        setUploadQueue(queue => 
          queue.filter(queuedFile => 
            !(itemToRemove.file &&
              queuedFile.name === itemToRemove.file.name &&
              queuedFile.size === itemToRemove.file.size &&
              queuedFile.lastModified === itemToRemove.file.lastModified)
          )
        );
      }
      
      // Revoke object URL if it's a client-side URL
      if (itemToRemove?.url.startsWith('blob:')) {
        URL.revokeObjectURL(itemToRemove.url);
      }
      
      return prev.filter(item => item.id !== id);
    });
  };
  
  // Get Video items
  const videoItems = mediaItems.filter(item => item.type === "video");
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // If there are still files being uploaded, prevent submission
    if (isUploading || uploadQueue.length > 0) {
      alert("请等待所有文件上传完成");
      return;
    }
    
    // 检查是否有已上传的媒体文件
    const uploadedMedia = mediaItems.filter(item => item.isUploaded);
    if (uploadedMedia.length === 0) {
      alert("请至少上传一张图片或一个视频");
      return;
    }
    
    // Get form data
    const formData = new FormData(e.currentTarget);
    
    // Add location
    formData.set("location", location);
    
    // Add all uploaded media URLs and types
    mediaItems.forEach(item => {
      if (item.isUploaded) {
        formData.append("mediaUrls[]", item.url);
        formData.append("mediaTypes[]", item.type);
      }
    });
    
    // Submit the form
    submit(formData, { method: "post" });
  };
  
  // Count how many items are still uploading
  const uploadingCount = mediaItems.filter(item => !item.isUploaded).length;
  
  return (
    <div className="pb-20">
      <div className="bg-white rounded-xl overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h1 className="text-lg font-medium text-gray-900">发布游记</h1>
          <p className="mt-1 text-sm text-gray-500">
            分享您的旅行体验和精彩瞬间
          </p>
        </div>
        
        <Form method="post" className="p-4 sm:p-6" onSubmit={handleSubmit}>
          {/* Title input */}
          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              游记标题
            </label>
            <input
              type="text"
              name="title"
              id="title"
              className={`block w-full px-3 py-2 border ${
                actionData?.errors?.title ? 'border-red-300' : 'border-gray-300'
              } rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
              placeholder="给您的游记取个有吸引力的标题吧"
              defaultValue={actionData?.formData?.title || ""}
            />
            {actionData?.errors?.title && (
              <p className="mt-1 text-sm text-red-600">
                {actionData.errors.title}
              </p>
            )}
          </div>
          
          {/* Location input */}
          <div className="mb-6">
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              旅行地点
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="例如：北京, 故宫"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              填写旅行的主要地点，方便其他用户查找
            </p>
          </div>
          
          {/* Content textarea */}
          <div className="mb-6">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              游记内容
            </label>
            <textarea
              name="content"
              id="content"
              rows={6}
              className={`block w-full px-3 py-2 border ${
                actionData?.errors?.content ? 'border-red-300' : 'border-gray-300'
              } rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
              placeholder="详细描述您的旅行体验，包括推荐的景点、美食和注意事项等"
              defaultValue={actionData?.formData?.content || ""}
            />
            {actionData?.errors?.content && (
              <p className="mt-1 text-sm text-red-600">
                {actionData.errors.content}
              </p>
            )}
          </div>
          
          {/* Media uploads */}
          <div className="mb-6" role="group" aria-labelledby="media-group-label">
            <div id="media-group-label" className="block text-sm font-medium text-gray-700 mb-1">
              图片和视频
            </div>
            <p className="text-sm text-gray-500 mb-3">
              上传图片（必选）和视频（可选）来丰富您的游记
            </p>
            
            {/* Hidden file inputs */}
            <input
              type="file"
              ref={imageInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              aria-label="上传图片"
            />
            <input
              type="file"
              ref={videoInputRef}
              className="hidden"
              accept="video/*"
              onChange={handleVideoChange}
              aria-label="上传视频"
            />
            
            {/* Upload buttons */}
            <div className="flex flex-wrap gap-4 mb-4">
              <button
                type="button"
                onClick={openImagePicker}
                disabled={isUploading}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="添加图片"
              >
                <Image className="mr-2 h-5 w-5 text-gray-400" aria-hidden="true" />
                添加图片
              </button>
              
              <button
                type="button"
                onClick={openVideoPicker}
                disabled={isUploading || videoItems.length > 0}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="添加视频"
              >
                <Video className="mr-2 h-5 w-5 text-gray-400" aria-hidden="true" />
                添加视频
              </button>
            </div>
            
            {/* Error message */}
            {actionData?.errors?.images && (
              <p className="mt-1 text-sm text-red-600 mb-3">
                {actionData.errors.images}
              </p>
            )}
            
            {/* General error message */}
            {actionData?.errors?.general && (
              <p className="mt-1 text-sm text-red-600 mb-3">
                {actionData.errors.general}
              </p>
            )}
            
            {/* Upload status */}
            {uploadingCount > 0 && (
              <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-md mb-4">
                <div className="flex items-center">
                  <Loader2 className="animate-spin mr-2 h-5 w-5" />
                  <span>正在上传 {uploadingCount} 个文件...</span>
                </div>
                <div className="mt-2 h-2 w-full bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${(mediaItems.length - uploadingCount) / mediaItems.length * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {/* Image preview grid */}
            {mediaItems.filter(item => item.type === "image").length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                {mediaItems.filter(item => item.type === "image").map(img => (
                  <div key={img.id} className="relative rounded-md overflow-hidden bg-gray-100 aspect-square">
                    <img
                      src={img.url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeMediaItem(img.id)}
                      className="absolute top-1 right-1 bg-gray-800 bg-opacity-70 text-white p-1 rounded-full hover:bg-opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    {!img.isUploaded && (
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                        <Loader2 className="animate-spin h-8 w-8 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Video preview */}
            {videoItems.length > 0 && videoItems.map(vid => (
              <div key={vid.id} className="relative rounded-md overflow-hidden bg-gray-100 mb-4">
                <video
                  src={vid.url}
                  controls
                  className="w-full h-48 object-cover"
                >
                  <track kind="captions" src="" label="中文" />
                  您的浏览器不支持视频播放
                </video>
                <button
                  type="button"
                  onClick={() => removeMediaItem(vid.id)}
                  className="absolute top-2 right-2 bg-gray-800 bg-opacity-70 text-white p-1 rounded-full hover:bg-opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
                {!vid.isUploaded && (
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                    <Loader2 className="animate-spin h-8 w-8 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Submit button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={
                isSubmitting || 
                isUploading || 
                uploadQueue.length > 0 ||
                mediaItems.filter(item => item.isUploaded).length === 0 // 禁用按钮，如果没有已上传的媒体文件
              }
              className="inline-flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-5 w-5" />
                  发布中...
                </>
              ) : isUploading || uploadQueue.length > 0 ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-5 w-5" />
                  等待上传完成...
                </>
              ) : mediaItems.filter(item => item.isUploaded).length === 0 ? (
                <>
                  <Upload className="mr-2 h-5 w-5" />
                  请上传媒体文件
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-5 w-5" />
                  发布游记
                </>
              )}
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
} 
 
