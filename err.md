Run sleep 30
  sleep 30
  ssh ***@*** << 'EOF'
    # 檢查 PM2 狀態
    if pm2 list | grep -q "crypto-monitor.*online"; then
      echo "✅ 應用程式運行正常"
      pm2 list
      echo "--- 最近日誌 ---"
      pm2 logs crypto-monitor --lines 20 --nostream
    else
      echo "❌ 應用程式運行異常"
      pm2 list
      pm2 logs crypto-monitor --lines 50 --nostream
      exit 1
    fi
  EOF
  shell: /usr/bin/bash -e {0}
Pseudo-terminal will not be allocated because stdin is not a terminal.
Welcome to Ubuntu 25.04 (GNU/Linux 6.14.0-1009-gcp x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/pro

 System information as of Mon Aug  4 06:20:34 UTC 2025

  System load:  0.0                Processes:             115
  Usage of /:   14.8% of 27.95GB   Users logged in:       1
  Memory usage: 41%                IPv4 address for ens4: 10.138.0.2
  Swap usage:   0%

 * Strictly confined Kubernetes makes edge and IoT secure. Learn how MicroK8s
   just raised the bar for easy, resilient and secure K8s cluster deployment.

   https://ubuntu.com/engage/secure-kubernetes-at-the-edge

38 updates can be applied immediately.
34 of these updates are standard security updates.
To see these additional updates run: apt list --upgradable


❌ 應用程式運行異常
┌────┬───────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name      │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
└────┴───────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
[TAILING] Tailing last 50 lines for [crypto-monitor] process (change the value with --lines option)
Error: Process completed with exit code 1.