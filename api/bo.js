// Dashboard Lành: GET trả toàn bộ dữ liệu (chiến dịch, nguồn đơn, đơn, chi phí); POST {action, id, data} để ghi. Cần đăng nhập.
// Mọi kiểm tra nghiệp vụ nằm trong hàm Supabase bo2_*; ở đây chỉ chặn đầu vào lạ và đổi lỗi thành mã ngắn.
const { env, authed, rpc, noStore } = require('./_lib');

const SAVE = { order: 'bo2_order_save', expense: 'bo2_expense_save', campaign: 'bo2_campaign_save' };
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function fail(res, e) {
  const msg = String((e && e.message) || '');
  const code = /^[a-z_]{3,40}$/.test(msg) ? msg : 'invalid';
  if (e && e.status && e.status < 500) return res.status(400).json({ error: code });
  console.error('bo', msg);
  return res.status(502).json({ error: 'upstream' });
}

module.exports = async (req, res) => {
  noStore(res);
  if (!authed(req)) return res.status(401).json({ error: 'login' });
  try {
    if (req.method === 'GET') {
      const data = await rpc('bo2_data', { p_key: env('BO_KEY') });
      return res.status(200).json(data);
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
    const b = isObj(req.body) ? req.body : {};
    const id = b.id === null || b.id === undefined || b.id === '' ? null : Number(b.id);
    if (id !== null && (!Number.isSafeInteger(id) || id < 1)) return res.status(400).json({ error: 'bad_input' });

    if (b.action === 'expense-delete') {
      if (id === null) return res.status(400).json({ error: 'bad_input' });
      await rpc('bo2_expense_delete', { p_key: env('BO_KEY'), p_id: id });
      return res.status(200).json({ id });
    }
    if (b.action === 'sources') {
      if (!Array.isArray(b.list) || b.list.length > 40 || JSON.stringify(b.list).length > 6000) return res.status(400).json({ error: 'bad_input' });
      const list = await rpc('bo2_sources_save', { p_key: env('BO_KEY'), p_list: b.list });
      return res.status(200).json({ sources: list });
    }
    const fn = SAVE[b.action];
    if (!fn || !isObj(b.data) || JSON.stringify(b.data).length > 8000) return res.status(400).json({ error: 'bad_input' });
    const row = await rpc(fn, { p_key: env('BO_KEY'), p_id: id, p_data: b.data });
    return res.status(200).json({ row });
  } catch (e) {
    return fail(res, e);
  }
};
