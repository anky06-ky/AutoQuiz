# Triển khai AutoQuiz lên Render

AutoQuiz chạy giao diện và API trên cùng một Render Web Service. Dữ liệu lâu dài nằm trong MySQL; không lưu cơ sở dữ liệu trong thư mục của Web Service vì hệ thống tệp này bị xóa khi triển khai lại.

> Lưu ý chi phí: Web Service có thể chọn gói Free, nhưng MySQL tự quản lý trên Render cần Private Service và Persistent Disk trả phí. Nếu muốn tiết kiệm, dùng một dịch vụ MySQL bên ngoài rồi điền thông tin kết nối ở bước 2.

## 1. Tạo MySQL

1. Mở hướng dẫn **Deploy MySQL** chính thức của Render: <https://render.com/docs/deploy-mysql>.
2. Dùng nút one-click hoặc tạo Private Service từ kho `render-examples/mysql`.
3. Đặt các biến:
   - `MYSQL_DATABASE=autoquiz_db`
   - `MYSQL_USER=autoquiz`
   - `MYSQL_PASSWORD`: mật khẩu mạnh do bạn tự tạo
   - `MYSQL_ROOT_PASSWORD`: một mật khẩu mạnh khác
4. Chọn region **Singapore** để cùng region với Web Service, rồi gắn Persistent Disk vào đúng `/var/lib/mysql`, tối thiểu 10 GB theo mẫu Render.
5. Chờ dịch vụ hoạt động và ghi lại hostname nội bộ, ví dụ `autoquiz-mysql`. Ứng dụng dùng hostname này và cổng `3306`, không dùng URL có `http://`.

## 2. Tạo Web Service bằng Blueprint

1. Vào Render Dashboard, chọn **New > Blueprint**.
2. Kết nối GitHub và chọn kho `anky06-ky/AutoQuiz`.
3. Render tự đọc `render.yaml`. Khi được hỏi, điền:
   - `DB_HOST`: hostname nội bộ của MySQL ở bước 1
   - `DB_USER=autoquiz`
   - `DB_PASSWORD`: đúng mật khẩu `MYSQL_PASSWORD`
4. Giữ `DB_NAME=autoquiz_db`, `DB_PORT=3306`, `DB_SSL=false` khi MySQL ở cùng Render workspace.
5. Bấm **Apply**. Build thành công khi `/api/health` trả về `mysqlConnected: true`.

Nếu dùng MySQL bên ngoài Render, nhập host do nhà cung cấp cấp và đặt `DB_SSL=true` nếu họ yêu cầu TLS. Có thể thêm `DB_SSL_CA` theo đúng hướng dẫn của nhà cung cấp.

## 3. Tạo admin06 trên dữ liệu cloud

Cơ sở dữ liệu trên Render tách biệt với MySQL trên máy của bạn, nên cần tạo tài khoản một lần nữa:

1. Mở địa chỉ `https://<ten-dich-vu>.onrender.com` và đăng ký `admin06` bằng mật khẩu riêng.
2. Mở trang **Shell** của AutoQuiz Web Service và chạy:

   ```bash
   npm run admin -- admin06
   ```

3. Đăng xuất rồi đăng nhập lại. Menu **Quản lý tài khoản** sẽ xuất hiện.

## 4. Quản lý và sao lưu dữ liệu

- Quản lý người dùng tại `/admin/accounts`.
- Bộ đề và lịch sử được lưu theo tài khoản trong MySQL và tự tải lại khi người dùng đăng nhập trên máy khác.
- Xem log kết nối tại tab **Logs**; kiểm tra nhanh bằng `/api/health`.
- Sao lưu định kỳ bằng `mysqldump`. Render khuyến nghị không phục hồi cơ sở dữ liệu MySQL trực tiếp từ snapshot của Persistent Disk vì có thể làm hỏng dữ liệu.

Sau lần thiết lập đầu, mỗi lần push lên nhánh mặc định GitHub sẽ tự build và triển khai lại Web Service.
