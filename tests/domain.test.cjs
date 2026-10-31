const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./loadTs.cjs');
const { complaintReducer, createComplaintState, isWithinRegion } = loadTs('src/domain/complaintState.ts');
const { validateSignup, validateReport } = loadTs('src/domain/validation.ts');
const complaint = { id: 'one', likeCount: 4, title: 'Example', latitude: 35, longitude: 128 };

test('rapid like toggles are atomic and do not mutate the original list', () => {
  const initial = createComplaintState([complaint]);
  let state = complaintReducer(initial, { type: 'select', id: 'one' });
  state = complaintReducer(state, { type: 'toggleLike', id: 'one' });
  assert.equal(state.complaints.find(item => item.id === state.selectedId).likeCount, 5);
  assert.equal(state.likedComplaintIds.has('one'), true);
  state = complaintReducer(state, { type: 'toggleLike', id: 'one' });
  assert.equal(state.complaints[0].likeCount, 4);
  assert.equal(state.likedComplaintIds.has('one'), false);
  assert.equal(initial.complaints[0].likeCount, 4);
  assert.equal(initial.likedComplaintIds.size, 0);
  assert.equal(complaintReducer(state, { type: 'toggleLike', id: 'missing' }), state);
});

test('adding a report resets selection and duplicate IDs are ignored', () => {
  const initial = { ...createComplaintState([complaint]), selectedId: 'one' };
  const state = complaintReducer(initial, { type: 'add', complaint: { ...complaint, id: 'two' } });
  assert.equal(state.complaints[0].id, 'two');
  assert.equal(state.selectedId, null);
  assert.equal(complaintReducer(state, { type: 'add', complaint }), state);
});

test('viewport filtering includes edges, wrapped longitudes and the world', () => {
  const region = { latitude: 0, longitude: 179, latitudeDelta: 10, longitudeDelta: 8 };
  assert.equal(isWithinRegion({ latitude: 5, longitude: -179 }, region), true);
  assert.equal(isWithinRegion({ latitude: 6, longitude: 179 }, region), false);
  assert.equal(isWithinRegion({ latitude: 0, longitude: 160 }, region), false);
  assert.equal(isWithinRegion({ latitude: 0, longitude: -160 }, { ...region, longitudeDelta: 360 }), true);
});

test('signup validation covers normalized fields, passwords and confirmation', () => {
  const valid = { id: ' User_1 ', name: ' 이웃 ', email: ' test@example.com ', password: 'strong123' };
  assert.equal(validateSignup(valid, 'strong123'), null);
  for (const change of [{ id: 'a' }, { name: ' ' }, { email: 'bad' }, { password: 'abcdefgh' }, { password: '12345678' }]) {
    assert.ok(validateSignup({ ...valid, ...change }));
  }
  assert.ok(validateSignup(valid, 'different'));
});

test('report stages cannot bypass required fields or photo checks', () => {
  const valid = { photoUri: 'photo', title: 'Title', description: 'Details', faceBlurAcknowledged: true, hasAnimalCarcass: false, animalBlurConfirmed: false };
  assert.equal(validateReport(valid), null);
  assert.equal(validateReport({ ...valid, title: '' }, 1), null);
  assert.ok(validateReport({ ...valid, title: '  ' }, 2));
  assert.ok(validateReport({ ...valid, photoUri: null }, 4));
  assert.ok(validateReport({ ...valid, faceBlurAcknowledged: false }, 4));
  assert.ok(validateReport({ ...valid, hasAnimalCarcass: true }, 4));
  assert.equal(validateReport({ ...valid, hasAnimalCarcass: true, animalBlurConfirmed: true }), null);
});
