// Lịch chạy hằng ngày (vercel.json > crons) gọi để dự án Supabase miễn phí không bị tạm dừng vì không hoạt động.
const { rpc, noStore } = require('./_lib');

module.exports = async (req, res) => {
  noStore(res);
  try {
    const v = await rpc('ping', {});
    return res.status(200).json({ ok: v === 1, at: new Date().toISOString() });
  } catch (e) {
    console.error('ping', e.message);
    return res.status(502).json({ ok: false });
  }
};
