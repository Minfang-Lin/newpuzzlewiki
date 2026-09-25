import { getCollection, type CollectionEntry } from 'astro:content';
import { getImage } from 'astro:assets';
import { url } from './url';

export type Puzzle = CollectionEntry<'puzzles'>;
export type Genre = CollectionEntry<'genres'>;

/** 所有题型，按中文名排序 */
export async function getGenres(): Promise<Genre[]> {
  const genres = await getCollection('genres');
  return genres.sort((a, b) => a.data.name.zh.localeCompare(b.data.name.zh, 'zh'));
}

/** 所有谜题，按题型、再按 id 排序（id 中的数字按数值比较） */
export async function getPuzzles(): Promise<Puzzle[]> {
  const puzzles = await getCollection('puzzles');
  return puzzles.sort(
    (a, b) =>
      a.data.genre.id.localeCompare(b.data.genre.id) ||
      a.id.localeCompare(b.id, undefined, { numeric: true }),
  );
}

export function puzzleUrl(p: Puzzle): string {
  return url(`puzzles/${p.id}/`);
}

/** 生成题目缩略图（构建时压缩为 webp） */
export async function thumbnail(p: Puzzle) {
  return getImage({ src: p.data.question, width: 360, format: 'webp' });
}

/** 题库页用的精简索引，由浏览器端脚本进行筛选与分页 */
export interface PuzzleIndexItem {
  id: string;
  href: string;
  thumb: string;
  title: string;
  genre: string;
  genreName: string;
  author: string;
  source: string;
  difficulty: number; // 0 表示未标注
  tags: string[];
  size: string;
  date: string;
}

export async function buildIndex(): Promise<PuzzleIndexItem[]> {
  const [puzzles, genres] = await Promise.all([getPuzzles(), getGenres()]);
  const genreName = new Map(genres.map((g) => [g.id, g.data.name.zh]));
  return Promise.all(
    puzzles.map(async (p) => ({
      id: p.id,
      href: puzzleUrl(p),
      thumb: (await thumbnail(p)).src,
      title: p.data.title,
      genre: p.data.genre.id,
      genreName: genreName.get(p.data.genre.id) ?? p.data.genre.id,
      author: p.data.author ?? '',
      source: p.data.source ?? '',
      difficulty: p.data.difficulty ?? 0,
      tags: p.data.tags,
      size: p.data.size ?? '',
      date: p.data.date ? p.data.date.toISOString().slice(0, 10) : '',
    })),
  );
}
