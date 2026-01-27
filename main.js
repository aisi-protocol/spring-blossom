// 春暖花开 - 主应用程序逻辑
import { initializeSupabase } from './supabase-client.js';
import { startMatching, cancelMatching, sendMessage, endSession } from './match-engine.js';

class SpringBlossomApp {
    constructor() {
        this.currentScreen = 'welcome';
        this.selectedEmotion = null;
        this.sessionId = null;
        this.userId = this.generateUserId();
        this.sessionTimer = null;
        this.timeRemaining = 30 * 60; // 30分钟
        this.messageCount = 0;
        this.supabase = null;
        
        this.initializeApp();
    }

    // 生成匿名用户ID
    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
    }

    // 初始化应用
    async initializeApp() {
        console.log('🌸 春暖花开应用初始化...');
        
        // 显示隐私声明
        this.showPrivacyModal();
        
        // 初始化Supabase
        this.supabase = await initializeSupabase();
        if (!this.supabase) {
            this.showError('无法连接到服务，请检查网络连接');
            return;
        }

        // 设置事件监听器
        this.setupEventListeners();
        
        // 生成情绪气泡
        this.generateEmotionBubbles();
        
        // 检查是否有恢复的会话
        this.checkForRecovery();
        
        console.log('✅ 应用初始化完成');
    }

    // 显示隐私声明
    showPrivacyModal() {
        const modal = document.getElementById('privacyModal');
        modal.style.display = 'flex';
        
        document.getElementById('agreePrivacyBtn').onclick = () => {
            modal.style.display = 'none';
            localStorage.setItem('privacyAgreed', 'true');
        };
        
        document.getElementById('declineBtn').onclick = () => {
            window.location.href = 'about:blank';
        };
        
        // 如果之前已同意，自动隐藏
        if (localStorage.getItem('privacyAgreed') === 'true') {
            modal.style.display = 'none';
        }
    }

    // 生成情绪气泡
    generateEmotionBubbles() {
        const emotions = [
            { id: 'happy', text: '😊 开心', color: '#FFD700' },
            { id: 'anxious', text: '😰 焦虑', color: '#FF6B6B' },
            { id: 'sad', text: '😔 低落', color: '#4ECDC4' },
            { id: 'angry', text: '😤 烦躁', color: '#FF8E53' },
            { id: 'joyful', text: '😄 快乐', color: '#FFD166' },
            { id: 'confused', text: '🤔 纠结', color: '#06D6A0' },
            { id: 'hurt', text: '😢 受伤', color: '#118AB2' },
            { id: 'uneasy', text: '😟 不安', color: '#EF476F' },
            { id: 'lost', text: '😵 懵了', color: '#073B4C' }
        ];

        const grid = document.getElementById('emotionGrid');
        grid.innerHTML = '';

        emotions.forEach(emotion => {
            const bubble = document.createElement('div');
            bubble.className = 'emotion-bubble';
            bubble.dataset.emotion = emotion.id;
            bubble.dataset.text = emotion.text;
            bubble.style.borderColor = emotion.color;
            bubble.innerHTML = emotion.text;
            
            bubble.onclick = () => this.selectEmotion(emotion.id, emotion.text);
            grid.appendChild(bubble);
        });

        // 自定义情绪按钮
        document.getElementById('createCustomBtn').onclick = () => {
            const customSection = document.getElementById('customEmotionSection');
            customSection.style.display = customSection.style.display === 'none' ? 'flex' : 'none';
        };

        document.getElementById('submitCustomEmotion').onclick = () => {
            const input = document.getElementById('customEmotionInput');
            const customEmotion = input.value.trim();
            if (customEmotion) {
                this.selectEmotion('custom', `💭 ${customEmotion}`);
                input.value = '';
                document.getElementById('customEmotionSection').style.display = 'none';
            }
        };
    }

    // 选择情绪
    selectEmotion(emotionId, emotionText) {
        // 移除之前的选择
        document.querySelectorAll('.emotion-bubble.selected').forEach(bubble => {
            bubble.classList.remove('selected');
        });

        // 标记当前选择
        const selectedBubble = document.querySelector(`[data-emotion="${emotionId}"]`);
        if (selectedBubble) {
            selectedBubble.classList.add('selected');
        }

        this.selectedEmotion = {
            id: emotionId,
            text: emotionText
        };

        // 开始匹配
        this.startMatchingProcess();
    }

    // 开始匹配流程
    async startMatchingProcess() {
        if (!this.selectedEmotion) return;

        this.switchScreen('matching');
        
        // 显示匹配的情绪
        document.getElementById('matchedEmotionDisplay').textContent = this.selectedEmotion.text;
        
        // 更新匹配状态
        const statusElement = document.getElementById('matchingStatus');
        statusElement.textContent = '正在匹配中，请稍候';
        
        // 开始匹配
        try {
            const matchResult = await startMatching(
                this.supabase,
                this.userId,
                this.selectedEmotion.id,
                this.selectedEmotion.text
            );
            
            if (matchResult.success) {
                this.sessionId = matchResult.sessionId;
                this.startChatSession(matchResult);
            } else {
                this.showError('匹配失败，请稍后重试');
                this.switchScreen('welcome');
            }
        } catch (error) {
            console.error('匹配错误:', error);
            this.showError('匹配过程中出现错误');
            this.switchScreen('welcome');
        }
    }

    // 开始聊天会话
    startChatSession(matchData) {
        this.sessionId = matchData.sessionId;
        this.switchScreen('chat');
        
        // 设置聊天情绪标签
        document.getElementById('chatEmotionTag').textContent = this.selectedEmotion.text;
        
        // 开始会话计时器
        this.startSessionTimer();
        
        // 设置聊天事件监听器
        this.setupChatListeners();
        
        // 订阅实时消息
        this.subscribeToMessages();
        
        // 发送欢迎消息
        this.sendWelcomeMessage();
    }

    // 开始会话计时器
    startSessionTimer() {
        this.timeRemaining = 30 * 60; // 30分钟
        
        const updateTimer = () => {
            const minutes = Math.floor(this.timeRemaining / 60);
            const seconds = this.timeRemaining % 60;
            
            document.getElementById('sessionTimer').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            document.getElementById('remainingTime').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            if (this.timeRemaining <= 0) {
                clearInterval(this.sessionTimer);
                this.endSessionAutomatically();
                return;
            }
            
            this.timeRemaining--;
        };
        
        updateTimer();
        this.sessionTimer = setInterval(updateTimer, 1000);
    }

    // 设置聊天事件监听器
    setupChatListeners() {
        // 发送消息
        document.getElementById('sendMessageBtn').onclick = () => this.sendChatMessage();
        
        // 回车发送
        document.getElementById('messageInput').onkeypress = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendChatMessage();
            }
        };
        
        // 字符计数
        document.getElementById('messageInput').oninput = (e) => {
            document.getElementById('charCount').textContent = 
                `${e.target.value.length}/500`;
        };
        
        // 结束会话
        document.getElementById('endSessionBtn').onclick = () => this.endSessionManually();
        
        // 取消匹配按钮
        document.getElementById('cancelMatchBtn').onclick = () => {
            if (this.sessionId) {
                cancelMatching(this.supabase, this.sessionId);
            }
            this.switchScreen('welcome');
        };
    }

    // 发送聊天消息
    async sendChatMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (!message || !this.sessionId) return;
        
        try {
            const result = await sendMessage(
                this.supabase,
                this.sessionId,
                this.userId,
                message
            );
            
            if (result.success) {
                input.value = '';
                document.getElementById('charCount').textContent = '0/500';
                this.messageCount++;
                
                // 添加到消息列表
                this.addMessageToChat(message, true);
            } else {
                this.showError('消息发送失败，可能包含敏感内容');
            }
        } catch (error) {
            console.error('发送消息错误:', error);
            this.showError('消息发送失败');
        }
    }

    // 添加消息到聊天窗口
    addMessageToChat(message, isSent = false) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');
        
        messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
        
        const time = new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageElement.innerHTML = `
            <div class="message-text">${this.escapeHtml(message)}</div>
            <div class="message-time">${time}</div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // 订阅实时消息
    subscribeToMessages() {
        if (!this.supabase || !this.sessionId) return;
        
        const channel = this.supabase
            .channel(`chat_${this.sessionId}`)
            .on('broadcast', { event: 'new_message' }, (payload) => {
                if (payload.sender_id !== this.userId) {
                    this.addMessageToChat(payload.content, false);
                }
            })
            .subscribe();
        
        // 存储频道引用以便清理
        this.chatChannel = channel;
    }

    // 发送欢迎消息
    sendWelcomeMessage() {
        const welcomeMessages = [
            "你好！我感受到了你的情绪，愿意倾听你的倾诉。",
            "此刻，我们的感受相连。你可以放心地倾诉。",
            "匿名让我们更真实，30分钟的倾诉空间已为你开启。",
            "每一个情绪都值得被听见，我在这里倾听。"
        ];
        
        const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
        
        // 延迟显示欢迎消息
        setTimeout(() => {
            this.addMessageToChat(randomMessage, false);
        }, 1000);
    }

    // 自动结束会话
    async endSessionAutomatically() {
        if (!this.sessionId) return;
        
        try {
            await endSession(this.supabase, this.sessionId);
            this.showEndScreen();
        } catch (error) {
            console.error('结束会话错误:', error);
            this.showEndScreen();
        }
    }

    // 手动结束会话
    async endSessionManually() {
        if (confirm('确定要结束这次对话吗？')) {
            clearInterval(this.sessionTimer);
            await this.endSessionAutomatically();
        }
    }

    // 显示结束屏幕
    showEndScreen() {
        this.switchScreen('end');
        
        // 清理资源
        if (this.chatChannel) {
            this.supabase.removeChannel(this.chatChannel);
        }
        
        // 显示统计信息
        const duration = 30 - Math.ceil(this.timeRemaining / 60);
        document.getElementById('sessionDuration').textContent = duration;
        document.getElementById('messageCount').textContent = this.messageCount;
        
        // 设置结束页面按钮事件
        document.getElementById('newSessionBtn').onclick = () => {
            this.resetForNewSession();
            this.switchScreen('welcome');
        };
        
        document.getElementById('feedbackBtn').onclick = () => {
            this.switchScreen('feedback');
        };
    }

    // 重置为新会话
    resetForNewSession() {
        this.selectedEmotion = null;
        this.sessionId = null;
        this.messageCount = 0;
        this.timeRemaining = 30 * 60;
        
        // 清除聊天消息
        document.getElementById('chatMessages').innerHTML = '';
        document.getElementById('messageInput').value = '';
        document.getElementById('charCount').textContent = '0/500';
        
        // 重置情绪选择
        document.querySelectorAll('.emotion-bubble.selected').forEach(bubble => {
            bubble.classList.remove('selected');
        });
    }

    // 检查是否有可恢复的会话
    checkForRecovery() {
        const savedSession = localStorage.getItem('currentSession');
        if (savedSession) {
            const session = JSON.parse(savedSession);
            const elapsed = Date.now() - session.timestamp;
            
            // 如果会话在30分钟内
            if (elapsed < 30 * 60 * 1000) {
                if (confirm('检测到未完成的会话，是否恢复？')) {
                    this.sessionId = session.sessionId;
                    this.userId = session.userId;
                    this.selectedEmotion = session.emotion;
                    this.startChatSession({ sessionId: session.sessionId });
                } else {
                    localStorage.removeItem('currentSession');
                }
            } else {
                localStorage.removeItem('currentSession');
            }
        }
    }

    // 切换屏幕
    switchScreen(screenName) {
        // 隐藏所有屏幕
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // 显示目标屏幕
        const targetScreen = document.querySelector(`.${screenName}-screen`);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenName;
        }
        
        // 保存当前会话
        if (screenName === 'chat' && this.sessionId) {
            localStorage.setItem('currentSession', JSON.stringify({
                sessionId: this.sessionId,
                userId: this.userId,
                emotion: this.selectedEmotion,
                timestamp: Date.now()
            }));
        }
        
        // 清除保存的会话
        if (screenName === 'welcome') {
            localStorage.removeItem('currentSession');
        }
    }

    // 显示错误
    showError(message) {
        alert(`⚠️ ${message}`);
    }

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 设置事件监听器
    setupEventListeners() {
        // 反馈页面事件
        document.querySelectorAll('.feedback-btn').forEach(btn => {
            btn.onclick = (e) => {
                const feeling = e.target.dataset.feeling;
                this.submitFeedback(feeling);
            };
        });
        
        document.getElementById('submitFeedbackBtn').onclick = () => {
            const text = document.getElementById('feedbackText').value;
            this.submitFeedback('custom', text);
        };
        
        document.getElementById('skipFeedbackBtn').onclick = () => {
            this.switchScreen('welcome');
        };
    }

    // 提交反馈
    async submitFeedback(feeling, text = '') {
        try {
            // 这里可以添加反馈提交逻辑
            console.log('提交反馈:', { feeling, text });
            
            alert('感谢你的反馈！');
            this.switchScreen('welcome');
        } catch (error) {
            console.error('提交反馈错误:', error);
            this.switchScreen('welcome');
        }
    }
}

// 页面加载完成后启动应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SpringBlossomApp();
});

// 导出应用实例
export { SpringBlossomApp };
