// /api/match.js - 真实匹配引擎
import { createClient } from '@supabase/supabase-js'

// 配置
const supabaseUrl = 'https://d5rcrqgg9lhuch72ffh0.baseapi.memfiredb.com'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImQ1cmNycWdnOWxodWNoNzJmZmgwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg0NzU4NTEsImV4cCI6MjA1NDA1MTg1MX0.UO3j1kZL8vOQQ6ZNBQz0QmTewrcyf67RmWZ7nQb6L0M'

// 初始化Supabase客户端
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
    
    // 只接受POST请求
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: '方法不允许',
            message: '只接受POST请求'
        })
    }
    
    try {
        const { userId, emotion } = req.body
        
        // 验证参数
        if (!userId || !emotion) {
            return res.status(400).json({
                error: '参数缺失',
                message: '需要userId和emotion参数'
            })
        }
        
        console.log(`匹配请求: 用户 ${userId} 情绪 ${emotion}`)
        
        // 1. 清理过期匹配请求（5分钟以上）
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString()
        await supabase
            .from('match_queue')
            .delete()
            .lt('created_at', fiveMinutesAgo)
        
        // 2. 查找匹配的用户
        const { data: potentialMatches, error: findError } = await supabase
            .from('match_queue')
            .select('*')
            .eq('emotion_tag', emotion)
            .neq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(1)
        
        if (findError) {
            console.error('查找匹配时出错:', findError)
            throw findError
        }
        
        if (potentialMatches && potentialMatches.length > 0) {
            // 找到匹配！创建聊天会话
            const matchedUser = potentialMatches[0]
            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
            
            console.log(`匹配成功: ${userId} ↔ ${matchedUser.user_id}, 会话: ${sessionId}`)
            
            // 3. 创建聊天会话记录
            const sessionExpiresAt = new Date(Date.now() + 30 * 60000).toISOString()
            
            const { error: sessionError } = await supabase
                .from('chat_sessions')
                .insert({
                    session_id: sessionId,
                    user1_id: userId,
                    user2_id: matchedUser.user_id,
                    emotion_tag: emotion,
                    status: 'active',
                    created_at: new Date().toISOString(),
                    expires_at: sessionExpiresAt
                })
            
            if (sessionError) {
                console.error('创建会话时出错:', sessionError)
                throw sessionError
            }
            
            // 4. 从匹配队列中删除两人
            await supabase
                .from('match_queue')
                .delete()
                .in('user_id', [userId, matchedUser.user_id])
            
            // 5. 返回匹配成功响应
            return res.status(200).json({
                success: true,
                matchFound: true,
                sessionId: sessionId,
                partnerId: matchedUser.user_id,
                emotion: emotion,
                expiresAt: sessionExpiresAt,
                message: '匹配成功！已为您找到有相似感受的人。'
            })
            
        } else {
            // 没有找到匹配，加入等待队列
            const expiresAt = new Date(Date.now() + 5 * 60000).toISOString()
            
            const { error: queueError } = await supabase
                .from('match_queue')
                .upsert({
                    user_id: userId,
                    emotion_tag: emotion,
                    emotion_text: emotion,
                    created_at: new Date().toISOString(),
                    expires_at: expiresAt
                }, { 
                    onConflict: 'user_id',
                    ignoreDuplicates: false 
                })
            
            if (queueError) {
                console.error('加入队列时出错:', queueError)
                throw queueError
            }
            
            console.log(`用户 ${userId} 加入匹配队列，情绪: ${emotion}`)
            
            return res.status(200).json({
                success: true,
                matchFound: false,
                userId: userId,
                emotion: emotion,
                expiresAt: expiresAt,
                message: '已加入匹配队列，正在寻找有相似感受的人...'
            })
        }
        
    } catch (error) {
        console.error('匹配API错误:', error)
        
        return res.status(500).json({
            error: '服务器错误',
            message: '匹配过程中出现错误，请稍后重试',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}
