// /api/messages.js - 消息管理API
import { createClient } from '@supabase/supabase-js'

// 配置
const supabaseUrl = 'https://d5rcrqgg9lhuch72ffh0.baseapi.memfiredb.com'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImQ1cmNycWdnOWxodWNoNzJmZmgwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg0NzU4NTEsImV4cCI6MjA1NDA1MTg1MX0.UO3j1kZL8vOQQ6ZNBQz0QmTewrcyf67RmWZ7nQb6L0M'

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    // 处理预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }
    
    // GET - 获取会话统计
    if (req.method === 'GET') {
        try {
            const { sessionId } = req.query
            
            if (!sessionId) {
                return res.status(400).json({
                    error: '参数缺失',
                    message: '需要sessionId参数'
                })
            }
            
            // 1. 获取消息数量
            const { count: messageCount, error: countError } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('session_id', sessionId)
            
            if (countError) {
                console.error('统计消息时出错:', countError)
                throw countError
            }
            
            // 2. 获取会话信息
            const { data: session, error: sessionError } = await supabase
                .from('chat_sessions')
                .select('*')
                .eq('session_id', sessionId)
                .single()
            
            if (sessionError) {
                console.error('获取会话时出错:', sessionError)
                throw sessionError
            }
            
            // 3. 计算剩余时间
            const now = new Date()
            const expiresAt = new Date(session.expires_at)
            const timeLeft = Math.max(0, Math.floor((expiresAt - now) / 1000))
            
            return res.status(200).json({
                success: true,
                sessionId: sessionId,
                messageCount: messageCount || 0,
                sessionStatus: session.status,
                createdAt: session.created_at,
                expiresAt: session.expires_at,
                timeLeft: timeLeft,
                emotion: session.emotion_tag,
                user1: session.user1_id,
                user2: session.user2_id
            })
            
        } catch (error) {
            console.error('获取会话统计时出错:', error)
            
            return res.status(500).json({
                error: '服务器错误',
                message: '获取会话信息失败'
            })
        }
    }
    
    // DELETE - 清理过期数据（管理员功能）
    if (req.method === 'DELETE') {
        try {
            // 简单的API密钥验证（生产环境应使用更安全的验证）
            const apiKey = req.headers['x-api-key']
            if (!apiKey || apiKey !== process.env.CLEANUP_API_KEY) {
                return res.status(401).json({
                    error: '未授权',
                    message: '需要有效的API密钥'
                })
            }
            
            const now = new Date()
            
            // 1. 清理过期会话
            const { data: expiredSessions, error: sessionsError } = await supabase
                .from('chat_sessions')
                .update({ 
                    status: 'expired',
                    ended_at: now.toISOString()
                })
                .lt('expires_at', now.toISOString())
                .eq('status', 'active')
                .select()
            
            if (sessionsError) {
                console.error('清理会话时出错:', sessionsError)
                throw sessionsError
            }
            
            // 2. 清理过期待匹配请求
            const fiveMinutesAgo = new Date(now - 5 * 60000).toISOString()
            const { data: expiredQueue, error: queueError } = await supabase
                .from('match_queue')
                .delete()
                .lt('created_at', fiveMinutesAgo)
                .select()
            
            if (queueError) {
                console.error('清理匹配队列时出错:', queueError)
                throw queueError
            }
            
            // 3. （可选）清理非常旧的消息（30天前）
            const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60000).toISOString()
            const { data: oldMessages, error: messagesError } = await supabase
                .from('messages')
                .delete()
                .lt('created_at', thirtyDaysAgo)
                .select()
            
            if (messagesError) {
                console.error('清理旧消息时出错:', messagesError)
                // 不抛出错误，继续执行
            }
            
            return res.status(200).json({
                success: true,
                cleaned: {
                    sessions: expiredSessions?.length || 0,
                    queue: expiredQueue?.length || 0,
                    messages: oldMessages?.length || 0
                },
                timestamp: now.toISOString(),
                message: '数据清理完成'
            })
            
        } catch (error) {
            console.error('数据清理时出错:', error)
            
            return res.status(500).json({
                error: '服务器错误',
                message: '数据清理失败'
            })
        }
    }
    
    // 方法不允许
    return res.status(405).json({
        error: '方法不允许',
        message: '只接受GET和DELETE请求'
    })
}
