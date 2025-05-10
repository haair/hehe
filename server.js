const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Schema cho counters (dùng để tự động tăng id)
const counterSchema = new mongoose.Schema({
    _id: String,
    sequence_value: Number,
});
const Counter = mongoose.model('Counter', counterSchema);

// Schema cho học sinh, thêm trường fb_url
const studentSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    ho_ten: String,
    ngay_sinh: String,
    gioi_tinh: String,
    dia_chi: String,
    fb_url: String, // Thêm trường fb_url
});

// Tạo model, chỉ định rõ collection là 'student'
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

app.use(express.json());
app.use(cors());

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

        const updatedStudent = await Student.findOneAndUpdate(
            { id: parseInt(id) },
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
        const deletedStudent = await Student.findOneAndDelete({ id: parseInt(id) });

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

        if (ho_ten) {
            query.ho_ten = { $regex: ho_ten, $options: 'i' };
        }
        if (gioi_tinh) {
            query.gioi_tinh = { $regex: gioi_tinh, $options: 'i' };
        }
        if (dia_chi) {
            query.dia_chi = { $regex: dia_chi, $options: 'i' };
        }

        const students = await Student.find(query, { id: 1, ho_ten: 1, ngay_sinh: 1, gioi_tinh: 1, dia_chi: 1, fb_url: 1, _id: 0 });
        res.status(200).json(students);
    } catch (err) {
        res.status(500).json({ message: 'Error searching students', error: err.message });
    }
});

// API cập nhật tất cả bản ghi để thêm fb_url (giá trị mặc định rỗng)
app.post('/api/students/update-all', async (req, res) => {
    try {
        await Student.updateMany(
            { fb_url: { $exists: false } }, // Chỉ cập nhật các bản ghi chưa có fb_url
            { $set: { fb_url: '' } }, // Thêm fb_url với giá trị rỗng
            { upsert: false }
        );
        res.status(200).json({ message: 'All students updated with fb_url field' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating students', error: err.message });
    }
});

// Khởi động server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});