# AutoQuiz

Ứng dụng tạo, tinh chỉnh và làm bài trắc nghiệm từ tài liệu. Bản đầy đủ gồm React/Vite, Express và MySQL; tài khoản, bộ đề và lịch sử được đồng bộ theo người dùng khi đăng nhập bằng tài khoản máy chủ.

## Chạy trên máy

1. Sao chép `.env.example` thành `.env` và điền thông tin MySQL.
2. Cài thư viện: `npm ci`.
3. Chạy API: `npm run server`.
4. Ở cửa sổ lệnh khác, chạy giao diện: `npm run dev`.

Các lệnh kiểm tra:

```bash
npm test
npm run lint
npm run build
```

## Quản lý tài khoản

- Người dùng mở **Tài khoản** để sửa tên, ảnh đại diện và đổi mật khẩu.
- Admin mở **Quản lý tài khoản** để tìm, tạo, khóa và phân quyền tài khoản.
- Cấp quyền admin từ máy chủ: `npm run admin -- admin06`.

## Đưa lên Render

Làm theo [hướng dẫn triển khai Render](server/RENDER_DEPLOY.md). Tệp `render.yaml` đã cấu hình build giao diện và chạy API chung trên một Web Service.
