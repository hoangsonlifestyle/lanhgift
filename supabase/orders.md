# Cơ sở dữ liệu đơn hàng (Supabase, dự án `lanh-gift-orders`)

- Bảng `public.orders`: bật RLS, không có policy, trình duyệt không đọc/ghi trực tiếp.
- `public.place_order(...)`: cổng nhận đơn duy nhất của trang. Tự tính giá ở máy chủ
  (Set Sum Vầy 399.000đ, Set Đoàn Viên 599.000đ), kiểm tra tên, SĐT di động 10 số, địa chỉ,
  chống bấm gửi trùng (3 phút) và chống gửi ồ ạt. Nhận thêm `p_zone` (`hcm` nội thành TP.HCM, `tinh` tỉnh khác)
  và tính phí ship qua `private.ship_fee`: mỗi 2 giỏ một phí, 30.000đ nội thành, 50.000đ đi tỉnh;
  cao điểm Tết (30/01 đến hết 10/02/2027, giờ Việt Nam) để trống, Lành báo khi xác nhận.
- Cột `zone`, `ship_fee`, `cod_total` (tự tính = tiền quà + phí ship, trống khi chưa có phí ship).
- `public.bo_orders`, `public.bo_set_status`, `public.bo_set_ship` (nhập phí ship): chỉ chạy khi có khoá bí mật `BO_KEY`
  (chỉ lưu trong biến môi trường Vercel, không có trong repo).
- `public.ping()`: lịch chạy hằng ngày gọi để dự án miễn phí không bị tạm dừng.

Đổi giá: sửa hàm `private.set_price` trong Supabase và hai con số trong hộp đặt hàng (`order.js`).
Đổi phí ship hoặc ngày cao điểm: sửa `private.ship_fee` và hằng `SHIP`, `PEAK` trong `order.js`.
