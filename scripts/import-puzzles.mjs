#!/usr/bin/env node
// 批量导入谜题图片，自动生成 YAML 条目。
//
// 用法：
//   node scripts/import-puzzles.mjs <图片目录> --genre <题型id> [选项]
//
// 图片命名约定（后缀可用参数修改）：
//   xxx-q.png  题目
//   xxx-a.png  答案（可选）
//
// 选项：
//   --genre <id>        必填，对应 src/content/genres/<id>.md
//   --prefix <前缀>     条目 id 前缀，例如 inaba → inaba-001
//   --author <作者>
//   --source <出处>
//   --url <原题链接>
//   --difficulty <1-5>
//   --tags <a,b,c>
//   --title <模板>      标题模板，{name} 为文件名主体，默认 "{name}"
//   --q-suffix <后缀>   题目图片后缀，默认 -q
//   --a-suffix <后缀>   答案图片后缀，默认 -a
//   --dry-run           只显示将要执行的操作

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values: opt, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    genre: { type: 'string' },
    prefix: { type: 'string', default: '' },
    author: { type: 'string' },
    source: { type: 'string' },
    url: { type: 'string' },
    difficulty: { type: 'string' },
    tags: { type: 'string' },
    title: { type: 'string', default: '{name}' },
    'q-suffix': { type: 'string', default: '-q' },
    'a-suffix': { type: 'string', default: '-a' },
    'dry-run': { type: 'boolean', default: false },
  },
});

const srcDir = positionals[0];
if (!srcDir || !opt.genre) {
  console.error('用法：node scripts/import-puzzles.mjs <图片目录> --genre <题型id> [--prefix x] [--author x] ...');
  process.exit(1);
}
if (!fs.existsSync(`src/content/genres/${opt.genre}.md`)) {
  console.error(`找不到题型 src/content/genres/${opt.genre}.md，请先创建题型页面。`);
  process.exit(1);
}

const IMG = /\.(png|jpe?g|webp|gif|avif|svg)$/i;
const files = fs.readdirSync(srcDir).filter((f) => IMG.test(f));
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const qRe = new RegExp(`^(.*)${escRe(opt['q-suffix'])}(\\.[a-z]+)$`, 'i');
const aRe = new RegExp(`^(.*)${escRe(opt['a-suffix'])}(\\.[a-z]+)$`, 'i');
// 答案图片不能再被当作题目（题目后缀为空时尤其需要）
const isAnswer = (f) => opt['a-suffix'] !== '' && aRe.test(f) && !(opt['q-suffix'] !== '' && qRe.test(f));
const destDir = path.join('src/content/puzzles', opt.genre);
const yamlStr = (s) => JSON.stringify(s); // JSON 字符串即合法的 YAML 字符串

let added = 0;
let skipped = 0;
for (const qFile of files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
  const m = qFile.match(qRe);
  if (!m || isAnswer(qFile)) continue;
  const [, name] = m;
  const aFile = files.find((f) => f.toLowerCase().startsWith(`${name}${opt['a-suffix']}.`.toLowerCase()));
  const id = (opt.prefix ? `${opt.prefix}-` : '') + name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
  const yamlPath = path.join(destDir, `${id}.yaml`);
  if (fs.existsSync(yamlPath)) {
    skipped++;
    continue;
  }
  const qDest = `${id}-q${path.extname(qFile).toLowerCase()}`;
  const aDest = aFile && `${id}-a${path.extname(aFile).toLowerCase()}`;
  const lines = [
    `title: ${yamlStr(opt.title.replaceAll('{name}', name))}`,
    `genre: ${opt.genre}`,
    `question: ./${qDest}`,
    aDest && `answer: ./${aDest}`,
    opt.author && `author: ${yamlStr(opt.author)}`,
    opt.source && `source: ${yamlStr(opt.source)}`,
    opt.url && `url: ${yamlStr(opt.url)}`,
    opt.difficulty && `difficulty: ${Number(opt.difficulty)}`,
    opt.tags && `tags: [${opt.tags.split(',').map((t) => yamlStr(t.trim())).join(', ')}]`,
    `date: ${new Date().toISOString().slice(0, 10)}`,
  ].filter(Boolean);

  console.log(`${opt['dry-run'] ? '[dry-run] ' : ''}${qFile}${aFile ? ` + ${aFile}` : '（无答案）'} → ${yamlPath}`);
  if (!opt['dry-run']) {
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(path.join(srcDir, qFile), path.join(destDir, qDest));
    if (aFile) fs.copyFileSync(path.join(srcDir, aFile), path.join(destDir, aDest));
    fs.writeFileSync(yamlPath, lines.join('\n') + '\n');
  }
  added++;
}
console.log(`\n完成：新增 ${added} 道，跳过已存在 ${skipped} 道。`);
