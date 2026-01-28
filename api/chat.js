// /api/chat.js - 消息处理API
import { createClient } from '@supabase/supabase-js'

// 配置
const supabaseUrl = 'https://d5rcrqgg9lhuch72ffh0.baseapi.memfiredb.com'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImQ1cmNycWdnOWxodWNoNzJmZmgwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg0NzU4NTEsImV4cCI6MjA1NDA1MTg1MX0.UO3j1kZL8vOQQ6ZNBQz0QmTewrcyf67RmWZ7nQb6L0M'

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    // 处理预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }
    
    // POST - 发送消息
    if (req.method === 'POST') {
        try {
            const { sessionId, userId, message, messageId } = req.body
            
            // 验证参数
            if (!sessionId || !userId || !message) {
                return res.status(400).json({
                    error: '参数缺失',
                    message: '需要sessionId、userId和message参数'
                })
            }
            
            console.log(`发送消息: 会话 ${sessionId}, 用户 ${userId}`)
            
            // 1. 验证会话是否有效
            const { data: session, error: sessionError } = await supabase
                .from('chat_sessions')
                .select('*')
                .eq('session_id', sessionId)
                .eq('status', 'active')
                .single()
            
            if (sessionError || !session) {
                return res.status(404).json({
                    error: '会话不存在',
                    message: '聊天会话已结束或不存在'
                })
            }
            
            // 2. 验证用户是否属于此会话
            if (session.user1_id !== userId && session.user2_id !== userId) {
                return res.status(403).json({
                    error: '无权限',
                    message: '您不属于此聊天会话'
                })
            }
            
            // 3. 验证会话是否过期
            const now = new Date()
            const expiresAt = new Date(session.expires_at)
            if (now > expiresAt) {
                // 更新会话状态为过期
                await supabase
                    .from('chat_sessions')
                    .update({ 
                        status: 'expired',
                        ended_at: now.toISOString()
                    })
                    .eq('session_id', sessionId)
                
                return res.status(410).json({
                    error: '会话已过期',
                    message: '聊天会话已超过30分钟，自动结束'
                })
            }
            
            // 4. 保存消息到数据库
            const msgId = messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
            
            const { error: saveError } = await supabase
                .from('messages')
                .insert({
                    message_id: msgId,
                    session_id: sessionId,
                    sender_id: userId,
                    content: message,
                    original_content: message,
                    created_at: new Date().toISOString()
                })
            
            if (saveError) {
                console.error('保存消息时出错:', saveError)
                throw saveError
            }
            
            console.log(`消息已保存: ${msgId}`)
            
            // 5. 通过Supabase实时功能广播消息
            const channel = supabase.channel(`session:${sessionId}`)
            
            try {
                // 获取订阅状态
                const subscription = channel.subscribe()
                
                // 发送广播消息
                await channel.send({
                    type: 'broadcast',
                    event: 'new_message',
                    payload: {
                        messageId: msgId,
                        senderId: userId,
                        content: message,
                        timestamp: new Date().toISOString(),
                        sessionId: sessionId
                    }
                })
                
                console.log(`消息已广播到会话 ${sessionId}`)
                
            } catch (broadcastError) {
                console.warn('广播消息失败:', broadcastError)
                // 广播失败不影响消息保存，继续执行
            }
            
            // 6. 返回成功响应
            return res.status(200).json({
                success: true,
                messageId: msgId,
                timestamp: new Date().toISOString(),
                message: '消息发送成功'
            })
            
        } catch (error) {
            console.error('发送消息时出错:', error)
            
            return res.status(500).json({
                error: '服务器错误',
                message: '消息发送失败，请稍后重试',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            })
        }
    }
    
    // GET - 获取历史消息
    if (req.method === 'GET') {
        try {
            const { sessionId, userId, limit = 50 } = req.query
            
            if (!sessionId || !userId) {
                return res.status(400).json({
                    error: '参数缺失',
                    message: '需要sessionId和userId参数'
                })
            }
            
            console.log(`获取消息: 会话 ${sessionId}, 用户 ${userId}`)
            
            // 1. 验证会话和用户权限
            const { data: session, error: sessionError } = await supabase
                .from('chat_sessions')
                .select('*')
                .eq('session_id', sessionId)
                .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
                .single()
            
            if (sessionError || !session) {
                return res.status(403).json({
                    error: '无权限',
                    message: '您无法访问此会话的消息'
                })
            }
            
            // 2. 获取消息
            const { data: messages, error: messagesError } = await supabase
                .from('messages')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true })
                .limit(parseInt(limit))
            
            if (messagesError) {
                console.error('获取消息时出错:', messagesError)
                throw messagesError
            }
            
            // 3. 格式化消息
            const formattedMessages = (messages || []).map(msg => ({
                messageId: msg.message_id,
                senderId: msg.sender_id,
                content: msg.content,
                timestamp: msg.created_at,
                isSelf: msg.sender_id === userId
            }))
            
            return res.status(200).json({
                success: true,
                sessionId: sessionId,
                messages: formattedMessages,
                total: formattedMessages.length,
                sessionStatus: session.status,
                expiresAt: session.expires_at
            })
            
        } catch (error) {
            console.error('获取消息时出错:', error)
            
            return res.status(500).json({
                error: '服务器错误',
                message: '获取消息失败，请稍后重试'
            })
        }
    }
    
    // 方法不允许
    return res.status(405).json({
        error: '方法不允许',
        message: '只接受GET和POST请求'
    })
}
