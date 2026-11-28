// Dùng chung cho các hàm máy chủ của trang quản lý đơn. Khoá bí mật chỉ nằm trong biến môi trường Vercel.
const crypto = require('crypto');

const COOKIE = 'lanh_bo';
const DAYS = 60;

function env(k) {
  const v = process.env[k];
  if (!v) throw new Error('missing env ' + k);
  return v;
}

// Phiên đăng nhập: hạn.email.chữ ký (HMAC bằng BO_KEY). Phiên kiểu cũ (đăng nhập bằng mã) không còn hợp lệ.
function sign(exp, email) {
  return crypto.createHmac('sha256', env('BO_KEY')).update('bo2:' + exp + ':' + email).digest('base64url');
}

// Email được vào trang quản lý: biến môi trường BO_EMAILS, cách nhau dấu phẩy.
function allowed(email) {
  const list = (process.env.BO_EMAILS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  return !!email && list.includes(String(email).toLowerCase());
}

function makeSession(email) {
  const exp = Math.floor(Date.now() / 1000) + DAYS * 86400;
  const e = String(email).toLowerCase();
  return exp + '.' + Buffer.from(e).toString('base64url') + '.' + sign(exp, e);
}

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return '';
}

function sameText(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Trả email của phiên nếu hợp lệ và email còn trong BO_EMAILS (gỡ email là mất quyền ngay), không thì ''.
function sessionEmail(req) {
  const v = readCookie(req, COOKIE);
  const [exp, e64, sig] = v.split('.');
  if (!exp || !e64 || !sig || !/^\d+$/.test(exp) || +exp < Date.now() / 1000) return '';
  let email = '';
  try { email = Buffer.from(e64, 'base64url').toString('utf8'); } catch (e) { return ''; }
  if (!sameText(sig, sign(exp, email))) return '';
  return allowed(email) ? email : '';
}

function authed(req) {
  return !!sessionEmail(req);
}

function setSession(res, value, maxAge) {
  res.setHeader('Set-Cookie', `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`);
}

async function rpc(fn, args) {
  const r = await fetch(env('SUPABASE_URL') + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: env('SUPABASE_KEY') },
    body: JSON.stringify(args || {}),
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!r.ok) {
    const err = new Error((data && data.message) || ('supabase ' + r.status));
    err.status = r.status;
    if (data && typeof data.hint === 'string') err.hint = data.hint.slice(0, 40);
    throw err;
  }
  return data;
}

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
}

module.exports = { COOKIE, DAYS, env, makeSession, authed, sessionEmail, allowed, readCookie, setSession, sameText, rpc, noStore };
