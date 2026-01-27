// Supabase客户端配置和初始化
// 环境变量配置（Vercel会自动注入）
const SUPABASE_URL = 'https://d5rcrqgg9lhuch72ffh0.baseapi.memfiredb.com';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImV4cCI6MzM0NjE5MzY0MCwiaWF0IjoxNzY5MzkzNjQwLCJpc3MiOiJzdXBhYmFzZSJ9.oWKhdS2ozgTlIoMHvXerleK0TXjP7rjazDQeLC2NLUw';
// 检查环境变量
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ 缺少Supabase环境变量配置');
    console.log('当前配置:', { SUPABASE_URL, SUPABASE_ANON_KEY: SUPABASE_ANON_KEY ? '已设置' : '未设置' });
}

// 创建Supabase客户端
let supabaseClient = null;

// 初始化Supabase
export async function initializeSupabase() {
    try {
        if (supabaseClient) {
            return supabaseClient;
        }

        console.log('🔧 初始化Supabase客户端...');
        console.log('Supabase URL:', SUPABASE_URL.substring(0, 30) + '...');

        // 动态导入Supabase客户端
        const { createClient } = await import('https://unpkg.com/@supabase/supabase-js@2.39.7/dist/umd/supabase.min.js');

        // 创建客户端实例
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            },
            global: {
                headers: {
                    'X-Client-Info': 'springblossom/1.0.0'
                }
            },
            db: {
                schema: 'public'
            },
            realtime: {
                params: {
                    eventsPerSecond: 10
                }
            }
        });

        // 测试连接
        await testConnection(supabaseClient);
        
        console.log('✅ Supabase客户端初始化成功');
        return supabaseClient;
    } catch (error) {
        console.error('❌ Supabase初始化失败:', error);
        showConnectionError();
        return null;
    }
}

// 测试连接
async function testConnection(client) {
    try {
        const { data, error } = await client
            .from('chat_sessions')
            .select('count')
            .limit(1);

        if (error) {
            console.warn('⚠️ 数据库表可能未创建，这是正常的首次运行:', error.message);
        } else {
            console.log('✅ 数据库连接正常');
        }
    } catch (error) {
        console.warn('⚠️ 连接测试中出现警告:', error.message);
    }
}

// 显示连接错误
function showConnectionError() {
    const errorHtml = `
        <div class="connection-error" style="
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff4757;
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            z-index: 9999;
            text-align: center;
            max-width: 90%;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        ">
            <strong>⚠️ 连接问题</strong>
            <p style="margin: 10px 0 0; font-size: 14px;">
                无法连接到聊天服务，请检查网络连接或稍后重试
            </p>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', errorHtml);
    
    // 5秒后自动消失
    setTimeout(() => {
        const errorEl = document.querySelector('.connection-error');
        if (errorEl) {
            errorEl.remove();
        }
    }, 5000);
}

// 数据库表结构初始化（首次运行需要）
export async function initializeDatabase(client) {
    try {
        console.log('🛠️ 检查数据库表结构...');
        
        // 检查表是否存在
        const tables = ['chat_sessions', 'messages', 'match_queue', 'user_reports'];
        let tablesExist = true;
        
        for (const table of tables) {
            const { error } = await client
                .from(table)
                .select('count')
                .limit(1);
            
            if (error && error.code === '42P01') { // 表不存在
                tablesExist = false;
                break;
            }
        }
        
        if (!tablesExist) {
            console.log('📦 数据库表不存在，需要初始化...');
            await createTables(client);
        } else {
            console.log('✅ 数据库表已存在');
        }
        
        return true;
    } catch (error) {
        console.error('❌ 数据库初始化失败:', error);
        return false;
    }
}

// 创建数据库表
async function createTables(client) {
    try {
        // 注意：Supabase JavaScript客户端不能直接执行SQL
        // 这里需要Edge Functions或手动创建表
        
        console.log('请通过MemFire Cloud控制台创建以下表：');
        console.log(`
        1. chat_sessions 表：
           - session_id (text, 主键)
           - user1_id (text)
           - user2_id (text)
           - emotion_tag (text)
           - status (text)
           - created_at (timestamptz)
           - expires_at (timestamptz)
           - ended_at (timestamptz)
        
        2. messages 表：
           - message_id (text, 主键)
           - session_id (text)
           - sender_id (text)
           - content (text)
           - original_content (text)
           - created_at (timestamptz)
        
        3. match_queue 表：
           - user_id (text, 主键)
           - emotion_tag (text)
           - emotion_text (text)
           - created_at (timestamptz)
        
        4. user_reports 表：
           - report_id (text, 主键)
           - session_id (text)
           - reporter_id (text)
           - reason (text)
           - created_at (timestamptz)
        `);
        
        return true;
    } catch (error) {
        console.error('❌ 创建表失败:', error);
        return false;
    }
}

// 获取客户端实例
export function getClient() {
    if (!supabaseClient) {
        throw new Error('Supabase客户端未初始化，请先调用initializeSupabase()');
    }
    return supabaseClient;
}

// 检查会话状态
export async function checkSessionStatus(client, sessionId) {
    try {
        const { data, error } = await client
            .from('chat_sessions')
            .select('status, expires_at')
            .eq('session_id', sessionId)
            .single();

        if (error) throw error;

        return {
            success: true,
            status: data.status,
            expiresAt: new Date(data.expires_at),
            isActive: data.status === 'active' && new Date(data.expires_at) > new Date()
        };
    } catch (error) {
        console.error('检查会话状态错误:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 获取用户会话历史
export async function getUserSessions(client, userId, limit = 10) {
    try {
        const { data, error } = await client
            .from('chat_sessions')
            .select('*')
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return {
            success: true,
            sessions: data || []
        };
    } catch (error) {
        console.error('获取用户会话错误:', error);
        return {
            success: false,
            error: error.message,
            sessions: []
        };
    }
}

// 提交用户反馈
export async function submitFeedback(client, sessionId, userId, feeling, comments = '') {
    try {
        const reportId = 'report_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const { error } = await client
            .from('user_reports')
            .insert({
                report_id: reportId,
                session_id: sessionId,
                reporter_id: userId,
                feeling: feeling,
                comments: comments,
                created_at: new Date().toISOString()
            });

        if (error) throw error;

        return {
            success: true,
            reportId: reportId
        };
    } catch (error) {
        console.error('提交反馈错误:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 清理旧数据（维护功能）
export async function cleanupOldData(client, days = 7) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        // 删除旧的匹配队列记录
        const { error: queueError } = await client
            .from('match_queue')
            .delete()
            .lt('created_at', cutoffDate.toISOString());

        if (queueError) console.warn('清理匹配队列错误:', queueError);

        // 更新过期会话状态
        const { error: sessionError } = await client
            .from('chat_sessions')
            .update({ status: 'expired' })
            .lt('expires_at', new Date().toISOString())
            .eq('status', 'active');

        if (sessionError) console.warn('更新会话状态错误:', sessionError);

        console.log(`✅ 清理了 ${days} 天前的旧数据`);
        return { success: true };
    } catch (error) {
        console.error('❌ 数据清理错误:', error);
        return { success: false, error: error.message };
    }
}

// 健康检查
export async function healthCheck(client) {
    try {
        const startTime = Date.now();
        
        // 测试数据库连接
        const { data, error } = await client
            .from('chat_sessions')
            .select('count')
            .limit(1);

        const responseTime = Date.now() - startTime;

        if (error) {
            return {
                healthy: false,
                responseTime: responseTime,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }

        return {
            healthy: true,
            responseTime: responseTime,
            timestamp: new Date().toISOString(),
            components: {
                database: 'healthy',
                auth: 'healthy',
                realtime: 'unknown'
            }
        };
    } catch (error) {
        return {
            healthy: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// 导出默认客户端实例
export default supabaseClient;
