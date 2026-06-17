import { X, Star, Flag, MapPin, Shield } from 'lucide-react';
import { useNavigate } from 'react-router';
import { CATEGORIES, FIELD_LABELS } from '../data/constants';
import { normalizeAvatarUrl } from '../api/config';
import { maskContact } from './UserCard';
import type { Row, Column } from '../data/types';

interface UserDetailModalProps {
  userId: string;
  row: Row | undefined;
  columns: Column[];
  ratings: any[];
  averageRating: { avg: number; count: number } | null;
  contactUnlocked: boolean;
  fullContact: string | null;
  onClose: () => void;
  onPreviewImage: (url: string) => void;
  onShowRating: (id: string) => void;
  onShowReport: (id: string) => void;
  onShowPay: (targetId: string) => void;
}

export default function UserDetailModal({
  userId,
  row,
  columns,
  ratings,
  averageRating,
  contactUnlocked,
  fullContact,
  onClose,
  onPreviewImage,
  onShowRating,
  onShowReport,
  onShowPay
}: UserDetailModalProps) {
  const detailData = row?.data;
  const navigate = useNavigate();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end fade-in"
      style={{ background: 'rgba(61,46,32,0.25)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full overflow-y-auto slide-in-right"
        style={{ background: 'linear-gradient(180deg, #FFFDF9 0%, #FAF6F1 100%)', boxShadow: '-8px 0 40px rgba(61,46,32,0.1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className="sticky top-0 z-10 px-5 py-4" style={{ background: 'rgba(255,253,249,0.9)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(240,228,212,0.4)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold" style={{ color: '#3D2E20' }}>详细资料</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-orange-50/50 transition-colors" style={{ color: '#B5A698', background: 'rgba(240,228,212,0.2)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-5">
          {detailData && (
            <div className="space-y-5">
              {/* Profile hero */}
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold avatar-gradient overflow-hidden cursor-pointer"
                  onClick={() => {
                    if (detailData.avatar) onPreviewImage(normalizeAvatarUrl(detailData.avatar) || '');
                  }}
                >
                  {detailData.avatar ? (
                    <img
                      src={normalizeAvatarUrl(detailData.avatar) || undefined}
                      alt={detailData.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    String(detailData.name || '?')[0]
                  )}
                </div>
                <div>
                  <div className="text-lg font-semibold" style={{ color: '#3D2E20' }}>{detailData.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {detailData.gender && <span className="text-xs" style={{ color: '#B5A698' }}>{detailData.gender}</span>}
                    {detailData.age && <span className="text-xs" style={{ color: '#B5A698' }}>{detailData.age}岁</span>}
                    {detailData.city && <span className="inline-flex items-center gap-0.5 text-xs" style={{ color: '#B5A698' }}><MapPin size={9} />{detailData.city}</span>}
                  </div>
                  {detailData.purpose && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full mt-1.5 inline-block font-medium" style={{ background: 'rgba(232,122,93,0.06)', color: '#E87A5D', border: '1px solid rgba(232,122,93,0.12)' }}>
                      {detailData.purpose}
                    </span>
                  )}
                </div>
              </div>

              {CATEGORIES.map(cat => {
                const catCols = columns.filter(c => c.category === cat.key && c.key !== 'contact' && c.key !== 'purpose');
                const hasData = catCols.some(col => {
                  const val = detailData[col.key as keyof typeof detailData];
                  return val && String(val).trim();
                });
                if (!hasData) return null;
                return (
                  <div key={cat.key} className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(240,228,212,0.4)' }}>
                    <div className="text-xs font-semibold mb-2.5 flex items-center gap-1.5" style={{ color: '#B5A698' }}>
                      <span className="w-1 h-3 rounded-full" style={{ background: '#E87A5D' }} />
                      {cat.label}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {catCols.map(col => {
                        const val = detailData[col.key as keyof typeof detailData];
                        if (!val || !String(val).trim()) return null;
                        return (
                          <span key={col.key} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium tag-bubble">
                            {FIELD_LABELS[col.key] || col.label}: {String(val)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {detailData.contact && (
                <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, rgba(232,122,93,0.06), rgba(232,122,93,0.02))', border: '1px solid rgba(232,122,93,0.12)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#E87A5D' }}>联系方式</div>
                  {contactUnlocked ? (
                    <>
                      <div className="text-sm font-medium" style={{ color: '#3D2E20' }}>{fullContact || detailData.contact}</div>
                      <div className="mt-2 text-xs" style={{ color: '#6BAF7D' }}>✓ 已解锁，可查看完整联系方式</div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-medium" style={{ color: '#3D2E20' }}>{maskContact(detailData.contact)}</div>
                      <button
                        onClick={() => onShowPay(userId)}
                        className="mt-2 w-full py-2 rounded-lg text-xs font-medium"
                        style={{ background: 'linear-gradient(135deg, #E87A5D, #F5A623)', color: '#fff' }}
                      >
                        💰 支付 9.9 元查看完整联系方式
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* 用户评价 */}
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(240,228,212,0.4)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold flex items-center gap-1.5" style={{ color: '#B5A698' }}>
                    <Star size={12} fill={averageRating?.count > 0 ? '#F5A623' : 'none'} style={{ color: averageRating?.count > 0 ? '#F5A623' : '#B5A698' }} />
                    用户评价
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onShowRating(userId); }}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{ background: 'rgba(107,175,125,0.1)', color: '#6BAF7D' }}
                  >
                    写评价
                  </button>
                </div>
                {averageRating?.count > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold" style={{ color: '#3D2E20' }}>{averageRating.avg.toFixed(1)}</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} size={14} fill={i <= Math.round(averageRating.avg) ? '#F5A623' : 'none'} style={{ color: '#F5A623' }} />
                        ))}
                      </div>
                      <span className="text-xs" style={{ color: '#B5A698' }}>({averageRating.count}条评价)</span>
                    </div>
                    <div className="space-y-2">
                      {ratings.slice(0, 5).map((rating, index) => (
                        <div key={index} className="p-2 rounded-lg" style={{ background: 'rgba(240,228,212,0.3)' }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium" style={{ color: '#3D2E20' }}>{rating.rater_name || '匿名用户'}</span>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(i => (
                                <Star key={i} size={10} fill={i <= rating.rating ? '#F5A623' : 'none'} style={{ color: '#F5A623' }} />
                              ))}
                            </div>
                          </div>
                          {rating.comment && (
                            <p className="text-xs" style={{ color: '#8B7B6B' }}>{rating.comment}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-center py-4" style={{ color: '#B5A698' }}>暂无评价，来写第一条评价吧！</p>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); onShowRating(userId); }}
                  className="flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5"
                  style={{ background: 'rgba(107,175,125,0.1)', color: '#6BAF7D', border: '1px solid rgba(107,175,125,0.2)' }}
                >
                  <Star size={14} />
                  评价
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/anti-fraud'); }}
                  className="flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg, rgba(107,175,125,0.1), rgba(107,175,125,0.05))', color: '#6BAF7D', border: '1px solid rgba(107,175,125,0.2)' }}
                >
                  <Shield size={14} />
                  防诈核实
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onShowReport(userId); }}
                  className="flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5"
                  style={{ background: 'rgba(196,81,92,0.1)', color: '#C4515C', border: '1px solid rgba(196,81,92,0.2)' }}
                >
                  <Flag size={14} />
                  举报
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
