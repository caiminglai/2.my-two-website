/**
 * 用户数据服务（业务逻辑层）
 * 负责：用户数据的增删改查、本地存储管理、与后端 API 的数据同步
 * 调用：api/config 中的 API 配置
 */

import { API_BASE_URL, API_ENDPOINTS } from '../api/config';
import type { Row, Column } from '../data/types';
import {
  PURPOSE_OPTIONS, GENDER_OPTIONS, CITY_OPTIONS, HOUSE_OPTIONS, CAR_OPTIONS,
  FACE_TYPE_OPTIONS, EYE_TYPE_OPTIONS, MOUTH_TYPE_OPTIONS, BODY_TYPE_OPTIONS,
  SKIN_TONE_OPTIONS, ZODIAC_OPTIONS, BLOOD_TYPE_OPTIONS, MARRIAGE_OPTIONS,
  CHILDREN_OPTIONS, EDUCATION_OPTIONS, INCOME_OPTIONS, PERSONALITY_OPTIONS,
  SMOKE_OPTIONS, DRINK_OPTIONS, RELIGION_OPTIONS, PET_OPTIONS, HOBBY_OPTIONS,
  FOOD_OPTIONS, SPORT_OPTIONS, MUSIC_OPTIONS
} from '../data/constants';

const LS_ROWS = 'match_rows';
const LS_COLUMNS = 'match_columns';
const DATA_VERSION = 'v6';

function checkVersion(): void {
  const stored = localStorage.getItem('match_version');
  if (stored !== DATA_VERSION) {
    localStorage.removeItem(LS_ROWS);
    // 不清空 match_columns：让 loadColumns 的合并逻辑自动修正默认字段，
    // 同时保留用户自定义字段和已建立的条件。
    localStorage.setItem('match_version', DATA_VERSION);
  }
}

export function loadRows(): Row[] {
  checkVersion();

  try {
    const raw = localStorage.getItem(LS_ROWS);
    if (raw) {
      const rows = JSON.parse(raw);
      return rows.map((row: any) => {
        if (row.data) return row;
        return {
          ...row,
          data: {
            name: row.name || '',
            gender: row.gender || '',
            age: row.age || '',
            height: row.height || '',
            weight: row.weight || '',
            skinTone: row.skinTone || '',
            zodiac: row.zodiac || '',
            bloodType: row.bloodType || '',
            city: row.city || '',
            marriage: row.marriage || '',
            children: row.children || '',
            education: row.education || '',
            job: row.job || '',
            income: row.income || '',
            house: row.house || '',
            car: row.car || '',
            faceType: row.faceType || '',
            eyeType: row.eyeType || '',
            mouthType: row.mouthType || '',
            bodyType: row.bodyType || '',
            hobbies: row.hobbies || '',
            food: row.food || '',
            sport: row.sport || '',
            music: row.music || '',
            smoke: row.smoke || '',
            drink: row.drink || '',
            religion: row.religion || '',
            pet: row.pet || '',
            personality: row.personality || '',
            expectation: row.expectation || '',
            contact: row.contact || '',
            interestTags: row.interestTags || '',
            purpose: row.purpose || ''
          }
        };
      });
    }
  } catch { /* empty */ }

  return [
    { id: 'r1', deposit: 29.9, createdAt: Date.now(), data: { name: '小雅', gender: '女', age: 25, height: 165, weight: '50kg', skinTone: '白皙', zodiac: '金牛座', bloodType: 'O型', city: '西安', marriage: '未婚', children: '无', education: '本科', job: '设计师', income: '10-20万', house: '租房', car: '无', faceType: '圆脸', eyeType: '杏眼', mouthType: '樱桃', bodyType: '匀称', hobbies: '看书,摄影', food: '火锅,川菜', sport: '瑜伽,游泳', music: '民谣,古风', smoke: '否', drink: '偶尔', religion: '无', pet: '猫', personality: '温柔', expectation: '成熟稳重，有上进心', contact: 'wx_xiaoya', interestTags: '摄影,旅行', purpose: '相亲交友' } },
    { id: 'r2', deposit: 29.9, createdAt: Date.now() - 10000, data: { name: '明月', gender: '女', age: 28, height: 168, weight: '52kg', skinTone: '小麦色', zodiac: '天秤座', bloodType: 'A型', city: '杭州', marriage: '未婚', children: '无', education: '硕士', job: '产品经理', income: '20-30万', house: '有房(贷款)', car: '有车(全款)', faceType: '瓜子脸', eyeType: '桃花眼', mouthType: '微笑唇', bodyType: '纤细', hobbies: '旅行,美食', food: '西餐,日料', sport: '跑步,游泳', music: '流行,爵士', smoke: '否', drink: '否', religion: '无', pet: '狗', personality: '开朗', expectation: '幽默风趣，热爱生活', contact: 'wx_mingyue', interestTags: '美食,旅行', purpose: '拓展圈子' } },
    { id: 'r3', deposit: 29.9, createdAt: Date.now() - 20000, data: { name: '思琪', gender: '女', age: 24, height: 163, weight: '48kg', skinTone: '偏白', zodiac: '双鱼座', bloodType: 'B型', city: '上海', marriage: '未婚', children: '无', education: '本科', job: '教师', income: '20-30万', house: '与父母同住', car: '无', faceType: '瓜子脸', eyeType: '桃花眼', mouthType: '微笑唇', bodyType: '纤细', hobbies: '旅行,美食', food: '西餐,日料', sport: '跑步,游泳', music: '流行,爵士', smoke: '否', drink: '否', religion: '无', pet: '无', personality: '细腻', expectation: '体贴顾家，情绪稳定', contact: 'wx_siqi', interestTags: '阅读,音乐', purpose: '兴趣交流' } },
    { id: 'r4', deposit: 29.9, createdAt: Date.now() - 30000, data: { name: '大伟', gender: '男', age: 30, height: 182, weight: '75kg', skinTone: '偏黑', zodiac: '狮子座', bloodType: 'O型', city: '北京', marriage: '未婚', children: '无', education: '本科', job: '程序员', income: '30-50万', house: '有房(贷款)', car: '有车(全款)', faceType: '方脸', eyeType: '杏眼', mouthType: '厚唇', bodyType: '健硕', hobbies: '运动,美食', food: '烧烤,火锅', sport: '篮球,健身', music: '流行,嘻哈', smoke: '否', drink: '偶尔', religion: '无', pet: '无', personality: '直爽', expectation: '善解人意，有共同爱好', contact: 'wx_dawei', interestTags: '篮球,健身', purpose: '运动伙伴' } },
    { id: 'r5', deposit: 29.9, createdAt: Date.now() - 40000, data: { name: '青阳', gender: '男', age: 27, height: 178, weight: '70kg', skinTone: '自然', zodiac: '双子座', bloodType: 'AB型', city: '深圳', marriage: '未婚', children: '无', education: '硕士', job: '工程师', income: '30-50万', house: '租房', car: '有车(贷款)', faceType: '鹅蛋脸', eyeType: '丹凤眼', mouthType: '薄唇', bodyType: '匀称', hobbies: '动漫,游戏', food: '日料,烧烤', sport: '羽毛球,游泳', music: '电子,摇滚', smoke: '否', drink: '偶尔', religion: '无', pet: '猫', personality: '幽默', expectation: '喜欢二次元的小伙伴', contact: 'wx_qingyang', interestTags: '动漫,游戏', purpose: '兴趣交流' } },
  ];
}

export function saveRows(rows: Row[]) {
  localStorage.setItem(LS_ROWS, JSON.stringify(rows));
  try {
    fetch(`${API_BASE_URL}/users/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows)
    });
  } catch (e) { /* ignored */ }
}

export async function syncRowsFromServer(): Promise<Row[]> {
  try {
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.users}`);
    const data = await res.json();
    if (data.success && data.data) {
      const cleaned = data.data.map((row: any) => {
        if (row.data) return row;
        return {
          ...row,
          data: {
            name: row.name || '', gender: row.gender || '', age: row.age || '',
            height: row.height || '', weight: row.weight || '', skinTone: row.skinTone || '',
            zodiac: row.zodiac || '', bloodType: row.bloodType || '', city: row.city || '',
            marriage: row.marriage || '', children: row.children || '', education: row.education || '',
            job: row.job || '', income: row.income || '', house: row.house || '',
            car: row.car || '', faceType: row.faceType || '', eyeType: row.eyeType || '',
            mouthType: row.mouthType || '', bodyType: row.bodyType || '',
            hobbies: row.hobbies || '', food: row.food || '', sport: row.sport || '',
            music: row.music || '', smoke: row.smoke || '', drink: row.drink || '',
            religion: row.religion || '', pet: row.pet || '', personality: row.personality || '',
            expectation: row.expectation || '', contact: row.contact || '',
            interestTags: row.interestTags || '', purpose: row.purpose || ''
          }
        };
      });
      localStorage.setItem(LS_ROWS, JSON.stringify(cleaned));
      return cleaned;
    }
  } catch (e) { /* ignored */ }
  return [];
}

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

export function loadColumns(): Column[] {
  checkVersion();

  try {
    const raw = localStorage.getItem(LS_COLUMNS);
    if (raw) {
      const saved: Column[] = JSON.parse(raw);
      if (Array.isArray(saved) && saved.length > 0) {
        // 与默认列配置合并，默认配置优先，防止旧缓存中的错误 options/type/category 覆盖正确值
        const merged = saved.map(savedCol => {
          const defaultCol = DEFAULT_COLUMNS.find(c => c.key === savedCol.key);
          if (!defaultCol) return savedCol;
          return {
            ...defaultCol,
            ...savedCol,
            type: defaultCol.type,
            category: defaultCol.category,
            options: defaultCol.options,
          };
        });
        localStorage.setItem(LS_COLUMNS, JSON.stringify(merged));
        return merged;
      }
    }
  } catch { /* empty */ }

  return DEFAULT_COLUMNS;
}

export function addColumn(columns: Column[], col: Column): Column[] {
  const next = [...columns, col];
  localStorage.setItem(LS_COLUMNS, JSON.stringify(next));
  return next;
}

export function deleteRow(id: string): Row[] {
  const rows = loadRows().filter(r => r.id !== id);
  saveRows(rows);
  return rows;
}

export function addRow(rows: Row[], row: Row): Row[] {
  const next = [...rows, row];
  saveRows(next);
  return next;
}

export function getCategoryColumns(columns: Column[], category: string): Column[] {
  return columns.filter(c => c.category === category);
}
