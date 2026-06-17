
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, FileText, MapPin, Heart, Trash2, Eye, Clock, Plus } from 'lucide-react';
import { API_BASE_URL, normalizeAvatarUrl } from '../api/config';
import { loadColumns } from '../services/user.service';
import type { Row } from '../data/types';

export default function MyPostsPage() {
  const navigate = useNavigate();
  const columns = loadColumns();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDelModal, setShowDelModal] = useState<string | null>(null);

  const userId = localStorage.getItem('user_id');
  const authToken = localStorage.getItem('auth_token');

  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }
    loadMyPosts();
  }, []);

  const loadMyPosts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/my`, {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          // 将用户数据包装成 Row 格式
          const myRow: Row = {
            id: data.user.id,
            data: data.user.data || {},
            deposit: data.user.deposit || 0,
            createdAt: data.user.createdAt,
            userId: data.user.userId,
          };
          setRows([myRow]);
        }
      }
    } catch (e) {
      console.error('加载失败', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/my`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (res.ok) {
        setRows([]);
        setShowDelModal(null);
      } else {
        alert('删除失败');
      }
    } catch (e) {
      alert('网络错误');
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAF6F1' }}>
        <div className="text-center">
          <p className="mb-4" style={{ color: '#8B7B6B' }}>请先登录</p>
          <Link to="/login" className="px-6 py-2 rounded-lg text-white text-sm" style={{ background: 'linear-gradient(135deg, #E87A5D, #D96A4D)' }}>
            登录
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAF6F1' }}>
        <p style={{ color: '#B5A698' }}>加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: '#FAF6F1' }}>
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/profile" className="p-2 rounded-lg hover:bg-orange-50" style={{ color: '#B5A698' }}>
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-medium" style={{ color: '#3D2E20' }}>我的发布</h1>
        </div>

        {rows.length > 0 ? (
          <div className="space-y-3">
            {rows.map(row => {
              const visibleCols = columns.filter(c => {
                const val = row.data?.[c.key as keyof typeof row.data];
                return c.key !== 'contact' && val && String(val).trim();
              });

              return (
                <div key={row.id} className="rounded-2xl p-4" style={{ background: '#FFFDF9', border: '1px solid #F0E4D4' }}>
                  {/* 头像+名字 */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl avatar-gradient flex items-center justify-center text-lg font-bold overflow-hidden"
                      style={{ color: 'white' }}>
                      {normalizeAvatarUrl(row.data?.avatar) ? (
                        <img 
                          src={normalizeAvatarUrl(row.data?.avatar) || ''} 
                          alt="头像" 
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        String(row.data?.name || '?')[0]
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium" style={{ color: '#3D2E20' }}>{row.data?.name || '匿名'}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs" style={{ color: '#B5A698' }}>
                          <Clock size={10} className="inline mr-1" />
                          {new Date(row.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                        {row.deposit > 0 && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(107,175,125,0.08)', color: '#6BAF7D' }}>
                            保证金 ¥{row.deposit}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDelModal(row.id)}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                      style={{ color: '#D4C8B8' }}
                      title="删除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* 标签 */}
                  <div className="flex flex-wrap gap-1.5">
                    {visibleCols.slice(0, 8).map(col => {
                      const val = String(row.data?.[col.key as keyof typeof row.data]);
                      return (
                        <span key={col.key}
                          className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium"
                          style={{ background: 'rgba(232,122,93,0.06)', color: '#8B7B6B', border: '1px solid rgba(240,228,212,0.6)' }}>
                          {col.label}: {val.length > 10 ? val.slice(0, 10) + '...' : val}
                        </span>
                      );
                    })}
                    {visibleCols.length > 8 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium"
                        style={{ background: 'rgba(232,122,93,0.06)', color: '#E87A5D' }}>
                        +{visibleCols.length - 8}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* 统计 */}
            <div className="rounded-2xl p-4 mt-4" style={{ background: 'linear-gradient(180deg, #FFFDF9, #FDF8F1)', border: '1px solid #F0E4D4' }}>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-lg font-semibold" style={{ color: '#E87A5D' }}>{rows.length}</div>
                  <div className="text-xs" style={{ color: '#B5A698' }}>发布数</div>
                </div>
                <div>
                  <div className="text-lg font-semibold" style={{ color: '#6BAF7D' }}>{rows.reduce((s, r) => s + (r.deposit || 0), 0)}</div>
                  <div className="text-xs" style={{ color: '#B5A698' }}>保证金(元)</div>
                </div>
                <div>
                  <div className="text-lg font-semibold" style={{ color: '#8B7B6B' }}>
                    {rows.filter(r => r.data?.avatar).length}
                  </div>
                  <div className="text-xs" style={{ color: '#B5A698' }}>有照片</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(232,122,93,0.06)' }}>
              <FileText size={28} style={{ color: '#E87A5D', opacity: 0.4 }} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: '#B5A698' }}>还没有发布过资料</p>
            <p className="text-xs mb-4" style={{ color: '#D4C8B8' }}>发布资料让更多人看到你</p>
            <Link to="/post" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
              style={{ background: 'linear-gradient(135deg, #E87A5D, #D96A4D)' }}>
              <Plus size={14} /> 发布资料
            </Link>
          </div>
        )}
      </div>

      {/* 删除确认弹窗 */}
      {showDelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(61,46,32,0.3)' }}>
          <div className="rounded-2xl p-5 w-full max-w-sm" style={{ background: '#FFFDF9', border: '1px solid #F0E4D4', boxShadow: '0 8px 32px rgba(61,46,32,0.12)' }}>
            <h3 className="text-sm font-medium mb-2" style={{ color: '#DC2626' }}>删除资料</h3>
            <p className="text-xs mb-4" style={{ color: '#8B7B6B' }}>
              确定要删除这条资料吗？如果已缴纳保证金，将全额退回。
            </p>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(showDelModal)} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: '#DC2626' }}>确认删除</button>
              <button onClick={() => setShowDelModal(null)} className="flex-1 py-2.5 rounded-lg text-sm" style={{ background: '#F5EDE3', color: '#8B7B6B', border: '1px solid #E8DED0' }}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
