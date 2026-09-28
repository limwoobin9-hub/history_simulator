import regions from './regions.js';

export const REGIONS = regions;
export const REGION_BY_ID = new Map(regions.map(region => [region[0], region]));
export const OWNER_LABELS = {
  FRA: '프랑스', GER: '독일', GBR: '영국', ITA: '이탈리아', ESP: '스페인',
  SOV: '소련', AUT: '오스트리아', CZE: '체코슬로바키아', SVK: '슬로바키아',
  POL: '폴란드', YUG: '유고슬라비아', FIN: '핀란드', EST: '에스토니아',
  LVA: '라트비아', LTU: '리투아니아', ROU: '루마니아', HUN: '헝가리',
  BEL: '벨기에', NLD: '네덜란드', CHE: '스위스', DNK: '덴마크',
  SWE: '스웨덴', NOR: '노르웨이', PRT: '포르투갈', IRL: '아일랜드',
  GRC: '그리스', TUR: '튀르키예', ALB: '알바니아', BGR: '불가리아'
};
export const OWNER_COLORS = {
  FRA:'#587aae', GER:'#a46569', GBR:'#7893a4', ITA:'#b48d60', ESP:'#b99473',
  SOV:'#9b6970', AUT:'#bcb297', CZE:'#8eaa93', SVK:'#91ad8e', POL:'#b7a397',
  YUG:'#8b9ea7', FIN:'#9cb9c6', EST:'#899ba7', LVA:'#a6878a', LTU:'#b6a483',
  ROU:'#b49b6e', HUN:'#aaa078', BEL:'#8e9e82', NLD:'#b29277', CHE:'#a77677',
  DNK:'#8ba797', SWE:'#8fabc0', NOR:'#8da4ad', PRT:'#b69079', IRL:'#92a88d',
  GRC:'#829fb8', TUR:'#a48e77', ALB:'#968f83', BGR:'#9aa485'
};
const historicalOwner = { DEU:'GER', UKR:'SOV', BLR:'SOV', RUS:'SOV',
  HRV:'YUG', SRB:'YUG', BIH:'YUG', SVN:'YUG', SVK:'CZE' };
export function initialOwner(region) {
  if (region[0] === 'RUS-2324') return 'GER'; // East Prussia, now Kaliningrad.
  return historicalOwner[region[2]] || region[2];
}
export function ownerOf(state, region) {
  return state.territory?.overrides?.[region[0]] || initialOwner(region);
}
export function transferRegion(state, id, owner) {
  if (!REGION_BY_ID.has(id) || !OWNER_LABELS[owner]) return state;
  const next = structuredClone(state);
  next.territory ||= { overrides: {} };
  next.territory.overrides[id] = owner;
  return next;
}
export function transferCountry(state, country, owner) {
  let next = state;
  for (const region of REGIONS) {
    // Player edits take precedence over scheduled historical events.
    if (region[2] === country && !state.territory?.overrides?.[region[0]]) next = transferRegion(next, region[0], owner);
  }
  return next;
}
export function validTerritory(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) &&
    value.overrides && typeof value.overrides === 'object' && !Array.isArray(value.overrides) &&
    Object.keys(value.overrides).length <= REGIONS.length &&
    Object.entries(value.overrides).every(([id, owner]) => REGION_BY_ID.has(id) && OWNER_LABELS[owner]));
}
