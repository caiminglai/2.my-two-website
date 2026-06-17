import { NavLink } from 'react-router';
import { useState, useEffect } from 'react';
import { Home, Users, Plus, User, Compass, Shield, MessageCircle } from 'lucide-react';

const tabs = [
  { path: '/', label: '首页', icon: Home },
  { path: '/circles', label: '圈子', icon: Compass },
  { path: '/post', label: '发布', icon: Plus, isCenter: true },
  { path: '/messages', label: '消息', icon: MessageCircle, showBadge: true },
  { path: '/profile', label: '我的', icon: User },
];

export default function TabBar() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadUnreadCount = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      try {
        const res = await fetch('/jzxr/api/message/unread', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const result = await res.json();
          if (result.success) {
            setUnreadCount(result.count);
          }
        }
      } catch (err) {
        console.error('加载未读数失败:', err);
      }
    };

    // 监听登录事件，立即刷新未读数
    const handleLogin = () => loadUnreadCount();
    const handleLogout = () => setUnreadCount(0);
    window.addEventListener('user-login', handleLogin);
    window.addEventListener('user-logout', handleLogout);
    
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('user-login', handleLogin);
      window.removeEventListener('user-logout', handleLogout);
    };
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 glass-nav" style={{
      borderTop: '1px solid rgba(240,228,212,0.4)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      <div className="max-w-3xl mx-auto flex items-center justify-around py-2 px-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isCenter = tab.isCenter;
          const showBadge = tab.showBadge && unreadCount > 0;

          if (isCenter) {
            return (
              <NavLink key={tab.path} to={tab.path}
                className="flex flex-col items-center -mt-5"
                style={{ textDecoration: 'none' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center btn-primary"
                  style={{ borderRadius: '16px' }}>
                  <Icon size={22} color="white" strokeWidth={2.5} />
                </div>
                <span className="text-xs font-medium mt-1" style={{ color: '#E87A5D' }}>{tab.label}</span>
              </NavLink>
            );
          }

          return (
            <NavLink key={tab.path} to={tab.path}
              className="flex flex-col items-center gap-0.5 py-1 px-3 relative"
              style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <div className="flex flex-col items-center gap-0.5 transition-all duration-200 relative">
                  <div className="p-1.5 rounded-xl transition-all duration-200"
                    style={{ background: isActive ? 'rgba(232,122,93,0.08)' : 'transparent' }}>
                    <Icon size={20} style={{ color: isActive ? '#E87A5D' : '#B5A698' }} strokeWidth={isActive ? 2.2 : 1.8} />
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium transition-colors duration-200" style={{ color: isActive ? '#E87A5D' : '#B5A698' }}>
                    {tab.label}
                  </span>
                </div>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
