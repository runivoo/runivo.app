import { POSTS } from '../../content/blog/index';
import type { Category, Post } from './blog';

export { POSTS };

export const getPost = (slug: string): Post | undefined => POSTS.find(p => p.slug === slug);

export const postsIn = (category: Category): Post[] => POSTS.filter(p => p.category === category);

/** The posts to suggest after `post`: its own `next` list, topped up with others from the same category. */
export function nextPosts(post: Post, count = 3): Post[] {
  const picked = (post.next ?? []).map(getPost).filter((p): p is Post => Boolean(p));
  for (const p of POSTS) {
    if (picked.length >= count) break;
    if (p.slug !== post.slug && !picked.includes(p)) picked.push(p);
  }
  return picked.slice(0, count);
}
