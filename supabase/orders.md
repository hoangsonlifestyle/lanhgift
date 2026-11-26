# Cơ sở dữ liệu đơn hàng (Supabase, dự án `lanh-gift-orders`)

- Bảng `public.orders`: bật RLS, không có policy, trình duyệt không đọc/ghi trực tiếp.
- `public.place_order(...)`: cổng nhận đơn duy nhất của trang. Tự tính giá ở máy chủ
  (Set Sum Vầy 399.000đ, Set Đoàn Viên 599.000đ), kiểm tra tên, SĐT di động 10 số, địa chỉ,
  chống bấm gửi trùng (3 phút) và chống gửi ồ ạt.
- `public.bo_orders`, `public.bo_set_status`: chỉ chạy khi có khoá bí mật `BO_KEY`
  (chỉ lưu trong biến môi trường Vercel, không có trong repo).
- `public.ping()`: lịch chạy hằng ngày gọi để dự án miễn phí không bị tạm dừng.

Đổi giá: sửa hàm `private.set_price` trong Supabase và hai con số trong `index.html` (hộp đặt hàng).
