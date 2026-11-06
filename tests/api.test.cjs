const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./loadTs.cjs');

const errors = loadTs('src/api/errors.ts');
const session = loadTs('src/api/session.ts');
const mappers = loadTs('src/api/mappers.ts');
const { formatRelativeTime, formatDateRange } = loadTs('src/api/dates.ts');

// Share one session/errors instance with the client so token state and instanceof checks line up.
function loadClient(fetch) {
  return loadTs('src/api/client.ts', { './errors': errors, './session': session }, { fetch });
}

function recordingFetch(respond) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, init });
    return respond(url, init);
  };
  return { fetch, calls };
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com/';

const summary = {
  complaintId: 7,
  title: '보도블록 파손',
  address: '대구 중구 동성로 12-3',
  area: '동성로',
  category: 'ROAD',
  status: 'IN_PROGRESS',
  latitude: 35.87,
  longitude: 128.6,
  likeCount: 12,
  liked: true,
  festival: { festivalId: 1, name: '대구 야간 페스타' },
  thumbnailUrl: 'https://cdn.example.com/7.jpg',
  createdAt: '2026-11-02T11:20:00+09:00',
};

test('complaint summaries map server codes to app values', () => {
  const complaint = mappers.toComplaint(summary);
  assert.equal(complaint.id, '7');
  assert.equal(complaint.category, 'road');
  assert.equal(complaint.status, '처리 중');
  assert.equal(complaint.area, '동성로');
  assert.equal(complaint.festival, '대구 야간 페스타');
  assert.equal(complaint.thumbnailUrl, 'https://cdn.example.com/7.jpg');
  assert.equal(complaint.createdAt, summary.createdAt);

  const plain = mappers.toComplaint({ ...summary, festival: null, thumbnailUrl: null, area: '부산', category: 'UNKNOWN' });
  assert.equal('festival' in plain, false);
  assert.equal('thumbnailUrl' in plain, false);
  assert.equal(plain.area, '기타');
  assert.equal(plain.category, 'other');
});

test('liked flags are collected separately and codes round-trip', () => {
  const { complaints, likedIds } = mappers.toComplaintList([summary, { ...summary, complaintId: 8, liked: false }]);
  assert.deepEqual(complaints.map((item) => item.id), ['7', '8']);
  assert.deepEqual([...likedIds], ['7']);
  assert.equal(mappers.toCategoryCode(mappers.toCategoryId('STREETLIGHT')), 'STREETLIGHT');
  assert.equal(mappers.toStatusCode(mappers.toComplaintStatus('RESOLVED')), 'RESOLVED');
  assert.equal(mappers.toServerId('12'), 12);
  assert.throws(() => mappers.toServerId('3f2a-uuid'));
});

test('relative times and date ranges are computed on the device', () => {
  const now = new Date('2026-11-02T15:00:00+09:00');
  assert.equal(formatRelativeTime('2026-11-02T14:59:30+09:00', now), '방금 전');
  assert.equal(formatRelativeTime('2026-11-02T14:15:00+09:00', now), '45분 전');
  assert.equal(formatRelativeTime('2026-11-02T12:00:00+09:00', now), '3시간 전');
  assert.equal(formatRelativeTime('2026-11-01T10:00:00+09:00', now), '어제');
  assert.equal(formatRelativeTime('2026-10-29T15:00:00+09:00', now), '4일 전');
  assert.equal(formatRelativeTime('not a date', now), '');
  assert.match(formatDateRange('2026-10-24T18:00:00+09:00', '2026-10-26T22:00:00+09:00'), /^10\.2[34] – 10\.2[56]$/);
});

test('authenticated requests send the bearer token, JSON body and query', async () => {
  session.setAccessToken('token-123');
  const { fetch, calls } = recordingFetch(() => json({ ok: true }));
  const { apiRequest } = loadClient(fetch);
  const result = await apiRequest('/complaints', { method: 'POST', body: { title: 'x' }, query: { area: '중구', page: 0, skip: undefined } });
  assert.deepEqual(result, { ok: true });
  assert.equal(calls[0].url, 'https://api.example.com/complaints?area=%EC%A4%91%EA%B5%AC&page=0');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer token-123');
  assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
  assert.equal(calls[0].init.body, '{"title":"x"}');
});

test('error bodies become ApiError with field errors', async () => {
  session.setAccessToken('token-123');
  const { apiRequest } = loadClient(async () => json({
    status: 400, code: 'INVALID_INPUT', message: '입력값을 확인해 주세요.',
    errors: [{ field: 'password', reason: '영문과 숫자를 포함해 8자 이상' }],
  }, 400));
  await assert.rejects(apiRequest('/auth/signup', { method: 'POST', body: {}, auth: false }), (error) => {
    assert.ok(errors.isApiError(error));
    assert.equal(error.status, 400);
    assert.equal(error.code, 'INVALID_INPUT');
    assert.equal(error.fieldError('password'), '영문과 숫자를 포함해 8자 이상');
    return true;
  });
});

test('401 on an authenticated request clears the token and notifies the app', async () => {
  session.setAccessToken('expired');
  let notified = 0;
  const unsubscribe = session.onUnauthorized(() => { notified += 1; });
  const { apiRequest } = loadClient(async () => json({ status: 401, code: 'UNAUTHORIZED', message: '로그인이 필요해요.', errors: [] }, 401));
  await assert.rejects(apiRequest('/users/me'), { code: 'UNAUTHORIZED' });
  assert.equal(session.getAccessToken(), null);
  assert.equal(notified, 1);
  unsubscribe();
});

test('LOGIN_FAILED on a login request does not log the user out', async () => {
  session.setAccessToken('still-valid');
  let notified = 0;
  const unsubscribe = session.onUnauthorized(() => { notified += 1; });
  const { apiRequest } = loadClient(async () => json({ status: 401, code: 'LOGIN_FAILED', message: '아이디 또는 비밀번호가 올바르지 않아요.', errors: [] }, 401));
  await assert.rejects(apiRequest('/auth/login', { method: 'POST', body: {}, auth: false }), { code: 'LOGIN_FAILED' });
  assert.equal(session.getAccessToken(), 'still-valid');
  assert.equal(notified, 0);
  unsubscribe();
});

test('missing token fails before any network call', async () => {
  session.setAccessToken(null);
  const { fetch, calls } = recordingFetch(() => json({}));
  const { apiRequest } = loadClient(fetch);
  await assert.rejects(apiRequest('/users/me'), { code: 'UNAUTHORIZED' });
  assert.equal(calls.length, 0);
});

test('network failures, empty bodies and broken error bodies are handled', async () => {
  session.setAccessToken('token-123');
  const offline = loadClient(async () => { throw new TypeError('Network request failed'); });
  await assert.rejects(offline.apiRequest('/complaints'), { code: 'NETWORK_ERROR', status: 0 });

  const empty = loadClient(async () => new Response(null, { status: 204 }));
  assert.equal(await empty.apiRequest('/complaints/1/like', { method: 'DELETE' }), undefined);

  const html = loadClient(async () => new Response('<html>Bad Gateway</html>', { status: 502 }));
  await assert.rejects(html.apiRequest('/complaints'), { code: 'INTERNAL_ERROR', status: 502 });
});

function loadUsers(fetch) {
  const client = loadClient(fetch);
  return loadTs('src/api/users.ts', { './client': client, './errors': errors, './session': session });
}

test('API 1 sign-up sends trimmed server field names without a token', async () => {
  session.setAccessToken('leftover-token');
  const user = { userId: 7, loginId: 'abcd', name: '홍길동', email: 'a@daum.net' };
  const { fetch, calls } = recordingFetch(() => json(user, 201));
  const { signUp } = loadUsers(fetch);
  const result = await signUp({ id: ' abcd ', name: ' 홍길동 ', email: ' a@daum.net ', password: ' abcd1234' });
  assert.deepEqual(result, user);
  assert.equal(calls[0].url, 'https://api.example.com/users/signup');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(calls[0].init.body), { loginId: 'abcd', name: '홍길동', email: 'a@daum.net', password: ' abcd1234' });
});

test('API 1 duplicate sign-ups surface the server code without logging out', async () => {
  session.setAccessToken('still-valid');
  const { signUp } = loadUsers(async () => json({ status: 409, code: 'DUPLICATE_LOGIN_ID', message: '이미 사용 중인 아이디예요.', errors: [] }, 409));
  await assert.rejects(signUp({ id: 'abcd', name: '홍길동', email: 'a@daum.net', password: 'abcd1234' }), { code: 'DUPLICATE_LOGIN_ID', status: 409 });
  assert.equal(session.getAccessToken(), 'still-valid');
});

test('API 2 email check sends an encoded query without a token and reads availability', async () => {
  session.setAccessToken('leftover-token');
  const { fetch, calls } = recordingFetch(() => json({ email: 'a+b@daum.net', available: false }));
  const { checkEmail } = loadUsers(fetch);
  const result = await checkEmail(' a+b@daum.net ');
  assert.deepEqual(result, { email: 'a+b@daum.net', available: false });
  assert.equal(calls[0].url, 'https://api.example.com/users/check-email?email=a%2Bb%40daum.net');
  assert.equal(calls[0].init.method, 'GET');
  assert.equal(calls[0].init.headers.Authorization, undefined);
  assert.equal(calls[0].init.body, undefined);
});

test('API 3 login ID check sends the trimmed ID as a query without a token', async () => {
  session.setAccessToken('leftover-token');
  const { fetch, calls } = recordingFetch(() => json({ loginId: 'abcd', available: false }));
  const { checkLoginId } = loadUsers(fetch);
  const result = await checkLoginId(' abcd ');
  assert.deepEqual(result, { loginId: 'abcd', available: false });
  assert.equal(calls[0].url, 'https://api.example.com/users/check-login-id?loginId=abcd');
  assert.equal(calls[0].init.method, 'GET');
  assert.equal(calls[0].init.headers.Authorization, undefined);
});

function loadComplaints(fetch) {
  const client = loadClient(fetch);
  return loadTs('src/api/complaints.ts', { './client': client, './errors': errors, './session': session });
}

const bodyOf = (call) => JSON.parse(call.init.body);
const queryOf = (call) => Object.fromEntries(new URL(call.url).searchParams);

test('API 4 login stores the token, and LOGIN_FAILED leaves no token behind', async () => {
  session.setAccessToken(null);
  const { fetch, calls } = recordingFetch(() => json({
    accessToken: 'jwt-abc', tokenType: 'Bearer', expiresIn: 604800,
    user: { userId: 7, loginId: 'abcd', name: '홍길동' },
  }));
  const { login, logout } = loadUsers(fetch);
  const before = Date.now();
  const result = await login(' abcd ', 'abcd1234');
  assert.equal(calls[0].url, 'https://api.example.com/users/login');
  assert.equal(calls[0].init.headers.Authorization, undefined);
  assert.deepEqual(bodyOf(calls[0]), { loginId: 'abcd', password: 'abcd1234' });
  assert.deepEqual(result.user, { userId: 7, loginId: 'abcd', name: '홍길동' });
  assert.ok(Math.abs(result.expiresAt.getTime() - (before + 604800 * 1000)) < 5000);
  assert.equal(session.getAccessToken(), 'jwt-abc');
  logout();
  assert.equal(session.getAccessToken(), null);

  const failing = loadUsers(async () => json({ status: 401, code: 'LOGIN_FAILED', message: '아이디 또는 비밀번호가 올바르지 않아요.', errors: [] }, 401));
  await assert.rejects(failing.login('abcd', 'wrong'), { code: 'LOGIN_FAILED' });
  assert.equal(session.getAccessToken(), null);
});

test('API 5 my page sends the token and maps recent complaints', async () => {
  session.setAccessToken('jwt-abc');
  const { fetch, calls } = recordingFetch(() => json({
    user: { userId: 7, loginId: 'abcd', name: '홍길동', email: 'a@daum.net' },
    stats: { reportedCount: 4, resolvedCount: 1, receivedEmpathyCount: 26 },
    recentComplaints: [summary],
  }));
  const { getMyPage } = loadUsers(fetch);
  const page = await getMyPage();
  assert.equal(calls[0].url, 'https://api.example.com/users/mypage');
  assert.equal(calls[0].init.method, 'GET');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer jwt-abc');
  assert.equal(page.stats.receivedEmpathyCount, 26);
  assert.equal(page.recentComplaints[0].category, 'road');
  assert.deepEqual([...page.likedIds], ['7']);
});

test('API 6 nearby sends the visible map edges and an optional category code', async () => {
  session.setAccessToken('jwt-abc');
  const { fetch, calls } = recordingFetch(() => json({ totalCount: 1, complaints: [summary] }));
  const { getNearbyComplaints } = loadComplaints(fetch);
  const region = { latitude: 35.871, longitude: 128.601, latitudeDelta: 0.018, longitudeDelta: 0.018 };
  const result = await getNearbyComplaints(region, { category: 'road' });
  const query = queryOf(calls[0]);
  assert.equal(new URL(calls[0].url).pathname, '/complaints/nearby');
  assert.ok(Math.abs(Number(query.minLat) - 35.862) < 1e-9);
  assert.ok(Math.abs(Number(query.maxLat) - 35.880) < 1e-9);
  assert.ok(Math.abs(Number(query.minLng) - 128.592) < 1e-9);
  assert.ok(Math.abs(Number(query.maxLng) - 128.610) < 1e-9);
  assert.equal(query.category, 'ROAD');
  assert.equal(result.totalCount, 1);
  assert.equal(result.complaints[0].id, '7');

  await getNearbyComplaints(region);
  assert.equal('category' in queryOf(calls[1]), false);
});

test('API 7 list sends only the chosen filters as server codes and keeps paging info', async () => {
  session.setAccessToken('jwt-abc');
  const { fetch, calls } = recordingFetch(() => json({ content: [summary], page: 1, size: 20, totalElements: 21, hasNext: false }));
  const { getComplaints } = loadComplaints(fetch);

  await getComplaints();
  assert.equal(calls[0].url, 'https://api.example.com/complaints');

  const result = await getComplaints({ area: '북구', category: 'festival', festivalId: 1, status: '해결 완료', sort: 'empathy', page: 1 });
  assert.deepEqual(queryOf(calls[1]), { area: '북구', category: 'FESTIVAL', festivalId: '1', status: 'RESOLVED', sort: 'empathy', page: '1' });
  assert.equal(result.totalElements, 21);
  assert.equal(result.hasNext, false);
  assert.equal(result.complaints[0].status, '처리 중');

  await getComplaints({ area: 'all' });
  assert.equal(calls[2].url, 'https://api.example.com/complaints');
});

test('API 8 detail uses the numeric ID path and keeps liked, mine and image', async () => {
  session.setAccessToken('jwt-abc');
  const detail = {
    complaintId: 1, title: '보도블록 파손', description: '걸려 넘어질 위험이 있어요.', address: '대구 중구 동성로 12-3',
    area: '동성로', category: 'ROAD', status: 'IN_PROGRESS', latitude: 35.8718, longitude: 128.6019,
    agency: '도로관리과', estimatedPeriod: '3~5일', imageUrl: 'https://cdn.example.com/31.jpg',
    festival: { festivalId: 2, name: '동성로 청년 페스티벌' }, likeCount: 12, liked: false, mine: true,
    createdAt: '2026-11-02T11:20:00+09:00',
  };
  const { fetch, calls } = recordingFetch(() => json(detail));
  const { getComplaintDetail } = loadComplaints(fetch);
  const result = await getComplaintDetail('1');
  assert.equal(calls[0].url, 'https://api.example.com/complaints/1');
  assert.equal(result.id, '1');
  assert.equal(result.description, '걸려 넘어질 위험이 있어요.');
  assert.equal(result.agency, '도로관리과');
  assert.equal(result.imageUrl, 'https://cdn.example.com/31.jpg');
  assert.equal(result.festival, '동성로 청년 페스티벌');
  assert.equal(result.festivalId, 2);
  assert.equal(result.mine, true);
  assert.equal(result.liked, false);

  await assert.rejects(getComplaintDetail('not-a-server-id'));
  assert.equal(calls.length, 1);

  const missing = loadComplaints(async () => json({ status: 404, code: 'COMPLAINT_NOT_FOUND', message: '없는 민원이에요.', errors: [] }, 404));
  await assert.rejects(missing.getComplaintDetail('999'), { code: 'COMPLAINT_NOT_FOUND', status: 404 });
});

test('API 9 preview sends server codes, accepts a failed content check and reports AI outages', async () => {
  session.setAccessToken('jwt-abc');
  const preview = {
    agency: '도로관리과', estimatedPeriod: '3~5일', area: '동성로',
    contentCheck: { passed: false, feedback: '위치가 구체적이지 않아요.' },
    image: { originalImageId: 31, blurredImageId: 32, blurredImageUrl: 'https://cdn.example.com/32.jpg', faceCount: 0 },
  };
  const { fetch, calls } = recordingFetch(() => json(preview));
  const { previewComplaint } = loadComplaints(fetch);
  const input = {
    imageId: 31, category: 'road', title: ' 골목 보도블록이 들떠 있어요 ', description: ' 밤에 걸려 넘어질 위험 ',
    address: ' 대구 중구 동성로 12-3 ', latitude: 35.8714, longitude: 128.6014, festivalId: null,
  };
  const result = await previewComplaint(input);
  assert.equal(calls[0].url, 'https://api.example.com/complaints/preview');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer jwt-abc');
  assert.deepEqual(bodyOf(calls[0]), {
    imageId: 31, category: 'ROAD', title: '골목 보도블록이 들떠 있어요', description: '밤에 걸려 넘어질 위험',
    address: '대구 중구 동성로 12-3', latitude: 35.8714, longitude: 128.6014, festivalId: null,
  });
  assert.equal(result.contentCheck.passed, false);
  assert.equal(result.image.blurredImageId, 32);
  assert.equal(result.area, '동성로');

  const down = loadComplaints(async () => json({ status: 502, code: 'AI_UNAVAILABLE', message: 'AI 점검을 잠시 사용할 수 없어요.', errors: [] }, 502));
  await assert.rejects(down.previewComplaint(input), { code: 'AI_UNAVAILABLE', status: 502 });
  assert.equal(session.getAccessToken(), 'jwt-abc');
});
