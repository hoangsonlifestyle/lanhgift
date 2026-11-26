// Danh sách đơn (GET) và đổi trạng thái đơn (POST {id, status}). Cần đăng nhập.
const { env, authed, rpc, noStore } = require('./_lib');
const STATUS = ['moi', 'da-xac-nhan', 'dang-giao', 'da-giao', 'huy'];

module.exports = async (req, res) => {
  noStore(res);
  if (!authed(req)) return res.status(401).json({ error: 'login' });
  try {
    if (req.method === 'GET') {
      const rows = await rpc('bo_orders', { p_key: env('BO_KEY'), p_limit: 1000 });
      return res.status(200).json({ orders: rows, at: new Date().toISOString() });
    }
    if (req.method === 'POST') {
      const id = Number(req.body && req.body.id), status = req.body && req.body.status;
      if (!Number.isInteger(id) || !STATUS.includes(status)) return res.status(400).json({ error: 'bad_input' });
      const row = await rpc('bo_set_status', { p_key: env('BO_KEY'), p_id: id, p_status: status });
      return res.status(200).json({ order: row });
    }
    return res.status(405).json({ error: 'method' });
  } catch (e) {
    console.error('bo-orders', e.message);
    return res.status(502).json({ error: 'upstream', detail: e.message });
  }
};
