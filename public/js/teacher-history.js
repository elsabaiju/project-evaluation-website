// API Base URL
const API_BASE = '/api';

// Global variables
let currentUser = null;
let assignments = [];
let filteredAssignments = [];
let allSubmissions = [];

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

function showSuccess(message) {
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }
    
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
    
    setTimeout(() => {
        if (successDiv) successDiv.style.display = 'none';
    }, 3000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
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
    
    if (currentUser.role !== 'teacher') {
        window.location.href = '/student-dashboard';
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
        // Load assignments
        const assignmentsResponse = await fetch(`${API_BASE}/assignments`, {
            headers: getAuthHeaders()
        });
        
        if (assignmentsResponse.ok) {
            const assignmentsData = await assignmentsResponse.json();
            assignments = assignmentsData.assignments;
            
            // Load submissions for each assignment
            await loadAllSubmissions();
            
            // Calculate statistics for each assignment
            calculateAssignmentStats();
            
            filteredAssignments = [...assignments];
            updateSummaryStats();
            renderAssignments();
        } else {
            showError('Failed to load history data');
        }
    } catch (error) {
        console.error('Error loading history data:', error);
        showError('Network error loading history data');
    }
}

// Load all submissions
async function loadAllSubmissions() {
    allSubmissions = [];
    
    for (const assignment of assignments) {
        try {
            const response = await fetch(`${API_BASE}/assignments/${assignment._id}/submissions`, {
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                const submissions = data.submissions.map(sub => ({
                    ...sub,
                    assignmentTitle: assignment.title,
                    assignmentSubject: assignment.subject,
                    assignmentMaxMarks: assignment.maxMarks,
                    assignmentDueDate: assignment.dueDate
                }));
                
                assignment.submissions = submissions;
                allSubmissions.push(...submissions);
            } else {
                assignment.submissions = [];
            }
        } catch (error) {
            console.error('Error loading submissions for assignment:', assignment._id);
            assignment.submissions = [];
        }
    }
}

// Calculate assignment statistics
function calculateAssignmentStats() {
    assignments.forEach(assignment => {
        const submissions = assignment.submissions || [];
        const evaluatedSubmissions = submissions.filter(s => s.isEvaluated);
        
        assignment.totalSubmissions = submissions.length;
        assignment.gradedSubmissions = evaluatedSubmissions.length;
        assignment.pendingSubmissions = submissions.length - evaluatedSubmissions.length;
        
        if (evaluatedSubmissions.length > 0) {
            const totalMarks = evaluatedSubmissions.reduce((sum, s) => sum + s.marks, 0);
            const totalMaxMarks = evaluatedSubmissions.length * assignment.maxMarks;
            assignment.averageGrade = ((totalMarks / totalMaxMarks) * 100).toFixed(1);
            assignment.completionRate = ((evaluatedSubmissions.length / submissions.length) * 100).toFixed(1);
        } else {
            assignment.averageGrade = '-';
            assignment.completionRate = submissions.length > 0 ? '0.0' : '-';
        }
    });
}

// Update summary statistics
function updateSummaryStats() {
    const totalAssignments = assignments.length;
    const totalSubmissions = allSubmissions.length;
    const gradedSubmissions = allSubmissions.filter(s => s.isEvaluated).length;
    
    // Calculate overall average grade
    const evaluatedSubmissions = allSubmissions.filter(s => s.isEvaluated);
    let overallAverage = '-';
    
    if (evaluatedSubmissions.length > 0) {
        const totalMarks = evaluatedSubmissions.reduce((sum, s) => sum + s.marks, 0);
        const totalMaxMarks = evaluatedSubmissions.reduce((sum, s) => sum + s.assignmentMaxMarks, 0);
        overallAverage = ((totalMarks / totalMaxMarks) * 100).toFixed(1) + '%';
    }
    
    // Update DOM
    document.getElementById('totalAssignments').textContent = totalAssignments;
    document.getElementById('totalSubmissions').textContent = totalSubmissions;
    document.getElementById('gradedSubmissions').textContent = gradedSubmissions;
    document.getElementById('overallAverage').textContent = overallAverage;
}

// Apply filters and sorting
function applyFiltersAndSort() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.querySelector('.filter-tab.active').dataset.status;
    const sortBy = document.getElementById('sortSelect').value;
    
    // Start with all assignments
    filteredAssignments = [...assignments];
    
    // Apply search filter
    if (searchTerm) {
        filteredAssignments = filteredAssignments.filter(a => 
            a.title.toLowerCase().includes(searchTerm) ||
            a.subject.toLowerCase().includes(searchTerm) ||
            a.description.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
        filteredAssignments = filteredAssignments.filter(a => {
            switch (statusFilter) {
                case 'completed':
                    return a.totalSubmissions > 0 && a.pendingSubmissions === 0;
                case 'partial':
                    return a.gradedSubmissions > 0 && a.pendingSubmissions > 0;
                case 'ungraded':
                    return a.totalSubmissions > 0 && a.gradedSubmissions === 0;
                case 'no-submissions':
                    return a.totalSubmissions === 0;
                default:
                    return true;
            }
        });
    }
    
    // Apply sorting
    filteredAssignments.sort((a, b) => {
        switch (sortBy) {
            case 'title':
                return a.title.localeCompare(b.title);
            case 'subject':
                return a.subject.localeCompare(b.subject);
            case 'submissions':
                return b.totalSubmissions - a.totalSubmissions;
            case 'average':
                const aAvg = parseFloat(a.averageGrade) || 0;
                const bAvg = parseFloat(b.averageGrade) || 0;
                return bAvg - aAvg;
            case 'createdAt':
            default:
                return new Date(b.createdAt) - new Date(a.createdAt);
        }
    });
}

// Render assignments
function renderAssignments() {
    const container = document.getElementById('historyContainer');
    if (!container) return;
    
    if (filteredAssignments.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No assignments found.</p>';
        return;
    }
    
    container.innerHTML = filteredAssignments.map(assignment => {
        let statusClass = 'status-ungraded';
        let statusText = 'No Submissions';
        
        if (assignment.totalSubmissions > 0) {
            if (assignment.pendingSubmissions === 0) {
                statusClass = 'status-graded';
                statusText = 'Fully Graded';
            } else if (assignment.gradedSubmissions > 0) {
                statusClass = 'status-partial';
                statusText = 'Partially Graded';
            } else {
                statusClass = 'status-ungraded';
                statusText = 'Ungraded';
            }
        }
        
        const completionPercentage = assignment.totalSubmissions > 0 ? 
            (assignment.gradedSubmissions / assignment.totalSubmissions) * 100 : 0;
        
        return `
            <div class="history-assignment-item" onclick="viewAssignmentHistory('${assignment._id}')">
                <div class="assignment-header">
                    <div class="assignment-title">
                        <h4>${assignment.title}</h4>
                        <p>${assignment.subject} - Created ${formatDate(assignment.createdAt)}</p>
                    </div>
                    <div class="assignment-stats">
                        <div class="stat">Submissions: ${assignment.totalSubmissions}</div>
                        <div class="stat">Graded: ${assignment.gradedSubmissions}</div>
                        <div class="stat">Average: ${assignment.averageGrade}${assignment.averageGrade !== '-' ? '%' : ''}</div>
                        <div class="status-badge ${statusClass}">${statusText}</div>
                    </div>
                </div>
                
                <div class="assignment-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${completionPercentage}%"></div>
                    </div>
                    <div class="progress-text">${assignment.gradedSubmissions}/${assignment.totalSubmissions} submissions graded (${assignment.completionRate}%)</div>
                </div>
            </div>
        `;
    }).join('');
}

// View assignment history details
function viewAssignmentHistory(assignmentId) {
    const assignment = assignments.find(a => a._id === assignmentId);
    if (!assignment) return;
    
    const modal = document.getElementById('historyDetailsModal');
    const content = document.getElementById('historyDetailsContent');
    
    if (modal && content) {
        const submissions = assignment.submissions || [];
        const evaluatedSubmissions = submissions.filter(s => s.isEvaluated);
        
        content.innerHTML = `
            <h3>${assignment.title}</h3>
            
            <div class="assignment-details-section">
                <h4>Assignment Details</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <p><strong>Subject:</strong> ${assignment.subject}</p>
                        <p><strong>Max Marks:</strong> ${assignment.maxMarks}</p>
                    </div>
                    <div class="detail-item">
                        <p><strong>Due Date:</strong> ${formatDate(assignment.dueDate)}</p>
                        <p><strong>Created:</strong> ${formatDate(assignment.createdAt)}</p>
                    </div>
                </div>
                <p><strong>Description:</strong> ${assignment.description}</p>
                ${assignment.instructions ? `<p><strong>Instructions:</strong> ${assignment.instructions}</p>` : ''}
            </div>
            
            <div class="assignment-details-section">
                <h4>Statistics</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <p><strong>Total Submissions:</strong> ${assignment.totalSubmissions}</p>
                        <p><strong>Graded:</strong> ${assignment.gradedSubmissions}</p>
                    </div>
                    <div class="detail-item">
                        <p><strong>Pending:</strong> ${assignment.pendingSubmissions}</p>
                        <p><strong>Completion Rate:</strong> ${assignment.completionRate}%</p>
                    </div>
                </div>
                ${assignment.averageGrade !== '-' ? `<p><strong>Class Average:</strong> ${assignment.averageGrade}%</p>` : ''}
            </div>
            
            ${submissions.length > 0 ? `
                <div class="assignment-details-section">
                    <h4>Submissions (${submissions.length})</h4>
                    <div class="submissions-list">
                        ${submissions.map(submission => `
                            <div class="submission-item">
                                <div class="submission-info">
                                    <strong>${submission.student.fullName}</strong>
                                    <span>Submitted: ${formatDate(submission.submittedAt)}</span>
                                </div>
                                <div class="submission-grade">
                                    ${submission.isEvaluated ? 
                                        `<span class="grade">${submission.marks}/${assignment.maxMarks}</span>` :
                                        `<span class="pending">Not Graded</span>`
                                    }
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : '<p style="text-align: center; color: #666; margin: 2rem 0;">No submissions received for this assignment.</p>'}
            
            <div class="form-actions">
                <button class="btn btn-primary" onclick="window.location.href='/teacher-grading.html?assignment=${assignment._id}'">Grade Submissions</button>
                <button class="btn btn-secondary" onclick="closeModal('historyDetailsModal')">Close</button>
            </div>
        `;
        
        modal.style.display = 'flex';
    }
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
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
    
    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            this.classList.add('active');
            
            applyFiltersAndSort();
            renderAssignments();
        });
    });
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            applyFiltersAndSort();
            renderAssignments();
        });
    }
    
    // Sort select
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            applyFiltersAndSort();
            renderAssignments();
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
