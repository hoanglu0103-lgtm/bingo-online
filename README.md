# Bingo Online (5x5)

## Chạy thử trên máy tính
1. Cài Node.js 18 trở lên: https://nodejs.org/
2. Giải nén thư mục.
3. Mở Terminal/CMD tại thư mục dự án.
4. Chạy `npm install`
5. Chạy `npm start`
6. Mở http://localhost:3000 trên trình duyệt.

## Đưa lên Internet để bạn bè cùng chơi
Triển khai thư mục này lên dịch vụ Node.js hỗ trợ WebSocket (ví dụ Render, Railway hoặc VPS), đặt lệnh build không cần và lệnh start là `npm start`. Sau khi deploy, gửi đường dẫn HTTPS cho người chơi. Không dùng dịch vụ hosting chỉ phục vụ static HTML vì game cần máy chủ Socket.IO hoạt động liên tục.

## Luật trong bản MVP
- Bingo 75 số, bảng 5x5; ô giữa FREE.
- Mỗi phòng tối đa 20 người chơi (không tính quản trò).
- Mỗi người bắt đầu với 1.000 điểm ảo; phí vào phòng mặc định 100 điểm.
- Phí vào phòng được cộng vào quỹ thưởng; người Bingo hợp lệ đầu tiên nhận quỹ.
- Đọc số qua giọng nói tiếng Việt của trình duyệt (ưu tiên giọng được trình duyệt gắn nhãn nam nếu có).
- Người tạo phòng là quản trò; chọn tự động (5 giây/số) hoặc gọi thủ công.
- Người chơi chỉ đánh dấu số đã được gọi.
- Thắng khi đủ một hàng, cột hoặc đường chéo; máy chủ kiểm tra.
- Bản mẫu không có tiền cược, nạp/rút tiền hay đổi thưởng.

## Lưu ý trước khi phát hành
Đây là bản MVP để chạy thử, chưa có tài khoản, lưu lịch sử, chống spam nâng cao, reconnect khôi phục phiên, quản trị vi phạm, hoặc hệ thống giải đấu. Nếu dùng công khai, nên bổ sung xác thực, giới hạn tạo phòng, kiểm thử tải và chính sách quyền riêng tư.

## Điểm ảo và giọng đọc
- Điểm hiện được lưu trong bộ nhớ của máy chủ theo phiên phòng, chưa phải ví tài khoản bền vững. Khi máy chủ khởi động lại, số dư sẽ đặt lại.
- Giọng đọc dùng Web Speech API của trình duyệt. Việc có đúng giọng nam miền Nam phụ thuộc vào giọng tiếng Việt được cài trên thiết bị/trình duyệt; ứng dụng ưu tiên giọng có nhãn nam nếu hệ thống cung cấp, nếu không sẽ dùng giọng tiếng Việt khả dụng.
- Phí vào phòng và quỹ thưởng chỉ là điểm ảo, không có giá trị quy đổi thành tiền.

## Triển khai miễn phí lên Render
1. Tải ZIP, giải nén và đưa các tệp trong thư mục dự án (không phải file ZIP) lên một GitHub repository.
2. Trên Render chọn New > Web Service, kết nối repository.
3. Chọn Runtime Node, Build Command `npm install`, Start Command `npm start`, Instance Type Free.
4. Deploy; dùng URL `https://<ten-dich-vu>.onrender.com` để chia sẻ.
Máy chủ lắng nghe trên `0.0.0.0` và cổng do biến môi trường `PORT` cung cấp.
