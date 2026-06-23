import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { ArrowLeft, Heart, Users, Sparkles, Utensils, Dumbbell, Music, MapPin, ChevronLeft } from 'lucide-react';
import { API_BASE_URL, API_ENDPOINTS, normalizeAvatarUrl } from '../api/config';
import type { Row } from '../data/types';
import ImagePreview from '../components/ImagePreview';

const getBasePath = () => {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/jzxr')) return '/jzxr';
  return '';
};

const CIRCLE_CONFIGS: Record<string, { label: string; icon: typeof Heart; color: string }> = {
  hobbies: { label: '兴趣圈', icon: Sparkles, color: '#E87A5D' },
  food: { label: '美食圈', icon: Utensils, color: '#D4A054' },
  sport: { label: '运动圈', icon: Dumbbell, color: '#6BAF7D' },
  music: { label: '音乐圈', icon: Music, color: '#7B8CDE' },
  city: { label: '同城圈', icon: MapPin, color: '#C47BAF' },
  personality: { label: '性格圈', icon: Heart, color: '#E87A5D' },
};

function maskContact(contact: string) {
  if (!contact) return '';
  if (/^\d{11}$/.test(contact)) {
    return contact.slice(0, 3) + '****' + contact.slice(7);
  }
  return contact.slice(0, 3) + '****' + contact.slice(-2);
}

export default function CircleDetailPage() {
  const { circleKey, tag } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const decodedTag = decodeURIComponent(tag || '');
  const config = CIRCLE_CONFIGS[circleKey || ''] || CIRCLE_CONFIGS.hobbies;
  const Icon = config.icon;

  useEffect(() => {
    const authToken = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    fetch(`${API_BASE_URL}/users?limit=200`, { headers })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setRows(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const circleUsers = useMemo(() =>
    rows.filter(r => {
      const val = String(r.data?.[circleKey as keyof typeof r.data] || '');
      return val.includes(decodedTag);
    })
  , [rows, circleKey, decodedTag]);

  const detailRow = showDetail ? rows.find(r => r.id === showDetail) : null;
  const detailData = detailRow?.data;

  return (
    <div className="min-h-screen pb-8" style={{ background: '#FAF6F1' }}>
      <div className="max-w-3xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/circles')} className="p-2 rounded-lg hover:bg-orange-50" style={{ color: '#B5A698' }}>
            <ChevronLeft size={20} />
          </button>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)`, boxShadow: `0 2px 8px ${config.color}40` }}>
            <Icon size={18} color="white" />
          </div>
          <div>
            <h1 className="text-lg font-medium" style={{ color: '#3D2E20' }}>{decodedTag}</h1>
            <p className="text-xs" style={{ color: '#B5A698' }}>{config.label} · {circleUsers.length}位圈友</p>
          </div>
        </div>

        {/* Banner */}
        <div className="rounded-2xl p-5 mb-5"
          style={{ background: `linear-gradient(135deg, ${config.color}10, ${config.color}05)`, border: `1px solid ${config.color}20` }}>
          <p className="text-sm" style={{ color: '#3D2E20' }}>
            <span style={{ color: config.color, fontWeight: 600 }}>{decodedTag}</span> 圈的圈友们
          </p>
          <p className="text-xs mt-1" style={{ color: '#B5A698' }}>
            每个人既是自己的圈子，又是别人的圈子。在这里，找到与你同频的人。
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: '#B5A698' }}>加载中...</p>
          </div>
        )}

        {/* User Cards */}
        {!loading && (
          <div className="space-y-2">
            {circleUsers.map(user => (
              <div key={user.id}
                className="rounded-xl p-4 cursor-pointer transition-all"
                style={{ background: '#FFFDF9', border: '1px solid #F0E4D4' }}
                onClick={() => setShowDetail(user.id)}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${config.color}40`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#F0E4D4'; }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 overflow-hidden cursor-pointer relative"
                    style={{ background: `${config.color}10`, color: config.color, border: `1px solid ${config.color}25` }}
                    onClick={e => {
                      e.stopPropagation();
                      if (user.data?.avatar) setPreviewImage(normalizeAvatarUrl(user.data.avatar) || '');
                    }}>
                    {/* 总是显示名字首字母作为背景 */}
                    <span className="absolute inset-0 flex items-center justify-center">{String(user.data?.name || '?')[0]}</span>
                    
                    {/* 如果有头像，显示在最上面 */}
                    {user.data?.avatar && (
                      <img 
                        src={normalizeAvatarUrl(user.data.avatar) || undefined} 
                        alt={user.data?.name || 'avatar'} 
                        className="w-full h-full object-cover absolute inset-0"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.style.display = 'none';
                        }} 
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: '#3D2E20' }}>{user.data?.name || '匿名'}</span>
                      {user.data?.gender && <span className="text-xs" style={{ color: '#B5A698' }}>{user.data.gender}</span>}
                      {user.data?.age && <span className="text-xs" style={{ color: '#B5A698' }}>{user.data.age}岁</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {user.data?.city && <span className="text-xs" style={{ color: '#B5A698' }}>{user.data.city}</span>}
                      {user.data?.purpose && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: `${config.color}08`, color: config.color, border: `1px solid ${config.color}18` }}>
                          {user.data.purpose}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tags preview */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.entries(user.data || {}).filter(([k, v]) =>
                    k !== 'name' && k !== 'contact' && k !== 'purpose' && k !== 'gender' && k !== 'age' && v && String(v).trim()
                  ).slice(0, 5).map(([key, val]) => (
                    <span key={key} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs"
                      style={{ background: '#FDF8F1', border: '1px solid #F0E4D4', color: '#8B7B6B' }}>
                      {String(val).length > 10 ? String(val).slice(0, 10) + '...' : String(val)}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {circleUsers.length === 0 && (
              <div className="text-center py-12">
                <Users size={28} style={{ color: '#F0E4D4', margin: '0 auto' }} />
                <p className="mt-2 text-sm" style={{ color: '#D4C8B8' }}>这个圈子还没有人</p>
                <Link to="/post" className="inline-block mt-3 text-sm px-4 py-2 rounded-lg text-white"
                  style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)` }}>
                  成为第一个圈友
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetail && detailData && (
        <div className="fixed inset-0 z-50 flex items-center justify-end" style={{ background: 'rgba(61,46,32,0.3)' }} onClick={() => setShowDetail(null)}>
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl p-5"
            style={{ background: '#FFFDF9', border: '1px solid #F0E4D4', boxShadow: '0 8px 32px rgba(61,46,32,0.12)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium" style={{ color: '#3D2E20' }}>详细资料</h3>
              <button onClick={() => setShowDetail(null)} className="p-1.5 rounded-md hover:bg-orange-50" style={{ color: '#D4C8B8' }}>✕</button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold overflow-hidden cursor-pointer relative"
                  style={{ background: `${config.color}10`, color: config.color, border: `1px solid ${config.color}25` }}
                  onClick={() => {
                    if (detailData.avatar) setPreviewImage(normalizeAvatarUrl(detailData.avatar) || '');
                  }}>
                  {/* 总是显示名字首字母作为背景 */}
                  <span className="absolute inset-0 flex items-center justify-center">{String(detailData.name || '?')[0]}</span>
                  
                  {/* 如果有头像，显示在最上面 */}
                  {detailData.avatar && (
                    <img 
                      src={normalizeAvatarUrl(detailData.avatar) || undefined} 
                      alt={detailData.name || 'avatar'} 
                      className="w-full h-full object-cover absolute inset-0"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.style.display = 'none';
                      }} 
                    />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: '#3D2E20' }}>{detailData.name || '匿名'}</span>
                    {detailData.gender && <span className="text-xs" style={{ color: '#B5A698' }}>{detailData.gender}</span>}
                    {detailData.age && <span className="text-xs" style={{ color: '#B5A698' }}>{detailData.age}岁</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {detailData.city && <span className="text-xs" style={{ color: '#B5A698' }}>{detailData.city}</span>}
                    {detailData.purpose && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: `${config.color}08`, color: config.color, border: `1px solid ${config.color}18` }}>
                          {detailData.purpose}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

              {/* All tags */}
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(detailData).filter(([k, v]) =>
                  k !== 'name' && k !== 'contact' && k !== 'purpose' && v && String(v).trim()
                ).map(([key, val]) => (
                  <span key={key} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs"
                    style={{ background: '#FDF8F1', border: '1px solid #F0E4D4', color: '#8B7B6B' }}>
                    {String(val)}
                  </span>
                ))}
              </div>

              {/* Circles this person belongs to */}
              <div className="mt-4 p-3 rounded-xl" style={{ background: `${config.color}06`, border: `1px solid ${config.color}15` }}>
                <div className="text-xs font-medium mb-2" style={{ color: config.color }}>TA的圈子</div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(CIRCLE_CONFIGS).map(([key, cfg]) => {
                    const val = String(detailData[key as keyof typeof detailData] || '');
                    if (!val) return null;
                    const tags = val.split(',').map(t => t.trim()).filter(Boolean);
                    return tags.map(t => (
                      <span key={`${key}-${t}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs cursor-pointer"
                        style={{ background: `${cfg.color}08`, color: cfg.color, border: `1px solid ${cfg.color}18` }}
                        onClick={() => navigate(`/circle/${key}/${encodeURIComponent(t)}`)}>
                        {t}
                      </span>
                    ));
                  })}
                </div>
              </div>

              {detailData.contact && (
                <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(232,122,93,0.06), rgba(232,122,93,0.02))', border: '1px solid rgba(232,122,93,0.12)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#E87A5D' }}>联系方式</div>
                  <div className="text-sm font-medium" style={{ color: '#3D2E20' }}>{maskContact(detailData.contact)}</div>
                  <button 
                    onClick={() => setShowPayModal(true)}
                    className="mt-2 w-full py-2 rounded-lg text-xs font-medium"
                    style={{ background: 'linear-gradient(135deg, #E87A5D, #F5A623)', color: '#fff' }}
                  >
                    💰 支付 9.9 元查看完整联系方式
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

            {showPayModal && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowPayModal(false)}>
                <div className="bg-white rounded-2xl p-6 w-80 max-w-[90%] mx-4" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold mb-2 text-center" style={{ color: '#E87A5D' }}>查看联系方式</h3>
                  <p className="text-sm text-center mb-4" style={{ color: '#666' }}>
                    支付 9.9 元后，即可查看完整联系方式<br/>
                    <span className="text-xs" style={{ color: '#999' }}>（转账后截图发给客服，客服手动解锁）</span>
                  </p>
                  <div className="flex flex-col gap-3">
                    <div className="p-3 rounded-xl text-center cursor-pointer" style={{ background: '#f8f9fa' }}
                      onClick={() => setPreviewImage(`${getBasePath()}/wechat-qr.png`)}>
                      <div className="text-xs mb-1 font-medium" style={{ color: '#666' }}>微信支付</div>
                      <img src={`${getBasePath()}/wechat-qr.png`} alt="微信收款码" className="w-40 h-40 mx-auto rounded-lg" style={{ objectFit: 'cover' }} />
                    </div>
                    <div className="p-3 rounded-xl text-center cursor-pointer" style={{ background: '#f8f9fa' }}
                      onClick={() => setPreviewImage(`${getBasePath()}/alipay-qr.png`)}>
                      <div className="text-xs mb-1 font-medium" style={{ color: '#666' }}>支付宝</div>
                      <img src={`${getBasePath()}/alipay-qr.png`} alt="支付宝收款码" className="w-40 h-40 mx-auto rounded-lg" style={{ objectFit: 'cover' }} />
                    </div>
                  </div>
                  <p className="text-xs text-center mt-3" style={{ color: '#B5A698' }}>
                    支付完成后截图发给客服解锁
                  </p>
                  <button
                    onClick={() => { navigator.clipboard.writeText('chanmiao0430').then(() => alert('客服微信号已复制: chanmiao0430')); }}
                    className="mt-2 w-full py-2 rounded-xl text-xs font-medium"
                    style={{ background: '#FFF5E8', color: '#E87A5D', border: '1px solid #F5D4C0' }}
                  >
                    联系客服微信：chanmiao0430（点击复制）
                  </button>
                  <button 
                    onClick={() => setShowPayModal(false)}
                    className="mt-3 w-full py-2.5 rounded-xl text-sm font-medium"
                    style={{ background: '#f0f0f0', color: '#666' }}
                  >
                    关闭
                  </button>
                </div>
              </div>
            )}
      
      <ImagePreview
        src={previewImage || ''}
        alt="图片预览"
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}
