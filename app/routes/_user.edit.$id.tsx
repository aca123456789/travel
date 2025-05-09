import { useState, useRef, useEffect } from 'react'
import { Form, useActionData, useNavigation, useSubmit, useFetcher, useLoaderData, Link } from '@remix-run/react'
import { json, redirect } from '@remix-run/node'
import type { ActionFunction, LoaderFunction, MetaFunction } from '@remix-run/node'
import { Image, X, Loader2, Video, Upload, ArrowLeft, MapPin } from 'lucide-react'
import { requireLoggedInUser } from '~/services/auth.server'
import { getNoteById, updateNote } from '~/services/notes.server'
import type { User } from '~/types'

export const meta: MetaFunction = () => {
  return [{ title: '编辑游记 - 旅游日记' }, { name: 'description', content: '编辑您的旅游日记' }]
}

// Interface for our media items
interface MediaItem {
  id: string
  url: string
  type: 'image' | 'video'
  isUploaded: boolean // Track if the file has been uploaded to server
  file?: File
}

interface TravelNote {
  id: string
  title: string
  content: string
  location: string | null
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  media: Array<{
    id: number | string
    mediaType: 'image' | 'video'
    url: string
  }>
}

interface ActionData {
  errors?: {
    title?: string
    content?: string
    images?: string
    general?: string
  }
  formData?: {
    title?: string
    content?: string
    location?: string
  }
}

// Interface for upload API response
interface UploadResponse {
  success?: boolean
  url?: string
  error?: string
}

export const loader: LoaderFunction = async ({ params, request }) => {
  // Ensure user is authenticated
  const user = (await requireLoggedInUser(request)) as User

  const { id } = params
  if (!id) {
    throw new Response('游记ID未提供', { status: 400 })
  }

  // Get note from database
  const note = await getNoteById(id)

  if (!note) {
    throw new Response('游记未找到', { status: 404 })
  }

  // Check if the user is the author of the note
  if (note.userId !== user.id && user.role !== 'admin') {
    throw new Response('您没有权限编辑此游记', { status: 403 })
  }

  return json({ note, user })
}

export const action: ActionFunction = async ({ request, params }) => {
  // Ensure user is authenticated
  const user = (await requireLoggedInUser(request)) as User

  const { id } = params
  if (!id) {
    throw new Response('游记ID未提供', { status: 400 })
  }

  // Get note from database to verify ownership
  const existingNote = await getNoteById(id)

  if (!existingNote) {
    throw new Response('游记未找到', { status: 404 })
  }

  // Check if the user is the author of the note
  if (existingNote.userId !== user.id && user.role !== 'admin') {
    throw new Response('您没有权限编辑此游记', { status: 403 })
  }

  const formData = await request.formData()
  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const location = formData.get('location') as string
  const mediaUrls = formData.getAll('mediaUrls[]') as string[]
  const mediaTypes = formData.getAll('mediaTypes[]') as string[]
  const mediaIds = formData.getAll('mediaIds[]') as string[]

  const errors: ActionData['errors'] = {}

  // Validate form input
  if (!title?.trim()) {
    errors.title = '请输入游记标题'
  }

  if (!content?.trim()) {
    errors.content = '请输入游记内容'
  }

  if (mediaUrls.length === 0 || !mediaUrls.some((url, i) => mediaTypes[i] === 'image')) {
    errors.images = '请至少上传一张图片'
  }

  // Return errors if validation failed
  if (Object.keys(errors).length > 0) {
    return json<ActionData>({ errors, formData: { title, content, location } }, { status: 400 })
  }

  try {
    // Process media items
    const mediaArray = mediaUrls.map((url, index) => ({
      id: mediaIds[index] || undefined, // Use existing ID if available
      type: mediaTypes[index] as 'image' | 'video',
      url,
      order: index,
    }))

    // Update the note in the database
    const updateResult = await updateNote({
      id,
      userId: existingNote.userId,
      title,
      content,
      location,
      media: mediaArray,
    })

    if (!updateResult) {
      throw new Error('Failed to update note')
    }

    // Redirect to the note detail page
    return redirect(`/note/${id}`)
  } catch (error) {
    console.error('Error updating note:', error)
    return json<ActionData>(
      {
        errors: {
          general: '游记更新失败，请稍后重试',
        },
        formData: { title, content, location },
      },
      { status: 500 }
    )
  }
}

export default function EditNote() {
  const { note } = useLoaderData<{ note: TravelNote }>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'
  const submit = useSubmit()
  const uploadFetcher = useFetcher<UploadResponse>()

  // References for file inputs
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // State for uploaded media
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadQueue, setUploadQueue] = useState<File[]>([])
  const [currentUpload, setCurrentUpload] = useState<File | null>(null)
  const [location, setLocation] = useState(actionData?.formData?.location || note.location || '')

  // Initialize media from existing note
  useEffect(() => {
    if (note && note.media) {
      // Convert note media to our MediaItem format
      const existingMedia = note.media.map((m) => ({
        id: m.id.toString(), // Ensure ID is string
        url: m.url,
        type: m.mediaType === 'video' ? 'video' : ('image' as 'image' | 'video'),
        isUploaded: true, // Existing media is already uploaded
      }))

      setMediaItems(existingMedia)
    }
  }, [note])

  // Open file pickers
  const openImagePicker = () => {
    imageInputRef.current?.click()
  }

  const openVideoPicker = () => {
    videoInputRef.current?.click()
  }

  // Process the upload queue
  const processUploadQueue = async () => {
    if (uploadQueue.length === 0 || isUploading) return

    setIsUploading(true)
    const fileToUpload = uploadQueue[0]
    setCurrentUpload(fileToUpload)

    try {
      // Create form data for upload
      const formData = new FormData()
      formData.append('file', fileToUpload)
      formData.append('fileType', fileToUpload.type.startsWith('image/') ? 'image' : 'video')

      // Upload the file
      uploadFetcher.submit(formData, {
        method: 'post',
        action: '/api/upload',
        encType: 'multipart/form-data',
      })
    } catch (error) {
      console.error('上传文件失败:', error)
      // Remove file from queue
      setUploadQueue((prev) => prev.slice(1))
      setIsUploading(false)
    }
  }

  // Effect to process upload queue
  useEffect(() => {
    processUploadQueue()
  }, [uploadQueue, isUploading])

  // Effect to handle upload response
  useEffect(() => {
    if (uploadFetcher.data && uploadFetcher.state === 'idle') {
      // Upload completed
      if (uploadFetcher.data.success && uploadFetcher.data.url) {
        // Update the media item with the real URL
        if (currentUpload) {
          const data = mediaItems.map((item) => {
            if (item.file && item.file.name === currentUpload.name) {
              return {
                ...item,
                url: uploadFetcher.data?.url || '',
                isUploaded: true,
              }
            }
            return item
          })
          setMediaItems(data)
        }
      } else if (uploadFetcher.data.error) {
        // Handle upload error
        alert(`上传失败: ${uploadFetcher.data.error}`)

        // Remove the failed item
        if (currentUpload) {
          const data = mediaItems.filter((item) => !(item.file && item.file.name === currentUpload.name && item.file.size === currentUpload.size))
          setMediaItems(data)
        }
      }

      // Remove processed file from queue
      setUploadQueue((prev) => prev.slice(1))
      setCurrentUpload(null)
      setIsUploading(false)
    }
  }, [uploadFetcher.data, uploadFetcher.state, currentUpload])

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Process each selected file
    Array.from(files).forEach((file) => {
      // File type validation
      if (!file.type.startsWith('image/')) {
        console.error('只能上传图片文件')
        return
      }

      // Create temporary URL for preview
      const imageUrl = URL.createObjectURL(file)

      // Generate a temporary ID
      const newImageId = Math.random().toString(36).substring(2, 10)

      // Add to media items
      setMediaItems((prev) => [
        ...prev,
        {
          id: newImageId,
          url: imageUrl,
          type: 'image',
          isUploaded: false,
          file,
        },
      ])

      // Add to upload queue
      setUploadQueue((prev) => [...prev, file])
    })

    // Reset the input
    e.target.value = ''
  }

  // Handle video selection
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0] // We only take the first video file

    // File type validation
    if (!file.type.startsWith('video/')) {
      console.error('只能上传视频文件')
      return
    }

    // File size validation (max 100MB)
    const MAX_SIZE = 100 * 1024 * 1024 // 100MB in bytes
    if (file.size > MAX_SIZE) {
      alert('视频文件太大，最大允许100MB')
      e.target.value = ''
      return
    }

    // Check if we already have a video
    if (mediaItems.some((item) => item.type === 'video')) {
      // Remove existing video first
      setMediaItems((prev) => prev.filter((item) => item.type !== 'video'))
    }

    // Create temporary URL for preview
    const videoUrl = URL.createObjectURL(file)

    // Generate a temporary ID
    const newVideoId = Math.random().toString(36).substring(2, 10)

    // Add to media items
    setMediaItems((prev) => [
      ...prev,
      {
        id: newVideoId,
        url: videoUrl,
        type: 'video',
        isUploaded: false,
        file,
      },
    ])

    // Add to upload queue
    setUploadQueue((prev) => [...prev, file])

    // Reset the input
    e.target.value = ''
  }

  // Remove a media item
  const removeMediaItem = (id: string) => {
    setMediaItems((prev) => {
      const itemToRemove = prev.find((item) => item.id === id)

      // If the item has a file that's in the upload queue, remove it
      if (itemToRemove?.file && !itemToRemove.isUploaded) {
        setUploadQueue((queue) =>
          queue.filter(
            (queuedFile) =>
              !(itemToRemove.file && queuedFile.name === itemToRemove.file.name && queuedFile.size === itemToRemove.file.size && queuedFile.lastModified === itemToRemove.file.lastModified)
          )
        )
      }

      // Revoke object URL if it's a client-side URL
      if (itemToRemove?.url.startsWith('blob:')) {
        URL.revokeObjectURL(itemToRemove.url)
      }

      return prev.filter((item) => item.id !== id)
    })
  }

  // Get video items
  const videoItems = mediaItems.filter((item) => item.type === 'video')

  // Handle form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // If there are still files being uploaded, prevent submission
    if (isUploading || uploadQueue.length > 0) {
      alert('请等待所有文件上传完成')
      return
    }

    // Check if we have at least one uploaded image
    const hasUploadedImage = mediaItems.some((item) => item.type === 'image' && item.isUploaded)
    if (!hasUploadedImage) {
      alert('请至少上传一张图片')
      return
    }

    // Get form data
    const formData = new FormData(e.currentTarget)

    // Add location
    formData.set('location', location)

    // Add all uploaded media URLs, types and IDs
    mediaItems.forEach((item) => {
      if (item.isUploaded) {
        formData.append('mediaUrls[]', item.url)
        formData.append('mediaTypes[]', item.type)
        formData.append('mediaIds[]', item.id)
      }
    })

    // Submit the form
    submit(formData, { method: 'post' })
  }

  // Count how many items are still uploading
  const uploadingCount = mediaItems.filter((item) => !item.isUploaded).length

  return (
    <div className="pb-20">
      {/* Back button */}
      <div className="mb-4">
        <Link to={`/note/${note.id}`} className="inline-flex items-center text-gray-600 hover:text-gray-900 transition duration-200">
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span className="text-sm">返回游记详情</span>
        </Link>
      </div>

      <div className="bg-white rounded-xl overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h1 className="text-lg font-medium text-gray-900">编辑游记</h1>
          <p className="mt-1 text-sm text-gray-500">更新您的旅行体验和精彩瞬间</p>
          {note.status === 'rejected' && note.rejectionReason && (
            <div className="mt-3 p-3 bg-red-50 text-sm text-red-700 rounded-lg border border-red-100">
              <p className="font-medium">审核未通过原因:</p>
              <p className="mt-1">{note.rejectionReason}</p>
            </div>
          )}
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
              defaultValue={actionData?.formData?.title || note.title}
            />
            {actionData?.errors?.title && <p className="mt-1 text-sm text-red-600">{actionData.errors.title}</p>}
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
            <p className="mt-1 text-xs text-gray-500">填写旅行的主要地点，方便其他用户查找</p>
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
              defaultValue={actionData?.formData?.content || note.content}
            />
            {actionData?.errors?.content && <p className="mt-1 text-sm text-red-600">{actionData.errors.content}</p>}
          </div>

          {/* Media uploads */}
          <div className="mb-6" role="group" aria-labelledby="media-group-label">
            <div id="media-group-label" className="block text-sm font-medium text-gray-700 mb-1">
              图片和视频
            </div>
            <p className="text-sm text-gray-500 mb-3">上传图片（必选）和视频（可选）来丰富您的游记</p>

            {/* Hidden file inputs */}
            <input type="file" ref={imageInputRef} className="hidden" accept="image/*" multiple onChange={handleImageChange} aria-label="上传图片" />
            <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={handleVideoChange} aria-label="上传视频" />

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
            {actionData?.errors?.images && <p className="mt-1 text-sm text-red-600 mb-3">{actionData.errors.images}</p>}

            {/* General error message */}
            {actionData?.errors?.general && <p className="mt-1 text-sm text-red-600 mb-3">{actionData.errors.general}</p>}

            {/* Upload status */}
            {uploadingCount > 0 && (
              <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-md mb-4">
                <div className="flex items-center">
                  <Loader2 className="animate-spin mr-2 h-5 w-5" />
                  <span>正在上传 {uploadingCount} 个文件...</span>
                </div>
                <div className="mt-2 h-2 w-full bg-blue-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${((mediaItems.length - uploadingCount) / mediaItems.length) * 100}%` }}></div>
                </div>
              </div>
            )}

            {/* Image preview grid */}
            {mediaItems.filter((item) => item.type === 'image').length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                {mediaItems
                  .filter((item) => item.type === 'image')
                  .map((img) => (
                    <div key={img.id} className="relative rounded-md overflow-hidden bg-gray-100 aspect-square">
                      <img src={img.url} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeMediaItem(img.id)}
                        className="absolute top-1 right-1 bg-gray-800 bg-opacity-70 text-white p-1 rounded-full hover:bg-opacity-100"
                        aria-label="删除图片"
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
            {videoItems.length > 0 &&
              videoItems.map((vid) => (
                <div key={vid.id} className="relative rounded-md overflow-hidden bg-gray-100 mb-4">
                  <video src={vid.url} controls className="w-full h-48 object-cover">
                    <track kind="captions" src="" label="中文" />
                    您的浏览器不支持视频播放
                  </video>
                  <button
                    type="button"
                    onClick={() => removeMediaItem(vid.id)}
                    className="absolute top-2 right-2 bg-gray-800 bg-opacity-70 text-white p-1 rounded-full hover:bg-opacity-100"
                    aria-label="删除视频"
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
              disabled={isSubmitting || isUploading || uploadQueue.length > 0 || mediaItems.filter((item) => item.type === 'image' && item.isUploaded).length === 0}
              className="inline-flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-5 w-5" />
                  更新中...
                </>
              ) : isUploading || uploadQueue.length > 0 ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-5 w-5" />
                  等待上传完成...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-5 w-5" />
                  更新游记
                </>
              )}
            </button>
          </div>
        </Form>
      </div>
    </div>
  )
}
