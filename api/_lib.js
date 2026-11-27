// Dùng chung cho các hàm máy chủ của trang quản lý đơn. Khoá bí mật chỉ nằm trong biến môi trường Vercel.
const crypto = require('crypto');

const COOKIE = 'lanh_bo';
const DAYS = 60;

function env(k) {
  const v = process.env[k];
  if (!v) throw new Error('missing env ' + k);
  return v;
}

function sign(exp) {
  return crypto.createHmac('sha256', env('BO_KEY')).update('bo:' + exp).digest('base64url');
}

function makeSession() {
  const exp = Math.floor(Date.now() / 1000) + DAYS * 86400;
  return exp + '.' + sign(exp);
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

function authed(req) {
  const v = readCookie(req, COOKIE);
  const [exp, sig] = v.split('.');
  if (!exp || !sig || !/^\d+$/.test(exp) || +exp < Date.now() / 1000) return false;
  return sameText(sig, sign(exp));
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

module.exports = { COOKIE, DAYS, env, makeSession, authed, setSession, sameText, rpc, noStore };
