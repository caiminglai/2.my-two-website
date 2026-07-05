// 敏感信息脱敏替换脚本
// 在 git filter-branch --tree-filter 中调用，遍历所有文件替换敏感字符串
const fs = require('fs');
const path = require('path');

const replacements = [
  ['your_name', 'your_name'],
  ['your_icp_number', 'your_icp_number'],
  ['your_icp_number_2', 'your_icp_number_2'],
];

const allowedExts = ['.md', '.txt', '.html', '.js', '.ts', '.tsx', '.jsx', '.json', '.yaml', '.yml', '.env'];

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') continue;
      walkDir(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!allowedExts.includes(ext)) continue;
      try {
        let content = fs.readFileSync(fullPath, 'utf8');
        let changed = false;
        for (const [from, to] of replacements) {
          if (content.includes(from)) {
            content = content.split(from).join(to);
            changed = true;
          }
        }
        if (changed) {
          fs.writeFileSync(fullPath, content, 'utf8');
        }
      } catch (e) {
        // binary or unreadable, skip
      }
    }
  }
}

walkDir(process.cwd());
