/**
 * Music Tab App - Frontend JavaScript
 * Handles user interactions and API communication
 */

class MusicTabApp {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3001';
        this.currentUser = null;
        this.audioFiles = [];
        
        this.initializeApp();
    }

    async initializeApp() {
        console.log('🎵 Initializing Music Tab App...');
        
        this.bindEventListeners();
        await this.checkApiStatus();
        this.loadUserFromStorage();
        
        if (this.currentUser) {
            await this.loadAudioFiles();
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
    new MusicTabApp();
});
