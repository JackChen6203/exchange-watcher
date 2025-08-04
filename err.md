Run # 創建部署包
  # 創建部署包
  tar --exclude='node_modules' --exclude='.git' --exclude='*.tar.gz' -czf app.tar.gz .
  
  # 複製到服務器
  scp app.tar.gz ***@***:~/
  scp deploy/direct-deploy.sh ***@***:~/
  
  # 執行部署
  ssh ***@*** << 'EOF'
    # 解壓縮應用程式
    rm -rf ~/app-temp
    mkdir ~/app-temp
    cd ~/app-temp
    tar -xzf ~/app.tar.gz
    
    # 執行部署腳本
    chmod +x ~/direct-deploy.sh
    ~/direct-deploy.sh
    
    # 清理
    cd ~
    rm -rf ~/app-temp ~/app.tar.gz ~/direct-deploy.sh
  EOF
  shell: /usr/bin/bash -e {0}
tar: .: file changed as we read it
Error: Process completed with exit code 1.

un sleep 30
  sleep 30
  ssh ***@*** << 'EOF'
    # Check if containers are running (try with and without sudo)
    if docker ps 2>/dev/null | grep -q crypto-exchange-monitor; then
      echo "Container running (no sudo needed)"
      docker logs crypto-exchange-monitor --tail 50
    elif sudo docker ps 2>/dev/null | grep -q crypto-exchange-monitor; then
      echo "Container running (sudo required)"
      sudo docker logs crypto-exchange-monitor --tail 50
    else
      echo "❌ Container not found!"
      echo "Available containers:"
      docker ps 2>/dev/null || sudo docker ps 2>/dev/null || echo "Cannot access Docker"
      exit 1
    fi
  EOF
  shell: /usr/bin/bash -e {0}
Pseudo-terminal will not be allocated because stdin is not a terminal.
Welcome to Ubuntu 25.04 (GNU/Linux 6.14.0-1009-gcp x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/pro

 System information as of Mon Aug  4 05:50:20 UTC 2025

  System load:  0.16               Processes:             127
  Usage of /:   15.0% of 27.95GB   Users logged in:       2
  Memory usage: 42%                IPv4 address for ens4: 10.138.0.2
  Swap usage:   0%

 * Strictly confined Kubernetes makes edge and IoT secure. Learn how MicroK8s
   just raised the bar for easy, resilient and secure K8s cluster deployment.

   https://ubuntu.com/engage/secure-kubernetes-at-the-edge

38 updates can be applied immediately.
34 of these updates are standard security updates.
To see these additional updates run: apt list --upgradable


❌ Container not found!
Available containers:
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
Error: Process completed with exit code 1.
