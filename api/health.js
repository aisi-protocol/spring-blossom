// /api/health.js - 健康检查API
import { createClient } from '@supabase/supabase-js'

// 配置
const supabaseUrl = 'https://d5rcrqgg9lhuch72ffh0.baseapi.memfiredb.com'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImQ1cmNycWdnOWxodWNoNzJmZmgwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg0NzU4NTEsImV4cCI6MjA1NDA1MTg1MX0.UO3j1kZL8vOQQ6ZNBQz0QmTewrcyf67RmWZ7nQb6L0M'

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    
    // 处理预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }
    
    // 只接受GET请求
    if (req.method !== 'GET') {
        return res.status(405).json({ 
            error: '方法不允许',
            message: '只接受GET请求'
        })
    }
    
    try {
        const healthChecks = {
            api: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            checks: {}
        }
        
        // 1. 检查数据库连接
        try {
            const startTime = Date.now()
            const { data, error } = await supabase
                .from('match_queue')
                .select('count')
                .limit(1)
            
            healthChecks.checks.database = {
                status: error ? 'unhealthy' : 'healthy',
                latency: Date.now() - startTime,
                message: error ? `连接失败: ${error.message}` : '连接正常'
            }
        } catch (dbError) {
            healthChecks.checks.database = {
                status: 'unhealthy',
                latency: null,
                message: `数据库错误: ${dbError.message}`
            }
        }
        
        // 2. 检查表状态
        try {
            const tables = ['match_queue', 'chat_sessions', 'messages']
            const tableStatus = {}
            
            for (const table of tables) {
                const { count } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true })
                
                tableStatus[table] = {
                    exists: true,
                    count: count || 0
                }
            }
            
            healthChecks.checks.tables = {
                status: 'healthy',
                details: tableStatus
            }
        } catch (tableError) {
            healthChecks.checks.tables = {
                status: 'unhealthy',
                details: null,
                message: `检查表状态失败: ${tableError.message}`
            }
        }
        
        // 3. 计算总体状态
        const allHealthy = Object.values(healthChecks.checks).every(
            check => check.status === 'healthy'
        )
        
        healthChecks.api = allHealthy ? 'healthy' : 'degraded'
        
        // 4. 返回响应
        const statusCode = allHealthy ? 200 : 503
        
        res.status(statusCode).json(healthChecks)
        
    } catch (error) {
        console.error('健康检查失败:', error)
        
        res.status(500).json({
            api: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: '健康检查失败',
            message: error.message
        })
    }
}
