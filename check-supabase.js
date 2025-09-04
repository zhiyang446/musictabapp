const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jvmcekqjavgesucxytwh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2bWNla3FqYXZnZXN1Y3h5dHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyMjk4NTIsImV4cCI6MjA3MDgwNTg1Mn0.492IwvCqhYvvhKOz4UgDtJ6BFK7T8TuqFLo1gOdhHfg'
);

async function checkSupabaseData() {
  console.log('🔍 检查 Supabase 数据...\n');
  
  try {
    // 检查任务表
    console.log('📋 检查任务 (jobs) 表...');
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, status, progress, source_type, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (jobsError) {
      console.log('❌ Jobs 查询错误:', jobsError.message);
    } else {
      console.log(`✅ 找到 ${jobs?.length || 0} 个任务:`);
      jobs?.forEach((job, index) => {
        const date = new Date(job.created_at).toLocaleString();
        console.log(`  ${index + 1}. ${job.id.substring(0, 8)}... - ${job.status} (${job.progress}%) - ${job.source_type} - ${date}`);
      });
    }
    
    console.log('\n📁 检查文件 (artifacts) 表...');
    // 检查文件表
    const { data: artifacts, error: artifactsError } = await supabase
      .from('artifacts')
      .select('id, job_id, kind, instrument, storage_path, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (artifactsError) {
      console.log('❌ Artifacts 查询错误:', artifactsError.message);
    } else {
      console.log(`✅ 找到 ${artifacts?.length || 0} 个文件:`);
      artifacts?.forEach((artifact, index) => {
        const date = new Date(artifact.created_at).toLocaleString();
        console.log(`  ${index + 1}. ${artifact.kind} - ${artifact.instrument} - ${artifact.storage_path} - ${date}`);
      });
    }
    
    console.log('\n🎵 检查音频轨道 (stems) 表...');
    // 检查音频轨道表
    const { data: stems, error: stemsError } = await supabase
      .from('stems')
      .select('id, job_id, instrument, storage_path, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (stemsError) {
      console.log('❌ Stems 查询错误:', stemsError.message);
    } else {
      console.log(`✅ 找到 ${stems?.length || 0} 个音频轨道:`);
      stems?.forEach((stem, index) => {
        const date = new Date(stem.created_at).toLocaleString();
        console.log(`  ${index + 1}. ${stem.instrument} - ${stem.storage_path} - ${date}`);
      });
    }
    
    console.log('\n🗂️ 检查存储桶 (Storage Buckets)...');
    // 检查存储桶
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log('❌ Storage 查询错误:', bucketsError.message);
    } else {
      console.log(`✅ 找到 ${buckets?.length || 0} 个存储桶:`);
      buckets?.forEach((bucket, index) => {
        console.log(`  ${index + 1}. ${bucket.name} - ${bucket.public ? '公开' : '私有'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出错:', error.message);
  }
}

checkSupabaseData();
