import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Shield, AlertCircle } from 'lucide-react';
import { loadColumns, loadRows, addRow } from '../services/user.service';
import { DEPOSIT_RULES } from '../data/constants';
import type { Row } from '../data/types';
import { API_BASE_URL, normalizeAvatarUrl } from '../api/config';

export default function PostPage() {
  const navigate = useNavigate();
  const [columns] = useState(() => loadColumns());
  const [data, setData] = useState<Record<string, string | number>>({});
  const [selectedTags, setSelectedTags] = useState<Record<string, string[]>>({});
  const [agreeDeposit, setAgreeDeposit] = useState(false);
  const [depositStatus, setDepositStatus] = useState<string | null>(null);
  const [loadingDeposit, setLoadingDeposit] = useState(true);

  const userId = localStorage.getItem('user_id');
  const authToken = localStorage.getItem('auth_token');

  useEffect(() => {
    if (!userId || !authToken) {
      if (confirm('发布资料需要先登录。是否前往登录？')) {
        navigate('/login');
      }
      return;
    }
    checkDepositStatus();
  }, []);

  const checkDepositStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/my-deposit`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          setDepositStatus(result.data.status);
        }
      }
    } catch (e) {
      // ignored
    } finally {
      setLoadingDeposit(false);
    }
  };

  const setVal = (key: string, val: string) => setData(p => ({ ...p, [key]: val }));

  const toggleTag = (key: string, tag: string) => {
    setSelectedTags(p => {
      const cur = p[key] || [];
      return { ...p, [key]: cur.includes(tag) ? cur.filter(t => t !== tag) : [...cur, tag] };
    });
  };

  const handleSubmit = async () => {
    if (!data.name) { alert('请填写昵称'); return; }
    if (!agreeDeposit) { alert('请同意保证金制度'); return; }

    const finalData = { ...data };
    Object.entries(selectedTags).forEach(([key, tags]) => {
      if (tags.length > 0) finalData[key] = tags.join(',');
    });

    const row: Row = {
      id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
      user_id: userId,
      deposit: DEPOSIT_RULES.amount,
      createdAt: Date.now(),
      data: finalData,
    };

    if (userId && authToken) {
      try {
        const res = await fetch(`${API_BASE_URL}/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(row),
        });
        if (res.ok) {
          navigate('/profile');
        } else {
          alert('发布失败');
        }
      } catch (e) {
        alert('网络错误');
      }
    } else {
      addRow(loadRows(), row);
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#FAF6F1' }}>
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="p-2 rounded-lg hover:bg-orange-50" style={{ color: '#B5A698' }}>
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-medium" style={{ color: '#3D2E20' }}>发布资料</h1>
        </div>

        {/* Deposit Banner */}
        <div className="rounded-xl p-4 mb-5 flex items-start gap-3" style={{ background: 'linear-gradient(135deg, rgba(107,175,125,0.06), #FFFDF9)', border: '1px solid #C4E0CC' }}>
          <Shield size={18} style={{ color: '#6BAF7D', marginTop: '2px', flexShrink: 0 }} />
          <div>
            <p className="text-sm font-medium" style={{ color: '#6BAF7D' }}>保证金 {DEPOSIT_RULES.amount} 元</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: '#8B7B6B' }}>
              见面后发现信息造假可投诉。核实后你获得{DEPOSIT_RULES.emotionalDamage}元感情损失费，平台收取{DEPOSIT_RULES.platformFee}元运营费，造假方删除数据可退回{DEPOSIT_RULES.deleteRefund}元。未被投诉可随时删除数据退回押金。
            </p>
          </div>
        </div>

        {/* Avatar Upload */}
        <div className="mb-5">
          <label className="text-xs mb-2 block" style={{ color: '#8B7B6B' }}>头像照片</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold avatar-gradient overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #F5B8A4, #E87A5D)' }}>
              {normalizeAvatarUrl(data.avatar as string) ? (
                <img 
                  src={normalizeAvatarUrl(data.avatar as string) || ''} 
                  alt="头像预览" 
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <span style={{ color: 'white' }}>{String(data.name || '?')[0] || '?'}</span>
              )}
            </div>
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setVal('avatar', ev.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
                id="avatar-upload"
              />
              <label htmlFor="avatar-upload" className="inline-block px-4 py-2 rounded-xl text-sm cursor-pointer transition-all"
                style={{ background: '#F5EDE3', border: '1px solid #E8DED0', color: '#E87A5D' }}>
                上传照片
              </label>
              <p className="text-xs mt-1.5" style={{ color: '#B5A698' }}>支持 JPG、PNG 格式</p>
            </div>
          </div>
        </div>

        {/* Form */}
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
                    value={String(data[col.key] || '')} onChange={e => setVal(col.key, e.target.value)}>
                    <option value="" style={{ background: '#FFFDF9' }}>请选择</option>
                    {(col.options || []).map(o => <option key={o} value={o} style={{ background: '#FFFDF9' }}>{o}</option>)}
                  </select>
                </div>
              );
            }

            return (
              <div key={col.key}>
                <label className="text-xs mb-1.5 block" style={{ color: '#8B7B6B' }}>{col.label} {col.key === 'name' ? '*' : ''}</label>
                <input className="w-full px-3 py-2.5 rounded-lg text-sm transition-all"
                  style={{ background: '#F5EDE3', border: '1px solid #E8DED0', color: '#3D2E20', outline: 'none' }}
                  type={col.type === 'number' ? 'number' : 'text'}
                  placeholder={`输入${col.label}`}
                  value={String(data[col.key] || '')}
                  onFocus={e => (e.target.style.borderColor = '#F5B8A4')}
                  onBlur={e => (e.target.style.borderColor = '#E8DED0')}
                  onChange={e => setVal(col.key, e.target.value)} />
              </div>
            );
          })}
        </div>

        {/* Agreement */}
        <div className="mt-5 p-4 rounded-xl flex items-start gap-3" style={{ background: '#FFFDF9', border: '1px solid #F0E4D4' }}>
          <input type="checkbox" id="agree" className="mt-0.5" checked={agreeDeposit} onChange={e => setAgreeDeposit(e.target.checked)} />
          <label htmlFor="agree" className="text-xs leading-relaxed" style={{ color: '#8B7B6B' }}>
            我同意缴纳{DEPOSIT_RULES.amount}元保证金。我承诺填写的信息真实有效，如有造假愿意接受押金处罚。找到对象后可随时删除数据并退回押金。
          </label>
        </div>

        <button onClick={handleSubmit}
          className="w-full mt-5 mb-8 py-3.5 rounded-xl text-sm font-medium text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #E87A5D, #D96A4D)', boxShadow: '0 2px 12px rgba(232,122,93,0.2)' }}>
          发布（缴纳{DEPOSIT_RULES.amount}元保证金）
        </button>
      </div>
    </div>
  );
}
