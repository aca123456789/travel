import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import { adminLogin, createAdminSession, requireNoAdminUser } from "~/services/admin.server";
import { useEffect, useState } from "react";
import { MdAdminPanelSettings, MdLock, MdPerson, MdError } from "react-icons/md";
import { IoChevronBack } from "react-icons/io5";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Redirect to main admin page if already logged in
  await requireNoAdminUser(request);
  return json({});
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return json(
      { error: "请填写账号和密码" },
      { status: 400 }
    );
  }

  try {
    const { user } = await adminLogin({ username, password });
    return createAdminSession(user, "/admin");
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "登录失败" },
      { status: 400 }
    );
  }
};

export default function AdminLogin() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (actionData?.error) {
      setError(actionData.error);
    }
  }, [actionData]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 to-blue-100">
      {/* 顶部导航 */}
      <div className="w-full py-4 px-6">
        <Link to="/" className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors">
          <IoChevronBack className="mr-1" />
          <span>返回主页</span>
        </Link>
      </div>
      
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* 卡片容器 */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* 顶部装饰 */}
            <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
            
            <div className="px-8 pt-8 pb-10">
              {/* 头部 Logo */}
              <div className="flex flex-col items-center mb-8">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                  <MdAdminPanelSettings className="text-indigo-600 text-4xl" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  旅游日记管理系统
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                  请登录您的管理员账号
                </p>
              </div>
              
              {/* 登录表单 */}
              <Form method="post" className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                      用户名
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MdPerson className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="username"
                        name="username"
                        type="text"
                        required
                        className="pl-10 block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        placeholder="请输入用户名"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      密码
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MdLock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        className="pl-10 block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        placeholder="请输入密码"
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 p-4 border border-red-100">
                    <div className="flex">
                      <MdError className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-medium text-red-800">
                          {error}
                        </h3>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 transition-all duration-200"
                  >
                    {isSubmitting ? "登录中..." : "登录"}
                  </button>
                </div>
              </Form>
              
              {/* 提示信息 */}
              <div className="mt-8">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">
                      测试账号信息
                    </span>
                  </div>
                </div>
                <div className="mt-4 bg-gray-50 rounded-lg p-4">
                  <div className="text-center text-xs text-gray-600 space-y-1">
                    <p><span className="font-medium">管理员账号:</span> admin / admin123</p>
                    <p><span className="font-medium">审核员账号:</span> auditor / audit123</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
