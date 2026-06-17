import { useRef } from 'react';
import { Search, Plus, Trash2, ChevronDown, Check, X } from 'lucide-react';
import type { Column, MatchCondition } from '../data/types';
import { CATEGORIES } from '../data/constants';

const FIELD_LABELS: Record<string, string> = {
  name: '昵称', gender: '性别', age: '年龄', height: '身高', weight: '体重',
  skinTone: '肤色', zodiac: '星座', bloodType: '血型', city: '城市',
  marriage: '婚姻', children: '子女', education: '学历', job: '职业',
  income: '收入', house: '住房', car: '购车', faceType: '脸型',
  eyeType: '眼型', mouthType: '嘴型', bodyType: '身材', hobbies: '兴趣爱好',
  food: '美食偏好', sport: '运动爱好', music: '音乐偏好', smoke: '吸烟',
  drink: '饮酒', religion: '宗教信仰', pet: '宠物', personality: '性格',
  expectation: '期望', contact: '联系方式', interestTags: '兴趣标签',
  purpose: '目的'
};

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

interface SearchPanelProps {
  columns: Column[];
  conditions: MatchCondition[];
  showFieldDrop: number | null;
  showValueDrop: number | null;
  onAddCond: () => void;
  onRemoveCond: (i: number) => void;
  onUpdateCond: (i: number, f: 'column' | 'value', v: string) => void;
  onSetShowFieldDrop: (v: number | null) => void;
  onSetShowValueDrop: (v: number | null) => void;
  onClearAll: () => void;
  onSearch: () => void;
  onQuickFilter: (col: string, val: string) => void;
}

export default function SearchPanel({
  columns, conditions, showFieldDrop, showValueDrop,
  onAddCond, onRemoveCond, onUpdateCond,
  onSetShowFieldDrop, onSetShowValueDrop,
  onClearAll, onSearch, onQuickFilter,
}: SearchPanelProps) {
  const dropRef = useRef<HTMLDivElement>(null);

  return (
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
          <button onClick={onAddCond} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg" style={{ color: '#E87A5D', border: '1px solid #F5D0C4' }}>
            <Plus size={12} /> 添加条件
          </button>
          <button onClick={onClearAll} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg" style={{ color: '#B5A698', border: '1px solid #E8DED0' }}>
            <Trash2 size={12} /> 清空
          </button>
        </div>
      </div>

      <div className="space-y-2.5" ref={dropRef}>
        {conditions.map((cond, i) => {
          const col = columns.find(c => c.key === cond.column);
          const hasOptions = col?.options && col.options.length > 0;
          const isMultiple = col?.type === 'tags';
          const selectedValues = cond.value ? cond.value.split(',') : [];

          return (
            <div key={i} className="flex items-center gap-2">
              <div className="relative flex-shrink-0" style={{ width: '130px' }}>
                <button onClick={() => onSetShowFieldDrop(showFieldDrop === i ? null : i)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm"
                  style={{ background: '#F5EDE3', border: '1px solid #E8DED0', color: '#8B7B6B' }}>
                  <span>{FIELD_LABELS[cond.column] || '选择字段'}</span>
                  <ChevronDown size={13} style={{ color: '#B5A698' }} />
                </button>
                {showFieldDrop === i && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 py-2 max-h-64 overflow-y-auto rounded-lg"
                    style={{ background: '#FFFDF9', border: '1px solid #E8DED0', boxShadow: '0 8px 24px rgba(61,46,32,0.12)' }}>
                    {CATEGORIES.map(cat => (
                      <div key={cat.key}>
                        <div className="px-3 py-1 text-xs font-medium" style={{ color: '#B5A698' }}>{cat.label}</div>
                        {columns.filter(c => c.category === cat.key && c.key !== 'contact').map(c => (
                          <button key={c.key}
                            className="block w-full text-left px-3 py-1.5 text-sm hover:bg-orange-50 transition-colors"
                            style={{ color: '#3D2E20' }}
                            onClick={() => { onUpdateCond(i, 'column', c.key); onUpdateCond(i, 'value', ''); onSetShowFieldDrop(null); }}>
                            {FIELD_LABELS[c.key] || c.label}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <span className="text-sm" style={{ color: '#D4C8B8' }}>=</span>

              <div className="flex-1 relative">
                {hasOptions ? (
                  <>
                    <button
                      onClick={() => onSetShowValueDrop(showValueDrop === i ? null : i)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left"
                      style={{ background: '#F5EDE3', border: '1px solid #E8DED0', color: '#3D2E20', outline: 'none' }}>
                      <span>{cond.value || '选择值'}</span>
                      <ChevronDown size={13} style={{ color: '#B5A698' }} />
                    </button>
                    {showValueDrop === i && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-50 py-2 max-h-64 overflow-y-auto rounded-lg"
                        style={{ background: '#FFFDF9', border: '1px solid #E8DED0', boxShadow: '0 8px 24px rgba(61,46,32,0.12)' }}>
                        <div className="flex flex-wrap gap-1.5 p-2">
                          {col?.options?.map(opt => {
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
                                    onUpdateCond(i, 'value', newValues.join(','));
                                  } else {
                                    onUpdateCond(i, 'value', opt);
                                    onSetShowValueDrop(null);
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
                    placeholder="输入关键词"
                    value={cond.value}
                    onFocus={e => (e.target.style.borderColor = '#F5B8A4')}
                    onBlur={e => (e.target.style.borderColor = '#E8DED0')}
                    onChange={e => onUpdateCond(i, 'value', e.target.value)}
                  />
                )}
              </div>

              <button onClick={() => onRemoveCond(i)} className="p-1.5 rounded-md hover:bg-orange-50" style={{ color: '#D4C8B8' }}>
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
            <button key={tag.label} onClick={() => onQuickFilter(tag.key, tag.value)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium tag-bubble">
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={onSearch}
        className="btn-primary w-full mt-4 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-white">
        <Search size={15} /> 开始匹配
      </button>
    </div>
  );
}
