import type { Tables } from '../database/database.types';

export type Post = Tables<'posts'>;
export type PostComment = Tables<'post_comments'>;
export type PostLike = Tables<'post_likes'>;