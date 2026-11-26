// Danh sách đơn (GET), đổi trạng thái (POST {id, status}) hoặc nhập phí ship (POST {id, ship_fee}). Cần đăng nhập.
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
      const body = req.body || {}, id = Number(body.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'bad_input' });
      if ('ship_fee' in body) {
        const fee = body.ship_fee === null || body.ship_fee === '' ? null : Number(body.ship_fee);
        if (fee !== null && (!Number.isInteger(fee) || fee < 0 || fee > 2000000)) return res.status(400).json({ error: 'bad_fee' });
        const row = await rpc('bo_set_ship', { p_key: env('BO_KEY'), p_id: id, p_fee: fee });
        return res.status(200).json({ order: row });
      }
      if (!STATUS.includes(body.status)) return res.status(400).json({ error: 'bad_input' });
      const row = await rpc('bo_set_status', { p_key: env('BO_KEY'), p_id: id, p_status: body.status });
      return res.status(200).json({ order: row });
    }
    return res.status(405).json({ error: 'method' });
  } catch (e) {
    console.error('bo-orders', e.message);
    return res.status(502).json({ error: 'upstream', detail: e.message });
  }
};
