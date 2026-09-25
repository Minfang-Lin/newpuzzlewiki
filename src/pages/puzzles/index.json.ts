import type { APIRoute } from 'astro';
import { buildIndex } from '../../lib/puzzles';

// 题库页的数据索引：/puzzles/index.json
export const GET: APIRoute = async () => {
  return new Response(JSON.stringify(await buildIndex()), {
    headers: { 'Content-Type': 'application/json' },
  });
};
