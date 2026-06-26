import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { Link } from "react-router-dom";
import { Flame } from "lucide-react";

interface TrendingPost {
  post_id: string;
  like_count?: number;
  likes_count?: number;
  content?: string;
}

export default function TrendingRow() {
  const { data: trendingPosts } = useQuery<TrendingPost[]>({
    queryKey: ["trending"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_trending_posts", {
        limit_count: 5,
      });
      if (error || !data) return [];
      // Normalise the count to `like_count` so the UI can use a single key
      return (data as any[]).map((d) => ({
        ...d,
        like_count: d.like_count ?? d.likes_count ?? 0,
      }));
    },
    staleTime: 1000 * 60 * 10,
  });

  if (!trendingPosts?.length) return null;

  return (
    <div className="px-4 pt-3 pb-2">
      <h3 className="section-title flex items-center gap-1">
        <Flame size={14} style={{ color: "var(--color-accent)" }} />
        Trending
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {trendingPosts.map((post) => (
          <Link
            key={post.post_id}
            to={`/post/${post.post_id}`}
            className="card flex-shrink-0 w-40 p-3 text-left"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <p
              className="text-xs line-clamp-3 font-medium"
              style={{ color: "var(--color-text)" }}
            >
              {post.content || `${post.like_count} likes this week`}
            </p>
            <p
              className="text-[10px] mt-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              ❤️ {post.like_count} likes
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}