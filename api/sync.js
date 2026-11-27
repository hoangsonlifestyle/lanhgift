// Cổng đồng bộ cho Sơn Nga Family (giai đoạn 2B). Chỉ máy chủ Sơn Nga gọi, kèm khoá đồng bộ ở header x-lanh-sync.
// Khoá chỉ nằm trong biến môi trường của Sơn Nga; Supabase lưu SHA-256 của khoá và tự kiểm (sync_export, sync_report).
// GET  ?lock=1 → dữ liệu cần ghi sang Sơn Nga (chiến dịch, đơn đã nhận tiền / hoàn, chi đã trả, dòng đã huỷ, yêu cầu vốn).
// POST {campaigns, items, decisions, run, unlock} → Sơn Nga báo lại vốn, trạng thái từng dòng, quyết định cấp vốn.
const { rpc, noStore } = require('./_lib');

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function keyOf(req) {
  const k = String(req.headers['x-lanh-sync'] || '');
  return k.length >= 32 && k.length <= 200 ? k : '';
}

module.exports = async (req, res) => {
  noStore(res);
  const key = keyOf(req);
  if (!key) return res.status(401).json({ error: 'forbidden' });
  try {
    if (req.method === 'GET') {
      const lock = String((req.query && req.query.lock) || '') === '1';
      const data = await rpc('sync_export', { p_key: key, p_lock: lock });
      return res.status(200).json(data);
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
    const b = isObj(req.body) ? req.body : null;
    if (!b || JSON.stringify(b).length > 400000) return res.status(400).json({ error: 'bad_input' });
    const out = await rpc('sync_report', { p_key: key, p_data: b });
    return res.status(200).json(out);
  } catch (e) {
    const msg = String((e && e.message) || '');
    if (msg === 'forbidden') return res.status(401).json({ error: 'forbidden' });
    if (e && e.status && e.status < 500) return res.status(400).json({ error: /^[a-z_]{3,40}$/.test(msg) ? msg : 'invalid' });
    console.error('sync', msg);
    return res.status(502).json({ error: 'upstream' });
  }
};
