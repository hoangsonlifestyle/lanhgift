// Phiên trang quản lý. Đăng nhập bằng Google ở /quan-ly/google (api/bo-google.js); mã quản lý đã bỏ (Sơn chốt 28/11/2026).
// GET: phiên này là ai. DELETE: thoát.
const { sessionEmail, setSession, noStore } = require('./_lib');

module.exports = async (req, res) => {
  noStore(res);
  if (req.method === 'DELETE') { setSession(res, '', 0); return res.status(200).json({ ok: true }); }
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' });
  const email = sessionEmail(req);
  if (!email) return res.status(401).json({ error: 'login' });
  return res.status(200).json({ ok: true, email });
};
