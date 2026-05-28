module.exports = {
  apps: [
    {
      name: 'bridge-colina-real',
      script: './src/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '100M',
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: './logs/bridge-out.log',
      error_file: './logs/bridge-error.log',
      merge_logs: true,
    },
  ],
};
