const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2bWNla3FqYXZnZXN1Y3h5dHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTIyOTg1MiwiZXhwIjoyMDcwODA1ODUyfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetPassword() {
  const email = 'zhiyang446@gmail.com';
  const newPassword = 'test123456';

  try {
    console.log('🔧 正在重置用户密码...');
    console.log('📧 邮箱:', email);
    console.log('🔑 新密码:', newPassword);

    // 使用 Admin API 更新用户密码
    const { data, error } = await supabase.auth.admin.updateUserById(
      'a9b6e600-a8f0-4a31-aeb4-638b0150a9b3', // 从 Supabase Dashboard 看到的 UID
      {
        password: newPassword,
      }
    );

    if (error) {
      console.error('❌ 重置密码失败:', error);
      return;
    }

    console.log('✅ 密码重置成功!');
    console.log('👤 用户ID:', data.user.id);
    console.log('📧 邮箱:', data.user.email);
    console.log('✅ 密码已更新');

    console.log('\n🎉 密码重置完成!');
    console.log('📱 现在可以在移动端使用以下凭据登录:');
    console.log('   邮箱: zhiyang446@gmail.com');
    console.log('   密码: test123456');

  } catch (err) {
    console.error('❌ 重置密码时出错:', err);
  }
}

resetPassword();

