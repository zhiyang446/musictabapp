/**
 * Music Tab App - Frontend JavaScript
 * Handles user interactions and API communication
 */

class MusicTabApp {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3001';
        this.currentUser = null;
        this.audioFiles = [];
        this.transcriptionJobs = [];
        this.autoRefreshInterval = null;
        this.isAutoRefreshing = false;

        this.initializeApp();
    }

    async initializeApp() {
        console.log('🎵 Initializing Music Tab App...');
        
        this.bindEventListeners();
        await this.checkApiStatus();
        this.loadUserFromStorage();
        
        if (this.currentUser) {
            await this.loadAudioFiles();
            await this.loadTranscriptionJobs();
            this.showStatusUpdateSection();
        }
        
        console.log('✅ App initialized successfully');
    }

    bindEventListeners() {
        // User creation
        document.getElementById('createUserBtn').addEventListener('click', () => this.createUser());
        
        // File upload
        document.getElementById('audioFile').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('uploadBtn').addEventListener('click', () => this.uploadFile());
        
        // File list refresh
        document.getElementById('refreshFilesBtn').addEventListener('click', () => this.loadAudioFiles());

        // Transcription job creation
        document.getElementById('createJobBtn').addEventListener('click', () => this.createTranscriptionJob());
        document.getElementById('refreshJobsBtn').addEventListener('click', () => this.loadTranscriptionJobs());

        // Auto refresh toggle
        document.getElementById('autoRefreshBtn').addEventListener('click', () => this.toggleAutoRefresh());

        // Status update functionality
        document.getElementById('updateStatusBtn').addEventListener('click', () => this.updateJobStatus());
        document.getElementById('simulateProgressBtn').addEventListener('click', () => {
            console.log('🔘 Simulate Progress button event triggered');
            this.simulateProgress();
        });
        document.getElementById('jobSelect').addEventListener('change', () => this.validateStatusUpdateForm());
        document.getElementById('statusSelect').addEventListener('change', () => this.validateStatusUpdateForm());

        // Form validation for transcription job
        document.getElementById('audioFileSelect').addEventListener('change', () => this.validateTranscriptionForm());
        document.getElementById('targetInstrument').addEventListener('change', () => this.validateTranscriptionForm());
        document.getElementById('outputFormat').addEventListener('change', () => this.validateTranscriptionForm());
        
        // Enter key support for user creation
        document.getElementById('userEmail').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createUser();
        });
        document.getElementById('displayName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createUser();
        });
    }

    async checkApiStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/health`);
            const data = await response.json();
            
            if (response.ok) {
                this.updateStatusIndicator('apiServerStatus', 'Online', 'status-online');
                this.updateStatusIndicator('databaseStatus', 'Connected', 'status-online');
                this.showToast('API server is online', 'success');
            } else {
                throw new Error('API health check failed');
            }
        } catch (error) {
            console.error('API status check failed:', error);
            this.updateStatusIndicator('apiServerStatus', 'Offline', 'status-offline');
            this.updateStatusIndicator('databaseStatus', 'Disconnected', 'status-offline');
            this.showToast('API server is offline. Please start the server.', 'error');
        }
        
        this.updateStatusIndicator('lastUpdated', new Date().toLocaleTimeString());
    }

    updateStatusIndicator(elementId, text, className = '') {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
            element.className = `status-value ${className}`;
        }
    }

    loadUserFromStorage() {
        const savedUser = localStorage.getItem('musicTabUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.displayUserInfo();
        }
    }

    saveUserToStorage() {
        if (this.currentUser) {
            localStorage.setItem('musicTabUser', JSON.stringify(this.currentUser));
        }
    }

    async createUser() {
        const email = document.getElementById('userEmail').value.trim();
        const displayName = document.getElementById('displayName').value.trim();
        
        if (!email) {
            this.showToast('Please enter an email address', 'error');
            return;
        }
        
        if (!this.isValidEmail(email)) {
            this.showToast('Please enter a valid email address', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    display_name: displayName || null,
                    subscription_tier: 'free'
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.currentUser = data.data;
                this.saveUserToStorage();
                this.displayUserInfo();
                this.clearUserForm();
                this.showToast('User created successfully!', 'success');
                await this.loadAudioFiles();
                await this.loadTranscriptionJobs();
                this.showStatusUpdateSection();
            } else {
                throw new Error(data.message || 'Failed to create user');
            }
        } catch (error) {
            console.error('User creation failed:', error);
            this.showToast(`Failed to create user: ${error.message}`, 'error');
        }
    }

    displayUserInfo() {
        if (!this.currentUser) return;
        
        document.getElementById('currentUserId').textContent = this.currentUser.id;
        document.getElementById('currentUserEmail').textContent = this.currentUser.email;
        document.getElementById('currentUserName').textContent = this.currentUser.display_name || 'Not set';
        
        document.querySelector('.user-form').style.display = 'none';
        document.getElementById('userInfo').style.display = 'block';
    }

    clearUserForm() {
        document.getElementById('userEmail').value = '';
        document.getElementById('displayName').value = '';
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        const uploadBtn = document.getElementById('uploadBtn');
        const fileInfo = document.getElementById('fileInfo');
        
        if (file) {
            // Validate file type
            if (!file.type.startsWith('audio/')) {
                this.showToast('Please select an audio file', 'error');
                event.target.value = '';
                uploadBtn.disabled = true;
                fileInfo.style.display = 'none';
                return;
            }
            
            // Validate file size (50MB limit)
            const maxSize = 50 * 1024 * 1024; // 50MB
            if (file.size > maxSize) {
                this.showToast('File size must be less than 50MB', 'error');
                event.target.value = '';
                uploadBtn.disabled = true;
                fileInfo.style.display = 'none';
                return;
            }
            
            // Display file info
            document.getElementById('fileName').textContent = file.name;
            document.getElementById('fileSize').textContent = this.formatFileSize(file.size);
            document.getElementById('fileType').textContent = file.type;
            
            fileInfo.style.display = 'block';
            uploadBtn.disabled = !this.currentUser;
            
            if (!this.currentUser) {
                this.showToast('Please create a user account first', 'warning');
            }
        } else {
            fileInfo.style.display = 'none';
            uploadBtn.disabled = true;
        }
    }

    async uploadFile() {
        const fileInput = document.getElementById('audioFile');
        const file = fileInput.files[0];
        
        if (!file || !this.currentUser) {
            this.showToast('Please select a file and create a user account', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('audio', file);
        formData.append('user_id', this.currentUser.id);
        
        const uploadProgress = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const uploadBtn = document.getElementById('uploadBtn');
        
        try {
            uploadBtn.disabled = true;
            uploadProgress.style.display = 'block';
            progressText.textContent = 'Uploading...';
            
            // Simulate progress (since we can't track real progress easily with fetch)
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += Math.random() * 30;
                if (progress > 90) progress = 90;
                progressFill.style.width = `${progress}%`;
            }, 200);
            
            const response = await fetch(`${this.apiBaseUrl}/api/upload`, {
                method: 'POST',
                body: formData
            });
            
            clearInterval(progressInterval);
            progressFill.style.width = '100%';
            
            const data = await response.json();
            
            if (response.ok) {
                progressText.textContent = 'Upload completed!';
                this.showToast('File uploaded successfully!', 'success');
                
                // Clear form
                fileInput.value = '';
                document.getElementById('fileInfo').style.display = 'none';
                
                // Refresh file list
                await this.loadAudioFiles();
                this.updateAudioFileSelect();
                
                setTimeout(() => {
                    uploadProgress.style.display = 'none';
                    progressFill.style.width = '0%';
                }, 2000);
            } else {
                throw new Error(data.message || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload failed:', error);
            progressText.textContent = 'Upload failed';
            this.showToast(`Upload failed: ${error.message}`, 'error');
            
            setTimeout(() => {
                uploadProgress.style.display = 'none';
                progressFill.style.width = '0%';
            }, 3000);
        } finally {
            uploadBtn.disabled = false;
        }
    }

    async loadAudioFiles() {
        if (!this.currentUser) {
            document.getElementById('filesList').innerHTML = '<p>Please create a user account to view files.</p>';
            return;
        }
        
        const filesList = document.getElementById('filesList');
        const filesLoading = document.getElementById('filesLoading');
        
        try {
            filesLoading.style.display = 'block';
            
            const response = await fetch(`${this.apiBaseUrl}/api/audio-files?user_id=${this.currentUser.id}`);
            const data = await response.json();
            
            if (response.ok) {
                this.audioFiles = data.data;
                this.displayAudioFiles();
                this.updateAudioFileSelect();
                document.getElementById('filesCount').textContent = this.audioFiles.length;
            } else {
                throw new Error(data.message || 'Failed to load files');
            }
        } catch (error) {
            console.error('Failed to load audio files:', error);
            filesList.innerHTML = `<p class="error">Failed to load files: ${error.message}</p>`;
            this.showToast('Failed to load audio files', 'error');
        } finally {
            filesLoading.style.display = 'none';
        }
    }

    displayAudioFiles() {
        const filesList = document.getElementById('filesList');
        
        if (this.audioFiles.length === 0) {
            filesList.innerHTML = '<p>No audio files uploaded yet. Upload your first file above!</p>';
            return;
        }
        
        const filesHtml = this.audioFiles.map(file => `
            <div class="file-item">
                <div class="file-details">
                    <h4>${file.original_filename}</h4>
                    <p><strong>Size:</strong> ${this.formatFileSize(file.file_size)}</p>
                    <p><strong>Type:</strong> ${file.mime_type || 'Unknown'}</p>
                    <p><strong>Uploaded:</strong> ${new Date(file.created_at).toLocaleString()}</p>
                </div>
                <div class="file-status status-${file.upload_status}">
                    ${file.upload_status}
                </div>
            </div>
        `).join('');
        
        filesList.innerHTML = filesHtml;
    }

    // Utility functions
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateAudioFileSelect() {
        const audioFileSelect = document.getElementById('audioFileSelect');

        // Clear existing options except the first one
        audioFileSelect.innerHTML = '<option value="">Choose an audio file...</option>';

        // Add options for each audio file
        this.audioFiles.forEach(file => {
            const option = document.createElement('option');
            option.value = file.id;
            option.textContent = `${file.original_filename} (${this.formatFileSize(file.file_size)})`;
            audioFileSelect.appendChild(option);
        });

        this.validateTranscriptionForm();
    }

    validateTranscriptionForm() {
        const audioFileSelect = document.getElementById('audioFileSelect');
        const targetInstrument = document.getElementById('targetInstrument');
        const outputFormat = document.getElementById('outputFormat');
        const createJobBtn = document.getElementById('createJobBtn');

        const isValid = audioFileSelect.value && targetInstrument.value && outputFormat.value && this.currentUser;
        createJobBtn.disabled = !isValid;
    }

    async createTranscriptionJob() {
        const audioFileId = document.getElementById('audioFileSelect').value;
        const targetInstrument = document.getElementById('targetInstrument').value;
        const outputFormat = document.getElementById('outputFormat').value;

        if (!audioFileId || !targetInstrument || !outputFormat) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        if (!this.currentUser) {
            this.showToast('Please create a user account first', 'error');
            return;
        }

        const createJobBtn = document.getElementById('createJobBtn');

        try {
            createJobBtn.disabled = true;
            createJobBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

            const response = await fetch(`${this.apiBaseUrl}/api/transcription-jobs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    audio_file_id: audioFileId,
                    target_instrument: targetInstrument,
                    output_format: outputFormat
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showToast('Transcription job created successfully!', 'success');

                // Clear form
                document.getElementById('audioFileSelect').value = '';
                document.getElementById('targetInstrument').value = '';
                document.getElementById('outputFormat').value = '';

                // Refresh jobs list
                await this.loadTranscriptionJobs();

            } else {
                throw new Error(data.message || 'Failed to create transcription job');
            }
        } catch (error) {
            console.error('Transcription job creation failed:', error);
            this.showToast(`Failed to create job: ${error.message}`, 'error');
        } finally {
            createJobBtn.disabled = false;
            createJobBtn.innerHTML = '<i class="fas fa-plus"></i> Create Transcription Job';
            this.validateTranscriptionForm();
        }
    }

    async loadTranscriptionJobs() {
        if (!this.currentUser) {
            document.getElementById('jobsList').innerHTML = '<p>Please create a user account to view transcription jobs.</p>';
            return;
        }

        const jobsList = document.getElementById('jobsList');
        const jobsLoading = document.getElementById('jobsLoading');

        try {
            jobsLoading.style.display = 'block';

            const response = await fetch(`${this.apiBaseUrl}/api/transcription-jobs?user_id=${this.currentUser.id}`);
            const data = await response.json();

            if (response.ok) {
                this.transcriptionJobs = data.data;
                this.displayTranscriptionJobs();
                this.updateJobSelect();
                document.getElementById('jobsCount').textContent = this.transcriptionJobs.length;
            } else {
                throw new Error(data.message || 'Failed to load transcription jobs');
            }
        } catch (error) {
            console.error('Failed to load transcription jobs:', error);
            jobsList.innerHTML = `<p class="error">Failed to load jobs: ${error.message}</p>`;
            this.showToast('Failed to load transcription jobs', 'error');
        } finally {
            jobsLoading.style.display = 'none';
        }
    }

    displayTranscriptionJobs() {
        const jobsList = document.getElementById('jobsList');

        if (this.transcriptionJobs.length === 0) {
            jobsList.innerHTML = '<p>No transcription jobs created yet. Create your first job above!</p>';
            return;
        }

        const jobsHtml = this.transcriptionJobs.map(job => {
            const audioFile = job.audio_files;
            const progressPercentage = job.progress_percentage || 0;

            return `
                <div class="job-item" data-job-id="${job.id}">
                    <div class="job-header">
                        <h4 class="job-title">${audioFile.original_filename}</h4>
                        <div class="job-status status-${job.status}">
                            ${job.status}
                        </div>
                    </div>
                    <div class="job-details">
                        <div class="job-detail">
                            <div class="job-detail-label">Target Instrument</div>
                            <div class="job-detail-value">${job.target_instrument}</div>
                        </div>
                        <div class="job-detail">
                            <div class="job-detail-label">Output Format</div>
                            <div class="job-detail-value">${job.output_format.toUpperCase()}</div>
                        </div>
                        <div class="job-detail">
                            <div class="job-detail-label">Created</div>
                            <div class="job-detail-value">${new Date(job.created_at).toLocaleString()}</div>
                        </div>
                        <div class="job-detail">
                            <div class="job-detail-label">File Size</div>
                            <div class="job-detail-value">${this.formatFileSize(audioFile.file_size)}</div>
                        </div>
                    </div>
                    ${job.status === 'processing' ? `
                        <div class="job-progress">
                            <div class="job-progress-label">
                                <span>Progress</span>
                                <span>${progressPercentage}%</span>
                            </div>
                            <div class="job-progress-bar">
                                <div class="job-progress-fill" style="width: ${progressPercentage}%"></div>
                            </div>
                        </div>
                    ` : ''}
                    ${job.error_message ? `
                        <div class="job-error">
                            <strong>Error:</strong> ${job.error_message}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        jobsList.innerHTML = jobsHtml;
    }

    showStatusUpdateSection() {
        if (this.currentUser && this.transcriptionJobs.length > 0) {
            document.querySelector('.status-update-section').style.display = 'block';
        } else {
            document.querySelector('.status-update-section').style.display = 'none';
        }
    }

    updateJobSelect() {
        const jobSelect = document.getElementById('jobSelect');

        // Clear existing options except the first one
        jobSelect.innerHTML = '<option value="">Choose a job...</option>';

        // Add options for each transcription job
        this.transcriptionJobs.forEach(job => {
            const option = document.createElement('option');
            option.value = job.id;
            option.textContent = `${job.audio_files.original_filename} - ${job.target_instrument} (${job.status})`;
            jobSelect.appendChild(option);
        });

        this.validateStatusUpdateForm();
    }

    validateStatusUpdateForm() {
        const jobSelect = document.getElementById('jobSelect');
        const statusSelect = document.getElementById('statusSelect');
        const updateStatusBtn = document.getElementById('updateStatusBtn');

        const isValid = jobSelect.value && statusSelect.value;
        updateStatusBtn.disabled = !isValid;
    }

    async updateJobStatus() {
        const jobId = document.getElementById('jobSelect').value;
        const status = document.getElementById('statusSelect').value;
        const progress = document.getElementById('progressInput').value;
        const errorMessage = document.getElementById('errorInput').value;

        if (!jobId || !status) {
            this.showToast('Please select a job and status', 'error');
            return;
        }

        const updateStatusBtn = document.getElementById('updateStatusBtn');

        try {
            updateStatusBtn.disabled = true;
            updateStatusBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

            const updateData = { status };

            if (progress !== '') {
                updateData.progress_percentage = parseInt(progress);
            }

            if (errorMessage.trim()) {
                updateData.error_message = errorMessage.trim();
            }

            const response = await fetch(`${this.apiBaseUrl}/api/transcription-jobs/${jobId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
            });

            const data = await response.json();

            if (response.ok) {
                this.showToast('Job status updated successfully!', 'success');

                // Clear form
                document.getElementById('jobSelect').value = '';
                document.getElementById('statusSelect').value = '';
                document.getElementById('progressInput').value = '';
                document.getElementById('errorInput').value = '';

                // Refresh jobs list and highlight updated job
                await this.loadTranscriptionJobs();
                this.highlightUpdatedJob(jobId);

            } else {
                throw new Error(data.message || 'Failed to update job status');
            }
        } catch (error) {
            console.error('Job status update failed:', error);
            this.showToast(`Failed to update status: ${error.message}`, 'error');
        } finally {
            updateStatusBtn.disabled = false;
            updateStatusBtn.innerHTML = '<i class="fas fa-save"></i> Update Status';
            this.validateStatusUpdateForm();
        }
    }

    highlightUpdatedJob(jobId) {
        // Find and highlight the updated job
        const jobItems = document.querySelectorAll('.job-item');
        jobItems.forEach(item => {
            const jobIdInItem = item.dataset.jobId;
            if (jobIdInItem === jobId) {
                item.classList.add('job-updated');
                setTimeout(() => {
                    item.classList.remove('job-updated');
                }, 3000);
            }
        });
    }

    async simulateProgress() {
        console.log('🎯 Simulate Progress button clicked!');

        const jobSelect = document.getElementById('jobSelect');
        const simulateBtn = document.getElementById('simulateProgressBtn');

        console.log('Job select value:', jobSelect.value);
        console.log('Job select element:', jobSelect);

        if (!jobSelect.value) {
            console.log('❌ No job selected');
            this.showToast('Please select a job first', 'warning');
            return;
        }

        const jobId = jobSelect.value;
        console.log('🚀 Starting simulation for job:', jobId);

        try {
            simulateBtn.disabled = true;
            simulateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Simulating...';

            // Start processing
            console.log('📝 Setting status to processing...');
            await this.updateJobStatusDirect(jobId, { status: 'processing', progress_percentage: 0 });
            this.showToast('Started progress simulation', 'info');

            // Simulate progress updates
            for (let progress = 10; progress <= 100; progress += 10) {
                console.log(`⏳ Updating progress to ${progress}%...`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

                const updateData = { progress_percentage: progress };
                if (progress === 100) {
                    updateData.status = 'completed';
                    console.log('✅ Setting status to completed');
                }

                await this.updateJobStatusDirect(jobId, updateData);
                await this.loadTranscriptionJobs();

                this.showToast(`Progress: ${progress}%`, 'info');
            }

            this.showToast('Progress simulation completed!', 'success');
            console.log('🎉 Simulation completed successfully!');

        } catch (error) {
            console.error('❌ Progress simulation failed:', error);
            this.showToast(`Simulation failed: ${error.message}`, 'error');
        } finally {
            simulateBtn.disabled = false;
            simulateBtn.innerHTML = '<i class="fas fa-play"></i> Simulate Progress';
            console.log('🔄 Button reset');
        }
    }

    async updateJobStatusDirect(jobId, updateData) {
        const response = await fetch(`${this.apiBaseUrl}/api/transcription-jobs/${jobId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to update job status');
        }

        return response.json();
    }

    toggleAutoRefresh() {
        const autoRefreshBtn = document.getElementById('autoRefreshBtn');

        if (this.isAutoRefreshing) {
            // Stop auto refresh
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
            this.isAutoRefreshing = false;

            autoRefreshBtn.innerHTML = '<i class="fas fa-play"></i> Auto Refresh';
            autoRefreshBtn.classList.remove('auto-refresh-active');
            autoRefreshBtn.setAttribute('data-auto', 'false');

            this.showToast('Auto refresh stopped', 'info');
        } else {
            // Start auto refresh
            this.isAutoRefreshing = true;
            this.autoRefreshInterval = setInterval(() => {
                this.loadTranscriptionJobs();
            }, 5000); // Refresh every 5 seconds

            autoRefreshBtn.innerHTML = '<i class="fas fa-pause"></i> Stop Auto';
            autoRefreshBtn.classList.add('auto-refresh-active');
            autoRefreshBtn.setAttribute('data-auto', 'true');

            this.showToast('Auto refresh started (5s interval)', 'success');
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);

        // Click to dismiss
        toast.addEventListener('click', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MusicTabApp();
    console.log('🌍 App instance exposed to window.app for debugging');
});
