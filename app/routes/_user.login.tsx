import { useState } from 'react'
import { Form, Link, useActionData, useNavigation } from '@remix-run/react'
import { json } from '@remix-run/node'
import type { ActionFunction, MetaFunction } from '@remix-run/node'
import { Lock, Mail, EyeIcon, EyeOffIcon, UserIcon } from 'lucide-react'
import { login, register, createUserSession } from '~/services/auth.server'
import type { User } from '~/types'

export const meta: MetaFunction = () => {
  return [{ title: '登录 - 旅游日记' }, { name: 'description', content: '登录您的旅游日记账号' }]
}

interface ActionData {
  error?: string
  fields?: {
    username: string
    password: string
    nickname?: string
  }
}

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData()
  const username = formData.get('username') as string
  const password = formData.get('password') as string
  const formType = formData.get('formType') as string
  const isRegistration = formType === 'register'
  const nickname = isRegistration ? (formData.get('nickname') as string) : ''

  // Field validation
  if (!username || !password) {
    return json<ActionData>(
      {
        error: '请填写用户名和密码',
        fields: { username, password },
      },
      { status: 400 }
    )
  }

  // Registration validation
  if (isRegistration && !nickname) {
    return json<ActionData>(
      {
        error: '请填写昵称',
        fields: { username, password },
      },
      { status: 400 }
    )
  }

  if (isRegistration) {
    // Handle registration
    const result = await register({ username, password, nickname })

    if (result.error) {
      let errorMessage = '注册失败'

      if (result.error === 'USERNAME_TAKEN') {
        errorMessage = '用户名已被占用'
      } else if (result.error === 'NICKNAME_TAKEN') {
        errorMessage = '昵称已被占用'
      }

      return json<ActionData>(
        {
          error: errorMessage,
          fields: { username, password, nickname },
        },
        { status: 400 }
      )
    }

    // Registration successful, create session
    if (result.user && result.user.id) {
      return createUserSession(result.user.id, '/my-notes')
    }

    return json<ActionData>({ error: '注册成功但创建会话失败，请重新登录' }, { status: 500 })
  } else {
    // Handle login
    const user = (await login({ username, password })) as User | null

    if (!user || !user.id) {
      return json<ActionData>(
        {
          error: '用户名或密码错误',
          fields: { username, password },
        },
        { status: 400 }
      )
    }

    // Login successful, create session
    return createUserSession(user.id, '/my-notes')
  }
}

export default function Login() {
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  const [showPassword, setShowPassword] = useState(false)
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div className="min-h-screen pt-4 pb-20 bg-gradient-to-b from-primary-50 absolute inset-0 to-white bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzAgMEMxMy40IDAgMCAxMy40IDAgMzBzMTMuNCAzMCAzMCAzMCA3MC00MyA3MC00MypDNzAgNDMgMCAwIDMwIDB6IiBmaWxsPSIjNDI4OWZmIiBmaWxsLW9wYWNpdHk9IjAuMDgiPjwvcGF0aD48L3N2Zz4=')]">
      <div className="max-w-md mx-auto px-6 mt-10">
        {/* 装饰元素 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 left-6 w-32 h-32 bg-secondary-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>

        <div className="relative">
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">{isLogin ? '欢迎回来' : '创建账号'}</h1>
          <p className="text-center text-gray-500 mb-8">{isLogin ? '登录您的账户并继续您的旅程' : '加入我们，分享您的旅行故事'}</p>

          <div className="bg-white rounded-2xl p-8 backdrop-blur-sm bg-white/90 border border-gray-100">
            {/* Tab selector */}
            <div className="flex rounded-lg bg-gray-100 p-1 mb-8 border border-gray-200">
              <button
                type="button"
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${isLogin ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setIsLogin(true)}
              >
                登录
              </button>
              <button
                type="button"
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${!isLogin ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setIsLogin(false)}
              >
                注册
              </button>
            </div>

            {/* Error message */}
            {actionData?.error && (
              <div className="mb-6 text-sm text-red-600 bg-red-50 p-4 rounded-lg border-l-4 border-red-500 flex items-start">
                <div className="mr-3 mt-0.5 text-red-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                {actionData.error}
              </div>
            )}

            <Form method="post" className="space-y-6">
              <input type="hidden" name="formType" value={isLogin ? 'login' : 'register'} />

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                  用户名
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    defaultValue={actionData?.fields?.username || ''}
                    className="block w-full pl-11 pr-3 py-3.5 border border-gray-200 rounded-xl
                              bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 
                              focus:border-transparent transition duration-200"
                    placeholder="输入您的用户名"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  密码
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    required
                    defaultValue={actionData?.fields?.password || ''}
                    className="block w-full pl-11 pr-11 py-3.5 border border-gray-200 rounded-xl
                              bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 
                              focus:border-transparent transition duration-200"
                    placeholder={isLogin ? '输入您的密码' : '设置您的密码'}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600 focus:outline-none transition duration-200">
                      {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {!isLogin && (
                <div>
                  <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1.5">
                    昵称
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="nickname"
                      name="nickname"
                      type="text"
                      className="block w-full pl-11 pr-3 py-3.5 border border-gray-200 rounded-xl
                                bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 
                                focus:border-transparent transition duration-200"
                      placeholder="这个昵称将显示在您的游记上"
                    />
                  </div>
                </div>
              )}

              {isLogin && (
                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 transition duration-200">
                    忘记密码?
                  </Link>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-xl text-white bg-gradient-to-r from-primary-500 to-primary-600
                           hover:from-primary-600 hover:to-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
                           focus:ring-primary-500 text-sm font-medium
                           transition-all duration-200
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '处理中...' : isLogin ? '登录' : '创建账号'}
                </button>
              </div>
            </Form>

            {isLogin && (
              <div className="mt-8 pt-6 text-center border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  还没有账号?{' '}
                  <button onClick={() => setIsLogin(false)} className="font-medium text-primary-600 hover:text-primary-700 transition duration-200">
                    立即注册
                  </button>
                </p>
              </div>
            )}

            {!isLogin && (
              <div className="mt-8 pt-6 text-center border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  已有账号?{' '}
                  <button onClick={() => setIsLogin(true)} className="font-medium text-primary-600 hover:text-primary-700 transition duration-200">
                    返回登录
                  </button>
                </p>
              </div>
            )}
          </div>

          {/* Test account notice */}
          <div className="mt-8 text-center text-sm">
            <div className="inline-block bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-100">
              <span className="text-gray-600 font-medium">测试账号：</span>
              <span className="text-gray-500">用户名 user1，密码 pass123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
