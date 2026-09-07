# Triển khai AutoQuiz miễn phí

AutoQuiz chạy giao diện và API trên cùng một Render Web Service. Dữ liệu được lưu lâu dài trong TiDB Cloud Starter, một dịch vụ tương thích giao thức MySQL. Không lưu cơ sở dữ liệu trong thư mục của Web Service vì ổ đĩa của gói Free sẽ bị xóa khi dịch vụ khởi động lại hoặc triển khai lại.

## 1. Cơ sở dữ liệu TiDB Cloud Starter

Cấu hình đang dùng:

- Plan: `Starter`
- Region: `Singapore (ap-southeast-1)`
- Monthly Spending Limit: `$0`
- Database: `autoquiz_db`
- Port: `4000`
- TLS: bắt buộc

Trong hạn mức miễn phí, mỗi Starter instance có 5 GiB row storage, 5 GiB columnar storage và 50 triệu Request Units mỗi tháng. Khi đạt hạn mức và spending limit vẫn là `$0`, instance sẽ bị giới hạn thay vì tự phát sinh phí.

## 2. Tạo Web Service bằng Blueprint

1. Vào Render Dashboard, chọn **New > Blueprint**.
2. Kết nối GitHub và chọn kho `anky06-ky/AutoQuiz`.
3. Render tự đọc `render.yaml`. Khi được hỏi, điền:
   - `DB_HOST`: hostname Public Endpoint do TiDB Cloud cung cấp
   - `DB_USER`: username đầy đủ do TiDB Cloud cung cấp, gồm cả tiền tố instance
   - `DB_PASSWORD`: mật khẩu đã tạo trong hộp **Connect** của TiDB Cloud
   - `BOOTSTRAP_ADMIN_PASSWORD`: mật khẩu ít nhất 8 ký tự do bạn tự đặt cho `admin06`
4. Giữ các giá trị có sẵn: `DB_NAME=autoquiz_db`, `DB_PORT=4000`, `DB_SSL=true`.
5. Bấm **Apply**. Build thành công khi `/api/health` trả về `mysqlConnected: true`.

Máy chủ tự tạo database `autoquiz_db` trong lần kết nối đầu nếu database này chưa tồn tại.

## 3. Đăng nhập admin06

Lần khởi động đầu tiên, khi chưa có admin nào, máy chủ tự tạo `admin06` bằng mật khẩu nhập trong Blueprint. Mở `https://<ten-dich-vu>.onrender.com` và đăng nhập; menu **Quản lý tài khoản** sẽ xuất hiện.

Sau khi đăng nhập thành công, vào phần **Environment** của Web Service, xóa `BOOTSTRAP_ADMIN_PASSWORD` và lưu thay đổi. Tài khoản cùng mật khẩu đã băm trong cơ sở dữ liệu vẫn còn; biến khởi tạo không cần giữ lâu dài.

## 4. Quản lý dữ liệu

- Quản lý người dùng tại `/admin/accounts`.
- Bộ đề và lịch sử được lưu theo tài khoản và tự tải lại khi người dùng đăng nhập trên máy khác.
- Kiểm tra kết nối tại `/api/health` và xem lỗi trong tab **Logs** của Render.
- Quản lý bảng và chạy truy vấn bằng **SQL Editor** trong TiDB Cloud.
- Theo dõi dung lượng và Request Units trên trang **Overview** để giữ trong hạn mức miễn phí.

Sau lần thiết lập đầu, mỗi lần push lên nhánh `main` trên GitHub sẽ tự build và triển khai lại Web Service.
