import { json } from '@remix-run/node'
import type { LoaderFunction, ActionFunction } from '@remix-run/node'
import { Link, useLoaderData, useFetcher } from '@remix-run/react'
import { useState } from 'react'
import { PlusCircle, Edit, Trash2, CheckCircle, XCircle, Clock, Eye, MapPin, Calendar, LayoutGrid, List, Loader2 } from 'lucide-react'
import { requireLoggedInUser } from '~/services/auth.server'
import { getUserNotes, deleteNote } from '~/services/notes.server'
import type { TravelNote, User, Media } from '~/types'

export const loader: LoaderFunction = async ({ request }) => {
  // Get the logged in user, or redirect to login
  const user = await requireLoggedInUser(request) as User

  // Get all notes for this user
  const notes = await getUserNotes(user.id)
  
  // Filter out deleted notes
  const activeNotes = notes.filter(note => !note.isDeleted)

  return json({ notes: activeNotes, user })
}

export const action: ActionFunction = async ({ request }) => {
  // Get the logged in user, or redirect to login
  const user = await requireLoggedInUser(request) as User

  const formData = await request.formData()
  const intent = formData.get('intent') as string

  if (intent === 'delete') {
    const noteId = formData.get('noteId') as string

    if (!noteId) {
      return json({ error: '游记ID必须提供' }, { status: 400 })
    }

    // Delete the note
    const result = await deleteNote(noteId, user.id)

    if (result.error) {
      return json({ error: '删除游记失败' }, { status: 500 })
    }

    return json({ success: true })
  }

  return json({ error: '无效的操作' }, { status: 400 })
}

export default function MyNotes() {
  const { notes: initialNotes } = useLoaderData<typeof loader>()
  const [notes, setNotes] = useState(initialNotes)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<TravelNote | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const deleteFetcher = useFetcher()

  // Format date display
  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Get status badge information
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          text: '已通过',
          color: 'bg-green-100 text-green-800',
        }
      case 'pending':
        return {
          icon: <Clock className="h-4 w-4" />,
          text: '审核中',
          color: 'bg-yellow-100 text-yellow-800',
        }
      case 'rejected':
        return {
          icon: <XCircle className="h-4 w-4" />,
          text: '未通过',
          color: 'bg-red-100 text-red-800',
        }
      default:
        return {
          icon: null,
          text: '未知',
          color: 'bg-gray-100 text-gray-800',
        }
    }
  }

  // Filter notes based on selected status
  const filteredNotes = statusFilter === 'all' ? notes : notes.filter((note: TravelNote) => note.status === statusFilter)

  // Handler for delete confirmation
  const confirmDelete = (note: TravelNote) => {
    setNoteToDelete(note)
    setShowDeleteModal(true)
  }

  // Handler for actual delete
  const handleDelete = () => {
    if (!noteToDelete) return

    deleteFetcher.submit(
      {
        noteId: noteToDelete.id,
        intent: 'delete',
      },
      { method: 'post' }
    )

    // 立即更新UI以移除被删除的游记
    setNotes((prevNotes: TravelNote[]) => prevNotes.filter((note: TravelNote) => note.id !== noteToDelete?.id))
    
    // 关闭模态窗并清除待删除游记
    setShowDeleteModal(false)
    setNoteToDelete(null)
  }

  return (
    <div className="pb-6">
      {/* Header with stats */}
      <div className="bg-gradient-to-r from-primary-100 to-primary-50 rounded-xl p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">我的游记</h1>
            <p className="text-gray-600 mt-1">管理您创建的所有旅行记录</p>
          </div>

          <div className="mt-4 sm:mt-0 flex">
            <Link to="/publish" className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-all duration-200 shadow-sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              发布游记
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-gray-100">
            <div className="text-xl font-bold text-gray-900">{notes.length}</div>
            <div className="text-sm text-gray-600">游记总数</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-gray-100">
            <div className="text-xl font-bold text-green-600">{notes.filter((n: TravelNote) => n.status === 'approved').length}</div>
            <div className="text-sm text-gray-600">已发布</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-gray-100">
            <div className="text-xl font-bold text-yellow-600">{notes.filter((n: TravelNote) => n.status === 'pending').length}</div>
            <div className="text-sm text-gray-600">审核中</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-gray-100">
            <div className="text-xl font-bold text-red-600">{notes.filter((n: TravelNote) => n.status === 'rejected').length}</div>
            <div className="text-sm text-gray-600">未通过</div>
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Status filter tabs */}
        <div className="flex space-x-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap
              ${statusFilter === 'all' ? 'bg-primary-500 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
          >
            全部
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap
              ${statusFilter === 'approved' ? 'bg-green-500 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
          >
            <CheckCircle className="inline-block mr-1 h-3.5 w-3.5" />
            已通过
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap
              ${statusFilter === 'pending' ? 'bg-yellow-500 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
          >
            <Clock className="inline-block mr-1 h-3.5 w-3.5" />
            审核中
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap
              ${statusFilter === 'rejected' ? 'bg-red-500 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
          >
            <XCircle className="inline-block mr-1 h-3.5 w-3.5" />
            未通过
          </button>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center space-x-2">
          <div className="bg-gray-100 p-1 rounded-lg flex">
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'}`} aria-label="列表视图">
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'}`} aria-label="网格视图">
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          <div className="text-sm text-gray-500">{filteredNotes.length} 条记录</div>
        </div>
      </div>

      {/* Notes list */}
      {viewMode === 'list' ? (
        <div className="space-y-4">
          {filteredNotes.map((note: TravelNote) => {
            const badge = getStatusBadge(note.status)
            // Get the first image from media to use as the cover
            const coverImage = note.media?.find((m: Media) => m.mediaType === 'image')?.url || 'https://placehold.co/600x400?text=无图片'

            return (
              <div key={note.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100">
                <div className="p-4 sm:p-6">
                  <div className="sm:flex sm:items-start">
                    <div className="sm:flex-shrink-0 mb-4 sm:mb-0">
                      <img src={coverImage} alt={note.title} className="h-24 w-24 object-cover rounded-lg" />
                    </div>
                    <div className="sm:ml-4 sm:flex-1">
                      <div className="flex flex-wrap gap-y-2 justify-between items-start">
                        <h3 className="text-lg font-medium text-gray-900 hover:text-primary-600 transition-colors duration-200">
                          <Link to={`/note/${note.id}`}>{note.title}</Link>
                        </h3>
                        <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                          {badge.icon}
                          <span className="ml-1">{badge.text}</span>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap text-sm text-gray-500 gap-x-4 gap-y-1">
                        {note.location && (
                          <div className="flex items-center">
                            <MapPin className="h-3.5 w-3.5 mr-1" />
                            <span>{note.location}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          <span>{formatDate(note.createdAt)}</span>
                        </div>
                      </div>

                      {note.status === 'rejected' && note.rejectionReason && (
                        <div className="mt-3 p-3 bg-red-50 text-sm text-red-700 rounded-lg border border-red-100">
                          <p className="font-medium">拒绝原因:</p>
                          <p className="mt-1">{note.rejectionReason}</p>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          to={`/note/${note.id}`}
                          className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors duration-200"
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          查看
                        </Link>

                        {(note.status === 'rejected' || note.status === 'pending') && (
                          <Link
                            to={`/edit/${note.id}`}
                            className="inline-flex items-center px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-600 text-sm font-medium rounded-lg transition-colors duration-200"
                          >
                            <Edit className="mr-1 h-3.5 w-3.5" />
                            编辑
                          </Link>
                        )}

                        <button
                          type="button"
                          onClick={() => confirmDelete(note)}
                          className="inline-flex items-center px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg transition-colors duration-200"
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note: TravelNote) => {
            const badge = getStatusBadge(note.status)
            // Get the first image from media to use as the cover
            const coverImage = note.media?.find((m: Media) => m.mediaType === 'image')?.url || 'https://placehold.co/600x400?text=无图片'

            return (
              <div key={note.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 flex flex-col">
                <div className="relative">
                  <img src={coverImage} alt={note.title} className="w-full h-48 object-cover" />
                  <div className={`absolute top-3 right-3 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                    {badge.icon}
                    <span className="ml-1">{badge.text}</span>
                  </div>
                </div>

                <div className="p-4 flex-grow">
                  <h3 className="text-lg font-medium text-gray-900 mb-2 hover:text-primary-600 transition-colors duration-200">
                    <Link to={`/note/${note.id}`}>{note.title}</Link>
                  </h3>

                  <div className="flex flex-wrap text-xs text-gray-500 gap-x-3 gap-y-1 mb-3">
                    {note.location && (
                      <div className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span>{note.location}</span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>{formatDate(note.createdAt)}</span>
                    </div>
                  </div>

                  {note.status === 'rejected' && note.rejectionReason && (
                    <div className="mt-2 p-2 bg-red-50 text-xs text-red-700 rounded-lg mb-3">
                      <p className="font-medium">拒绝原因: {note.rejectionReason}</p>
                    </div>
                  )}
                </div>

                <div className="p-4 pt-0 mt-auto">
                  <div className="flex justify-between border-t border-gray-100 pt-3">
                    <Link to={`/note/${note.id}`} className="text-sm text-gray-600 hover:text-gray-900 font-medium">
                      查看详情
                    </Link>

                    <div className="flex space-x-1">
                      {(note.status === 'rejected' || note.status === 'pending') && (
                        <Link to={`/edit/${note.id}`} className="p-1.5 text-primary-500 hover:text-primary-700 rounded-full hover:bg-primary-50 transition-colors duration-200" aria-label="编辑">
                          <Edit className="h-4 w-4" />
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={() => confirmDelete(note)}
                        className="p-1.5 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50 transition-colors duration-200"
                        aria-label="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {filteredNotes.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            {statusFilter === 'all' ? (
              <PlusCircle className="h-8 w-8 text-gray-400" />
            ) : statusFilter === 'approved' ? (
              <CheckCircle className="h-8 w-8 text-gray-400" />
            ) : statusFilter === 'pending' ? (
              <Clock className="h-8 w-8 text-gray-400" />
            ) : (
              <XCircle className="h-8 w-8 text-gray-400" />
            )}
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">没有{statusFilter !== 'all' ? '该状态的' : ''}游记</h3>
          <p className="text-gray-500 max-w-md mx-auto">{statusFilter !== 'all' ? '您可以切换其他状态查看您的游记' : '点击上方的「发布游记」开始创建您的第一篇游记吧！'}</p>

          <div className="mt-6 flex justify-center">
            {statusFilter !== 'all' ? (
              <button
                onClick={() => setStatusFilter('all')}
                className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors duration-200"
              >
                查看全部游记
              </button>
            ) : (
              <Link to="/publish" className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors duration-200">
                <PlusCircle className="mr-2 h-4 w-4" />
                发布游记
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl transform transition-all">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="p-3 bg-red-100 rounded-full mb-4">
                <Trash2 className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">确认删除</h3>
              <p className="text-gray-500">
                您确定要删除 <span className="font-medium text-gray-900">&ldquo;{noteToDelete?.title}&rdquo;</span> 吗？此操作不可撤销。
              </p>
            </div>

            {noteToDelete?.status === 'approved' && (
              <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg mb-6">
                <p className="text-sm text-yellow-700">
                  <strong>注意：</strong> 这篇游记已经过审并发布，删除后将不再显示给其他用户。
                </p>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                className="inline-flex justify-center items-center px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0"
                onClick={() => setShowDeleteModal(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="inline-flex justify-center items-center px-4 py-2.5 border border-transparent rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                onClick={handleDelete}
                disabled={deleteFetcher.state !== 'idle'}
              >
                {deleteFetcher.state !== 'idle' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    处理中...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    确认删除
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
 