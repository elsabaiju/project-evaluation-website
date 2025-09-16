// API Base URL
const API_BASE = '/api';

// Global variables
let currentUser = null;
let assignments = [];
let evaluatedAssignments = [];
let filteredHistory = [];

// Utility functions
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
    
    if (successDiv) {
        successDiv.style.display = 'none';
    }
    
    setTimeout(() => {
        if (errorDiv) errorDiv.style.display = 'none';
    }, 5000);
}

function formatDate(dateString) {
    if (!dateString) return 'Not available';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function checkAuth() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
        window.location.href = '/login.html';
        return false;
    }
    
    currentUser = JSON.parse(userStr);
    
    if (currentUser.role !== 'student') {
        window.location.href = '/dashboard.html';
        return false;
    }
    
    return true;
}

// Initialize page
async function initPage() {
    if (!checkAuth()) return;
    
    // Update user info
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.textContent = `Welcome, ${currentUser.fullName}`;
    }
    
    await loadHistoryData();
    
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) loadingMessage.style.display = 'none';
}

// Load history data
async function loadHistoryData() {
    try {
        const response = await fetch(`${API_BASE}/assignments`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            assignments = data.assignments;
            evaluatedAssignments = assignments.filter(a => a.submission && a.submission.isEvaluated);
            filteredHistory = [...evaluatedAssignments];
            
            updateSummaryStats();
            populateSubjectFilter();
            renderGradeChart();
            renderHistory();
        } else {
            showError('Failed to load history data');
        }
    } catch (error) {
        console.error('Error loading history data:', error);
        showError('Network error loading history data');
    }
}

// Update summary statistics
function updateSummaryStats() {
    const totalEvaluated = evaluatedAssignments.length;
    
    if (totalEvaluated === 0) {
        document.getElementById('totalEvaluated').textContent = '0';
        document.getElementById('overallAverage').textContent = '-';
        document.getElementById('highestGrade').textContent = '-';
        document.getElementById('lowestGrade').textContent = '-';
        return;
    }
    
    // Calculate statistics
    const grades = evaluatedAssignments.map(a => (a.submission.marks / a.maxMarks) * 100);
    const overallAverage = grades.reduce((sum, grade) => sum + grade, 0) / grades.length;
    const highestGrade = Math.max(...grades);
    const lowestGrade = Math.min(...grades);
    
    // Update DOM
    document.getElementById('totalEvaluated').textContent = totalEvaluated;
    document.getElementById('overallAverage').textContent = overallAverage.toFixed(1) + '%';
    document.getElementById('highestGrade').textContent = highestGrade.toFixed(1) + '%';
    document.getElementById('lowestGrade').textContent = lowestGrade.toFixed(1) + '%';
}

// Populate subject filter
function populateSubjectFilter() {
    const subjectFilter = document.getElementById('subjectFilter');
    if (!subjectFilter) return;
    
    const subjects = [...new Set(evaluatedAssignments.map(a => a.subject))];
    
    subjectFilter.innerHTML = '<option value="">All Subjects</option>' +
        subjects.map(subject => `<option value="${subject}">${subject}</option>`).join('');
}

// Render grade chart (simple canvas-based chart)
function renderGradeChart() {
    const canvas = document.getElementById('gradeCanvas');
    if (!canvas || evaluatedAssignments.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Sort assignments by evaluation date
    const sortedAssignments = [...evaluatedAssignments].sort((a, b) => 
        new Date(a.submission.evaluatedAt) - new Date(b.submission.evaluatedAt)
    );
    
    if (sortedAssignments.length < 2) {
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Need at least 2 evaluated assignments to show trend', width/2, height/2);
        return;
    }
    
    // Calculate grades as percentages
    const grades = sortedAssignments.map(a => (a.submission.marks / a.maxMarks) * 100);
    const maxGrade = Math.max(...grades);
    const minGrade = Math.min(...grades);
    const gradeRange = maxGrade - minGrade || 1;
    
    // Chart dimensions
    const padding = 50;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    // Draw axes
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Draw grid lines
    ctx.strokeStyle = '#f0f0f0';
    for (let i = 1; i <= 4; i++) {
        const y = padding + (chartHeight * i / 5);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    // Draw grade line
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    grades.forEach((grade, index) => {
        const x = padding + (chartWidth * index / (grades.length - 1));
        const y = height - padding - ((grade - minGrade) / gradeRange * chartHeight);
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Draw points
    ctx.fillStyle = '#667eea';
    grades.forEach((grade, index) => {
        const x = padding + (chartWidth * index / (grades.length - 1));
        const y = height - padding - ((grade - minGrade) / gradeRange * chartHeight);
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
    });
    
    // Draw labels
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    // Y-axis labels (grades)
    for (let i = 0; i <= 4; i++) {
        const grade = minGrade + (gradeRange * i / 4);
        const y = height - padding - (chartHeight * i / 4);
        ctx.textAlign = 'right';
        ctx.fillText(grade.toFixed(0) + '%', padding - 10, y + 4);
    }
    
    // X-axis labels (assignment numbers)
    ctx.textAlign = 'center';
    grades.forEach((grade, index) => {
        const x = padding + (chartWidth * index / (grades.length - 1));
        ctx.fillText(`#${index + 1}`, x, height - padding + 20);
    });
}

// Apply filters and sorting
function applyFiltersAndSort() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const subjectFilter = document.getElementById('subjectFilter').value;
    const sortBy = document.getElementById('sortSelect').value;
    
    // Start with all evaluated assignments
    filteredHistory = [...evaluatedAssignments];
    
    // Apply search filter
    if (searchTerm) {
        filteredHistory = filteredHistory.filter(a => 
            a.title.toLowerCase().includes(searchTerm) ||
            a.subject.toLowerCase().includes(searchTerm) ||
            a.teacher.fullName.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply subject filter
    if (subjectFilter) {
        filteredHistory = filteredHistory.filter(a => a.subject === subjectFilter);
    }
    
    // Apply sorting
    filteredHistory.sort((a, b) => {
        switch (sortBy) {
            case 'marks':
                return (b.submission.marks / b.maxMarks) - (a.submission.marks / a.maxMarks);
            case 'title':
                return a.title.localeCompare(b.title);
            case 'subject':
                return a.subject.localeCompare(b.subject);
            case 'evaluatedAt':
            default:
                return new Date(b.submission.evaluatedAt) - new Date(a.submission.evaluatedAt);
        }
    });
}

// Render history
function renderHistory() {
    const container = document.getElementById('historyContainer');
    if (!container) return;
    
    if (filteredHistory.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No evaluated assignments found.</p>';
        return;
    }
    
    container.innerHTML = filteredHistory.map(assignment => {
        const submission = assignment.submission;
        const percentage = ((submission.marks / assignment.maxMarks) * 100).toFixed(1);
        
        return `
            <div class="history-item" onclick="viewHistoryDetails('${assignment._id}')">
                <div class="history-info">
                    <h4>${assignment.title}</h4>
                    <p><strong>Subject:</strong> ${assignment.subject}</p>
                    <p><strong>Teacher:</strong> ${assignment.teacher.fullName}</p>
                    <p><strong>Evaluated:</strong> ${formatDate(submission.evaluatedAt)}</p>
                    ${submission.feedback ? `<p><strong>Feedback:</strong> ${submission.feedback.substring(0, 100)}${submission.feedback.length > 100 ? '...' : ''}</p>` : ''}
                </div>
                <div class="history-grade">
                    <div class="grade-display">${submission.marks}/${assignment.maxMarks}</div>
                    <div class="grade-percentage">${percentage}%</div>
                </div>
            </div>
        `;
    }).join('');
}

// View history details
function viewHistoryDetails(assignmentId) {
    const assignment = assignments.find(a => a._id === assignmentId);
    if (!assignment || !assignment.submission) return;
    
    const modal = document.getElementById('historyDetailModal');
    const detailContent = document.getElementById('historyDetailContent');
    
    if (modal && detailContent) {
        const submission = assignment.submission;
        const percentage = ((submission.marks / assignment.maxMarks) * 100).toFixed(1);
        
        detailContent.innerHTML = `
            <h3>${assignment.title}</h3>
            
            <div class="assignment-details-modal">
                <p><strong>Subject:</strong> ${assignment.subject}</p>
                <p><strong>Teacher:</strong> ${assignment.teacher.fullName}</p>
                <p><strong>Due Date:</strong> ${formatDate(assignment.dueDate)}</p>
                <p><strong>Max Marks:</strong> ${assignment.maxMarks}</p>
            </div>
            
            <h4>Assignment Description</h4>
            <p>${assignment.description}</p>
            
            ${assignment.instructions ? `
                <h4>Instructions</h4>
                <p>${assignment.instructions}</p>
            ` : ''}
            
            <h4>Your Submission</h4>
            <div class="submission-details">
                <p><strong>File:</strong> ${submission.fileName}</p>
                <p><strong>Submitted:</strong> ${formatDate(submission.submittedAt)}</p>
                <p><strong>Evaluated:</strong> ${formatDate(submission.evaluatedAt)}</p>
            </div>
            
            <h4>Grade & Feedback</h4>
            <div class="feedback-section">
                <div class="marks-display">
                    <strong>Grade: ${submission.marks}/${assignment.maxMarks} (${percentage}%)</strong>
                </div>
                ${submission.feedback ? `
                    <h5>Feedback:</h5>
                    <p>${submission.feedback}</p>
                ` : ''}
                ${submission.comment ? `
                    <h5>Comment:</h5>
                    <p>${submission.comment}</p>
                ` : ''}
            </div>
        `;
        
        modal.style.display = 'flex';
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    initPage();
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        });
    }
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            applyFiltersAndSort();
            renderHistory();
        });
    }
    
    // Subject filter
    const subjectFilter = document.getElementById('subjectFilter');
    if (subjectFilter) {
        subjectFilter.addEventListener('change', function() {
            applyFiltersAndSort();
            renderHistory();
        });
    }
    
    // Sort select
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            applyFiltersAndSort();
            renderHistory();
        });
    }
    
    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
});
