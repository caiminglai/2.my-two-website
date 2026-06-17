import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Heart, Eye, EyeOff, User, Lock, Phone } from 'lucide-react';
import { API_BASE_URL } from '../api/config';
import SliderCaptcha from '../components/SliderCaptcha';

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    phone: string;
    nickname: string;
  };
  message?: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaKey, setCaptchaKey] = useState(0);

  const handleCaptchaVerified = (id: string, token: string) => {
    setCaptchaId(id);
    setCaptchaToken(token);
  };

  const resetCaptcha = () => {
    setCaptchaId('');
    setCaptchaToken('');
    setCaptchaKey(k => k + 1);
  };

  const handleSubmit = async () => {
    setError('');

    if (!phone || phone.length !== 11) {
      setError('请输入11位手机号');
      return;
    }

    if (!password || password.length < 6) {
      setError('密码至少6位');
      return;
    }

    if (!isLogin) {
      if (password !== confirmPassword) {
        setError('两次密码不一致');
        return;
      }
      if (!nickname || nickname.trim().length === 0) {
        setError('请输入昵称');
        return;
      }
      if (!captchaId || !captchaToken) {
        setError('请先完成滑动验证');
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const body = isLogin
        ? { phone, password }
        : { phone, password, nickname, captchaId, captchaToken };

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data: LoginResponse = await res.json();

      if (data.success && data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_id', data.user?.id || '');
        localStorage.setItem('user_phone', data.user?.phone || '');
        localStorage.setItem('user_nickname', data.user?.nickname || '');
        window.dispatchEvent(new Event('user-login'));
        navigate('/');
      } else {
        setError(data.message || (isLogin ? '登录失败' : '注册失败'));
      }
    } catch (e) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAF6F1' }}>
      <div className="max-w-md mx-auto w-full px-4 pt-6">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="p-2 rounded-lg hover:bg-orange-50" style={{ color: '#B5A698' }}>
            <ArrowLeft size={18} />
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #E87A5D, #D96A4D)', boxShadow: '0 4px 16px rgba(232,122,93,0.3)' }}>
            <Heart size={24} color="white" fill="white" />
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: '#3D2E20' }}>
            {isLogin ? '欢迎回来' : '加入我们'}
          </h1>
          <p className="text-sm mt-2" style={{ color: '#8B7B6B' }}>
            {isLogin ? '登录后享受更多功能' : '创建账户，开始精准匹配'}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: '#8B7B6B' }}>手机号</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#B5A698' }} />
              <input
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                style={{ background: '#F5EDE3', border: '1px solid #E8DED0', color: '#3D2E20', outline: 'none' }}
                type="tel"
                placeholder="请输入手机号"
                maxLength={11}
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: '#8B7B6B' }}>昵称</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#B5A698' }} />
                <input
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                  style={{ background: '#F5EDE3', border: '1px solid #E8DED0', color: '#3D2E20', outline: 'none' }}
                  type="text"
                  placeholder="请输入昵称"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs mb-1.5 block" style={{ color: '#8B7B6B' }}>密码</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#B5A698' }} />
              <input
                className="w-full pl-10 pr-10 py-3 rounded-xl text-sm"
                style={{ background: '#F5EDE3', border: '1px solid #E8DED0', color: '#3D2E20', outline: 'none' }}
                type={showPassword ? 'text' : 'password'}
                placeholder="请输入密码"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: '#B5A698' }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: '#8B7B6B' }}>确认密码</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#B5A698' }} />
                <input
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                  style={{ background: '#F5EDE3', border: '1px solid #E8DED0', color: '#3D2E20', outline: 'none' }}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请再次输入密码"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl text-sm text-center" style={{ background: 'rgba(232,122,93,0.08)', color: '#E87A5D', border: '1px solid #F5D0C4' }}>
              {error}
            </div>
          )}

          {!isLogin && (
            <SliderCaptcha
              key={captchaKey}
              onVerified={handleCaptchaVerified}
              onReset={resetCaptcha}
            />
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #E87A5D, #D96A4D)', boxShadow: '0 2px 12px rgba(232,122,93,0.2)' }}
          >
            {loading ? '处理中...' : (isLogin ? '登 录' : '注 册')}
          </button>

          <div className="text-center pt-2">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); resetCaptcha(); }}
              className="text-sm"
              style={{ color: '#E87A5D' }}
            >
              {isLogin ? '还没有账号？立即注册' : '已有账号？立即登录'}
            </button>
          </div>

          <div className="text-center pt-4">
            <Link to="/" className="text-xs" style={{ color: '#B5A698' }}>
              游客模式继续浏览
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-auto pb-8 text-center">
        <p className="text-xs" style={{ color: '#D4C8B8' }}>
          登录即表示同意我们的服务条款和隐私政策
        </p>
      </div>
    </div>
  );
}
