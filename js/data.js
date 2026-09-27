/**
 * GEOGRAPHY EDU - DATA & STORAGE ENGINE (FIREBASE FIRESTORE)
 * High School Help Kit Project
 * 
 * Replaces localStorage with Cloud Firestore for persistent,
 * real-time data synchronization across all users and devices.
 */

// Synchronize global database and authentication references
var db = (typeof window !== "undefined" && window.db) || (typeof db !== "undefined" ? db : null);
var auth = (typeof window !== "undefined" && window.auth) || (typeof auth !== "undefined" ? auth : null);

if (typeof window !== "undefined") {
  window.addEventListener("firebase_ready", (e) => {
    db = (e.detail && e.detail.db) || window.db || db;
    auth = (e.detail && e.detail.auth) || window.auth || auth;
    if (window.geoDB && typeof window.geoDB.initStorage === "function") {
      window.geoDB.initStorage();
    }
  });
}

// Initial Seed Data for High School Help Kit
const DEFAULT_HSHK_POSTS = [
  {
    id: "hshk-1",
    title: "Khởi động Dự án High School Help Kit 2026",
    tag: "Dự án",
    author: "Ban Điều Hành HSHK",
    date: "15/08/2026",
    content: "High School Help Kit là dự án phi lợi nhuận hướng tới việc đồng hành, hỗ trợ học sinh THCS và THPT trên toàn quốc trong quá trình học tập môn Địa lí. Chúng tôi cung cấp hệ thống tài liệu chuẩn hoá, bài giảng tương tác và bộ đề thi phân loại chi tiết giúp học sinh tiếp cận kiến thức một cách trực quan, dễ hiểu nhất."
  },
  {
    id: "hshk-2",
    title: "Sứ mệnh Đồng hành & Đổi mới Phương pháp học Địa lý",
    tag: "Sứ mệnh",
    author: "Đội ngũ Học thuật",
    date: "18/08/2026",
    content: "Với mong muốn xóa bỏ quan niệm 'Địa lý là môn học thuộc lòng', High School Help Kit xây dựng ngân hàng sơ đồ tư duy, bảng biểu số liệu kinh tế - xã hội cập nhật và các bài phân tích chuyên sâu về Địa lý Tự nhiên & Địa lý Việt Nam theo chương trình GDPT mới."
  }
];

// Initial Seed Data for Group Địa Lí
const DEFAULT_GROUP_POSTS = [
  {
    id: "grp-1",
    title: "Chào mừng các bạn đến với Cộng đồng Group Địa Lí 4.0",
    tag: "Cộng đồng",
    author: "Admin Group",
    date: "10/08/2026",
    content: "Group Địa Lí là không gian mở dành cho học sinh, phụ huynh và giáo viên cùng trao đổi phương pháp học tập, giải đáp các câu hỏi khó trong đề thi học sinh giỏi, thi vào 10 và thi tốt nghiệp THPT. Hãy tham gia ngay để nhận tài liệu độc quyền mỗi tuần!"
  },
  {
    id: "grp-2",
    title: "Chuỗi Livestream: Bí kíp đọc Atlat & Phân tích Biểu đồ",
    tag: "Sự kiện",
    author: "Thầy Hoàng Nam (Cố vấn)",
    date: "20/08/2026",
    content: "Vào 20h00 tối thứ 7 hàng tuần trên Group, đội ngũ cố vấn sẽ tổ chức các buổi hướng dẫn kỹ năng khai thác triệt để Atlat Địa lí Việt Nam và nhận diện nhanh các dạng biểu đồ thường gặp."
  }
];

// Initial Seed Data for Geography Documents
// Categories:
// 1. main: "dai_cuong", sub: "tu_nhien"
// 2. main: "dai_cuong", sub: "kinh_te_xa_hoi"
// 3. main: "viet_nam",  sub: "tu_nhien"
// 4. main: "viet_nam",  sub: "kinh_te_xa_hoi"
const DEFAULT_DOCUMENTS = [
  // 1. Địa lí đại cương - Tự nhiên
  {
    id: "doc-dc-tn-1",
    title: "Hệ thống Các Quy luật Địa đới & Phi địa đới trong Địa lý Tự nhiên",
    mainCat: "dai_cuong",
    subCat: "tu_nhien",
    grade: "Lớp 10 - Nâng cao",
    format: "PDF",
    size: "4.2 MB",
    downloads: 0,
    views: 0,
    searches: 0,
    author: "Ban Chuyên Môn",
    date: "05/08/2026",
    desc: "Tài liệu tổng hợp các quy luật địa đới, đai cao, địa ô trong vỏ cảnh quan Trái Đất. Kèm sơ đồ tư duy minh họa và 50 câu trắc nghiệm vận dụng cao.",
    ratings: [5],
    avgRating: 5.0,
    fileUrl: "#",
    previewText: "Quy luật địa đới là quy luật phân bố của các thành phần địa lý và cảnh quan địa lý theo vĩ độ. Nguyên nhân bắt nguồn từ sự phân bố bức xạ Mặt Trời không đồng đều trên bề mặt Trái Đất dạng hình cầu..."
  },
  {
    id: "doc-dc-tn-2",
    title: "Cấu trúc Thạch quyển, Khí quyển & Thủy quyển - Sơ đồ tư duy toàn diện",
    mainCat: "dai_cuong",
    subCat: "tu_nhien",
    grade: "Lớp 10",
    format: "DOCX",
    size: "2.8 MB",
    downloads: 0,
    views: 0,
    searches: 0,
    author: "Thầy Trần Đức",
    date: "12/08/2026",
    desc: "Tóm tắt ngắn gọn các hiện tượng kiến tạo mảng, hoàn lưu khí quyển, các dòng hải lưu và chu trình tuần hoàn của nước.",
    ratings: [5],
    avgRating: 5.0,
    fileUrl: "#",
    previewText: "Thạch quyển bao gồm vỏ Trái Đất và phần trên của lớp manti. Thuyết kiến tạo mảng giải thích các hiện tượng động đất, núi lửa và hình thành các dãy núi uốn nếp..."
  },

  // 2. Địa lí đại cương - Kinh tế - Xã hội
  {
    id: "doc-dc-kt-1",
    title: "Địa lý Dân cư Thế giới & Vấn đề Đô thị hóa Toàn cầu",
    mainCat: "dai_cuong",
    subCat: "kinh_te_xa_hoi",
    grade: "Lớp 10 & THCS",
    format: "SLIDES",
    size: "6.5 MB",
    downloads: 0,
    views: 0,
    searches: 0,
    author: "Cô Minh Trang",
    date: "14/08/2026",
    desc: "Bộ slide trực quan về quy mô dân số, cơ cấu dân số theo tuổi và giới tính, tháp dân số, cũng như các tác động của chuyển cư và đô thị hóa.",
    ratings: [5],
    avgRating: 5.0,
    fileUrl: "#",
    previewText: "Gia tăng dân số tự nhiên và gia tăng cơ học. Khái niệm cơ cấu dân số vàng và già hóa dân số đang đặt ra nhiều thách thức cho phát triển bền vững toàn cầu..."
  },
  {
    id: "doc-dc-kt-2",
    title: "Chuyên đề Các Ngành Kinh tế: Nông nghiệp, Công nghiệp & Dịch vụ",
    mainCat: "dai_cuong",
    subCat: "kinh_te_xa_hoi",
    grade: "Lớp 10 - Tổng hợp",
    format: "PDF",
    size: "5.1 MB",
    downloads: 0,
    views: 0,
    searches: 0,
    author: "HSHK Geography Lab",
    date: "19/08/2026",
    desc: "Phân tích nhân tố ảnh hưởng, đặc điểm phân bố và xu hướng chuyển dịch của các ngành kinh tế trong thời đại cách mạng công nghiệp 4.0.",
    ratings: [5],
    avgRating: 5.0,
    fileUrl: "#",
    previewText: "Các hình thức tổ chức lãnh thổ công nghiệp: điểm công nghiệp, khu công nghiệp, trung tâm công nghiệp và vùng công nghiệp..."
  },

  // 3. Địa lí Việt Nam - Tự nhiên
  {
    id: "doc-vn-tn-1",
    title: "Đặc điểm Địa hình & Khoáng sản Việt Nam - Cẩm nang ôn thi vào 10 & THPT",
    mainCat: "viet_nam",
    subCat: "tu_nhien",
    grade: "Lớp 8, 9 & 12",
    format: "PDF",
    size: "7.4 MB",
    downloads: 0,
    views: 0,
    searches: 0,
    author: "Thầy Hoàng Nam",
    date: "08/08/2026",
    desc: "Chi tiết về 4 vùng địa hình chính (Đông Bắc, Tây Bắc, Trường Sơn Bắc, Trường Sơn Nam), đồi núi chiếm 3/4 diện tích và tính chất nhiệt đới ẩm gió mùa.",
    ratings: [5],
    avgRating: 5.0,
    fileUrl: "#",
    previewText: "Địa hình Việt Nam chủ yếu là đồi núi thấp (dưới 1000m chiếm 85%), hướng nghiêng chung Tây Bắc - Đông Nam và có tính chất phân bậc rõ rệt theo độ cao..."
  },
  {
    id: "doc-vn-tn-2",
    title: "Khí hậu & Thủy văn Việt Nam: Tính chất Nhiệt đới Ẩm Gió mùa",
    mainCat: "viet_nam",
    subCat: "tu_nhien",
    grade: "Lớp 8, 9 & 12",
    format: "DOCX",
    size: "3.6 MB",
    downloads: 0,
    views: 0,
    searches: 0,
    author: "Cô Lê Phương",
    date: "16/08/2026",
    desc: "Phân tích cơ chế hoạt động của gió mùa mùa đông và gió mùa mùa hạ, tính chất thất thường của thời tiết và mạng lưới sông ngòi dày đặc ở nước ta.",
    ratings: [5],
    avgRating: 5.0,
    fileUrl: "#",
    previewText: "Gió mùa Đông Bắc hoạt động từ tháng 11 đến tháng 4 năm sau gây ra mùa đông lạnh ở miền Bắc. Gió mùa Tây Nam mang lại lượng mưa lớn cho cả nước..."
  },

  // 4. Địa lí Việt Nam - Kinh tế - Xã hội
  {
    id: "doc-vn-kt-1",
    title: "Phân tích Chuyển dịch Cơ cấu Kinh tế & Vùng Kinh tế Trọng điểm Việt Nam",
    mainCat: "viet_nam",
    subCat: "kinh_te_xa_hoi",
    grade: "Lớp 9 & 12",
    format: "PDF",
    size: "5.8 MB",
    downloads: 0,
    views: 0,
    searches: 0,
    author: "Ban Học Thuật HSHK",
    date: "11/08/2026",
    desc: "Nghiên cứu cơ cấu ngành, cơ cấu thành phần kinh tế và cơ cấu lãnh thổ. Bài tập nhận xét bảng số liệu và vẽ biểu đồ miền, tròn, cột.",
    ratings: [5],
    avgRating: 5.0,
    fileUrl: "#",
    previewText: "Chuyển dịch cơ cấu ngành kinh tế theo hướng giảm tỷ trọng nông - lâm - thủy sản, tăng tỷ trọng công nghiệp - xây dựng và dịch vụ. Hình thành 3 vùng kinh tế trọng điểm Bắc, Trung, Nam..."
  },
  {
    id: "doc-vn-kt-2",
    title: "Thế mạnh & Hiện trạng Phát triển Vùng Đồng bằng Sông Hồng & Đông Nam Bộ",
    mainCat: "viet_nam",
    subCat: "kinh_te_xa_hoi",
    grade: "Lớp 9 & 12",
    format: "SLIDES",
    size: "8.1 MB",
    downloads: 0,
    views: 0,
    searches: 0,
    author: "Cô Nguyễn Hà",
    date: "17/08/2026",
    desc: "So sánh thế mạnh tự nhiên, nguồn lao động, cơ sở hạ tầng và định hướng phát triển công nghiệp công nghệ cao giữa hai vùng kinh tế đầu tàu đất nước.",
    ratings: [5],
    avgRating: 5.0,
    fileUrl: "#",
    previewText: "Đông Nam Bộ là vùng có tỷ trọng GDP công nghiệp cao nhất cả nước, dẫn đầu về thu hút vốn đầu tư nước ngoài (FDI) và xuất khẩu dầu khí, hàng dệt may, điện tử..."
  }
];

// Initial Seed Data for Dynamic Contact Information
const DEFAULT_CONTACT_INFO = {
  project_name: "High School Help Kit - Geography Edu",
  slogan: "Nền tảng tri thức & lưu trữ tài liệu Địa lý toàn diện dành cho học sinh Việt Nam",
  email: "geography.helpkit@gmail.com",
  hotline: "0988 123 456",
  fanpage_name: "High School Help Kit - Đồng Hành Cùng 2k",
  fanpage_url: "https://facebook.com/highschoolhelpkit",
  group_name: "Group Địa Lí - Chia Sẻ Đề Thi & Kiến Thức Môn Địa",
  group_url: "https://facebook.com/groups/geography.edu.vn",
  address: "Tòa nhà Tri Thức Sáng Tạo, Quận Cầu Giấy, Hà Nội, Việt Nam",
  work_hours: "08:00 - 21:00 (Thứ 2 - Chủ Nhật)"
};

// Initial Seed Data for Confessions / Questions
const DEFAULT_CONFESSIONS = [
  {
    id: "cfs-1",
    senderName: "Học sinh 2k9",
    senderEmail: "hocsinh2k9@gmail.com",
    category: "Confession",
    subject: "Tâm sự về phương pháp học ôn thi vào 10 Chuyên Địa",
    message: "Em chào các anh chị admin HSHK ạ! Em đang học lớp 9 và có mục tiêu thi vào Chuyên Địa. Nhiều khi em thấy hơi mất phương hướng vì không biết cách nhớ số liệu Atlat và giải thích các quy luật địa lý tự nhiên sao cho sâu sắc. Mong các anh chị cho em lời khuyên với ạ!",
    isAnonymous: true,
    createdAt: "22/08/2026 14:30",
    timestamp: 1787400000000,
    status: "answered",
    reply: "Chào em nhé! Để ôn thi Chuyên Địa, em không cần học vẹt số liệu mà hãy nắm vững các quy luật cốt lõi (Địa đới, Đai cao, Hoàn lưu gió mùa). Khi vẽ sơ đồ tư duy liên kết nguyên nhân - hệ quả, em sẽ thấy Atlat chính là cuốn 'tài liệu mở' cực kỳ logic. Em hãy tham khảo các chuyên đề Tự nhiên của Lab trên web nhé!",
    replyBy: "Trần Huy Vũ (Admin)",
    replyDate: "23/08/2026 09:15"
  },
  {
    id: "cfs-2",
    senderName: "Minh Anh",
    senderEmail: "minhanh.geo@gmail.com",
    category: "Hỏi đáp",
    subject: "Hỏi về cách phân biệt gió phơn Tây Nam và gió mùa Tây Nam",
    message: "Em chào thầy cô và ban quản trị, em hay bị nhầm lẫn giữa nguồn gốc của Gió phơn Tây Nam đầu mùa hạ và Gió mùa Tây Nam giữa và cuối mùa hạ ở nước ta. Admin có thể giải thích ngắn gọn giúp em được không ạ?",
    isAnonymous: false,
    createdAt: "24/08/2026 16:45",
    timestamp: 1787500000000,
    status: "answered",
    reply: "Chào Minh Anh! Điểm mấu chốt là: Đầu mùa hạ, khối khí nhiệt đới ẩm Bắc Ấn Độ Dương (TBg) thổi vào gây mưa cho Tây Nguyên, sau đó vượt dãy Trường Sơn bị biến tính khô nóng tạo thành Gió Phơn Tây Nam. Còn giữa & cuối mùa hạ, gió có nguồn gốc từ khối khí xích đạo (áp cao cận chí tuyến Nam bán cầu) di chuyển lên gây mưa lớn diện rộng cho cả nước.",
    replyBy: "Ban Học Thuật HSHK",
    replyDate: "24/08/2026 18:20"
  }
];

// Initial Seed Users — Danh sách tài khoản Admin & Học sinh mẫu
const DEFAULT_USERS = [
  {
    id: "usr-admin",
    name: "Trần Huy Vũ",
    email: "vut510624@gmail.com",
    password: "$pbkdf2$100000$434c44bf0c90bdea60062b1eba29357f$5a02e7de66850295bc219e6c8007a7c730d79b81d31dbe4e6c6f0f2e6c121b62",
    authProvider: "password",
    role: "admin",
    userType: "Admin",
    createdAt: "01/08/2026"
  },
  {
    id: "usr-admin-hshk",
    name: "Ban Điều Hành HSHK",
    email: "hshk.project@gmail.com",
    password: "$pbkdf2$100000$434c44bf0c90bdea60062b1eba29357f$5a02e7de66850295bc219e6c8007a7c730d79b81d31dbe4e6c6f0f2e6c121b62",
    authProvider: "password",
    role: "admin",
    userType: "Admin",
    createdAt: "25/08/2026"
  },
  {
    id: "usr-demo-student",
    name: "Học Sinh Mẫu",
    email: "hocsinh@gmail.com",
    password: "$pbkdf2$100000$a1b2c3d4e5f60718$c304361bcfa30eb627b6618ed54345063c8c2176aed29541c7004d83680b6c82",
    authProvider: "password",
    role: "user",
    userType: "Học sinh THCS",
    createdAt: "01/09/2026"
  },
  {
    id: "ivcsznnBZbb2QzALw7qubvpUTYb2",
    name: "Nguyen Van Hoc Sinh",
    email: "hocsinh_moi_20260918194401@gmail.com",
    password: "$pbkdf2$100000$386a911f859ec128ef74256755ad63a4$0d49d2db1fa549c9b4a22bc38859f1fc3ac346cedc17b1039263a05b498b716b",
    userType: "Học sinh THCS",
    role: "user",
    authProvider: "firebase",
    createdAt: "18/9/2026"
  },
  {
    id: "sKREaKAWZrUwHj73FcAKl689K5M2",
    name: "Nguyen Van CrossSession",
    email: "hocsinh_cross_20260918194457@gmail.com",
    password: "$pbkdf2$100000$3c38d038849b402c51810779ead33c45$fee1f6137b9830f2deb5fe134e45849739bbca60c635526034e04d349d390305",
    userType: "Học sinh THCS",
    role: "user",
    authProvider: "firebase",
    createdAt: "18/9/2026"
  },
  {
    id: "JBA7K6JyLLace5C2LGtQFqkECT03",
    name: "Nguyen Van Thanh Cong",
    email: "live_user_20260918194539@gmail.com",
    password: "$pbkdf2$100000$84168894b351007d2990e12e4416d681$232c65962938e5cb66786e83458e74a106663d525559e053e73d0d13d025282b",
    userType: "Học sinh THCS",
    role: "user",
    authProvider: "firebase",
    createdAt: "18/9/2026"
  },
  {
    id: "25TelgBYIMbSmPVvoaTjH71kP6i2",
    name: "Tran Modal Test",
    email: "modal_user_20260918194616@gmail.com",
    password: "$pbkdf2$100000$51eb41868ec899e73d8cd6db0e1b9543$f3cd1f6a5963727fb38cf4de3e2aaaca41b53e611a9e8a6513298cbd6467bcee",
    userType: "Học sinh THCS",
    role: "user",
    authProvider: "firebase",
    createdAt: "18/9/2026"
  }
];

// Initial Seed Data for Exams & Surveys (Phòng thi & Khảo sát trực tuyến)
const DEFAULT_EXAMS = [
  {
    id: "exam-sample-geo10",
    title: "Khảo Sát Địa Lí 10: Thạch Quyển & Tác Động Nội Lực, Ngoại Lực",
    code: "GEO10-TEST",
    durationMinutes: 15,
    mode: "view_and_submit",
    lockBrowser: true,
    content: "ĐỀ KHẢO SÁT CHẤT LƯỢNG ĐỊA LÍ 10 (THỜI GIAN: 15 PHÚT)\n\nCâu 1 (5.0 điểm): Trình bày khái niệm Thạch quyển. Phân biệt Thạch quyển với Vỏ Trái Đất về phạm vi giới hạn, độ dày và cấu tạo vật chất?\n\nCâu 2 (5.0 điểm): Phân tích tác động của nội lực và ngoại lực đến việc hình thành địa hình bề mặt Trái Đất. Vì sao nói nội lực và ngoại lực là hai lực đối nghịch nhau nhưng lại diễn ra đồng thời?",
    createdBy: "Ban Chuyên Môn Địa Lí",
    creatorEmail: "hshk.project@gmail.com",
    createdAt: 1725000000000,
    createdDateStr: "01/09/2026",
    isActive: true
  },
  {
    id: "exam-sample-survey",
    title: "Phiếu Khảo Sát Nhu Cầu & Đánh Giá Chất Lượng Học Tập Địa Lí",
    code: "GEO-KHAOSAT",
    durationMinutes: 10,
    mode: "view_and_submit",
    lockBrowser: false,
    content: "PHIẾU KHẢO SÁT CHẤT LƯỢNG HỌC TẬP ĐỊA LÍ (THỜI GIAN: 10 PHÚT)\n\n1. Bạn đang là học sinh lớp mấy? (Ví dụ: Lớp 9, Lớp 10, Lớp 11, Lớp 12...)\n2. Bạn gặp khó khăn lớn nhất ở phân môn nào? (Địa lí tự nhiên / Địa lí kinh tế - xã hội / Kỹ năng khai thác Atlat & Nhận diện biểu đồ)\n3. Bạn mong muốn dự án High School Help Kit bổ sung thêm tài liệu hoặc dạng bài tập nào nhất trong thời gian tới?\n4. Ý kiến đóng góp & Đề xuất tính năng mới gửi tới Ban Quản Trị:",
    createdBy: "Ban Quản Trị HSHK",
    creatorEmail: "hshk.project@gmail.com",
    createdAt: 1725100000000,
    createdDateStr: "01/09/2026",
    isActive: true
  }
];

// Initial Seed Data for Exam Countdown Settings (Configured by Admin)
const DEFAULT_COUNTDOWN_SETTINGS = {
  examName: "Kỳ Thi Tuyển Sinh Vào Lớp 10 Năm 2027",
  targetDate: "2027-06-08T07:30",
  targetTimestamp: new Date("2027-06-08T07:30:00+07:00").getTime(),
  slogan: "Hãy nỗ lực từng ngày, cánh cổng trường Chuyên và THPT mơ ước đang rộng mở chờ đón bạn!",
  updatedAt: "27/08/2026",
  updatedBy: "Ban Quản Trị"
};

// Storage Keys (kept for compatibility reference and offline caching)
const STORAGE_KEYS = {
  HSHK_POSTS: "geo_edu_hshk_posts",
  GROUP_POSTS: "geo_edu_group_posts",
  DOCUMENTS: "geo_edu_documents",
  CONTACT: "geo_edu_contact_info",
  USERS: "geo_edu_users",
  CURRENT_USER: "geo_edu_current_user",
  SAVED_DOCS: "geo_edu_saved_docs", // format: { [userEmail]: [docId1, docId2] }
  CONFESSIONS: "geo_edu_confessions",
  EXAMS: "geo_edu_exams_cache",
  EXAM_SUBMISSIONS: "geo_edu_exam_submissions_cache",
  DELETED_DOC_IDS: "geo_edu_deleted_doc_ids",
  DELETED_POST_IDS: "geo_edu_deleted_post_ids"
};
window.STORAGE_KEYS = STORAGE_KEYS;

// Firestore Collection Names
const COLLECTIONS = {
  HSHK_POSTS: "hshk_posts",
  GROUP_POSTS: "group_posts",
  DOCUMENTS: "documents",
  CONTACT: "contact_info",
  USERS: "users",
  SAVED_DOCS: "saved_docs",
  CONFESSIONS: "confessions",
  BLOCKED_EMAILS: "blocked_emails",
  TELEMETRY: "user_telemetry",
  GLOBE_OVERRIDES: "globe_country_overrides",
  EXAMS: "exams",
  EXAM_SUBMISSIONS: "exam_submissions"
};
window.COLLECTIONS = COLLECTIONS;

// List of Admin Emails
const ADMIN_EMAILS = [
  "vut510624@gmail.com",
  "hshk.project@gmail.com"
];

// --- DATA ACCESS LAYER (DAL) — FIRESTORE-BACKED ---
class GeoDataManager {
  constructor() {
    // Tombstone sets for permanently deleted items (prevents Firestore onSnapshot resurrection)
    this._deletedDocIds = this._loadDeletedDocIds();
    this._deletedPostIds = this._loadDeletedPostIds();

    // In-memory cache for synchronous access (populated by listeners)
    this._cache = {
      hshkPosts: this._loadCachedHshkPosts(),
      groupPosts: this._loadCachedGroupPosts(),
      documents: this._loadCachedDocuments(),
      contactInfo: { ...DEFAULT_CONTACT_INFO },
      countdown: { ...DEFAULT_COUNTDOWN_SETTINGS },
      users: this._loadCachedUsers(),
      savedDocs: this._loadCachedSavedDocs(),
      confessions: this._loadCachedConfessions(),
      blockedEmails: [],
      telemetry: {
        enabled: false,
        updatedAt: ""
      },
      maintenance: {
        enabled: false,
        password: "$pbkdf2$100000$f0e1d2c3b4a5968778695a4b3c2d1e0f$d361285245ff8d8cf7309e9be6bb38f5df4f3f958ef4f0f8289c0fc2ee8ef7c8",
        updatedAt: "26/08/2026",
        updatedBy: "Nhà sáng tạo"
      },
      developerSettings: {
        disableGoogleLogin: false,
        disableAiMode: false,
        updatedAt: "",
        updatedBy: "Nhà phát triển"
      },
      exams: this._loadCachedExams(),
      examSubmissions: this._loadCachedExamSubmissions()
    };
    this._listenersAttached = false;
    this._initialized = false;
    this._unsubConfessions = null;
    this._unsubSavedDocs = null;
    this._unsubUsers = null;
    this._initPromise = this.initStorage();

    if (typeof window !== "undefined") {
      window.addEventListener("firebase_ready", () => {
        this.initStorage();
      });
      window.addEventListener("auth_state_changed", () => {
        this.syncAuthRoleData();
      });
      window.addEventListener("geo_auth_state_changed", () => {
        this.syncAuthRoleData();
      });
    }
  }

  getDb() {
    return (typeof window !== "undefined" && window.db) || (typeof db !== "undefined" ? db : null);
  }

  _loadDeletedDocIds() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DELETED_DOC_IDS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch (e) {}
    return new Set();
  }

  _loadDeletedPostIds() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DELETED_POST_IDS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch (e) {}
    return new Set();
  }

  _loadCachedHshkPosts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HSHK_POSTS);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter(p => !this._deletedPostIds.has(p.id));
        }
      }
    } catch (e) {}
    return DEFAULT_HSHK_POSTS.filter(p => !this._deletedPostIds.has(p.id));
  }

  _loadCachedGroupPosts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.GROUP_POSTS);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter(p => !this._deletedPostIds.has(p.id));
        }
      }
    } catch (e) {}
    return DEFAULT_GROUP_POSTS.filter(p => !this._deletedPostIds.has(p.id));
  }

  _loadCachedDocuments() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter(d => !this._deletedDocIds.has(d.id));
        }
      }
    } catch (e) {}
    return DEFAULT_DOCUMENTS.filter(d => !this._deletedDocIds.has(d.id));
  }

  _loadCachedSavedDocs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SAVED_DOCS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch (e) {}
    return {};
  }

  _loadCachedExams() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.EXAMS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [...DEFAULT_EXAMS];
  }

  _loadCachedExamSubmissions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.EXAM_SUBMISSIONS);
      if (raw) {
        let parsed = null;
        if (typeof GeoCryptoVault !== "undefined" && typeof GeoCryptoVault.decrypt === "function") {
          parsed = GeoCryptoVault.decrypt(raw);
        }
        if (!parsed) {
          try { parsed = JSON.parse(raw); } catch (e) {}
        }
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  }

  _saveCachedExamSubmissions(submissions) {
    try {
      if (typeof GeoCryptoVault !== "undefined" && typeof GeoCryptoVault.encrypt === "function") {
        localStorage.setItem(STORAGE_KEYS.EXAM_SUBMISSIONS, GeoCryptoVault.encrypt(submissions));
      } else {
        localStorage.setItem(STORAGE_KEYS.EXAM_SUBMISSIONS, JSON.stringify(submissions));
      }
    } catch (e) {}
  }

  _loadCachedUsers() {
    const userMap = new Map();
    if (typeof DEFAULT_USERS !== "undefined" && Array.isArray(DEFAULT_USERS)) {
      DEFAULT_USERS.forEach(u => {
        if (u && u.email) userMap.set(u.email.toLowerCase().trim(), { ...u });
      });
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USERS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(u => {
            if (u && u.email) {
              const emailKey = u.email.toLowerCase().trim();
              const existing = userMap.get(emailKey);
              userMap.set(emailKey, { ...existing, ...u });
            }
          });
        }
      }
    } catch (e) {}

    // [SECURITY FIX VULN-07] Only sync remote user list if current user is Admin.
    // Regular users must never receive the full user list from the backend.
    if (typeof window !== "undefined") {
      setTimeout(() => {
        if (window.geoAuth && typeof window.geoAuth.fetchRemoteUsers === "function" && window.geoAuth.isAdmin()) {
          window.geoAuth.fetchRemoteUsers().catch(() => {});
        }
      }, 50);
    }

    return Array.from(userMap.values());
  }

  _loadCachedConfessions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CONFESSIONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const seen = new Set();
          const list = [];
          for (const item of parsed) {
            if (!item) continue;
            const normMsg = (item.message || "").trim();
            const timeBucket = Math.floor((item.timestamp || 0) / 6000);
            const key = item.id ? item.id : `${normMsg}_${timeBucket}`;
            const dupContentKey = `${normMsg}_${timeBucket}`;
            if (!seen.has(key) && !seen.has(dupContentKey)) {
              seen.add(key);
              seen.add(dupContentKey);
              list.push(item);
            }
          }
          return list;
        }
      }
    } catch (e) {}
    return [];
  }

  // Wait for initialization to complete (with fast timeout fallback to cached data)
  async ready() {
    try {
      await Promise.race([
        this._initPromise,
        new Promise(resolve => setTimeout(resolve, 1500))
      ]);
    } catch (e) {}
    return this;
  }

  async initStorage() {
    const firestore = this.getDb();
    if (!firestore) {
      console.warn("[Firestore] Notice: DB not ready yet, deferring initStorage.");
      this._initialized = true;
      return;
    }
    const db = firestore;
    try {
      // 1. Seed HSHK Posts if empty
      try {
        const hshkSnap = await db.collection(COLLECTIONS.HSHK_POSTS).get();
        if (hshkSnap.empty) {
          console.log("[Firestore] Seeding hshk_posts...");
          for (const post of DEFAULT_HSHK_POSTS) {
            await db.collection(COLLECTIONS.HSHK_POSTS).doc(post.id).set(post);
          }
        }
      } catch(e) { console.warn("[Firestore] Notice: hshk_posts seed skipped:", e.message); }

      // 2. Seed Group Posts if empty
      try {
        const groupSnap = await db.collection(COLLECTIONS.GROUP_POSTS).get();
        if (groupSnap.empty) {
          console.log("[Firestore] Seeding group_posts...");
          for (const post of DEFAULT_GROUP_POSTS) {
            await db.collection(COLLECTIONS.GROUP_POSTS).doc(post.id).set(post);
          }
        }
      } catch(e) { console.warn("[Firestore] Notice: group_posts seed skipped:", e.message); }

      // 3. Seed Documents if empty
      try {
        const docsSnap = await db.collection(COLLECTIONS.DOCUMENTS).get();
        if (docsSnap.empty) {
          console.log("[Firestore] Seeding documents...");
          for (const doc of DEFAULT_DOCUMENTS) {
            await db.collection(COLLECTIONS.DOCUMENTS).doc(doc.id).set(doc);
          }
        }
      } catch(e) { console.warn("[Firestore] Notice: documents seed skipped:", e.message); }

      // 4. Seed Contact Info if not exists
      try {
        const contactDoc = await db.collection(COLLECTIONS.CONTACT).doc("main").get();
        if (!contactDoc.exists) {
          console.log("[Firestore] Seeding contact_info...");
          await db.collection(COLLECTIONS.CONTACT).doc("main").set(DEFAULT_CONTACT_INFO);
        }
      } catch(e) { console.warn("[Firestore] Notice: contact_info seed skipped:", e.message); }

      // 5. Seed Confessions if empty
      try {
        const cfsSnap = await db.collection(COLLECTIONS.CONFESSIONS).get();
        if (cfsSnap.empty) {
          console.log("[Firestore] Seeding confessions...");
          for (const cfs of DEFAULT_CONFESSIONS) {
            await db.collection(COLLECTIONS.CONFESSIONS).doc(cfs.id).set(cfs);
          }
        }
      } catch(e) { console.warn("[Firestore] Notice: confessions seed skipped:", e.message); }

      // 6. Ensure Admin users exist and are up to date
      try {
        for (const adminUser of DEFAULT_USERS) {
          const adminDoc = await db.collection(COLLECTIONS.USERS).doc(adminUser.id).get();
          if (!adminDoc.exists) {
            console.log(`[Firestore] Seeding admin user (${adminUser.email})...`);
            await db.collection(COLLECTIONS.USERS).doc(adminUser.id).set(adminUser);
          } else {
            // Update admin info to latest
            await db.collection(COLLECTIONS.USERS).doc(adminUser.id).update({
              name: adminUser.name,
              password: adminUser.password,
              role: adminUser.role || "user",
              userType: adminUser.userType || "Học sinh THCS"
            });
          }
        }
      } catch(e) { console.warn("[Firestore] Notice: admin users seed skipped:", e.message); }

      try {
        // Remove legacy admin account if exists
        const legacyAdminSnap = await db.collection(COLLECTIONS.USERS)
          .where("email", "==", "admin@geography.edu.vn").get();
        legacyAdminSnap.forEach(doc => doc.ref.delete());
      } catch(e) { console.warn("[Firestore] Notice: legacy admin removal skipped:", e.message); }

      // 7. Ensure saved_docs collection has at least a placeholder
      try {
        const savedDocsSnap = await db.collection(COLLECTIONS.SAVED_DOCS).doc("_placeholder").get();
        if (!savedDocsSnap.exists) {
          await db.collection(COLLECTIONS.SAVED_DOCS).doc("_placeholder").set({ initialized: true });
        }
      } catch(e) { console.warn("[Firestore] Notice: saved_docs placeholder skipped:", e.message); }

      // 8. Seed Default Sample Exams if empty
      try {
        const examsSnap = await db.collection(COLLECTIONS.EXAMS).get();
        if (examsSnap.empty) {
          console.log("[Firestore] Seeding default sample exams...");
          for (const sampleExam of DEFAULT_EXAMS) {
            await db.collection(COLLECTIONS.EXAMS).doc(sampleExam.id).set(sampleExam);
          }
        }
      } catch (examErr) {
        console.warn("[Firestore] Notice: Exams seed skipped or unauthorized:", examErr.message);
      }

      // Load initial cache
      await this._refreshAllCache();

      // Setup real-time listeners
      this._setupRealtimeListeners();

      this._initialized = true;
      console.log("[Firestore] Data initialization complete.");

    } catch (err) {
      console.error("[Firestore] Init error:", err);
      // Fallback: try loading from cache anyway
      this._initialized = true;
    }
  }

  // --- REAL-TIME LISTENERS (replaces localStorage polling + storage events) ---
  _setupRealtimeListeners() {
    if (this._listenersAttached) return;
    const firestore = this.getDb();
    if (!firestore) return;
    this._listenersAttached = true;
    const db = firestore;
    // HSHK Posts listener
    db.collection(COLLECTIONS.HSHK_POSTS).onSnapshot(snapshot => {
      const remoteList = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        if (doc.id && !d.isDeleted && !this._deletedPostIds.has(doc.id)) {
          remoteList.push({ id: doc.id, ...d });
        }
      });
      remoteList.sort((a, b) => (b.id > a.id ? 1 : -1));
      this._cache.hshkPosts = remoteList;
      try { localStorage.setItem(STORAGE_KEYS.HSHK_POSTS, JSON.stringify(remoteList)); } catch (e) {}
      window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "hshk_posts" } }));
    });

    // Group Posts listener
    db.collection(COLLECTIONS.GROUP_POSTS).onSnapshot(snapshot => {
      const remoteList = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        if (doc.id && !d.isDeleted && !this._deletedPostIds.has(doc.id)) {
          remoteList.push({ id: doc.id, ...d });
        }
      });
      remoteList.sort((a, b) => (b.id > a.id ? 1 : -1));
      this._cache.groupPosts = remoteList;
      try { localStorage.setItem(STORAGE_KEYS.GROUP_POSTS, JSON.stringify(remoteList)); } catch (e) {}
      window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "group_posts" } }));
    });

    // Documents listener
    db.collection(COLLECTIONS.DOCUMENTS).onSnapshot(snapshot => {
      const remoteList = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        if (doc.id && !d.isDeleted && !this._deletedDocIds.has(doc.id)) {
          remoteList.push({ id: doc.id, ...d });
        }
      });
      remoteList.sort((a, b) => (b.id > a.id ? 1 : -1));
      this._cache.documents = remoteList;
      try { localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(remoteList)); } catch (e) {}
      window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "documents" } }));
    });

    // Contact Info listener
    db.collection(COLLECTIONS.CONTACT).doc("main").onSnapshot(doc => {
      if (doc.exists) {
        this._cache.contactInfo = doc.data();
      }
      window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "contact_info" } }));
    });

    // Maintenance listener
    db.collection(COLLECTIONS.CONTACT).doc("maintenance").onSnapshot(doc => {
      if (doc.exists) {
        this._cache.maintenance = {
          ...this._cache.maintenance,
          ...doc.data()
        };
      }
      window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "maintenance" } }));
      window.dispatchEvent(new CustomEvent("maintenance_state_changed", { detail: this._cache.maintenance }));
    });

    // Exam Countdown listener
    db.collection(COLLECTIONS.CONTACT).doc("countdown").onSnapshot(doc => {
      if (doc.exists) {
        this._cache.countdown = {
          ...this._cache.countdown,
          ...doc.data()
        };
      }
      window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "countdown" } }));
      window.dispatchEvent(new CustomEvent("countdown_settings_changed", { detail: this._cache.countdown }));
    });

    // Developer Settings listener
    db.collection(COLLECTIONS.CONTACT).doc("developer_settings").onSnapshot(doc => {
      if (doc.exists) {
        this._cache.developerSettings = {
          ...this._cache.developerSettings,
          ...doc.data()
        };
      }
      window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "developer_settings" } }));
      window.dispatchEvent(new CustomEvent("developer_settings_changed", { detail: this._cache.developerSettings }));
    });

    // Confessions listener (Dynamic for Admin vs Public/Student)
    this._attachConfessionsListener();

    // Users listener (Admin only)
    this._attachUsersListener();

    // Saved Docs listener (Admin vs Own documents)
    this._attachSavedDocsListener();

    // Exams listener
    try {
      db.collection(COLLECTIONS.EXAMS).onSnapshot(snapshot => {
        const list = [];
        snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        const localExams = this._loadCachedExams();
        const merged = [...list];
        localExams.forEach(loc => {
          if (!merged.some(m => m.id === loc.id || (m.code && loc.code && m.code.toUpperCase() === loc.code.toUpperCase()))) {
            merged.push(loc);
          }
        });
        this._cache.exams = merged.length > 0 ? merged : [...DEFAULT_EXAMS];
        this._cache.exams.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        try { localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(this._cache.exams)); } catch (e) {}
        window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "exams" } }));
        window.dispatchEvent(new CustomEvent("exams_data_changed", { detail: this._cache.exams }));
      }, err => {
        console.warn("[Firestore] Exams listener warning:", err.message);
      });
    } catch (e) {}

    // Exam Submissions listener
    try {
      db.collection(COLLECTIONS.EXAM_SUBMISSIONS).onSnapshot(snapshot => {
        const list = [];
        snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        const localSubs = this._loadCachedExamSubmissions();
        const merged = [...list];
        localSubs.forEach(loc => {
          if (!merged.some(m => m.id === loc.id)) {
            merged.push(loc);
          }
        });
        this._cache.examSubmissions = merged;
        this._cache.examSubmissions.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
        this._saveCachedExamSubmissions(this._cache.examSubmissions);
        window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "exam_submissions" } }));
        window.dispatchEvent(new CustomEvent("exam_submissions_changed", { detail: this._cache.examSubmissions }));
      }, err => {
        console.warn("[Firestore] Submissions listener warning:", err.message);
      });
    } catch (e) {}

    // Blocked Emails listener
    try {
      db.collection(COLLECTIONS.BLOCKED_EMAILS).onSnapshot(snapshot => {
        this._cache.blockedEmails = [];
        snapshot.forEach(doc => this._cache.blockedEmails.push({ id: doc.id, ...doc.data() }));
        this._cache.blockedEmails.sort((a, b) => (b.blockedTimestamp || 0) - (a.blockedTimestamp || 0));
        window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "blocked_emails" } }));
        window.dispatchEvent(new CustomEvent("blocked_emails_changed", { detail: this._cache.blockedEmails }));
      }, err => {
        console.warn("[Firestore] Blocked emails listener notice:", err.message);
      });
    } catch (e) {}

    // Telemetry Config listener
    try {
      db.collection(COLLECTIONS.CONTACT).doc("telemetry_config").onSnapshot(doc => {
        if (doc.exists) {
          this._cache.telemetry = {
            ...this._cache.telemetry,
            ...doc.data()
          };
        }
        window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "telemetry" } }));
        window.dispatchEvent(new CustomEvent("telemetry_state_changed", { detail: this._cache.telemetry }));
      }, err => {
        console.warn("[Firestore] Telemetry config listener notice:", err.message);
      });
    } catch (e) {}

    console.log("[Firestore] Real-time listeners active.");
  }

  _attachConfessionsListener() {
    if (this._unsubConfessions) {
      try { this._unsubConfessions(); } catch (e) {}
      this._unsubConfessions = null;
    }
    const firestore = this.getDb();
    if (!firestore) return;
    const db = firestore;
    const isAdmin = window.geoAuth && typeof window.geoAuth.isAdmin === "function" && window.geoAuth.isAdmin();
    try {
      const query = isAdmin 
        ? db.collection(COLLECTIONS.CONFESSIONS)
        : db.collection(COLLECTIONS.CONFESSIONS).where("status", "==", "answered");

      this._unsubConfessions = query.onSnapshot(snapshot => {
        const list = [];
        const seen = new Set();
        snapshot.forEach(doc => {
          const data = doc.data();
          const item = { id: doc.id, ...data };
          const normMsg = (item.message || "").trim();
          const timeBucket = Math.floor((item.timestamp || 0) / 6000);
          const dupContentKey = `${normMsg}_${timeBucket}`;
          if (!seen.has(doc.id) && !seen.has(dupContentKey)) {
            seen.add(doc.id);
            seen.add(dupContentKey);
            list.push(item);
          }
        });
        this._cache.confessions = list;
        this._cache.confessions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "confessions" } }));
      }, err => {
        console.warn("[Firestore] Confessions listener notice:", err.message);
      });
    } catch (e) {
      console.warn("[Firestore] Confessions listener attach notice:", e);
    }
  }

  _attachUsersListener() {
    if (this._unsubUsers) {
      try { this._unsubUsers(); } catch (e) {}
      this._unsubUsers = null;
    }
    const firestore = this.getDb();
    if (!firestore) return;
    const db = firestore;
    const isAdmin = window.geoAuth && typeof window.geoAuth.isAdmin === "function" && window.geoAuth.isAdmin();
    if (!isAdmin) return;

    try {
      this._unsubUsers = db.collection(COLLECTIONS.USERS).onSnapshot(snapshot => {
        const remoteUsers = [];
        snapshot.forEach(doc => remoteUsers.push({ id: doc.id, ...doc.data() }));

        const userMap = new Map();
        if (typeof DEFAULT_USERS !== "undefined" && Array.isArray(DEFAULT_USERS)) {
          DEFAULT_USERS.forEach(u => {
            if (u && u.email) userMap.set(u.email.toLowerCase().trim(), { ...u });
          });
        }
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.USERS);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach(u => {
                if (u && u.email) userMap.set(u.email.toLowerCase().trim(), { ...userMap.get(u.email.toLowerCase().trim()), ...u });
              });
            }
          }
        } catch (e) {}
        if (Array.isArray(this._cache.users)) {
          this._cache.users.forEach(u => {
            if (u && u.email) userMap.set(u.email.toLowerCase().trim(), { ...userMap.get(u.email.toLowerCase().trim()), ...u });
          });
        }
        remoteUsers.forEach(u => {
          if (u && u.email) userMap.set(u.email.toLowerCase().trim(), { ...userMap.get(u.email.toLowerCase().trim()), ...u });
        });

        this._cache.users = Array.from(userMap.values());
        try {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(this._cache.users));
        } catch (e) {}

        window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "users" } }));
        if (window.appState && window.appState.currentTab === "admin-panel" && typeof renderAdminDashboard === "function") {
          renderAdminDashboard();
        }
      }, err => {
        console.warn("[Firestore] Users listener notice:", err.message);
      });
    } catch (e) {}
  }

  _attachSavedDocsListener() {
    if (this._unsubSavedDocs) {
      try { this._unsubSavedDocs(); } catch (e) {}
      this._unsubSavedDocs = null;
    }
    const firestore = this.getDb();
    if (!firestore) return;
    const db = firestore;
    const isAdmin = window.geoAuth && typeof window.geoAuth.isAdmin === "function" && window.geoAuth.isAdmin();
    const currentUser = window.geoAuth ? (window.geoAuth.currentUser || (typeof window.geoAuth.getCurrentUser === "function" ? window.geoAuth.getCurrentUser() : null)) : null;

    try {
      if (isAdmin) {
        this._unsubSavedDocs = db.collection(COLLECTIONS.SAVED_DOCS).onSnapshot(snapshot => {
          const remoteSaved = {};
          snapshot.forEach(doc => {
            if (doc.id !== "_placeholder") {
              const data = doc.data();
              remoteSaved[doc.id] = data.docIds || [];
            }
          });
          const localSaved = this._loadCachedSavedDocs();
          this._cache.savedDocs = { ...localSaved, ...remoteSaved };
          try { localStorage.setItem(STORAGE_KEYS.SAVED_DOCS, JSON.stringify(this._cache.savedDocs)); } catch (e) {}
          window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "saved_docs" } }));
        }, err => {
          console.warn("[Firestore] Saved docs listener notice:", err.message);
        });
      } else if (currentUser && currentUser.email) {
        const cleanEmail = currentUser.email.toLowerCase().trim();
        this._unsubSavedDocs = db.collection(COLLECTIONS.SAVED_DOCS).doc(cleanEmail).onSnapshot(doc => {
          if (doc.exists) {
            const data = doc.data();
            this._cache.savedDocs[cleanEmail] = data.docIds || [];
            try { localStorage.setItem(STORAGE_KEYS.SAVED_DOCS, JSON.stringify(this._cache.savedDocs)); } catch (e) {}
            window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "saved_docs" } }));
          }
        }, err => {
          console.warn("[Firestore] User saved docs listener notice:", err.message);
        });
      }
    } catch (e) {
      console.warn("[Firestore] Saved docs listener attach notice:", e);
    }
  }

  async syncAuthRoleData() {
    this._attachConfessionsListener();
    this._attachSavedDocsListener();
    this._attachUsersListener();
    const isAdmin = window.geoAuth && typeof window.geoAuth.isAdmin === "function" && window.geoAuth.isAdmin();

    // [SECURITY FIX VULN-07] Only fetch remote users if current user is Admin.
    if (window.geoAuth && typeof window.geoAuth.fetchRemoteUsers === "function" && window.geoAuth.isAdmin()) {
      try {
        await window.geoAuth.fetchRemoteUsers();
      } catch (e) {}
    }

    const firestore = this.getDb();
    if (isAdmin && firestore) {
      try {
        const usersSnap = await firestore.collection(COLLECTIONS.USERS).get();
        const remoteUsers = [];
        usersSnap.forEach(doc => remoteUsers.push({ id: doc.id, ...doc.data() }));

        const userMap = new Map();
        if (typeof DEFAULT_USERS !== "undefined" && Array.isArray(DEFAULT_USERS)) {
          DEFAULT_USERS.forEach(u => {
            if (u && u.email) userMap.set(u.email.toLowerCase().trim(), { ...u });
          });
        }
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.USERS);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach(u => {
                if (u && u.email) userMap.set(u.email.toLowerCase().trim(), { ...userMap.get(u.email.toLowerCase().trim()), ...u });
              });
            }
          }
        } catch (e) {}
        if (Array.isArray(this._cache.users)) {
          this._cache.users.forEach(u => {
            if (u && u.email) userMap.set(u.email.toLowerCase().trim(), { ...userMap.get(u.email.toLowerCase().trim()), ...u });
          });
        }
        remoteUsers.forEach(u => {
          if (u && u.email) userMap.set(u.email.toLowerCase().trim(), { ...userMap.get(u.email.toLowerCase().trim()), ...u });
        });

        this._cache.users = Array.from(userMap.values());
        try {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(this._cache.users));
        } catch (e) {}

        // Auto-sync any local-only users up to Firestore with Admin privileges
        const remoteEmailSet = new Set(remoteUsers.map(u => (u.email || "").toLowerCase().trim()));
        for (const u of this._cache.users) {
          if (u && u.email && !remoteEmailSet.has(u.email.toLowerCase().trim())) {
            try {
              firestore.collection(COLLECTIONS.USERS).doc(u.id || ("usr-" + Date.now())).set(u, { merge: true }).catch(() => {});
            } catch (e) {}
          }
        }

        window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "users" } }));
        if (window.appState && window.appState.currentTab === "admin-panel" && typeof renderAdminDashboard === "function") {
          renderAdminDashboard();
        }
      } catch (e) {}

      try {
        const subsSnap = await firestore.collection(COLLECTIONS.EXAM_SUBMISSIONS).get();
        const list = [];
        subsSnap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        this._cache.examSubmissions = list;
        this._saveCachedExamSubmissions(list);
        window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "exam_submissions" } }));
      } catch (e) {}
    }
  }

  async _refreshAllCache() {
    const firestore = this.getDb();
    if (!firestore) return;
    const db = firestore;
    const isAdmin = window.geoAuth && typeof window.geoAuth.isAdmin === "function" && window.geoAuth.isAdmin();
    const currentUser = window.geoAuth ? (window.geoAuth.currentUser || (typeof window.geoAuth.getCurrentUser === "function" ? window.geoAuth.getCurrentUser() : null)) : null;

    // HSHK Posts
    try {
      const hshkSnap = await db.collection(COLLECTIONS.HSHK_POSTS).get();
      this._cache.hshkPosts = [];
      hshkSnap.forEach(doc => this._cache.hshkPosts.push({ id: doc.id, ...doc.data() }));
      this._cache.hshkPosts.sort((a, b) => (b.id > a.id ? 1 : -1));
    } catch (e) { console.warn("[DAL] Refresh hshk_posts notice:", e.message); }

    // Group Posts
    try {
      const groupSnap = await db.collection(COLLECTIONS.GROUP_POSTS).get();
      this._cache.groupPosts = [];
      groupSnap.forEach(doc => this._cache.groupPosts.push({ id: doc.id, ...doc.data() }));
      this._cache.groupPosts.sort((a, b) => (b.id > a.id ? 1 : -1));
    } catch (e) { console.warn("[DAL] Refresh group_posts notice:", e.message); }

    // Documents
    try {
      const docsSnap = await db.collection(COLLECTIONS.DOCUMENTS).get();
      this._cache.documents = [];
      docsSnap.forEach(doc => this._cache.documents.push({ id: doc.id, ...doc.data() }));
      this._cache.documents.sort((a, b) => (b.id > a.id ? 1 : -1));
    } catch (e) { console.warn("[DAL] Refresh documents notice:", e.message); }

    // Contact
    try {
      const contactDoc = await db.collection(COLLECTIONS.CONTACT).doc("main").get();
      if (contactDoc.exists) this._cache.contactInfo = contactDoc.data();
    } catch (e) { console.warn("[DAL] Refresh contact notice:", e.message); }

    // Maintenance
    try {
      const maintDoc = await db.collection(COLLECTIONS.CONTACT).doc("maintenance").get();
      if (maintDoc.exists) {
        this._cache.maintenance = { ...this._cache.maintenance, ...maintDoc.data() };
      }
    } catch (e) { console.warn("[DAL] Refresh maintenance notice:", e.message); }

    // Developer Settings
    try {
      const devDoc = await db.collection(COLLECTIONS.CONTACT).doc("developer_settings").get();
      if (devDoc.exists) {
        this._cache.developerSettings = { ...this._cache.developerSettings, ...devDoc.data() };
      } else {
        const localDev = localStorage.getItem("geo_developer_settings");
        if (localDev) {
          this._cache.developerSettings = { ...this._cache.developerSettings, ...JSON.parse(localDev) };
        }
      }
    } catch(e) {
      const localDev = localStorage.getItem("geo_developer_settings");
      if (localDev) {
        try { this._cache.developerSettings = { ...this._cache.developerSettings, ...JSON.parse(localDev) }; } catch(err) {}
      }
    }

    // Telemetry Config
    try {
      const telemDoc = await db.collection(COLLECTIONS.CONTACT).doc("telemetry_config").get();
      if (telemDoc.exists) {
        this._cache.telemetry = { ...this._cache.telemetry, ...telemDoc.data() };
      }
    } catch (e) { console.warn("[DAL] Refresh telemetry notice:", e.message); }

    // Confessions
    try {
      const cfsQuery = isAdmin 
        ? db.collection(COLLECTIONS.CONFESSIONS)
        : db.collection(COLLECTIONS.CONFESSIONS).where("status", "==", "answered");
      const cfsSnap = await cfsQuery.get();
      this._cache.confessions = [];
      cfsSnap.forEach(doc => this._cache.confessions.push({ id: doc.id, ...doc.data() }));
      this._cache.confessions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch (e) { console.warn("[DAL] Refresh confessions notice:", e.message); }

    // Users (Admin only)
    if (isAdmin) {
      try {
        const usersSnap = await db.collection(COLLECTIONS.USERS).get();
        this._cache.users = [];
        usersSnap.forEach(doc => this._cache.users.push({ id: doc.id, ...doc.data() }));
      } catch (e) { console.warn("[DAL] Refresh users notice:", e.message); }
    }

    // Saved Docs
    try {
      if (isAdmin) {
        const savedSnap = await db.collection(COLLECTIONS.SAVED_DOCS).get();
        this._cache.savedDocs = {};
        savedSnap.forEach(doc => {
          if (doc.id !== "_placeholder") {
            const data = doc.data();
            this._cache.savedDocs[doc.id] = data.docIds || [];
          }
        });
      } else if (currentUser && currentUser.email) {
        const cleanEmail = currentUser.email.toLowerCase().trim();
        const savedDoc = await db.collection(COLLECTIONS.SAVED_DOCS).doc(cleanEmail).get();
        if (savedDoc.exists) {
          const data = savedDoc.data();
          this._cache.savedDocs[cleanEmail] = data.docIds || [];
        }
      }
    } catch (e) { console.warn("[DAL] Refresh saved_docs notice:", e.message); }

    // Blocked Emails
    try {
      const blockedSnap = await db.collection(COLLECTIONS.BLOCKED_EMAILS).get();
      this._cache.blockedEmails = [];
      blockedSnap.forEach(doc => this._cache.blockedEmails.push({ id: doc.id, ...doc.data() }));
      this._cache.blockedEmails.sort((a, b) => (b.blockedTimestamp || 0) - (a.blockedTimestamp || 0));
    } catch (e) { console.warn("[DAL] Refresh blocked_emails notice:", e.message); }

    // Exams
    try {
      const examsSnap = await db.collection(COLLECTIONS.EXAMS).get();
      const list = [];
      if (!examsSnap.empty) {
        examsSnap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      }
      const localExams = this._loadCachedExams();
      const merged = [...list];
      localExams.forEach(loc => {
        if (!merged.some(m => m.id === loc.id || (m.code && loc.code && m.code.toUpperCase() === loc.code.toUpperCase()))) {
          merged.push(loc);
        }
      });
      this._cache.exams = merged.length > 0 ? merged : [...DEFAULT_EXAMS];
      this._cache.exams.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      try { localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(this._cache.exams)); } catch (e) {}
    } catch(e) {
      console.warn("[DAL] Error fetching initial exams:", e);
      if (!this._cache.exams || this._cache.exams.length === 0) {
        this._cache.exams = this._loadCachedExams();
      }
    }

    // Exam Submissions (Admin only)
    if (isAdmin) {
      try {
        const subsSnap = await db.collection(COLLECTIONS.EXAM_SUBMISSIONS).get();
        const list = [];
        if (!subsSnap.empty) {
          subsSnap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        }
        const localSubs = this._loadCachedExamSubmissions();
        const merged = [...list];
        localSubs.forEach(loc => {
          if (!merged.some(m => m.id === loc.id)) {
            merged.push(loc);
          }
        });
        this._cache.examSubmissions = merged;
        this._cache.examSubmissions.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
        this._saveCachedExamSubmissions(this._cache.examSubmissions);
      } catch(e) {
        console.warn("[DAL] Error fetching initial exam submissions:", e);
        if (!this._cache.examSubmissions || this._cache.examSubmissions.length === 0) {
          this._cache.examSubmissions = this._loadCachedExamSubmissions();
        }
      }
    }
  }

  // --- EXAM COUNTDOWN SETTINGS ACCESSORS ---
  getCountdownSettings() {
    return this._cache.countdown || { ...DEFAULT_COUNTDOWN_SETTINGS };
  }

  async saveCountdownSettings(settings, user) {
    if (!user || (user.role !== "admin" && user.userType !== "Admin")) {
      throw new Error("Chỉ Quản trị viên mới có quyền cài đặt bộ đếm thời gian thi!");
    }

    if (!settings.examName || !settings.targetDate) {
      throw new Error("Vui lòng nhập tên kỳ thi và thời gian thi hợp lệ!");
    }

    const targetDateObj = new Date(settings.targetDate);
    if (isNaN(targetDateObj.getTime())) {
      throw new Error("Định dạng thời gian không hợp lệ!");
    }

    const payload = {
      examName: settings.examName.trim(),
      targetDate: settings.targetDate,
      targetTimestamp: targetDateObj.getTime(),
      slogan: (settings.slogan || "").trim(),
      updatedAt: new Date().toLocaleDateString("vi-VN"),
      updatedBy: user.name || user.email
    };

    const firestore = this.getDb();
    if (firestore) {
      await firestore.collection(COLLECTIONS.CONTACT).doc("countdown").set(payload, { merge: true });
    }
    this._cache.countdown = { ...this._cache.countdown, ...payload };
    window.dispatchEvent(new CustomEvent("countdown_settings_changed", { detail: this._cache.countdown }));
    return this._cache.countdown;
  }

  // --- HSHK POSTS CRUD ---
  getHshkPosts() {
    const deleted = this._deletedPostIds || new Set();
    return (this._cache.hshkPosts || []).filter(p => !deleted.has(p.id));
  }

  async saveHshkPost(post) {
    if (!post.id) {
      post.id = "hshk-" + Date.now();
      post.date = new Date().toLocaleDateString("vi-VN");
      post.isManual = true;
    } else if (post.isManual === undefined && post.id.startsWith("hshk-") && post.id !== "hshk-1" && post.id !== "hshk-2") {
      post.isManual = true;
    }
    this._deletedPostIds.delete(post.id);
    try {
      localStorage.setItem(STORAGE_KEYS.DELETED_POST_IDS, JSON.stringify(Array.from(this._deletedPostIds)));
    } catch (e) {}

    if (!this._cache.hshkPosts) this._cache.hshkPosts = [];
    const idx = this._cache.hshkPosts.findIndex(p => p.id === post.id);
    if (idx !== -1) {
      this._cache.hshkPosts[idx] = post;
    } else {
      this._cache.hshkPosts.unshift(post);
    }
    try { localStorage.setItem(STORAGE_KEYS.HSHK_POSTS, JSON.stringify(this._cache.hshkPosts)); } catch (e) {}
    window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "hshk_posts" } }));

    try {
      const firestore = this.getDb();
      if (firestore) {
        await firestore.collection(COLLECTIONS.HSHK_POSTS).doc(post.id).set(post, { merge: true });
        console.log("[DAL] saveHshkPost synced to Firestore successfully:", post.id);
      }
    } catch (e) {
      console.warn("[DAL] saveHshkPost remote sync warning (saved locally):", e.message);
    }
    return this.getHshkPosts();
  }

  async deleteHshkPost(id) {
    if (!id) return this.getHshkPosts();
    this._deletedPostIds.add(id);
    try {
      localStorage.setItem(STORAGE_KEYS.DELETED_POST_IDS, JSON.stringify(Array.from(this._deletedPostIds)));
    } catch (e) {}

    this._cache.hshkPosts = (this._cache.hshkPosts || []).filter(p => p.id !== id);
    try { localStorage.setItem(STORAGE_KEYS.HSHK_POSTS, JSON.stringify(this._cache.hshkPosts)); } catch (e) {}
    window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "hshk_posts" } }));

    try {
      const firestore = this.getDb();
      if (firestore) {
        await firestore.collection(COLLECTIONS.HSHK_POSTS).doc(id).delete();
      }
    } catch (e) {
      console.warn("[DAL] deleteHshkPost remote warning:", e.message);
      try {
        const firestore = this.getDb();
        if (firestore) {
          await firestore.collection(COLLECTIONS.HSHK_POSTS).doc(id).set({ isDeleted: true }, { merge: true });
        }
      } catch (e2) {}
    }
    return this.getHshkPosts();
  }

  // --- GROUP POSTS CRUD ---
  getGroupPosts() {
    const deleted = this._deletedPostIds || new Set();
    return (this._cache.groupPosts || []).filter(p => !deleted.has(p.id));
  }

  async saveGroupPost(post) {
    if (!post.id) {
      post.id = "grp-" + Date.now();
      post.date = new Date().toLocaleDateString("vi-VN");
      post.isManual = true;
    } else if (post.isManual === undefined && post.id.startsWith("grp-") && post.id !== "grp-1" && post.id !== "grp-2") {
      post.isManual = true;
    }
    this._deletedPostIds.delete(post.id);
    try {
      localStorage.setItem(STORAGE_KEYS.DELETED_POST_IDS, JSON.stringify(Array.from(this._deletedPostIds)));
    } catch (e) {}

    if (!this._cache.groupPosts) this._cache.groupPosts = [];
    const idx = this._cache.groupPosts.findIndex(p => p.id === post.id);
    if (idx !== -1) {
      this._cache.groupPosts[idx] = post;
    } else {
      this._cache.groupPosts.unshift(post);
    }
    try { localStorage.setItem(STORAGE_KEYS.GROUP_POSTS, JSON.stringify(this._cache.groupPosts)); } catch (e) {}
    window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "group_posts" } }));

    try {
      const firestore = this.getDb();
      if (firestore) {
        await firestore.collection(COLLECTIONS.GROUP_POSTS).doc(post.id).set(post, { merge: true });
        console.log("[DAL] saveGroupPost synced to Firestore successfully:", post.id);
      }
    } catch (e) {
      console.warn("[DAL] saveGroupPost remote sync warning (saved locally):", e.message);
    }
    return this.getGroupPosts();
  }

  async deleteGroupPost(id) {
    if (!id) return this.getGroupPosts();
    this._deletedPostIds.add(id);
    try {
      localStorage.setItem(STORAGE_KEYS.DELETED_POST_IDS, JSON.stringify(Array.from(this._deletedPostIds)));
    } catch (e) {}

    this._cache.groupPosts = (this._cache.groupPosts || []).filter(p => p.id !== id);
    try { localStorage.setItem(STORAGE_KEYS.GROUP_POSTS, JSON.stringify(this._cache.groupPosts)); } catch (e) {}
    window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "group_posts" } }));

    try {
      const firestore = this.getDb();
      if (firestore) {
        await firestore.collection(COLLECTIONS.GROUP_POSTS).doc(id).delete();
      }
    } catch (e) {
      console.warn("[DAL] deleteGroupPost remote warning:", e.message);
      try {
        const firestore = this.getDb();
        if (firestore) {
          await firestore.collection(COLLECTIONS.GROUP_POSTS).doc(id).set({ isDeleted: true }, { merge: true });
        }
      } catch (e2) {}
    }
    return this.getGroupPosts();
  }

  // --- DOCUMENTS CRUD ---
  getDocuments() {
    const deleted = this._deletedDocIds || new Set();
    return (this._cache.documents || []).filter(d => !deleted.has(d.id));
  }

  getDocumentById(id) {
    if (this._deletedDocIds && this._deletedDocIds.has(id)) return null;
    return (this._cache.documents || []).find(d => d.id === id) || null;
  }

  async saveDocument(doc) {
    if (!doc.id) {
      doc.id = "doc-" + Date.now();
      doc.date = new Date().toLocaleDateString("vi-VN");
      doc.downloads = 0;
      doc.views = 0;
      doc.ratings = [5];
      doc.avgRating = 5.0;
      doc.isManual = true;
    } else if (doc.isManual === undefined && !doc.id.startsWith("doc-dc-") && !doc.id.startsWith("doc-vn-")) {
      doc.isManual = true;
    }
    if (doc.views === undefined) doc.views = 0;
    if (doc.downloads === undefined) doc.downloads = 0;
    
    // Ensure attachmentType is recognized ('file' or 'link')
    if (!doc.attachmentType) {
      doc.attachmentType = doc.pdfBase64 ? "file" : (doc.externalUrl ? "link" : "file");
    }

    this._deletedDocIds.delete(doc.id);
    try {
      localStorage.setItem(STORAGE_KEYS.DELETED_DOC_IDS, JSON.stringify(Array.from(this._deletedDocIds)));
    } catch (e) {}

    if (!this._cache.documents) this._cache.documents = [];
    const idx = this._cache.documents.findIndex(d => d.id === doc.id);
    if (idx !== -1) {
      this._cache.documents[idx] = doc;
    } else {
      this._cache.documents.unshift(doc);
    }
    try { localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(this._cache.documents)); } catch (e) {}
    window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "documents" } }));

    try {
      const firestore = this.getDb();
      if (firestore) {
        await firestore.collection(COLLECTIONS.DOCUMENTS).doc(doc.id).set(doc, { merge: true });
        console.log("[DAL] saveDocument synced to Firestore successfully:", doc.id);
      }
    } catch (e) {
      console.warn("[DAL] saveDocument remote sync warning (saved locally):", e.message);
    }
    return this.getDocuments();
  }

  async deleteDocument(id) {
    if (!id) return this.getDocuments();

    // 1. Mark in permanent deleted set so snapshot never resurrects it
    this._deletedDocIds.add(id);
    try {
      localStorage.setItem(STORAGE_KEYS.DELETED_DOC_IDS, JSON.stringify(Array.from(this._deletedDocIds)));
    } catch (e) {}

    // 2. Remove from local cache and local storage immediately
    this._cache.documents = (this._cache.documents || []).filter(d => d.id !== id);
    try {
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(this._cache.documents));
    } catch (e) {}

    // 3. Remove from any savedDocs lists across users
    if (this._cache.savedDocs) {
      for (const emailKey in this._cache.savedDocs) {
        if (Array.isArray(this._cache.savedDocs[emailKey])) {
          this._cache.savedDocs[emailKey] = this._cache.savedDocs[emailKey].filter(did => did !== id);
        }
      }
      try {
        localStorage.setItem(STORAGE_KEYS.SAVED_DOCS, JSON.stringify(this._cache.savedDocs));
      } catch (e) {}
    }

    // 4. Dispatch event so UI updates immediately
    window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "documents" } }));

    // 5. Delete from Firestore (try hard delete and soft delete tag)
    try {
      const firestore = this.getDb();
      if (firestore) {
        await firestore.collection(COLLECTIONS.DOCUMENTS).doc(id).delete();
      }
    } catch (e) {
      console.warn("[DAL] deleteDocument remote warning:", e.message);
      try {
        const firestore = this.getDb();
        if (firestore) {
          await firestore.collection(COLLECTIONS.DOCUMENTS).doc(id).set({ isDeleted: true }, { merge: true });
        }
      } catch (e2) {}
    }
    return this.getDocuments();
  }

  // Tăng lượt xem tài liệu theo thời gian thực
  async recordDocView(id) {
    const doc = this.getDocumentById(id);
    if (!doc) return;
    const newViews = (Number(doc.views) || 0) + 1;
    doc.views = newViews;
    try { localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(this._cache.documents)); } catch (e) {}

    try {
      const firestore = this.getDb();
      if (firestore) {
        await firestore.collection(COLLECTIONS.DOCUMENTS).doc(id).update({ views: newViews });
      }
    } catch (e) {}
    return newViews;
  }

  // Tăng lượt tải tài liệu theo thời gian thực
  async recordDocDownload(id) {
    const doc = this.getDocumentById(id);
    if (!doc) return;
    const newDownloads = (Number(doc.downloads) || 0) + 1;
    doc.downloads = newDownloads;
    try { localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(this._cache.documents)); } catch (e) {}

    try {
      const firestore = this.getDb();
      if (firestore) {
        await firestore.collection(COLLECTIONS.DOCUMENTS).doc(id).update({ downloads: newDownloads });
      }
    } catch (e) {}
    return newDownloads;
  }

  // Ghi nhan luot tim kiem thuc te theo thoi gian thuc
  async recordDocSearch(docIds) {
    if (!Array.isArray(docIds) || docIds.length === 0) return;
    for (const id of docIds) {
      const doc = this.getDocumentById(id);
      if (doc) {
        const newSearches = (Number(doc.searches) || 0) + 1;
        doc.searches = newSearches;
        try {
          const firestore = this.getDb();
          if (firestore) {
            await firestore.collection(COLLECTIONS.DOCUMENTS).doc(id).update({ searches: newSearches });
          }
        } catch (e) {}
      }
    }
    try { localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(this._cache.documents)); } catch (e) {}
  }

  // Tai tep PDF len Firebase Cloud Storage chuyen dung
  async uploadPdfToCloudStorage(file, onProgress) {
    if (!file) throw new Error("Chua chon tep PDF.");
    
    // Neu Firebase Storage kha dung, upload len Storage bucket
    if (window.storage && typeof window.storage.ref === "function") {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `documents/${Date.now()}_${sanitizedName}`;
      const storageRef = window.storage.ref(storagePath);
      const uploadTask = storageRef.put(file, {
        contentType: "application/pdf",
        customMetadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString()
        }
      });

      return new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (typeof onProgress === "function") onProgress(progress);
          },
          (error) => {
            console.warn("[Cloud Storage] Upload warning, falling back to local processing:", error);
            // Fallback sang Base64 reader neu gap loi quyen Storage
            this._readPdfAsBase64(file).then(resolve).catch(reject);
          },
          async () => {
            const downloadUrl = await uploadTask.snapshot.ref.getDownloadURL();
            resolve({
              url: downloadUrl,
              storagePath: storagePath,
              fileName: file.name,
              size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
              isCloudStorage: true
            });
          }
        );
      });
    }

    // Fallback: Doc thanh DataURL neu Storage chua duoc kich hoat
    return this._readPdfAsBase64(file);
  }

  _readPdfAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          url: e.target.result,
          base64: e.target.result,
          fileName: file.name,
          size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
          isCloudStorage: false
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async addDocumentRating(docId, ratingScore, commentText = "", userInfo = {}) {
    return this.addDocumentComment(docId, {
      userName: userInfo.name || "Học sinh",
      userEmail: userInfo.email || "",
      userType: userInfo.userType || "Học sinh THCS",
      stars: Number(ratingScore) || 5,
      comment: commentText || ""
    });
  }

  // Thêm bình luận và đánh giá sao cho tài liệu
  async addDocumentComment(docId, { userName, userEmail, userType, stars, comment }) {
    const docRef = db.collection(COLLECTIONS.DOCUMENTS).doc(docId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return null;

    const docData = docSnap.data();
    if (!Array.isArray(docData.comments)) docData.comments = [];
    if (!Array.isArray(docData.ratings)) docData.ratings = [];

    const starVal = Math.min(5, Math.max(1, Number(stars) || 5));
    const newComment = {
      id: "cmt-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      userName: userName || "Thành viên",
      userEmail: userEmail || "",
      userType: userType || "Học sinh THCS",
      stars: starVal,
      comment: (comment || "").trim(),
      createdAt: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    };

    // Chỉ đẩy vào danh sách bình luận nếu có nội dung bình luận hoặc đánh giá sao
    docData.comments.unshift(newComment);
    docData.ratings.push(starVal);

    const sum = docData.ratings.reduce((a, b) => a + b, 0);
    docData.avgRating = Number((sum / docData.ratings.length).toFixed(1));

    // Update in local cache as well
    const cachedDoc = this._cache.documents.find(d => d.id === docId);
    if (cachedDoc) {
      cachedDoc.comments = docData.comments;
      cachedDoc.ratings = docData.ratings;
      cachedDoc.avgRating = docData.avgRating;
    }
    try { localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(this._cache.documents)); } catch (e) {}
    window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "documents" } }));

    try {
      await docRef.update({
        comments: docData.comments,
        ratings: docData.ratings,
        avgRating: docData.avgRating
      });
    } catch (e) {
      console.warn("[DAL] addDocumentComment remote warning (saved locally):", e.message);
    }

    return { id: docId, ...docData };
  }

  // Quản trị viên / Admin xóa bình luận
  async deleteDocumentComment(docId, commentId) {
    const docRef = db.collection(COLLECTIONS.DOCUMENTS).doc(docId);
    let docData = null;
    try {
      const docSnap = await docRef.get();
      if (docSnap.exists) docData = docSnap.data();
    } catch (e) {}

    if (!docData) {
      const localDoc = this._cache.documents.find(d => d.id === docId);
      if (localDoc) docData = { ...localDoc };
      else return null;
    }

    if (!Array.isArray(docData.comments)) docData.comments = [];

    // Tìm bình luận bị xóa
    docData.comments = docData.comments.filter(c => c.id !== commentId);

    // Tính lại mảng ratings từ các bình luận còn lại
    const commentStars = docData.comments.map(c => Number(c.stars)).filter(s => !isNaN(s) && s > 0);
    if (commentStars.length > 0) {
      docData.ratings = commentStars;
      const sum = docData.ratings.reduce((a, b) => a + b, 0);
      docData.avgRating = Number((sum / docData.ratings.length).toFixed(1));
    } else {
      docData.ratings = [5];
      docData.avgRating = 5.0;
    }

    // Update local cache
    const cachedDoc = this._cache.documents.find(d => d.id === docId);
    if (cachedDoc) {
      cachedDoc.comments = docData.comments;
      cachedDoc.ratings = docData.ratings;
      cachedDoc.avgRating = docData.avgRating;
    }
    try { localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(this._cache.documents)); } catch (e) {}
    window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "documents" } }));

    try {
      await docRef.update({
        comments: docData.comments,
        ratings: docData.ratings,
        avgRating: docData.avgRating
      });
    } catch (e) {
      console.warn("[DAL] deleteDocumentComment remote warning (saved locally):", e.message);
    }

    return { id: docId, ...docData };
  }

  // --- CONTACT INFO CRUD ---
  getContactInfo() {
    return { ...this._cache.contactInfo };
  }

  async saveContactInfo(info) {
    this._cache.contactInfo = { ...info };
    try { localStorage.setItem(STORAGE_KEYS.CONTACT, JSON.stringify(info)); } catch (e) {}
    window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "contact_info" } }));

    try {
      const firestore = this.getDb();
      if (firestore) {
        await firestore.collection(COLLECTIONS.CONTACT).doc("main").set(info);
      }
    } catch (e) {
      console.warn("[DAL] saveContactInfo remote warning (saved locally):", e.message);
    }
    return info;
  }

  // --- CONFESSIONS / QUESTIONS CRUD ---
  getConfessions() {
    return [...this._cache.confessions];
  }

  getConfessionById(id) {
    return this._cache.confessions.find(c => c.id === id) || null;
  }

  async saveConfession(cfs) {
    if (!cfs.id) {
      const trimmedMsg = (cfs.message || "").trim();
      const duplicate = this._cache.confessions.find(c =>
        (c.message || "").trim() === trimmedMsg && Math.abs(Date.now() - (c.timestamp || 0)) < 6000
      );
      if (duplicate) {
        console.warn("[DAL] Phat hien cau hoi trung lap trong vong 6s, bo qua khong tao ban sao.");
        return this.getConfessions();
      }

      cfs.id = "cfs-" + Date.now();
      const now = new Date();
      cfs.createdAt = now.toLocaleDateString("vi-VN") + " " + now.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });
      cfs.timestamp = Date.now();
      cfs.status = cfs.status || "unread";
      cfs.reply = cfs.reply || "";
      cfs.replyBy = cfs.replyBy || "";
      cfs.replyDate = cfs.replyDate || "";
    }

    // Update memory cache and localStorage immediately for instant UI feedback
    const idx = this._cache.confessions.findIndex(c => c.id === cfs.id);
    if (idx >= 0) {
      this._cache.confessions[idx] = { ...cfs };
    } else {
      this._cache.confessions.unshift({ ...cfs });
    }
    try {
      localStorage.setItem(STORAGE_KEYS.CONFESSIONS, JSON.stringify(this._cache.confessions));
    } catch (e) {}
    window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "confessions" } }));

    try {
      const firestore = this.getDb();
      if (firestore) {
        await firestore.collection(COLLECTIONS.CONFESSIONS).doc(cfs.id).set(cfs, { merge: true });
      }
    } catch (e) {
      console.warn("[DAL] saveConfession remote notice (saved locally):", e.message || e);
    }
    return this.getConfessions();
  }

  async updateConfessionStatus(id, status) {
    // Update cache first for instant UI feedback
    const cfs = this._cache.confessions.find(c => c.id === id);
    if (cfs) cfs.status = status;
    window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "confessions" } }));

    try {
      const firestore = this.getDb();
      if (firestore) {
        await firestore.collection(COLLECTIONS.CONFESSIONS).doc(id).update({ status });
      }
    } catch (e) {
      console.warn("[DAL] updateConfessionStatus remote warning:", e.message);
    }
    return this.getConfessions();
  }

  async replyConfession(id, replyText, adminName) {
    const now = new Date();
    const replyDate = now.toLocaleDateString("vi-VN") + " " + now.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });

    // Update cache first for instant UI feedback
    const cfs = this._cache.confessions.find(c => c.id === id);
    if (cfs) {
      cfs.reply = replyText;
      cfs.replyBy = adminName || "Admin";
      cfs.replyDate = replyDate;
      cfs.status = "answered";
    }
    window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "confessions" } }));

    try {
      const firestore = this.getDb();
      if (firestore) {
        await firestore.collection(COLLECTIONS.CONFESSIONS).doc(id).update({
          reply: replyText,
          replyBy: adminName || "Admin",
          replyDate: replyDate,
          status: "answered"
        });
      }
    } catch (e) {
      console.warn("[DAL] replyConfession remote warning:", e.message);
    }
    return this.getConfessions();
  }

  async deleteConfession(id) {
    // Update cache first
    this._cache.confessions = this._cache.confessions.filter(c => c.id !== id);
    window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "confessions" } }));

    try {
      const firestore = this.getDb();
      if (firestore) {
        await firestore.collection(COLLECTIONS.CONFESSIONS).doc(id).delete();
      }
    } catch (e) {
      console.warn("[DAL] deleteConfession remote warning:", e.message);
    }
    return this.getConfessions();
  }

  // --- SAVED (BOOKMARKED) DOCUMENTS ---
  getSavedDocIds(userEmail) {
    if (!userEmail) return [];
    const key = userEmail.replace(/[.#$/\[\]]/g, "_");
    if (!this._cache.savedDocs || !this._cache.savedDocs[key]) {
      const local = this._loadCachedSavedDocs();
      if (local && local[key]) {
        if (!this._cache.savedDocs) this._cache.savedDocs = {};
        this._cache.savedDocs[key] = local[key];
      }
    }
    return (this._cache.savedDocs && this._cache.savedDocs[key]) || [];
  }

  async toggleSaveDocument(userEmail, docId) {
    if (!userEmail) return false;
    const key = userEmail.replace(/[.#$/\[\]]/g, "_");

    if (!this._cache.savedDocs) this._cache.savedDocs = {};
    let currentIds = [...(this.getSavedDocIds(userEmail) || [])];
    let isSaved = false;

    const idx = currentIds.indexOf(docId);
    if (idx !== -1) {
      currentIds.splice(idx, 1);
      isSaved = false;
    } else {
      currentIds.push(docId);
      isSaved = true;
    }

    this._cache.savedDocs[key] = currentIds;
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED_DOCS, JSON.stringify(this._cache.savedDocs));
    } catch (e) {}

    window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "saved_docs" } }));

    try {
      const firestore = this.getDb();
      if (firestore) {
        const docRef = firestore.collection(COLLECTIONS.SAVED_DOCS).doc(key);
        await docRef.set({ docIds: currentIds, email: userEmail });
      }
    } catch (e) {
      console.warn("[DAL] toggleSaveDocument remote sync warning (saved locally):", e.message);
    }

    return isSaved;
  }

  // --- MAINTENANCE MODE CONTROLLERS ---
  getMaintenanceState() {
    return { ...this._cache.maintenance };
  }

  isMaintenanceActive() {
    return Boolean(this._cache.maintenance && this._cache.maintenance.enabled);
  }

  // Verifies password against saved maintenance password or Creator super passwords (via hash)
  verifyMaintenancePassword(inputPwd) {
    if (!inputPwd) return false;
    const cleanInput = inputPwd.trim();
    const inputHash = typeof _sha256Pure === "function" ? _sha256Pure(cleanInput) : "";
    const currentMaintPwd = (this._cache.maintenance && this._cache.maintenance.password) || "";
    return (currentMaintPwd && cleanInput === currentMaintPwd) ||
      inputHash === "c23f53f29cc2776190e31c1367b8a98e5db13905226bc24a54968212ac05838f" ||
      inputHash === "f2bed619c6da0437e3bede057619770b684f9ef7fb7b40191405bf7922456ec5";
  }

  async setMaintenanceStatus(enabled, password, byUser) {
    if (!this.verifyMaintenancePassword(password)) {
      throw new Error("Mật khẩu bảo trì do Nhà sáng tạo cấp không chính xác!");
    }

    const now = new Date();
    const timeStr = now.toLocaleDateString("vi-VN") + " " + now.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });

    const newMaintData = {
      ...this._cache.maintenance,
      enabled: Boolean(enabled),
      updatedAt: timeStr,
      updatedBy: byUser?.name || byUser?.email || "Admin"
    };

    this._cache.maintenance = newMaintData;

    try {
      const firestore = this.getDb();
      if (firestore) {
        await firestore.collection(COLLECTIONS.CONTACT).doc("maintenance").set(newMaintData, { merge: true });
      }
    } catch (e) {
      console.warn("[DAL] setMaintenanceStatus remote warning:", e.message);
    }
    window.dispatchEvent(new CustomEvent("maintenance_state_changed", { detail: newMaintData }));
    return newMaintData;
  }

  async changeMaintenancePassword(newPassword, currentAdmin) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error("Mật khẩu bảo trì mới phải có ít nhất 6 ký tự!");
    }

    const now = new Date();
    const timeStr = now.toLocaleDateString("vi-VN") + " " + now.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });

    const updated = {
      ...this._cache.maintenance,
      password: newPassword,
      updatedAt: timeStr,
      updatedBy: currentAdmin?.name || currentAdmin?.email || "Nhà sáng tạo"
    };

    this._cache.maintenance = updated;
    try {
      const firestore = this.getDb();
      if (firestore) {
        await firestore.collection(COLLECTIONS.CONTACT).doc("maintenance").set(updated, { merge: true });
      }
    } catch (e) {
      console.warn("[DAL] changeMaintenancePassword remote warning:", e.message);
    }
    return updated;
  }

  // --- DEVELOPER SYSTEM SETTINGS CONTROLLERS ---
  getDeveloperSettings() {
    return { ...this._cache.developerSettings };
  }

  isGoogleLoginDisabled() {
    return Boolean(this._cache.developerSettings && this._cache.developerSettings.disableGoogleLogin);
  }

  isAiDisabled() {
    return Boolean(this._cache.developerSettings && this._cache.developerSettings.disableAiMode);
  }

  async setGoogleLoginDisabled(disabled, byUser = "Nhà phát triển") {
    const updated = {
      ...this._cache.developerSettings,
      disableGoogleLogin: Boolean(disabled),
      updatedAt: new Date().toLocaleDateString("vi-VN"),
      updatedBy: byUser
    };
    this._cache.developerSettings = updated;
    try {
      localStorage.setItem("geo_developer_settings", JSON.stringify(updated));
      const firestore = this.getDb();
      if (firestore) {
        await firestore.collection(COLLECTIONS.CONTACT).doc("developer_settings").set(updated, { merge: true });
      }
    } catch(e) {
      console.warn("[DAL] Sync developer_settings failed:", e);
    }
    window.dispatchEvent(new CustomEvent("developer_settings_changed", { detail: updated }));
    window.dispatchEvent(new CustomEvent("google_login_state_changed", { detail: { disabled: Boolean(disabled) } }));
    return updated;
  }

  async setAiDisabled(disabled, byUser = "Nhà phát triển") {
    const updated = {
      ...this._cache.developerSettings,
      disableAiMode: Boolean(disabled),
      updatedAt: new Date().toLocaleDateString("vi-VN"),
      updatedBy: byUser
    };
    this._cache.developerSettings = updated;
    try {
      localStorage.setItem("geo_developer_settings", JSON.stringify(updated));
      const firestore = this.getDb();
      if (firestore) {
        await firestore.collection(COLLECTIONS.CONTACT).doc("developer_settings").set(updated, { merge: true });
      }
    } catch(e) {
      console.warn("[DAL] Sync developer_settings failed:", e);
    }
    window.dispatchEvent(new CustomEvent("developer_settings_changed", { detail: updated }));
    window.dispatchEvent(new CustomEvent("ai_mode_state_changed", { detail: { disabled: Boolean(disabled) } }));
    return updated;
  }

  // --- DATABASE 1-CLICK BACKUP & RESTORE ---
  backupAllData() {
    const backupObj = {
      version: "1.0",
      system: "Geography Edu - High School Help Kit",
      exportedAt: new Date().toISOString(),
      documents: this.getDocuments(),
      hshkPosts: this.getHshkPosts(),
      groupPosts: this.getGroupPosts(),
      confessions: this.getConfessions(),
      users: this._cache.users.map(u => ({ ...u })),
      contactInfo: this.getContactInfo(),
      maintenance: this.getMaintenanceState()
    };
    return JSON.stringify(backupObj, null, 2);
  }

  async restoreAllData(backupJsonString) {
    if (!backupJsonString) throw new Error("File sao lưu rỗng!");
    let data;
    try {
      data = JSON.parse(backupJsonString);
    } catch(e) {
      throw new Error("Định dạng file sao lưu không hợp lệ! Vui lòng chọn đúng file JSON.");
    }

    if (!data || (!data.documents && !data.hshkPosts && !data.groupPosts)) {
      throw new Error("Cấu trúc file sao lưu không đúng chuẩn hệ thống Geography Edu!");
    }

    const firestore = this.getDb();
    if (!firestore) throw new Error("Không thể kết nối Firestore. Vui lòng thử lại!");

    // 1. Restore Documents
    if (Array.isArray(data.documents)) {
      for (const d of data.documents) {
        if (d && d.id) {
          await firestore.collection(COLLECTIONS.DOCUMENTS).doc(d.id).set(d, { merge: true });
        }
      }
      this._cache.documents = data.documents;
    }

    // 2. Restore HSHK Posts
    if (Array.isArray(data.hshkPosts)) {
      for (const p of data.hshkPosts) {
        if (p && p.id) {
          await firestore.collection(COLLECTIONS.HSHK_POSTS).doc(p.id).set(p, { merge: true });
        }
      }
      this._cache.hshkPosts = data.hshkPosts;
    }

    // 3. Restore Group Posts
    if (Array.isArray(data.groupPosts)) {
      for (const p of data.groupPosts) {
        if (p && p.id) {
          await firestore.collection(COLLECTIONS.GROUP_POSTS).doc(p.id).set(p, { merge: true });
        }
      }
      this._cache.groupPosts = data.groupPosts;
    }

    // 4. Restore Confessions
    if (Array.isArray(data.confessions)) {
      for (const c of data.confessions) {
        if (c && c.id) {
          await firestore.collection(COLLECTIONS.CONFESSIONS).doc(c.id).set(c, { merge: true });
        }
      }
      this._cache.confessions = data.confessions;
    }

    // 5. Restore Contact Info
    if (data.contactInfo) {
      await firestore.collection(COLLECTIONS.CONTACT).doc("main").set(data.contactInfo, { merge: true });
      this._cache.contactInfo = data.contactInfo;
    }

    return true;
  }

  // --- BLOCKED EMAILS (BLACKLIST) ACCESSORS & ACTIONS ---
  getBlockedEmails() {
    return this._cache.blockedEmails || [];
  }

  isEmailBlocked(email) {
    if (!email) return false;
    const cleanEmail = email.trim().toLowerCase();
    const blockedList = this.getBlockedEmails();
    return blockedList.some(item => (item.email || "").trim().toLowerCase() === cleanEmail);
  }

  async blockEmail({ email, reason = "Vi phạm quy định nền tảng", adminUser }) {
    if (!email) throw new Error("Vui lòng nhập địa chỉ Gmail cần chặn!");
    const cleanEmail = email.trim().toLowerCase();

    // Check permissions
    if (!adminUser || (adminUser.role !== "admin" && adminUser.userType !== "Admin")) {
      throw new Error("Chỉ Quản trị viên mới có quyền chặn tài khoản!");
    }

    // Protection: Cannot block SuperAdmin or creator
    if (cleanEmail === "vut510624@gmail.com" || cleanEmail === "hshk.project@gmail.com") {
      throw new Error("Không thể chặn tài khoản của Nhà sáng tạo dự án!");
    }

    if (adminUser.email && adminUser.email.toLowerCase() === cleanEmail) {
      throw new Error("Bạn không thể tự chặn tài khoản của chính mình!");
    }

    // 1. Add to blocked_emails collection
    const firestore = this.getDb();
    if (!firestore) throw new Error("Không thể kết nối cơ sở dữ liệu. Vui lòng thử lại!");
    const blockId = "blk-" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
    const blockPayload = {
      id: blockId,
      email: cleanEmail,
      reason: reason.trim() || "Vi phạm quy định nền tảng",
      blockedAt: new Date().toLocaleDateString("vi-VN"),
      blockedTimestamp: Date.now(),
      blockedBy: adminUser.name || adminUser.email || "Quản trị viên"
    };

    await firestore.collection(COLLECTIONS.BLOCKED_EMAILS).doc(blockId).set(blockPayload);

    // 2. Lập tức xóa tài khoản người dùng có email bị chặn
    const usersToDelete = (this._cache.users || []).filter(u => (u.email || "").toLowerCase() === cleanEmail);
    for (const u of usersToDelete) {
      try {
        await firestore.collection(COLLECTIONS.USERS).doc(u.id).delete();
      } catch (err) {
        console.warn("[Firestore] Error deleting user doc during block:", err);
      }
    }

    // Direct query fallback to ensure complete removal from DB
    try {
      const snap = await firestore.collection(COLLECTIONS.USERS).where("email", "==", cleanEmail).get();
      const batchOp = firestore.batch();
      snap.forEach(doc => batchOp.delete(doc.ref));
      await batchOp.commit();
    } catch (e) {
      console.warn("[Firestore] Batch deletion fallback error:", e);
    }

    // 3. Clear saved docs for this email
    try {
      const sanitized = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
      await firestore.collection(COLLECTIONS.SAVED_DOCS).doc(sanitized).delete();
    } catch (e) {}

    // 4. Ghi tín hiệu xóa tài khoản vào deleted_accounts để kích hoạt realtime forced logout
    try {
      const delDocId = "del_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
      await firestore.collection("deleted_accounts").doc(delDocId).set({
        id: delDocId,
        email: cleanEmail,
        deletedAt: new Date().toISOString(),
        deletedTimestamp: Date.now(),
        reason: "Bị đưa vào danh sách đen (Blacklist)",
        deletedBy: adminUser.name || adminUser.email || "Quản trị viên"
      });
    } catch (e) {}

    // 5. If target user is currently logged in this client, force logout immediately
    if (window.geoAuth && window.geoAuth.currentUser && (window.geoAuth.currentUser.email || "").toLowerCase() === cleanEmail) {
      if (typeof window.geoAuth.forceLogout === "function") {
        window.geoAuth.forceLogout("Địa chỉ Gmail của bạn đã bị đưa vào danh sách đen!");
      } else {
        window.geoAuth.logout();
      }
    }

    return blockPayload;
  }

  async unblockEmail(emailOrId, adminUser) {
    if (!emailOrId) throw new Error("Vui lòng cung cấp email hoặc ID cần bỏ chặn!");
    
    const clean = emailOrId.trim().toLowerCase();
    // Find matching block doc
    const currentList = this.getBlockedEmails();
    const target = currentList.find(b => b.id === clean || (b.email || "").toLowerCase() === clean);
    const docId = target ? target.id : ("blk-" + clean.replace(/[^a-zA-Z0-9]/g, "_"));

    try {
      const firestore = this.getDb();
      if (firestore) {
        await firestore.collection(COLLECTIONS.BLOCKED_EMAILS).doc(docId).delete();
      }
    } catch (e) {
      console.warn("[DAL] unblockEmail remote warning:", e.message);
    }
    return true;
  }

  // --- USER ENVIRONMENT TELEMETRY & UI ANALYTICS CONTROLLER ---
  isTelemetryEnabled() {
    return Boolean(this._cache.telemetry && this._cache.telemetry.enabled);
  }

  getTelemetryConfig() {
    return { ...this._cache.telemetry };
  }

  async setTelemetryEnabled(enabled, byUser) {
    const now = new Date();
    const timeStr = now.toLocaleDateString("vi-VN") + " " + now.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });

    const newConfig = {
      enabled: Boolean(enabled),
      updatedAt: timeStr,
      updatedBy: byUser?.name || byUser?.email || "Admin Tổng"
    };

    this._cache.telemetry = newConfig;
    try {
      const firestore = this.getDb();
      if (firestore) {
        await firestore.collection(COLLECTIONS.CONTACT).doc("telemetry_config").set(newConfig, { merge: true });
      }
    } catch (e) {
      console.warn("[DAL] setTelemetryEnabled remote warning:", e.message);
    }
    window.dispatchEvent(new CustomEvent("telemetry_state_changed", { detail: newConfig }));
    return newConfig;
  }

  async recordTelemetry(specs) {
    if (!this.isTelemetryEnabled()) return null;
    try {
      const firestore = this.getDb();
      if (firestore) {
        const docRef = await firestore.collection(COLLECTIONS.TELEMETRY).add(specs);
        return docRef.id;
      }
    } catch (e) {
      console.warn("[DAL] recordTelemetry remote warning:", e.message);
    }
    return null;
  }

  async getTelemetryLogs(limitCount = 20) {
    try {
      const firestore = this.getDb();
      if (!firestore) return [];
      const snap = await firestore.collection(COLLECTIONS.TELEMETRY).orderBy("timestamp", "desc").limit(limitCount).get();
      const logs = [];
      snap.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));
      return logs;
    } catch (e) {
      console.warn("[Telemetry] Error fetching logs:", e);
      return [];
    }
  }

  async clearTelemetryLogs() {
    const firestore = this.getDb();
    if (!firestore) return false;
    const snap = await firestore.collection(COLLECTIONS.TELEMETRY).limit(100).get();
    const batchOp = firestore.batch();
    snap.forEach(doc => batchOp.delete(doc.ref));
    await batchOp.commit();
    return true;
  }

  // --- GLOBE COUNTRY OVERRIDES (Admin/Developer) ---

  /**
   * Get override data for a specific country from Firestore.
   * Falls back to empty object if none found.
   * @param {string} countryCode - ISO 3166-1 alpha-3 code
   * @returns {Promise<object>}
   */
  async getGlobeCountryOverride(countryCode) {
    try {
      const firestore = this.getDb();
      if (!firestore) return {};
      const doc = await firestore.collection(COLLECTIONS.GLOBE_OVERRIDES).doc(countryCode).get();
      if (doc.exists) return doc.data();
      return {};
    } catch (e) {
      console.warn("[Globe] getGlobeCountryOverride error:", e);
      return {};
    }
  }

  /**
   * Write override data for a specific country to Firestore.
   * Only callable by Admin/Developer.
   * @param {string} countryCode - ISO 3166-1 alpha-3 code
   * @param {object} overrideData - Fields to override
   * @returns {Promise<void>}
   */
  async setGlobeCountryOverride(countryCode, overrideData) {
    const user = window.geoAuth ? window.geoAuth.getCurrentUser() : null;
    if (!user) throw new Error("Chua dang nhap");
    const firestore = this.getDb();
    if (!firestore) throw new Error("Khong the ket noi co so du lieu!");
    await firestore.collection(COLLECTIONS.GLOBE_OVERRIDES).doc(countryCode).set(
      { ...overrideData, updatedBy: user.email, updatedAt: Date.now() },
      { merge: true }
    );
  }

  /**
   * Get all globe country overrides (for Admin panel).
   * @returns {Promise<object[]>}
   */
  async getGlobeCountryOverrides() {
    try {
      const firestore = this.getDb();
      if (!firestore) return [];
      const snap = await firestore.collection(COLLECTIONS.GLOBE_OVERRIDES).get();
      const overrides = [];
      snap.forEach(doc => overrides.push({ id: doc.id, ...doc.data() }));
      return overrides;
    } catch (e) {
      console.warn("[Globe] getGlobeCountryOverrides error:", e);
      return [];
    }
  }

  // --- ONLINE EXAMS & TESTING SYSTEM CONTROLLER ---

  /**
   * Get all exams from memory cache (or fallback defaults)
   * @returns {Array}
   */
  getAllExams() {
    const exams = this._cache.exams || [];
    if (exams.length === 0) {
      return [...DEFAULT_EXAMS];
    }
    return [...exams];
  }

  /**
   * Find an active exam by its secret access code (case-insensitive trim)
   * @param {string} code - Access code
   * @returns {object|null}
   */
  getExamByCode(code) {
    if (!code) return null;
    const clean = String(code).trim().toLowerCase();
    const exams = (this._cache.exams && this._cache.exams.length > 0) ? this._cache.exams : DEFAULT_EXAMS;
    let found = exams.find(e => (e.code || "").trim().toLowerCase() === clean && e.isActive !== false);
    if (!found) {
      found = DEFAULT_EXAMS.find(e => (e.code || "").trim().toLowerCase() === clean && e.isActive !== false);
    }
    return found || null;
  }

  /**
   * Get an exam by its document ID
   * @param {string} id - Exam document ID
   * @returns {object|null}
   */
  getExamById(id) {
    if (!id) return null;
    const exams = (this._cache.exams && this._cache.exams.length > 0) ? this._cache.exams : DEFAULT_EXAMS;
    let found = exams.find(e => e.id === id);
    if (!found) {
      found = DEFAULT_EXAMS.find(e => e.id === id);
    }
    return found || null;
  }

  /**
   * Create a new exam in Firestore.
   * Only Admin or Developer has permission.
   * @param {object} examData
   * @returns {Promise<object>}
   */
  async createExam(examData) {
    const user = window.geoAuth ? window.geoAuth.getCurrentUser() : null;
    if (!user) throw new Error("Vui lòng đăng nhập để tạo bài kiểm tra!");

    const examId = "exam-" + Date.now();
    const cleanCode = String(examData.code || "").trim().toUpperCase();
    if (!cleanCode) throw new Error("Mã bài kiểm tra là bắt buộc!");

    // Check code uniqueness
    const allCurrent = this.getAllExams();
    const existing = allCurrent.find(e => (e.code || "").trim().toUpperCase() === cleanCode);
    if (existing) {
      throw new Error(`Mã kiểm tra "${cleanCode}" đã được sử dụng. Vui lòng chọn mã khác!`);
    }

    const payload = {
      id: examId,
      title: (examData.title || "Bài kiểm tra Địa lý").trim(),
      code: cleanCode,
      durationMinutes: Math.max(1, parseInt(examData.durationMinutes) || 15),
      mode: examData.mode === "view_only" ? "view_only" : "view_and_submit",
      lockBrowser: Boolean(examData.lockBrowser),
      content: (examData.content || "").trim(),
      createdBy: user.name || user.email || "Giáo viên",
      creatorEmail: user.email || "",
      createdAt: Date.now(),
      createdDateStr: new Date().toLocaleDateString("vi-VN"),
      isActive: true
    };

    // Update local cache & LocalStorage immediately
    this._cache.exams.unshift(payload);
    try { localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(this._cache.exams)); } catch (e) {}

    try {
      const firestore = this.getDb();
      if (firestore) {
        await firestore.collection(COLLECTIONS.EXAMS).doc(examId).set(payload);
      }
    } catch (err) {
      console.warn("[DAL] Notice: createExam saved locally, remote sync warning:", err.message);
    }

    window.dispatchEvent(new CustomEvent("firestore_data_changed", { detail: { collection: "exams" } }));
    window.dispatchEvent(new CustomEvent("exams_data_changed", { detail: this._cache.exams }));

    return payload;
  }

  /**
   * Toggle browser lock on/off for an existing exam
   * @param {string} examId
   * @param {boolean} lockBrowser
   * @returns {Promise<boolean>}
   */
  async toggleExamBrowserLock(examId, lockBrowser) {
    const local = (this._cache.exams || []).find(e => e.id === examId);
    if (local) local.lockBrowser = Boolean(lockBrowser);
    try { localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(this._cache.exams)); } catch (e) {}

    try {
      const firestore = this.getDb();
      if (firestore) {
        await firestore.collection(COLLECTIONS.EXAMS).doc(examId).set({ lockBrowser: Boolean(lockBrowser) }, { merge: true });
      }
    } catch (e) {
      console.warn("[DAL] toggleExamBrowserLock remote warning:", e.message);
    }
    return true;
  }

  /**
   * Delete an exam and its associated submissions
   * @param {string} examId
   * @returns {Promise<boolean>}
   */
  async deleteExam(examId) {
    // 1. Remove exam from local cache
    this._cache.exams = (this._cache.exams || []).filter(e => e.id !== examId);
    const def = DEFAULT_EXAMS.find(e => e.id === examId);
    if (def) def.isActive = false;
    try { localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(this._cache.exams)); } catch (e) {}

    // 2. Cascade delete submissions from local cache
    this._cache.examSubmissions = (this._cache.examSubmissions || []).filter(s => s.examId !== examId);
    this._saveCachedExamSubmissions(this._cache.examSubmissions);

    // 3. Remote deletion
    try {
      const firestore = this.getDb();
      if (firestore) {
        await firestore.collection(COLLECTIONS.EXAMS).doc(examId).delete();
      }
    } catch (e) {
      console.warn("[DAL] deleteExam remote warning:", e.message);
    }

    try {
      const firestore = this.getDb();
      if (firestore) {
        const subsSnap = await firestore.collection(COLLECTIONS.EXAM_SUBMISSIONS).where("examId", "==", examId).get();
        const batchOp = firestore.batch();
        subsSnap.forEach(doc => batchOp.delete(doc.ref));
        await batchOp.commit();
      }
    } catch (e) {}

    return true;
  }

  /**
   * Submit student answers for an exam
   * @param {object} submissionData
   * @returns {Promise<object>}
   */
  async submitExam(submissionData) {
    const subId = "sub-" + Date.now();
    const payload = {
      id: subId,
      examId: submissionData.examId,
      examTitle: submissionData.examTitle || "Bài kiểm tra",
      examCode: submissionData.examCode || "",
      studentName: submissionData.studentName || "Thí sinh ẩn danh",
      studentEmail: submissionData.studentEmail || "",
      studentRole: submissionData.studentRole || "Học sinh",
      answers: submissionData.answers || "",
      timeSpentSeconds: submissionData.timeSpentSeconds || 0,
      violationsCount: submissionData.violationsCount || 0,
      violationLogs: Array.isArray(submissionData.violationLogs) ? submissionData.violationLogs : [],
      submittedAt: Date.now(),
      submittedAtStr: new Date().toLocaleString("vi-VN")
    };

    // Luôn lưu trữ an toàn vào bộ nhớ và LocalStorage trước (mã hóa an toàn)
    this._cache.examSubmissions.unshift(payload);
    this._saveCachedExamSubmissions(this._cache.examSubmissions);

    // Đồng bộ lên Firestore
    try {
      const firestore = this.getDb();
      if (firestore) {
        await firestore.collection(COLLECTIONS.EXAM_SUBMISSIONS).doc(subId).set(payload);
      }
    } catch (err) {
      console.warn("[DAL] submitExam remote write warning (saved locally):", err.message);
    }

    return payload;
  }

  /**
   * Get all submissions for an exam (or all submissions if examId is null)
   * @param {string|null} examId
   * @returns {Array}
   */
  getExamSubmissions(examId = null) {
    const all = this._cache.examSubmissions || [];
    if (!examId) return [...all];
    return all.filter(s => s.examId === examId);
  }

  /**
   * Delete an exam submission
   * @param {string} subId
   * @returns {Promise<boolean>}
   */
  async deleteExamSubmission(subId) {
    this._cache.examSubmissions = (this._cache.examSubmissions || []).filter(s => s.id !== subId);
    this._saveCachedExamSubmissions(this._cache.examSubmissions);

    try {
      const firestore = this.getDb();
      if (firestore) {
        await firestore.collection(COLLECTIONS.EXAM_SUBMISSIONS).doc(subId).delete();
      }
    } catch (e) {
      console.warn("[DAL] deleteExamSubmission remote warning:", e.message);
    }
    return true;
  }
}


// Global instance
window.geoDB = new GeoDataManager();
