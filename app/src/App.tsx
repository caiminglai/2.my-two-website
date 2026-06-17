import { Routes, Route, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import TabBar from './components/TabBar'
import ErrorBoundary from './components/ErrorBoundary'

// 懒加载页面组件
const Home = lazy(() => import('./pages/Home'))
const PostPage = lazy(() => import('./pages/PostPage'))
const DepositPage = lazy(() => import('./pages/DepositPage'))
const QrPage = lazy(() => import('./pages/QrPage'))
const DeployGuide = lazy(() => import('./pages/DeployGuide'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const MyPostsPage = lazy(() => import('./pages/MyPostsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const CirclesPage = lazy(() => import('./pages/CirclesPage'))
const CircleDetailPage = lazy(() => import('./pages/CircleDetailPage'))
const AntiFraudPage = lazy(() => import('./pages/AntiFraudPage'))

const HIDE_TAB_PATHS = ['/login', '/deploy', '/qr']

// 加载占位符组件 - 骨架屏风格
function LoadingFallback() {
  return (
    <div className="min-h-screen" style={{ background: '#FAF6F1' }}>
      <div className="max-w-3xl mx-auto px-4 pt-6">
        {/* 顶部搜索栏骨架 */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.9)', boxShadow: '0 2px 12px rgba(61,46,32,0.06)' }}>
          <div className="flex gap-2 mb-3">
            <div className="h-9 flex-1 rounded-xl animate-pulse" style={{ background: '#E8DED0' }} />
            <div className="h-9 w-20 rounded-xl animate-pulse" style={{ background: '#E8DED0' }} />
          </div>
          {/* 快速标签骨架 */}
          <div className="flex flex-wrap gap-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-6 w-14 rounded-full animate-pulse" style={{ background: '#E8DED0', animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
        </div>
        {/* 用户卡片骨架 */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl p-4 mb-3 animate-pulse" style={{ background: 'rgba(255,255,255,0.9)', boxShadow: '0 2px 12px rgba(61,46,32,0.06)', animationDelay: `${i * 100}ms` }}>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl" style={{ background: '#E8DED0' }} />
              <div className="flex-1">
                <div className="h-4 w-24 rounded mb-2" style={{ background: '#E8DED0' }} />
                <div className="h-3 w-32 rounded mb-2" style={{ background: '#E8DED0' }} />
                <div className="flex gap-1">
                  <div className="h-5 w-12 rounded" style={{ background: '#E8DED0' }} />
                  <div className="h-5 w-16 rounded" style={{ background: '#E8DED0' }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const showTab = !HIDE_TAB_PATHS.some(p => location.pathname.startsWith(p))    

  return (
    <div className="min-h-screen pb-20" style={{ background: '#FAF6F1' }}>      
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/post" element={<PostPage />} />
            <Route path="/deposit" element={<DepositPage />} />
            <Route path="/qr" element={<QrPage />} />
            <Route path="/deploy" element={<DeployGuide />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/my-posts" element={<MyPostsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/circles" element={<CirclesPage />} />
            <Route path="/circle/:circleKey/:tag" element={<CircleDetailPage />} /> 
            <Route path="/anti-fraud" element={<AntiFraudPage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      {showTab && <TabBar />}
    </div>
  )
}