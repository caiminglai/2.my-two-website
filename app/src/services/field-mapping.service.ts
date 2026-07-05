/**
 * 字段中文映射服务
 * 职责：从后端获取字段映射数据，作为字段标签和选项的唯一数据源
 * 策略：优先从 API 获取，失败时回退到 constants.ts 硬编码默认值
 */

import { API_BASE_URL } from '../api/config';
import type { Column } from '../data/types';
import {
  PURPOSE_OPTIONS, GENDER_OPTIONS, CITY_OPTIONS, HOUSE_OPTIONS, CAR_OPTIONS,
  FACE_TYPE_OPTIONS, EYE_TYPE_OPTIONS, MOUTH_TYPE_OPTIONS, BODY_TYPE_OPTIONS,
  SKIN_TONE_OPTIONS, ZODIAC_OPTIONS, BLOOD_TYPE_OPTIONS, MARRIAGE_OPTIONS,
  CHILDREN_OPTIONS, EDUCATION_OPTIONS, INCOME_OPTIONS, PERSONALITY_OPTIONS,
  SMOKE_OPTIONS, DRINK_OPTIONS, RELIGION_OPTIONS, PET_OPTIONS, HOBBY_OPTIONS,
  FOOD_OPTIONS, SPORT_OPTIONS, MUSIC_OPTIONS, FIELD_LABELS,
} from '../data/constants';

const LS_KEY = 'field_mappings_cache';
const LS_LABELS_KEY = 'field_labels_cache';

// 硬编码默认列（回退用，与 user.service.ts 保持一致）
const DEFAULT_COLUMNS: Column[] = [
  { key: 'purpose', label: '目的', type: 'select', options: PURPOSE_OPTIONS, category: '基本' },
  { key: 'name', label: '昵称', type: 'text', category: '基本' },
  { key: 'gender', label: '性别', type: 'select', options: GENDER_OPTIONS, category: '基本' },
  { key: 'age', label: '年龄', type: 'text', category: '基本' },
  { key: 'height', label: '身高', type: 'text', category: '基本' },
  { key: 'weight', label: '体重', type: 'text', category: '基本' },
  { key: 'city', label: '城市', type: 'select', options: CITY_OPTIONS, category: '基本' },
  { key: 'skinTone', label: '肤色', type: 'select', options: SKIN_TONE_OPTIONS, category: '外貌' },
  { key: 'faceType', label: '脸型', type: 'select', options: FACE_TYPE_OPTIONS, category: '外貌' },
  { key: 'eyeType', label: '眼型', type: 'select', options: EYE_TYPE_OPTIONS, category: '外貌' },
  { key: 'mouthType', label: '嘴型', type: 'select', options: MOUTH_TYPE_OPTIONS, category: '外貌' },
  { key: 'bodyType', label: '身材', type: 'select', options: BODY_TYPE_OPTIONS, category: '外貌' },
  { key: 'zodiac', label: '星座', type: 'select', options: ZODIAC_OPTIONS, category: '属性' },
  { key: 'bloodType', label: '血型', type: 'select', options: BLOOD_TYPE_OPTIONS, category: '属性' },
  { key: 'marriage', label: '婚姻', type: 'select', options: MARRIAGE_OPTIONS, category: '属性' },
  { key: 'children', label: '子女', type: 'select', options: CHILDREN_OPTIONS, category: '属性' },
  { key: 'education', label: '学历', type: 'select', options: EDUCATION_OPTIONS, category: '属性' },
  { key: 'job', label: '职业', type: 'text', category: '属性' },
  { key: 'income', label: '收入', type: 'select', options: INCOME_OPTIONS, category: '属性' },
  { key: 'house', label: '住房', type: 'select', options: HOUSE_OPTIONS, category: '属性' },
  { key: 'car', label: '购车', type: 'select', options: CAR_OPTIONS, category: '属性' },
  { key: 'personality', label: '性格', type: 'select', options: PERSONALITY_OPTIONS, category: '个性' },
  { key: 'smoke', label: '吸烟', type: 'select', options: SMOKE_OPTIONS, category: '个性' },
  { key: 'drink', label: '饮酒', type: 'select', options: DRINK_OPTIONS, category: '个性' },
  { key: 'religion', label: '宗教信仰', type: 'select', options: RELIGION_OPTIONS, category: '个性' },
  { key: 'pet', label: '宠物', type: 'select', options: PET_OPTIONS, category: '个性' },
  { key: 'hobbies', label: '兴趣爱好', type: 'tags', options: HOBBY_OPTIONS, category: '兴趣' },
  { key: 'food', label: '美食偏好', type: 'tags', options: FOOD_OPTIONS, category: '兴趣' },
  { key: 'sport', label: '运动爱好', type: 'tags', options: SPORT_OPTIONS, category: '兴趣' },
  { key: 'music', label: '音乐偏好', type: 'tags', options: MUSIC_OPTIONS, category: '兴趣' },
  { key: 'interestTags', label: '兴趣标签', type: 'tags', options: [...HOBBY_OPTIONS, ...SPORT_OPTIONS], category: '兴趣' },
  { key: 'expectation', label: '期望', type: 'text', category: '其他' },
  { key: 'contact', label: '联系方式', type: 'text', category: '其他' },
];

// 缓存结构：{ value: T, version: string }
interface CachedData<T> { value: T; version: string; }

function readCache<T>(key: string): CachedData<T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.value && data.version) return data as CachedData<T>;
  } catch { /* empty */ }
  return null;
}

function writeCache<T>(key: string, value: T, version: string) {
  try {
    localStorage.setItem(key, JSON.stringify({ value, version }));
  } catch { /* empty */ }
}

// 从后端获取字段映射，转为 Column[] 格式（ETag 版本缓存）
export async function fetchFieldMappings(): Promise<Column[]> {
  const cached = readCache<Column[]>(LS_KEY);
  const headers: Record<string, string> = {};
  if (cached) headers['If-None-Match'] = cached.version;

  try {
    const res = await fetch(`${API_BASE_URL}/field-mappings`, { headers });
    // 304 = 数据未变，直接用缓存
    if (res.status === 304 && cached) return cached.value;
    // 200 = 有新数据
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        const columns: Column[] = data.data.map((m: any) => ({
          key: m.field_key,
          label: m.field_label,
          type: m.field_type,
          options: m.options || [],
          category: m.field_category || '其他',
        }));
        const version = res.headers.get('ETag') || String(Date.now());
        writeCache(LS_KEY, columns, version);
        return columns;
      }
    }
  } catch { /* API不可用时回退 */ }
  // 最终回退：缓存 > 硬编码
  return cached?.value || DEFAULT_COLUMNS;
}

// 从后端获取字段标签映射表（ETag 版本缓存）
export async function fetchFieldLabels(): Promise<Record<string, string>> {
  const cached = readCache<Record<string, string>>(LS_LABELS_KEY);
  const headers: Record<string, string> = {};
  if (cached) headers['If-None-Match'] = cached.version;

  try {
    const res = await fetch(`${API_BASE_URL}/field-mappings/labels`, { headers });
    if (res.status === 304 && cached) return cached.value;
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data) {
        const version = res.headers.get('ETag') || String(Date.now());
        writeCache(LS_LABELS_KEY, data.data, version);
        return data.data as Record<string, string>;
      }
    }
  } catch { /* API不可用时回退 */ }
  return cached?.value || FIELD_LABELS;
}

// 同步获取默认列（用于初始化，不等待API）
export function getDefaultColumns(): Column[] {
  return DEFAULT_COLUMNS;
}
