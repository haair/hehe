const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

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

// Sử dụng middleware
app.use(express.json());
app.use(cors({
    origin: [process.env.FRONTEND_URL || 'http://localhost:8080', 'null'], // Thêm 'null' cho test local
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(sanitizeInput);

// Cấu hình CSP để cho phép tải Tailwind CSS từ CDN
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.tailwindcss.com"],
        styleSrc: ["'self'", "https://cdn.tailwindcss.com"],
        connectSrc: ["'self'", "https://*.onrender.com"], // Cho phép kết nối API
        imgSrc: ["'self'", "data:"],
    },
}));
app.use(helmet());
app.use(compression());

// Phục vụ file tĩnh từ thư mục public
app.use(express.static('public'));

// Route gốc để trả về index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
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

// API tìm kiếm học sinh theo ho_ten, gioi_tinh, dia_chi
app.get('/api/students/search', async (req, res) => {
    try {
        const { ho_ten, gioi_tinh, dia_chi } = req.query;
        const query = {};

        const allowedFields = ['ho_ten', 'gioi_tinh', 'dia_chi'];
        for (let key in req.query) {
            if (allowedFields.includes(key) && typeof req.query[key] === 'string') {
                query[key] = { $regex: req.query[key], $options: 'i' };
            }
        }

        const students = await Student.find(query, { id: 1, ho_ten: 1, ngay_sinh: 1, gioi_tinh: 1, dia_chi: 1, fb_url: 1, _id: 0 });
        res.status(200).json(students);
    } catch (err) {
        res.status(500).json({ message: 'Error searching students', error: err.message });
    }
});

// API cập nhật tất cả bản ghi để thêm fb_url
app.post('/api/students/update-all', async (req, res) => {
    try {
        await Student.updateMany(
            { fb_url: { $exists: false } },
            { $set: { fb_url: '' } },
            { upsert: false }
        );
        res.status(200).json({ message: 'All students updated with fb_url field' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating students', error: err.message });
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