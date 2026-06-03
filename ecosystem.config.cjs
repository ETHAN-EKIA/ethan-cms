module.exports = {
  apps: [{
    name: 'ethan-cms',
    script: 'node_modules/next/dist/bin/next',
    args: 'dev -p 3001',
    interpreter: 'node',
    cwd: 'C:\\Users\\EKIA\\Desktop\\ETHAN SECURITY CAMERA\\ethan-cms',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development',
    },
    // Restart delay after crash
    restart_delay: 3000,
    // Max restarts in window
    max_restarts: 50,
    min_uptime: '10s',
    // Kill timeout
    kill_timeout: 5000,
    // Log settings
    error_file: 'C:\\Users\\EKIA\\Desktop\\ETHAN SECURITY CAMERA\\pm2-error.log',
    out_file: 'C:\\Users\\EKIA\\Desktop\\ETHAN SECURITY CAMERA\\pm2-out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }]
}
