// Đăng nhập trang quản lý bằng Google (OAuth 2.0, luồng mã phía máy chủ, có state, nonce, PKCE).
// Địa chỉ /quan-ly/google (vercel.json chuyển vào đây) vừa là nút bắt đầu, vừa là chỗ Google trả về,
// nên app trên màn hình chính iPhone không bị văng khỏi phạm vi /quan-ly.
// Cần biến môi trường: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BO_EMAILS (email được vào, cách nhau dấu phẩy), BO_KEY.
const crypto = require('crypto');
const { DAYS, env, makeSession, allowed, readCookie, noStore } = require('./_lib');

const TMP = 'lanh_oa';
const rand = n => crypto.randomBytes(n).toString('base64url');

function back(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return 'https://' + host + '/quan-ly/google';
}

function done(res, cookies, to) {
  res.setHeader('Set-Cookie', cookies);
  res.setHeader('Location', to);
  res.statusCode = 303;
  res.end();
}

const clearTmp = `${TMP}=; Path=/quan-ly; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
const fail = (res, why) => done(res, [clearTmp], '/quan-ly?loi=' + why);

module.exports = async (req, res) => {
  noStore(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' });
  const q = req.query || {};

  // 1) Bắt đầu: chuyển sang Google, giữ state + nonce + mã PKCE trong cookie tạm 10 phút.
  if (!q.code && !q.error) {
    let id;
    try { id = env('GOOGLE_CLIENT_ID'); env('GOOGLE_CLIENT_SECRET'); } catch (e) { return fail(res, 'chua-cai'); }
    const state = rand(24), nonce = rand(24), verifier = rand(48);
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    u.search = new URLSearchParams({
      client_id: id, redirect_uri: back(req), response_type: 'code', scope: 'openid email',
      state, nonce, code_challenge: challenge, code_challenge_method: 'S256', prompt: 'select_account',
    }).toString();
    return done(res, [`${TMP}=${state}.${nonce}.${verifier}; Path=/quan-ly; HttpOnly; Secure; SameSite=Lax; Max-Age=600`], u.toString());
  }

  // 2) Google trả về.
  if (q.error) return fail(res, q.error === 'access_denied' ? 'huy' : 'loi');
  const [state, nonce, verifier] = readCookie(req, TMP).split('.');
  if (!state || !nonce || !verifier || typeof q.state !== 'string' || q.state.length !== state.length ||
      !crypto.timingSafeEqual(Buffer.from(q.state), Buffer.from(state))) return fail(res, 'het-han');
  let tok;
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(q.code), client_id: env('GOOGLE_CLIENT_ID'), client_secret: env('GOOGLE_CLIENT_SECRET'),
        redirect_uri: back(req), grant_type: 'authorization_code', code_verifier: verifier,
      }).toString(),
    });
    tok = await r.json();
    if (!r.ok || !tok.id_token) return fail(res, 'loi');
  } catch (e) { return fail(res, 'loi'); }
  // id_token nhận thẳng từ máy chủ Google qua HTTPS nên đọc nội dung, kiểm nơi cấp, người nhận, hạn, nonce, email.
  let c;
  try { c = JSON.parse(Buffer.from(String(tok.id_token).split('.')[1], 'base64url').toString('utf8')); } catch (e) { return fail(res, 'loi'); }
  const now = Date.now() / 1000;
  if (!['https://accounts.google.com', 'accounts.google.com'].includes(c.iss) || c.aud !== env('GOOGLE_CLIENT_ID') ||
      !(c.exp > now) || c.nonce !== nonce) return fail(res, 'loi');
  if (!c.email || c.email_verified !== true || !allowed(c.email)) return fail(res, 'khong-duoc-phep');
  return done(res, [
    clearTmp,
    `lanh_bo=${makeSession(c.email)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${DAYS * 86400}`,
  ], '/quan-ly');
};
