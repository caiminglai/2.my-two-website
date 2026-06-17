import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Camera, Save, LogOut, ArrowLeft, Star, Edit2, ChevronRight, Settings, Trash2 } from 'lucide-react';
import { API_BASE_URL, normalizeAvatarUrl } from '../api/config';
import { handleApiError } from '../utils/errorHandler';
import { loadColumns } from '../services/user.service';
import { DEPOSIT_RULES } from '../data/constants';
import type { Column, Row } from '../data/types';

export default function ProfilePage() {
  const navigate = useNavigate();
  const columns = loadColumns();
  const [userData, setUserData] = useState<Row | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [selectedTags, setSelectedTags] = useState<Record<string, string[]>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const userId = localStorage.getItem('user_id');
  const userNickname = localStorage.getItem('user_nickname');
  const authToken = localStorage.getItem('auth_token');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }
    loadMyData();
  }, []);

  const loadMyData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/my`, {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUserData(data.user);
          setFormData(data.user.data || {});
          const tags: Record<string, string[]> = {};
          Object.entries(data.user.data || {}).forEach(([key, val]) => {
            if (typeof val === 'string' && val.includes(',')) {
              tags[key] = val.split(',');
            }
          });
          setSelectedTags(tags);
        }
      } else {
        handleApiError(new Error('加载失败'), '获取个人信息失败');
      }
    } catch (e) {
      handleApiError(e, '网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_phone');
    localStorage.removeItem('user_nickname');
    // 派发事件通知其他组件用户已退出
    window.dispatchEvent(new Event('user-logout'));
    navigate('/');
  };

  const handleSave = async () => {
    if (!formData.name) {
      alert('请填写昵称');
      return;
    }

    const finalData = { ...formData };
    Object.entries(selectedTags).forEach(([key, tags]) => {
      if (tags.length > 0) finalData[key] = tags.join(',');
    });

    try {
      const res = await fetch(`${API_BASE_URL}/users/my`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ data: finalData }),
      });

      if (res.ok) {
        setEditMode(false);
        loadMyData();
      } else {
        alert('保存失败');
      }
    } catch (e) {
      alert('网络错误');
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/my`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (res.ok) {
        handleLogout();
      } else {
        alert('删除失败');
      }
    } catch (e) {
      alert('网络错误');
    }
  };

  const setVal = (key: string, val: string) => setFormData(p => ({ ...p, [key]: val }));

  const toggleTag = (key: string, tag: string) => {
    setSelectedTags(p => {
      const cur = p[key] || [];
      return { ...p, [key]: cur.includes(tag) ? cur.filter(t => t !== tag) : [...cur, tag] };
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }

    // 验证文件大小（限制5MB）
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB');
      return;
    }

    // 先显示预览
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch(`${API_BASE_URL}/upload/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          // 重新加载用户数据
          await loadMyData();
          setAvatarPreview(null); // 清除预览
          alert('头像上传成功！');
        } else {
          alert(result.message || '上传失败');
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.message || '上传失败，请重试');
      }
    } catch (e) {
      alert('网络错误，请检查网络连接后重试');
    } finally {
      setUploading(false);
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
          <Link to="/" className="p-2 rounded-lg hover:bg-orange-50" style={{ color: '#B5A698' }}>
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-medium" style={{ color: '#3D2E20' }}>个人中心</h1>
          {editMode && (
            <button onClick={() => setEditMode(false)} className="ml-auto text-sm" style={{ color: '#E87A5D' }}>
              取消
            </button>
          )}
        </div>

        {userData ? (
          <>
            <div className="rounded-2xl p-5 mb-4" style={{ background: 'linear-gradient(180deg, #FFFDF9, #FDF8F1)', border: '1px solid #F0E4D4' }}>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                  />
                  {/* 显示头像或照片 - 与Home.tsx保持一致风格 */}
                  {(avatarPreview || normalizeAvatarUrl(userData.data?.avatar)) ? (
                    <div 
                      className="w-14 h-14 rounded-2xl avatar-gradient overflow-hidden cursor-pointer relative group"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <img 
                        src={avatarPreview || normalizeAvatarUrl(userData.data?.avatar) || ''}
                        alt="头像"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = '';
                        }}
                      />
                      {uploading && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                      {!uploading && (
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Camera size={18} color="white" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div 
                      className="w-14 h-14 rounded-2xl avatar-gradient flex items-center justify-center text-xl font-semibold cursor-pointer hover:opacity-80 transition-opacity relative group"
                      style={{ color: 'white' }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {String(userData.data?.name || userNickname || '?')[0]}
                      {!uploading && (
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-2xl">
                          <Camera size={18} color="white" />
                        </div>
                      )}
                      {uploading && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-2xl flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium" style={{ color: '#3D2E20' }}>{userData.data?.name || userNickname}</div>
                  <div className="text-xs mt-1" style={{ color: '#B5A698' }}>
                    注册时间: {new Date(userData.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
                {!editMode && (
                  <button onClick={() => setEditMode(true)} className="p-2 rounded-lg" style={{ color: '#E87A5D', background: 'rgba(232,122,93,0.08)' }}>
                    <Edit2 size={16} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button 
                  onClick={() => navigate('/deposit')}
                  className="text-center p-3 rounded-xl cursor-pointer" 
                  style={{ background: '#FDF8F1', border: '1px solid #F0E4D4' }}
                >
                  <div className="text-lg font-semibold" style={{ color: '#E87A5D' }}>{userData.deposit || 0}</div>
                  <div className="text-xs" style={{ color: '#B5A698' }}>保证金(元)</div>
                </button>
                <div className="text-center p-3 rounded-xl" style={{ background: '#FDF8F1', border: '1px solid #F0E4D4' }}>
                  <div className="text-lg font-semibold" style={{ color: '#6BAF7D' }}>{userData.data?.hobbies ? userData.data.hobbies.split(',').length : 0}</div>
                  <div className="text-xs" style={{ color: '#B5A698' }}>兴趣标签</div>
                </div>
                <div className="text-center p-3 rounded-xl" style={{ background: '#FDF8F1', border: '1px solid #F0E4D4' }}>
                  <div className="text-lg font-semibold" style={{ color: '#8B7B6B' }}>
                    {userData.data?.purpose || '未设置'}
                  </div>
                  <div className="text-xs" style={{ color: '#B5A698' }}>目的</div>
                </div>
              </div>
            </div>

            {editMode ? (
              <div className="space-y-3">
                {columns.map(col => {
                  if (col.type === 'tags') {
                    return (
                      <div key={col.key}>
                        <label className="text-xs mb-2 block" style={{ color: '#8B7B6B' }}>{col.label}</label>
                        <div className="flex flex-wrap gap-1.5">
                          {(col.options || []).map(opt => {
                            const isOn = (selectedTags[col.key] || []).includes(opt);
                            return (
                              <button key={opt} onClick={() => toggleTag(col.key, opt)}
                                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                                style={{
                                  background: isOn ? 'rgba(232,122,93,0.08)' : '#FDF8F1',
                                  border: `1px solid ${isOn ? '#F5B8A4' : '#F0E4D4'}`,
                                  color: isOn ? '#E87A5D' : '#B5A698',
                                }}>
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  if (col.type === 'select') {
                    return (
                      <div key={col.key}>
                        <label className="text-xs mb-1.5 block" style={{ color: '#8B7B6B' }}>{col.label}</label>
                        <select className="w-full px-3 py-2.5 rounded-lg text-sm appearance-none"
                          style={{ background: '#F5EDE3', border: '1px solid #E8DED0', color: '#3D2E20', outline: 'none' }}
                          value={String(formData[col.key] || '')} onChange={e => setVal(col.key, e.target.value)}>
                          <option value="" style={{ background: '#FFFDF9' }}>请选择</option>
                          {(col.options || []).map(o => <option key={o} value={o} style={{ background: '#FFFDF9' }}>{o}</option>)}
                        </select>
                      </div>
                    );
                  }

                  return (
                    <div key={col.key}>
                      <label className="text-xs mb-1.5 block" style={{ color: '#8B7B6B' }}>{col.label}</label>
                      <input className="w-full px-3 py-2.5 rounded-lg text-sm"
                        style={{ background: '#F5EDE3', border: '1px solid #E8DED0', color: '#3D2E20', outline: 'none' }}
                        type={col.type === 'number' ? 'number' : 'text'}
                        placeholder={`输入${col.label}`}
                        value={String(formData[col.key] || '')}
                        onChange={e => setVal(col.key, e.target.value)} />
                    </div>
                  );
                })}

                <button onClick={handleSave}
                  className="w-full py-3.5 rounded-xl text-sm font-medium text-white mt-4"
                  style={{ background: 'linear-gradient(135deg, #E87A5D, #D96A4D)', boxShadow: '0 2px 12px rgba(232,122,93,0.2)' }}>
                  保存修改
                </button>
              </div>
            ) : (
              <div className="rounded-2xl p-5" style={{ background: '#FFFDF9', border: '1px solid #F0E4D4' }}>
                <h3 className="text-sm font-medium mb-3" style={{ color: '#3D2E20' }}>我的资料</h3>
                <div className="space-y-2">
                  {columns.filter(c => {
                    const val = userData.data?.[c.key as keyof typeof userData.data];
                    return c.key !== 'contact' && val && String(val).trim();
                  }).map(col => {
                    const val = String(userData.data?.[col.key as keyof typeof userData.data]);
                    return (
                      <div key={col.key} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #F0E4D4' }}>
                        <span className="text-xs" style={{ color: '#B5A698' }}>{col.label}</span>
                        <span className="text-sm" style={{ color: '#3D2E20' }}>{val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl p-8 text-center" style={{ background: '#FFFDF9', border: '1px solid #F0E4D4' }}>
            <User size={48} style={{ color: '#F0E4D4', margin: '0 auto' }} />
            <p className="mt-4 mb-4" style={{ color: '#8B7B6B' }}>还没有发布过资料</p>
            <Link to="/post" className="inline-block px-6 py-2.5 rounded-xl text-sm text-white" style={{ background: 'linear-gradient(135deg, #E87A5D, #D96A4D)' }}>
              发布资料
            </Link>
          </div>
        )}

        <div className="mt-4 space-y-2">
          <Link to="/my-posts" className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#FFFDF9', border: '1px solid #F0E4D4' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(232,122,93,0.08)' }}>
                <Star size={14} style={{ color: '#E87A5D' }} />
              </div>
              <span className="text-sm" style={{ color: '#3D2E20' }}>我的发布</span>
            </div>
            <ChevronRight size={14} style={{ color: '#B5A698' }} />
          </Link>

          <Link to="/settings" className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#FFFDF9', border: '1px solid #F0E4D4' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(107,175,125,0.08)' }}>
                <Settings size={14} style={{ color: '#6BAF7D' }} />
              </div>
              <span className="text-sm" style={{ color: '#3D2E20' }}>设置</span>
            </div>
            <ChevronRight size={14} style={{ color: '#B5A698' }} />
          </Link>

          <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 rounded-xl" style={{ background: '#FFFDF9', border: '1px solid #F0E4D4' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(212,133,106,0.08)' }}>
                <LogOut size={14} style={{ color: '#D4856A' }} />
              </div>
              <span className="text-sm" style={{ color: '#D4856A' }}>退出登录</span>
            </div>
          </button>

          {userData && (
            <button onClick={() => setShowDeleteModal(true)} className="w-full flex items-center justify-between p-4 rounded-xl" style={{ background: '#FFFDF9', border: '1px solid #F0E4D4' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.05)' }}>
                  <Trash2 size={14} style={{ color: '#DC2626' }} />
                </div>
                <span className="text-sm" style={{ color: '#DC2626' }}>删除账号</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(61,46,32,0.3)' }}>
          <div className="rounded-2xl p-5 w-full max-w-sm" style={{ background: '#FFFDF9', border: '1px solid #F0E4D4', boxShadow: '0 8px 32px rgba(61,46,32,0.12)' }}>
            <h3 className="text-sm font-medium mb-2" style={{ color: '#DC2626' }}>删除账号</h3>
            <p className="text-xs mb-4" style={{ color: '#8B7B6B' }}>
              确定要删除您的账号吗？此操作不可恢复，保证金将原路退回。
            </p>
            <div className="flex gap-2">
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: '#DC2626' }}>确认删除</button>
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2.5 rounded-lg text-sm" style={{ background: '#F5EDE3', color: '#8B7B6B', border: '1px solid #E8DED0' }}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}