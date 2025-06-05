// SERVER_URL   http://75.101.248.50:8000
// const SERVER_URL='http://75.101.248.50:8000';
const SERVER_URL='https://intelmaasapi.kneotech.cloud';
class IntelMaaSChat {
    constructor() {
        this.apiBaseUrl = SERVER_URL;
        this.selectedModel = null;
        this.models = [];
        this.isStreaming = false;
        this.messageCount = 0;
        this.tokenCount = 0;
        this.startTime = Date.now();
        this.settings = this.loadSettings();
        this.toolbarCollapsed = false;
        
        this.initializeElements();
        this.attachEventListeners();
        this.initialize();
    }

    initializeElements() {
        // Status elements
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        
        // Model elements
        this.modelsList = document.getElementById('modelsList');
        this.modelDetails = document.getElementById('modelDetails');
        this.quickModelSelect = document.getElementById('quickModelSelect');
        this.refreshModelsBtn = document.getElementById('refreshModelsBtn');
        
        // Chat elements
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.maxTokensInput = document.getElementById('maxTokens');
        this.temperatureInput = document.getElementById('temperature');
        this.temperatureValue = document.getElementById('temperatureValue');
        
        // Input area elements
        this.chatInputContainer = document.getElementById('chatInputContainer');
        this.inputToolbar = document.getElementById('inputToolbar');
        this.toggleToolbarBtn = document.getElementById('toggleToolbarBtn');
        this.charCount = document.getElementById('charCount');
        this.maxChars = document.getElementById('maxChars');
        this.inputStatus = document.getElementById('inputStatus');
        
        // Control elements
        this.clearBtn = document.getElementById('clearBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        
        // Modal elements
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
        this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
        this.resetSettingsBtn = document.getElementById('resetSettingsBtn');
        this.apiBaseUrlInput = document.getElementById('apiBaseUrl');
        this.autoScrollInput = document.getElementById('autoScroll');
        this.showTimestampsInput = document.getElementById('showTimestamps');
        this.showMetricsInput = document.getElementById('showMetrics');
        
        // Stats elements
        this.messageCountEl = document.getElementById('messageCount');
        this.tokenCountEl = document.getElementById('tokenCount');
        this.uptimeEl = document.getElementById('uptime');
        
        // Other elements
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.loadingText = document.getElementById('loadingText');
        this.toastContainer = document.getElementById('toastContainer');
    }

    attachEventListeners() {
        // Send message
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Enhanced textarea event listeners
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Dynamic textarea resize
        this.messageInput.addEventListener('input', () => {
            this.handleTextareaInput();
        });

        // Focus and blur events for better UX
        this.messageInput.addEventListener('focus', () => {
            this.updateInputStatus('ready', 'Ready to send');
        });

        this.messageInput.addEventListener('blur', () => {
            if (!this.isStreaming) {
                this.updateInputStatus('', 'Type a message...');
            }
        });

        // Temperature slider
        this.temperatureInput.addEventListener('input', (e) => {
            this.temperatureValue.textContent = parseFloat(e.target.value).toFixed(1);
        });

        // Toolbar toggle
        this.toggleToolbarBtn.addEventListener('click', () => {
            this.toggleToolbar();
        });

        // Model selection
        this.quickModelSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                this.selectModel(e.target.value);
            }
        });

        // Control buttons
        this.clearBtn.addEventListener('click', () => this.clearChat());
        this.refreshModelsBtn.addEventListener('click', () => this.loadModels(true));
        
        // Settings
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        this.resetSettingsBtn.addEventListener('click', () => this.resetSettings());
        
        // Click outside modal to close
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.closeSettings();
            }
        });

        // Update uptime every second
        setInterval(() => this.updateUptime(), 1000);

        // Handle window resize
        window.addEventListener('resize', () => {
            this.adjustTextareaHeight();
        });
    }

    handleTextareaInput() {
        const value = this.messageInput.value;
        const length = value.length;
        const maxLength = parseInt(this.maxChars.textContent);
        
        // Update character count
        this.charCount.textContent = length;
        
        // Update character count color
        if (length > maxLength * 0.9) {
            this.charCount.style.color = 'var(--error-color)';
        } else if (length > maxLength * 0.7) {
            this.charCount.style.color = 'var(--warning-color)';
        } else {
            this.charCount.style.color = 'var(--text-secondary)';
        }
        
        // Auto-resize textarea
        this.adjustTextareaHeight();
        
        // Update send button state
        this.updateSendButtonState();
        
        // Update input status
        if (length > 0) {
            this.updateInputStatus('ready', `Ready to send (${length} chars)`);
        } else {
            this.updateInputStatus('', 'Type a message...');
        }
    }

    adjustTextareaHeight() {
        // Reset height to auto to get the correct scrollHeight
        this.messageInput.style.height = 'auto';
        
        // Calculate new height based on content
        const scrollHeight = this.messageInput.scrollHeight;
        const minHeight = 50;
        const maxHeight = 300;
        
        const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
        this.messageInput.style.height = newHeight + 'px';
        
        // Show scrollbar if content exceeds max height
        if (scrollHeight > maxHeight) {
            this.messageInput.style.overflowY = 'auto';
        } else {
            this.messageInput.style.overflowY = 'hidden';
        }
    }

    updateSendButtonState() {
        const hasText = this.messageInput.value.trim().length > 0;
        const hasModel = this.selectedModel !== null;
        const canSend = hasText && hasModel && !this.isStreaming;
        
        this.sendBtn.disabled = !canSend;
        
        if (canSend) {
            this.sendBtn.classList.add('ready');
            this.sendBtn.title = 'Send message';
        } else if (!hasModel) {
            this.sendBtn.classList.remove('ready');
            this.sendBtn.title = 'Select a model first';
        } else if (!hasText) {
            this.sendBtn.classList.remove('ready');
            this.sendBtn.title = 'Type a message';
        } else if (this.isStreaming) {
            this.sendBtn.classList.remove('ready');
            this.sendBtn.title = 'Please wait...';
        }
    }

    updateInputStatus(type, text) {
        this.inputStatus.className = `input-status ${type}`;
        this.inputStatus.querySelector('.status-text').textContent = text;
    }

    toggleToolbar() {
        this.toolbarCollapsed = !this.toolbarCollapsed;
        
        if (this.toolbarCollapsed) {
            this.inputToolbar.classList.add('collapsed');
            this.toggleToolbarBtn.querySelector('i').className = 'fas fa-chevron-down';
            this.toggleToolbarBtn.title = 'Expand toolbar';
        } else {
            this.inputToolbar.classList.remove('collapsed');
            this.toggleToolbarBtn.querySelector('i').className = 'fas fa-chevron-up';
            this.toggleToolbarBtn.title = 'Collapse toolbar';
        }
    }

    async initialize() {
        this.showLoading('Initializing application...');
        
        try {
            // Load settings
            this.applySettings();
            
            // Initialize input state
            this.updateSendButtonState();
            this.updateInputStatus('', 'Connecting...');
            
            // Check API health
            await this.checkHealth();
            
            // Load models
            await this.loadModels();
            
            this.hideLoading();
            this.updateInputStatus('', 'Select a model to start chatting');
            this.showToast('Application initialized successfully!', 'success');
        } catch (error) {
            this.hideLoading();
            this.updateInputStatus('error', 'Connection failed');
            this.showToast(`Initialization failed: ${error.message}`, 'error');
            console.error('Initialization error:', error);
        }
    }

    async checkHealth() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/health`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const health = await response.json();
            this.updateStatus('online', 'Connected');
            console.log('Health check:', health);
        } catch (error) {
            this.updateStatus('offline', 'Disconnected');
            throw new Error(`Health check failed: ${error.message}`);
        }
    }

    async loadModels(force = false) {
        if (!force && this.models.length > 0) return;

        try {
            this.showLoadingInElement(this.modelsList, 'Loading models...');
            
            const response = await fetch(`${this.apiBaseUrl}/api/gemini/models`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            this.models = data.models;
            
            this.renderModels();
            this.populateModelSelect();
            
            if (this.models.length > 0 && !this.selectedModel) {
                // Auto-select first available model (prefer Mistral)
                const mistralModel = this.models.find(m => m.model.toLowerCase().includes('mistral'));
                const modelToSelect = mistralModel || this.models[0];
                this.selectModel(modelToSelect.model);
            }
            
            console.log(`Loaded ${this.models.length} models`);
        } catch (error) {
            this.showErrorInElement(this.modelsList, `Failed to load models: ${error.message}`);
            throw error;
        }
    }

    renderModels() {
        const html = this.models.map(model => {
            const isSelected = this.selectedModel?.model === model.model;
            
            return `
                <div class="model-item ${isSelected ? 'selected' : ''}" 
                     data-model="${model.model}" 
                     onclick="app.selectModel('${model.model}')">
                    <div class="model-name">${model.model}</div>
                    <div class="model-provider">${model.provider}</div>
                    <div class="model-status available">
                        <i class="fas fa-circle"></i>
                        <span>${model.status}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        this.modelsList.innerHTML = html;
    }

    populateModelSelect() {
        const options = [
            '<option value="">Select Model...</option>',
            ...this.models.map(model => 
                `<option value="${model.model}" ${this.selectedModel?.model === model.model ? 'selected' : ''}>${model.model}</option>`
            )
        ];
        
        this.quickModelSelect.innerHTML = options.join('');
    }

    selectModel(modelName) {
        const model = this.models.find(m => m.model === modelName);
        if (!model) return;

        this.selectedModel = model;
        
        // Update UI
        this.renderModels();
        this.updateModelDetails();
        this.quickModelSelect.value = modelName;
        
        // Enable input and update state
        this.messageInput.disabled = false;
        this.messageInput.placeholder = `Chat with ${model.model}...`;
        this.updateSendButtonState();
        this.updateInputStatus('', 'Ready to chat');
        
        this.showToast(`Selected model: ${model.model}`, 'info');
        
        // Focus on input
        setTimeout(() => this.messageInput.focus(), 100);
    }

    updateModelDetails() {
        if (!this.selectedModel) {
            this.modelDetails.innerHTML = '<p>No model selected</p>';
            return;
        }

        const model = this.selectedModel;
        this.modelDetails.innerHTML = `
            <div class="model-name">${model.model}</div>
            <div class="model-provider">${model.provider}</div>
            <div class="model-id">ID: ${model.productId}</div>
            <div class="model-product">Product: ${model.productName}</div>
        `;
    }

    async sendMessage() {
        if (!this.selectedModel || this.isStreaming) return;

        const message = this.messageInput.value.trim();
        if (!message) return;

        const maxTokens = parseInt(this.maxTokensInput.value) || 250;
        const temperature = parseFloat(this.temperatureInput.value) || 0.7;

        // Clear input and reset height
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        this.handleTextareaInput(); // Update character count and button state

        // Add user message
        this.addMessage('user', message);
        
        // Show typing indicator
        const typingId = this.showTypingIndicator();

        try {
            this.isStreaming = true;
            this.updateSendButton(true);
            this.updateInputStatus('sending', 'Sending message...');
            this.messageCount++;
            this.updateStats();

            // Prepare request
            const requestBody = {
                prompt: message,
                max_tokens: maxTokens,
                temperature: temperature
            };

            const response = await fetch(`${this.apiBaseUrl}/api/gemini/stream/${encodeURIComponent(this.selectedModel.model)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            await this.handleStreamResponse(response, typingId);

        } catch (error) {
            this.removeTypingIndicator(typingId);
            this.addMessage('assistant', `Error: ${error.message}`, { error: true });
            this.showToast(`Request failed: ${error.message}`, 'error');
            console.error('Send message error:', error);
        } finally {
            this.isStreaming = false;
            this.updateSendButton(false);
            this.updateInputStatus('', 'Ready to chat');
            this.updateSendButtonState();
        }
    }

    async handleStreamResponse(response, typingId) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let assistantMessage = '';
        let messageElement = null;
        let startTime = Date.now();
        let firstTokenTime = null;
        let tokenCount = 0;
        let metrics = {};

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            switch (data.type) {
                                case 'metadata':
                                    console.log('Stream metadata:', data);
                                    this.updateInputStatus('sending', 'Receiving response...');
                                    break;
                                    
                                case 'timing':
                                    if (!firstTokenTime) {
                                        firstTokenTime = Date.now();
                                        metrics.timeToFirstToken = data.time_to_first_token;
                                        this.updateInputStatus('sending', 'Streaming response...');
                                    }
                                    break;
                                    
                                case 'token':
                                    if (!messageElement) {
                                        this.removeTypingIndicator(typingId);
                                        messageElement = this.addMessage('assistant', '', { streaming: true });
                                    }
                                    
                                    assistantMessage += data.text;
                                    tokenCount++;
                                    this.updateMessageContent(messageElement, assistantMessage);
                                    break;
                                    
                                case 'completion':
                                    metrics.finishReason = data.finish_reason;
                                    metrics.tokensGenerated = data.tokens_generated;
                                    metrics.totalTime = data.total_time;
                                    metrics.seed = data.seed;
                                    
                                    this.tokenCount += tokenCount;
                                    this.updateStats();
                                    this.updateInputStatus('', 'Response completed');
                                    break;
                                    
                                case 'error':
                                    throw new Error(data.error);
                                    
                                case 'done':
                                    console.log('Stream completed:', data);
                                    break;
                            }
                        } catch (e) {
                            console.warn('Failed to parse SSE data:', line, e);
                        }
                    }
                }
            }

            // Finalize message
            if (messageElement) {
                this.finalizeMessage(messageElement, assistantMessage, metrics);
            }

        } catch (error) {
            if (messageElement) {
                this.updateMessageContent(messageElement, assistantMessage + '\n\n[Error: Stream interrupted]');
            }
            throw error;
        }
    }

    addMessage(role, content, options = {}) {
        const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date().toLocaleTimeString();
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${role}`;
        messageElement.id = messageId;
        
        const avatar = role === 'user' ? 'fa-user' : 'fa-robot';
        const showTimestamp = this.settings.showTimestamps;
        
        messageElement.innerHTML = `
            <div class="message-avatar">
                <i class="fas ${avatar}"></i>
            </div>
            <div class="message-content">
                <div class="message-bubble ${options.error ? 'error' : ''}">
                    <div class="message-text">${this.formatMessage(content)}</div>
                </div>
                ${showTimestamp ? `<div class="message-meta">
                    <span class="message-time">${timestamp}</span>
                </div>` : ''}
            </div>
        `;
        
        this.chatMessages.appendChild(messageElement);
        this.scrollToBottom();
        
        return messageElement;
    }

    updateMessageContent(messageElement, content) {
        const textElement = messageElement.querySelector('.message-text');
        if (textElement) {
            textElement.innerHTML = this.formatMessage(content);
            this.scrollToBottom();
        }
    }

    finalizeMessage(messageElement, content, metrics) {
        this.updateMessageContent(messageElement, content);
        
        if (this.settings.showMetrics && metrics && Object.keys(metrics).length > 0) {
            const metaElement = messageElement.querySelector('.message-meta') || 
                              messageElement.querySelector('.message-content').appendChild(document.createElement('div'));
            
            if (!metaElement.classList.contains('message-meta')) {
                metaElement.className = 'message-meta';
            }
            
            const metricsHtml = `
                <div class="metrics">
                    ${metrics.timeToFirstToken ? `<div class="metric"><i class="fas fa-clock"></i> ${metrics.timeToFirstToken}</div>` : ''}
                    ${metrics.tokensGenerated ? `<div class="metric"><i class="fas fa-hash"></i> ${metrics.tokensGenerated} tokens</div>` : ''}
                    ${metrics.totalTime ? `<div class="metric"><i class="fas fa-stopwatch"></i> ${metrics.totalTime}</div>` : ''}
                </div>
            `;
            
            metaElement.innerHTML += metricsHtml;
        }
        
        messageElement.classList.remove('streaming');
    }

    showTypingIndicator() {
        const id = `typing-${Date.now()}`;
        const typingElement = document.createElement('div');
        typingElement.className = 'typing-indicator';
        typingElement.id = id;
        
        typingElement.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        
        this.chatMessages.appendChild(typingElement);
        this.scrollToBottom();
        
        return id;
    }

    removeTypingIndicator(id) {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }

    formatMessage(content) {
        // Basic markdown-like formatting
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    clearChat() {
        if (confirm('Are you sure you want to clear the chat history?')) {
            this.chatMessages.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-icon">
                        <i class="fas fa-microchip"></i>
                    </div>
                    <h2>Chat Cleared</h2>
                    <p>Start a new conversation with your selected AI model.</p>
                </div>
            `;
            
            this.messageCount = 0;
            this.tokenCount = 0;
            this.updateStats();
            
            this.showToast('Chat history cleared', 'info');
        }
    }

    updateSendButton(sending) {
        if (sending) {
            this.sendBtn.disabled = true;
            this.sendBtn.classList.add('sending');
            this.sendBtn.classList.remove('ready');
            this.sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        } else {
            this.sendBtn.classList.remove('sending');
            this.sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            this.updateSendButtonState(); // This will set the correct state
        }
    }

    updateStatus(status, text) {
        this.statusIndicator.className = `status-indicator ${status}`;
        this.statusText.textContent = text;
    }

    updateStats() {
        this.messageCountEl.textContent = this.messageCount;
        this.tokenCountEl.textContent = this.tokenCount;
    }

    updateUptime() {
        const uptime = Date.now() - this.startTime;
        const seconds = Math.floor(uptime / 1000) % 60;
        const minutes = Math.floor(uptime / 60000) % 60;
        const hours = Math.floor(uptime / 3600000);
        
        if (hours > 0) {
            this.uptimeEl.textContent = `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            this.uptimeEl.textContent = `${minutes}m ${seconds}s`;
        } else {
            this.uptimeEl.textContent = `${seconds}s`;
        }
    }

    scrollToBottom() {
        if (this.settings.autoScroll) {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    // Settings
    openSettings() {
        this.apiBaseUrlInput.value = this.settings.apiBaseUrl;
        this.autoScrollInput.checked = this.settings.autoScroll;
        this.showTimestampsInput.checked = this.settings.showTimestamps;
        this.showMetricsInput.checked = this.settings.showMetrics;
        
        this.settingsModal.classList.add('active');
    }

    closeSettings() {
        this.settingsModal.classList.remove('active');
    }

    saveSettings() {
        this.settings = {
            apiBaseUrl: this.apiBaseUrlInput.value,
            autoScroll: this.autoScrollInput.checked,
            showTimestamps: this.showTimestampsInput.checked,
            showMetrics: this.showMetricsInput.checked
        };
        
        localStorage.setItem('maas-settings', JSON.stringify(this.settings));
        this.applySettings();
        this.closeSettings();
        this.showToast('Settings saved successfully!', 'success');
    }

    resetSettings() {
        this.settings = this.getDefaultSettings();
        localStorage.removeItem('maas-settings');
        this.openSettings(); // Refresh the form
        this.showToast('Settings reset to defaults', 'info');
    }

    loadSettings() {
        const saved = localStorage.getItem('maas-settings');
        return saved ? { ...this.getDefaultSettings(), ...JSON.parse(saved) } : this.getDefaultSettings();
    }

    getDefaultSettings() {
        return {
            apiBaseUrl: SERVER_URL,
            autoScroll: true,
            showTimestamps: true,
            showMetrics: true
        };
    }

    applySettings() {
        this.apiBaseUrl = this.settings.apiBaseUrl;
    }

    // Utility methods
    showLoading(text = 'Loading...') {
        this.loadingText.textContent = text;
        this.loadingOverlay.classList.add('active');
    }

    hideLoading() {
        this.loadingOverlay.classList.remove('active');
    }

    showLoadingInElement(element, text) {
        element.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <span>${text}</span>
            </div>
        `;
    }

    showErrorInElement(element, text) {
        element.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${text}</span>
                <button onclick="app.loadModels(true)" class="btn-small">Retry</button>
            </div>
        `;
    }

    showToast(message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        }[type] || 'fa-info-circle';
        
        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;
        
        this.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

// Initialize the application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new IntelMaaSChat();
});

// Expose app globally for debugging
window.app = app;
