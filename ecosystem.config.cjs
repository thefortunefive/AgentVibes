module.exports = {
  apps: [
    {
      name: 'agentvibes-server',
      script: 'npx',
      args: 'tsx watch api/server.ts',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        AGENTVIBES_NO_PLAYBACK: 'true',
        LLM_PROVIDER: 'generic',
        GENERIC_LLM_BASE_URL: 'https://api.groq.com/openai/v1',
        GENERIC_LLM_API_KEY: process.env.GENERIC_LLM_API_KEY || '',
        GENERIC_LLM_MODEL: 'llama-3.3-70b-versatile',
        NOCODB_BASE_URL: 'http://localhost:8080',
        NOCODB_API_TOKEN: process.env.NOCODB_API_TOKEN || '',
        NOCODB_BASE_ID: 'p5v5ffrepsxc7g5'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      log_file: '/home/user/webapp/logs/server.log',
      out_file: '/home/user/webapp/logs/server.out.log',
      error_file: '/home/user/webapp/logs/server.error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
