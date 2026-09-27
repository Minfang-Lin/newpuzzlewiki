#!/usr/bin/env python3
"""把 extract-pdf.py 裁好的图片导入网站。

用法：
  python3 scripts/import-extracted.py <提取目录> <清单.json>

清单示例（data/imports/inaba-honkaku.json）：
{
  "prefix": "inaba-honkaku",          // 条目 id 前缀
  "author": "稲葉直貴",
  "source": "稲葉直貴本格パズル集",
  "url": "http://inabapuzzle.com/honkaku/index_g.html",
  "date": "2022-11-05",
  "pages": { "1": "abc-box", "2": "not-abcd" }   // 页码 → 题型 id
}

- 题型页 src/content/genres/<id>.md 需事先写好（规则翻译等）；
- 例题图片复制到 src/content/genres/images/<id>-example-{q,a}.png；
- 谜题复制到 src/content/puzzles/<id>/<prefix>-<n>-q.png，并生成 yaml；
- 同一题型跨多页时编号连续；已存在的 yaml 不会覆盖。
"""
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GENRES = ROOT / 'src/content/genres'
PUZZLES = ROOT / 'src/content/puzzles'


def genre_name(gid):
    md = (GENRES / f'{gid}.md').read_text()
    m = re.search(r'zh:\s*([^,}\n]+)', md)
    return m.group(1).strip() if m else gid


def main():
    ext, manifest = Path(sys.argv[1]), json.loads(Path(sys.argv[2]).read_text())
    prefix = manifest['prefix']
    counters = {}
    added = 0
    for page, gid in sorted(manifest['pages'].items(), key=lambda kv: int(kv[0])):
        src = ext / f'p{int(page):03d}'
        if not (GENRES / f'{gid}.md').exists():
            print(f'跳过 p{page}：缺少题型页 {gid}.md')
            continue
        name = genre_name(gid)
        img_dir = GENRES / 'images'
        img_dir.mkdir(exist_ok=True)
        for kind in ('q', 'a'):
            f = src / f'example-{kind}.png'
            dest = img_dir / f'{gid}-example-{kind}.png'
            if f.exists() and not dest.exists():
                shutil.copy(f, dest)

        out = PUZZLES / gid
        out.mkdir(parents=True, exist_ok=True)
        i = 1
        while (src / f'{i}.png').exists():
            n = counters.get(gid, 0) + 1
            counters[gid] = n
            pid = f'{prefix}-{n:02d}'
            yml = out / f'{pid}.yaml'
            if not yml.exists():
                shutil.copy(src / f'{i}.png', out / f'{pid}-q.png')
                lines = [
                    f'title: "{name} {n}"',
                    f'genre: {gid}',
                    f'question: ./{pid}-q.png',
                    f'author: {manifest["author"]}',
                    f'source: {manifest["source"]}',
                    f'url: {manifest["url"]}' if manifest.get('url') else None,
                    f'date: {manifest["date"]}' if manifest.get('date') else None,
                    f'tags: [{", ".join(manifest.get("tags", []))}]',
                ]
                yml.write_text('\n'.join(l for l in lines if l) + '\n')
                added += 1
            i += 1
    print(f'完成：新增 {added} 道谜题。')


if __name__ == '__main__':
    main()
