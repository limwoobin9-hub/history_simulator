import regions from './regions.js';
import mapchartStates from './mapchart.js';

export const REGIONS = regions;
export const MAPCHART_STATES = mapchartStates;
export const MAPCHART_BY_ID = new Map(mapchartStates.map(state => [state[0], state]));
export const REGION_BY_ID = new Map(regions.map(region => [region[0], region]));
export const OWNER_LABELS = {
  FRA: '프랑스', GER: '독일', GBR: '영국', ITA: '이탈리아', ESP: '스페인',
  SOV: '소련', AUT: '오스트리아', CZE: '체코슬로바키아', SVK: '슬로바키아',
  POL: '폴란드', YUG: '유고슬라비아', FIN: '핀란드', EST: '에스토니아',
  LVA: '라트비아', LTU: '리투아니아', ROU: '루마니아', HUN: '헝가리',
  BEL: '벨기에', NLD: '네덜란드', CHE: '스위스', DNK: '덴마크',
  SWE: '스웨덴', NOR: '노르웨이', PRT: '포르투갈', IRL: '아일랜드',
  GRC: '그리스', TUR: '튀르키예', ALB: '알바니아', BGR: '불가리아',
  LUX: '룩셈부르크', DAN: '단치히', MLT: '몰타', CYP: '키프로스',
  MOR: '모로코', IRQ: '이라크', SYR: '시리아', IRN: '이란',
  LBN: '레바논', PAL: '팔레스타인 위임통치령', JOR: '트란스요르단', KWT: '쿠웨이트'
};
export const OWNER_COLORS = {
  FRA:'#587aae', GER:'#a46569', GBR:'#7893a4', ITA:'#b48d60', ESP:'#b99473',
  SOV:'#9b6970', AUT:'#bcb297', CZE:'#8eaa93', SVK:'#91ad8e', POL:'#b7a397',
  YUG:'#8b9ea7', FIN:'#9cb9c6', EST:'#899ba7', LVA:'#a6878a', LTU:'#b6a483',
  ROU:'#b49b6e', HUN:'#aaa078', BEL:'#8e9e82', NLD:'#b29277', CHE:'#a77677',
  DNK:'#8ba797', SWE:'#8fabc0', NOR:'#8da4ad', PRT:'#b69079', IRL:'#92a88d',
  GRC:'#829fb8', TUR:'#a48e77', ALB:'#968f83', BGR:'#9aa485',
  LUX:'#c4af91', DAN:'#d7b991', IRQ:'#bba57a', IRN:'#a1937a'
};
Object.assign(OWNER_COLORS, {
  LBN:'#9aaeb2', PAL:'#a2aaa0', JOR:'#ad9c7a', KWT:'#adad86'
});
export const MAPCHART_COLORS = Object.fromEntries(mapchartStates.map(item => [item[2], item[3]]));
export const OWNER_OPTIONS = [
  ...Object.entries(OWNER_LABELS),
  ...Object.keys(MAPCHART_COLORS).filter(id => !Object.hasOwn(OWNER_LABELS, id)).sort().map(id => [id, id])
];
const knownOwner = id => OWNER_OPTIONS.some(([value]) => value === id);
export const HISTORIC_OWNER = {
  200:'GBR',205:'IRL',210:'NLD',211:'BEL',212:'LUX',220:'FRA',225:'CHE',
  230:'ESP',235:'PRT',255:'GER',290:'POL',291:'DAN',305:'AUT',310:'HUN',
  315:'CZE',325:'ITA',338:'GBR',339:'ALB',345:'YUG',350:'GRC',352:'GBR',
  355:'BGR',360:'ROU',365:'SOV',366:'EST',367:'LVA',368:'LTU',375:'FIN',
  380:'SWE',385:'NOR',390:'DNK',600:'FRA',602:'ESP',615:'FRA',616:'FRA',
  640:'TUR',652:'FRA'
};
export function historicOwnerOf(state, country) {
  return state.territory?.countries?.[country[0]] || HISTORIC_OWNER[country[0]] || 'GBR';
}
export function mapchartOwnerOf(state, region) {
  return state.territory?.mapchartOverrides?.[region[0]] ||
    state.territory?.mapchartEvents?.[region[0]] ||
    state.territory?.mapchartCountries?.[region[2]] || region[2];
}
export function transferMapchartState(state, id, owner) {
  if (!MAPCHART_BY_ID.has(id) || !knownOwner(owner)) return state;
  const next = structuredClone(state);
  next.territory.mapchartOverrides ||= {};
  next.territory.mapchartOverrides[id] = owner;
  return next;
}
export function transferMapchartGroup(state, ids, owner) {
  if (!knownOwner(owner) || ids.some(id => !MAPCHART_BY_ID.has(id))) return state;
  const next = structuredClone(state);
  next.territory.mapchartEvents ||= {};
  for (const id of ids) next.territory.mapchartEvents[id] = owner;
  return next;
}
export function provinceOwnerOf(state, country, region) {
  return state.territory?.overrides?.[`${country[0]}:${region[0]}`] ||
    state.territory?.overrides?.[region[0]] || historicOwnerOf(state, country);
}
const historicalOwner = { DEU:'GER', UKR:'SOV', BLR:'SOV', RUS:'SOV',
  HRV:'YUG', SRB:'YUG', BIH:'YUG', SVN:'YUG', SVK:'CZE' };
export function initialOwner(region) {
  if (region[0] === 'RUS-2324') return 'GER'; // East Prussia, now Kaliningrad.
  return historicalOwner[region[2]] || region[2];
}
export function ownerOf(state, region) {
  const initial = initialOwner(region);
  return state.territory?.overrides?.[region[0]] ||
    state.territory?.overrides?.[`315:${region[0]}`] ||
    state.territory?.mapchartCountries?.[initial] || initial;
}
export function transferRegion(state, id, owner) {
  const [historicalCode, regionId] = id.includes(':') ? id.split(':') : [null, id];
  if ((historicalCode && !HISTORICAL_BY_ID.has(historicalCode)) ||
      !REGION_BY_ID.has(regionId) || !OWNER_LABELS[owner]) return state;
  const next = structuredClone(state);
  next.territory ||= { overrides: {} };
  next.territory.overrides[id] = owner;
  return next;
}
export function transferCountry(state, country, owner) {
  const next = structuredClone(state);
  next.territory ||= { overrides: {} };
  next.territory.countries ||= {};
  next.territory.mapchartCountries ||= {};
  if (MAPCHART_STATES.some(item => item[2] === country)) next.territory.mapchartCountries[country] = owner;
  const historicId = Object.keys(HISTORIC_OWNER).find(id => HISTORIC_OWNER[id] === country);
  if (historicId) next.territory.countries[historicId] = owner;
  else if (country === 'SVK') {
    // Slovakia belongs to Czechoslovakia in 1936, but splits in this branch.
    for (const region of REGIONS) if (region[2] === 'SVK' &&
      !next.territory.overrides[region[0]] &&
      !next.territory.overrides[`315:${region[0]}`]) {
      next.territory.overrides[`315:${region[0]}`] = owner;
    }
    next.territory.mapchartEvents ||= {};
    for (const id of ['Western_Slovakia', 'Eastern_Slovakia'])
      next.territory.mapchartEvents[id] = owner;
  }
  return next;
}
export function validTerritory(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) &&
    value.overrides && typeof value.overrides === 'object' && !Array.isArray(value.overrides) &&
    Object.keys(value.overrides).length <= REGIONS.length * 2 &&
    Object.entries(value.overrides).every(([id, owner]) => {
      const [historicId, regionId] = id.includes(':') ? id.split(':') : [null, id];
      return (!historicId || HISTORIC_OWNER[historicId]) && REGION_BY_ID.has(regionId) && OWNER_LABELS[owner];
    }) && (!value.countries || (typeof value.countries === 'object' &&
      !Array.isArray(value.countries) &&
      Object.entries(value.countries).every(([id, owner]) => HISTORIC_OWNER[id] && OWNER_LABELS[owner]))) &&
    ['mapchartOverrides','mapchartEvents'].every(key => !value[key] ||
      (typeof value[key] === 'object' && !Array.isArray(value[key]) &&
       Object.keys(value[key]).length <= MAPCHART_STATES.length &&
       Object.entries(value[key]).every(([id, owner]) => MAPCHART_BY_ID.has(id) && knownOwner(owner)))) &&
    (!value.mapchartCountries || (typeof value.mapchartCountries === 'object' &&
      !Array.isArray(value.mapchartCountries) &&
      Object.entries(value.mapchartCountries).every(([id, owner]) => knownOwner(id) && knownOwner(owner)))));
}
