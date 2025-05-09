import { Outlet, Link, useLoaderData, useLocation } from '@remix-run/react'
import { json, redirect } from '@remix-run/node'
import type { LoaderFunction } from '@remix-run/node'
import { getLoggedInUser } from '~/services/auth.server'
import { UserCircle, Home, BookOpen, PlusCircle, Settings, LogOut } from 'lucide-react'

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/register', '/']

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url)
  const pathname = url.pathname

  // Get the logged in user from the session for all routes
  const user = await getLoggedInUser(request)

  // Skip authentication check for public routes
  if (PUBLIC_ROUTES.some((route) => pathname === route)) {
    // Even for public routes, we want to know if user is logged in
    return json({ user })
  }

  // If not logged in and not on a public route, redirect to login
  if (!user && !PUBLIC_ROUTES.some((route) => pathname === route)) {
    // Save the current URL to redirect back after login
    return redirect(`/login?redirectTo=${encodeURIComponent(pathname)}`)
  }

  // Return user data to the layout
  return json({ user })
}

export default function UserLayout() {
  const { user } = useLoaderData<typeof loader>()
  const location = useLocation()

  // Check if the current path is active
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header - Simplified */}
      <header className="bg-white py-4 border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="text-xl font-bold text-primary-600">
            旅游日记
          </Link>

          {/* User Avatar or Login */}
          <div>
            {user ? (
              <div className="relative group">
                <button type="button" className="flex items-center text-gray-600 hover:text-gray-900">
                  <span className="mr-1 font-medium">{user.nickname}</span>
                  {(user.avatarUrl && <img src={user.avatarUrl} alt="Avatar" className="h-6 w-6 rounded-full object-cover" />) || <UserCircle className="h-6 w-6" />}
                </button>
                <div className="absolute right-0 w-48 mt-2 bg-white rounded-lg shadow-lg overflow-hidden z-20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right">
                  <div className="py-2">
                    <Link to="/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <Settings className="mr-2 h-4 w-4" />
                      账号设置
                    </Link>
                    <Link to="/logout" className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                      <LogOut className="mr-2 h-4 w-4" />
                      退出登录
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <Link to="/login" className="inline-flex items-center bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200">
                登录 / 注册
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow">
        <div className="container mx-auto px-4 pt-6 pb-20">
          <Outlet />
        </div>
      </main>

      {/* Bottom Tab Navigation */}
      {/* Only show these tabs for logged in users */}
      {user && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-10">
          <div className="flex justify-around items-center py-2">
            <Link to="/" className={`flex flex-col items-center px-4 py-2 ${isActive('/') ? 'text-primary-600' : 'text-gray-500'}`}>
              <Home className="h-6 w-6" />
              <span className="text-xs mt-1">首页</span>
            </Link>

            <>
              <Link to="/my-notes" className={`flex flex-col items-center px-4 py-2 ${isActive('/my-notes') ? 'text-primary-600' : 'text-gray-500'}`}>
                <BookOpen className="h-6 w-6" />
                <span className="text-xs mt-1">我的游记</span>
              </Link>

              <Link to="/publish" className={`flex flex-col items-center px-4 py-2 ${isActive('/publish') ? 'text-primary-600' : 'text-gray-500'}`}>
                <PlusCircle className="h-6 w-6" />
                <span className="text-xs mt-1">发布</span>
              </Link>
            </>
          </div>
        </div>
      )}
    </div>
  )
}
