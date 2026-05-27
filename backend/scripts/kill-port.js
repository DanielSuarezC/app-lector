const { execSync } = require('child_process');
const port = process.argv[2] || '3000';

try {
  if (process.platform === 'win32') {
    const out = execSync(`netstat -ano | findstr :${port}`, { shell: true, stdio: 'pipe' }).toString();
    out.split('\n')
      .filter(line => line.includes('LISTENING'))
      .forEach(line => {
        const pid = line.trim().split(/\s+/).pop();
        if (pid && !isNaN(pid)) {
          try { execSync(`taskkill /F /PID ${pid}`, { shell: true, stdio: 'pipe' }); } catch (_) {}
        }
      });
  } else {
    execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { shell: true });
  }
} catch (_) {}
