/**
 * 数据类型定义（纯类型，无业务逻辑）
 */

export interface Row {
  id: string;
  user_id?: string;
  deposit: number;
  createdAt: number;
  data?: {
    name: string;
    gender: string;
    age: number | string;
    height: number | string;
    weight: string;
    skinTone: string;
    zodiac: string;
    bloodType: string;
    city: string;
    marriage: string;
    children: string;
    education: string;
    job: string;
    income: string;
    house: string;
    car: string;
    faceType: string;
    eyeType: string;
    mouthType: string;
    bodyType: string;
    hobbies: string;
    food: string;
    sport: string;
    music: string;
    smoke: string;
    drink: string;
    religion: string;
    pet: string;
    personality: string;
    expectation: string;
    contact: string;
    interestTags: string;
    purpose: string;
  };
}

export interface Column {
  key: string;
  label: string;
  type: 'text' | 'select' | 'tags';
  options?: string[];
  category?: string;
}

export interface MatchCondition {
  column: string;
  value: string;
}
