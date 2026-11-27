# Lành Gift · Tết 2027 · "Mùi Lành"

Nhánh `tet-2027` chứa bản đã build để Vercel phục vụ tại lanhgift.com.

- `index.html`: trang chiến dịch (một file tự chứa) và hộp đặt hàng COD.
- `gio-qua-tet-sum-vay.html`, `gio-qua-tet-doan-vien.html`, `qua-tet-doanh-nghiep.html`, `gio-qua-tet-gom-nhung-gi.html`: trang con SEO (Vercel bỏ đuôi .html), cùng hộp đặt hàng.
- `anh/`: ảnh sản phẩm, ảnh chia sẻ `og-*.jpg`, nền giấy `giay.png`.
- `quan-ly/`: dashboard bán hàng của Lành (cần mã quản lý, biến môi trường `BO_PASS`): chiến dịch, đơn từ mọi nguồn,
  đối soát kế hoạch và thực nhận, chi phí. `quan-ly/?demo=1` xem bằng số liệu minh hoạ, không cần đăng nhập, không gọi máy chủ.
- `api/`: hàm máy chủ cho trang quản lý (`bo-login`, `bo` cho dashboard, `bo-orders` cho bản cũ) và `ping` (lịch chạy hằng ngày).
- `supabase/orders.md`: mô tả cơ sở dữ liệu; `supabase/*.sql`: các lần đổi cấu trúc.

Biến môi trường Vercel cần có: `SUPABASE_URL`, `SUPABASE_KEY` (khoá publishable), `BO_KEY`, `BO_PASS`.
Mã nguồn tạo trang nằm ở nơi làm việc riêng; không sửa trực tiếp `index.html`.
