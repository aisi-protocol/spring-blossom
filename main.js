// ===== 春暖花开 - 主应用逻辑 =====
// 版本: 1.0.0
// 对应HTML: 完整版index.html

class SpringBlossomApp {
    constructor() {
        // 应用状态
        this.state = {
            currentScene: 'emotion', // emotion | matching | chat
            selectedEmotion: null,
            matchId: null,
            partnerId: null,
            sessionId: null,
            messages: [],
            isConnected: false,
            timeLeft: 30 * 60, // 30分钟，单位秒
            timerInterval: null,
            isTyping: false,
            partnerTyping: false
        };

        // DOM 元素引用
        this.elements = {};
        
        // 初始化
        this.initDOM();
        this.initEventListeners();
        this.initSupabase();
        
        // 花瓣系统
        this.initPetalSystem();
        
        console.log('春暖花开应用初始化完成');
    }

    // ===== 1. DOM 初始化 =====
    initDOM() {
        // 场景容器
        this.elements.scenes = {
            emotion: document.getElementById('emotionScene'),
            matching: document.getElementById('matchingScene'),
            chat: document.getElementById('chatScene')
        };

        // 情绪选择
        this.elements.emotionFlowers = document.querySelectorAll('.emotion-flower');
        this.elements.startMatchBtn = document.getElementById('startMatchBtn');
        this.elements.selectedEmotionDisplay = document.getElementById('selectedEmotionDisplay');
        this.elements.matchedEmotionDisplay = document.getElementById('matchedEmotionDisplay');

        // 匹配场景
        this.elements.cancelMatchBtn = document.getElementById('cancelMatchBtn');

        // 聊天场景
        this.elements.endChatBtn = document.getElementById('endChatBtn');
        this.elements.messageInput = document.getElementById('messageInput');
        this.elements.sendMessageBtn = document.getElementById('sendMessageBtn');
        this.elements.chatMessages = document.getElementById('chatMessages');
        this.elements.charCount = document.getElementById('charCount');
        this.elements.countdown = document.getElementById('countdown');

        // 更新字符计数显示
        this.updateCharCount();
    }

    // ===== 2. 事件监听器 =====
    initEventListeners() {
        // 情绪花朵点击
        this.elements.emotionFlowers.forEach(flower => {
            flower.addEventListener('click', () => this.selectEmotion(flower));
        });

        // 开始匹配按钮
        this.elements.startMatchBtn.addEventListener('click', () => this.startMatching());

        // 取消匹配按钮
        this.elements.cancelMatchBtn.addEventListener('click', () => this.cancelMatching());

        // 消息输入
        this.elements.messageInput.addEventListener('input', (e) => {
            this.updateCharCount();
            this.debounceTypingIndicator();
        });

        this.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 发送消息按钮
        this.elements.sendMessageBtn.addEventListener('click', () => this.sendMessage());

        // 结束对话按钮
        this.elements.endChatBtn.addEventListener('click', () => this.endChat());
    }

    // ===== 3. 情绪选择逻辑 =====
    selectEmotion(flower) {
        const emotion = flower.dataset.emotion;
        const color = flower.dataset.color;

        // 取消之前的选择
        this.elements.emotionFlowers.forEach(f => {
            f.classList.remove('selected');
            f.style.setProperty('--emotion-color', f.dataset.color);
        });

        // 设置新选择
        flower.classList.add('selected');
        this.state.selectedEmotion = emotion;

        // 启用开始匹配按钮
        this.elements.startMatchBtn.disabled = false;
        this.elements.startMatchBtn.innerHTML = `
            <span class="btn-icon">🌊</span>
            <span class="btn-text">面朝大海，开始匹配「${emotion}」</span>
        `;

        // 显示情绪
        if (this.elements.selectedEmotionDisplay) {
            this.elements.selectedEmotionDisplay.textContent = emotion;
            this.elements.selectedEmotionDisplay.style.color = color;
        }

        // 触发少量花瓣效果
        this.createPetals(8, emotion);

        console.log(`选择了情绪: ${emotion}`);
    }

    // ===== 4. 匹配逻辑 =====
    async startMatching() {
        if (!this.state.selectedEmotion) {
            this.showToast('请先选择一种情绪', 'warning');
            return;
        }

        // 切换到匹配场景
        this.switchScene('matching');
        
        // 显示匹配中的情绪
        if (this.elements.selectedEmotionDisplay) {
            this.elements.selectedEmotionDisplay.textContent = this.state.selectedEmotion;
        }

        // 加入匹配队列
        try {
            const userId = this.generateUserId();
            this.state.userId = userId;

            // 这里需要连接Supabase的match_queue表
            // const { data, error } = await supabase
            //     .from('match_queue')
            //     .insert({
            //         user_id: userId,
            //         emotion_tag: this.state.selectedEmotion,
            //         emotion_text: this.state.selectedEmotion,
            //         created_at: new Date().toISOString()
            //     });

            // if (error) throw error;

            this.showToast('已加入匹配队列，正在寻找相似的感受...', 'info');

            // 模拟匹配过程（实际应该用WebSocket监听匹配结果）
            this.simulateMatching();

        } catch (error) {
            console.error('加入匹配队列失败:', error);
            this.showToast('匹配失败，请稍后重试', 'error');
            this.switchScene('emotion');
        }
    }

    simulateMatching() {
        // 模拟匹配等待
        setTimeout(() => {
            // 匹配成功
            this.matchSuccess();
        }, 3000 + Math.random() * 7000); // 3-10秒随机
    }

    matchSuccess() {
        // 生成模拟的匹配信息
        this.state.matchId = this.generateSessionId();
        this.state.partnerId = 'partner_' + Math.random().toString(36).substr(2, 9);
        this.state.sessionId = this.state.matchId;

        // 更新显示
        if (this.elements.matchedEmotionDisplay) {
            this.elements.matchedEmotionDisplay.textContent = this.state.selectedEmotion;
        }

        // 大量花瓣庆祝
        this.createPetals(50, this.state.selectedEmotion);

        // 切换到聊天场景
        this.switchScene('chat');
        
        // 开始计时器
        this.startTimer();

        // 添加欢迎消息
        this.addSystemMessage('海浪带来了相似的感受，对话已开始。请保持尊重与善意。');
        
        // 模拟对方问候
        setTimeout(() => {
            this.addMessage({
                sender: 'remote',
                content: this.getGreetingByEmotion(this.state.selectedEmotion),
                timestamp: new Date()
            });
        }, 1000);

        this.showToast('匹配成功！开始匿名倾诉吧～', 'success');
    }

    cancelMatching() {
        // 离开匹配队列（实际需要调用Supabase API）
        // await supabase.from('match_queue').delete().eq('user_id', this.state.userId);
        
        this.switchScene('emotion');
        this.showToast('已取消匹配', 'info');
    }

    // ===== 5. 聊天逻辑 =====
    async sendMessage() {
        const input = this.elements.messageInput;
        const content = input.value.trim();

        if (!content) {
            this.showToast('消息不能为空', 'warning');
            return;
        }

        if (content.length > 500) {
            this.showToast('消息过长，请精简内容', 'warning');
            return;
        }

        // 安全检查
        if (!this.checkContentSafety(content)) {
            this.showToast('消息包含不合适的内容，请修改后发送', 'error');
            return;
        }

        // 清空输入框
        input.value = '';
        this.updateCharCount();

        // 添加自己的消息到界面
        const message = {
            sender: 'self',
            content: content,
            timestamp: new Date(),
            messageId: 'msg_' + Date.now()
        };

        this.addMessage(message);
        this.state.messages.push(message);

        // 发送到服务器（实际需要WebSocket或Supabase）
        // await this.sendMessageToServer(message);

        // 模拟对方回复（实际应该通过WebSocket接收）
        this.simulatePartnerReply(content);
    }

    simulatePartnerReply(myContent) {
        // 模拟对方正在输入
        this.showTypingIndicator(true);

        setTimeout(() => {
            this.showTypingIndicator(false);
            
            const reply = this.generateReply(myContent, this.state.selectedEmotion);
            this.addMessage({
                sender: 'remote',
                content: reply,
                timestamp: new Date(),
                messageId: 'partner_' + Date.now()
            });
        }, 1000 + Math.random() * 3000);
    }

    addMessage(message) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.sender}`;
        
        const timeStr = message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        messageEl.innerHTML = `
            <div class="message-bubble ${message.sender}">
                <div class="message-content">${this.escapeHtml(message.content)}</div>
                <div class="message-time">${timeStr}</div>
            </div>
        `;

        this.elements.chatMessages.appendChild(messageEl);
        
        // 滚动到底部
        this.scrollToBottom();
        
        // 收到对方消息时触发少量花瓣
        if (message.sender === 'remote') {
            this.createPetals(3, this.state.selectedEmotion);
        }
    }

    addSystemMessage(text) {
        const messageEl = document.createElement('div');
        messageEl.className = 'system-message';
        messageEl.innerHTML = `
            <div class="message-bubble system">
                <p>${this.escapeHtml(text)}</p>
            </div>
        `;
        this.elements.chatMessages.appendChild(messageEl);
        this.scrollToBottom();
    }

    // ===== 6. 定时器管理 =====
    startTimer() {
        // 清除已有定时器
        if (this.state.timerInterval) {
            clearInterval(this.state.timerInterval);
        }

        this.state.timeLeft = 30 * 60; // 30分钟
        this.updateTimerDisplay();

        this.state.timerInterval = setInterval(() => {
            this.state.timeLeft--;
            this.updateTimerDisplay();

            // 最后5分钟警告
            if (this.state.timeLeft === 5 * 60) {
                this.showToast('对话将在5分钟后结束', 'warning');
                this.addSystemMessage('温馨提示：对话将在5分钟后自动结束。');
            }

            // 时间结束
            if (this.state.timeLeft <= 0) {
                this.endChat('timeout');
                clearInterval(this.state.timerInterval);
            }
        }, 1000);
    }

    updateTimerDisplay() {
        if (!this.elements.countdown) return;

        const minutes = Math.floor(this.state.timeLeft / 60);
        const seconds = this.state.timeLeft % 60;
        this.elements.countdown.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // 颜色变化
        if (this.state.timeLeft < 300) { // 最后5分钟变红色
            this.elements.countdown.style.color = '#f44336';
        } else if (this.state.timeLeft < 600) { // 最后10分钟变橙色
            this.elements.countdown.style.color = '#FF9800';
        }
    }

    // ===== 7. 场景管理 =====
    switchScene(sceneName) {
        // 隐藏所有场景
        Object.values(this.elements.scenes).forEach(scene => {
            if (scene) scene.classList.remove('active');
        });

        // 显示目标场景
        if (this.elements.scenes[sceneName]) {
            this.elements.scenes[sceneName].classList.add('active');
            this.state.currentScene = sceneName;
        }

        // 场景特定初始化
        if (sceneName === 'chat') {
            setTimeout(() => this.scrollToBottom(), 100);
        }
    }

    endChat(reason = 'manual') {
        // 清除定时器
        if (this.state.timerInterval) {
            clearInterval(this.state.timerInterval);
            this.state.timerInterval = null;
        }

        // 显示结束消息
        let endMessage = '对话已结束。';
        if (reason === 'timeout') {
            endMessage = '30分钟时间到，对话已自动结束。';
        } else if (reason === 'partner_left') {
            endMessage = '对方已离开，对话结束。';
        }

        this.addSystemMessage(endMessage);
        this.showToast(endMessage, 'info');

        // 10秒后返回情绪选择
        setTimeout(() => {
            this.resetChat();
            this.switchScene('emotion');
        }, 10000);
    }

    resetChat() {
        // 清空聊天记录
        if (this.elements.chatMessages) {
            this.elements.chatMessages.innerHTML = '';
        }

        // 清空输入
        if (this.elements.messageInput) {
            this.elements.messageInput.value = '';
            this.updateCharCount();
        }

        // 重置状态
        this.state.messages = [];
        this.state.sessionId = null;
        this.state.partnerId = null;
        this.state.matchId = null;
        this.state.timeLeft = 30 * 60;
    }

    // ===== 8. 花瓣系统 =====
    initPetalSystem() {
        // 花瓣容器
        let container = document.getElementById('petal-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'petal-container';
            container.setAttribute('aria-hidden', 'true');
            document.body.appendChild(container);
        }
        this.petalContainer = container;
    }

    createPetals(count = 20, emotion = null) {
        // 情绪颜色映射
        const emotionColors = {
            '开心': { hue: 50, saturation: 80 },   // 黄色
            '烦躁': { hue: 20, saturation: 85 },   // 橙色
            '低落': { hue: 210, saturation: 60 },  // 蓝色
            '快乐': { hue: 340, saturation: 85 },  // 粉色
            '焦虑': { hue: 35, saturation: 90 },   // 琥珀色
            '纠结': { hue: 260, saturation: 70 },  // 紫色
            '受伤': { hue: 355, saturation: 70 },  // 暗粉
            '不安': { hue: 200, saturation: 80 },  // 亮蓝
            '懵了': { hue: 0, saturation: 0 }      // 灰色
        };

        // 清理过多花瓣（性能优化）
        if (this.petalContainer.children.length > 80) {
            const excess = this.petalContainer.children.length - 60;
            for (let i = 0; i < excess; i++) {
                if (this.petalContainer.firstChild) {
                    this.petalContainer.removeChild(this.petalContainer.firstChild);
                }
            }
        }

        for (let i = 0; i < count; i++) {
            const petal = document.createElement('div');
            petal.className = 'petal';

            // 设置颜色
            let hue, saturation, lightness;
            if (emotion && emotionColors[emotion]) {
                const color = emotionColors[emotion];
                hue = emotion === '懵了' ? 0 : color.hue + (Math.random() * 20 - 10);
                saturation = color.saturation;
                lightness = 60 + Math.random() * 20;
            } else {
                hue = Math.random() * 360;
                saturation = 60 + Math.random() * 30;
                lightness = 60 + Math.random() * 20;
            }

            petal.style.background = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

            // 随机位置和大小
            petal.style.left = Math.random() * 100 + 'vw';
            petal.style.width = (10 + Math.random() * 15) + 'px';
            petal.style.height = petal.style.width;

            // 随机动画参数
            const duration = 5 + Math.random() * 10;
            const delay = Math.random() * 3;
            const drift = (Math.random() - 0.5) * 100;

            petal.style.animation = `petalFall ${duration}s linear ${delay}s forwards`;
            petal.style.setProperty('--drift', `${drift}px`);

            this.petalContainer.appendChild(petal);

            // 动画结束后移除
            setTimeout(() => {
                if (petal.parentNode === this.petalContainer) {
                    this.petalContainer.removeChild(petal);
                }
            }, (duration + delay) * 1000);
        }
    }

    // ===== 9. 工具函数 =====
    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    updateCharCount() {
        if (!this.elements.messageInput || !this.elements.charCount) return;
        const length = this.elements.messageInput.value.length;
        this.elements.charCount.textContent = `${length}/500`;
        
        // 颜色提示
        if (length > 450) {
            this.elements.charCount.style.color = '#f44336';
        } else if (length > 300) {
            this.elements.charCount.style.color = '#FF9800';
        } else {
            this.elements.charCount.style.color = '';
        }
    }

    scrollToBottom() {
        if (this.elements.chatMessages) {
            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        }
    }

    showTypingIndicator(show) {
        // 实现打字指示器
        // 可以添加一个显示"对方正在输入..."的UI元素
        this.state.partnerTyping = show;
    }

    debounceTypingIndicator() {
        // 防抖处理打字指示器
        // 实际应该发送WebSocket事件告诉对方我正在输入
    }

    checkContentSafety(content) {
        // 简单的敏感词过滤（实际应该在后端进行更严格的检查）
        const bannedWords = [
            '手机号', '电话', '微信', 'QQ', '二维码', '加我',
            '地址', '住址', '身份证', '银行卡', '密码'
        ];
        
        for (const word of bannedWords) {
            if (content.includes(word)) {
                return false;
            }
        }
        
        return true;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getGreetingByEmotion(emotion) {
        const greetings = {
            '开心': '看到你开心，我也感到愉快！今天有什么好事情分享吗？',
            '烦躁': '烦躁的时候确实很难受，我在这里听着呢，想说说发生了什么吗？',
            '低落': '低落的时候就像海上的阴天，但太阳总会再出来的。愿意和我说说吗？',
            '快乐': '快乐是会传染的！我也被你感染了，有什么特别开心的事吗？',
            '焦虑': '焦虑就像海浪一样来来去去，我懂这种感觉。想聊聊是什么让你焦虑吗？',
            '纠结': '纠结的时候确实很难做决定，有时候说出来会清晰一些。',
            '受伤': '受伤的感觉一定很痛，我在这里陪着你。',
            '不安': '不安的时候就像站在摇晃的船上，抓住栏杆慢慢会稳住的。',
            '懵了': '懵了的时候确实需要时间理清，不急，我们慢慢来。'
        };
        
        return greetings[emotion] || '你好，很高兴能和你倾诉。';
    }

    generateReply(myContent, emotion) {
        // 简单的回复生成（实际应该更智能）
        const replies = {
            '开心': [
                '真为你高兴！',
                '这种开心的感觉真棒！',
                '谢谢你的分享，让我也感受到了快乐。'
            ],
            '烦躁': [
                '我理解这种烦躁的感觉。',
                '深呼吸，慢慢来。',
                '有时候说出来会好受一些。'
            ],
            '低落': [
                '低落的时候确实不容易。',
                '我在这里陪着你。',
                '谢谢你愿意分享这些。'
            ]
        };
        
        const emotionReplies = replies[emotion] || [
            '我明白了。',
            '谢谢你的分享。',
            '继续说吧，我在听。'
        ];
        
        return emotionReplies[Math.floor(Math.random() * emotionReplies.length)];
    }

    showToast(message, type = 'info') {
        // 简单的toast提示
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#f44336' : type === 'warning' ? '#FF9800' : type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        // 3秒后移除
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // ===== 10. Supabase 初始化 =====
    initSupabase() {
        // 这里需要你的Supabase配置
        // this.supabase = createClient(supabaseUrl, supabaseKey);
        
        // 暂时注释，等待你的配置
        console.log('Supabase初始化（需要配置URL和Key）');
    }

    async sendMessageToServer(message) {
        // 实际的消息发送逻辑
        // const { data, error } = await this.supabase
        //     .from('messages')
        //     .insert({
        //         session_id: this.state.sessionId,
        //         sender_id: this.state.userId,
        //         content: message.content,
        //         created_at: new Date().toISOString()
        //     });
        
        // if (error) {
        //     console.error('消息发送失败:', error);
        //     this.showToast('消息发送失败', 'error');
        //     return false;
        // }
        
        return true;
    }
}

// ===== 11. CSS动画补充 =====
function addPetalsAnimationStyles() {
    if (!document.querySelector('#petal-animation-styles')) {
        const style = document.createElement('style');
        style.id = 'petal-animation-styles';
        style.textContent = `
            @keyframes petalFall {
                0% {
                    transform: translateY(0) translateX(0) rotate(0deg);
                    opacity: 0.9;
                }
                100% {
                    transform: translateY(calc(100vh + 30px)) translateX(var(--drift, 0)) rotate(360deg);
                    opacity: 0;
                }
            }
            
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            
            .toast {
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                font-size: 0.95rem;
            }
        `;
        document.head.appendChild(style);
    }
}

// ===== 12. 应用启动 =====
document.addEventListener('DOMContentLoaded', () => {
    // 添加花瓣动画样式
    addPetalsAnimationStyles();
    
    // 创建应用实例
    window.app = new SpringBlossomApp();
    
    // 添加键盘快捷键
    document.addEventListener('keydown', (e) => {
        // ESC键返回情绪选择
        if (e.key === 'Escape' && window.app.state.currentScene !== 'emotion') {
            if (window.app.state.currentScene === 'chat') {
                if (confirm('确定要结束对话并返回吗？')) {
                    window.app.endChat('manual');
                }
            } else {
                window.app.switchScene('emotion');
            }
        }
    });
    
    console.log('春暖花开应用已启动，祝您倾诉愉快 🌸');
});
