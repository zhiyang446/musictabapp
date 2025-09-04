const { createClient } = require('@supabase/supabase-js');

// 使用服务角色密钥来创建存储桶（需要管理员权限）
const supabase = createClient(
  'https://jvmcekqjavgesucxytwh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2bWNla3FqYXZnZXN1Y3h5dHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTIyOTg1MiwiZXhwIjoyMDcwODA1ODUyfQ.n7QT_-210Otmzzw2GbVBCeImGA3k3kXzyBPv6QmozEA'
);

async function setupSupabaseStorage() {
  console.log('🚀 设置 Supabase 存储桶...\n');
  
  const bucketsToCreate = [
    { name: 'audio-files', public: false },
    { name: 'audio-input', public: false },
    { name: 'audio-stems', public: false },
    { name: 'outputs', public: false },
    { name: 'previews', public: true }
  ];
  
  for (const bucket of bucketsToCreate) {
    console.log(`📁 创建存储桶: ${bucket.name}...`);
    
    const { data, error } = await supabase.storage.createBucket(bucket.name, {
      public: bucket.public,
      allowedMimeTypes: bucket.name.includes('audio') ? 
        ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/flac', 'audio/ogg'] :
        ['application/pdf', 'audio/midi', 'application/xml', 'text/xml']
    });
    
    if (error) {
      if (error.message.includes('already exists')) {
        console.log(`  ✅ 存储桶 ${bucket.name} 已存在`);
      } else {
        console.log(`  ❌ 创建失败: ${error.message}`);
      }
    } else {
      console.log(`  ✅ 成功创建存储桶: ${bucket.name}`);
    }
  }
  
  console.log('\n🔍 检查存储桶列表...');
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.log('❌ 获取存储桶列表失败:', listError.message);
  } else {
    console.log(`✅ 当前存储桶 (${buckets.length} 个):`);
    buckets.forEach((bucket, index) => {
      console.log(`  ${index + 1}. ${bucket.name} - ${bucket.public ? '公开' : '私有'}`);
    });
  }
}

setupSupabaseStorage().catch(console.error);
