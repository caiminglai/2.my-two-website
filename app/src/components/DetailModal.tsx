import { X, Star, Flag, MapPin, Heart, Eye, Phone, Copy, Check } from 'lucide-react';
import type { Row } from '../data/types';
import { maskContact } from './UserCard';
import { useState } from 'react';

interface DetailModalProps {
  row: Row;
  ratings: any[];
  averageRating: { avg: number; count: number } | null;
  onClose: () => void;
  onShowPay: () => void;
  onShowRating: (id: string) => void;
  onShowReport: (id: string) => void;
}

const FIELD_LABELS: Record<string, string> = {
  name: '昵称', gender: '性别', age: '年龄', height: '身高', weight: '体重',
  skinTone: '肤色', zodiac: '星座', bloodType: '血型', city: '城市',
  marriage: '婚姻', children: '子女', education: '学历', job: '职业',
  income: '收入', house: '住房', car: '购车', faceType: '脸型',
  eyeType: '眼型', mouthType: '嘴型', bodyType: '身材', hobbies: '兴趣爱好',
  food: '美食偏好', sport: '运动爱好', music: '音乐偏好', smoke: '吸烟',
  drink: '饮酒', religion: '宗教信仰', pet: '宠物', personality: '性格',
  expectation: '期望', contact: '联系方式', interestTags: '兴趣标签', purpose: '目的'
};

const DISPLAY_FIELDS = ['purpose', 'gender', 'age', 'height', 'weight', 'city', 'education', 'job', 'income', 'marriage', 'children', 'house', 'car', 'skinTone', 'faceType', 'eyeType', 'mouthType', 'bodyType', 'zodiac', 'bloodType', 'personality', 'smoke', 'drink', 'religion', 'pet', 'hobbies', 'food', 'sport', 'music', 'interestTags', 'expectation', 'contact'];

// 判断是否是手机号
function isPhoneNumber(contact: string): boolean {
  return /^1[3-9]\d{9}$/.test(contact.replace(/\s/g, ''));
}

export default function DetailModal({ row, ratings, averageRating, onClose, onShowPay, onShowRating, onShowReport }: DetailModalProps) {
  const d = (row.data || {}) as NonNullable<typeof row.data>;
  const [copied, setCopied] = useState(false);

  // 复制联系方式
  const handleCopy = (contact: string) => {
    navigator.clipboard.writeText(contact).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // 拨打电话
  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto" style={{ background: '#FAF6F1' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ background: d.gender === '女' ? 'linear-gradient(135deg, #FF9A9E, #FECFEF)' : 'linear-gradient(135deg, #89CFF0, #B8D4E3)' }}>
              {(d.name || '?')[0]}
            </div>
            <div>
              <h2 className="font-semibold text-lg" style={{ color: '#3D2E20' }}>{d.name || '未知'}</h2>
              <div className="flex items-center gap-2 text-xs" style={{ color: '#9B8B7B' }}>
                {d.gender && <span>{d.gender}</span>}
                {d.age && <span>{d.age}岁</span>}
                {d.city && <span className="inline-flex items-center gap-0.5"><MapPin size={10} />{d.city}</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ color: '#9B8B7B' }}><X size={20} /></button>
        </div>

        {/* 评分 */}
        {averageRating && averageRating.count > 0 && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.8)' }}>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(i => (
                <Star key={i} size={14} fill={i <= Math.round(averageRating.avg) ? '#F5A623' : 'none'} style={{ color: '#F5A623' }} />
              ))}
            </div>
            <span className="text-sm" style={{ color: '#3D2E20' }}>{averageRating.avg.toFixed(1)}</span>
            <span className="text-xs" style={{ color: '#9B8B7B' }}>({averageRating.count}人评价)</span>
          </div>
        )}

        {/* 详细信息 */}
        <div className="space-y-2 mb-4">
          {DISPLAY_FIELDS.map(key => {
            const val = d[key as keyof typeof d];
            if (!val) return null;
            const label = FIELD_LABELS[key] || key;
            const isContact = key === 'contact';
            const contactStr = String(val);
            const isPhone = isPhoneNumber(contactStr);
            return (
              <div key={key} className="flex items-center py-1.5" style={{ borderBottom: '1px solid rgba(232,122,93,0.06)' }}>
                <span className="text-xs w-20 flex-shrink-0" style={{ color: '#9B8B7B' }}>{label}</span>
                <span className="text-sm flex-1" style={{ color: '#3D2E20' }}>
                  {isContact ? maskContact(contactStr) : contactStr}
                </span>
                {isContact && (
                  <div className="flex items-center gap-1">
                    {/* 拨号按钮（仅手机号显示） */}
                    {isPhone && (
                      <button 
                        onClick={() => handleCall(contactStr)}
                        className="text-xs px-2 py-1 rounded-lg flex items-center gap-1"
                        style={{ background: 'rgba(107,175,125,0.08)', color: '#6BAF7D' }}
                        title="拨打电话"
                      >
                        <Phone size={12} />
                      </button>
                    )}
                    {/* 复制按钮 */}
                    <button 
                      onClick={() => handleCopy(contactStr)}
                      className="text-xs px-2 py-1 rounded-lg flex items-center gap-1"
                      style={{ background: 'rgba(232,122,93,0.08)', color: copied ? '#6BAF7D' : '#E87A5D' }}
                      title="复制联系方式"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                    {/* 查看完整按钮 */}
                    <button 
                      onClick={onShowPay} 
                      className="text-xs px-2 py-1 rounded-lg flex items-center gap-1" 
                      style={{ background: 'rgba(232,122,93,0.08)', color: '#E87A5D' }}
                    >
                      <Eye size={12} /> 完整
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-3">
          <button onClick={() => onShowRating(row.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(245,166,35,0.08)', color: '#F5A623' }}>
            <Star size={14} /> 评价
          </button>
          <button onClick={() => onShowReport(row.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(232,122,93,0.08)', color: '#E87A5D' }}>
            <Flag size={14} /> 举报
          </button>
        </div>

        {/* 评价列表 */}
        {ratings.length > 0 && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(232,122,93,0.08)' }}>
            <h3 className="text-sm font-medium mb-2" style={{ color: '#3D2E20' }}>评价记录</h3>
            {ratings.map((r: any, i: number) => (
              <div key={i} className="py-2" style={{ borderBottom: '1px solid rgba(232,122,93,0.04)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs" style={{ color: '#9B8B7B' }}>{r.rater_name || '匿名'}</span>
                  <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} size={10} fill={s <= r.rating ? '#F5A623' : 'none'} style={{ color: '#F5A623' }} />)}</div>
                </div>
                {r.comment && <p className="text-xs" style={{ color: '#8B7B6B' }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
