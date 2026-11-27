# Cơ sở dữ liệu bán hàng (Supabase, dự án `lanh-gift-orders`)

Mọi bảng bật RLS, không có policy: trình duyệt không đọc, ghi trực tiếp. Trang web chỉ gọi `place_order`;
trang quản lý gọi các hàm `bo2_*` qua máy chủ Vercel (`/api/bo`), hàm nào cũng kiểm khoá bí mật `BO_KEY`
(chỉ lưu trong biến môi trường Vercel, không có trong repo).

## Bảng

- `orders`: đơn từ web và đơn nhập tay.
  - Kế hoạch: `total` (tiền quà), `ship_fee` (phí ship báo khách), `cod_total` (tự tính = tiền quà + phí ship).
  - Thực tế khi đối soát: `got_amount` (khách trả thực tế), `ship_cost` (phí trả hãng, gồm phí thu hộ), `received_at`.
  - `items`: các dòng hàng `[{code, name, qty, price}]`; đơn nhiều set có `set_code = 'nhieu-set'`.
  - `campaign_id`, `channel` (nguồn đơn), `ref` (utm hoặc trang dẫn tới), `origin` (`web` hoặc `tay`),
    `pay_method` (`cod`, `ck`, `tien-mat`), `carrier`, `recon_note`.
  - 2B: `money_to` (`hkd` = TK HỘ KINH DOANH, `rieng` = Ví riêng Sơn), `ship_paid_by` (`tru-cod` hãng trừ vào COD, `tk-kd` trả từ
    TK KINH DOANH LÀNH; trống = COD hãng trừ, chuyển khoản / tiền mặt trả từ TK KINH DOANH LÀNH).
  - Trạng thái: `moi`, `da-xac-nhan`, `dang-giao`, `da-giao`, `da-nhan-tien`, `huy`, `hoan-hang`.
- `campaigns`: chiến dịch (`draft`, `running`, `closed`, `settled`), ngày bán, mục tiêu, ngân sách theo loại chi, set quà.
  Đơn web tự vào chiến dịch `running` bắt đầu muộn nhất. Chiến dịch `settled` khoá sửa đơn và chi.
  2B: `sn_id` (mã chiến dịch CD-xxxx bên Sơn Nga, có = đã nối), `sn_capital` (vốn vào TK KINH DOANH LÀNH theo Sơn Nga),
  `sn_status`, `sn_synced_at`. Chiến dịch đã nối: quyết toán, mở lại, đổi mã làm ở Sơn Nga.
- `expenses`: khoản chi theo chiến dịch, loại `nhap`, `baobi`, `quangcao`, `vanchuyen`, `khac` (cùng mã với Sơn Nga Family).
- `sources`: danh sách nguồn đơn (Web, Google, Google Ads, Facebook, Zalo, Instagram, TikTok, Doanh nghiệp, Người quen,
  Bạn bè giới thiệu, Khách cũ, Khác). Chỉ ẩn, không xoá.
- `audit`: nhật ký mọi lần ghi từ trang quản lý.
- 2B: `capital_requests` (xin vốn: `tao` khi chiến dịch chưa nối, `them`; một yêu cầu chờ duyệt mỗi chiến dịch),
  `sync_items` (đơn `O:<mã>`, chi `E:<id>` đã sang Sơn Nga: để biết khi huỷ thì Sơn Nga xoá dòng, tiền về lại tài khoản),
  `sync_runs` (300 lượt gần nhất).

## Hàm

- `place_order(...)`: cổng nhận đơn của trang. Tự tính giá ở máy chủ (Set Sum Vầy 399.000đ, Set Đoàn Viên 599.000đ),
  kiểm tra tên, SĐT, địa chỉ, chống gửi trùng (3 phút) và gửi ồ ạt. Phí ship qua `private.ship_fee`: mỗi 2 giỏ một phí,
  30.000đ nội thành TP.HCM, 50.000đ đi tỉnh; cao điểm Tết (30/01 đến hết 10/02/2027) để trống, Lành báo khi xác nhận.
  Nhận `p_channel` (chỉ web, google, google-ads, facebook, zalo, instagram, tiktok) và `p_ref`.
- `bo2_data`: toàn bộ dữ liệu cho dashboard. `bo2_order_save`: tạo đơn nhập tay hoặc sửa đơn, đổi trạng thái, đối soát.
  Kế hoạch (hàng, phí ship báo khách) khoá khi đơn đã nhận tiền hoặc hoàn hàng.
  `bo2_expense_save`, `bo2_expense_delete`, `bo2_campaign_save`, `bo2_sources_save`.
- 2B: `bo2_capreq_save`, `bo2_capreq_cancel`. `bo2_expense_save` chặn Đã trả khi chiến dịch đã nối không đủ vốn (`no_capital`,
  kèm số còn). `sync_export(khoá, lock)`, `sync_report(khoá, dữ liệu)`: cổng đồng bộ cho Sơn Nga qua `/api/sync`, kiểm khoá
  đồng bộ riêng (`private.settings` lưu SHA-256, khoá gốc chỉ ở biến môi trường của Sơn Nga).
- `bo_orders`, `bo_set_status`, `bo_set_ship`: dùng cho trang quản lý bản cũ, giữ để không gãy khi chuyển.
- `ping()`: lịch chạy hằng ngày gọi để dự án miễn phí không bị tạm dừng.

Lịch sử thay đổi: `2026-11-27-dashboard-gd1.sql` (chiến dịch, nguồn đơn, đối soát, chi phí); `2026-11-27-sync-2b.sql`
(nối Sơn Nga Family: vốn, xin vốn, đồng bộ; chạy thành 3 phần sync_2b_a, _b, _c).

Đổi giá web: sửa `private.set_price` và hai con số trong hộp đặt hàng (`order.js`).
Đổi phí ship hoặc ngày cao điểm: sửa `private.ship_fee`, hằng `SHIP`, `PEAK` trong `order.js` và trong `quan-ly/app.js`.
