/**
 * 匹配服务（业务逻辑层）
 * 负责：根据条件匹配用户、计算匹配度分数
 */

import type { Row, MatchCondition } from '../data/types';

export function matchRows(rows: Row[], conditions: MatchCondition[]): { row: Row; score: number; matches: string[] }[] {
  return rows.map(row => {
    let score = 0;
    const matches: string[] = [];
    for (const cond of conditions) {
      if (!cond.column || !cond.value) continue;
      const val = String(row.data?.[cond.column as keyof typeof row.data] || '').toLowerCase();
      const search = cond.value.toLowerCase();

      if (cond.column === 'age' && search.includes('-')) {
        const [min, max] = search.split('-').map(Number);
        const age = Number(val);
        if (!isNaN(age) && !isNaN(min) && !isNaN(max) && age >= min && age <= max) {
          score += 1;
          matches.push(`${cond.column}:${cond.value}`);
        }
      } else if (cond.column === 'age' && (search.startsWith('>') || search.startsWith('<'))) {
        const age = Number(val);
        const cmp = Number(search.slice(1));
        if (!isNaN(age) && !isNaN(cmp)) {
          if (search.startsWith('>') && age > cmp) { score += 1; matches.push(`${cond.column}:${cond.value}`); }
          if (search.startsWith('<') && age < cmp) { score += 1; matches.push(`${cond.column}:${cond.value}`); }
        }
      } else if (val.includes(search)) {
        score += 1;
        matches.push(`${cond.column}:${cond.value}`);
      }
    }
    return { row, score, matches };
  }).sort((a, b) => b.score - a.score);
}
