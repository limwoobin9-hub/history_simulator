// This is a publishable client key. Never put a secret or service_role key here.
const base = 'https://rhrhoxchyeumiiaogpun.supabase.co';
const publishableKey = 'sb_publishable_YDsIn4Z-UBvwnZVLkdargQ_cGkS678k';
const sessionKey = 'state-of-history-cloud-session-v1';
let session;
try { session = JSON.parse(localStorage.getItem(sessionKey)); } catch { session = null; }

async function request(path, { method = 'GET', body, authenticated = false, extraHeaders = {} } = {}) {
  const headers = { apikey: publishableKey, 'Content-Type': 'application/json', ...extraHeaders };
  if (authenticated) {
    await ensureSession();
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  const response = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || data?.error || `HTTP ${response.status}`);
  return data;
}
function remember(data) {
  session = { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Date.now() + data.expires_in * 1000, user: data.user };
  localStorage.setItem(sessionKey, JSON.stringify(session));
}
async function ensureSession() {
  if (!session?.refresh_token) throw new Error('먼저 로그인하세요.');
  if (session.expires_at > Date.now() + 60000) return;
  try {
    const data = await request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refresh_token } });
    remember(data);
  } catch (error) { logout(); throw new Error('로그인 시간이 만료되었습니다. 다시 로그인하세요.'); }
}
export function currentUser() { return session?.user || null; }
export function logout() { session = null; localStorage.removeItem(sessionKey); }
export async function register(email, password) {
  return request('/auth/v1/signup', { method: 'POST', body: { email, password } });
}
export async function login(email, password) {
  const data = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
  remember(data);
  return data.user;
}
export async function saveCloud(slot, state) {
  await ensureSession();
  return request('/rest/v1/game_saves?on_conflict=user_id,slot', {
    method: 'POST', authenticated: true,
    extraHeaders: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: { user_id: session.user.id, slot, state, updated_at: new Date().toISOString() }
  });
}
export async function loadCloud(slot) {
  const data = await request(`/rest/v1/game_saves?select=state&slot=eq.${slot}`, { authenticated: true });
  if (!data?.length) throw new Error('이 클라우드 슬롯에 저장된 게임이 없습니다.');
  return data[0].state;
}
export async function listCloud() {
  if (!currentUser()) return [];
  return request('/rest/v1/game_saves?select=slot,updated_at,state&order=slot.asc', { authenticated: true });
}
