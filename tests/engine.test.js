import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, advanceMonth, applyChoice, setPolicy, takeAction, isValidSave } from '../src/engine.js';

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
