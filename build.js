/**
 * AI网页内容总结 - 构建脚本
 * 将 src/ 下的模块文件组装成完整的油猴脚本
 * 用法: node build.js
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const DIST_DIR = path.join(__dirname, 'dist');
const OUTPUT_FILE = path.join(DIST_DIR, 'ai-summary.user.js');

// 需要按照依赖顺序排列的JS模块（frontmatter单独处理）
const JS_MODULES = [
  'config/defaults.js',
  'config/storage.js',
  'utils/ai-service.js',
  'config/templates.js',
  'utils/content.js',
  'utils/markdown.js',
  'utils/history.js',
  'utils/token.js',
  'utils/drag.js',
  'ui/settings-panel.js',
  'ui/summary-panel.js',
  'ui/history-modal.js',
  'ui/events.js',
  'api/summarize.js',
  'main.js',
];

// CSS文件映射：CSS文件名 -> { 注入目标JS文件, 插入位置标记 }
const CSS_FILES = {
  'settings.css':   { target: 'ui/settings-panel.js',  marker: '/* CSS_SETTINGS_PLACEHOLDER */' },
  'summary.css':    { target: 'ui/summary-panel.js',    marker: '/* CSS_SUMMARY_PLACEHOLDER */' },
  'drag.css':       { target: 'utils/drag.js',           marker: '/* CSS_DRAG_PLACEHOLDER */' },
  'history.css':    { target: 'ui/history-modal.js',     marker: '/* CSS_HISTORY_PLACEHOLDER */' },
};

function readFile(relativePath) {
  const fullPath = path.join(SRC_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Error: File not found: ${fullPath}`);
    process.exit(1);
  }
  return fs.readFileSync(fullPath, 'utf-8');
}

function escapeForStringLiteral(cssContent) {
  return cssContent
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
}

function extractAboutContent() {
  const readmePath = path.join(__dirname, 'README.md');
  if (!fs.existsSync(readmePath)) return '# AI网页内容总结\n\n油猴脚本，一键 AI 总结网页内容。';
  const readme = fs.readFileSync(readmePath, 'utf-8');
  const splitMarker = '## 快速开始';
  const idx = readme.indexOf(splitMarker);
  return (idx >= 0 ? readme.substring(0, idx) : readme).trim();
}

function build() {
  console.log('Building AI Summary Userscript...\n');

  // 确保dist目录存在
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  // 1. 读取 frontmatter
  const frontmatter = readFile('frontmatter.js');
  console.log('  [frontmatter] frontmatter.js');

  // 2. 读取所有JS模块
  let jsModulesContent = '';
  for (const modulePath of JS_MODULES) {
    let content = readFile(modulePath);
    console.log(`  [js]       ] ${modulePath}`);

    // 检查该JS文件是否需要注入CSS
    for (const [cssFile, cfg] of Object.entries(CSS_FILES)) {
      if (cfg.target === modulePath && content.includes(cfg.marker)) {
        const cssContent = readFile('styles/' + cssFile);
        const escapedCss = escapeForStringLiteral(cssContent);
        content = content.replace(cfg.marker, escapedCss);
        console.log(`  [css]        -> ${cssFile} injected`);
      }
    }

    jsModulesContent += '\n' + content + '\n';
  }

  // 3. 注入README关于内容（截取"快速开始"之前部分）
  const aboutContent = extractAboutContent();
  const escapedAbout = escapeForStringLiteral(aboutContent);
  const aboutPlaceholder = '"ABOUT_CONTENT_PLACEHOLDER"';
  if (jsModulesContent.includes(aboutPlaceholder)) {
    jsModulesContent = jsModulesContent.replace(aboutPlaceholder, '`' + escapedAbout + '`');
    console.log('  [readme]    -> README.md about section injected');
  }

  // 4. 组装完整脚本
  // 使用模板构建输出
  const output = frontmatter.trimEnd() + '\n\n' + jsModulesContent.trim();

  // 5. 写入输出
  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
  console.log(`\n  [output]   ${OUTPUT_FILE}`);
  console.log(`  [size]     ${(output.length / 1024).toFixed(1)} KB`);
  console.log('\nBuild complete!');
}

build();
