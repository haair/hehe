// Thay bằng API key của bạn (sau khi tạo bằng /api/generate-api-key)
const API_KEY = 'your-api-key-here'; // Ví dụ: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'

// Hàm cho index.html
async function fetchStudents() {
    try {
        const response = await fetch('https://student-api-451c.onrender.com/api/students', {
            headers: {
                'X-API-Key': API_KEY,
            },
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error fetching students');
        }
        const students = await response.json();
        displayStudents(students);
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu:', error);
        alert('Không thể tải danh sách học sinh: ' + error.message);
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
                <button class="warning" data-id="${student.id}">Sửa</button>
                <button class="danger" data-id="${student.id}">Xóa</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Gắn sự kiện cho các nút Sửa và Xóa sau khi tạo
    document.querySelectorAll('button.warning').forEach(button => {
        button.addEventListener('click', () => editStudent(parseInt(button.dataset.id)));
    });
    document.querySelectorAll('button.danger').forEach(button => {
        button.addEventListener('click', () => deleteStudent(parseInt(button.dataset.id)));
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
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
            },
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
        alert('Lỗi khi thêm học sinh: ' + error.message);
    }
}

function editStudent(id) {
    window.location.href = `edit.html?id=${id}`;
}

async function deleteStudent(id) {
    if (confirm('Bạn có chắc muốn xóa học sinh này?')) {
        try {
            const response = await fetch(`https://student-api-451c.onrender.com/api/students/${id}`, {
                method: 'DELETE',
                headers: {
                    'X-API-Key': API_KEY,
                },
            });
            const result = await response.json();
            if (response.ok) {
                alert('Xóa học sinh thành công');
                fetchStudents();
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Lỗi khi xóa học sinh:', error);
            alert('Lỗi khi xóa học sinh: ' + error.message);
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

        const response = await fetch(`https://student-api-451c.onrender.com/api/students/search?${queryParams.toString()}`, {
            headers: {
                'X-API-Key': API_KEY,
            },
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error searching students');
        }
        const students = await response.json();
        displayStudents(students);
    } catch (error) {
        console.error('Lỗi khi tìm kiếm:', error);
        alert('Lỗi khi tìm kiếm học sinh: ' + error.message);
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
        const response = await fetch(`https://student-api-451c.onrender.com/api/students/${studentId}`, {
            headers: {
                'X-API-Key': API_KEY,
            },
        });
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
        alert('Lỗi khi lấy dữ liệu học sinh: ' + error.message);
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
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
            },
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
        alert('Lỗi khi cập nhật học sinh: ' + error.message);
    }
}

// Hàm cho api-docs.html
async function generateApiKey() {
    try {
        const response = await fetch('https://student-api-451c.onrender.com/api/generate-api-key', {
            method: 'POST',
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error generating API key');
        }
        const data = await response.json();
        const apiKeyInput = document.getElementById('apiKeyInput');
        apiKeyInput.value = data.apiKey;
        apiKeyInput.style.display = 'block';
        apiKeyInput.focus();
        apiKeyInput.select();

        // Sao chép vào clipboard
        navigator.clipboard.writeText(data.apiKey).then(() => {
            alert('API key đã được sao chép vào clipboard!');
        }).catch(err => {
            console.error('Lỗi khi sao chép vào clipboard:', err);
            alert('Không thể sao chép API key. Vui lòng sao chép thủ công.');
        });
    } catch (error) {
        console.error('Lỗi khi tạo API key:', error);
        alert('Lỗi khi tạo API key: ' + error.message);
    }
}

// Gắn sự kiện khi trang load
window.onload = () => {
    if (document.getElementById('studentBody')) {
        // Trang index.html
        document.getElementById('addButton').addEventListener('click', addStudent);
        document.getElementById('searchHoTenInput').addEventListener('input', searchStudents);
        document.getElementById('searchGioiTinhInput').addEventListener('input', searchStudents);
        document.getElementById('searchDiaChiInput').addEventListener('input', searchStudents);
        fetchStudents();
    } else if (document.getElementById('updateButton')) {
        // Trang edit.html
        document.getElementById('updateButton').addEventListener('click', updateStudent);
        fetchStudent();
    } else if (document.getElementById('generateApiKeyButton')) {
        // Trang api-docs.html
        document.getElementById('generateApiKeyButton').addEventListener('click', generateApiKey);
    }
};