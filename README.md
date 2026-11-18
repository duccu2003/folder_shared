# NATA File Portal

Web quản lý thư mục chia sẻ `\\DESKTOP-F9CH434\Datanew\NATA` với đăng nhập, liệt kê, tìm kiếm, tải lên/tải xuống, tạo thư mục, đổi tên và xóa.

## Chạy nội bộ

```powershell
npm install
npm start
```

Mở `http://127.0.0.1:8787`.

## Mở đường dẫn HTTPS tạm thời

Giữ máy chủ web đang chạy, sau đó mở một cửa sổ PowerShell khác:

```powershell
ssh -o ServerAliveInterval=30 -R 80:127.0.0.1:8787 nokey@localhost.run
```

Đường dẫn HTTPS được in trong cửa sổ này. URL thay đổi khi khởi động lại tunnel. Để có tên miền cố định và tự khởi động, nên dùng Cloudflare Named Tunnel gắn với tên miền riêng.

## Đổi mật khẩu

```powershell
npm run set-password -- "mat-khau-moi-it-nhat-12-ky-tu"
```

Khởi động lại máy chủ sau khi đổi mật khẩu. Tệp `.env` chứa bí mật và đã được loại khỏi Git.

## Kiểm tra

```powershell
npm test
npm run check
npm audit --omit=dev
```

Ứng dụng chỉ lắng nghe tại `127.0.0.1`; truy cập từ Internet đi qua tunnel HTTPS. Mọi API quản lý file yêu cầu phiên đăng nhập và CSRF token. Các đường dẫn được kiểm tra để không thể thoát khỏi thư mục gốc.
