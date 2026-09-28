import { newGame, advanceMonth, applyChoice, setPolicy, takeAction, getEvent, dateLabel, COUNTRIES, isValidSave, upgradeSave } from './engine.js';
import { REGIONS, REGION_BY_ID, HISTORICAL_COUNTRIES, HISTORICAL_BY_ID, HISTORIC_OWNER, OWNER_LABELS, OWNER_COLORS, historicOwnerOf, provinceOwnerOf, transferRegion } from './territory.js';
import { currentUser, logout, register, login, saveCloud, loadCloud, listCloud } from './cloud.js';

const $ = selector => document.querySelector(selector);
const money = n => `${Number(n).toFixed(1)}억 ₣`;
const signed = n => `${n >= 0 ? '+' : ''}${Number(n).toFixed(1)}`;
const escapeHTML = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const slots = [1, 2, 3];
let game = newGame();
let view = 'overview';
let modal = null;
let toastTimer;
let selectedCountry = 'GER';
let selectedRegion = null;
let mapMode = 'province';
let mapBox = { x: 0, y: 0, w: 510, h: 333 };
const mapPath = rings => rings.map(ring => 'M' + ring.map(([lon, lat]) => `${((lon + 12) * 10).toFixed(1)},${((72 - lat) * 9).toFixed(1)}`).join('L') + 'Z').join('');
const regionPaths = REGIONS.map(region => mapPath(region[3]));
const countryPaths = HISTORICAL_COUNTRIES.map(country => country[2].map(poly => mapPath(poly)).join(''));
function bounds(rings) { let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity; for (const ring of rings) for (const [x,y] of ring) { minX = Math.min(minX,x); maxX = Math.max(maxX,x); minY = Math.min(minY,y); maxY = Math.max(maxY,y); } return [minX,minY,maxX,maxY]; }
const regionBounds = REGIONS.map(region => bounds(region[3]));
const countryBounds = HISTORICAL_COUNTRIES.map(country => bounds(country[2].flat()));
const fragmentCandidates = HISTORICAL_COUNTRIES.map((_,index) => REGIONS.map((__,ri) => ri).filter(ri => {
  const [ax,ay,bx,by] = regionBounds[ri], [cx,cy,dx,dy] = countryBounds[index];
  return ax <= dx && bx >= cx && ay <= dy && by >= cy;
}));
let cloudSlots = [];
const STORAGE_KEY = 'state-of-history-v1-slot-';

function toast(text) { const el = $('#toast'); el.textContent = text; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3300); }
async function openSlots(mode) { modal = mode; cloudSlots = []; showModal(); if (currentUser()) { try { cloudSlots = await listCloud(); if (modal === mode) showModal(); } catch (e) { toast(`클라우드 슬롯을 읽을 수 없습니다: ${e.message}`); } } }
const metric = (label, value, trend = '', tone = '') => `<div class="metric"><span>${label}</span><strong class="${tone}">${escapeHTML(value)}</strong><small>${escapeHTML(trend)}</small></div>`;
const bar = (value, tone = '') => `<div class="progress"><span class="${tone}" style="width:${Math.max(0, Math.min(100, value))}%"></span></div>`;
const sectionTitle = (index, title, note) => `<div class="section-title"><span class="eyebrow">${index}</span><h2>${title}</h2>${note ? `<p>${note}</p>` : ''}</div>`;
function chart(key, label, unit = '') {
  const rows = game.history.slice(-13);
  const values = rows.map(row => Number(row[key]));
  const min = Math.min(...values) - 1, max = Math.max(...values) + 1;
  const points = values.map((v, i) => `${10 + i * 280 / Math.max(1, values.length - 1)},${110 - ((v - min) / (max - min)) * 88}`).join(' ');
  return `<div class="chart"><div class="chart-head"><span>${label}</span><strong>${values.at(-1).toFixed(1)}${unit}</strong></div><svg role="img" aria-label="${label} 최근 ${rows.length}개월 추이" viewBox="0 0 300 125" preserveAspectRatio="none"><line x1="0" y1="110" x2="300" y2="110" stroke="#334451"/><line x1="0" y1="66" x2="300" y2="66" stroke="#263745"/><polyline points="${points}" fill="none" stroke="#d8b677" stroke-width="2.3" vector-effect="non-scaling-stroke" stroke-linejoin="round"/><circle cx="${points.split(' ').at(-1).split(',')[0]}" cy="${points.split(' ').at(-1).split(',')[1]}" r="4" fill="#e8c887"/></svg><div class="chart-foot"><span>${rows[0].date}</span><span>${rows.at(-1).date}</span></div></div>`;
}
function statPanel() { return `<div class="stats-grid">${metric('국고', money(game.treasury), '월간 수지 ' + signed(game.income - game.expenses) + '억 ₣', game.treasury < 4 ? 'negative' : '')}${metric('국내총생산', `${game.gdp.toFixed(1)}억 ₣`, '월간 성장률 ' + signed(game.growth) + '%')}${metric('정치 안정도', `${game.stability.toFixed(0)}%`, '정부 운영의 기반', game.stability < 35 ? 'negative' : '')}${metric('세계 긴장도', `${game.tension.toFixed(0)}%`, '유럽 전역', game.tension > 50 ? 'negative' : '')}</div>`; }

function mapHTML() {
  const date = `${game.year}-${String(game.month).padStart(2, '0')}-01`;
  const historicalURL = `https://embed.openhistoricalmap.org/#map=4/49/14&date=${date}&layer=O`;
  const [countryCode, regionCode] = selectedRegion?.split(':') || [];
  const country = HISTORICAL_BY_ID.get(countryCode), region = REGION_BY_ID.get(regionCode);
  const owner = country && region ? provinceOwnerOf(game,country,region) : null;
  const caption = region ? `${region[1]} · ${OWNER_LABELS[owner] || owner}` : '지역을 클릭해 소유권을 확인하고 변경하세요';
  const defs = HISTORICAL_COUNTRIES.map((item,i) => `<clipPath id="historic-${item[0]}" clipPathUnits="userSpaceOnUse"><path d="${countryPaths[i]}" clip-rule="evenodd"/></clipPath>`).join('');
  const land = HISTORICAL_COUNTRIES.map((item,i) => {
    const countryOwner = historicOwnerOf(game,item);
    const fragments = fragmentCandidates[i].map(ri => {
      const province = REGIONS[ri], provinceOwner = provinceOwnerOf(game,item,province);
      const id = `${item[0]}:${province[0]}`;
      return `<path class="map-region ${id === selectedRegion ? 'selected' : ''}" data-region="${id}" tabindex="0" role="button" aria-label="${escapeHTML(province[1])}, ${escapeHTML(OWNER_LABELS[provinceOwner] || provinceOwner)}" d="${regionPaths[ri]}" fill="${provinceOwner === countryOwner ? 'transparent' : (OWNER_COLORS[provinceOwner] || '#758b93')}" fill-rule="evenodd"><title>${escapeHTML(province[1])} · ${escapeHTML(OWNER_LABELS[provinceOwner] || provinceOwner)}</title></path>`;
    }).join('');
    return `<g><path class="historical-country" d="${countryPaths[i]}" fill="${OWNER_COLORS[countryOwner] || '#758b93'}" fill-rule="evenodd" aria-label="${escapeHTML(item[1])}"/><g clip-path="url(#historic-${item[0]})">${fragments}</g></g>`;
  }).join('');
  const provinceMap = `<svg class="province-map" viewBox="${mapBox.x} ${mapBox.y} ${mapBox.w} ${mapBox.h}" role="img" aria-label="1936년 국가 경계와 수정 가능한 지역 소유권 지도" preserveAspectRatio="xMidYMid meet"><defs>${defs}</defs><rect x="-1000" y="-1000" width="2500" height="2500" fill="#142f3d"/>${land}</svg><div class="map-zoom"><button data-map-zoom="in" aria-label="지도 확대">+</button><button data-map-zoom="out" aria-label="지도 축소">−</button><button data-map-zoom="reset" aria-label="지도 원래대로">⌖</button></div>`;
  return `<div class="map-frame"><div class="map-top"><span>EUROPE · ${dateLabel(game)}</span><div class="map-switch"><button data-map-mode="province" class="${mapMode === 'province' ? 'active' : ''}">소유권</button><button data-map-mode="historical" class="${mapMode === 'historical' ? 'active' : ''}">역사 지도</button></div></div><div class="map-stage">${mapMode === 'province' ? provinceMap : `<iframe class="historical-map" title="${dateLabel(game)} OpenHistoricalMap 역사 지도" src="${historicalURL}" loading="lazy" referrerpolicy="no-referrer"></iframe>`}</div><div class="map-bottom"><span>${escapeHTML(caption)}</span>${mapMode === 'historical' ? `<a href="${historicalURL}" target="_blank" rel="noopener noreferrer">원본 열기 ↗</a>` : '<span>휠로 확대 · 끌어서 이동</span>'}</div>${mapMode === 'province' && region ? `<div class="territory-edit"><label>지역 소유국 <select data-region-owner="${selectedRegion}">${Object.entries(OWNER_LABELS).map(([id, name]) => `<option value="${id}" ${owner === id ? 'selected' : ''}>${name}</option>`).join('')}</select></label><small>소유권 변경은 게임 저장 데이터에 기록됩니다.</small></div>` : ''}<p class="map-source">국가 윤곽: 1936년 <a href="https://icr.ethz.ch/data/cshapes/beta.html" target="_blank" rel="noopener noreferrer">CShapes 2.1</a> (CC BY-NC-SA 4.0). 내부 지역선: Natural Earth 현대 행정구역. 시대별 지역 경계는 일부 다릅니다.</p></div>`;
}
function countryBrief() { const c = COUNTRIES[selectedCountry]; return `<div class="country-brief"><div class="country-heading"><span class="country-flag">${c.flag}</span><div><span class="eyebrow">선택 국가</span><h3>${c.name}</h3></div></div><div class="detail-row"><span>정체</span><strong>${c.government}</strong></div><div class="detail-row"><span>프랑스와의 관계</span><strong class="${game.relations[selectedCountry] < 0 ? 'negative' : 'positive'}">${game.relations[selectedCountry] > 0 ? '+' : ''}${game.relations[selectedCountry]}</strong></div><button class="secondary full" data-action="diplomacy" data-target="${selectedCountry}">외교 사절 파견 <small>정치력 12</small></button></div>`; }
function overview() { return `${sectionTitle('01 / COMMAND ROOM', '공화국 상황실', '국가의 방향을 정하고, 매달 달라지는 지표를 확인하세요.')}${statPanel()}<div class="content-grid"><div>${mapHTML()}<div class="panel alert-panel"><div><span class="eyebrow">다음 결정</span><h3>${game.pendingEvent ? getEvent(game.pendingEvent).title : '시간은 흐르고 있습니다'}</h3><p>${game.pendingEvent ? '역사적 사건의 선택지를 확인하세요.' : '예산을 조정하고, 외교·산업·군사 행동을 준비하세요.'}</p></div><button class="secondary" data-action="${game.pendingEvent ? 'event' : 'next'}">${game.pendingEvent ? '사건 보기' : '다음 달 진행'} →</button></div></div><div>${countryBrief()}<div class="panel mini-panel"><span class="eyebrow">국가 역량</span><div class="mini-stat"><span>정부 지지도 <b>${game.approval.toFixed(0)}%</b></span>${bar(game.approval)}</div><div class="mini-stat"><span>산업 기반 <b>${game.industry.toFixed(0)}</b></span>${bar(game.industry)}</div><div class="mini-stat"><span>정치력 <b>${game.politicalPower.toFixed(0)}</b></span>${bar(game.politicalPower)}</div></div></div></div>`; }
function slider(key, label, hint, suffix = '%') { return `<label class="slider-row" for="policy-${key}"><span><strong>${label}</strong><small>${hint}</small></span><output id="value-${key}">${game[key]}${suffix}</output><input id="policy-${key}" data-policy="${key}" type="range" min="${key === 'tax' ? 10 : 5}" max="${key === 'tax' ? 50 : 55}" value="${game[key]}" ${game.pendingEvent ? 'disabled' : ''}></label>`; }
function economy() { return `${sectionTitle('02 / ECONOMY', '경제 · 국가 예산', '정책의 결과는 다음 달 경제와 여론에 반영됩니다.')}${statPanel()}<div class="content-grid"><div class="panel"><div class="panel-title"><h3>재정 정책</h3><span class="eyebrow">매월 적용</span></div>${slider('tax', '세율', '세입 증가 · 소비와 지지도 하락 가능')}${slider('industryBudget', '산업 투자', '생산력과 고용을 늘림')}${slider('welfareBudget', '사회 복지', '소비와 지지도를 뒷받침함')}${slider('militaryBudget', '군사 예산', '장비 생산량을 늘림')}<p class="fineprint">예산 항목은 세입의 비율이 아니라 월 지출 수준을 나타내는 게임 지표입니다.</p></div><div><div class="panel balance-panel"><h3>월간 재정</h3><div class="detail-row"><span>세입</span><strong class="positive">+${money(game.income)}</strong></div><div class="detail-row"><span>지출</span><strong class="negative">−${money(game.expenses)}</strong></div><div class="detail-row"><span>국가 부채</span><strong>${money(game.debt)}</strong></div><div class="detail-row"><span>실업률</span><strong>${game.unemployment.toFixed(1)}%</strong></div><div class="detail-row"><span>물가 상승률</span><strong>${game.inflation.toFixed(1)}%</strong></div></div>${chart('gdp', '국내총생산', '억 ₣')}</div></div><div class="panel inline-action"><div><h3>산업 기반 확충</h3><p>국고 4억 ₣와 정치력 8을 투입해 산업 기반을 4 늘립니다.</p></div><button class="secondary" data-action="factory">공장 투자</button></div>`; }
function politics() { return `${sectionTitle('03 / POLITICS', '정치 · 사회', '선거, 노동 협상, 국민의 생활이 정부의 지지도를 바꿉니다.')}<div class="stats-grid three">${metric('정부 지지도', `${game.approval.toFixed(0)}%`, '여론')}${metric('안정도', `${game.stability.toFixed(0)}%`, '정국')}${metric('정치력', game.politicalPower.toFixed(0), '정책과 외교에 사용')}</div><div class="content-grid"><div class="panel"><div class="panel-title"><h3>내각과 정책</h3><span class="eyebrow">FRANCE · 1936</span></div><div class="detail-row"><span>정치 체제</span><strong>제3공화국</strong></div><div class="detail-row"><span>내각의 방향</span><strong>${game.flags.cabinet === 'reform' ? '노동 개혁' : game.flags.cabinet === 'moderate' ? '재정 균형' : '총선 전'}</strong></div><div class="detail-row"><span>노동 협정</span><strong>${game.flags.matignon === 'signed' ? '마티뇽 협정 체결' : game.flags.matignon === 'limited' ? '제한적 합의' : '협상 전'}</strong></div><div class="detail-row"><span>실업률</span><strong>${game.unemployment.toFixed(1)}%</strong></div><p class="panel-note">정부 지지도가 떨어지면 안정도가 서서히 약해집니다. 복지 지출과 세율을 함께 고려하세요.</p></div><div>${chart('stability', '정치 안정도', '%')}${chart('unemployment', '실업률', '%')}</div></div>`; }
function military() { return `${sectionTitle('04 / DEFENSE', '군사 · 생산', '예산과 산업력을 통해 장비를 생산하고 신규 사단을 편성하세요.')}<div class="stats-grid three">${metric('육군 사단', `${game.divisions}개`, '신규 편성 가능')}${metric('장비 비축', `${game.equipment.toFixed(0)} 단위`, '매월 자동 생산')}${metric('가용 인력', `${game.manpower.toFixed(0)}천 명`, '편성 때 소모')}</div><div class="content-grid"><div class="panel"><span class="eyebrow">ARMY COMMAND</span><h3>육군 편성</h3><p class="panel-note">장비 8 단위와 가용 인력 12천 명을 소모해 사단 1개를 편성합니다. 국고 2억 ₣이 추가로 필요합니다.</p><div class="formation"><span>프랑스 육군</span><strong>${game.divisions}개 사단</strong><small>장비 비축 ${game.equipment.toFixed(0)} · 가용 인력 ${game.manpower.toFixed(0)}천 명</small></div><button class="primary" data-action="recruit">신규 사단 편성</button></div><div class="panel"><span class="eyebrow">INDUSTRIAL CAPACITY</span><h3>월간 장비 생산</h3><p class="big-number">${Math.max(0, 2 + game.industry * 0.025 + game.militaryBudget * 0.02 - game.divisions * 0.06).toFixed(1)} <small>단위 / 월</small></p>${bar(game.industry)}<p class="panel-note">산업 기반, 군사 예산이 늘면 생산이 증가하고 기존 사단의 유지에 장비가 들어갑니다.</p><button class="secondary" data-view="economy">예산 조정 →</button></div></div>`; }
function diplomacy() { return `${sectionTitle('05 / DIPLOMACY', '외교 · 유럽 정세', '국가를 선택하고 관계를 살펴보세요. 사절단 파견에는 정치력 12가 필요합니다.')}<div class="content-grid"><div>${mapHTML()}</div><div>${countryBrief()}</div></div><div class="panel section-gap"><h3>국가별 관계</h3><div class="diplomacy-list">${Object.entries(COUNTRIES).filter(([id]) => id !== 'FRA').map(([id, c]) => `<button data-country="${id}" class="diplomacy-row ${id === selectedCountry ? 'current' : ''}"><span>${c.flag} ${c.name}</span><b class="${game.relations[id] < 0 ? 'negative' : 'positive'}">${game.relations[id] >= 0 ? '+' : ''}${game.relations[id]}</b></button>`).join('')}</div></div>`; }
function chronicle() { return `${sectionTitle('06 / HISTORY', '연대기', '당신의 선택과 사건이 이곳에 기록됩니다.')}<div class="content-grid"><div class="panel"><h3>국가의 기록</h3><div class="timeline">${game.log.map(entry => `<div class="timeline-entry ${entry.type}"><time>${escapeHTML(entry.date)}</time><p>${escapeHTML(entry.text)}</p></div>`).join('')}</div></div><div>${chart('treasury', '국고', '억 ₣')}${chart('gdp', '국내총생산', '억 ₣')}<div class="panel"><span class="eyebrow">SCENARIO NOTES</span><h3>역사와 시뮬레이션</h3><p class="panel-note">역사 사건의 날짜와 배경은 1936년 프랑스를 토대로 구성했습니다. 게임의 수치와 결과는 플레이를 위한 단순화 모델이며 실제 역사 통계나 예측이 아닙니다. 국가 윤곽은 1936년 CShapes 자료이며 내부 편집 지역은 현대 행정구역을 역사 국경 안에 잘라 배치해 일부 과거 지역선과 차이가 있습니다. 역사 지도 탭은 OpenHistoricalMap의 날짜별 지도를 보여줍니다.</p></div></div></div>`; }
function rightbar() { $('#world-briefing').innerHTML = `<div class="world-row"><span>세계 긴장도</span><strong class="${game.tension > 50 ? 'negative' : ''}">${game.tension.toFixed(0)}%</strong></div>${bar(game.tension, 'red')}<p class="brief-note">독일의 재무장과 유럽 각국의 정치적 위기가 균형을 흔들고 있습니다.</p><div class="world-row"><span>독일과의 관계</span><strong class="negative">${game.relations.GER}</strong></div><div class="world-row"><span>영국과의 관계</span><strong class="positive">+${game.relations.GBR}</strong></div><div class="world-row"><span>스페인 정세</span><strong>${game.flags.spain ? '내전 발발' : '불안정'}</strong></div>`; $('#recent-log').innerHTML = game.log.slice(0, 5).map(entry => `<div class="recent-entry"><time>${escapeHTML(entry.date)}</time><p>${escapeHTML(entry.text)}</p></div>`).join(''); }
function showModal() {
  const overlay = $('#overlay');
  if (game.pendingEvent) modal = 'event';
  if (!modal) { overlay.classList.add('hidden'); overlay.innerHTML = ''; return; }
  overlay.classList.remove('hidden');
  if (modal === 'event') {
    const e = getEvent(game.pendingEvent);
    overlay.innerHTML = `<div class="modal event-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-rule"></div><span class="eyebrow">${e.eyebrow}</span><h2 id="modal-title">${e.title}</h2><p>${e.body}</p><div class="event-choices">${e.choices.map((c, i) => `<button data-choice="${i}"><strong>${c.label}</strong><small>${c.hint}</small></button>`).join('')}</div><span class="event-foot">선택은 되돌릴 수 없습니다 · ${dateLabel(game)}</span></div>`;
  } else if (modal === 'help') {
    overlay.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="close" data-close aria-label="닫기">×</button><span class="eyebrow">QUICK START</span><h2 id="modal-title">게임 방법</h2><p>당신은 1936년 프랑스 정부를 운영합니다. 경제에서 예산을 조정하고, 군사에서 사단을 편성하고, 외교에서 국가 관계를 개선하세요. <b>다음 달로 진행</b>을 누르면 정책 결과가 계산됩니다. 역사적 사건이 나타나면 하나를 선택해야 시간을 다시 진행할 수 있습니다.</p><p>저장 슬롯은 이 브라우저에 저장됩니다. 브라우저 데이터를 지우거나 다른 기기로 옮기면 이어서 할 수 없습니다.</p><button class="primary" data-close>시작하기</button></div>`;
  } else if (modal === 'account') {
    overlay.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="close" data-close aria-label="닫기">×</button><span class="eyebrow">CLOUD SAVE</span><h2 id="modal-title">${currentUser() ? '계정' : '로그인 · 회원가입'}</h2>${currentUser() ? `<p>${escapeHTML(currentUser().email)} 계정으로 로그인했습니다. 저장 메뉴에서 클라우드 슬롯을 사용할 수 있습니다.</p><button class="secondary" data-logout>로그아웃</button>` : `<p>이메일로 가입하거나 로그인하면 세이브를 기기 간에 동기화할 수 있습니다. 이메일 확인이 요구될 수 있습니다.</p><form id="account-form"><label class="field">이메일<input name="email" type="email" autocomplete="email" required></label><label class="field">비밀번호<input name="password" type="password" autocomplete="current-password" minlength="6" required></label><div class="modal-actions"><button class="secondary" type="button" data-register>회원가입</button><button class="primary" type="submit">로그인</button></div></form>`}</div>`;
  } else if (modal === 'new') {
    overlay.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="close" data-close aria-label="닫기">×</button><span class="eyebrow">NEW GAME</span><h2 id="modal-title">새 게임 시작</h2><p>현재 게임 진행 상황이 초기화됩니다. 보관하고 싶다면 먼저 저장하세요.</p><div class="modal-actions"><button class="secondary" data-close>취소</button><button class="primary" data-confirm-new>새 게임 시작</button></div></div>`;
  } else {
    const saving = modal === 'save';
    overlay.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="close" data-close aria-label="닫기">×</button><span class="eyebrow">${saving ? 'SAVE GAME' : 'LOAD GAME'}</span><h2 id="modal-title">${saving ? '게임 저장' : '게임 불러오기'}</h2><p>이 브라우저에 저장되는 로컬 슬롯입니다.</p><div class="slot-list">${slots.map(n => { let saved; try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY + n)); } catch {} return `<button data-slot="${n}" data-mode="${modal}" ${!saving && !isValidSave(saved) ? 'disabled' : ''}><span>슬롯 ${n}</span><strong>${isValidSave(saved) ? `${saved.year}년 ${saved.month}월 · ${saved.turn}턴` : '비어 있음'}</strong><small>${saving ? '여기에 저장' : isValidSave(saved) ? '이어서 플레이' : '저장된 게임 없음'}</small></button>`; }).join('')}</div>${currentUser() ? `<h3 class="cloud-title">클라우드 슬롯</h3><div class="slot-list">${slots.map(n => {const entry = cloudSlots.find(row => row.slot === n); return `<button data-cloud-slot="${n}" data-mode="${modal}" ${!saving && !entry ? 'disabled' : ''}><span>클라우드 ${n}</span><strong>${entry?.state ? `${entry.state.year}년 ${entry.state.month}월 · ${entry.state.turn}턴` : '비어 있음'}</strong><small>${saving ? '계정에 저장' : entry ? '불러오기' : '저장된 게임 없음'}</small></button>`; }).join('')}</div>` : '<p class="cloud-signin">기기 간 저장을 사용하려면 <button data-open-account>로그인</button>하세요.</p>'}</div>`;
  }
  overlay.querySelector('button:not([disabled])')?.focus();
}
function render() { $('#top-date').textContent = dateLabel(game); $('#turn-counter').textContent = `TURN ${String(game.turn).padStart(2, '0')}`; $('#next-button').disabled = Boolean(game.pendingEvent); $('#next-button').textContent = game.pendingEvent ? '결정 대기 중' : '다음 달로 진행 →'; $('#account-button').textContent = currentUser() ? '내 계정' : '로그인'; document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === view)); $('#workspace').innerHTML = ({ overview, economy, politics, military, diplomacy, chronicle })[view](); rightbar(); showModal(); }
function next() { if (game.pendingEvent) { modal = 'event'; showModal(); return; } game = advanceMonth(game); render(); }
document.addEventListener('click', event => {
  const target = event.target.closest('button,[data-country],[data-region]'); if (!target) return;
  if (target.dataset.mapMode) { mapMode = target.dataset.mapMode; render(); return; }
  if (target.dataset.mapZoom) { zoomMap(target.dataset.mapZoom); return; }
  if (target.dataset.region) { selectedRegion = target.dataset.region; const [historicId, regionId] = selectedRegion.split(':'); const owner = provinceOwnerOf(game, HISTORICAL_BY_ID.get(historicId), REGION_BY_ID.get(regionId)); if (COUNTRIES[owner] && owner !== 'FRA') selectedCountry = owner; render(); return; }
  if (target.dataset.view) { view = target.dataset.view; render(); $('#workspace').focus(); return; }
  if (target.dataset.country) { if (target.dataset.country !== 'FRA') selectedCountry = target.dataset.country; render(); return; }
  if (target.dataset.choice !== undefined) { game = applyChoice(game, Number(target.dataset.choice)); modal = null; render(); toast('결정이 기록되었습니다.'); return; }
  if (target.dataset.close !== undefined) { modal = null; showModal(); return; }
  if (target.dataset.openAccount !== undefined) { modal = 'account'; showModal(); return; }
  if (target.dataset.logout !== undefined) { logout(); modal = null; render(); toast('로그아웃했습니다.'); return; }
  if (target.dataset.register !== undefined) { const form = $('#account-form'); if (!form.reportValidity()) return; target.disabled = true; register(form.elements.email.value, form.elements.password.value).then(data => { if (data.access_token) { toast('계정이 생성되었습니다. 로그인하세요.'); } else toast('가입 메일을 보냈습니다. 이메일을 확인한 뒤 로그인하세요.'); }).catch(e => toast(`가입 실패: ${e.message}`)).finally(() => { target.disabled = false; }); return; }
  if (target.dataset.confirmNew !== undefined) { game = newGame(); selectedRegion = null; selectedCountry = 'GER'; view = 'overview'; modal = null; render(); toast('새 게임을 시작했습니다.'); return; }
  if (target.dataset.slot) {
    const key = STORAGE_KEY + target.dataset.slot;
    if (target.dataset.mode === 'save') { try { localStorage.setItem(key, JSON.stringify(game)); toast(`슬롯 ${target.dataset.slot}에 저장했습니다.`); } catch { toast('저장 공간을 사용할 수 없습니다.'); } }
    else { try { const saved = JSON.parse(localStorage.getItem(key)); if (!isValidSave(saved)) throw Error('invalid'); game = upgradeSave(saved); selectedRegion = null; toast(`슬롯 ${target.dataset.slot}을 불러왔습니다.`); } catch { toast('저장 데이터를 읽을 수 없습니다.'); } }
    modal = null; render(); return;
  }
  if (target.dataset.cloudSlot) {
    const slot = Number(target.dataset.cloudSlot); target.disabled = true;
    const operation = target.dataset.mode === 'save' ? saveCloud(slot, game) : loadCloud(slot);
    operation.then(result => { if (target.dataset.mode === 'load') { if (!isValidSave(result)) throw Error('저장 데이터 형식이 올바르지 않습니다.'); game = upgradeSave(result); selectedRegion = null; } modal = null; render(); toast(target.dataset.mode === 'save' ? `클라우드 슬롯 ${slot}에 저장했습니다.` : `클라우드 슬롯 ${slot}을 불러왔습니다.`); }).catch(e => { toast(`클라우드 작업 실패: ${e.message}`); target.disabled = false; }); return;
  }
  const action = target.dataset.action;
  if (action === 'next') next();
  else if (action === 'event') { modal = 'event'; showModal(); }
  else if (action) { const result = takeAction(game, action, target.dataset.target); if (result.error) toast(result.error); else { game = result.state; render(); toast('명령이 실행되었습니다.'); } }
});
document.addEventListener('change', e => { if (e.target.dataset.regionOwner) { game = transferRegion(game, e.target.dataset.regionOwner, e.target.value); render(); toast('지역 소유권을 변경했습니다.'); } });
document.addEventListener('input', e => { if (!e.target.dataset.policy) return; game = setPolicy(game, e.target.dataset.policy, e.target.value); $(`#value-${e.target.dataset.policy}`).textContent = `${game[e.target.dataset.policy]}%`; });
document.addEventListener('submit', e => { if (e.target.id !== 'account-form') return; e.preventDefault(); const form = e.target, submit = form.querySelector('[type="submit"]'); submit.disabled = true; login(form.elements.email.value, form.elements.password.value).then(() => { modal = null; render(); toast('로그인했습니다.'); }).catch(error => toast(`로그인 실패: ${error.message}`)).finally(() => { submit.disabled = false; }); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal && modal !== 'event') { modal = null; showModal(); } if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('map-region')) { e.preventDefault(); selectedRegion = e.target.dataset.region; render(); } });
$('#next-button').addEventListener('click', next);
$('#save-button').addEventListener('click', () => openSlots('save'));
$('#load-button').addEventListener('click', () => openSlots('load'));
$('#account-button').addEventListener('click', () => { modal = 'account'; showModal(); });
$('#help-button').addEventListener('click', () => { modal = 'help'; showModal(); });
$('#new-button').addEventListener('click', () => { modal = 'new'; showModal(); });
function zoomMap(direction) {
  if (direction === 'reset') mapBox = { x: 0, y: 0, w: 510, h: 333 };
  else { const factor = direction === 'in' ? .72 : 1.38, w = Math.min(510, Math.max(65, mapBox.w * factor)), h = w * 333 / 510; mapBox = { x: Math.max(0, Math.min(510 - w, mapBox.x + (mapBox.w - w) / 2)), y: Math.max(0, Math.min(333 - h, mapBox.y + (mapBox.h - h) / 2)), w, h }; }
  const svg = $('.province-map'); if (svg) svg.setAttribute('viewBox', `${mapBox.x} ${mapBox.y} ${mapBox.w} ${mapBox.h}`);
}
let dragStart = null;
document.addEventListener('pointerdown', e => { if (!e.target.closest('.province-map')) return; dragStart = { x: e.clientX, y: e.clientY, box: { ...mapBox } }; });
document.addEventListener('pointermove', e => { if (!dragStart) return; const svg = $('.province-map'); if (!svg) return; const rect = svg.getBoundingClientRect(); mapBox.x = Math.max(0, Math.min(510 - mapBox.w, dragStart.box.x - (e.clientX - dragStart.x) * mapBox.w / rect.width)); mapBox.y = Math.max(0, Math.min(333 - mapBox.h, dragStart.box.y - (e.clientY - dragStart.y) * mapBox.h / rect.height)); svg.setAttribute('viewBox', `${mapBox.x} ${mapBox.y} ${mapBox.w} ${mapBox.h}`); });
document.addEventListener('pointerup', () => { dragStart = null; });
document.addEventListener('wheel', e => { if (!e.target.closest('.province-map')) return; e.preventDefault(); zoomMap(e.deltaY < 0 ? 'in' : 'out'); }, { passive: false });
render();
