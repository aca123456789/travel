import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData, useNavigation, useSearchParams, useSubmit } from "@remix-run/react";
import { requireAdminUser } from "~/services/admin.server";
import { adminDeleteNote, getNotesForReview, updateNoteStatus, type TravelNoteStatus } from "~/services/notes.server";
import { format } from "date-fns";
import { useState } from "react";
import { 
  MdFilterAlt, 
  MdSearch, 
  MdCheckCircle, 
  MdCancel, 
  MdDeleteOutline, 
  MdOutlineImage,
  MdOutlineAccessTime,
  MdPerson,
  MdWarning
} from "react-icons/md";
import clsx from "clsx";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Check authentication
  const user = await requireAdminUser(request);
  
  // Parse search params
  const url = new URL(request.url);
  const status = url.searchParams.get("status") as TravelNoteStatus | undefined;
  const page = Number(url.searchParams.get("page") || "1");
  const search = url.searchParams.get("search") || undefined;
  
  // Get notes for review
  const { notes, pagination } = await getNotesForReview({ 
    status, 
    page,
    search
  });
  
  return json({ 
    user,
    notes,
    pagination,
    params: { status, page, search }
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  // Check authentication and permissions
  const user = await requireAdminUser(request);
  
  // Parse form data
  const formData = await request.formData();
  const action = formData.get("_action") as string;
  const noteId = formData.get("noteId") as string;
  
  if (!noteId) {
    return json({ error: "游记ID不能为空" }, { status: 400 });
  }
  
  switch (action) {
    case "approve":
      // Check permissions - both admin and auditor can approve
      await updateNoteStatus({ noteId, status: "approved" });
      return json({ success: true });
      
    case "reject": {
      // Check permissions - both admin and auditor can reject
      const rejectionReason = formData.get("rejectionReason") as string;
      if (!rejectionReason) {
        return json({ error: "拒绝原因不能为空" }, { status: 400 });
      }
      await updateNoteStatus({ noteId, status: "rejected", rejectionReason });
      return json({ success: true });
    }
      
    case "delete":
      // Check permissions - only admin can delete
      if (user.role !== "admin") {
        return json({ error: "没有权限执行此操作" }, { status: 403 });
      }
      await adminDeleteNote(noteId);
      return json({ success: true });
      
    default:
      return json({ error: "未知操作" }, { status: 400 });
  }
};

export default function AdminIndex() {
  const { notes, pagination, params, user } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const submit = useSubmit();
  
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  
  // Handle status filter change
  const handleStatusChange = (status: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (status) {
      newParams.set("status", status);
    } else {
      newParams.delete("status");
    }
    newParams.set("page", "1"); // Reset to page 1 when changing filters
    setSearchParams(newParams);
  };
  
  // Handle search
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const searchQuery = formData.get("searchQuery") as string;
    
    const newParams = new URLSearchParams(searchParams);
    if (searchQuery) {
      newParams.set("search", searchQuery);
    } else {
      newParams.delete("search");
    }
    newParams.set("page", "1"); // Reset to page 1 when searching
    setSearchParams(newParams);
  };
  
  // Handle pagination
  const handlePageChange = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", page.toString());
    setSearchParams(newParams);
  };
  
  // Handle approve
  const handleApprove = (noteId: string) => {
    const formData = new FormData();
    formData.append("_action", "approve");
    formData.append("noteId", noteId);
    submit(formData, { method: "post" });
  };
  
  // Open rejection modal
  const openRejectModal = (noteId: string) => {
    setSelectedNoteId(noteId);
    setRejectionReason("");
    setShowRejectionModal(true);
  };
  
  // Handle reject submit
  const handleReject = () => {
    if (!selectedNoteId || !rejectionReason) return;
    
    const formData = new FormData();
    formData.append("_action", "reject");
    formData.append("noteId", selectedNoteId);
    formData.append("rejectionReason", rejectionReason);
    submit(formData, { method: "post" });
    
    setShowRejectionModal(false);
  };
  
  // Handle delete
  const handleDelete = (noteId: string) => {
    if (confirm("确定要删除这条游记吗？此操作不可恢复。")) {
      const formData = new FormData();
      formData.append("_action", "delete");
      formData.append("noteId", noteId);
      submit(formData, { method: "post" });
    }
  };
  
  // Format note content for display (truncate)
  const formatContent = (content: string, maxLength = 50) => {
    if (content.length <= maxLength) return content;
    return `${content.substring(0, maxLength)}...`;
  };
  
  const isSubmitting = navigation.state === "submitting";
  
  // 状态标签样式
  const statusBadge = (status: string) => {
    switch(status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <MdWarning className="text-yellow-600" />
            待审核
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <MdCheckCircle className="text-green-600" />
            已通过
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <MdCancel className="text-red-600" />
            未通过
          </span>
        );
      default:
        return null;
    }
  };
  
  return (
    <div>
      <div className="mb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">游记审核管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理用户提交的游记内容，进行审核或删除操作</p>
        </div>
        
        {/* 筛选和搜索区 */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
            {/* 状态筛选 */}
            <div className="flex-1">
              <label id="status-filter-label" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <MdFilterAlt className="text-gray-500" />
                筛选状态
              </label>
              <div className="flex flex-wrap gap-2" role="group" aria-labelledby="status-filter-label">
                <button
                  className={clsx(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    !params.status 
                      ? "bg-indigo-100 text-indigo-800 border-2 border-indigo-200" 
                      : "bg-gray-100 text-gray-700 border-2 border-gray-100 hover:border-gray-200"
                  )}
                  onClick={() => handleStatusChange("")}
                >
                  全部
                </button>
                <button
                  className={clsx(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    params.status === 'pending' 
                      ? "bg-yellow-100 text-yellow-800 border-2 border-yellow-200" 
                      : "bg-gray-100 text-gray-700 border-2 border-gray-100 hover:border-gray-200"
                  )}
                  onClick={() => handleStatusChange("pending")}
                >
                  待审核
                </button>
                <button
                  className={clsx(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    params.status === 'approved' 
                      ? "bg-green-100 text-green-800 border-2 border-green-200" 
                      : "bg-gray-100 text-gray-700 border-2 border-gray-100 hover:border-gray-200"
                  )}
                  onClick={() => handleStatusChange("approved")}
                >
                  已通过
                </button>
                <button
                  className={clsx(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    params.status === 'rejected' 
                      ? "bg-red-100 text-red-800 border-2 border-red-200" 
                      : "bg-gray-100 text-gray-700 border-2 border-gray-100 hover:border-gray-200"
                  )}
                  onClick={() => handleStatusChange("rejected")}
                >
                  未通过
                </button>
              </div>
            </div>
            
            {/* 搜索区 */}
            <div className="flex-1">
              <form onSubmit={handleSearch} className="flex items-end gap-2">
                <div className="flex-1">
                  <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <MdSearch className="text-gray-500" />
                    搜索游记
                  </label>
                  <input
                    id="searchQuery"
                    type="text"
                    name="searchQuery"
                    defaultValue={params.search || ""}
                    placeholder="搜索游记标题或作者..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors text-sm font-medium"
                >
                  搜索
                </button>
              </form>
            </div>
          </div>
        </div>
        
        {/* 游记列表 */}
        {notes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <MdFilterAlt className="text-gray-400 text-2xl" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">暂无游记数据</h3>
              <p className="text-gray-500">
                {params.search 
                  ? "没有找到符合搜索条件的游记" 
                  : params.status 
                    ? `没有${params.status === 'pending' ? '待审核' : params.status === 'approved' ? '已通过' : '未通过'}的游记` 
                    : "暂无任何游记数据"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <Link 
                        to={`/note/${note.id}`} 
                        className="text-lg font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {note.title}
                      </Link>
                      <p className="mt-1 text-gray-500 text-sm">{formatContent(note.content, 100)}</p>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4">
                      {statusBadge(note.status)}
                      
                      <div className="flex space-x-1">
                        {note.status !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleApprove(note.id)}
                            disabled={isSubmitting}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="通过"
                          >
                            <MdCheckCircle size={20} />
                          </button>
                        )}
                        
                        {note.status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => openRejectModal(note.id)}
                            disabled={isSubmitting}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="拒绝"
                          >
                            <MdCancel size={20} />
                          </button>
                        )}
                        
                        {user.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleDelete(note.id)}
                            disabled={isSubmitting}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                            title="删除"
                          >
                            <MdDeleteOutline size={20} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-5 py-3">
                  <div className="flex flex-wrap items-center text-sm text-gray-500 gap-x-6 gap-y-2">
                    <div className="flex items-center gap-1">
                      <MdPerson className="text-gray-400" />
                      <span>{note.author?.nickname || "未知用户"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MdOutlineImage className="text-gray-400" />
                      <span>{note.mediaCount} 张图片</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MdOutlineAccessTime className="text-gray-400" />
                      <span>{format(new Date(note.createdAt), 'yyyy-MM-dd HH:mm')}</span>
                    </div>
                    
                    {/* 拒绝原因 */}
                    {note.status === 'rejected' && note.rejectionReason && (
                      <div className="w-full mt-1 text-red-500 text-xs flex items-start gap-1">
                        <MdWarning className="flex-shrink-0 mt-0.5" />
                        <span>拒绝原因: {note.rejectionReason}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* 分页 */}
        {pagination.totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <div className="inline-flex rounded-lg shadow-sm bg-white">
              <button
                onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-gray-200 rounded-l-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:bg-gray-100 transition-colors"
              >
                上一页
              </button>
              
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(page => 
                  page === 1 || 
                  page === pagination.totalPages || 
                  Math.abs(page - pagination.page) <= 1
                )
                .map((page, index, array) => {
                  // Add ellipsis
                  if (index > 0 && page - array[index - 1] > 1) {
                    return (
                      <span key={`ellipsis-${page}`} className="px-4 py-2 border-t border-b border-gray-200 bg-white text-gray-600 flex items-center">
                        ...
                      </span>
                    );
                  }
                  
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={clsx(
                        "px-4 py-2 border-t border-b border-gray-200",
                        pagination.page === page
                          ? "bg-indigo-50 text-indigo-700 font-medium border-x border-indigo-100"
                          : "text-gray-600 hover:bg-gray-50 border-x border-gray-200",
                        index === 0 && page !== 1 && "rounded-l-lg",
                        index === array.length - 1 && page !== pagination.totalPages && "rounded-r-lg"
                      )}
                    >
                      {page}
                    </button>
                  );
                })}
              
              <button
                onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.page + 1))}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 border border-gray-200 rounded-r-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:bg-gray-100 transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* 拒绝理由弹窗 */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">拒绝原因</h3>
            </div>
            
            <div className="p-6">
              <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 mb-2">
                请填写拒绝原因 (将发送给用户)
              </label>
              <textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-4"
                rows={4}
                placeholder="如：内容不符合规范，请修改后重新提交..."
              ></textarea>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRejectionModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={!rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
                >
                  确认拒绝
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
