// 匹配引擎 - 处理用户匹配和消息路由
import { initializeSupabase } from './supabase-client.js';

// 情绪匹配算法
class MatchEngine {
    constructor(supabase) {
        this.supabase = supabase;
        this.matchQueue = new Map();
        this.activeSessions = new Map();
    }

    // 开始匹配
    async startMatching(userId, emotionId, emotionText) {
        try {
            console.log(`开始匹配: ${userId} - ${emotionText}`);
            
            // 1. 检查是否有等待匹配的用户
            const potentialMatch = await this.findMatch(userId, emotionId);
            
            if (potentialMatch) {
                // 找到匹配，创建会话
                const sessionId = await this.createChatSession(userId, potentialMatch.userId, emotionText);
                return {
                    success: true,
                    sessionId: sessionId,
                    matchedWith: potentialMatch.userId
                };
            } else {
                // 没有匹配，加入等待队列
                await this.joinMatchQueue(userId, emotionId, emotionText);
                return {
                    success: true,
                    sessionId: null,
                    status: 'waiting'
                };
            }
        } catch (error) {
            console.error('匹配错误:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 查找匹配
    async findMatch(currentUserId, emotionId) {
        try {
            // 查询匹配队列
            const { data: waitingUsers, error } = await this.supabase
                .from('match_queue')
                .select('*')
                .neq('user_id', currentUserId)
                .order('created_at', { ascending: true })
                .limit(5);

            if (error) throw error;

            if (!waitingUsers || waitingUsers.length === 0) {
                return null;
            }

            // 简单的匹配算法：相同情绪优先，否则随机
            let bestMatch = null;
            
            // 1. 尝试找相同情绪
            const sameEmotionMatch = waitingUsers.find(user => user.emotion_tag === emotionId);
            if (sameEmotionMatch) {
                bestMatch = sameEmotionMatch;
            } else {
                // 2. 随机选择一个
                bestMatch = waitingUsers[Math.floor(Math.random() * waitingUsers.length)];
            }

            // 从队列中移除匹配的用户
            await this.supabase
                .from('match_queue')
                .delete()
                .eq('user_id', bestMatch.user_id);

            return {
                userId: bestMatch.user_id,
                emotion: bestMatch.emotion_tag
            };
        } catch (error) {
            console.error('查找匹配错误:', error);
            return null;
        }
    }

    // 加入匹配队列
    async joinMatchQueue(userId, emotionId, emotionText) {
        try {
            const { error } = await this.supabase
                .from('match_queue')
                .insert({
                    user_id: userId,
                    emotion_tag: emotionId,
                    emotion_text: emotionText,
                    created_at: new Date().toISOString()
                });

            if (error) throw error;

            console.log(`用户 ${userId} 加入匹配队列`);
            
            // 设置超时（5分钟）
            setTimeout(async () => {
                await this.leaveMatchQueue(userId);
            }, 5 * 60 * 1000);

            return true;
        } catch (error) {
            console.error('加入队列错误:', error);
            return false;
        }
    }

    // 离开匹配队列
    async leaveMatchQueue(userId) {
        try {
            const { error } = await this.supabase
                .from('match_queue')
                .delete()
                .eq('user_id', userId);

            if (error) throw error;
            
            console.log(`用户 ${userId} 离开匹配队列`);
            return true;
        } catch (error) {
            console.error('离开队列错误:', error);
            return false;
        }
    }

    // 取消匹配
    async cancelMatching(userId) {
        try {
            await this.leaveMatchQueue(userId);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 创建聊天会话
    async createChatSession(user1Id, user2Id, emotionText) {
        try {
            const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30分钟后
            
            const { error } = await this.supabase
                .from('chat_sessions')
                .insert({
                    session_id: sessionId,
                    user1_id: user1Id,
                    user2_id: user2Id,
                    emotion_tag: emotionText,
                    status: 'active',
                    created_at: new Date().toISOString(),
                    expires_at: expiresAt.toISOString()
                });

            if (error) throw error;

            console.log(`创建会话: ${sessionId} (${user1Id} ↔ ${user2Id})`);
            
            // 通知双方匹配成功
            await this.notifyMatchSuccess(sessionId, user1Id, user2Id, emotionText);
            
            return sessionId;
        } catch (error) {
            console.error('创建会话错误:', error);
            throw error;
        }
    }

    // 通知匹配成功
    async notifyMatchSuccess(sessionId, user1Id, user2Id, emotionText) {
        try {
            // 这里可以添加推送通知逻辑
            console.log(`匹配成功通知: ${sessionId}`);
            
            // 在实际应用中，可以使用WebSocket或推送服务
            return true;
        } catch (error) {
            console.error('通知错误:', error);
            return false;
        }
    }

    // 发送消息
    async sendMessage(sessionId, senderId, content) {
        try {
            // 1. 内容安全过滤
            const filteredContent = await this.filterContent(content);
            if (!filteredContent.approved) {
                return {
                    success: false,
                    error: '消息包含不当内容',
                    filtered: filteredContent.filtered
                };
            }

            // 2. 保存消息到数据库
            const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            const { error } = await this.supabase
                .from('messages')
                .insert({
                    message_id: messageId,
                    session_id: sessionId,
                    sender_id: senderId,
                    content: filteredContent.filtered,
                    original_content: content,
                    created_at: new Date().toISOString()
                });

            if (error) throw error;

            // 3. 通过广播发送实时消息
            await this.broadcastMessage(sessionId, senderId, filteredContent.filtered);

            console.log(`消息发送: ${sessionId} - ${senderId.substring(0, 8)}...`);
            
            return {
                success: true,
                messageId: messageId,
                filteredContent: filteredContent.filtered
            };
        } catch (error) {
            console.error('发送消息错误:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 内容安全过滤
    async filterContent(content) {
        try {
            // 敏感词列表（简化版，实际应用中应该更完善）
            const sensitiveWords = [
                // 个人信息
                '手机号', '电话号码', '微信', 'wechat', 'qq', '邮箱', '住址',
                // 不当内容
                '攻击', '侮辱', '谩骂', '色情', '赌博', '毒品',
                // 联系方式
                '@', '加我', '联系我', '找我'
            ];

            let filtered = content;
            let hasSensitiveContent = false;

            // 检查敏感词
            sensitiveWords.forEach(word => {
                if (content.includes(word)) {
                    filtered = filtered.replace(new RegExp(word, 'gi'), '***');
                    hasSensitiveContent = true;
                }
            });

            // 检查长度（防止刷屏）
            if (content.length > 500) {
                filtered = filtered.substring(0, 500) + '...';
            }

            return {
                approved: !hasSensitiveContent,
                filtered: filtered,
                hasSensitiveContent: hasSensitiveContent
            };
        } catch (error) {
            console.error('内容过滤错误:', error);
            return {
                approved: false,
                filtered: '消息无法发送',
                error: error.message
            };
        }
    }

    // 广播消息
    async broadcastMessage(sessionId, senderId, content) {
        try {
            const channel = this.supabase.channel(`chat_${sessionId}`);
            
            await channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.send({
                        type: 'broadcast',
                        event: 'new_message',
                        payload: {
                            session_id: sessionId,
                            sender_id: senderId,
                            content: content,
                            timestamp: new Date().toISOString()
                        }
                    });
                }
            });
            
            return true;
        } catch (error) {
            console.error('广播消息错误:', error);
            return false;
        }
    }

    // 结束会话
    async endSession(sessionId) {
        try {
            // 更新会话状态
            const { error } = await this.supabase
                .from('chat_sessions')
                .update({
                    status: 'ended',
                    ended_at: new Date().toISOString()
                })
                .eq('session_id', sessionId);

            if (error) throw error;

            // 清理匹配队列中的相关用户
            const session = await this.getSession(sessionId);
            if (session) {
                await this.leaveMatchQueue(session.user1_id);
                await this.leaveMatchQueue(session.user2_id);
            }

            console.log(`会话结束: ${sessionId}`);
            
            return { success: true };
        } catch (error) {
            console.error('结束会话错误:', error);
            return { success: false, error: error.message };
        }
    }

    // 获取会话信息
    async getSession(sessionId) {
        try {
            const { data, error } = await this.supabase
                .from('chat_sessions')
                .select('*')
                .eq('session_id', sessionId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('获取会话错误:', error);
            return null;
        }
    }

    // 获取会话消息
    async getSessionMessages(sessionId, limit = 50) {
        try {
            const { data, error } = await this.supabase
                .from('messages')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('获取消息错误:', error);
            return [];
        }
    }

    // 清理过期会话
    async cleanupExpiredSessions() {
        try {
            const now = new Date().toISOString();
            
            const { data: expiredSessions, error } = await this.supabase
                .from('chat_sessions')
                .select('session_id')
                .lt('expires_at', now)
                .eq('status', 'active');

            if (error) throw error;

            for (const session of expiredSessions || []) {
                await this.endSession(session.session_id);
            }

            console.log(`清理了 ${expiredSessions?.length || 0} 个过期会话`);
            return { success: true, cleaned: expiredSessions?.length || 0 };
        } catch (error) {
            console.error('清理会话错误:', error);
            return { success: false, error: error.message };
        }
    }
}

// 导出函数
export async function startMatching(supabase, userId, emotionId, emotionText) {
    const engine = new MatchEngine(supabase);
    return await engine.startMatching(userId, emotionId, emotionText);
}

export async function cancelMatching(supabase, userId) {
    const engine = new MatchEngine(supabase);
    return await engine.cancelMatching(userId);
}

export async function sendMessage(supabase, sessionId, senderId, content) {
    const engine = new MatchEngine(supabase);
    return await engine.sendMessage(sessionId, senderId, content);
}

export async function endSession(supabase, sessionId) {
    const engine = new MatchEngine(supabase);
    return await engine.endSession(sessionId);
}

export async function getSessionMessages(supabase, sessionId) {
    const engine = new MatchEngine(supabase);
    return await engine.getSessionMessages(sessionId);
}

export { MatchEngine };
