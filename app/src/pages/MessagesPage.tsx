import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { API_BASE_URL } from '../api/config';

interface Conversation {
  userId: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastTime: number;
  unreadCount: number;
}

interface Message {
  id: number;
  fromUserId: string;
  toUserId: string;
  content: string;
  status: string;
  createdAt: number;
  isMe: boolean;
}

function formatTime(timestamp: number | string | null | undefined): string {
  if (!timestamp || timestamp === 0) return '';
  try {
    const ts = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
    if (isNaN(ts)) return '';
    const date = new Date(ts);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diff = now.getTime() - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
    return (date.getMonth() + 1) + '/' + date.getDate();
  } catch (e) {
    return '';
  }
}

function safeStr(v: string | null | undefined, fallback: string = ''): string {
  return v ? String(v) : fallback;
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const params = useParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(params.userId ? String(params.userId) : null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    try {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setIsLoggedIn(false);
      return;
    }
    setIsLoggedIn(true);
    loadConversations();
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadMessages(selectedUserId);
    }
  }, [selectedUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      const res = await fetch(API_BASE_URL + '/message/conversations', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) return;
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setConversations(result.data as Conversation[]);
      }
    } catch (err) {
      console.error('加载对话列表失败:', err);
    }
  };

  const loadMessages = async (userId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      const res = await fetch(API_BASE_URL + '/message/list?userId=' + encodeURIComponent(userId), {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setMessages(result.data as Message[]);
      }
    } catch (err) {
      console.error('加载消息失败:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUserId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('请先登录');
        navigate('/login');
        return;
      }
      const res = await fetch(API_BASE_URL + '/message/send', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          toUserId: selectedUserId,
          content: newMessage.trim()
        })
      });
      const result = await res.json();
      if (result.success) {
        setNewMessage('');
        await loadMessages(selectedUserId);
      }
    } catch (err) {
      console.error('发送消息失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = conversations.find(c => c.userId === selectedUserId);

  return (
    <div className="min-h-screen" style={{ background: '#FAF6F1' }}>
      <header className="bg-white border-b sticky top-0 z-10" style={{ borderColor: '#E8DED0' }}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ background: '#F5EDE3', color: '#3D2E20' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-semibold" style={{ color: '#3D2E20' }}>消息</h1>
          <div className="w-8"></div>
        </div>
      </header>

      <div className="max-w-lg mx-auto flex" style={{ minHeight: 'calc(100vh - 56px)' }}>
        {/* 对话列表 */}
        <div className={selectedUserId ? 'hidden' : 'w-full'}>
          {!isLoggedIn ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4" style={{ color: '#8B7B6B' }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: '#F5EDE3' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#B5A698' }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <p className="mb-4" style={{ color: '#8B7B6B' }}>请先登录后查看消息</p>
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2.5 rounded-xl text-sm font-medium text-white"
                style={{ background: 'linear-gradient(135deg, #E87A5D, #D96A4D)' }}
              >
                去登录
              </button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4" style={{ color: '#8B7B6B' }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: '#F5EDE3' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#B5A698' }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="mb-2" style={{ color: '#8B7B6B' }}>暂无消息</p>
              <p className="text-xs" style={{ color: '#B5A698' }}>缴纳保证金后可发送消息</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: '#F0E4D4' }}>
              {conversations.map((conv) => (
                <div
                  key={conv.userId}
                  onClick={() => {
                    setSelectedUserId(conv.userId);
                    navigate('/messages/' + encodeURIComponent(conv.userId));
                  }}
                  className="p-4 cursor-pointer transition-colors hover:bg-orange-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold" style={{ background: 'linear-gradient(135deg, #E87A5D, #F5A623)' }}>
                        {safeStr(conv.name, '?').charAt(0) || '?'}
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ background: '#C4515C' }}>
                          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate" style={{ color: '#3D2E20' }}>{safeStr(conv.name, '用户')}</span>
                        <span className="text-xs" style={{ color: '#B5A698' }}>{formatTime(conv.lastTime)}</span>
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: '#8B7B6B' }}>{safeStr(conv.lastMessage, '')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 聊天窗口 */}
        {selectedUserId && (
          <div className="w-full flex flex-col bg-white">
            <div className="p-3 border-b flex items-center gap-3" style={{ borderColor: '#E8DED0' }}>
              <button
                onClick={() => {
                  setSelectedUserId(null);
                  navigate('/messages');
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg"
                style={{ background: '#F5EDE3' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3D2E20' }}>
                  <path d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold" style={{ background: 'linear-gradient(135deg, #E87A5D, #F5A623)' }}>
                {selectedUser?.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm" style={{ color: '#3D2E20' }}>{safeStr(selectedUser?.name, '用户')}</h3>
              </div>
            </div>

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: '300px' }}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: '#B5A698' }}>
                  <p className="text-sm">开始与{safeStr(selectedUser?.name, '对方')}聊天吧</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.isMe || msg.fromUserId === localStorage.getItem('user_id');
                  return (
                    <div key={msg.id} className={'flex ' + (isMe ? 'justify-end' : 'justify-start')}>
                      <div className={'max-w-[75%] px-4 py-2 rounded-2xl text-sm ' + (isMe ? 'text-white rounded-tr-sm' : 'rounded-tl-sm')}
                        style={isMe ? { background: 'linear-gradient(135deg, #E87A5D, #D96A4D)' } : { background: '#F5EDE3', color: '#3D2E20' }}>
                        <p>{safeStr(msg.content, '')}</p>
                        <p className={'text-xs mt-1 ' + (isMe ? 'text-white/70' : '')} style={isMe ? {} : { color: '#B5A698' }}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入框 */}
            <div className="p-3 border-t" style={{ borderColor: '#E8DED0' }}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="输入消息..."
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm"
                  style={{ background: '#F5EDE3', border: 'none', color: '#3D2E20', outline: 'none' }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || loading}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #E87A5D, #D96A4D)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13" />
                    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
