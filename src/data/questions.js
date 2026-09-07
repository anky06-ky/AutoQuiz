// =============================================
// AutoQuiz - Ngân hàng câu hỏi & Custom Quiz Support
// 5 chủ đề mặc định + hỗ trợ bộ đề tự tạo từ file/văn bản người dùng
// =============================================

import { quizStore } from '../services/quizStore.js';
import { selectQuestions } from '../utils/quizData.js';

export const categories = [
  {
    id: 'cntt',
    name: 'Công nghệ thông tin',
    icon: '💻',
    color: '#6c5ce7',
    description: 'Lập trình, mạng máy tính, hệ điều hành...',
    questionCount: 10,
  },
  {
    id: 'khoahoc',
    name: 'Khoa học tự nhiên',
    icon: '🔬',
    color: '#00cec9',
    description: 'Vật lý, hóa học, sinh học...',
    questionCount: 10,
  },
  {
    id: 'lichsu',
    name: 'Lịch sử',
    icon: '📖',
    color: '#fdcb6e',
    description: 'Lịch sử Việt Nam và thế giới...',
    questionCount: 10,
  },
  {
    id: 'dialy',
    name: 'Địa lý',
    icon: '🌍',
    color: '#74b9ff',
    description: 'Địa lý tự nhiên, kinh tế, xã hội...',
    questionCount: 10,
  },
  {
    id: 'tienganh',
    name: 'Tiếng Anh',
    icon: '🇬🇧',
    color: '#ff7675',
    description: 'Ngữ pháp, từ vựng, đọc hiểu...',
    questionCount: 10,
  },
];

export const questions = {
  // ---- CÔNG NGHỆ THÔNG TIN ----
  cntt: [
    {
      id: 'cntt-1',
      question: 'Ngôn ngữ lập trình nào được sử dụng phổ biến nhất để phát triển web front-end?',
      options: ['Python', 'JavaScript', 'C++', 'Java'],
      correctAnswer: 1,
      explanation: 'JavaScript là ngôn ngữ lập trình chính để phát triển web front-end, chạy trực tiếp trên trình duyệt.',
    },
    {
      id: 'cntt-2',
      question: 'HTML viết tắt của từ gì?',
      options: [
        'Hyper Text Markup Language',
        'High Tech Modern Language',
        'Hyper Transfer Markup Language',
        'Home Tool Markup Language',
      ],
      correctAnswer: 0,
      explanation: 'HTML = HyperText Markup Language, là ngôn ngữ đánh dấu siêu văn bản dùng để tạo cấu trúc trang web.',
    },
    {
      id: 'cntt-3',
      question: 'Đơn vị nhỏ nhất của dữ liệu trong máy tính là gì?',
      options: ['Byte', 'Bit', 'Kilobyte', 'Megabyte'],
      correctAnswer: 1,
      explanation: 'Bit (Binary Digit) là đơn vị nhỏ nhất, chỉ có 2 giá trị: 0 hoặc 1.',
    },
    {
      id: 'cntt-4',
      question: 'Hệ điều hành nào sau đây là mã nguồn mở?',
      options: ['Windows', 'macOS', 'Linux', 'iOS'],
      correctAnswer: 2,
      explanation: 'Linux là hệ điều hành mã nguồn mở, cho phép bất kỳ ai cũng có thể xem, sửa đổi và phân phối mã nguồn.',
    },
    {
      id: 'cntt-5',
      question: 'RAM là viết tắt của?',
      options: [
        'Read Access Memory',
        'Random Access Memory',
        'Run Application Memory',
        'Rapid Access Module',
      ],
      correctAnswer: 1,
      explanation: 'RAM = Random Access Memory (Bộ nhớ truy cập ngẫu nhiên), dùng để lưu trữ dữ liệu tạm thời khi máy tính đang hoạt động.',
    },
    {
      id: 'cntt-6',
      question: 'Giao thức nào được sử dụng để truyền tải trang web trên Internet?',
      options: ['FTP', 'SMTP', 'HTTP/HTTPS', 'SSH'],
      correctAnswer: 2,
      explanation: 'HTTP (HyperText Transfer Protocol) và HTTPS (phiên bản bảo mật) là giao thức chuẩn để truyền tải trang web.',
    },
    {
      id: 'cntt-7',
      question: 'CSS được sử dụng để làm gì trong phát triển web?',
      options: [
        'Xử lý logic',
        'Tạo cấu trúc trang',
        'Định dạng giao diện',
        'Quản lý cơ sở dữ liệu',
      ],
      correctAnswer: 2,
      explanation: 'CSS (Cascading Style Sheets) dùng để định dạng và trang trí giao diện trang web: màu sắc, font chữ, bố cục...',
    },
    {
      id: 'cntt-8',
      question: 'Thuật toán sắp xếp nào có độ phức tạp trung bình O(n log n)?',
      options: ['Bubble Sort', 'Selection Sort', 'Quick Sort', 'Insertion Sort'],
      correctAnswer: 2,
      explanation: 'Quick Sort có độ phức tạp trung bình O(n log n), là một trong những thuật toán sắp xếp hiệu quả nhất.',
    },
    {
      id: 'cntt-9',
      question: 'Địa chỉ IP phiên bản 4 (IPv4) có bao nhiêu bit?',
      options: ['16 bit', '32 bit', '64 bit', '128 bit'],
      correctAnswer: 1,
      explanation: 'IPv4 sử dụng 32 bit, chia thành 4 octet (mỗi octet 8 bit), ví dụ: 192.168.1.1.',
    },
    {
      id: 'cntt-10',
      question: 'Cơ sở dữ liệu quan hệ sử dụng ngôn ngữ truy vấn nào?',
      options: ['NoSQL', 'GraphQL', 'SQL', 'MongoDB Query'],
      correctAnswer: 2,
      explanation: 'SQL (Structured Query Language) là ngôn ngữ truy vấn chuẩn cho cơ sở dữ liệu quan hệ như MySQL, PostgreSQL, SQL Server.',
    },
  ],

  // ---- KHOA HỌC TỰ NHIÊN ----
  khoahoc: [
    {
      id: 'kh-1',
      question: 'Công thức hóa học của nước là gì?',
      options: ['CO2', 'H2O', 'NaCl', 'O2'],
      correctAnswer: 1,
      explanation: 'Nước có công thức H₂O, gồm 2 nguyên tử Hydrogen và 1 nguyên tử Oxygen.',
    },
    {
      id: 'kh-2',
      question: 'Ánh sáng di chuyển với vận tốc bao nhiêu km/s trong chân không?',
      options: ['150.000 km/s', '300.000 km/s', '500.000 km/s', '1.000.000 km/s'],
      correctAnswer: 1,
      explanation: 'Vận tốc ánh sáng trong chân không xấp xỉ 300.000 km/s (chính xác: 299.792,458 km/s).',
    },
    {
      id: 'kh-3',
      question: 'Nguyên tố hóa học nào có ký hiệu "Fe"?',
      options: ['Flour', 'Sắt', 'Francium', 'Fermium'],
      correctAnswer: 1,
      explanation: 'Fe là ký hiệu hóa học của Sắt (Iron), bắt nguồn từ tiếng Latin "Ferrum".',
    },
    {
      id: 'kh-4',
      question: 'Bộ phận nào trong tế bào chứa thông tin di truyền (DNA)?',
      options: ['Ribosome', 'Ti thể', 'Nhân tế bào', 'Lưới nội chất'],
      correctAnswer: 2,
      explanation: 'Nhân tế bào (nucleus) chứa DNA - vật chất mang thông tin di truyền của sinh vật.',
    },
    {
      id: 'kh-5',
      question: 'Định luật bảo toàn năng lượng phát biểu rằng:',
      options: [
        'Năng lượng có thể tự sinh ra',
        'Năng lượng không tự sinh ra và không tự mất đi',
        'Năng lượng luôn tăng theo thời gian',
        'Năng lượng chỉ tồn tại ở dạng nhiệt',
      ],
      correctAnswer: 1,
      explanation: 'Định luật bảo toàn năng lượng: Năng lượng không tự sinh ra và không tự mất đi, chỉ chuyển từ dạng này sang dạng khác.',
    },
    {
      id: 'kh-6',
      question: 'Hành tinh lớn nhất trong hệ Mặt Trời là?',
      options: ['Sao Thổ', 'Sao Mộc', 'Sao Thiên Vương', 'Sao Hải Vương'],
      correctAnswer: 1,
      explanation: 'Sao Mộc (Jupiter) là hành tinh lớn nhất, có đường kính gấp 11 lần Trái Đất.',
    },
    {
      id: 'kh-7',
      question: 'Quá trình quang hợp xảy ra ở bộ phận nào của cây?',
      options: ['Rễ', 'Thân', 'Lá', 'Hoa'],
      correctAnswer: 2,
      explanation: 'Quang hợp chủ yếu xảy ra ở lá cây, nơi có nhiều lục lạp chứa chất diệp lục (chlorophyll).',
    },
    {
      id: 'kh-8',
      question: 'Bảng tuần hoàn các nguyên tố hóa học được phát minh bởi ai?',
      options: ['Newton', 'Einstein', 'Mendeleev', 'Dalton'],
      correctAnswer: 2,
      explanation: 'Dmitri Mendeleev (1869) đã tạo ra bảng tuần hoàn, sắp xếp các nguyên tố theo khối lượng nguyên tử tăng dần.',
    },
    {
      id: 'kh-9',
      question: 'Đơn vị đo cường độ dòng điện trong hệ SI là gì?',
      options: ['Volt (V)', 'Watt (W)', 'Ampere (A)', 'Ohm (Ω)'],
      correctAnswer: 2,
      explanation: 'Ampere (A) là đơn vị đo cường độ dòng điện trong hệ đo lường quốc tế SI.',
    },
    {
      id: 'kh-10',
      question: 'Axit nucleic DNA có cấu trúc xoắn kép được phát hiện bởi?',
      options: [
        'Darwin & Wallace',
        'Watson & Crick',
        'Pasteur & Koch',
        'Mendel & Morgan',
      ],
      correctAnswer: 1,
      explanation: 'James Watson và Francis Crick phát hiện cấu trúc xoắn kép của DNA năm 1953.',
    },
  ],

  // ---- LỊCH SỬ ----
  lichsu: [
    {
      id: 'ls-1',
      question: 'Chiến thắng Điện Biên Phủ diễn ra vào năm nào?',
      options: ['1945', '1954', '1968', '1975'],
      correctAnswer: 1,
      explanation: 'Chiến thắng Điện Biên Phủ ngày 7/5/1954 kết thúc cuộc kháng chiến chống Pháp.',
    },
    {
      id: 'ls-2',
      question: 'Ai là người đọc Tuyên ngôn Độc lập ngày 2/9/1945?',
      options: [
        'Võ Nguyên Giáp',
        'Hồ Chí Minh',
        'Phạm Văn Đồng',
        'Trường Chinh',
      ],
      correctAnswer: 1,
      explanation: 'Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập tại Quảng trường Ba Đình, Hà Nội, khai sinh nước Việt Nam Dân chủ Cộng hòa.',
    },
    {
      id: 'ls-3',
      question: 'Chiến tranh Thế giới thứ 2 kết thúc vào năm nào?',
      options: ['1943', '1944', '1945', '1946'],
      correctAnswer: 2,
      explanation: 'Chiến tranh Thế giới thứ 2 kết thúc năm 1945 với sự đầu hàng của Nhật Bản vào ngày 2/9/1945.',
    },
    {
      id: 'ls-4',
      question: 'Triều đại phong kiến cuối cùng của Việt Nam là triều nào?',
      options: ['Nhà Lê', 'Nhà Trần', 'Nhà Nguyễn', 'Nhà Lý'],
      correctAnswer: 2,
      explanation: 'Nhà Nguyễn (1802-1945) là triều đại phong kiến cuối cùng của Việt Nam, do Nguyễn Ánh (Gia Long) sáng lập.',
    },
    {
      id: 'ls-5',
      question: 'Cuộc Cách mạng Công nghiệp lần thứ nhất bắt đầu từ nước nào?',
      options: ['Pháp', 'Đức', 'Mỹ', 'Anh'],
      correctAnswer: 3,
      explanation: 'Cuộc Cách mạng Công nghiệp lần thứ nhất bắt đầu từ nước Anh vào cuối thế kỷ 18 (khoảng 1760).',
    },
    {
      id: 'ls-6',
      question: 'Bức tường Berlin sụp đổ vào năm nào?',
      options: ['1987', '1989', '1991', '1993'],
      correctAnswer: 1,
      explanation: 'Bức tường Berlin sụp đổ ngày 9/11/1989, đánh dấu sự kết thúc của Chiến tranh Lạnh ở châu Âu.',
    },
    {
      id: 'ls-7',
      question: 'Trận Bạch Đằng năm 938 do ai chỉ huy?',
      options: ['Lý Thường Kiệt', 'Ngô Quyền', 'Trần Hưng Đạo', 'Lê Lợi'],
      correctAnswer: 1,
      explanation: 'Ngô Quyền chỉ huy trận Bạch Đằng năm 938, đánh bại quân Nam Hán, chấm dứt hơn 1000 năm Bắc thuộc.',
    },
    {
      id: 'ls-8',
      question: 'Tổ chức Liên Hợp Quốc được thành lập vào năm nào?',
      options: ['1944', '1945', '1946', '1948'],
      correctAnswer: 1,
      explanation: 'Liên Hợp Quốc (United Nations) được thành lập ngày 24/10/1945 với mục tiêu duy trì hòa bình thế giới.',
    },
    {
      id: 'ls-9',
      question: 'Kim tự tháp Giza được xây dựng ở quốc gia nào?',
      options: ['Iraq', 'Ai Cập', 'Hy Lạp', 'Thổ Nhĩ Kỳ'],
      correctAnswer: 1,
      explanation: 'Kim tự tháp Giza nằm ở Ai Cập, được xây dựng khoảng 2560 TCN cho Pharaoh Khufu.',
    },
    {
      id: 'ls-10',
      question: 'Sự kiện nào đánh dấu Việt Nam thống nhất đất nước?',
      options: [
        'Hiệp định Geneva 1954',
        'Hiệp định Paris 1973',
        'Chiến dịch Hồ Chí Minh 30/4/1975',
        'Tổng tuyển cử 1976',
      ],
      correctAnswer: 2,
      explanation: 'Chiến dịch Hồ Chí Minh kết thúc ngày 30/4/1975, giải phóng miền Nam, thống nhất đất nước.',
    },
  ],

  // ---- ĐỊA LÝ ----
  dialy: [
    {
      id: 'dl-1',
      question: 'Sông dài nhất thế giới là sông nào?',
      options: ['Amazon', 'Nile', 'Mississippi', 'Dương Tử'],
      correctAnswer: 1,
      explanation: 'Sông Nile dài khoảng 6.650 km, chảy qua 11 quốc gia ở châu Phi.',
    },
    {
      id: 'dl-2',
      question: 'Đỉnh núi cao nhất thế giới là?',
      options: ['K2', 'Kangchenjunga', 'Everest', 'Lhotse'],
      correctAnswer: 2,
      explanation: 'Đỉnh Everest cao 8.849m, nằm trên biên giới Nepal và Trung Quốc (Tây Tạng).',
    },
    {
      id: 'dl-3',
      question: 'Việt Nam có bao nhiêu tỉnh thành?',
      options: ['58', '61', '63', '65'],
      correctAnswer: 2,
      explanation: 'Việt Nam có 63 đơn vị hành chính cấp tỉnh (58 tỉnh và 5 thành phố trực thuộc trung ương).',
    },
    {
      id: 'dl-4',
      question: 'Châu lục nào có diện tích lớn nhất?',
      options: ['Châu Phi', 'Châu Á', 'Châu Mỹ', 'Châu Âu'],
      correctAnswer: 1,
      explanation: 'Châu Á có diện tích khoảng 44,58 triệu km², chiếm khoảng 30% diện tích đất liền thế giới.',
    },
    {
      id: 'dl-5',
      question: 'Đại dương lớn nhất trên Trái Đất là?',
      options: ['Đại Tây Dương', 'Ấn Độ Dương', 'Thái Bình Dương', 'Bắc Băng Dương'],
      correctAnswer: 2,
      explanation: 'Thái Bình Dương có diện tích khoảng 165,25 triệu km², lớn hơn tổng diện tích đất liền.',
    },
    {
      id: 'dl-6',
      question: 'Thủ đô của Nhật Bản là thành phố nào?',
      options: ['Osaka', 'Kyoto', 'Tokyo', 'Yokohama'],
      correctAnswer: 2,
      explanation: 'Tokyo là thủ đô và thành phố lớn nhất của Nhật Bản, với dân số vùng đô thị hơn 37 triệu người.',
    },
    {
      id: 'dl-7',
      question: 'Đồng bằng sông Cửu Long gồm bao nhiêu tỉnh?',
      options: ['11', '12', '13', '14'],
      correctAnswer: 2,
      explanation: 'Đồng bằng sông Cửu Long gồm 13 tỉnh/thành phố, là vùng sản xuất lúa gạo lớn nhất Việt Nam.',
    },
    {
      id: 'dl-8',
      question: 'Sa mạc lớn nhất thế giới là sa mạc nào?',
      options: ['Gobi', 'Sahara', 'Arabian', 'Kalahari'],
      correctAnswer: 1,
      explanation: 'Sa mạc Sahara ở Bắc Phi có diện tích khoảng 9,2 triệu km², lớn nhất trong các sa mạc nóng.',
    },
    {
      id: 'dl-9',
      question: 'Quốc gia nào có dân số đông nhất thế giới (2024)?',
      options: ['Trung Quốc', 'Ấn Độ', 'Mỹ', 'Indonesia'],
      correctAnswer: 1,
      explanation: 'Ấn Độ đã vượt Trung Quốc trở thành nước đông dân nhất thế giới với hơn 1,44 tỷ người.',
    },
    {
      id: 'dl-10',
      question: 'Vịnh Hạ Long thuộc tỉnh nào của Việt Nam?',
      options: ['Hải Phòng', 'Quảng Ninh', 'Thanh Hóa', 'Nghệ An'],
      correctAnswer: 1,
      explanation: 'Vịnh Hạ Long thuộc tỉnh Quảng Ninh, là Di sản Thiên nhiên Thế giới được UNESCO công nhận.',
    },
  ],

  // ---- TIẾNG ANH ----
  tienganh: [
    {
      id: 'ta-1',
      question: 'Choose the correct form: "She _____ to school every day."',
      options: ['go', 'goes', 'going', 'gone'],
      correctAnswer: 1,
      explanation: 'Chủ ngữ "She" (ngôi thứ 3 số ít) → động từ thêm "s/es" ở thì hiện tại đơn: goes.',
    },
    {
      id: 'ta-2',
      question: 'What is the past tense of "buy"?',
      options: ['buyed', 'bought', 'buied', 'buying'],
      correctAnswer: 1,
      explanation: '"Buy" là động từ bất quy tắc: buy - bought - bought.',
    },
    {
      id: 'ta-3',
      question: '"Ubiquitous" means:',
      options: [
        'Very rare',
        'Present everywhere',
        'Extremely old',
        'Highly dangerous',
      ],
      correctAnswer: 1,
      explanation: '"Ubiquitous" nghĩa là có mặt ở khắp nơi, xuất hiện ở mọi nơi (present everywhere).',
    },
    {
      id: 'ta-4',
      question: 'Choose the correct sentence:',
      options: [
        'If I was you, I will go.',
        'If I were you, I would go.',
        'If I am you, I would go.',
        'If I were you, I will go.',
      ],
      correctAnswer: 1,
      explanation: 'Câu điều kiện loại 2 (giải định không thật ở hiện tại): If + S + were/V-ed, S + would + V.',
    },
    {
      id: 'ta-5',
      question: 'Which word is a synonym of "happy"?',
      options: ['Sad', 'Angry', 'Delighted', 'Worried'],
      correctAnswer: 2,
      explanation: '"Delighted" = vui mừng, hạnh phúc → đồng nghĩa với "happy".',
    },
    {
      id: 'ta-6',
      question: '"He has been studying English _____ 5 years."',
      options: ['for', 'since', 'during', 'while'],
      correctAnswer: 0,
      explanation: '"For" dùng với khoảng thời gian (5 years). "Since" dùng với mốc thời gian (since 2020).',
    },
    {
      id: 'ta-7',
      question: 'What does the idiom "break the ice" mean?',
      options: [
        'Destroy something',
        'Start a conversation in a social situation',
        'Break a promise',
        'Cool down',
      ],
      correctAnswer: 1,
      explanation: '"Break the ice" = phá vỡ sự ngại ngùng, bắt đầu cuộc trò chuyện trong tình huống xã giao.',
    },
    {
      id: 'ta-8',
      question: 'Choose the correct word: "The book _____ on the table."',
      options: ['is', 'are', 'am', 'be'],
      correctAnswer: 0,
      explanation: '"The book" là danh từ số ít → dùng "is" (chủ ngữ số ít + is).',
    },
    {
      id: 'ta-9',
      question: 'Which sentence uses the Present Perfect correctly?',
      options: [
        'I have went to Paris.',
        'I have gone to Paris.',
        'I has gone to Paris.',
        'I have go to Paris.',
      ],
      correctAnswer: 1,
      explanation: 'Present Perfect: S + have/has + V3 (past participle). "Gone" là quá khứ phân từ của "go".',
    },
    {
      id: 'ta-10',
      question: '"Procrastinate" means:',
      options: [
        'To do something quickly',
        'To delay or postpone action',
        'To celebrate',
        'To organize carefully',
      ],
      correctAnswer: 1,
      explanation: '"Procrastinate" = trì hoãn, chần chừ không hành động (delay or postpone action).',
    },
  ],
};

// Hàm lấy câu hỏi từ danh sách mặc định HOẶC bộ đề tùy chỉnh trong localStorage
export function getRandomQuestions(categoryId, count) {
  return selectQuestions(getAllQuestions(categoryId), count);
}

// Lấy toàn bộ câu hỏi
export function getAllQuestions(categoryId) {
  if (questions[categoryId]) return questions[categoryId];

  return quizStore.getSnapshot().find((quiz) => quiz.id === categoryId || quiz.shareCode === categoryId)?.questions || [];
}

export function getQuizTime(questionCount) {
  return Math.min(questionCount * 60, 3600 * 2); // 1 phút / câu, tối đa 2 giờ
}
