import { transferCountry, validTerritory } from './territory.js';

export const COUNTRIES = {
  FRA: { name: '프랑스', flag: '🇫🇷', government: '제3공화국', relation: 100, color: '#526da3' },
  GER: { name: '독일', flag: '🇩🇪', government: '국가사회주의 체제', relation: -42, color: '#ad6564' },
  GBR: { name: '영국', flag: '🇬🇧', government: '입헌군주제', relation: 52, color: '#6a88aa' },
  ITA: { name: '이탈리아', flag: '🇮🇹', government: '파시스트 체제', relation: -18, color: '#a28c60' },
  ESP: { name: '스페인', flag: '🇪🇸', government: '제2공화국', relation: 12, color: '#a38972' },
  SOV: { name: '소련', flag: '🇷🇺', government: '사회주의 연방', relation: 8, color: '#8e6b6e' }
};
const bounded = (value, low, high) => Math.max(low, Math.min(high, value));
const rounded = value => Math.round(value * 10) / 10;
const initialRelations = () => Object.fromEntries(Object.entries(COUNTRIES).filter(([id]) => id !== 'FRA').map(([id, country]) => [id, country.relation]));

export function newGame() {
  return {
    version: 2, year: 1936, month: 1, turn: 0, selected: 'FRA',
    treasury: 16, debt: 35, gdp: 185, growth: 0, income: 0, expenses: 0,
    stability: 56, approval: 48, unemployment: 11.3, inflation: 2.1, politicalPower: 68,
    industry: 58, equipment: 82, divisions: 28, manpower: 350, tension: 17,
    tax: 28, industryBudget: 28, welfareBudget: 24, militaryBudget: 28,
    relations: initialRelations(), flags: {}, pendingEvent: null, territory: { overrides: {}, countries: {} },
    log: [{ date: '1936.01', text: '프랑스 제3공화국의 새해가 시작되었다.', type: 'news' }],
    history: [{ date: '1936.01', treasury: 16, gdp: 185, unemployment: 11.3, stability: 56 }]
  };
}
export const dateLabel = s => `${s.year}.${String(s.month).padStart(2, '0')}`;
function record(s, text, type = 'info') { s.log.unshift({ date: dateLabel(s), text, type }); s.log = s.log.slice(0, 35); }
const event = (id, title, eyebrow, body, choices) => ({ id, title, eyebrow, body, choices });
const EVENTS = [
  event('rhineland', '독일군, 라인란트 진주', '1936년 3월 · 유럽의 위기', '독일군이 비무장지대인 라인란트에 진입했다. 영국과의 협의, 강경 대응, 묵인 중 하나를 결정해야 한다.', [
    { label: '즉각 철수를 요구한다', hint: '긴장도 +8 · 안정도 −3 · 독일 관계 −25', effects: { tension: 8, stability: -3, politicalPower: -8, 'relations.GER': -25 }, flags: { rhineland: 'firm' } },
    { label: '영국과 공동 대응을 논의한다', hint: '영국 관계 +12 · 정치력 −16', effects: { politicalPower: -16, 'relations.GBR': 12, 'relations.GER': -8 }, flags: { rhineland: 'joint' } },
    { label: '군사 행동은 피한다', hint: '안정도 +2 · 독일 관계 +5', effects: { stability: 2, 'relations.GER': 5, approval: -2 }, flags: { rhineland: 'passive' } }
  ]),
  event('election', '인민전선, 총선에서 승리', '1936년 5월 · 의회', '좌파 연합의 승리로 새 내각 구성이 시작된다. 개혁 속도를 결정해야 한다.', [
    { label: '노동 개혁을 추진한다', hint: '지지도 +8 · 안정도 +3 · 국고 −3', effects: { approval: 8, stability: 3, treasury: -3, welfareBudget: 6 }, flags: { cabinet: 'reform' } },
    { label: '재정과 정국의 균형을 택한다', hint: '정치력 +10 · 지지도 +2', effects: { politicalPower: 10, approval: 2 }, flags: { cabinet: 'moderate' } }
  ]),
  event('matignon', '마티뇽 협정의 시간', '1936년 6월 · 노동', '파업 물결 속에서 노동계와 사용자 단체가 협상에 들어갔다. 임금과 휴가의 미래가 걸려 있다.', [
    { label: '유급휴가와 임금 인상을 지지한다', hint: '지지도 +9 · 산업 −2 · 소비 진작', effects: { approval: 9, stability: 4, industry: -2, unemployment: -0.4, treasury: -2 }, flags: { matignon: 'signed' } },
    { label: '협상 범위를 제한한다', hint: '산업 +2 · 안정도 −5', effects: { industry: 2, stability: -5, approval: -6 }, flags: { matignon: 'limited' } }
  ]),
  event('spain', '스페인에 내전이 발발하다', '1936년 7월 · 외교', '피레네 너머의 전쟁이 프랑스 외교를 흔든다. 개입은 국내 여론과 유럽 정세에도 영향을 준다.', [
    { label: '공화국에 비공식 지원을 보낸다', hint: '국고 −3 · 긴장도 +5 · 스페인 관계 +20', effects: { treasury: -3, tension: 5, 'relations.ESP': 20, equipment: -5 }, flags: { spain: 'aid' } },
    { label: '불간섭 방침을 택한다', hint: '안정도 +2 · 정치력 +6', effects: { stability: 2, politicalPower: 6 }, flags: { spain: 'neutral' } }
  ]),
  event('franc', '프랑화와 경기 침체', '1936년 9월 · 경제', '재정 압박과 불안정한 수출이 정책 전환을 요구한다.', [
    { label: '평가절하로 수출을 돕는다', hint: '산업 +4 · 물가 +2.3', effects: { industry: 4, inflation: 2.3, approval: -2 }, flags: { franc: 'devalue' } },
    { label: '통화 안정을 우선한다', hint: '물가 −0.8 · 실업률 +0.5', effects: { inflation: -0.8, unemployment: 0.5, politicalPower: -7 }, flags: { franc: 'defend' } }
  ]),
  event('rhineland_aftermath', '라인란트 위기의 후속 협상', '1937년 2월 · 외교', '지난해의 결정이 다시 외교 테이블에 올라왔다.', [
    { label: '안보 협의를 강화한다', hint: '영국 관계 +8 · 국고 −2', effects: { 'relations.GBR': 8, treasury: -2, stability: 2 }, flags: { security: 'cooperate' } },
    { label: '국내 문제에 집중한다', hint: '정치력 +8 · 긴장도 +2', effects: { politicalPower: 8, tension: 2 }, flags: { security: 'domestic' } }
  ]),
  event('anschluss', '오스트리아 합병 위기', '1938년 3월 · 중부 유럽', '독일의 오스트리아 합병 시도가 유럽의 지도를 바꾸려 한다. 프랑스의 대응을 선택하라.', [
    { label: '영국과 항의하되 군사 개입은 하지 않는다', hint: '오스트리아의 주권 상실 · 긴장도 +7', effects: { tension: 7, 'relations.GER': -12 }, flags: { anschluss: 'accepted' }, transfers: [['AUT','GER']] },
    { label: '군사적 억제를 선언한다', hint: '가상 역사: 합병 저지 · 안정도 −5 · 긴장도 +15', effects: { stability: -5, tension: 15, politicalPower: -20, 'relations.GER': -30 }, flags: { anschluss: 'resisted' } }
  ]),
  event('prague', '체코슬로바키아의 운명', '1939년 3월 · 중부 유럽', '독일의 영토 요구가 커지고 있다. 프랑스가 지원할지 결정해야 한다.', [
    { label: '개입하지 않는다', hint: '체코 지역의 독일 점령 · 긴장도 +12', effects: { tension: 12, 'relations.GER': -15 }, flags: { prague: 'occupied' }, transfers: [['CZE','GER'],['SVK','SVK']] },
    { label: '체코슬로바키아를 지지한다', hint: '가상 역사: 국경 유지 · 긴장도 +16 · 정치력 −25', effects: { tension: 16, politicalPower: -25 }, flags: { prague: 'defended' } }
  ])
];

export function applyChoice(state, choiceIndex) {
  if (!state.pendingEvent) return state;
  const next = structuredClone(state);
  const active = EVENTS.find(item => item.id === next.pendingEvent);
  const choice = active?.choices[choiceIndex];
  if (!choice) return state;
  for (const [key, value] of Object.entries(choice.effects)) {
    if (key.startsWith('relations.')) { const country = key.split('.')[1]; next.relations[country] = bounded(next.relations[country] + value, -100, 100); }
    else next[key] += value;
  }
  Object.assign(next.flags, choice.flags);
  for (const [country, owner] of choice.transfers || []) {
    Object.assign(next, transferCountry(next, country, owner));
  }
  next.flags['event_' + active.id] = true;
  next.pendingEvent = null;
  normalize(next);
  record(next, `${active.title}: ${choice.label}`, 'decision');
  return next;
}

function normalize(s) {
  for (const key of ['stability', 'approval', 'politicalPower', 'industry']) s[key] = bounded(rounded(s[key]), 0, 100);
  s.tension = bounded(rounded(s.tension), 0, 100);
  s.unemployment = bounded(rounded(s.unemployment), 0, 40);
  s.inflation = bounded(rounded(s.inflation), -5, 50);
  s.equipment = Math.max(0, rounded(s.equipment));
  s.manpower = Math.max(0, rounded(s.manpower));
  s.treasury = rounded(s.treasury);
  s.debt = rounded(s.debt);
  s.gdp = Math.max(1, rounded(s.gdp));
}
export function setPolicy(state, key, value) {
  const ranges = { tax: [10, 50], industryBudget: [5, 55], welfareBudget: [5, 55], militaryBudget: [5, 55] };
  if (!ranges[key] || state.pendingEvent || !Number.isFinite(Number(value))) return state;
  const next = structuredClone(state);
  next[key] = bounded(Math.round(Number(value)), ...ranges[key]);
  return next;
}
export function takeAction(state, action, target) {
  if (state.pendingEvent) return { state, error: '먼저 역사적 선택을 결정하세요.' };
  const next = structuredClone(state);
  if (action === 'factory') {
    if (next.treasury < 4 || next.politicalPower < 8) return { state, error: '국고 4와 정치력 8이 필요합니다.' };
    next.treasury -= 4; next.politicalPower -= 8; next.industry += 4; record(next, '산업 투자: 생산 기반이 확장되었다.', 'decision');
  } else if (action === 'recruit') {
    if (next.treasury < 2 || next.equipment < 8 || next.manpower < 12) return { state, error: '국고 2, 장비 8, 인력 12가 필요합니다.' };
    next.treasury -= 2; next.equipment -= 8; next.manpower -= 12; next.divisions += 1; record(next, '신규 사단 편성 완료.', 'decision');
  } else if (action === 'diplomacy' && next.relations[target] !== undefined) {
    if (next.politicalPower < 12) return { state, error: '정치력 12가 필요합니다.' };
    next.politicalPower -= 12; next.relations[target] = bounded(next.relations[target] + 9, -100, 100); record(next, `${COUNTRIES[target].name}에 외교 사절단을 파견했다.`, 'decision');
  } else return { state, error: '실행할 수 없는 행동입니다.' };
  normalize(next);
  return { state: next };
}

export function advanceMonth(state) {
  if (state.pendingEvent) return state;
  const s = structuredClone(state);
  s.turn++;
  s.month++;
  if (s.month === 13) { s.month = 1; s.year++; }
  // Each figure is a deliberately simplified game model, not a historical statistic.
  const taxFactor = s.tax / 28;
  const monthlyRevenue = s.gdp * 0.013 * taxFactor * (1 - s.unemployment / 100);
  const monthlySpend = 1.5 + (s.industryBudget + s.welfareBudget + s.militaryBudget) * 0.014;
  s.income = rounded(monthlyRevenue); s.expenses = rounded(monthlySpend);
  s.treasury += monthlyRevenue - monthlySpend;
  if (s.treasury < 0) { s.debt += -s.treasury; s.treasury = 0; }
  const demand = (s.welfareBudget - 24) * 0.014 - (s.tax - 28) * 0.012;
  const production = (s.industryBudget - 28) * 0.017 + (s.industry - 58) * 0.008;
  s.growth = rounded(bounded(0.12 + demand + production - Math.max(0, s.inflation - 5) * 0.025, -1.5, 1.5));
  s.gdp *= 1 + s.growth / 100;
  s.unemployment -= s.growth * 0.16 + (s.industryBudget - 28) * 0.007;
  s.inflation += (s.welfareBudget - 24) * 0.009 - (s.tax - 28) * 0.007 - 0.012;
  s.industry += (s.industryBudget - 20) * 0.019;
  s.equipment += 2 + s.industry * 0.025 + s.militaryBudget * 0.02 - s.divisions * 0.06;
  s.manpower += 0.7;
  s.approval += (s.welfareBudget - 24) * 0.025 - (s.tax - 28) * 0.065 - Math.max(0, s.unemployment - 11) * 0.05;
  s.stability += (s.approval - 48) * 0.014 - Math.max(0, s.tension - 25) * 0.009;
  s.politicalPower += 5 + (s.stability - 50) * 0.014;
  if (s.year === 1936 && s.month === 10 && s.flags.spain === 'aid') {
    s.relations.GER = bounded(s.relations.GER - 4, -100, 100);
    record(s, '스페인 지원을 둘러싼 독일과의 관계가 악화되었다.', 'news');
  }
  if (s.year === 1937 && s.month === 1) { s.tension += 2; record(s, '유럽 각국의 재무장으로 긴장이 높아졌다.', 'news'); }
  normalize(s);
  const active = EVENTS.find(e => !s.flags['event_' + e.id] && (
    e.id === 'rhineland_aftermath' ? s.year === 1937 && s.month === 2 && Boolean(s.flags.rhineland) :
    ({ rhineland: [1936, 3], election: [1936, 5], matignon: [1936, 6], spain: [1936, 7], franc: [1936, 9], anschluss: [1938, 3], prague: [1939, 3] }[e.id]?.join('-') === [s.year, s.month].join('-'))
  ));
  if (active) { s.pendingEvent = active.id; record(s, `${active.title} — 결정 대기 중`, 'event'); }
  s.history.push({ date: dateLabel(s), treasury: s.treasury, gdp: s.gdp, unemployment: s.unemployment, stability: s.stability });
  s.history = s.history.slice(-36);
  return s;
}
export const getEvent = id => EVENTS.find(e => e.id === id);
export function upgradeSave(raw) {
  if (!isValidSave(raw)) return null;
  if (raw.version === 2) return raw;
  return { ...raw, version: 2, territory: { overrides: {}, countries: {} } };
}
export function isValidSave(raw) {
  if (!raw || ![1, 2].includes(raw.version) || (raw.version === 2 && !validTerritory(raw.territory)) ||
      !Number.isInteger(raw.year) || raw.year < 1936 ||
      !Number.isInteger(raw.month) || raw.month < 1 || raw.month > 12 || !Number.isInteger(raw.turn) || raw.turn < 0 ||
      typeof raw.flags !== 'object' || raw.flags === null || Array.isArray(raw.flags) ||
      typeof raw.relations !== 'object' || raw.relations === null ||
      !Array.isArray(raw.log) || raw.log.length > 100 || !Array.isArray(raw.history) || raw.history.length > 100) return false;
  const numbers = ['treasury', 'debt', 'gdp', 'growth', 'income', 'expenses', 'stability', 'approval', 'unemployment',
    'inflation', 'politicalPower', 'industry', 'equipment', 'divisions', 'manpower', 'tension',
    'tax', 'industryBudget', 'welfareBudget', 'militaryBudget'];
  return numbers.every(k => typeof raw[k] === 'number' && Number.isFinite(raw[k])) &&
    ['GER', 'GBR', 'ITA', 'ESP', 'SOV'].every(k => Number.isFinite(raw.relations[k])) &&
    raw.log.every(e => typeof e?.date === 'string' && typeof e?.text === 'string' && e.text.length < 1000) &&
    raw.history.every(e => typeof e?.date === 'string' && ['treasury', 'gdp', 'unemployment', 'stability'].every(k => Number.isFinite(e[k]))) &&
    (raw.pendingEvent === null || Boolean(getEvent(raw.pendingEvent)));
}
