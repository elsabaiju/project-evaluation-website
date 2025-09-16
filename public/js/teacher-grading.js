// API Base URL
const API_BASE = '/api';

// Global variables
let currentUser = null;
let submissions = [];
let filteredSubmissions = [];
let currentAssignmentFilter = null;

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

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    
    // Check for assignment filter from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentAssignmentFilter = urlParams.get('assignment');
    
    await loadSubmissions();
    
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) loadingMessage.style.display = 'none';
}

// Load submissions
async function loadSubmissions() {
    try {
        // First get all assignments
        const assignmentsResponse = await fetch(`${API_BASE}/assignments`, {
            headers: getAuthHeaders()
        });
        
        if (!assignmentsResponse.ok) {
            showError('Failed to load assignments');
            return;
        }
        
        const assignmentsData = await assignmentsResponse.json();
        const assignments = assignmentsData.assignments;
        
        // Load submissions for each assignment
        submissions = [];
        
        for (const assignment of assignments) {
            try {
                const response = await fetch(`${API_BASE}/assignments/${assignment._id}/submissions`, {
                    headers: getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const assignmentSubmissions = data.submissions.map(sub => ({
                        ...sub,
                        assignmentTitle: assignment.title,
                        assignmentSubject: assignment.subject,
                        assignmentMaxMarks: assignment.maxMarks,
                        assignmentDueDate: assignment.dueDate
                    }));
                    
                    submissions.push(...assignmentSubmissions);
                }
            } catch (error) {
                console.error('Error loading submissions for assignment:', assignment._id);
            }
        }
        
        // Filter by assignment if specified
        if (currentAssignmentFilter) {
            submissions = submissions.filter(s => s.assignment === currentAssignmentFilter);
        }
        
        filteredSubmissions = [...submissions];
        renderSubmissions();
        
    } catch (error) {
        console.error('Error loading submissions:', error);
        showError('Network error loading submissions');
    }
}

// Apply filters and sorting
function applyFiltersAndSort() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const sortBy = document.getElementById('sortSelect').value;
    
    // Start with all submissions
    filteredSubmissions = [...submissions];
    
    // Apply search filter
    if (searchTerm) {
        filteredSubmissions = filteredSubmissions.filter(s => 
            s.student.fullName.toLowerCase().includes(searchTerm) ||
            s.assignmentTitle.toLowerCase().includes(searchTerm) ||
            s.assignmentSubject.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply status filter
    if (statusFilter) {
        filteredSubmissions = filteredSubmissions.filter(s => {
            switch (statusFilter) {
                case 'pending':
                    return !s.isEvaluated;
                case 'graded':
                    return s.isEvaluated;
                case 'late':
                    return new Date(s.submittedAt) > new Date(s.assignmentDueDate);
                default:
                    return true;
            }
        });
    }
    
    // Apply sorting
    filteredSubmissions.sort((a, b) => {
        switch (sortBy) {
            case 'student':
                return a.student.fullName.localeCompare(b.student.fullName);
            case 'assignment':
                return a.assignmentTitle.localeCompare(b.assignmentTitle);
            case 'submittedAt':
                return new Date(b.submittedAt) - new Date(a.submittedAt);
            case 'marks':
                if (!a.isEvaluated && !b.isEvaluated) return 0;
                if (!a.isEvaluated) return 1;
                if (!b.isEvaluated) return -1;
                return b.marks - a.marks;
            default:
                return new Date(a.submittedAt) - new Date(b.submittedAt);
        }
    });
}

// Render submissions
function renderSubmissions() {
    const container = document.getElementById('submissionsContainer');
    if (!container) return;
    
    if (filteredSubmissions.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No submissions found.</p>';
        return;
    }
    
    container.innerHTML = filteredSubmissions.map(submission => {
        const isLate = new Date(submission.submittedAt) > new Date(submission.assignmentDueDate);
        const statusClass = submission.isEvaluated ? 'status-graded' : 'status-ungraded';
        const statusText = submission.isEvaluated ? `${submission.marks}/${submission.assignmentMaxMarks}` : 'Not Graded';
        
        return `
            <div class="submission-card">
                <h4>${submission.assignmentTitle}</h4>
                <p><strong>Student:</strong> ${submission.student.fullName}</p>
                <p><strong>Subject:</strong> ${submission.assignmentSubject}</p>
                <div class="submission-meta">
                    <span><strong>Submitted:</strong> ${formatDate(submission.submittedAt)} ${isLate ? '(Late)' : ''}</span>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                ${submission.fileName ? `
                    <div class="file-info">
                        <p><strong>File:</strong> ${submission.fileName}</p>
                        <p><strong>Size:</strong> ${formatFileSize(submission.fileSize)}</p>
                    </div>
                ` : ''}
                ${submission.isEvaluated && submission.feedback ? `
                    <div class="feedback-preview">
                        <p><strong>Feedback:</strong> ${submission.feedback.substring(0, 100)}${submission.feedback.length > 100 ? '...' : ''}</p>
                    </div>
                ` : ''}
                <div class="submission-actions">
                    <button class="btn btn-primary" onclick="openEvaluationModal('${submission._id}')">${submission.isEvaluated ? 'Edit Grade' : 'Grade'}</button>
                    ${submission.fileName ? `<button class="btn btn-secondary" onclick="downloadFile('${submission._id}')">Download</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Open evaluation modal
function openEvaluationModal(submissionId) {
    console.log('Opening evaluation modal for submission:', submissionId);
    const submission = submissions.find(s => s._id === submissionId);
    if (!submission) {
        console.error('Submission not found:', submissionId);
        showError('Submission not found');
        return;
    }
    
    const modal = document.getElementById('evaluationModal');
    const form = document.getElementById('evaluationForm');
    
    console.log('Modal element:', modal);
    console.log('Form element:', form);
    
    if (modal && form) {
        // Populate form with existing data if already evaluated
        document.getElementById('evaluationSubmissionId').value = submission._id;
        document.getElementById('marks').value = submission.isEvaluated ? submission.marks : '';
        document.getElementById('marks').max = submission.assignmentMaxMarks;
        document.getElementById('feedback').value = submission.feedback || '';
        document.getElementById('comment').value = submission.comment || '';
        
        // Update max marks display
        const maxMarksDisplay = document.getElementById('maxMarksDisplay');
        if (maxMarksDisplay) {
            maxMarksDisplay.textContent = ` / ${submission.assignmentMaxMarks}`;
        }
        
        // Update submission info in the modal
        const submissionDetails = document.getElementById('submissionDetails');
        if (submissionDetails) {
            submissionDetails.innerHTML = `
                <h4>Submission Details</h4>
                <p><strong>Assignment:</strong> ${submission.assignmentTitle}</p>
                <p><strong>Student:</strong> ${submission.student.fullName}</p>
                <p><strong>Max Marks:</strong> ${submission.assignmentMaxMarks}</p>
                <p><strong>Submitted:</strong> ${formatDate(submission.submittedAt)}</p>
                ${submission.fileName ? `<p><strong>File:</strong> ${submission.fileName} (${formatFileSize(submission.fileSize)})</p>` : ''}
            `;
        }
        
        modal.style.display = 'flex';
        console.log('Modal opened successfully');
    } else {
        console.error('Modal or form elements not found');
        showError('Could not open grading modal');
    }
}

// Download file
async function downloadFile(submissionId) {
    try {
        console.log('Downloading file for submission:', submissionId);
        const response = await fetch(`${API_BASE}/assignments/submissions/${submissionId}/download`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        console.log('Download response status:', response.status);
        console.log('Download response headers:', response.headers);
        
        if (response.ok) {
            const blob = await response.blob();
            const submission = submissions.find(s => s._id === submissionId);
            console.log('Found submission:', submission);
            
            if (!submission || !submission.fileName) {
                showError('File information not found');
                return;
            }
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = submission.fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            console.log('File download initiated');
        } else {
            const errorData = await response.json();
            console.error('Download error response:', errorData);
            showError(errorData.message || 'Failed to download file');
        }
    } catch (error) {
        console.error('Error downloading file:', error);
        showError('Network error downloading file');
    }
}

// Open bulk grading modal
function openBulkGradingModal() {
    const pendingSubmissions = filteredSubmissions.filter(s => !s.isEvaluated);
    
    if (pendingSubmissions.length === 0) {
        showError('No pending submissions to grade');
        return;
    }
    
    const modal = document.getElementById('bulkGradingModal');
    const container = document.getElementById('bulkSubmissionsList');
    
    if (modal && container) {
        container.innerHTML = pendingSubmissions.map(submission => `
            <div class="bulk-submission-item">
                <div class="submission-info">
                    <h5>${submission.assignmentTitle}</h5>
                    <p>${submission.student.fullName}</p>
                </div>
                <div class="bulk-grade-inputs">
                    <input type="number" min="0" max="${submission.assignmentMaxMarks}" 
                           placeholder="Marks" class="bulk-marks" data-submission-id="${submission._id}" 
                           data-max-marks="${submission.assignmentMaxMarks}">
                    <input type="text" placeholder="Feedback (optional)" class="bulk-feedback" 
                           data-submission-id="${submission._id}">
                </div>
            </div>
        `).join('');
        
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
    
    // Bulk grading button
    const bulkGradingBtn = document.getElementById('bulkGradingBtn');
    if (bulkGradingBtn) {
        bulkGradingBtn.addEventListener('click', openBulkGradingModal);
    }
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            applyFiltersAndSort();
            renderSubmissions();
        });
    }
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            applyFiltersAndSort();
            renderSubmissions();
        });
    }
    
    // Sort select
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            applyFiltersAndSort();
            renderSubmissions();
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
    
    // Evaluation form
    const evaluationForm = document.getElementById('evaluationForm');
    if (evaluationForm) {
        evaluationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submissionId = document.getElementById('evaluationSubmissionId').value;
            const marks = parseInt(document.getElementById('marks').value);
            const feedback = document.getElementById('feedback').value;
            const comment = document.getElementById('comment').value;
            
            try {
                const response = await fetch(`${API_BASE}/assignments/submissions/${submissionId}/evaluate`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ marks, feedback, comment })
                });
                
                if (response.ok) {
                    showSuccess('Submission evaluated successfully!');
                    closeModal('evaluationModal');
                    await loadSubmissions();
                } else {
                    const data = await response.json();
                    showError(data.message || 'Failed to evaluate submission');
                }
            } catch (error) {
                console.error('Error evaluating submission:', error);
                showError('Network error evaluating submission');
            }
        });
    }
    
    // Bulk grading form
    const bulkGradingForm = document.getElementById('bulkGradingForm');
    if (bulkGradingForm) {
        bulkGradingForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const marksInputs = document.querySelectorAll('.bulk-marks');
            const feedbackInputs = document.querySelectorAll('.bulk-feedback');
            
            const evaluations = [];
            
            marksInputs.forEach((input, index) => {
                const marks = parseInt(input.value);
                const feedback = feedbackInputs[index].value;
                const submissionId = input.dataset.submissionId;
                const maxMarks = parseInt(input.dataset.maxMarks);
                
                if (!isNaN(marks) && marks >= 0 && marks <= maxMarks) {
                    evaluations.push({
                        submissionId,
                        marks,
                        feedback: feedback || ''
                    });
                }
            });
            
            if (evaluations.length === 0) {
                showError('Please enter valid marks for at least one submission');
                return;
            }
            
            try {
                let successCount = 0;
                let errorCount = 0;
                
                for (const evaluation of evaluations) {
                    try {
                        const response = await fetch(`${API_BASE}/assignments/submissions/${evaluation.submissionId}/evaluate`, {
                            method: 'PUT',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({
                                marks: evaluation.marks,
                                feedback: evaluation.feedback,
                                comment: ''
                            })
                        });
                        
                        if (response.ok) {
                            successCount++;
                        } else {
                            errorCount++;
                        }
                    } catch (error) {
                        errorCount++;
                    }
                }
                
                if (successCount > 0) {
                    showSuccess(`Successfully graded ${successCount} submission${successCount !== 1 ? 's' : ''}${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
                    closeModal('bulkGradingModal');
                    await loadSubmissions();
                } else {
                    showError('Failed to grade any submissions');
                }
                
            } catch (error) {
                console.error('Error in bulk grading:', error);
                showError('Network error during bulk grading');
            }
        });
    }
});
