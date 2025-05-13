import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { Search, MapPin, User, LayoutGrid, LayoutList } from "lucide-react";
import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { getLoggedInUser } from "~/services/auth.server";
import { getPublishedNotes } from "~/services/notes.server";
import { db, travelNotes as travelNotesTable } from "~/db";
import { desc, sql, eq } from "drizzle-orm";
import { formatDistance } from "date-fns";
import { zhCN } from "date-fns/locale";

export const meta: MetaFunction = () => {
  return [
    { title: "旅游日记 - 探索精彩旅程" },
    { description: "发现和分享旅行中的精彩瞬间" },
  ];
};

// Define types for our data
interface Media {
  id: string;
  noteId: string;
  mediaType: "image" | "video";
  url: string;
  order: number;
}

interface NoteUser {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

interface TravelNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  location: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  user: NoteUser;
  media: Media[];
}

interface Destination {
  location: string;
  count: number;
}

export const loader: LoaderFunction = async ({ request }) => {
  // 获取用户登录状态
  const user = await getLoggedInUser(request);
  
  // 从数据库获取已审核通过的游记列表
  const publishedNotes = await getPublishedNotes({ limit: 20 });
  
  // 获取热门目的地（按地点分组，计算每个地点的游记数量）
  const popularDestinations = await db
    .select({
      location: sql<string>`location`,
      count: sql<number>`count(*)::int`,
    })
    .from(travelNotesTable)
    .where(
      eq(travelNotesTable.status, "approved"),
    )
    .groupBy(sql`location`)
    .orderBy(desc(sql`count(*)`))
    .limit(6);
  
  return json({
    travelNotes: publishedNotes,
    popularDestinations,
    user
  });
};

export default function Index() {
  const { travelNotes, popularDestinations } = useLoaderData<typeof loader>();
  const [searchTerm, setSearchTerm] = useState("");
  const [isGridLayout, setIsGridLayout] = useState(true);
  console.log('popularDestinations', popularDestinations)
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Toggle layout between grid and list
  const toggleLayout = () => {
    setIsGridLayout(!isGridLayout);
  };
  
  // Filter notes based on search term
  const filteredNotes = travelNotes.filter((note: TravelNote) => 
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (note.user.nickname && note.user.nickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (note.location && note.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Split notes for two-column layout
  const leftColumnNotes = filteredNotes.filter((_: TravelNote, index: number) => index % 2 === 0);
  const rightColumnNotes = filteredNotes.filter((_: TravelNote, index: number) => index % 2 !== 0);
  
  // Format date
  const formatDate = (dateString: string | Date) => {
    if (!dateString) return "";
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return formatDistance(date, new Date(), { locale: zhCN, addSuffix: true });
  };
  
  // Get cover image for a note
  const getNoteCoverImage = (note: TravelNote) => {
    if (note.media && note.media.length > 0) {
      // 优先使用第一张图片作为封面
      const coverImage = note.media.find(m => m.mediaType === "image");
      if (coverImage) return { type: "image", url: coverImage.url };
      
      // 如果没有图片，但有视频，使用第一个视频
      const coverVideo = note.media.find(m => m.mediaType === "video");
      if (coverVideo) return { type: "video", url: coverVideo.url };
    }
    // 默认图片
    return { type: "image", url: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?q=80&w=1000" };
  };
  
  return (
    <div className="pb-6">
      {/* Hero section with search */}
      <div className="relative mb-8 bg-gradient-to-r from-primary-100 to-primary-50 rounded-xl overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-pattern-dots"></div>
        <div className="relative px-4 py-8 md:px-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">探索旅行者的精彩故事</h1>
          <p className="text-gray-600 mb-6 max-w-xl">发现世界各地的美景，获取旅行灵感，记录您的旅途点滴</p>
          
          {/* Enhanced search bar */}
          <div className="relative max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-primary-500" />
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-full
                        bg-white shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 
                        focus:border-primary-500 text-gray-600 placeholder-gray-400 transition-all duration-200"
              placeholder="搜索目的地、游记标题或作者..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-4">
              <span className="text-xs text-gray-400">
                {filteredNotes.length} 个结果
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-8">
          {/* Layout toggle and notes count */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">共 {filteredNotes.length} 篇游记</span>
            <button 
              onClick={toggleLayout}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-sm text-gray-700 transition-colors duration-200"
            >
              {!isGridLayout ? (
                <>
                  <LayoutList className="h-4 w-4" />
                  <span className="hidden xs:inline">单列视图</span>
                </>
              ) : (
                <>
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden xs:inline">双列视图</span>
                </>
              )}
            </button>
          </div>
          
          {/* Travel notes grid/list */}
          <div className={`${isGridLayout ? 'grid grid-cols-2 gap-4' : 'space-y-4'}`}>
            {isGridLayout ? (
              <>
                <div className="space-y-4">
                  {leftColumnNotes.map((note: TravelNote) => (
                    <Link 
                      key={note.id} 
                      to={`/note/${note.id}`} 
                      className="group h-max bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 block"
                    >
                      {/* 双列布局 - 瀑布流卡片 */}
                      <>
                        <div className="relative overflow-hidden">
                          {getNoteCoverImage(note).type === "image" ? (
                            <img 
                              src={getNoteCoverImage(note).url} 
                              alt={note.title}
                              className="w-full max-h-[200px] object-cover transform group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <video 
                              src={getNoteCoverImage(note).url}
                              className="w-full max-h-[200px] object-cover transform group-hover:scale-105 transition-transform duration-300"
                              preload="metadata"
                              muted
                              playsInline
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60"></div>
                          {note.location && (
                            <div className="absolute bottom-2 left-2 flex items-center text-white">
                              <MapPin className="h-3 w-3 mr-1" />
                              <span className="text-xs font-medium">{note.location}</span>
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors duration-200">
                            {note.title}
                          </h3>
                          
                          <p className="text-gray-600 mt-1 text-xs line-clamp-3">
                            {note.content.replace(/<[^>]*>/g, '').substring(0, 120)}...
                          </p>
                          
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center">
                              {note.user.avatarUrl ? (
                                <img 
                                  src={note.user.avatarUrl} 
                                  alt={note.user.nickname}
                                  className="h-5 w-5 rounded-full ring-1 ring-white object-cover"
                                />
                              ) : (
                                <div className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center ring-1 ring-white">
                                  <User className="h-3 w-3 text-gray-500" />
                                </div>
                              )}
                              <span className="ml-1 text-xs text-gray-600 truncate max-w-[80px]">{note.user.nickname}</span>
                            </div>
                            <div className="text-xs text-gray-400">
                              {formatDate(note.createdAt)}
                            </div>
                          </div>
                        </div>
                      </>
                    </Link>
                  ))}
                </div>
                <div className="space-y-4">
                  {rightColumnNotes.map((note: TravelNote) => (
                    <Link 
                      key={note.id} 
                      to={`/note/${note.id}`} 
                      className="group h-max bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 block"
                    >
                      {/* 双列布局 - 瀑布流卡片 */}
                      <>
                        <div className="relative overflow-hidden">
                          {getNoteCoverImage(note).type === "image" ? (
                            <img 
                              src={getNoteCoverImage(note).url} 
                              alt={note.title}
                              className="w-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <video 
                              src={getNoteCoverImage(note).url}
                              className="w-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                              preload="metadata"
                              muted
                              playsInline
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60"></div>
                          {note.location && (
                            <div className="absolute bottom-2 left-2 flex items-center text-white">
                              <MapPin className="h-3 w-3 mr-1" />
                              <span className="text-xs font-medium">{note.location}</span>
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors duration-200">
                            {note.title}
                          </h3>
                          
                          <p className="text-gray-600 mt-1 text-xs line-clamp-3">
                            {note.content.replace(/<[^>]*>/g, '').substring(0, 120)}...
                          </p>
                          
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center">
                              {note.user.avatarUrl ? (
                                <img 
                                  src={note.user.avatarUrl} 
                                  alt={note.user.nickname}
                                  className="h-5 w-5 rounded-full ring-1 ring-white object-cover"
                                />
                              ) : (
                                <div className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center ring-1 ring-white">
                                  <User className="h-3 w-3 text-gray-500" />
                                </div>
                              )}
                              <span className="ml-1 text-xs text-gray-600 truncate max-w-[80px]">{note.user.nickname}</span>
                            </div>
                            <div className="text-xs text-gray-400">
                              {formatDate(note.createdAt)}
                            </div>
                          </div>
                        </div>
                      </>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              // 单列布局
              filteredNotes.map((note: TravelNote) => (
                <Link 
                  key={note.id} 
                  to={`/note/${note.id}`} 
                  className="group h-max bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 block"
                >
                  {/* 单列布局 - 水平排列的卡片 */}
                  <div className="flex flex-row h-[150px]">
                    <div className="relative w-1/3">
                      {getNoteCoverImage(note).type === "image" ? (
                        <img 
                          src={getNoteCoverImage(note).url} 
                          alt={note.title}
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <video 
                          src={getNoteCoverImage(note).url}
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                          preload="metadata"
                          muted
                          playsInline
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60"></div>
                      {note.location && (
                        <div className="absolute bottom-2 left-2 flex items-center text-white">
                          <MapPin className="h-3 w-3 mr-1" />
                          <span className="text-xs font-medium">{note.location}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3 w-2/3 flex flex-col justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors duration-200">
                          {note.title}
                        </h3>
                        <p className="text-gray-600 mt-1 text-xs line-clamp-2">
                          {note.content.replace(/<[^>]*>/g, '').substring(0, 80)}...
                        </p>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center">
                          {note.user.avatarUrl ? (
                            <img 
                              src={note.user.avatarUrl} 
                              alt={note.user.nickname}
                              className="h-6 w-6 rounded-full ring-1 ring-white object-cover"
                            />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center ring-1 ring-white">
                              <User className="h-3 w-3 text-gray-500" />
                            </div>
                          )}
                          <span className="ml-2 text-xs text-gray-600">{note.user.nickname}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDate(note.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
          
          {/* Empty state */}
          {filteredNotes.length === 0 && (
            <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-100">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-1">没有找到相关游记</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                尝试使用不同的关键词，或者清除搜索条件查看全部游记
              </p>
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm("")} 
                  className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-full text-sm font-medium hover:bg-primary-600 transition-colors duration-200"
                >
                  查看全部游记
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Sidebar content */}
        <div className="md:col-span-4">
          {/* Promotional banner */}
          <div className="bg-gradient-to-r from-secondary-500 to-secondary-400 rounded-xl shadow-md overflow-hidden relative mb-6">
            <div className="absolute inset-0 bg-pattern-circuit opacity-10"></div>
            <div className="relative p-5 text-white">
              <h3 className="text-lg font-bold mb-2">分享您的旅行故事</h3>
              <p className="text-white/80 text-sm mb-4">记录精彩瞬间，获得更多旅行爱好者的关注</p>
              <Link
                to="/publish"
                className="inline-block bg-white text-secondary-600 px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors duration-200"
              >
                立即发布
              </Link>
            </div>
          </div>
          
          {/* Popular destinations */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">热门目的地</h3>
            </div>
            <div className="p-5">
              <ul className="space-y-3">
                {popularDestinations.map((destination: Destination, index: number) => (
                  <li key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="w-8 h-8 flex items-center justify-center bg-primary-50 text-primary-600 rounded-full text-sm font-semibold">
                        {index + 1}
                      </span>
                      <span className="ml-3 text-gray-700">{destination.location}</span>
                    </div>
                    <span className="text-sm text-gray-500">{destination.count} 篇游记</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
