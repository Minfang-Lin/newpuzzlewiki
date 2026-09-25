/** 给站内路径加上 base 前缀，例如 url('puzzles/') -> /newpuzzlewiki/puzzles/ */
export function url(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}

export function stars(n?: number): string {
  return n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '';
}
