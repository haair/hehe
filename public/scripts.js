// Hàm cho index.html
async function fetchStudents() {
    try {
        const response = await fetch('https://student-api-451c.onrender.com/api/students');
        const students = await response.json();
        displayStudents(students);
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu:', error);
        alert('Không thể tải danh sách học sinh. Vui lòng kiểm tra server.');
    }
}

function displayStudents(students) {
    const tbody = document.getElementById('studentBody');
    tbody.innerHTML = '';

    students.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.id || 'N/A'}</td>
            <td>${student.ho_ten || 'N/A'}</td>
            <td>${student.ngay_sinh || 'N/A'}</td>
            <td>${student.gioi_tinh || 'N/A'}</td>
            <td>${student.dia_chi || 'N/A'}</td>
            <td>
                ${student.fb_url ?
                `<a href="${student.fb_url}" target="_blank">Link</a>` :
                'N/A'}
            </td>
            <td>
                <button onclick="editStudent(${student.id})" class="warning">Sửa</button>
                <button onclick="deleteStudent(${student.id})" class="danger">Xóa</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function addStudent() {
    const ho_ten = document.getElementById('hoTenInput').value;
    const ngay_sinh = document.getElementById('ngaySinhInput').value;
    const gioi_tinh = document.getElementById('gioiTinhInput').value;
    const dia_chi = document.getElementById('diaChiInput').value;
    const fb_url = document.getElementById('fbUrlInput').value;

    if (!ho_ten || !ngay_sinh || !gioi_tinh || !dia_chi) {
        alert('Vui lòng điền đầy đủ thông tin (trừ Facebook URL)');
        return;
    }

    try {
        const response = await fetch('https://student-api-451c.onrender.com/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ho_ten, ngay_sinh, gioi_tinh, dia_chi, fb_url }),
        });
        const result = await response.json();
        if (response.ok) {
            alert('Thêm học sinh thành công');
            fetchStudents();
            clearForm();
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('Lỗi khi thêm học sinh:', error);
        alert('Lỗi khi thêm học sinh');
    }
}

function editStudent(id) {
    window.location.href = `edit.html?id=${id}`;
}

async function deleteStudent(id) {
    if (confirm('Bạn có chắc muốn xóa học sinh này?')) {
        try {
            const response = await fetch(`https://student-api-451c.onrender.com/api/students/${id}`, { method: 'DELETE' });
            const result = await response.json();
            if (response.ok) {
                alert('Xóa học sinh thành công');
                fetchStudents();
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Lỗi khi xóa học sinh:', error);
            alert('Lỗi khi xóa học sinh');
        }
    }
}

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

const searchStudents = debounce(async () => {
    const ho_ten = document.getElementById('searchHoTenInput').value;
    const gioi_tinh = document.getElementById('searchGioiTinhInput').value;
    const dia_chi = document.getElementById('searchDiaChiInput').value;

    try {
        if (!ho_ten && !gioi_tinh && !dia_chi) {
            fetchStudents();
            return;
        }

        const queryParams = new URLSearchParams();
        if (ho_ten) queryParams.append('ho_ten', ho_ten);
        if (gioi_tinh) queryParams.append('gioi_tinh', gioi_tinh);
        if (dia_chi) queryParams.append('dia_chi', dia_chi);

        const response = await fetch(`https://student-api-451c.onrender.com/api/students/search?${queryParams.toString()}`);
        const students = await response.json();
        displayStudents(students);
    } catch (error) {
        console.error('Lỗi khi tìm kiếm:', error);
        alert('Lỗi khi tìm kiếm học sinh');
    }
}, 300);

function clearForm() {
    document.getElementById('hoTenInput').value = '';
    document.getElementById('ngaySinhInput').value = '';
    document.getElementById('gioiTinhInput').value = '';
    document.getElementById('diaChiInput').value = '';
    document.getElementById('fbUrlInput').value = '';
}

// Hàm cho edit.html
let studentId;

async function fetchStudent() {
    const urlParams = new URLSearchParams(window.location.search);
    studentId = urlParams.get('id');

    if (!studentId) {
        alert('Không tìm thấy ID học sinh');
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await fetch(`https://student-api-451c.onrender.com/api/students/${studentId}`);
        if (!response.ok) {
            const errorData = await response.json();
            alert(errorData.message || 'Không tìm thấy học sinh');
            window.location.href = 'index.html';
            return;
        }
        const student = await response.json();
        document.getElementById('hoTenInput').value = student.ho_ten || '';
        document.getElementById('ngaySinhInput').value = student.ngay_sinh || '';
        document.getElementById('gioiTinhInput').value = student.gioi_tinh || '';
        document.getElementById('diaChiInput').value = student.dia_chi || '';
        document.getElementById('fbUrlInput').value = student.fb_url || '';
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu học sinh:', error);
        alert('Lỗi khi lấy dữ liệu học sinh');
        window.location.href = 'index.html';
    }
}

async function updateStudent() {
    const ho_ten = document.getElementById('hoTenInput').value;
    const ngay_sinh = document.getElementById('ngaySinhInput').value;
    const gioi_tinh = document.getElementById('gioiTinhInput').value;
    const dia_chi = document.getElementById('diaChiInput').value;
    const fb_url = document.getElementById('fbUrlInput').value;

    if (!ho_ten || !ngay_sinh || !gioi_tinh || !dia_chi) {
        alert('Vui lòng điền đầy đủ thông tin (trừ Facebook URL)');
        return;
    }

    try {
        const response = await fetch(`https://student-api-451c.onrender.com/api/students/${studentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ho_ten, ngay_sinh, gioi_tinh, dia_chi, fb_url }),
        });
        const result = await response.json();
        if (response.ok) {
            alert('Cập nhật học sinh thành công');
            window.location.href = 'index.html';
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật học sinh:', error);
        alert('Lỗi khi cập nhật học sinh');
    }
}

// Khởi chạy hàm khi trang load
if (document.getElementById('studentBody')) {
    window.onload = fetchStudents;
} else {
    window.onload = fetchStudent;
}