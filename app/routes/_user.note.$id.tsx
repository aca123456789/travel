import { useState, useRef } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { ChevronLeft, ChevronRight, MapPin, ArrowLeft, Play, User } from "lucide-react";
import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { getNoteById } from "~/services/notes.server";
import { getLoggedInUser } from "~/services/auth.server";

// Define types for our data
interface Media {
  id: number;
  noteId: string;
  mediaType: "image" | "video";
  url: string;
  order: number;
}

interface NoteAuthor {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

// Define a type for the loader data
interface LoaderData {
  note: {
    id: string;
    userId: string;
    title: string;
    content: string;
    location: string | null;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
    updatedAt: string;
    media: Media[];
    user: NoteAuthor;
  };
  isAuthor: boolean;
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.note) {
    return [
      { title: "游记未找到 - 旅游日记" },
    ];
  }
  
  return [
    { title: `${data.note.title} - 旅游日记` },
    { name: "description", content: data.note.content.substring(0, 160) },
    // Open Graph tags for social sharing
    { property: "og:title", content: data.note.title },
    { property: "og:description", content: data.note.content.substring(0, 160) },
    { property: "og:image", content: data.note.media[0]?.url },
    { property: "og:type", content: "article" }
  ];
};

export const loader: LoaderFunction = async ({ params, request }) => {
  const { id } = params;
  if (!id) {
    throw new Response("游记ID未提供", { status: 400 });
  }
  
  // Get current user (optional, for checking if user is the author)
  const user = await getLoggedInUser(request);
  
  // Get note from database
  const note = await getNoteById(id);
  
  if (!note) {
    throw new Response("游记未找到", { status: 404 });
  }
  
  // If note is not approved, only allow the author or admins to view it
  if (note.status !== "approved" && 
      (!user || (user.id !== note.userId && user.role !== "admin"))) {
    throw new Response("该游记尚未审核通过，无法查看", { status: 403 });
  }
  
  return json({ note, isAuthor: user?.id === note.userId });
};

export default function NoteDetail() {
  const { note, isAuthor } = useLoaderData<LoaderData>();
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  
  const mediaRef = useRef<HTMLDivElement>(null);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Get current media
  const currentMedia = note.media[currentMediaIndex];
  
  // Navigate through media
  const goToPrevious = () => {
    setCurrentMediaIndex((prev) => 
      prev === 0 ? note.media.length - 1 : prev - 1
    );
  };
  
  const goToNext = () => {
    setCurrentMediaIndex((prev) => 
      prev === note.media.length - 1 ? 0 : prev + 1
    );
  };
  
  // Handle image zoom
  const toggleZoom = () => {
    if (currentMedia && currentMedia.mediaType === "image") {
      setIsZoomed(!isZoomed);
    }
  };
  
  return (
    <div className="pb-20">
      {/* Back button */}
      <div className="mb-4 flex justify-between">
        <Link 
          to="/" 
          className="inline-flex items-center text-gray-600 hover:text-gray-900 transition duration-200"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span className="text-sm">返回首页</span>
        </Link>
        
        {isAuthor && (
          <Link 
            to={`/edit/${note.id}`}
            className="inline-flex items-center text-primary-600 hover:text-primary-700 transition duration-200"
          >
            <span className="text-sm">编辑游记</span>
          </Link>
        )}
      </div>
      
      <article className="bg-white rounded-xl shadow-md overflow-hidden">
        {/* Media gallery with zoom effect */}
        <div 
          ref={mediaRef}
          className={`relative ${isZoomed ? 'fixed inset-0 z-50 bg-black flex items-center justify-center' : ''}`}
        >
          {currentMedia && currentMedia.mediaType === "image" ? (
            <button 
              onClick={toggleZoom}
              className={`block w-full border-0 p-0 bg-transparent ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
              aria-label={isZoomed ? "缩小图片" : "放大图片"}
            >
              <img 
                src={currentMedia.url}
                alt={`${note.title} 图片 ${currentMediaIndex + 1}`}
                className={`${isZoomed 
                  ? 'max-h-screen max-w-full object-contain'
                  : 'w-full h-72 sm:h-96 md:h-[32rem] object-cover'}`}
              />
            </button>
          ) : currentMedia && currentMedia.mediaType === "video" ? (
            <div className="relative w-full">
              <video
                src={currentMedia.url}
                controls
                poster={note.media.find((m: Media) => m.mediaType === "image")?.url}
                className="w-full h-72 sm:h-96 md:h-[32rem] object-cover"
              >
                <track kind="captions" src="" label="中文" />
                您的浏览器不支持视频播放
              </video>
              {/* Video indicator badge */}
              <div className="absolute top-4 right-4 bg-black/70 text-white text-xs font-medium px-2.5 py-1 rounded-full flex items-center">
                <Play className="h-3 w-3 mr-1 fill-white" />
                视频
              </div>
            </div>
          ) : (
            <div className="w-full h-72 sm:h-96 md:h-[32rem] bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500">无媒体内容</span>
            </div>
          )}
          
          {/* Media navigation buttons (only show when not zoomed) */}
          {note.media.length > 1 && !isZoomed && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-white/90 text-gray-800 p-2 rounded-full hover:bg-white shadow-md transition-all duration-200"
                aria-label="上一张"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-white/90 text-gray-800 p-2 rounded-full hover:bg-white shadow-md transition-all duration-200"
                aria-label="下一张"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
          
          {/* Close zoom button */}
          {isZoomed && (
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute top-4 right-4 bg-white/20 text-white p-2 rounded-full hover:bg-white/40 transition-all duration-200"
              aria-label="关闭"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          
          {/* Media counter and location badge (only show when not zoomed) */}
          {!isZoomed && (
            <div className="absolute bottom-4 left-4 flex flex-col space-y-2">
              {/* Media counter badge */}
              {note.media.length > 0 && (
                <div className="bg-black/70 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                  {currentMediaIndex + 1} / {note.media.length}
                </div>
              )}
              
              {/* Location badge */}
              {note.location && (
                <div className="bg-black/70 text-white text-xs font-medium px-2.5 py-1 rounded-full flex items-center">
                  <MapPin className="h-3 w-3 mr-1" />
                  {note.location}
                </div>
              )}
            </div>
          )}
          
          {/* Media indicator dots (only show when not zoomed) */}
          {note.media.length > 1 && !isZoomed && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
              {note.media.map((media: Media, index: number) => (
                <button
                  key={index}
                  onClick={() => setCurrentMediaIndex(index)}
                  className={`h-2 w-2 rounded-full transition-all duration-200 ${
                    index === currentMediaIndex 
                      ? 'bg-white w-6' 
                      : 'bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`查看第 ${index + 1} 张媒体`}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Note content */}
        <div className="px-4 py-6 sm:px-8 sm:py-8">
          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-6">{note.title}</h1>
          
          {/* Author info */}
          <div className="flex items-center mb-8">
            {note.user.avatarUrl ? (
              <img
                src={note.user.avatarUrl}
                alt={note.user.nickname}
                className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center border-2 border-white shadow-sm">
                <User className="h-6 w-6 text-gray-500" />
              </div>
            )}
            <div className="ml-3">
              <div className="font-medium text-gray-900">{note.user.nickname}</div>
              <div className="text-sm text-gray-500">
                <time dateTime={note.createdAt}>
                  {formatDate(note.createdAt)}
                </time>
              </div>
            </div>
          </div>
          
          {/* Content with proper formatting */}
          <div className="prose prose-sm sm:prose lg:prose-lg max-w-none">
            {note.content.split('\n\n').map((paragraph: string, index: number) => {
              // Check if paragraph is a list of items (starts with number and period)
              if (/^\d+\.\s/.test(paragraph)) {
                const listItems = paragraph.split('\n').map((item: string) => item.replace(/^\d+\.\s/, '').trim());
                return (
                  <div key={index} className="mb-6">
                    <ol className="list-decimal pl-5">
                      {listItems.map((item: string, itemIndex: number) => (
                        <li key={itemIndex} className="mb-2 text-gray-800">{item}</li>
                      ))}
                    </ol>
                  </div>
                );
              }
              
              // Check if paragraph contains bullet points
              else if (paragraph.includes('\n- ')) {
                const [title, ...listItems] = paragraph.split('\n- ');
                return (
                  <div key={index} className="mb-6">
                    {title && <p className="mb-2 text-gray-800 font-medium">{title}</p>}
                    <ul className="list-disc pl-5">
                      {listItems.map((item: string, itemIndex: number) => (
                        <li key={itemIndex} className="mb-2 text-gray-800">{item}</li>
                      ))}
                    </ul>
                  </div>
                );
              }
              
              // Regular paragraph
              else {
                return (
                  <p key={index} className="mb-6 text-gray-800 leading-relaxed">
                    {paragraph}
                  </p>
                );
              }
            })}
          </div>
          
          {/* Media gallery for all images */}
          {note.media.length > 1 && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">所有图片和视频</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {note.media.map((media: Media, index: number) => (
                  <button
                    key={media.id}
                    onClick={() => {
                      setCurrentMediaIndex(index);
                      window.scrollTo({
                        top: mediaRef.current?.offsetTop || 0,
                        behavior: 'smooth'
                      });
                    }}
                    className={`relative rounded-lg overflow-hidden aspect-square group ${
                      currentMediaIndex === index 
                        ? 'ring-2 ring-primary-500' 
                        : 'ring-1 ring-gray-200'
                    }`}
                    aria-label={`查看第 ${index + 1} 张媒体`}
                  >
                    {media.mediaType === "image" ? (
                      <img
                        src={media.url}
                        alt={`缩略图 ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center">
                        <Play className="h-8 w-8 text-white mb-1" />
                        <span className="text-white text-xs">播放视频</span>
                      </div>
                    )}
                    
                    {/* Selected indicator */}
                    {currentMediaIndex === index && (
                      <div className="absolute top-2 right-2 bg-primary-500 text-white rounded-full p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L9 11.586l-2.293-2.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l7-7a1 1 0 000-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
} 
 