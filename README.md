# NATA File Portal

Web quản lý thư mục chia sẻ SMB với đăng nhập, liệt kê, tìm kiếm, tải lên/tải xuống, tạo thư mục, đổi tên và xóa.

## Chạy trên một máy Windows khác

Máy chạy web cần:

- Truy cập được thư mục share, ví dụ `\\DESKTOP-F9CH434\Datanew\NATA`.
- [Node.js 20 trở lên](https://nodejs.org/).
- Windows OpenSSH Client (thường có sẵn trên Windows 10/11).

Tải mã nguồn và chạy:

```powershell
git clone https://github.com/duccu2003/folder_shared.git
cd folder_shared
```

Sau đó nhấp đúp **`START-NATA.bat`**. Trong lần đầu, chương trình sẽ:

1. Cài thư viện bằng `npm ci`.
2. Hỏi đường dẫn share, tên đăng nhập và mật khẩu web.
3. Chỉ lưu bản băm của mật khẩu trong `.env` — không lưu mật khẩu gốc.
4. Chạy web tại `http://127.0.0.1:8787`.
5. In ra URL HTTPS công khai có dạng `https://...app.lhr.life`.

Giữ cửa sổ `START-NATA.bat` mở. Đóng cửa sổ hoặc nhấn `Ctrl+C` sẽ dừng website. URL miễn phí thay đổi sau mỗi lần chạy; tên miền cố định cần một named tunnel hoặc dịch vụ hosting riêng.

Nếu máy khác không truy cập được đường dẫn UNC, hãy kết nối đúng mạng/VPN và đăng nhập vào share trong File Explorer trước khi chạy.

## Chạy thủ công

```powershell
npm ci
npm start
```

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
