// ===== 春暖花开 - 完整前端应用逻辑 =====
// 版本: 1.0.0
// 最后更新: 2026-01-28

// 应用主类
class SpringBlossomApp {
    constructor() {
        // 应用状态
        this.state = {
            userId: this.generateUserId(),
            currentScene: 'emotion',
            selectedEmotion: null,
            sessionId: null,
            partnerId: null,
            messages: [],
            timeLeft: 1800, // 30分钟，单位秒
            timerInterval: null,
            isConnected: false,
            supabase: null,
            matchChannel: null,
            chatChannel: null,
            isMatching: false
        };
        
        // DOM 元素引用
        this.elements = {};
        
        // 花瓣容器
        this.petalContainer = null;
        
        // 初始化
        this.init();
    }
    
    // ===== 初始化方法 =====
    async init() {
        console.log('🌸 春暖花开应用初始化...');
        
        // 1. 初始化DOM引用
        this.initDOM();
        
        // 2. 初始化事件监听
        this.initEventListeners();
        
        // 3. 初始化花瓣系统
        this.initPetalSystem();
        
        // 4. 初始化Supabase（异步）
        await this.initSupabase();
        
        // 5. 设置初始场景
        this.switchScene('emotion');
        
        console.log('✅ 应用初始化完成，用户ID:', this.state.userId);
    }
    
    // ===== 1. DOM初始化 =====
    initDOM() {
        // 场景容器
        this.elements.scenes = {
            emotion: document.getElementById('sceneEmotion'),
            matching: document.getElementById('sceneMatching'),
            chat: document.getElementById('sceneChat')
        };
        
        // 情绪选择
        this.elements.emotionFlowers = document.querySelectorAll('.emotion-flower');
        this.elements.startMatchBtn = document.getElementById('btnStartMatch');
        this.elements.selectedEmotionDisplay = document.getElementById('currentEmotion');
        this.elements.matchedEmotionDisplay = document.getElementById('matchedEmotion');
        
        // 匹配场景
        this.elements.cancelMatchBtn = document.getElementById('btnCancelMatch');
        
        // 聊天场景
        this.elements.endChatBtn = document.getElementById('btnEndChat');
        this.elements.messageInput = document.getElementById('inputMessage');
        this.elements.sendMessageBtn = document.getElementById('btnSendMessage');
        this.elements.chatMessages = document.getElementById('chatMessages');
        this.elements.charCount = document.getElementById('charCount');
        this.elements.timerDisplay = document.getElementById('timerDisplay');
        
        // 初始化字符计数
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
        
        // 结束聊天按钮
        this.elements.endChatBtn.addEventListener('click', () => this.endChat());
        
        // 消息输入事件
        this.elements.messageInput.addEventListener('input', () => {
            this.updateCharCount();
            this.elements.sendMessageBtn.disabled = !this.elements.messageInput.value.trim();
        });
        
        this.elements.messageInput.addEventListener('keydown', (e) => {
            // Enter发送，Shift+Enter换行
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
            
            // 自动调整高度
            this.autoResizeTextarea(e.target);
        });
        
        // 发送消息按钮
        this.elements.sendMessageBtn.addEventListener('click', () => this.sendMessage());
        
        // 页面可见性变化（标签页切换时暂停/恢复）
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('页面隐藏，暂停部分功能');
            } else {
                console.log('页面恢复');
            }
        });
    }
    
    // ===== 3. 花瓣系统 =====
    initPetalSystem() {
        this.petalContainer = document.getElementById('petal-container');
        if (!this.petalContainer) {
            this.petalContainer = document.createElement('div');
            this.petalContainer.id = 'petal-container';
            document.body.appendChild(this.petalContainer);
        }
        
        // 添加花瓣动画样式
        this.addPetalStyles();
    }
    
    addPetalStyles() {
        if (!document.querySelector('#petal-styles')) {
            const style = document.createElement('style');
            style.id = 'petal-styles';
            style.textContent = `
                .petal {
                    position: absolute;
                    top: -30px;
                    width: 22px;
                    height: 22px;
                    opacity: 0.8;
                    filter: blur(0.8px);
                    border-radius: 50% 0 50% 50%;
                    animation: petalFall linear forwards;
                    pointer-events: none;
                    z-index: 9999;
                }
                
                @keyframes petalFall {
                    to {
                        transform: 
                            translateY(calc(100vh + 30px)) 
                            translateX(var(--drift, 0))
                            rotate(360deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // ===== 4. Supabase初始化 =====
    async initSupabase() {
        try {
            // 检查Supabase是否已加载
            if (typeof window.supabase === 'undefined') {
                console.warn('Supabase库未加载，使用模拟模式');
                return;
            }
            
            // MemFire配置（你的实际配置）
            const supabaseUrl = 'https://d5rcrqgg9lhuch72ffh0.baseapi.memfiredb.com';
            const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImQ1cmNycWdnOWxodWNoNzJmZmgwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg0NzU4NTEsImV4cCI6MjA1NDA1MTg1MX0.UO3j1kZL8vOQQ6ZNBQz0QmTewrcyf67RmWZ7nQb6L0M';
            
            // 创建客户端
            this.state.supabase = window.supabase.createClient(supabaseUrl, supabaseKey, {
                auth: { persistSession: false },
                realtime: {
                    params: { eventsPerSecond: 10 }
                }
            });
            
            console.log('✅ Supabase客户端初始化成功');
            
            // 测试连接
            await this.testSupabaseConnection();
            
        } catch (error) {
            console.error('❌ Supabase初始化失败:', error);
            this.showToast('数据库连接初始化失败，部分功能受限', 'warning');
        }
    }
    
    async testSupabaseConnection() {
        if (!this.state.supabase) return;
        
        try {
            const { data, error } = await this.state.supabase
                .from('match_queue')
                .select('count')
                .limit(1);
                
            if (error) throw error;
            console.log('✅ MemFire连接测试成功');
        } catch (error) {
            console.error('❌ MemFire连接测试失败:', error.message);
        }
    }
    
    // ===== 5. 情绪选择逻辑 =====
    selectEmotion(flower) {
        const emotion = flower.dataset.emotion;
        
        // 取消之前的选择
        this.elements.emotionFlowers.forEach(f => {
            f.classList.remove('selected');
        });
        
        // 设置新选择
        flower.classList.add('selected');
        this.state.selectedEmotion = emotion;
        
        // 更新显示
        if (this.elements.selectedEmotionDisplay) {
            this.elements.selectedEmotionDisplay.textContent = emotion;
            this.elements.selectedEmotionDisplay.style.color = this.getEmotionColor(emotion);
        }
        
        // 启用开始匹配按钮
        this.elements.startMatchBtn.disabled = false;
        this.elements.startMatchBtn.innerHTML = `
            <span class="btn-icon">🌊</span>
            <span class="btn-text">开始匹配「${emotion}」</span>
        `;
        
        // 触发少量花瓣效果
        this.createPetals(8, emotion);
        
        console.log(`选择了情绪: ${emotion}`);
    }
    
    // ===== 6. 匹配系统 =====
    async startMatching() {
        if (!this.state.selectedEmotion) {
            this.showToast('请先选择一种情绪', 'warning');
            return;
        }
        
        if (this.state.isMatching) {
            return;
        }
        
        this.state.isMatching = true;
        
        // 切换到匹配场景
        this.switchScene('matching');
        
        // 显示当前选择的情绪
        if (this.elements.selectedEmotionDisplay) {
            this.elements.selectedEmotionDisplay.textContent = this.state.selectedEmotion;
        }
        
        try {
            // 尝试使用Supabase匹配
            if (this.state.supabase) {
                await this.startRealMatching();
            } else {
                // 模拟匹配
                await this.startSimulatedMatching();
            }
            
        } catch (error) {
            console.error('匹配过程出错:', error);
            this.showToast('匹配过程出现错误', 'error');
            this.cancelMatching();
        }
    }
    
    async startRealMatching() {
        console.log('开始真实匹配...');
        
        try {
            // 1. 清理过期队列
            await this.state.supabase
                .from('match_queue')
                .delete()
                .lt('created_at', new Date(Date.now() - 5 * 60000).toISOString());
            
            // 2. 查找匹配
            const { data: matches, error } = await this.state.supabase
                .from('match_queue')
                .select('*')
                .eq('emotion_tag', this.state.selectedEmotion)
                .neq('user_id', this.state.userId)
                .order('created_at', { ascending: true })
                .limit(1);
            
            if (error) throw error;
            
            if (matches && matches.length > 0) {
                // 找到匹配
                const matchedUser = matches[0];
                await this.onMatchFound(matchedUser.user_id);
            } else {
                // 加入队列等待
                await this.joinMatchQueue();
            }
            
        } catch (error) {
            console.error('真实匹配失败:', error);
            // 回退到模拟匹配
            await this.startSimulatedMatching();
        }
    }
    
    async joinMatchQueue() {
        const { error } = await this.state.supabase
            .from('match_queue')
            .insert({
                user_id: this.state.userId,
                emotion_tag: this.state.selectedEmotion,
                emotion_text: this.state.selectedEmotion,
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 5 * 60000).toISOString()
            });
        
        if (error) throw error;
        
        this.showToast('已加入匹配队列，等待中...', 'info');
        
        // 设置匹配监听
        this.setupMatchListener();
    }
    
    setupMatchListener() {
        if (!this.state.supabase) return;
        
        // 监听自己的匹配状态变化
        this.state.matchChannel = this.state.supabase
            .channel('match-updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'match_queue',
                    filter: `user_id=eq.${this.state.userId}`
                },
                (payload) => {
                    if (payload.new.matched_with) {
                        this.onMatchFound(payload.new.matched_with);
                    }
                }
            )
            .subscribe();
    }
    
    async startSimulatedMatching() {
        console.log('开始模拟匹配...');
        this.showToast('已开始匹配，正在寻找相似的感受...', 'info');
        
        // 模拟匹配延迟（3-8秒）
        const delay = 3000 + Math.random() * 5000;
        
        setTimeout(() => {
            if (this.state.isMatching) {
                this.onMatchFound(`simulated_partner_${Date.now()}`);
            }
        }, delay);
    }
    
    async onMatchFound(partnerId) {
        console.log('匹配成功! 伙伴ID:', partnerId);
        
        // 生成会话ID
        this.state.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.state.partnerId = partnerId;
        
        // 更新显示
        if (this.elements.matchedEmotionDisplay) {
            this.elements.matchedEmotionDisplay.textContent = this.state.selectedEmotion;
            this.elements.matchedEmotionDisplay.style.color = this.getEmotionColor(this.state.selectedEmotion);
        }
        
        // 大量花瓣庆祝
        this.createPetals(50, this.state.selectedEmotion);
        
        // 切换到聊天场景
        this.switchScene('chat');
        
        // 开始计时器
        this.startTimer();
        
        // 设置实时聊天
        this.setupRealtimeChat();
        
        // 添加欢迎消息
        this.addSystemMessage('海浪带来了相似的感受，对话已开始。请保持尊重与善意。');
        
        // 模拟对方问候（如果使用模拟模式）
        if (partnerId.startsWith('simulated_')) {
            setTimeout(() => {
                const greeting = this.getGreetingByEmotion(this.state.selectedEmotion);
                this.addMessage('remote', greeting);
            }, 1000);
        }
        
        this.showToast('匹配成功！开始匿名倾诉吧～', 'success');
        this.state.isMatching = false;
    }
    
    cancelMatching() {
        this.state.isMatching = false;
        
        // 清理匹配监听
        if (this.state.matchChannel) {
            this.state.supabase.removeChannel(this.state.matchChannel);
            this.state.matchChannel = null;
        }
        
        // 从队列中删除自己
        if (this.state.supabase) {
            this.state.supabase
                .from('match_queue')
                .delete()
                .eq('user_id', this.state.userId)
                .then(() => {
                    console.log('已从匹配队列中移除');
                });
        }
        
        this.switchScene('emotion');
        this.showToast('已取消匹配', 'info');
    }
    
    // ===== 7. 聊天系统 =====
    async sendMessage() {
        const input = this.elements.messageInput;
        const content = input.value.trim();
        
        if (!content || !this.state.sessionId) {
            return;
        }
        
        if (content.length > 500) {
            this.showToast('消息过长（最多500字）', 'warning');
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
        this.elements.sendMessageBtn.disabled = true;
        
        // 创建消息对象
        const message = {
            sender: 'self',
            content: content,
            timestamp: new Date(),
            messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
        };
        
        // 添加到界面
        this.addMessage('self', content);
        this.state.messages.push(message);
        
        // 发送到服务器
        await this.sendMessageToServer(message);
        
        // 自动调整输入框高度
        this.autoResizeTextarea(input);
    }
    
    async sendMessageToServer(message) {
        if (!this.state.supabase || !this.state.sessionId) {
            console.log('使用模拟消息发送');
            return;
        }
        
        try {
            // 保存到数据库
            const { error: saveError } = await this.state.supabase
                .from('messages')
                .insert({
                    message_id: message.messageId,
                    session_id: this.state.sessionId,
                    sender_id: this.state.userId,
                    content: message.content,
                    created_at: message.timestamp.toISOString()
                });
            
            if (saveError) throw saveError;
            
            // 通过实时频道广播
            if (this.state.chatChannel) {
                await this.state.chatChannel.send({
                    type: 'broadcast',
                    event: 'new_message',
                    payload: {
                        senderId: this.state.userId,
                        content: message.content,
                        timestamp: message.timestamp.toISOString()
                    }
                });
            }
            
        } catch (error) {
            console.error('消息发送失败:', error);
            // 不影响用户体验，只是后台记录失败
        }
    }
    
    setupRealtimeChat() {
        if (!this.state.supabase || !this.state.sessionId) {
            return;
        }
        
        // 创建聊天频道
        this.state.chatChannel = this.state.supabase.channel(`session:${this.state.sessionId}`, {
            config: {
                broadcast: { self: false }
            }
        });
        
        // 监听新消息
        this.state.chatChannel
            .on('broadcast', { event: 'new_message' }, (payload) => {
                if (payload.payload.senderId !== this.state.userId) {
                    this.addMessage('remote', payload.payload.content);
                    
                    // 收到消息时触发少量花瓣
                    this.createPetals(3, this.state.selectedEmotion);
                }
            })
            .subscribe();
        
        console.log('✅ 实时聊天频道已建立');
    }
    
    addMessage(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-bubble ${type}`;
        
        const timeStr = new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageDiv.innerHTML = `
            <div class="message-content">${this.escapeHtml(content)}</div>
            <div class="message-time">${timeStr}</div>
        `;
        
        this.elements.chatMessages.appendChild(messageDiv);
        
        // 滚动到底部
        this.scrollToBottom();
    }
    
    addSystemMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-bubble system';
        messageDiv.innerHTML = `<p>${this.escapeHtml(text)}</p>`;
        this.elements.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    // ===== 8. 定时器管理 =====
    startTimer() {
        // 清除已有定时器
        if (this.state.timerInterval) {
            clearInterval(this.state.timerInterval);
        }
        
        this.state.timeLeft = 1800; // 30分钟
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
        if (!this.elements.timerDisplay) return;
        
        const minutes = Math.floor(this.state.timeLeft / 60);
        const seconds = this.state.timeLeft % 60;
        this.elements.timerDisplay.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // 颜色变化
        if (this.state.timeLeft < 300) { // 最后5分钟变红色
            this.elements.timerDisplay.style.color = '#f44336';
        } else if (this.state.timeLeft < 600) { // 最后10分钟变橙色
            this.elements.timerDisplay.style.color = '#FF9800';
        }
    }
    
    // ===== 9. 场景管理 =====
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
            this.elements.messageInput.focus();
        }
        
        console.log(`切换到场景: ${sceneName}`);
    }
    
    endChat(reason = 'manual') {
        // 清除定时器
        if (this.state.timerInterval) {
            clearInterval(this.state.timerInterval);
            this.state.timerInterval = null;
        }
        
        // 清理实时频道
        if (this.state.chatChannel) {
            this.state.supabase.removeChannel(this.state.chatChannel);
            this.state.chatChannel = null;
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
        this.state.timeLeft = 1800;
        this.elements.sendMessageBtn.disabled = true;
    }
    
    // ===== 10. 花瓣效果 =====
    createPetals(count = 20, emotion = null) {
        if (!this.petalContainer) return;
        
        // 清理过多花瓣（性能优化）
        if (this.petalContainer.children.length > 80) {
            const excess = this.petalContainer.children.length - 60;
            for (let i = 0; i < excess; i++) {
                if (this.petalContainer.firstChild) {
                    this.petalContainer.removeChild(this.petalContainer.firstChild);
                }
            }
        }
        
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
                hue = Math.random() * 60 + 300; // 偏粉紫色调
                saturation = 60 + Math.random() * 30;
                lightness = 60 + Math.random() * 20;
            }
            
            petal.style.background = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            
            // 随机位置和大小
            petal.style.left = Math.random() * 100 + 'vw';
            const size = 15 + Math.random() * 15;
            petal.style.width = size + 'px';
            petal.style.height = size + 'px';
            
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
    
    // ===== 11. 工具函数 =====
    generateUserId() {
        return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    getEmotionColor(emotion) {
        const colors = {
            '开心': '#FFD93D',
            '烦躁': '#FF8E6B',
            '低落': '#6C9BCF',
            '快乐': '#FF6B8B',
            '焦虑': '#FFA726',
            '纠结': '#A29BFE',
            '受伤': '#E66767',
            '不安': '#74B9FF',
            '懵了': '#B2BEC3'
        };
        return colors[emotion] || '#4776E6';
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
    
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }
    
    scrollToBottom() {
        if (this.elements.chatMessages) {
            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        }
    }
    
    checkContentSafety(content) {
        // 简单的敏感词过滤（实际应该在后端进行更严格的检查）
        const bannedWords = [
            '手机号', '电话', '微信', 'QQ', '二维码', '加我',
            '地址', '住址', '身份证', '银行卡', '密码',
            '约炮', '约吗', '裸聊', '色情'
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
    
    showToast(message, type = 'info') {
        // 创建toast元素
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // 样式
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#f44336' : 
                        type === 'warning' ? '#FF9800' : 
                        type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideInRight 0.3s ease;
            font-size: 0.95rem;
            max-width: 300px;
            word-break: break-word;
        `;
        
        // 添加动画样式
        if (!document.querySelector('#toast-animation')) {
            const style = document.createElement('style');
            style.id = 'toast-animation';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(toast);
        
        // 3秒后移除
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// ===== 12. 应用启动 =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM已加载，启动春暖花开应用...');
    
    // 创建应用实例
    try {
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
        
        console.log('🎉 春暖花开应用启动成功！');
        
    } catch (error) {
        console.error('应用启动失败:', error);
        alert('应用启动失败，请刷新页面重试。');
    }
});

// ===== 13. 全局辅助函数 =====
if (!window.springBlossomUtils) {
    window.springBlossomUtils = {
        // 生成随机ID
        generateId: (prefix = 'id') => {
            return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        },
        
        // 格式化时间
        formatTime: (seconds) => {
            const min = Math.floor(seconds / 60);
            const sec = seconds % 60;
            return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        },
        
        // 防抖函数
        debounce: (func, wait) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },
        
        // 节流函数
        throttle: (func, limit) => {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }
    };
}
