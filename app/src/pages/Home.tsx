import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Search, X, ChevronDown, Plus, Shield, Trash2, Heart,
  QrCode, Rocket, Users, Sparkles, Target, Users2, User, LogIn, MapPin, Check, Star, Flag, MessageCircle,
  Zap, Upload, CheckCircle, ArrowLeft
} from 'lucide-react';
import { loadRows, deleteRow, loadColumns } from '../services/user.service';
import { matchRows } from '../services/match.service';
import { CATEGORIES, FIELD_LABELS, PURPOSE_OPTIONS } from '../data/constants';
import type { Column, MatchCondition, Row } from '../data/types';
import { API_BASE_URL, API_ENDPOINTS, normalizeAvatarUrl } from '../api/config';
import ImagePreview from '../components/ImagePreview';
import UserCard, { maskContact } from '../components/UserCard';
import DetailModal from '../components/DetailModal';
import RatingModal from '../components/RatingModal';
import ReportModal from '../components/ReportModal';
import { handleApiError } from '../utils/errorHandler';

const QUICK_TAGS = [
  { label: '女', key: 'gender', value: '女' },
  { label: '男', key: 'gender', value: '男' },
  { label: '西安', key: 'city', value: '西安' },
  { label: '北京', key: 'city', value: '北京' },
  { label: '上海', key: 'city', value: '上海' },
  { label: '杭州', key: 'city', value: '杭州' },
  { label: '深圳', key: 'city', value: '深圳' },
  { label: '成都', key: 'city', value: '成都' },
  { label: '火锅', key: 'food', value: '火锅' },
  { label: '烧烤', key: 'food', value: '烧烤' },
  { label: '日料', key: 'food', value: '日料' },
  { label: '动漫', key: 'hobbies', value: '动漫' },
  { label: '游戏', key: 'hobbies', value: '游戏' },
  { label: '摄影', key: 'hobbies', value: '摄影' },
  { label: '旅行', key: 'hobbies', value: '旅行' },
  { label: '跑步', key: 'sport', value: '跑步' },
  { label: '游泳', key: 'sport', value: '游泳' },
  { label: '篮球', key: 'sport', value: '篮球' },
  { label: '健身', key: 'sport', value: '健身' },
  { label: '音乐', key: 'music', value: '音乐' },
  { label: '民谣', key: 'music', value: '民谣' },
  { label: '流行', key: 'music', value: '流行' },
];

const PURPOSE_ICONS: Record<string, typeof Users> = {
  '相亲交友': Heart,
  '拓展圈子': Users,
  '兴趣交流': Sparkles,
  '运动伙伴': Target,
  '学习搭子': Users2,
  '同城活动': Users,
  '寻找知己': Sparkles,
  '人生伴侣': Heart,
  '恋爱结婚': Heart,
  '先交朋友': Users,
  '找个伴': Users,
  '同城约会': Heart,
  '周末玩伴': Users,
  '一起旅行': MapPin,
  '一起运动': Target,
  '一起学习': Users2,
  '一起吃饭': User,
  '一起看电影': User,
  '一起打游戏': User,
  '一起健身': Target,
};

export default function Home() {
  const navigate = useNavigate();
  const [columns, setColumns] = useState<Column[]>(loadColumns);
  const [rows, setRows] = useState<Row[]>(() => loadRows());
  const [selectedPurpose, setSelectedPurpose] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // 分页相关状态（必须在 loadUsers 函数之前定义）
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50; // 每页50条
  const [totalPages, setTotalPages] = useState(1); // 总页数
  const [totalCount, setTotalCount] = useState(0); // 总人数
  const [loadingPage, setLoadingPage] = useState(false); // 是否正在翻页
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 搜索相关状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchExact, setSearchExact] = useState(false);
  const [activeSearchKeyword, setActiveSearchKeyword] = useState('');
  const [activeSearchExact, setActiveSearchExact] = useState(false);

  // 构造 API URL
  const buildApiUrl = (page: number, keyword: string, exact: boolean) => {
    let url = `${API_BASE_URL}/users?page=${page}&limit=${pageSize}`;
    if (keyword.trim()) {
      url += `&keyword=${encodeURIComponent(keyword.trim())}&exact=${exact ? 'true' : 'false'}`;
    }
    return url;
  };

  // 加载用户数据（支持分页 + 搜索）
  const loadUsers = async (page: number, keyword: string = activeSearchKeyword, exact: boolean = activeSearchExact) => {
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingPage(true);
    }
    setError(null);
    
    try {
      const res = await fetch(buildApiUrl(page, keyword, exact));
      const data = await res.json();
      if (data.success && data.data) {
        setRows(data.data);
        setCurrentPage(page);
        setActiveSearchKeyword(keyword);
        setActiveSearchExact(exact);
        // 支持后端返回的 total / totalPages 字段
        if (typeof data.total === 'number') {
          setTotalCount(data.total);
          setTotalPages(Math.max(1, Math.ceil(data.total / pageSize)));
        } else if (typeof data.totalPages === 'number') {
          setTotalPages(data.totalPages);
          setTotalCount(data.totalPages * pageSize);
        } else {
          // 根据返回数据量判断是否还有下一页
          setTotalPages(data.data.length >= pageSize ? page : page);
          setTotalCount(data.data.length);
        }
      } else {
        setError('加载数据失败');
      }
    } catch (err) {
      handleApiError(err, '网络错误，请刷新页面重试');
      setError('网络错误，请刷新页面重试');
    } finally {
      setLoading(false);
      setLoadingPage(false);
    }
  };

  // 执行搜索
  const handleSearch = () => {
    setHasSearched(false);
    setConditions([{ column: '', value: '' }]);
    loadUsers(1, searchKeyword, searchExact);
  };

  // 重置搜索
  const handleResetSearch = () => {
    setSearchKeyword('');
    setSearchExact(false);
    setHasSearched(false);
    setConditions([{ column: '', value: '' }]);
    setActiveSearchKeyword('');
    setActiveSearchExact(false);
    loadUsers(1, '', false);
  };

  // 上一页
  const goPrevPage = () => {
    if (currentPage > 1 && !loadingPage) {
      loadUsers(currentPage - 1, activeSearchKeyword, activeSearchExact);
    }
  };

  // 下一页
  const goNextPage = () => {
    if (currentPage < totalPages && !loadingPage) {
      loadUsers(currentPage + 1, activeSearchKeyword, activeSearchExact);
    }
  };

  // 初始加载
  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    setCurrentUserId(userId);
    loadUsers(1, '', false);
  }, []);



  const [conditions, setConditions] = useState<MatchCondition[]>(() => {
    const saved = localStorage.getItem('match_conditions');
    return saved ? JSON.parse(saved) : [{ column: '', value: '' }];
  });
  const [hasSearched, setHasSearched] = useState(false);
  const [showFieldDrop, setShowFieldDrop] = useState<number | null>(null);
  const [showValueDrop, setShowValueDrop] = useState<number | null>(null);
  const [showAddCol, setShowAddCol] = useState(false);
  const [newColKey, setNewColKey] = useState('');
  const [newColLabel, setNewColLabel] = useState('');
  const [showDelModal, setShowDelModal] = useState(false);
  const [selRowId, setSelRowId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('match_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showSelectMode, setShowSelectMode] = useState(false);
  const [swipeRowId, setSwipeRowId] = useState<string | null>(null);
  const [debouncedConditions, setDebouncedConditions] = useState<MatchCondition[]>(conditions);
  const [showRatingModal, setShowRatingModal] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payContactTarget, setPayContactTarget] = useState<string | null>(null);
  const [contactPayMode, setContactPayMode] = useState<'auto' | 'manual'>('auto');
  const [contactPayMethod, setContactPayMethod] = useState<'alipay' | 'wechat'>('alipay');
  const [contactProofFile, setContactProofFile] = useState<File | null>(null);
  const [contactProofUploading, setContactProofUploading] = useState(false);
  const [contactPayStatus, setContactPayStatus] = useState<string>('');
  const VIEW_CONTACT_AMOUNT = 9.9;
  const [showReportModal, setShowReportModal] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [reportType, setReportType] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportProofImage, setReportProofImage] = useState<File | null>(null);
  const [ratings, setRatings] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState<{ avg: number; count: number } | null>(null);
  const [contactUnlocked, setContactUnlocked] = useState(false);
  const [checkingUnlock, setCheckingUnlock] = useState(false);
  const [fullContact, setFullContact] = useState<string | null>(null); // 完整联系方式（解锁后从后端获取）
  const dropRef = useRef<HTMLDivElement>(null);

  // ============ 查看联系方式支付功能 ============
  const handleContactAutoPay = async () => {
    // 预留接口：调用后端 /api/payments/view-contact 创建自动支付订单
    if (!payContactTarget) return;
    setContactPayStatus('正在创建支付订单...');
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/payments/view-contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          target_user_id: payContactTarget,
          method: contactPayMethod,
          amount: VIEW_CONTACT_AMOUNT
        })
      });
      const data = await res.json();
      if (data.success && data.payment_url) {
        window.open(data.payment_url, '_blank');
        setContactPayStatus('支付完成后将自动解锁，如未解锁请刷新页面');
      } else {
        setContactPayStatus(data.message || '支付功能暂未开通，请使用手动上传凭证');
        setTimeout(() => setContactPayStatus(''), 3000);
      }
    } catch (e) {
      setContactPayStatus('网络错误，请使用手动上传凭证');
      setTimeout(() => setContactPayStatus(''), 3000);
    }
  };

  const handleContactProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setContactProofFile(file);
  };

  const handleContactSubmitProof = async () => {
    if (!contactProofFile || !payContactTarget) return;
    setContactProofUploading(true);
    setContactPayStatus('提交中...');
    try {
      const formData = new FormData();
      formData.append('proof', contactProofFile);
      formData.append('target_user_id', payContactTarget);
      formData.append('amount', String(VIEW_CONTACT_AMOUNT));
      formData.append('method', contactPayMethod);

      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/unlock-contact/submit`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setContactPayStatus('凭证提交成功，管理员将在24小时内审核');
        setContactProofFile(null);
        setTimeout(() => {
          setContactPayStatus('');
          setShowPayModal(false);
        }, 2500);
      } else {
        setContactPayStatus(data.message || '提交失败');
      }
    } catch (e) {
      setContactPayStatus('提交失败，请重试');
    } finally {
      setContactProofUploading(false);
    }
  };

  // 搜索防抖：conditions变化后300ms才更新debouncedConditions
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedConditions(conditions);
    }, 300);
    return () => clearTimeout(timer);
  }, [conditions]);

  useEffect(() => {
    localStorage.setItem('match_conditions', JSON.stringify(conditions));
  }, [conditions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [hasSearched, selectedPurpose]);

  useEffect(() => {
    localStorage.setItem('match_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // 检查联系方式解锁状态
  useEffect(() => {
    if (showDetail && currentUserId) {
      setContactUnlocked(false);
      setFullContact(null);
      setCheckingUnlock(true);

      const isValidId = /^[a-zA-Z0-9_-]+$/.test(currentUserId) && /^[a-zA-Z0-9_-]+$/.test(showDetail);
      if (!isValidId) {
        setCheckingUnlock(false);
        return;
      }

      fetch(`${API_BASE_URL}/users/${encodeURIComponent(showDetail)}/check-unlock?viewer_id=${encodeURIComponent(currentUserId)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setContactUnlocked(data.unlocked);
            if (data.unlocked && data.contact) {
              setFullContact(data.contact);
            }
          }
        })
        .catch(() => {})
        .finally(() => setCheckingUnlock(false));
    } else {
      setContactUnlocked(false);
      setFullContact(null);
    }
  }, [showDetail, currentUserId]);
  
  const filteredRows = useMemo(() =>
    selectedPurpose
      ? rows.filter(r => r.data?.purpose === selectedPurpose)
      : rows
  , [rows, selectedPurpose]);

  const results = useMemo(() =>
    hasSearched
      ? matchRows(filteredRows, debouncedConditions)
      : filteredRows.map(r => ({ row: r, score: 0, matches: [] as string[] }))
  , [hasSearched, filteredRows, debouncedConditions]);

  // 翻页模式：直接显示所有 results
  const displayResults = useMemo(() => results, [results]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowFieldDrop(null);
        setShowValueDrop(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addCond = useCallback(() => setConditions(p => [...p, { column: '', value: '' }]), []);
  const removeCond = useCallback((i: number) => setConditions(p => p.filter((_, idx) => idx !== i)), []);
  const updateCond = useCallback((i: number, f: 'column' | 'value', v: string) =>
    setConditions(p => p.map((c, idx) => idx === i ? { ...c, [f]: v } : c)), []);
  const clearAll = useCallback(() => { 
    setConditions([{ column: '', value: '' }]); 
    setHasSearched(false); 
    localStorage.removeItem('match_conditions');
  }, []);
  
  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => 
      prev.includes(id) 
        ? prev.filter(fid => fid !== id)
        : [...prev, id]
    );
  }, []);
  
  const toggleSelect = useCallback((id: string) => {
    if (!showSelectMode) {
      setShowSelectMode(true);
    }
    setSelectedRows(prev => 
      prev.includes(id)
        ? prev.filter(sid => sid !== id)
        : [...prev, id]
    );
  }, []);
  
  const exitSelectMode = useCallback(() => {
    setShowSelectMode(false);
    setSelectedRows([]);
  }, []);

  // 获取用户评价
  const loadRatings = useCallback(async (userId: string) => {
    // 验证用户ID格式
    if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
      console.error('Invalid user ID format');
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(userId)}/ratings`);
      if (res.ok) {
        const data = await res.json();
        setRatings(data.ratings || []);
        setAverageRating(data.average || { avg: 0, count: 0 });
      }
    } catch (e) {
      console.error('加载评价失败', e);
    }
  }, []);

  // 提交评价
  const submitRating = useCallback(async (ratedId: string) => {
    // 验证ID格式
    if (!/^[a-zA-Z0-9_-]+$/.test(ratedId)) {
      alert('无效的用户ID');
      return;
    }
    
    const authToken = localStorage.getItem('auth_token');
    if (!authToken) {
      alert('请先登录');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          ratedId,
          rating: ratingValue,
          comment: ratingComment
        })
      });
      if (res.ok) {
        alert('评价成功！');
        setShowRatingModal(null);
        setRatingValue(5);
        setRatingComment('');
        loadRatings(ratedId);
      } else {
        const data = await res.json();
        alert(data.message || '评价失败');
      }
    } catch (e) {
      alert('网络错误');
    }
  }, [ratingValue, ratingComment, loadRatings]);

  // 提交举报
  const submitReport = useCallback(async (reportedId: string) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(reportedId)) {
      alert('无效的用户ID');
      return;
    }
    
    const authToken = localStorage.getItem('auth_token');
    if (!authToken) {
      alert('请先登录');
      return;
    }
    if (!reportType) {
      alert('请选择举报类型');
      return;
    }
    try {
      let res;
      if (reportProofImage) {
        const formData = new FormData();
        formData.append('reportedId', reportedId);
        formData.append('reportType', reportType);
        formData.append('description', reportDescription);
        formData.append('proof', reportProofImage);
        res = await fetch(`${API_BASE_URL}/reports`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: formData
        });
      } else {
        res = await fetch(`${API_BASE_URL}/reports`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            reportedId,
            reportType,
            description: reportDescription
          })
        });
      }
      if (res.ok) {
        alert('举报成功！');
        setShowReportModal(null);
        setReportType('');
        setReportDescription('');
        setReportProofImage(null);
      } else {
        const data = await res.json();
        alert(data.message || '举报失败');
      }
    } catch (e) {
      alert('网络错误');
    }
  }, [reportType, reportDescription, reportProofImage]);

  const handleDeleteRow = async (id: string) => {
    // 验证ID格式
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      alert('无效的用户ID');
      setShowDelModal(false);
      return;
    }
    
    const authToken = localStorage.getItem('auth_token');
    const userId = localStorage.getItem('user_id');
    const row = rows.find(r => r.id === id);

    if (row?.user_id && userId && row.user_id !== userId) {
      alert('只能删除自己的数据');
      setShowDelModal(false);
      return;
    }

    if (authToken && row?.user_id) {
      try {
        const res = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${authToken}` },
        });
        if (res.ok) {
          const next = rows.filter(r => r.id !== id);
          setRows(next);
        } else {
          const data = await res.json();
          alert(data.message || '删除失败');
        }
      } catch (e) {
        alert('网络错误');
      }
    } else {
      const next = deleteRow(id);
      setRows(next);
    }
    setShowDelModal(false);
    setSelRowId(null);
  };

  const deleteSelected = useCallback(() => {
    selectedRows.forEach(id => handleDeleteRow(id));
    exitSelectMode();
  }, [selectedRows, handleDeleteRow, exitSelectMode]);

  const handleAddCol = () => {
    if (!newColKey || !newColLabel) return;
    // 验证列键名格式，防止特殊字符
    if (!/^[a-zA-Z0-9_]+$/.test(newColKey)) {
      alert('列键名只能包含字母、数字和下划线');
      return;
    }
    const next = addColumn(columns, { key: newColKey, label: newColLabel, type: 'text' });
    setColumns(next);
    setNewColKey('');
    setNewColLabel('');
    setShowAddCol(false);
  };

  const quickFilter = (col: string, val: string) => {
    // 验证参数格式
    if (!/^[a-zA-Z0-9_]+$/.test(col)) {
      console.error('Invalid column name');
      return;
    }
    setConditions([{ column: col, value: val }]);
    setHasSearched(true);
  };

  // 自定义筛选条件相关
  const [showCustomFilter, setShowCustomFilter] = useState(false);
  const [customFieldKey, setCustomFieldKey] = useState('');
  const [customFieldValue, setCustomFieldValue] = useState('');
  const [adminCustomFields, setAdminCustomFields] = useState<any[]>([]);

  // 从后端加载管理员定义的常用自定义字段
  useEffect(() => {
    fetch(API_BASE_URL + '/custom-fields')
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setAdminCustomFields(data.data);
        }
      })
      .catch(() => {});
  }, []);

  // 查找字段配置信息（优先从已添加的 columns 中查找，其次从管理员推荐字段中查找）
  const findColumnInfo = useCallback((columnKey: string) => {
    const col = columns.find(c => c.key === columnKey);
    if (col && col.options && col.options.length > 0) {
      return col;
    }
    // 如果 columns 中找不到，尝试从 adminCustomFields 中查找
    const adminField = adminCustomFields.find((f: any) =>
      f.field_key === columnKey || f.field_label === columnKey);
    if (adminField) {
      const opts = adminField.options && Array.isArray(adminField.options) && adminField.options.length > 0
        ? adminField.options
        : [];
      return {
        key: adminField.field_key,
        label: adminField.field_label,
        type: opts.length > 0 ? 'tags' : 'text',
        options: opts,
        category: 'custom'
      };
    }
    return col || null;
  }, [columns, adminCustomFields]);

  const handleAddCustomFilter = () => {
    if (!customFieldKey.trim()) return;
    const rawKey = customFieldKey.trim();
    const cleanKey = rawKey.toLowerCase().replace(/[^a-z0-9_]/g, '') || rawKey;
    // 检查是否是管理员推荐的字段
    const adminField = adminCustomFields.find((f: any) =>
      f.field_label === rawKey || f.field_key === rawKey || f.field_key === cleanKey);
    let finalKey: string;
    let finalLabel: string;
    let finalType: 'text' | 'select' | 'tags' = 'text';
    let finalOptions: string[] = [];

    if (adminField) {
      // 匹配到管理员推荐字段，使用它的 key、label 和 options
      finalKey = adminField.field_key;
      finalLabel = adminField.field_label;
      const opts = adminField.options && Array.isArray(adminField.options) && adminField.options.length > 0
        ? adminField.options
        : [];
      finalType = opts.length > 0 ? 'tags' : 'text';
      finalOptions = opts;
    } else {
      // 没有匹配到管理员字段，使用清理后的 key 和原始输入作为 label
      finalKey = cleanKey;
      finalLabel = rawKey;
      finalType = 'text';
    }

    setConditions(prev => [...prev, { column: finalKey, value: customFieldValue.trim() }]);
    const colExists = columns.some((c: any) => c.key === finalKey);
    if (!colExists) {
      setColumns(prev => [...prev, {
        key: finalKey,
        label: finalLabel,
        type: finalType,
        options: finalOptions,
        category: 'custom'
      }]);
    }
    setCustomFieldKey('');
    setCustomFieldValue('');
    setShowCustomFilter(false);
  };

  const addAdminCustomField = (field: any) => {
    const opts = field.options && Array.isArray(field.options) && field.options.length > 0
      ? field.options
      : [];
    const colExists = columns.some((c: any) => c.key === field.field_key);
    if (!colExists) {
      setColumns(prev => [...prev, {
        key: field.field_key,
        label: field.field_label,
        type: opts.length > 0 ? 'tags' : 'text',
        options: opts,
        category: 'custom'
      }]);
    }
    setConditions(prev => [...prev, { column: field.field_key, value: '' }]);
    setShowCustomFilter(false);
  };

  return (
    <div className="min-h-screen pb-16" style={{ background: 'linear-gradient(180deg, #FFFDF9 0%, #FAF6F1 30%)' }}>
      <div className="max-w-3xl mx-auto px-4 pt-8">

        <div className="relative text-center mb-8 pt-2">
          {/* Decorative circles */}
          <div className="absolute -top-4 -right-8 w-32 h-32 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(232,122,93,0.3) 0%, transparent 70%)' }} />
          <div className="absolute top-8 -left-12 w-24 h-24 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, rgba(107,175,125,0.3) 0%, transparent 70%)' }} />

          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center avatar-gradient"
              style={{ animation: 'float 3s ease-in-out infinite' }}>
              <Heart size={22} color="white" fill="white" />
            </div>
            <h1 className="text-3xl font-bold tracking-wide" style={{ color: '#3D2E20' }}>
              精准匹配
            </h1>
          </div>
          <p className="text-sm" style={{ color: '#9B8B7B' }}>
            精准寻人，精准筛选。不做通讯，只让你相遇。
          </p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(232,122,93,0.06)', color: '#E87A5D', border: '1px solid rgba(232,122,93,0.12)' }}>
              <Sparkles size={10} /> 精准筛选
            </span>
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(107,175,125,0.06)', color: '#6BAF7D', border: '1px solid rgba(107,175,125,0.12)' }}>
              <Shield size={10} /> 保证金保障
            </span>
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(123,140,222,0.06)', color: '#7B8CDE', border: '1px solid rgba(123,140,222,0.12)' }}>
              <Users size={10} /> 圈子匹配
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setSelectedPurpose('')}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              !selectedPurpose
                ? 'btn-primary text-white'
                : 'tag-bubble'
            }`}
          >
            全部
          </button>
          {PURPOSE_OPTIONS.map(purpose => {
            const Icon = PURPOSE_ICONS[purpose] || Users;
            return (
              <button
                key={purpose}
                onClick={() => setSelectedPurpose(purpose)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  selectedPurpose === purpose
                    ? 'btn-primary text-white'
                    : 'tag-bubble'
                }`}
              >
                <Icon size={14} />
                {purpose}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl p-5 mb-5 card-shadow" style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,253,249,0.95) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(240,228,212,0.6)',
        }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(232,122,93,0.1)' }}>
                <Search size={12} style={{ color: '#E87A5D' }} />
              </div>
              <h2 className="text-base font-semibold" style={{ color: '#3D2E20' }}>筛选条件</h2>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={addCond} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg" style={{ color: '#E87A5D', border: '1px solid #F5D0C4' }}>
                <Plus size={12} /> 添加条件
              </button>
              <button onClick={() => { setShowCustomFilter(!showCustomFilter); }}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg" style={{ color: '#6BAF7D', border: '1px solid #D6E8DA' }}>
                <Plus size={12} /> 自定义字段
              </button>
              <button onClick={clearAll} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg" style={{ color: '#B5A698', border: '1px solid #E8DED0' }}>
                <Trash2 size={12} /> 清空
              </button>
            </div>
          </div>

          {/* 搜索框区域（按昵称/姓名/ID） */}
          <div className="mb-4 p-3 rounded-xl" style={{ background: 'rgba(123,140,222,0.06)', border: '1px solid rgba(123,140,222,0.15)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="text"
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{ background: '#FFFDF9', border: '1px solid #E8DED0', color: '#3D2E20', outline: 'none' }}
                placeholder="搜索（按昵称/姓名/ID）"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              />
              <div className="flex items-center gap-2 flex-shrink-0">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none" style={{ color: '#3D2E20' }}>
                  <input
                    type="checkbox"
                    checked={searchExact}
                    onChange={(e) => setSearchExact(e.target.checked)}
                    className="w-4 h-4 accent-orange-500"
                  />
                  精确匹配
                </label>
                <button
                  onClick={handleSearch}
                  className="flex items-center gap-1 text-xs px-3 py-2 rounded-lg text-white font-medium"
                  style={{ background: 'linear-gradient(135deg, #7B8CDE, #5A6DC8)' }}
                >
                  <Search size={12} /> 搜索
                </button>
                <button
                  onClick={handleResetSearch}
                  className="flex items-center gap-1 text-xs px-3 py-2 rounded-lg font-medium"
                  style={{ background: 'rgba(61,46,32,0.06)', color: '#8B7B6B', border: '1px solid #E8DED0' }}
                >
                  <X size={12} /> 重置
                </button>
              </div>
            </div>
            {activeSearchKeyword && (
              <div className="mt-2 text-xs" style={{ color: '#7B8CDE' }}>
                当前搜索：「{activeSearchKeyword}」{activeSearchExact ? '（精确匹配）' : '（模糊匹配）'}
              </div>
            )}
          </div>

          {showCustomFilter && (
            <div className="mb-4 p-3 rounded-xl" style={{ background: 'rgba(107,175,125,0.05)', border: '1px solid rgba(107,175,125,0.15)' }}>
              <div className="text-xs font-medium mb-2" style={{ color: '#6BAF7D' }}>自定义筛选条件</div>
              {adminCustomFields.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs mb-1.5" style={{ color: '#B5A698' }}>管理员推荐字段：</div>
                  <div className="flex flex-wrap gap-1.5">
                    {adminCustomFields.map((f: any) => (
                      <button key={f.id} onClick={() => addAdminCustomField(f)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: 'rgba(107,175,125,0.08)', color: '#6BAF7D', border: '1px solid rgba(107,175,125,0.15)' }}>
                        {f.field_label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input className="px-3 py-1.5 rounded-lg text-xs flex-1" style={{ background: '#F5EDE3', border: '1px solid #E8DED0', color: '#3D2E20', outline: 'none' }} placeholder="字段名（如：星座、宠物、信仰）"
                  value={customFieldKey} onChange={e => setCustomFieldKey(e.target.value)} />
                <input className="px-3 py-1.5 rounded-lg text-xs flex-1" style={{ background: '#F5EDE3', border: '1px solid #E8DED0', color: '#3D2E20', outline: 'none' }} placeholder="筛选值（可留空）"
                  value={customFieldValue} onChange={e => setCustomFieldValue(e.target.value)} />
                <button onClick={handleAddCustomFilter} className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: 'linear-gradient(135deg, #6BAF7D, #4D945F)' }}>添加</button>
              </div>
            </div>
          )}

          <div className="space-y-2.5" ref={dropRef}>
            {conditions.map((cond, i) => {
              const colInfo = findColumnInfo(cond.column);
              const hasOptions = colInfo?.options && colInfo.options.length > 0;
              const isMultiple = colInfo?.type === 'tags';
              const selectedValues = cond.value ? cond.value.split(',') : [];

              return (

              <div key={i} className="flex items-center gap-2">
                <div className="relative flex-shrink-0" style={{ width: '130px' }}>
                  <button onClick={() => setShowFieldDrop(showFieldDrop === i ? null : i)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm"
                    style={{ background: '#F5EDE3', border: '1px solid #E8DED0', color: '#3D2E20' }}>
                    <span>{FIELD_LABELS[cond.column] || colInfo?.label || '选择字段'}</span>
                    <ChevronDown size={13} style={{ color: '#B5A698' }} />
                  </button>
                  {showFieldDrop === i && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 py-2 max-h-64 overflow-y-auto rounded-lg"
                      style={{ background: '#FFFDF9', border: '1px solid #E8DED0', boxShadow: '0 8px 24px rgba(61,46,32,0.12)' }}>
                      {CATEGORIES.map(cat => (
                        <div key={cat.key}>
                          <div className="px-3 py-1 text-xs font-medium" style={{ color: '#B5A698' }}>{cat.label}</div>
                          {columns.filter(c => c.category === cat.key && c.key !== 'contact').map(col => (
                            <button key={col.key}
                              className="block w-full text-left px-3 py-1.5 text-sm hover:bg-orange-50 transition-colors"
                              style={{ color: '#3D2E20' }}
                              onClick={() => { updateCond(i, 'column', col.key); updateCond(i, 'value', ''); setShowFieldDrop(null); }}>

                              {FIELD_LABELS[col.key] || col.label}
                            </button>
                          ))}
                        </div>
                      ))}
                      {columns.filter((c: any) => c.category === 'custom').length > 0 && (
                        <div>
                          <div className="px-3 py-1 text-xs font-medium" style={{ color: '#6BAF7D' }}>自定义字段</div>
                          {columns.filter((c: any) => c.category === 'custom').map((col: any) => (
                            <button key={col.key}
                              className="block w-full text-left px-3 py-1.5 text-sm hover:bg-green-50 transition-colors"
                              style={{ color: '#3D2E20' }}
                              onClick={() => { updateCond(i, 'column', col.key); updateCond(i, 'value', ''); setShowFieldDrop(null); }}>
                              {col.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <span className="text-sm" style={{ color: '#D4C8B8' }}>=</span>

                <div className="flex-1 relative">
                  {hasOptions ? (
                    <>
                      <button
                        onClick={() => setShowValueDrop(showValueDrop === i ? null : i)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left"
                        style={{ background: '#F5EDE3', border: '1px solid #E8DED0', color: cond.value ? '#3D2E20' : '#8B7B6B', outline: 'none' }}>
                        <span>{cond.value || `选择${FIELD_LABELS[cond.column] || colInfo?.label || ''}`}</span>
                        <ChevronDown size={13} style={{ color: '#B5A698' }} />
                      </button>
                      {showValueDrop === i && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-50 py-2 max-h-64 overflow-y-auto rounded-lg"
                          style={{ background: '#FFFDF9', border: '1px solid #E8DED0', boxShadow: '0 8px 24px rgba(61,46,32,0.12)' }}>
                          <div className="flex flex-wrap gap-1.5 p-2">
                            {colInfo?.options?.map(opt => {
                              const isSelected = isMultiple 
                                ? selectedValues.includes(opt)
                                : cond.value === opt;
                              return (
                                <button 
                                  key={opt}
                                  onClick={() => {
                                    if (isMultiple) {
                                      const newValues = isSelected
                                        ? selectedValues.filter(v => v !== opt)
                                        : [...selectedValues, opt];
                                      updateCond(i, 'value', newValues.join(','));
                                    } else {
                                      updateCond(i, 'value', opt);
                                      setShowValueDrop(null);
                                    }
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                    isSelected 
                                      ? 'bg-orange-500 text-white' 
                                      : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                                  }`}
                                >
                                  {isSelected && <Check size={10} className="inline mr-1" />}
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <input
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ background: '#F5EDE3', border: '1px solid #E8DED0', color: '#3D2E20', outline: 'none' }}
                      placeholder={`输入${FIELD_LABELS[cond.column] || colInfo?.label || '关键词'}`}
                      value={cond.value}
                      onFocus={e => (e.target.style.borderColor = '#F5B8A4')}
                      onBlur={e => (e.target.style.borderColor = '#E8DED0')}
                      onChange={e => updateCond(i, 'value', e.target.value)}
                    />
                  )}
                </div>

                <button onClick={() => removeCond(i)} className="p-1.5 rounded-md hover:bg-orange-50" style={{ color: '#D4C8B8' }}>
                  <X size={14} />
                </button>
              </div>
              );
            })}

          </div>

          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(240,228,212,0.4)' }}>
            <span className="text-xs mb-2.5 block font-medium" style={{ color: '#B5A698' }}>快捷筛选</span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map(tag => (
                <button key={tag.label} onClick={() => quickFilter(tag.key, tag.value)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium tag-bubble">
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => setHasSearched(true)}
            className="btn-primary w-full mt-4 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-white">
            <Search size={15} /> 开始匹配
          </button>
        </div>

        <p className="text-xs mb-6 px-1" style={{ color: '#D4C8B8' }}>
          提示：年龄支持范围写法如 "25-30"，也支持 {"'>25'"}、{"'<30'"} 等比较写法。多项选择可用逗号分隔。
        </p>

        {showSelectMode && (
          <div className="sticky top-0 z-40 px-4 -mx-4 py-3 flex items-center justify-between" style={{ background: 'rgba(232,122,93,0.08)', backdropFilter: 'blur(12px)' }}>
            <div className="flex items-center gap-3">
              <button onClick={exitSelectMode} className="flex items-center gap-1 text-sm" style={{ color: '#E87A5D' }}>
                <X size={16} /> 取消
              </button>
              <span className="text-sm font-medium" style={{ color: '#3D2E20' }}>已选择 {selectedRows.length} 人</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={deleteSelected} className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg text-white" style={{ background: '#C4515C' }}>
                <Trash2 size={14} /> 删除
              </button>
            </div>
          </div>
        )}


        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold" style={{ color: '#3D2E20' }}>
              {hasSearched ? '匹配结果' : '所有人'}
            </h3>
            {selectedPurpose && <span className="text-xs px-2.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(232,122,93,0.06)', color: '#E87A5D', border: '1px solid rgba(232,122,93,0.12)' }}>{selectedPurpose}</span>}
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(61,46,32,0.04)', color: '#B5A698' }}>{results.length}人</span>
            {favorites.length > 0 && (
              <button 
                onClick={() => {
                  setConditions([{ column: 'id', value: favorites.join(',') }]);
                  setHasSearched(true);
                }}
                className="text-xs font-medium px-2 py-0.5 rounded-full" 
                style={{ background: 'rgba(232,122,93,0.06)', color: '#E87A5D', border: '1px solid rgba(232,122,93,0.12)' }}>
                收藏 ({favorites.length})
              </button>
            )}

          </div>
          <div className="flex items-center gap-1.5">
            {currentUserId ? (
              <Link to="/profile" className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl font-medium tag-bubble">
                <User size={11} /> 我的
              </Link>
            ) : (
              <Link to="/login" className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl font-medium tag-bubble">
                <LogIn size={11} /> 登录
              </Link>
            )}
            {hasSearched && (
              <button onClick={() => setHasSearched(false)} className="text-xs font-medium px-2.5 py-1.5 rounded-xl tag-bubble">显示全部</button>
            )}
            <button onClick={() => setShowAddCol(!showAddCol)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl font-medium tag-bubble">
              <Plus size={11} /> 列
            </button>
            <button onClick={() => setShowSelectMode(true)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl font-medium tag-bubble">
              <Check size={11} /> 选择
            </button>

            <Link to="/circles" className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl font-medium" style={{ background: 'rgba(123,140,222,0.06)', border: '1px solid rgba(123,140,222,0.12)', color: '#7B8CDE' }}>
              <Users size={11} /> 圈子
            </Link>
            <Link to="/deposit" className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl font-medium" style={{ background: 'rgba(107,175,125,0.06)', border: '1px solid rgba(107,175,125,0.12)', color: '#6BAF7D' }}>
              <Shield size={11} /> 保障
            </Link>
            <Link to="/qr" className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl font-medium" style={{ background: 'rgba(232,122,93,0.06)', border: '1px solid rgba(232,122,93,0.12)', color: '#E87A5D' }}>
              <QrCode size={11} /> 分享
            </Link>
            <Link to="/post" className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl font-medium text-white btn-primary">
              <Plus size={11} /> 发布
            </Link>
          </div>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-3"></div>
            <p className="text-sm" style={{ color: '#B5A698' }}>加载中...</p>
          </div>
        )}

        {/* 错误提示 */}
        {error && !loading && (
          <div className="rounded-xl p-4 mb-4 text-center" style={{ background: 'rgba(232,122,93,0.08)', border: '1px solid #F5D0C4' }}>
            <p className="text-sm mb-2" style={{ color: '#E87A5D' }}>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="text-xs px-4 py-1.5 rounded-lg text-white"
              style={{ background: 'linear-gradient(135deg, #E87A5D, #D96A4D)' }}
            >
              刷新重试
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {showAddCol && (
              <div className="flex items-center gap-2 mb-3 p-3 rounded-xl" style={{ background: '#FFFDF9', border: '1px solid #F0E4D4' }}>
                <input className="px-3 py-1.5 rounded-lg text-xs" style={{ background: '#F5EDE3', border: '1px solid #E8DED0', color: '#3D2E20', width: '100px', outline: 'none' }} placeholder="字段名" value={newColKey} onChange={e => setNewColKey(e.target.value)} />
                <input className="px-3 py-1.5 rounded-lg text-xs" style={{ background: '#F5EDE3', border: '1px solid #E8DED0', color: '#3D2E20', width: '100px', outline: 'none' }} placeholder="显示名" value={newColLabel} onChange={e => setNewColLabel(e.target.value)} />
                <button onClick={handleAddCol} className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: 'linear-gradient(135deg, #E87A5D, #D96A4D)' }}>确定</button>
              </div>
            )}

            <div className="space-y-3">
          {displayResults.map(({ row, score, matches }) => {
            const isSelected = selectedRows.includes(row.id);
            const isFavorite = favorites.includes(row.id);
            return (<div 
              key={row.id} 
              className={`relative rounded-2xl cursor-pointer transition-all duration-300 hover:translate-y-[-2px] card-shadow hover:card-shadow-hover fade-in overflow-hidden ${isSelected ? 'ring-2 ring-orange-500' : ''}`}

              style={{
                background: score > 0 ? 'linear-gradient(135deg, rgba(232,122,93,0.03) 0%, rgba(255,255,255,0.98) 40%, rgba(255,255,255,0.98) 100%)' : 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: `1px solid ${score > 0 ? 'rgba(232,122,93,0.15)' : 'rgba(240,228,212,0.5)' }`,
              }}
              onClick={() => {
                if (showSelectMode) {
                  toggleSelect(row.id);
                } else {
                  setShowDetail(row.id);
                  loadRatings(row.id);
                }
              }}
              onDoubleClick={() => {
                if (!showSelectMode) {
                  toggleFavorite(row.id);
                }
              }}
              onTouchStart={(e) => {
                if (!showSelectMode) {
                  setSwipeRowId(row.id);
                }
              }}
              onTouchEnd={() => {
                setSwipeRowId(null);
              }}>
              
              <div className="absolute right-0 top-0 bottom-0 w-16 flex items-center justify-center" style={{ background: '#C4515C', transform: swipeRowId === row.id ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s ease' }}>
                <button onClick={(e) => { e.stopPropagation(); setSelRowId(row.id); setShowDelModal(true); }} className="text-white" title="删除">
                  <Trash2 size={20} />
                </button>
              </div>
              
              <div className="p-5">
                <div className="flex items-center gap-4 mb-3">
                  {showSelectMode && (
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={(e) => { e.stopPropagation(); toggleSelect(row.id); }}
                      className="w-5 h-5 rounded-lg accent-orange-500 flex-shrink-0"
                    />
                  )}
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0 avatar-gradient relative overflow-hidden cursor-pointer"
                    style={{ width: '56px', height: '56px', borderRadius: '16px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (row.data?.avatar) setPreviewImage(normalizeAvatarUrl(row.data.avatar) || '');
                    }}>
                    {/* 总是显示名字首字母作为背景 */}
                    <span className="absolute inset-0 flex items-center justify-center">{String(row.data?.name || '?')[0]}</span>
                    
                    {/* 如果有头像，显示在最上面 */}
                    {row.data?.avatar && (
                      <img 
                        src={normalizeAvatarUrl(row.data.avatar) || undefined} 
                        alt={row.data?.name} 
                        className="w-full h-full object-cover absolute inset-0" 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.style.display = 'none';
                        }} 
                      />
                    )}
                    
                    {isFavorite && (
                      <Heart size={12} className="absolute -bottom-1 -right-1" style={{ color: '#E87A5D', fill: '#E87A5D' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-semibold" style={{ color: '#3D2E20' }}>{row.data?.name || '匿名'}</span>
                      {row.data?.purpose && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(232,122,93,0.06)', color: '#E87A5D', border: '1px solid rgba(232,122,93,0.12)' }}>
                          {row.data.purpose}
                        </span>
                      )}
                      {hasSearched && score > 0 && (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg, rgba(232,122,93,0.1), rgba(232,122,93,0.06))', color: '#E87A5D', border: '1px solid rgba(232,122,93,0.15)' }}>
                          {score}分
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {row.data?.gender && <span className="text-xs font-medium" style={{ color: '#B5A698' }}>{row.data.gender}</span>}
                      {row.data?.age && <span className="text-xs" style={{ color: '#B5A698' }}>{row.data.age}岁</span>}
                      {row.data?.city && (
                        <span className="inline-flex items-center gap-0.5 text-xs" style={{ color: '#B5A698' }}>
                          <MapPin size={9} />{row.data.city}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(row.id); }} 
                      className={`p-2 rounded-xl transition-colors ${isFavorite ? 'bg-red-50/50' : 'hover:bg-red-50/50'}`} 
                      style={{ color: isFavorite ? '#E87A5D' : '#D4C8B8' }} 
                      title={isFavorite ? '取消收藏' : '收藏'}>
                      <Heart size={14} fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setSelRowId(row.id); setShowDelModal(true); }}
                      className="p-2 rounded-xl hover:bg-red-50/50 transition-colors" style={{ color: '#D4C8B8' }} title="删除">
                      <Trash2 size={14} />
                    </button>
                  </div>

                </div>

              {(() => {
                const visibleCols = columns.filter(c => {
                  const val = row.data?.[c.key as keyof typeof row.data];
                  return c.key !== 'name' && c.key !== 'contact' && c.key !== 'purpose' && val && String(val).trim();
                });
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {visibleCols.slice(0, 6).map(col => {
                      const val = String(row.data?.[col.key as keyof typeof row.data]);
                      const isMatch = matches.some(m => m.startsWith(col.key + ':'));
                      const display = val.length > 12 ? val.slice(0, 12) + '...' : val;
                      return (
                        <span key={col.key}
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${isMatch ? 'tag-match' : 'tag-bubble'}`}>
                          {FIELD_LABELS[col.key] || col.label}: {display}
                        </span>
                      );
                    })}
                    {visibleCols.length > 6 && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium tag-bubble">
                        +{visibleCols.length - 6}
                      </span>
                    )}
                  </div>
                );
              })()}
              </div>
            </div>);
          })}

        </div>

        {results.length === 0 && (
          <div className="text-center py-16 fade-in">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(232,122,93,0.06)' }}>
              <Heart size={28} style={{ color: '#E87A5D', opacity: 0.4 }} />
            </div>
            <p className="text-sm font-medium" style={{ color: '#B5A698' }}>暂无匹配结果</p>
            <p className="text-xs mt-1" style={{ color: '#D4C8B8' }}>试试调整筛选条件，或发布自己的资料</p>
            <Link to="/post" className="inline-flex items-center gap-1.5 mt-4 text-sm px-5 py-2.5 rounded-xl text-white btn-primary font-medium">
              <Plus size={14} /> 发布资料
            </Link>
          </div>
        )}

        <footer className="text-center py-10 mt-6" style={{ borderTop: '1px solid rgba(240,228,212,0.4)' }}>
          {/* 翻页按钮 */}
          {results.length > 0 && (
            <div className="mb-6">
              <p className="text-xs mb-3" style={{ color: '#8B7B6B' }}>
                第 {currentPage} / {totalPages} 页，共 {totalCount} 人
              </p>
              <div className="inline-flex items-center gap-2">
                <button
                  onClick={goPrevPage}
                  disabled={currentPage <= 1 || loadingPage}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: (currentPage <= 1 || loadingPage) ? 'rgba(240,228,212,0.4)' : 'rgba(232,122,93,0.08)',
                    color: (currentPage <= 1 || loadingPage) ? '#B5A698' : '#E87A5D',
                    border: '1px solid rgba(232,122,93,0.15)'
                  }}
                >
                  上一页
                </button>
                <span className="text-sm font-medium px-4" style={{ color: '#3D2E20' }}>{currentPage}</span>
                <button
                  onClick={goNextPage}
                  disabled={currentPage >= totalPages || loadingPage}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: (currentPage >= totalPages || loadingPage) ? 'rgba(240,228,212,0.4)' : 'rgba(232,122,93,0.08)',
                    color: (currentPage >= totalPages || loadingPage) ? '#B5A698' : '#E87A5D',
                    border: '1px solid rgba(232,122,93,0.15)'
                  }}
                >
                  下一页
                </button>
              </div>
              {loadingPage && (
                <div className="mt-2 text-xs" style={{ color: '#B5A698' }}>
                  <span className="inline-flex items-center gap-2">
                    <span className="animate-spin rounded-full h-3 w-3 border-b-2" style={{ borderColor: '#E87A5D' }}></span>
                    加载中...
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Heart size={10} style={{ color: '#E87A5D', opacity: 0.5 }} fill="currentColor" />
            <p className="text-xs mb-2" style={{ color: '#D4C8B8' }}>精准匹配 — 让每一次相遇都精准</p>
          </div>
          <Link to="/deploy" className="inline-flex items-center gap-1 text-xs" style={{ color: '#B5A698' }}>
            <Rocket size={11} /> 部署指南
          </Link>
        </footer>
          </>
        )}

      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-end fade-in" style={{ background: 'rgba(61,46,32,0.25)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} onClick={() => setShowDetail(null)}>
          <div className="w-full max-w-md h-full overflow-y-auto slide-in-right" style={{ background: 'linear-gradient(180deg, #FFFDF9 0%, #FAF6F1 100%)', boxShadow: '-8px 0 40px rgba(61,46,32,0.1)' }} onClick={e => e.stopPropagation()}>
            {/* Header with gradient */}
            <div className="sticky top-0 z-10 px-5 py-4" style={{ background: 'rgba(255,253,249,0.9)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(240,228,212,0.4)' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold" style={{ color: '#3D2E20' }}>详细资料</h3>
                <button onClick={() => setShowDetail(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-orange-50/50 transition-colors" style={{ color: '#B5A698', background: 'rgba(240,228,212,0.2)' }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-5">
            {(() => {
              const detailRow = rows.find(r => r.id === showDetail);
              const detailData = detailRow?.data;
              if (!detailData) return null;
              return (
              <div className="space-y-5">
                {/* Profile hero */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold avatar-gradient overflow-hidden cursor-pointer"
                    onClick={() => {
                      if (detailData.avatar) setPreviewImage(normalizeAvatarUrl(detailData.avatar) || '');
                    }}>
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
                          onClick={() => { setPayContactTarget(showDetail); setShowPayModal(true); }}
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
                      onClick={(e) => { e.stopPropagation(); setShowRatingModal(showDetail); }}
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
                          {[1,2,3,4,5].map(i => (
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
                                {[1,2,3,4,5].map(i => (
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
                    onClick={(e) => { e.stopPropagation(); setShowRatingModal(showDetail); }}
                    className="flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5"
                    style={{ background: 'rgba(107,175,125,0.1)', color: '#6BAF7D', border: '1px solid rgba(107,175,125,0.2)' }}
                  >
                    <Star size={14} />
                    评价
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); navigate(`/messages/${detailData.id}`); }}
                    className="flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5"
                    style={{ background: 'linear-gradient(135deg, rgba(232,122,93,0.1), rgba(245,166,35,0.1))', color: '#E87A5D', border: '1px solid rgba(232,122,93,0.2)' }}
                  >
                    <MessageCircle size={14} />
                    发消息
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowReportModal(showDetail); }}
                    className="flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5"
                    style={{ background: 'rgba(196,81,92,0.1)', color: '#C4515C', border: '1px solid rgba(196,81,92,0.2)' }}
                  >
                    <Flag size={14} />
                    举报
                  </button>
                </div>
              </div>
              )
            })()}
            </div>
          </div>
        </div>
      )}

      {showDelModal && selRowId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center fade-in" style={{ background: 'rgba(61,46,32,0.25)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} onClick={() => setShowDelModal(false)}>
          <div className="rounded-2xl p-6 mx-4 scale-in" style={{ background: 'rgba(255,253,249,0.98)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(240,228,212,0.5)', maxWidth: '340px', boxShadow: '0 16px 48px rgba(61,46,32,0.15)' }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(196,81,92,0.08)' }}>
              <Trash2 size={18} style={{ color: '#C4515C' }} />
            </div>
            <h3 className="text-base font-semibold mb-1.5" style={{ color: '#3D2E20' }}>删除确认</h3>
            <p className="text-sm mb-5" style={{ color: '#8B7B6B' }}>
              确定删除这行数据吗？删除后不可恢复，保证金将原路退回。
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'rgba(245,237,227,0.8)', color: '#8B7B6B', border: '1px solid rgba(232,222,208,0.5)' }}>取消</button>
              <button onClick={() => handleDeleteRow(selRowId)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg, #C4515C, #D4606A)', boxShadow: '0 4px 12px rgba(196,81,92,0.25)' }}>删除</button>
            </div>
          </div>
        </div>
      )}

      {/* 评价弹窗 */}
      {showRatingModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowRatingModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-80 max-w-[90%] mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: '#3D2E20' }}>写评价</h3>
              <button onClick={() => setShowRatingModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm mb-2" style={{ color: '#8B7B6B' }}>评分</p>
              <div className="flex gap-1 justify-center">
                {[1,2,3,4,5].map(i => (
                  <button key={i} onClick={() => setRatingValue(i)} className="p-1">
                    <Star size={28} fill={i <= ratingValue ? '#F5A623' : 'none'} style={{ color: '#F5A623' }} />
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm mb-2" style={{ color: '#8B7B6B' }}>评价内容（可选）</p>
              <textarea
                className="w-full p-3 rounded-xl text-sm resize-none"
                style={{ background: '#F5EDE3', border: '1px solid #E8DED0', color: '#3D2E20', outline: 'none', minHeight: '100px' }}
                placeholder="写下你的评价..."
                value={ratingComment}
                onChange={e => setRatingComment(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowRatingModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: '#f0f0f0', color: '#666' }}>取消</button>
              <button onClick={() => submitRating(showRatingModal)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg, #6BAF7D, #5A9E6C)' }}>提交</button>
            </div>
          </div>
        </div>
      )}

      {/* 举报弹窗 */}
      {showReportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowReportModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-80 max-w-[90%] mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: '#C4515C' }}>举报用户</h3>
              <button onClick={() => setShowReportModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm mb-2" style={{ color: '#8B7B6B' }}>举报类型</p>
              <div className="space-y-2">
                {['虚假信息', '骚扰他人', '不诚信行为', '其他'].map(type => (
                  <button
                    key={type}
                    onClick={() => setReportType(type)}
                    className={`w-full text-left p-3 rounded-xl text-sm font-medium transition-all ${reportType === type ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-600'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm mb-2" style={{ color: '#8B7B6B' }}>凭证图片（可选）</p>
              <div className="relative border-2 border-dashed rounded-xl p-4 text-center" style={{ borderColor: reportProofImage ? '#E87A5D' : '#E8DED0' }}>
                {reportProofImage ? (
                  <div className="relative">
                    <img src={URL.createObjectURL(reportProofImage)} alt="预览" className="max-h-32 mx-auto rounded-lg object-contain" />
                    <button onClick={() => setReportProofImage(null)} className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white" style={{ width: '24px', height: '24px' }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <input type="file" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
                        if (allowedTypes.includes(file.type)) {
                          setReportProofImage(file);
                        } else {
                          alert('请上传有效的图片文件（JPG、PNG、WebP、GIF）');
                        }
                      }
                    }} className="hidden" />
                    <div className="flex flex-col items-center gap-2 py-2">
                      <Upload size={24} style={{ color: '#9B8B7B' }} />
                      <span className="text-sm text-gray-500">点击上传图片</span>
                      <span className="text-xs text-gray-400">支持 JPG、PNG、WebP、GIF</span>
                    </div>
                  </label>
                )}
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm mb-2" style={{ color: '#8B7B6B' }}>详细描述</p>
              <textarea
                className="w-full p-3 rounded-xl text-sm resize-none"
                style={{ background: '#F5EDE3', border: '1px solid #E8DED0', color: '#3D2E20', outline: 'none', minHeight: '100px' }}
                placeholder="请详细描述举报原因..."
                value={reportDescription}
                onChange={e => setReportDescription(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowReportModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: '#f0f0f0', color: '#666' }}>取消</button>
              <button onClick={() => submitReport(showReportModal)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg, #C4515C, #D4606A)' }}>提交举报</button>
            </div>
          </div>
        </div>
      )}

      {/* 查看联系方式支付弹窗 - 与保证金页面样式一致 */}
      {showPayModal && payContactTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowPayModal(false)}>
          <div className="w-full max-w-md rounded-2xl p-6 mx-4" style={{ background: '#FFFDF9' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: '#3D2E20' }}>查看联系方式</h3>
              <button onClick={() => setShowPayModal(false)} className="p-2 rounded-lg" style={{ color: '#9B8B7B' }}>
                <ArrowLeft size={20} />
              </button>
            </div>

            {/* 支付模式选择 */}
            <div className="flex gap-2 mb-4 p-1 rounded-xl" style={{ background: 'rgba(232,122,93,0.05)' }}>
              <button
                onClick={() => setContactPayMode('auto')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                  contactPayMode === 'auto' ? 'text-white shadow' : 'text-gray-600 hover:bg-white/50'
                }`}
                style={contactPayMode === 'auto' ? { background: 'linear-gradient(135deg, #E87A5D, #D96A4D)' } : {}}
              >
                <Zap size={14} /> 自动支付
              </button>
              <button
                onClick={() => setContactPayMode('manual')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                  contactPayMode === 'manual' ? 'text-white shadow' : 'text-gray-600 hover:bg-white/50'
                }`}
                style={contactPayMode === 'manual' ? { background: 'linear-gradient(135deg, #E87A5D, #D96A4D)' } : {}}
              >
                <Upload size={14} /> 手动上传
              </button>
            </div>

            {/* 支付方式选择 */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setContactPayMethod('alipay')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  contactPayMethod === 'alipay' ? 'text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={contactPayMethod === 'alipay' ? { background: 'linear-gradient(135deg, #1677FF, #0958D9)' } : {}}
              >
                支付宝
              </button>
              <button
                onClick={() => setContactPayMethod('wechat')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  contactPayMethod === 'wechat' ? 'text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={contactPayMethod === 'wechat' ? { background: 'linear-gradient(135deg, #07C160, #06AD56)' } : {}}
              >
                微信
              </button>
            </div>

            {/* 自动支付模式 */}
            {contactPayMode === 'auto' && (
              <>
                <div className="bg-white rounded-xl p-4 mb-4 text-center" style={{ border: '1px solid #F0E4D4' }}>
                  <p className="text-sm mb-2" style={{ color: '#3D2E20' }}>
                    点击下方按钮，跳转到{contactPayMethod === 'alipay' ? '支付宝' : '微信'}完成支付
                  </p>
                  <p className="text-lg font-bold" style={{ color: '#E87A5D' }}>
                    ¥{VIEW_CONTACT_AMOUNT}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#9B8B7B' }}>
                    支付成功后自动解锁，无需等待审核
                  </p>
                </div>
                <button
                  onClick={handleContactAutoPay}
                  className="w-full py-3 rounded-xl text-sm font-medium text-white transition-all flex items-center justify-center gap-2"
                  style={{ background: contactPayMethod === 'alipay' ? 'linear-gradient(135deg, #1677FF, #0958D9)' : 'linear-gradient(135deg, #07C160, #06AD56)' }}
                >
                  <Zap size={16} /> 立即支付 ¥{VIEW_CONTACT_AMOUNT}
                </button>
                {contactPayStatus && (
                  <p className="text-xs text-center mt-3" style={{ color: '#E87A5D' }}>{contactPayStatus}</p>
                )}
              </>
            )}

            {/* 手动上传模式 */}
            {contactPayMode === 'manual' && (
              <>
                {/* 收款码 */}
                <div className="bg-white rounded-xl p-4 mb-4 border-2 border-dashed" style={{ borderColor: '#F0E4D4' }}>
                  <div className="aspect-square w-full max-w-[280px] mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                    <img
                      src={`/jzxr/${contactPayMethod}-qr.png`}
                      alt={`${contactPayMethod === 'alipay' ? '支付宝' : '微信'}收款码`}
                      className="w-full h-full object-contain rounded-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const methodName = contactPayMethod === 'alipay' ? '支付宝' : '微信';
                        e.currentTarget.parentElement!.innerHTML = `<div class="text-center text-gray-400"><p class="text-sm mb-2">${methodName}收款码加载中...</p><p class="text-xs">请联系管理员获取</p></div>`;
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium mb-1" style={{ color: '#3D2E20' }}>
                      扫码支付 ¥{VIEW_CONTACT_AMOUNT}
                    </p>
                    <p className="text-xs" style={{ color: '#9B8B7B' }}>
                      使用{contactPayMethod === 'alipay' ? '支付宝' : '微信'}扫一扫
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
                    onChange={handleContactProofUpload}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: '#E8DED0' }}
                  />
                  {contactProofFile && (
                    <div className="mt-2 text-xs flex items-center gap-2" style={{ color: '#6BAF7D' }}>
                      <CheckCircle size={14} />
                      <span>已选择: {contactProofFile.name}</span>
                    </div>
                  )}
                </div>

                {/* 提交按钮 */}
                <button
                  onClick={handleContactSubmitProof}
                  disabled={!contactProofFile || contactProofUploading}
                  className="w-full py-3 rounded-xl text-sm font-medium text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #E87A5D, #D96A4D)' }}
                >
                  {contactProofUploading ? (
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

                {contactPayStatus && (
                  <p className="text-xs mt-3 text-center" style={{ color: contactPayStatus.includes('成功') ? '#6BAF7D' : '#E87A5D' }}>{contactPayStatus}</p>
                )}
                <p className="text-xs mt-2 text-center" style={{ color: '#9B8B7B' }}>
                  管理员将在24小时内审核，审核结果将通知您
                </p>
              </>
            )}
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
    </div>
  );
}