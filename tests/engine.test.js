import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, advanceMonth, applyChoice, setPolicy, takeAction, isValidSave, upgradeSave } from '../src/engine.js';
import { REGIONS, ownerOf, transferRegion, MAPCHART_STATES, MAPCHART_BY_ID, mapchartOwnerOf, transferMapchartState } from '../src/territory.js';

test('1936년 3월 사건은 진행을 멈추고 선택에 따라 후속 수치가 변한다', () => {
  let state = advanceMonth(newGame());
  assert.equal(state.month, 2);
  state = advanceMonth(state);
  assert.equal(state.pendingEvent, 'rhineland');
  assert.equal(advanceMonth(state), state);
  const firm = applyChoice(state, 0);
  const joint = applyChoice(state, 1);
  assert.equal(firm.flags.rhineland, 'firm');
  assert.equal(joint.flags.rhineland, 'joint');
  assert.ok(firm.tension > joint.tension);
  assert.ok(joint.relations.GBR > firm.relations.GBR);
  assert.equal(advanceMonth(firm).month, 4);
});
test('세금 인상은 세입을 늘리고 소비와 지지도를 낮춘다', () => {
  const normal = advanceMonth(newGame());
  const taxed = advanceMonth(setPolicy(newGame(), 'tax', 40));
  assert.ok(taxed.income > normal.income);
  assert.ok(taxed.growth < normal.growth);
  assert.ok(taxed.approval < normal.approval);
});
test('국고 부족은 부채로 전환되고 사단 비용은 두 번 지급할 수 없다', () => {
  let state = newGame();
  state.treasury = 0;
  state = advanceMonth(state);
  assert.equal(state.treasury, 0);
  assert.ok(state.debt > 35);
  const recruit = takeAction(state, 'recruit');
  assert.equal(recruit.state, state);
  assert.ok(recruit.error);
  const success = takeAction(newGame(), 'recruit');
  assert.equal(success.state.divisions, 29);
  assert.equal(success.state.manpower, 338);
});
test('선택지와 저장 데이터의 변조를 무시한다', () => {
  const state = advanceMonth(advanceMonth(newGame()));
  assert.equal(applyChoice(state, 99), state);
  assert.equal(setPolicy(state, 'tax', 99), state);
  assert.equal(isValidSave(JSON.parse(JSON.stringify(newGame()))), true);
  assert.equal(isValidSave({ version: 1, month: 19 }), false);
});
test('소유권 변경은 저장되고 옛 세이브는 새 형식으로 읽는다', () => {
  const vienna = REGIONS.find(region => region[1] === 'Wien');
  const changed = transferRegion(newGame(), vienna[0], 'FRA');
  assert.equal(ownerOf(changed, vienna), 'FRA');
  assert.equal(isValidSave(JSON.parse(JSON.stringify(changed))), true);
  changed.territory.overrides[vienna[0]] = 'BOGUS';
  assert.equal(isValidSave(changed), false);
  const legacy = newGame(); legacy.version = 1; delete legacy.territory;
  assert.equal(upgradeSave(legacy).version, 2);
  assert.equal(ownerOf(upgradeSave(legacy), vienna), 'AUT');
});
test('1938년과 1939년의 선택은 지역 소유권을 갈라 놓는다', () => {
  let state = newGame();
  while (state.year < 1938 || state.month < 3) {
    state = state.pendingEvent ? applyChoice(state, 0) : advanceMonth(state);
  }
  assert.equal(state.pendingEvent, 'anschluss');
  const vienna = REGIONS.find(region => region[1] === 'Wien');
  assert.equal(ownerOf(applyChoice(state, 0), vienna), 'GER');
  assert.equal(ownerOf(applyChoice(state, 1), vienna), 'AUT');
  const edited = transferRegion(state, vienna[0], 'FRA');
  assert.equal(ownerOf(applyChoice(edited, 0), vienna), 'FRA');
  state = applyChoice(state, 0);
  while (state.year < 1939 || state.month < 3) {
    state = state.pendingEvent ? applyChoice(state, 0) : advanceMonth(state);
  }
  const prague = REGIONS.find(region => region[1] === 'Prague');
  assert.equal(state.pendingEvent, 'prague');
  assert.equal(ownerOf(applyChoice(state, 0), prague), 'GER');
  assert.equal(ownerOf(applyChoice(state, 1), prague), 'CZE');
});

test('첨부 SVG의 모든 경계를 사용하며 1936년 주요 유럽 지역이 올바르게 분리된다', () => {
  const state = newGame();
  assert.equal(MAPCHART_STATES.length, 1081);
  assert.ok(MAPCHART_STATES.every(item => mapchartOwnerOf(state, item)));
  for (const [name, expected] of [
    ['Brandenburg','GER'], ['Königsberg','GER'], ['Danzig','DAN'],
    ['Poznan','POL'], ['Warszawa','POL'], ['Wilno','POL'],
    ['Vlaanderen','BEL'], ['Luxembourg','LUX'], ['Tyrol','AUT'],
    ['North_Sudetenland','CZE'], ['Southern_Slovakia','CZE'],
    ['Harju','EST'], ['Banat','ROU'], ['Northern_Epirus','ALB'],
    ['West_Papua','Dutch East Indies'], ['New_York','United States']
  ]) assert.equal(mapchartOwnerOf(state, MAPCHART_BY_ID.get(name)), expected, name);
});

test('시간 진행과 역사 선택이 첨부 지도의 지역색을 바꾸며 직접 수정한 지역은 유지한다', () => {
  let state = newGame();
  while (state.year < 1939 || state.month < 9)
    state = state.pendingEvent ? applyChoice(state, 0) : advanceMonth(state);
  const owner = (name, snapshot = state) => mapchartOwnerOf(snapshot, MAPCHART_BY_ID.get(name));
  assert.equal(owner('Tyrol'), 'GER');
  assert.equal(owner('North_Sudetenland'), 'GER');
  assert.equal(owner('Southern_Slovakia'), 'HUN');
  assert.equal(owner('Western_Slovakia'), 'SVK');
  assert.equal(owner('Podkarpatská_Rus'), 'HUN');
  assert.equal(owner('Danzig'), 'DAN');
  const edited = transferMapchartState(state, 'Warszawa', 'FRA');
  const occupied = applyChoice(edited, 0);
  assert.equal(owner('Warszawa', occupied), 'FRA');
  assert.equal(owner('Poznan', occupied), 'GER');
  assert.equal(owner('Lwów', occupied), 'SOV');
  assert.equal(owner('Danzig', occupied), 'GER');
  assert.equal(isValidSave(occupied), true);
  const globalEdit = transferMapchartState(occupied, 'West_Papua', 'GBR');
  assert.equal(owner('West_Papua', globalEdit), 'GBR');
  assert.equal(isValidSave(globalEdit), true);
});
