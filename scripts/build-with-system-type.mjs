import { spawn } from 'child_process';
import process from 'process';

// 这是一个 Node.js 脚本，用于通过 --key=<value> 参数构建项目
// 支持：pnpm build:pro --key=<value> [其他vite参数...]
// 自动根据 npm_lifecycle_event（如 build:pro、build:test）推断 mode

const args = process.argv.slice(2); // 获取传递给脚本的参数，跳过 node 和脚本文件名

let systemType = null;
const viteArgs = [];
let hasMode = false;

// 解析参数
for (const arg of args) {
  if (arg.startsWith('--key=')) {
    systemType = arg.substring('--key='.length);
    console.log(`从参数中解析到 VITE_SYSTEM_TYPE: ${systemType}`);
  } else if (arg.startsWith('--mode')) {
    hasMode = true;
    viteArgs.push(arg);
  } else {
    viteArgs.push(arg);
  }
}

// 检查是否成功获取到 systemType
if (systemType === null) {
  console.error('错误：未找到 --key=<value> 参数。');
  console.log('用法：pnpm build:pro --key=<value> [其他vite参数...]');
  process.exit(1);
}

// 自动根据 npm_lifecycle_event 推断 mode
if (!hasMode) {
  const npmEvent = process.env.npm_lifecycle_event;
  let mode = 'pro'; // 默认 pro
  if (npmEvent && npmEvent.startsWith('build:')) {
    mode = npmEvent.split(':')[1] || 'pro';
  }
  viteArgs.unshift('--mode', mode);
  console.log(`未检测到 --mode 参数，已根据命令自动推断并添加: --mode ${mode}`);
}

// 准备环境变量（Vite 生产构建易 OOM，默认抬高 Node 堆上限）
const env = {
  ...process.env,
  VITE_SYSTEM_TYPE: systemType,
  NODE_OPTIONS: [process.env.NODE_OPTIONS, '--max-old-space-size=4096'].filter(Boolean).join(' ')
}

// 执行 vite build 命令
const command = `pnpm vite build ${viteArgs.join(' ')}`;
console.log(`正在使用 VITE_SYSTEM_TYPE=${systemType} 执行构建命令: ${command}`);

const viteProcess = spawn(command, {
  stdio: 'inherit',
  env: env,
  shell: true
});

// 监听子进程退出
viteProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`构建进程以非零退出码结束: ${code}`);
  }
  process.exit(code); // 使用子进程的退出码退出本脚本
});

viteProcess.on('error', (err) => {
  console.error('启动构建进程失败:', err);
  process.exit(1); // 退出并报错
}); 