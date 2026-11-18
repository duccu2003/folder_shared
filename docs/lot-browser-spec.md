# Trình chọn lô (Job)

## Mục tiêu

Thêm một ô chọn lô vào kho dữ liệu NATA. Ô chọn để trống khi vừa mở trang. Khi người dùng chọn một lô, hệ thống hiển thị vị trí của thư mục lô và toàn bộ tệp nằm trong lô, bao gồm tệp trong các thư mục con như `4 cont` và `5 cont`.

## Phạm vi và quy tắc

- Lô là thư mục có tên chứa mã Job theo mẫu `FE-IM######`, `FE-EX######`, `FR-IM######` hoặc `FR-EX######`.
- Danh sách lô được quét động từ thư mục chia sẻ đang cấu hình; không ghi cứng 39 đường dẫn vào mã nguồn.
- Không đi theo symbolic link và chỉ đọc dữ liệu nằm trong thư mục chia sẻ.
- Mỗi lô có mã, tên thư mục và đường dẫn tương đối từ thư mục chia sẻ.
- Danh sách chọn được sắp xếp theo mã rồi theo tên, không có mục trùng đường dẫn.
- Mục đầu tiên của ô chọn là `— Chọn lô —` và không tự chọn lô nào.
- Khi chọn lô, bảng dùng chung hiển thị tất cả tệp theo đường dẫn tương đối bên trong lô; thư mục không xuất hiện thành dòng riêng.
- Khi bỏ chọn, trang quay lại thư mục đang duyệt thông thường.
- Tìm kiếm, tải xuống, mở Excel, đổi tên và xóa tiếp tục hoạt động với tệp đang hiển thị.
- Chế độ duyệt thư mục hiện tại không thay đổi.

## Giao diện API

- `GET /api/lots`: yêu cầu đăng nhập, trả về `{ lots: [{ code, name, path }] }`.
- `GET /api/lot-files?path=...`: yêu cầu đăng nhập, chỉ chấp nhận đường dẫn khớp một lô đã quét; trả về `{ lot, files }`.
- Mỗi phần tử `files` có `name`, `path`, `type: "file"`, `size`, `modifiedAt`; `name` là đường dẫn tương đối trong lô để phân biệt tệp ở các thư mục con.

## Cấu trúc thay đổi

- `src/file-service.js`: quét lô và quét tệp đệ quy an toàn.
- `src/server.js`: hai endpoint chỉ đọc cho lô.
- `public/index.html`, `public/app.js`, `public/styles.css`: ô chọn, vị trí lô và trạng thái bảng.
- `test/lot-service.test.js`: kiểm thử nhận diện mã, bỏ qua thư mục thường, và tệp lồng nhau.

## Kiểm thử và tiêu chí hoàn thành

- Viết kiểm thử thất bại trước khi triển khai logic.
- `npm test` và `npm run check` đều thành công.
- Thử trên trình duyệt ở kích thước desktop và hẹp.
- Ô chọn để trống ban đầu.
- Chọn lô hiển thị đúng vị trí và cả tệp ở nhiều cấp thư mục con.
- Không thể dùng endpoint lô để đọc một thư mục thường hoặc thoát khỏi thư mục chia sẻ.

## Lệnh chạy

- Kiểm thử: `npm test`
- Kiểm tra cú pháp: `npm run check`
- Chạy ứng dụng: `npm start`
