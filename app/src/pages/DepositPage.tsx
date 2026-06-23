import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Shield, AlertTriangle, CheckCircle, Clock, Ban, Wallet, FileCheck, RefreshCw, HelpCircle, Users, AlertOctagon, QrCode, Upload, Zap } from 'lucide-react';
import { DEPOSIT_RULES } from '../data/constants';
import { API_BASE_URL } from '../api/config';
import { useState, useEffect } from 'react';

const getBasePath = () => {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/jzxr')) return '/jzxr';
  return '';
};

export default function DepositPage() {
  const navigate = useNavigate();
  const [showPayment, setShowPayment] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'alipay' | 'wechat'>('alipay');
  const [paymentMode, setPaymentMode] = useState<'auto' | 'manual'>('auto'); // 新增：支付模式
  const [uploadedProof, setUploadedProof] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [depositStatus, setDepositStatus] = useState<{status: string; admin_note?: string} | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false); // 新增：创建订单中

  // 加载用户的保证金状态
  useEffect(() => {
    loadDepositStatus();
    
    // 检查是否有待确认的订单（从支付页面返回）
    const pendingOrderId = localStorage.getItem('pending_order_id');
    if (pendingOrderId) {
      checkPaymentStatus(pendingOrderId);
    }
    
    // 每30秒自动检查一次审核状态
    const interval = setInterval(loadDepositStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // 检查支付订单状态
  const checkPaymentStatus = async (orderId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/payment/status?orderId=${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success && result.status === 'paid') {
          // 支付成功，清除待确认订单
          localStorage.removeItem('pending_order_id');
          // 重新加载保证金状态
          await loadDepositStatus();
        }
      }
    } catch (err) {
      // ignored
    }
  };

  const loadDepositStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoadingStatus(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/users/my-deposit`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          setDepositStatus({
            status: result.data.status,
            admin_note: result.data.admin_note
          });
        }
      }
    } catch (err) {
      // ignored
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB');
      return;
    }

    setUploadedProof(file);
  };

  const handleSubmitPayment = async () => {
    if (!uploadedProof) {
      alert('请先上传支付凭证');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('proof', uploadedProof);
      formData.append('amount', String(DEPOSIT_RULES.amount));

      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/deposit/upload-proof`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          alert('支付凭证已提交，管理员将在24小时内审核');
          // 重新加载状态
          await loadDepositStatus();
          setShowPayment(false);
          setUploadedProof(null);
        } else {
          alert(result.message || '提交失败');
        }
      } else {
        alert('提交失败，请重试');
      }
    } catch (err) {
      alert('网络错误，请检查网络连接');
    } finally {
      setUploading(false);
    }
  };

  // 新增：自动支付
  const handleAutoPayment = async () => {
    setCreatingOrder(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/payment/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          channel: selectedMethod,
          amount: DEPOSIT_RULES.amount
        })
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success && result.payUrl) {
          // 保存订单号，用于支付成功后查询
          localStorage.setItem('pending_order_id', result.orderId);
          // 跳转到支付页面
          window.location.href = result.payUrl;
        } else {
          alert(result.message || '创建订单失败');
        }
      } else {
        const error = await res.json();
        alert(error.message || '创建订单失败');
      }
    } catch (err) {
      alert('网络错误，请检查网络连接');
    } finally {
      setCreatingOrder(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#FAF6F1' }}>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="p-2 rounded-lg hover:bg-orange-50" style={{ color: '#B5A698' }}>
            <ArrowLeft size={18} />
          </Link>
          <Shield size={16} style={{ color: '#6BAF7D' }} />
          <h1 className="text-lg font-medium" style={{ color: '#3D2E20' }}>保证金制度</h1>
        </div>

        {/* Why */}
        <div className="rounded-xl p-4 mb-4" style={{ background: 'linear-gradient(135deg, rgba(232,122,93,0.04), #FFFDF9)', border: '1px solid #F5D0C4' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={15} style={{ color: '#E87A5D' }} />
            <span className="text-sm font-medium" style={{ color: '#E87A5D' }}>为什么需要保证金？</span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: '#8B7B6B' }}>
            防止数据造假。比如有人身高150cm，却填写180cm。没有约束，线上信息就不可信。保证金是一个简单的约束机制——你造假，押金就没了。
          </p>
        </div>

        {/* 缴纳规则 */}
        <div className="rounded-xl p-4 mb-4" style={{ background: '#FFFDF9', border: '1px solid #F0E4D4' }}>
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={15} style={{ color: '#6BAF7D' }} />
            <span className="text-sm font-medium" style={{ color: '#6BAF7D' }}>缴纳规则</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: '#8B7B6B' }}>保证金金额</span>
              <span className="text-lg font-bold" style={{ color: '#E87A5D' }}>{DEPOSIT_RULES.amount} 元</span>
            </div>
            <div className="text-xs text-center py-2 rounded-lg" style={{ background: 'rgba(107,175,125,0.08)', color: '#6BAF7D' }}>
              不到一杯奶茶钱，放心交友
            </div>
          </div>
        </div>

        {/* 分配方案 */}
        <div className="rounded-xl p-4 mb-4" style={{ background: '#FFFDF9', border: '1px solid #F0E4D4' }}>
          <div className="flex items-center gap-2 mb-3">
            <Users size={15} style={{ color: '#6BAF7D' }} />
            <span className="text-sm font-medium" style={{ color: '#6BAF7D' }}>29.9元分配方案</span>
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid #F5EDE3' }}>
              <span style={{ color: '#8B7B6B' }}>平台运营费（固定）</span>
              <span style={{ color: '#3D2E20', fontWeight: 'bold', fontSize: '14px' }}>{DEPOSIT_RULES.platformFee} 元</span>
            </div>
            <div className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid #F5EDE3' }}>
              <span style={{ color: '#8B7B6B' }}>甲方感情损失费</span>
              <span style={{ color: '#C4515C', fontWeight: 'bold', fontSize: '14px' }}>{DEPOSIT_RULES.emotionalDamage} 元</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span style={{ color: '#8B7B6B' }}>乙方删除数据可退还</span>
              <span style={{ color: '#6BAF7D', fontWeight: 'bold', fontSize: '14px' }}>{DEPOSIT_RULES.deleteRefund} 元</span>
            </div>
          </div>
        </div>

        {/* 两种情况 */}
        <div className="rounded-xl p-4 mb-4" style={{ background: '#FFFDF9', border: '1px solid #F0E4D4' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertOctagon size={15} style={{ color: '#C4515C' }} />
            <span className="text-sm font-medium" style={{ color: '#C4515C' }}>两种情况</span>
          </div>
          
          {/* 情况1：乙方造假 */}
          <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(196,81,92,0.05)' }}>
            <div className="text-xs font-medium mb-2" style={{ color: '#C4515C' }}>👉 情况1：乙方造假</div>
            <div className="space-y-1.5 text-xs" style={{ color: '#8B7B6B' }}>
              <div>• 甲方投诉并上传证据</div>
              <div>• 平台核实属实后</div>
              <div>• <span style={{ color: '#6BAF7D', fontWeight: 'bold' }}>甲方获得感情损失费 {DEPOSIT_RULES.emotionalDamage} 元</span></div>
              <div>• <span style={{ color: '#3D2E20', fontWeight: 'bold' }}>平台收取运营费 {DEPOSIT_RULES.platformFee} 元</span></div>
              <div>• <span style={{ color: '#E87A5D', fontWeight: 'bold' }}>乙方删除数据可退还 {DEPOSIT_RULES.deleteRefund} 元</span></div>
            </div>
          </div>
          
          {/* 情况2：乙方没欺骗 */}
          <div className="p-3 rounded-lg" style={{ background: 'rgba(107,175,125,0.05)' }}>
            <div className="text-xs font-medium mb-2" style={{ color: '#6BAF7D' }}>✅ 情况2：乙方没欺骗</div>
            <div className="space-y-1.5 text-xs" style={{ color: '#8B7B6B' }}>
              <div>• <span style={{ color: '#3D2E20', fontWeight: 'bold' }}>平台运营费 {DEPOSIT_RULES.platformFee} 元不变</span></div>
              <div>• <span style={{ color: '#6BAF7D', fontWeight: 'bold' }}>甲方获得退还 20 元</span></div>
              <div>• 大家好聚好散~</div>
            </div>
          </div>
        </div>

        {/* 退回规则 */}
        <div className="rounded-xl p-4 mb-4" style={{ background: '#FFFDF9', border: '1px solid #F0E4D4' }}>
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw size={15} style={{ color: '#6BAF7D' }} />
            <span className="text-sm font-medium" style={{ color: '#6BAF7D' }}>退回规则</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #F5EDE3' }}>
              <span style={{ color: '#8B7B6B' }}>主动删除自己的数据</span>
              <span style={{ color: '#6BAF7D', fontWeight: 'bold' }}>退还 {DEPOSIT_RULES.deleteRefund} 元</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span style={{ color: '#8B7B6B' }}>未被投诉且数据真实</span>
              <span style={{ color: '#6BAF7D', fontWeight: 'bold' }}>随时可申请全额退还</span>
            </div>
          </div>
        </div>

        {/* 真实案例 */}
        <div className="rounded-xl p-4 mb-4" style={{ background: '#FFFDF9', border: '1px solid #F0E4D4' }}>
          <div className="flex items-center gap-2 mb-2">
            <FileCheck size={15} style={{ color: '#E87A5D' }} />
            <span className="text-sm font-medium" style={{ color: '#E87A5D' }}>真实案例</span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: '#8B7B6B' }}>
            小王在表格里填"身高180cm"，小李见面后发现他实际只有165cm。小李发起投诉，上传见面照片证据。平台核实后：小李获得<span style={{ color: '#6BAF7D', fontWeight: 'bold' }}>{DEPOSIT_RULES.emotionalDamage}元</span>感情损失费，平台收取<span style={{ color: '#3D2E20', fontWeight: 'bold' }}>{DEPOSIT_RULES.platformFee}元</span>运营费，小王删除数据后可拿回<span style={{ color: '#E87A5D', fontWeight: 'bold' }}>{DEPOSIT_RULES.deleteRefund}元</span>。
          </p>
        </div>

        {/* 投诉流程 */}
        <div className="rounded-xl p-4 mb-4" style={{ background: '#FFFDF9', border: '1px solid #F0E4D4' }}>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={15} style={{ color: '#6BAF7D' }} />
            <span className="text-sm font-medium" style={{ color: '#6BAF7D' }}>投诉流程</span>
          </div>
          <div className="space-y-3">
            {[
              '见面后发现对方信息造假',
              '在对方资料页点击"投诉"按钮',
              '上传证据（照片/聊天记录等）',
              '平台24小时内核实',
              '核实属实，押金自动分配',
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5"
                  style={{ background: 'linear-gradient(135deg, #6BAF7D, #5A9F6D)', color: '#FFF' }}>{i + 1}</div>
                <span className="text-xs pt-0.5" style={{ color: '#8B7B6B' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 常见问题 */}
        <div className="rounded-xl p-4 mb-4" style={{ background: '#FFFDF9', border: '1px solid #F0E4D4' }}>
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle size={15} style={{ color: '#6BAF7D' }} />
            <span className="text-sm font-medium" style={{ color: '#6BAF7D' }}>常见问题</span>
          </div>
          <div className="space-y-3 text-xs" style={{ color: '#8B7B6B' }}>
            <div>
              <span style={{ color: '#3D2E20', fontWeight: 'medium' }}>Q：</span>
              <span>保证金多久能退回？</span>
            </div>
            <div className="pl-4">
              <span style={{ color: '#6BAF7D' }}>A：</span>
              <span>删除资料后立即原路退回。</span>
            </div>
            <div>
              <span style={{ color: '#3D2E20', fontWeight: 'medium' }}>Q：</span>
              <span>什么情况算造假？</span>
            </div>
            <div className="pl-4">
              <span style={{ color: '#6BAF7D' }}>A：</span>
              <span>身高/年龄/学历等关键信息与实际不符。</span>
            </div>
            <div>
              <span style={{ color: '#3D2E20', fontWeight: 'medium' }}>Q：</span>
              <span>被投诉后还能退钱吗？</span>
            </div>
            <div className="pl-4">
              <span style={{ color: '#6BAF7D' }}>A：</span>
              <span>删除自己的数据可退回{DEPOSIT_RULES.deleteRefund}元。</span>
            </div>
          </div>
        </div>

        {/* 恶意投诉 */}
        <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(196,81,92,0.03)', border: '1px solid #F0D0D4' }}>
          <div className="flex items-center gap-2 mb-2">
            <Ban size={15} style={{ color: '#C4515C' }} />
            <span className="text-sm font-medium" style={{ color: '#C4515C' }}>恶意投诉</span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: '#8B7B6B' }}>
            如果发现恶意投诉（见面没问题却故意投诉），平台有权驳回投诉，并对投诉方进行警告。多次恶意投诉者将被封禁。
          </p>
        </div>

        {/* 保证金状态显示 */}
        {!loadingStatus && depositStatus && (
          <div className="rounded-xl p-4 mb-4" style={{ 
            background: depositStatus.status === 'approved' ? 'rgba(107,175,125,0.08)' : 
                       depositStatus.status === 'rejected' ? 'rgba(196,81,92,0.05)' : 
                       'rgba(232,122,93,0.05)',
            border: depositStatus.status === 'approved' ? '1px solid #A5D6A7' : 
                   depositStatus.status === 'rejected' ? '1px solid #FFCDD2' : 
                   '1px solid #F5D0C4'
          }}>
            <div className="flex items-center gap-2 mb-2">
              {depositStatus.status === 'approved' ? (
                <CheckCircle size={15} style={{ color: '#6BAF7D' }} />
              ) : depositStatus.status === 'rejected' ? (
                <AlertTriangle size={15} style={{ color: '#C4515C' }} />
              ) : (
                <Clock size={15} style={{ color: '#E87A5D' }} />
              )}
              <span className="text-sm font-medium" style={{ 
                color: depositStatus.status === 'approved' ? '#6BAF7D' : 
                       depositStatus.status === 'rejected' ? '#C4515C' : '#E87A5D'
              }}>
                {depositStatus.status === 'approved' ? '保证金已缴纳' : 
                 depositStatus.status === 'rejected' ? '审核未通过' : '审核中'}
              </span>
            </div>
            {depositStatus.admin_note && (
              <p className="text-xs mt-1" style={{ color: '#8B7B6B' }}>
                备注：{depositStatus.admin_note}
              </p>
            )}
            {depositStatus.status === 'approved' && (
              <p className="text-xs mt-2" style={{ color: '#6BAF7D' }}>
                ✓ 您已获得完整浏览权限，可以查看所有用户联系方式
              </p>
            )}
            {depositStatus.status === 'rejected' && (
              <div className="mt-3">
                <button 
                  onClick={() => setShowPayment(true)}
                  className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #E87A5D, #D96A4D)' }}
                >
                  重新上传凭证
                </button>
              </div>
            )}
          </div>
        )}

        {/* 支付入口 */}
        <div className="rounded-xl p-4 mb-6" style={{ background: 'linear-gradient(135deg, rgba(232,122,93,0.08), rgba(217,106,77,0.05))', border: '1px solid #F5D0C4' }}>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={15} style={{ color: '#E87A5D' }} />
            <span className="text-sm font-medium" style={{ color: '#E87A5D' }}>缴纳保证金</span>
          </div>
          <p className="text-xs mb-3" style={{ color: '#8B7B6B' }}>
            支付 {DEPOSIT_RULES.amount} 元，支付成功后自动解锁联系方式，无需等待审核
          </p>
          <button 
            onClick={() => setShowPayment(true)}
            className="w-full py-3 rounded-xl text-sm font-medium text-white transition-all flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #E87A5D, #D96A4D)', boxShadow: '0 2px 12px rgba(232,122,93,0.2)' }}
          >
            <Zap size={16} /> 立即支付
          </button>
        </div>

        {/* 支付弹窗 */}
        {showPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowPayment(false)}>
            <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#FFFDF9' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: '#3D2E20' }}>缴纳保证金</h3>
                <button onClick={() => setShowPayment(false)} className="p-2 rounded-lg" style={{ color: '#9B8B7B' }}>
                  <ArrowLeft size={20} />
                </button>
              </div>

              {/* 支付模式选择 */}
              <div className="flex gap-2 mb-4 p-1 rounded-xl" style={{ background: 'rgba(232,122,93,0.05)' }}>
                <button
                  onClick={() => setPaymentMode('auto')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                    paymentMode === 'auto' 
                      ? 'text-white shadow' 
                      : 'text-gray-600 hover:bg-white/50'
                  }`}
                  style={paymentMode === 'auto' ? { background: 'linear-gradient(135deg, #E87A5D, #D96A4D)' } : {}}
                >
                  <Zap size={14} /> 自动支付
                </button>
                <button
                  onClick={() => setPaymentMode('manual')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                    paymentMode === 'manual' 
                      ? 'text-white shadow' 
                      : 'text-gray-600 hover:bg-white/50'
                  }`}
                  style={paymentMode === 'manual' ? { background: 'linear-gradient(135deg, #E87A5D, #D96A4D)' } : {}}
                >
                  <Upload size={14} /> 手动上传
                </button>
              </div>

              {/* 支付方式选择 */}
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => setSelectedMethod('alipay')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    selectedMethod === 'alipay' 
                      ? 'text-white shadow-lg' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={selectedMethod === 'alipay' ? { background: 'linear-gradient(135deg, #1677FF, #0958D9)' } : {}}
                >
                  <span>支付宝</span>
                </button>
                <button
                  onClick={() => setSelectedMethod('wechat')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    selectedMethod === 'wechat' 
                      ? 'text-white shadow-lg' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={selectedMethod === 'wechat' ? { background: 'linear-gradient(135deg, #07C160, #06AD56)' } : {}}
                >
                  <span>微信</span>
                </button>
              </div>

              {/* 自动支付模式 */}
              {paymentMode === 'auto' && (
                <>
                  <div className="bg-white rounded-xl p-4 mb-4 text-center" style={{ border: '1px solid #F0E4D4' }}>
                    <p className="text-sm mb-2" style={{ color: '#3D2E20' }}>
                      点击下方按钮，跳转到{selectedMethod === 'alipay' ? '支付宝' : '微信'}完成支付
                    </p>
                    <p className="text-lg font-bold" style={{ color: '#E87A5D' }}>
                      ¥{DEPOSIT_RULES.amount}
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#9B8B7B' }}>
                      支付成功后自动解锁，无需等待审核
                    </p>
                  </div>
                  <button 
                    onClick={handleAutoPayment}
                    disabled={creatingOrder}
                    className="w-full py-3 rounded-xl text-sm font-medium text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: selectedMethod === 'alipay' ? 'linear-gradient(135deg, #1677FF, #0958D9)' : 'linear-gradient(135deg, #07C160, #06AD56)' }}
                  >
                    {creatingOrder ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        创建订单中...
                      </>
                    ) : (
                      <>
                        <Zap size={16} /> 立即支付 ¥{DEPOSIT_RULES.amount}
                      </>
                    )}
                  </button>
                </>
              )}

              {/* 手动上传模式 */}
              {paymentMode === 'manual' && (
                <>
                  {/* 收款码 */}
                  <div className="bg-white rounded-xl p-4 mb-4 border-2 border-dashed" style={{ borderColor: '#F0E4D4' }}>
                    <div className="aspect-square w-full max-w-[280px] mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                      <img 
                        src={`${getBasePath()}/${selectedMethod}-qr.png`} 
                        alt={`${selectedMethod === 'alipay' ? '支付宝' : '微信'}收款码`}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const methodName = selectedMethod === 'alipay' ? '支付宝' : '微信';
                          e.currentTarget.parentElement!.innerHTML = `<div class="text-center text-gray-400"><p class="text-sm mb-2">${methodName}收款码加载中...</p><p class="text-xs">请联系管理员获取</p></div>`;
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium mb-1" style={{ color: '#3D2E20' }}>
                        扫码支付 {DEPOSIT_RULES.amount} 元
                      </p>
                      <p className="text-xs" style={{ color: '#9B8B7B' }}>
                        使用{selectedMethod === 'alipay' ? '支付宝' : '微信'}扫一扫
                      </p>
                    </div>
                  </div>

                  {/* 上传凭证 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2" style={{ color: '#3D2E20' }}>
                      上传支付凭证 <span style={{ color: '#E87A5D' }}>*</span>
                    </label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleUploadProof}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: '#E8DED0' }}
                    />
                    {uploadedProof && (
                      <div className="mt-2 text-xs flex items-center gap-2" style={{ color: '#6BAF7D' }}>
                        <CheckCircle size={14} />
                        <span>已选择: {uploadedProof.name}</span>
                      </div>
                    )}
                  </div>

                  {/* 提交按钮 */}
                  <button 
                    onClick={handleSubmitPayment}
                    disabled={!uploadedProof || uploading}
                    className="w-full py-3 rounded-xl text-sm font-medium text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #E87A5D, #D96A4D)' }}
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        提交中...
                      </>
                    ) : (
                      <>
                        <Upload size={16} /> 提交凭证
                      </>
                    )}
                  </button>

                  <p className="text-xs mt-3 text-center" style={{ color: '#9B8B7B' }}>
                    管理员将在24小时内审核，审核结果将通知您
                  </p>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
