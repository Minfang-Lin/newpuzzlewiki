#!/usr/bin/env python3
"""从谜题合集 PDF 中按页裁出例题、例题解答与各道谜题的图片。

适用于「一页一个题型：标题 + 规则 + 例题(题目/解答) + 若干谜题」的版式，
同时支持两种页面：
  A. 谜题以位图嵌入（如稲葉直貴「作・稲葉直貴」版式）
  B. 谜题为矢量图形（如带 inaba 标志的版式）

用法：
  python3 scripts/extract-pdf.py <pdf> <输出目录> [--pages 1-10,15] [--dpi 300]

输出：
  <输出目录>/p001/example-q.png, example-a.png, 1.png, 2.png ...
  <输出目录>/p001/page.png      整页预览
  <输出目录>/p001/info.json     标题、规则原文等
依赖：pip install pymupdf
"""
import argparse
import json
import re
from pathlib import Path

import pymupdf

LABELS = set('１２３４５６７８９壱弐参肆伍')


def parse_pages(spec, count):
    if not spec:
        return list(range(1, count + 1))
    pages = []
    for part in spec.split(','):
        a, _, b = part.partition('-')
        pages += range(int(a), int(b or a) + 1)
    return [p for p in pages if 1 <= p <= count]


def merge_boxes(boxes, gap):
    clusters = []
    for b in boxes:
        b = pymupdf.Rect(b)
        merged = True
        while merged:
            merged = False
            for c in clusters:
                if (c + (-gap, -gap, gap, gap)).intersects(b):
                    b |= c
                    clusters.remove(c)
                    merged = True
                    break
        clusters.append(b)
    return clusters


def row_major(rects, tol=30):
    """按行（y 相近视为同一行）再按列排序。"""
    rects = sorted(rects, key=lambda r: r.y0)
    rows, current = [], []
    for r in rects:
        if current and r.y0 - current[0].y0 > tol:
            rows.append(current)
            current = []
        current.append(r)
    if current:
        rows.append(current)
    return [r for row in rows for r in sorted(row, key=lambda r: r.x0)]


def grow_with_text(rect, words, reach=22):
    """把紧贴盘面外侧的提示文字（如四周的数字/字母）也包含进来。"""
    r = pymupdf.Rect(rect)
    for w in words:
        wr = pymupdf.Rect(w[:4])
        if w[4] in LABELS and wr.width > 15:  # 题号徽章
            continue
        if (rect + (-reach, -reach, reach, reach)).contains(wr):
            r |= wr
    return r


def page_text(page):
    lines = [l.strip() for l in page.get_text().split('\n')]
    return [l for l in lines if l]


def extract_raster(page):
    """版式 A：位图谜题。返回 (例题[题,解], 谜题列表)。"""
    infos = [pymupdf.Rect(i['bbox']) for i in page.get_image_info()]
    infos = [r for r in infos if r.width > 40 and r.height > 40]
    if not infos:
        return None
    top = min(r.width for r in infos)
    example = [r for r in infos if r.width <= top + 2 and r.y1 < page.rect.height * 0.5]
    if len(example) != 2:
        example = []
    puzzles = [r for r in infos if r not in example]
    return sorted(example, key=lambda r: r.x0), row_major(puzzles)


def extract_vector(page):
    """版式 B：矢量谜题。"""
    words = page.get_text('words')
    drawings = [pymupdf.Rect(d['rect']) for d in page.get_drawings()]
    drawings = [r for r in drawings if r.width < page.rect.width * 0.9]
    clusters = [c for c in merge_boxes(drawings, 4) if c.width > 40 and c.height > 40]

    ex_words = [pymupdf.Rect(w[:4]) for w in words if w[4] in ('例題', '解答')]
    # 右上角 logo：宽扁、位于页面顶部右侧
    clusters = [c for c in clusters
                if not (c.y1 < 110 and c.x0 > page.rect.width * 0.6 and c.width > 2 * c.height)]

    example = []
    frame = next((c for c in clusters if any(c.contains(w) for w in ex_words)), None)
    if frame:
        clusters.remove(frame)
        inner = [r for r in drawings if frame.contains(r) and not (r.width > frame.width * 0.9)]
        subs = [c for c in merge_boxes(inner, 2) if c.width > 20 and c.height > 20]
        subs = sorted(subs, key=lambda r: r.width * r.height, reverse=True)[:2]
        example = sorted(subs, key=lambda r: r.x0)
    puzzles = row_major([grow_with_text(c, words) for c in clusters])
    example = [grow_with_text(c, words, 12) for c in example]
    return example, puzzles


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('out')
    ap.add_argument('--pages')
    ap.add_argument('--dpi', type=int, default=300)
    args = ap.parse_args()

    doc = pymupdf.open(args.pdf)
    out = Path(args.out)
    for n in parse_pages(args.pages, doc.page_count):
        page = doc[n - 1]
        d = out / f'p{n:03d}'
        d.mkdir(parents=True, exist_ok=True)
        kind = 'raster'
        result = extract_raster(page)
        if not result or not result[1]:
            kind = 'vector'
            result = extract_vector(page)
        example, puzzles = result

        def save(rect, name, pad=None):
            if pad is None:
                pad = 0 if kind == "raster" else 6
            clip = (rect + (-pad, -pad, pad, pad)) & page.rect
            page.get_pixmap(dpi=args.dpi, clip=clip).save(d / name)

        if len(example) == 2:
            save(example[0], 'example-q.png')
            save(example[1], 'example-a.png')
        for i, r in enumerate(puzzles, 1):
            save(r, f'{i}.png')
        page.get_pixmap(dpi=72).save(d / 'page.png')

        text = page_text(page)
        info = {
            'page': n,
            'kind': kind,
            'puzzles': len(puzzles),
            'example': len(example) == 2,
            'text': text,
        }
        (d / 'info.json').write_text(json.dumps(info, ensure_ascii=False, indent=1))
        print(f'p{n:03d} {kind:6s} 例题={"有" if info["example"] else "无"} 谜题={len(puzzles)}  {(text[1] if kind == "raster" and len(text) > 1 else text[0] if text else "")[:20]}')


if __name__ == '__main__':
    main()
