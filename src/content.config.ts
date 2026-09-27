import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// 题型百科：src/content/genres/<id>.md
const genres = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/genres' }),
  schema: ({ image }) => z.object({
    name: z.object({
      zh: z.string(),
      ja: z.string().optional(),
      en: z.string().optional(),
    }),
    aliases: z.array(z.string()).default([]),
    inventor: z.string().optional(),
    category: z.string().optional(), // 例如：涂黑类、连线类、数字填入类
    summary: z.string(), // 一句话简介，显示在卡片上
    example: image().optional(), // 例题
    exampleAnswer: image().optional(), // 例题解答
    links: z.array(z.object({ label: z.string(), url: z.url() })).default([]),
  }),
});

// 谜题：src/content/puzzles/<genre>/<id>.yaml，题目/答案图片与 yaml 放在同一目录
const puzzles = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: './src/content/puzzles' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      genre: reference('genres'),
      question: image(),
      answer: image().optional(),
      author: z.string().optional(),
      source: z.string().optional(), // 出处名称，例如「稲葉パズル」
      url: z.url().optional(), // 原题链接
      difficulty: z.number().int().min(1).max(5).optional(),
      size: z.string().optional(), // 盘面尺寸，例如 "10x10"
      tags: z.array(z.string()).default([]),
      date: z.coerce.date().optional(), // 收录或发表日期
      notes: z.string().optional(), // 个人点评
    }),
});

export const collections = { genres, puzzles };
