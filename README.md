# Lành Gift · Tết 2027 · "Mùi Lành"

Nhánh `tet-2027` chứa bản đã build để Vercel phục vụ tại lanhgift.com.

- `index.html`: trang chiến dịch (một file tự chứa) và hộp đặt hàng COD.
- `quan-ly/`: trang quản lý đơn (cần mã quản lý, biến môi trường `BO_PASS`).
- `api/`: hàm máy chủ cho trang quản lý (`bo-login`, `bo-orders`) và `ping` (lịch chạy hằng ngày).
- `supabase/orders.md`: mô tả cơ sở dữ liệu đơn hàng.

Biến môi trường Vercel cần có: `SUPABASE_URL`, `SUPABASE_KEY` (khoá publishable), `BO_KEY`, `BO_PASS`.
Mã nguồn tạo trang nằm ở nơi làm việc riêng; không sửa trực tiếp `index.html`.
