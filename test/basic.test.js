const path = require('path');
const fs = require('fs');

// 簡單的測試函數
function test(description, testFn) {
  try {
    testFn();
    console.log(`✅ ${description}`);
    return true;
  } catch (error) {
    console.log(`❌ ${description}: ${error.message}`);
    return false;
  }
}

// 如果直接執行此檔案，運行測試
if (require.main === module) {
  console.log('🧪 運行基本測試...');
  
  let passed = 0;
  let failed = 0;

  // 專案檔案檢查
  console.log('\n📁 專案檔案檢查:');
  
  if (test('應該有 package.json 檔案', () => {
    const packagePath = path.join(__dirname, '..', 'package.json');
    if (!fs.existsSync(packagePath)) throw new Error('package.json 檔案不存在');
  })) passed++; else failed++;

  if (test('應該有主要入口檔案', () => {
    const indexPath = path.join(__dirname, '..', 'src', 'index.js');
    if (!fs.existsSync(indexPath)) throw new Error('主要入口檔案不存在');
  })) passed++; else failed++;

  if (test('應該有 Dockerfile', () => {
    const dockerfilePath = path.join(__dirname, '..', 'Dockerfile');
    if (!fs.existsSync(dockerfilePath)) throw new Error('Dockerfile 不存在');
  })) passed++; else failed++;

  if (test('應該有部署腳本', () => {
    const deployScriptPath = path.join(__dirname, '..', 'deploy', 'deploy.sh');
    if (!fs.existsSync(deployScriptPath)) throw new Error('部署腳本不存在');
  })) passed++; else failed++;

  // 配置檔案檢查
  console.log('\n⚙️ 配置檔案檢查:');
  
  if (test('應該有環境變數範本', () => {
    const envTemplatePath = path.join(__dirname, '..', '.env.template');
    if (!fs.existsSync(envTemplatePath)) throw new Error('環境變數範本不存在');
  })) passed++; else failed++;

  if (test('應該有 Docker Compose 配置', () => {
    const composePath = path.join(__dirname, '..', 'deploy', 'docker-compose.yml');
    if (!fs.existsSync(composePath)) throw new Error('Docker Compose 配置不存在');
  })) passed++; else failed++;

  if (test('應該有 GitHub Actions 工作流程', () => {
    const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'deploy.yml');
    if (!fs.existsSync(workflowPath)) throw new Error('GitHub Actions 工作流程不存在');
  })) passed++; else failed++;

  // 目錄結構檢查
  console.log('\n📂 目錄結構檢查:');
  
  if (test('應該有 src 目錄', () => {
    const srcPath = path.join(__dirname, '..', 'src');
    if (!fs.existsSync(srcPath)) throw new Error('src 目錄不存在');
  })) passed++; else failed++;

  if (test('應該有 deploy 目錄', () => {
    const deployPath = path.join(__dirname, '..', 'deploy');
    if (!fs.existsSync(deployPath)) throw new Error('deploy 目錄不存在');
  })) passed++; else failed++;

  // 應用程式模組測試
  console.log('\n🔧 應用程式模組檢查:');
  
  if (test('應該能夠讀取主要入口檔案', () => {
    const content = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.js'), 'utf8');
    if (content.length === 0) throw new Error('主要入口檔案為空');
  })) passed++; else failed++;

  if (test('package.json 應該有必要的腳本', () => {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    if (!packageJson.scripts) throw new Error('package.json 中沒有 scripts 部分');
    if (!packageJson.scripts.start) throw new Error('package.json 中沒有 start 腳本');
  })) passed++; else failed++;

  console.log(`\n📊 測試結果: ${passed} 通過, ${failed} 失敗`);
  
  if (failed === 0) {
    console.log('🎉 所有測試通過！');
    process.exit(0);
  } else {
    console.log('💥 有測試失敗');
    process.exit(1);
  }
}