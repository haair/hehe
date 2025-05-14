const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const crypto = require('crypto');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Middleware để làm sạch đầu vào (ngăn chặn NoSQL Injection cơ bản)
const sanitizeInput = (req, res, next) => {
    const dangerousChars = /[\$#\{\}\[\]]/g;
    if (req.query) {
        for (let key in req.query) {
            if (typeof req.query[key] === 'string') {
                req.query[key] = req.query[key].replace(dangerousChars, '');
            }
        }
    }
    if (req.body) {
        for (let key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].replace(dangerousChars, '');
            }
        }
    }
    next();
};

// Middleware xác thực API key
const authenticateApiKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return res.status(401).json({ message: 'API key is required' });
    }

    try {
        const key = await ApiKey.findOne({ key: apiKey });
        if (!key) {
            return res.status(401).json({ message: 'Invalid API key' });
        }
        if (!key.active) {
            return res.status(403).json({ message: 'API key is inactive' });
        }
        next();
    } catch (err) {
        res.status(500).json({ message: 'Error validating API key', error: err.message });
    }
};

// Sử dụng middleware
app.use(express.json());
// app.use(cors({
//     origin: [process.env.FRONTEND_URL || 'http://localhost:8080', 'null'],
//     methods: ['GET', 'POST', 'PUT', 'DELETE'],
//     allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
// }));
app.use(sanitizeInput);

// Cấu hình CSP
// app.use(helmet.contentSecurityPolicy({
//     directives: {
//         defaultSrc: ["'self'"],
//         scriptSrc: ["'self'"],
//         styleSrc: ["'self'"],
//         connectSrc: ["'self'", "https://*.onrender.com"],
//         imgSrc: ["'self'", "data:"],
//     },
// }));
app.use(helmet());
app.use(compression());

// Phục vụ file tĩnh từ thư mục public
app.use(express.static('public'));

// Route gốc để trả về index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API tạo API key mới
app.post('/api/generate-api-key', async (req, res) => {
    try {
        const newApiKey = crypto.randomBytes(16).toString('hex'); // Tạo API key ngẫu nhiên
        const apiKey = new ApiKey({
            key: newApiKey,
            active: true,
            createdAt: new Date(),
        });
        await apiKey.save();
        res.status(201).json({ message: 'API key generated successfully', apiKey: newApiKey });
    } catch (err) {
        res.status(500).json({ message: 'Error generating API key', error: err.message });
    }
});

// Áp dụng middleware xác thực API key cho các route API
app.use('/api/students', authenticateApiKey);

// API tìm kiếm học sinh theo ho_ten, gioi_tinh, dia_chi
app.get('/api/students/search', async (req, res) => {
    const { ho_ten, gioi_tinh, dia_chi, thang } = req.query;
    const filter = {};

    if (ho_ten) {
        filter.ho_ten = { $regex: ho_ten, $options: 'i' }; // tìm gần đúng, không phân biệt hoa thường
    }
    if (gioi_tinh !== undefined) {
        const gioiTinhMapping = {
            '0': 'Nữ',
            '1': 'Nam'
        };

        const mappedGender = gioiTinhMapping[gioi_tinh];
        if (!mappedGender) {
            return res.status(400).json({ error: 'Giới tính không hợp lệ. Dùng 0 (Nữ) hoặc 1 (Nam).' });
        }

        filter.gioi_tinh = mappedGender;
    }
    if (dia_chi) {
        filter.dia_chi = { $regex: dia_chi, $options: 'i' };
    }
    if (thang) {
        if (!/^\d{1,2}$/.test(thang) || thang < 1 || thang > 12) {
            return res.status(400).json({ error: 'Tháng không hợp lệ (1–12)' });
        }
        const paddedMonth = thang.padStart?.(2, '0') || thang.toString().padStart(2, '0');
        filter.ngay_sinh = { $regex: new RegExp(`^\\d{2}/${paddedMonth}/\\d{4}$`) };
    }

    try {
        const results = await Student.find(filter, { id: 1, ho_ten: 1, ngay_sinh: 1, gioi_tinh: 1, dia_chi: 1, fb_url: 1, _id: 0 });
        res.status(200).json(results);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi tìm kiếm người dùng' });
    }
});

// API lấy thông tin chi tiết học sinh theo id
app.get('/api/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const parsedId = parseInt(id);
        if (isNaN(parsedId)) {
            return res.status(400).json({ message: 'Invalid ID format' });
        }

        const student = await Student.findOne({ id: parsedId }, { id: 1, ho_ten: 1, ngay_sinh: 1, gioi_tinh: 1, dia_chi: 1, fb_url: 1, _id: 0 });
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.status(200).json(student);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching student', error: err.message });
    }
});

// API lấy danh sách học sinh
app.get('/api/students', async (req, res) => {
    try {
        const students = await Student.find({}, { id: 1, ho_ten: 1, ngay_sinh: 1, gioi_tinh: 1, dia_chi: 1, fb_url: 1, _id: 0 });
        res.status(200).json(students);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching students', error: err.message });
    }
});

// API thêm học sinh mới
app.post('/api/students', async (req, res) => {
    try {
        const { ho_ten, ngay_sinh, gioi_tinh, dia_chi, fb_url } = req.body;
        if (!ho_ten || !ngay_sinh || !gioi_tinh || !dia_chi) {
            return res.status(400).json({ message: 'All fields (except fb_url) are required' });
        }

        const id = await getNextSequenceValue('studentId');
        const newStudent = new Student({ id, ho_ten, ngay_sinh, gioi_tinh, dia_chi, fb_url: fb_url || '' });
        await newStudent.save();
        res.status(201).json({ message: 'Student added successfully', student: newStudent });
    } catch (err) {
        res.status(500).json({ message: 'Error adding student', error: err.message });
    }
});

// API sửa thông tin học sinh theo id
app.put('/api/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { ho_ten, ngay_sinh, gioi_tinh, dia_chi, fb_url } = req.body;

        const parsedId = parseInt(id);
        if (isNaN(parsedId)) {
            return res.status(400).json({ message: 'Invalid ID format' });
        }

        const updatedStudent = await Student.findOneAndUpdate(
            { id: parsedId },
            { ho_ten, ngay_sinh, gioi_tinh, dia_chi, fb_url },
            { new: true, runValidators: true }
        );

        if (!updatedStudent) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.status(200).json({ message: 'Student updated successfully', student: updatedStudent });
    } catch (err) {
        res.status(500).json({ message: 'Error updating student', error: err.message });
    }
});

// API xóa học sinh theo id
app.delete('/api/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const parsedId = parseInt(id);
        if (isNaN(parsedId)) {
            return res.status(400).json({ message: 'Invalid ID format' });
        }

        const deletedStudent = await Student.findOneAndDelete({ id: parsedId });

        if (!deletedStudent) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.status(200).json({ message: 'Student deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting student', error: err.message });
    }
});



// Schema cho counters
const counterSchema = new mongoose.Schema({
    _id: String,
    sequence_value: Number,
});
const Counter = mongoose.model('Counter', counterSchema);

// Schema cho học sinh
const studentSchema = new mongoose.Schema({
    id: { type: Number, unique: true, required: true },
    ho_ten: { type: String, required: true, trim: true },
    ngay_sinh: { type: String, required: true, trim: true },
    gioi_tinh: { type: String, required: true, trim: true },
    dia_chi: { type: String, required: true, trim: true },
    fb_url: { type: String, trim: true },
});
const Student = mongoose.model('Student', studentSchema, 'student');

// Schema cho API key
const apiKeySchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});
const ApiKey = mongoose.model('ApiKey', apiKeySchema, 'apiKeys');

// Hàm lấy và tăng giá trị id
const getNextSequenceValue = async (sequenceName) => {
    const sequenceDocument = await Counter.findOneAndUpdate(
        { _id: sequenceName },
        { $inc: { sequence_value: 1 } },
        { new: true, upsert: true }
    );
    return sequenceDocument.sequence_value;
};

// Xử lý lỗi 404
app.use((req, res, next) => {
    res.status(404).json({ message: 'Route not found' });
});

// Xử lý lỗi server
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Khởi động server
app.listen(port, () => {
    console.log(`Server running on port ${port} in ${process.env.NODE_ENV} mode`);
});