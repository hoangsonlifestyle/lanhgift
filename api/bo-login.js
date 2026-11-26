// Đăng nhập trang quản lý bằng mã quản lý (biến môi trường BO_PASS). Sai mã thì chờ 1 giây.
const { DAYS, env, makeSession, setSession, sameText, noStore } = require('./_lib');

module.exports = async (req, res) => {
  noStore(res);
  if (req.method === 'DELETE') { setSession(res, '', 0); return res.status(200).json({ ok: true }); }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const pass = (req.body && req.body.pass) || '';
  if (!pass || !sameText(pass, env('BO_PASS'))) {
    await new Promise(r => setTimeout(r, 1000));
    return res.status(401).json({ error: 'wrong_pass' });
  }
  setSession(res, makeSession(), DAYS * 86400);
  return res.status(200).json({ ok: true });
};
