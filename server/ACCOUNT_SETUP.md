# Quản lý tài khoản AutoQuiz

Người dùng mở **Tài khoản** trên thanh điều hướng để sửa tên hiển thị, chọn ảnh đại diện và đổi mật khẩu. Đổi mật khẩu yêu cầu mật khẩu hiện tại và kết thúc các phiên đăng nhập. Tên đăng nhập, bộ đề và lịch sử được giữ nguyên.

## Hai loại tài khoản

- **Trên trình duyệt này:** dùng khi chưa có máy chủ; hỗ trợ hồ sơ cá nhân và đổi mật khẩu. Không có quyền quản trị hệ thống. Tài khoản và dữ liệu ở Netlify, localhost và các trình duyệt khác nhau không tự đồng bộ.
- **Trực tuyến:** đăng nhập qua Express/MySQL; phiên đăng nhập được kiểm tra tại máy chủ. Chỉ tài khoản có `role = admin` trong MySQL mới được quản lý người dùng. Sửa cờ quyền ở phía trình duyệt không cấp quyền tại API.

Khi máy chủ local hoạt động, màn hình đăng nhập có lựa chọn loại tài khoản để tiếp tục sử dụng tài khoản cũ trên trình duyệt hoặc tài khoản máy chủ.

## Khởi chạy và cấp quyền admin

1. Cấu hình kết nối MySQL trong `.env` theo `README_MYSQL.md`.
2. Chạy `npm run server`. Các cột `role`, `status`, `passwordChangedAt` và bảng `auth_sessions` được bổ sung cho cơ sở dữ liệu hiện có.
3. Chạy `npm run dev`, mở trang đăng ký, chọn tài khoản trực tuyến và tự đặt mật khẩu cho `admin06`.
4. Trong terminal trên máy chủ, chạy:

   ```sh
   npm run admin -- admin06
   ```

5. Đăng nhập lại bằng `admin06`. Mục **Quản trị** mở `/admin/accounts`.

Lệnh cấp quyền chỉ áp dụng cho tài khoản đã có, đang hoạt động; không tự tạo mật khẩu hay chọn người đăng ký đầu tiên làm admin. Tên `admin06` được chọn cho dự án này nhưng không được mã hóa thành một tài khoản đặc quyền trong giao diện.

Admin có thể tìm/lọc/phân trang danh sách, tạo tài khoản, cấp/gỡ quyền admin và khóa/mở khóa. Không thể tự khóa hay gỡ quyền của chính mình. Thay đổi quyền hoặc khóa tài khoản sẽ thu hồi các phiên liên quan; luôn phải giữ một admin hoạt động. Không có chức năng xóa vĩnh viễn dữ liệu người dùng.

## Dùng với Netlify

Netlify hiện chỉ xuất bản ứng dụng giao diện trong `dist`. Để quản lý tài khoản trực tuyến, cần triển khai thư mục `server` trên một dịch vụ chạy Node.js với MySQL truy cập được từ dịch vụ đó:

- Lệnh chạy: `npm run server`.
- Cấu hình `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` trên dịch vụ máy chủ, không đưa vào biến `VITE_*`.
- Máy chủ mặc định chỉ lắng nghe `127.0.0.1`; đặt `HOST=0.0.0.0` khi nền tảng hosting yêu cầu và cung cấp địa chỉ HTTPS qua nền tảng.
- Đặt biến build `VITE_API_BASE_URL=https://<dia-chi-may-chu>/api` trong Netlify rồi build/deploy lại.
- Tạo và cấp quyền `admin06` trong cơ sở dữ liệu của máy chủ online bằng quy trình trên. Tài khoản admin local không tự xuất hiện trong cơ sở dữ liệu online.
- Không dùng địa chỉ localhost làm máy chủ của bản Netlify: nó trỏ đến máy của từng người truy cập.

## Mật khẩu và kiểm tra

Mật khẩu mới dùng PBKDF2-HMAC-SHA256, salt ngẫu nhiên và 600.000 vòng theo [hướng dẫn OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Mật khẩu cũ chỉ được chuyển sang dạng hash sau lần đăng nhập hợp lệ. API và dữ liệu phiên phía giao diện không trả về mật khẩu/hash. Token phiên có hạn 12 giờ, lưu bản hash trong MySQL và bị thu hồi khi đăng xuất, đổi mật khẩu hoặc khóa tài khoản.

Chạy `npm test`, `npm run build` và `npm run lint`. Các kiểm tra API sử dụng kho tài khoản giả lập tách biệt, không tạo hay thay đổi người dùng thật trong MySQL.
