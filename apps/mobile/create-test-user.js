const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2bWNla3FqYXZnZXN1Y3h5dHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTIyOTg1MiwiZXhwIjoyMDcwODA1ODUyfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUser() {
  const email = 'zhiyang446@gmail.com';
  const password = 'test123456';

  try {
    console.log('🔧 正在创建测试用户...');
    console.log('📧 邮箱:', email);
    console.log('🔑 密码:', password);

    // 使用 Admin API 创建用户
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // 自动确认邮箱
    });

    if (error) {
      console.error('❌ 创建用户失败:', error);
      return;
    }

    console.log('✅ 用户创建成功!');
    console.log('👤 用户ID:', data.user.id);
    console.log('📧 邮箱:', data.user.email);
    console.log('✅ 邮箱已确认:', data.user.email_confirmed_at);

    // 创建用户配置文件
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        email: data.user.email,
        full_name: 'Test User',
        created_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error('⚠️ 创建配置文件失败:', profileError);
    } else {
      console.log('✅ 用户配置文件创建成功!');
    }

    console.log('\n🎉 测试用户创建完成!');
    console.log('📱 现在可以在移动端使用以下凭据登录:');
    console.log('   邮箱: zhiyang446@gmail.com');
    console.log('   密码: test123456');

  } catch (err) {
    console.error('❌ 创建用户时出错:', err);
  }
}

createTestUser();

