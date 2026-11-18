# NATA File Portal

Web quản lý thư mục chia sẻ SMB với đăng nhập, liệt kê, tìm kiếm, tải lên/tải xuống, tạo thư mục, đổi tên và xóa.

Mỗi thư mục có một URL riêng ở dạng `https://.../#/duong-dan-thu-muc`. Có thể sao chép URL để mở lại đúng thư mục sau khi đăng nhập, đồng thời dùng được nút Back/Forward của trình duyệt.

Mục **Chọn lô** tự tìm các thư mục Job có mã `FE-IM`, `FE-EX`, `FR-IM` hoặc `FR-EX`. Ô chọn để trống ban đầu; khi chọn một lô, trang hiển thị vị trí và toàn bộ tệp trong lô, kể cả tệp nằm trong các thư mục con.

Các file `.xlsx`, `.xls`, `.xlsm`, `.xlsb` và `.csv` có nút **Mở Excel**. Trên Windows có Microsoft Excel, nút này gọi Excel Desktop ở chế độ xem bằng liên kết tải có chữ ký, hết hạn sau hai phút. Portal chưa có WebDAV/WOPI để đồng bộ Save ngược như SharePoint; hãy lưu thành bản sao rồi tải lên lại nếu cần thay thế file trên server.

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

## Bản portable không cần cài đặt

Gói portable được phát hành riêng và không lưu trên GitHub vì có dung lượng lớn. Chép toàn bộ thư mục đã giải nén sang máy Windows khác rồi nhấp đúp **`RUN-NATA-PORTABLE.bat`**. Gói này đã kèm Node.js, OpenSSH và thư viện; không cần cài Node.js, Git hay chạy lệnh thiết lập. Lần đầu chương trình hỏi đường dẫn share và thông tin đăng nhập để tạo `.env`; những lần sau chỉ cần nhấp đúp file chạy.

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
