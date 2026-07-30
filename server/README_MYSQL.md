# 🗄️ Hướng Dẫn Kết Nối MySQL Database Với AutoQuiz

Dự án **AutoQuiz** đã được tích hợp đầy đủ hệ thống Backend Node.js + Express và Cơ sở dữ liệu **MySQL Server (MySQL80 / MySQL Workbench)**.

---

## 🛠️ 1. Cấu hình Mật khẩu MySQL của bạn

Mở file `.env` tại thư mục gốc của dự án (`d:\Trac_nghiem\.env`) và chỉnh sửa thông tin kết nối MySQL:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=MẬT_KHẨU_MYSQL_CỦA_BẠN
DB_NAME=autoquiz_db

PORT=5000
```
*(Nếu bạn để mật khẩu trống khi cài MySQL thì giữ nguyên `DB_PASSWORD=`)*

---

## 🚀 2. Khởi chạy Server Backend MySQL

Mở một cửa sổ Terminal/Command Prompt trong thư mục dự án và chạy:

```powershell
npm run server
```

**Hệ thống sẽ tự động**:
1. Kết nối với MySQL Server của bạn trên `localhost:3306`.
2. Tự động tạo Database `autoquiz_db`.
3. Tự động tạo các bảng quản lý: `users` (người dùng), `quizzes` (bộ đề), `questions` (câu hỏi), `quiz_history` (lịch sử thi).

---

## 📊 3. Xem và Quản lý dữ liệu trong MySQL Workbench

1. Mở **MySQL Workbench**.
2. Nhấp vào **Local instance MySQL80**.
3. Trong bảng điều khiển bên trái, nhấp vào tab **Schemas** ➔ Bấm **Refresh** (hoặc gõ lệnh `USE autoquiz_db; SELECT * FROM quizzes;`).
4. Bạn sẽ thấy toàn bộ bộ đề thi, người dùng và câu hỏi được lưu trữ trực tiếp trong MySQL!
