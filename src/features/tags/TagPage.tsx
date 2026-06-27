import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import PostCard from "@/features/feed/components/PostCard";
import ProductCard from "@/features/marketplace/components/ProductCard";
import AccommodationCard from "@/features/accommodation/components/AccommodationCard";
import type { FeedPost } from "@/services/posts/postService";
import type { Tables } from "@/types/database/database.types";
import { Loader2, Hash } from "lucide-react";

export default function TagPage() {
  const { tagName } = useParams<{ tagName: string }>();

  const { data: tag } = useQuery({
    queryKey: ["tag", tagName],
    queryFn: async () => {
      if (!tagName) return null;                              // guard
      const { data } = await supabase
        .from("tags")
        .select("*")
        .eq("name", tagName)
        .single();
      return data;
    },
    enabled: !!tagName,
  });

  const { data: posts } = useQuery({
    queryKey: ["tag-posts", tag?.id],
    queryFn: async () => {
      if (!tag) return [];
      const { data } = await supabase
        .from("post_tags")
        .select("posts(*)")
        .eq("tag_id", tag.id);
      return (data || []).map((r: any) => r.posts).filter(Boolean) as FeedPost[];
    },
    enabled: !!tag,
  });

  const { data: products } = useQuery({
    queryKey: ["tag-products", tag?.id],
    queryFn: async () => {
      if (!tag) return [];
      const { data } = await supabase
        .from("product_tags")
        .select("products(*)")
        .eq("tag_id", tag.id);
      return (data || []).map((r: any) => r.products).filter(Boolean) as Tables<"products">[];
    },
    enabled: !!tag,
  });

  const { data: accommodations } = useQuery({
    queryKey: ["tag-accommodations", tag?.id],
    queryFn: async () => {
      if (!tag) return [];
      const { data } = await supabase
        .from("accommodation_tags")
        .select("accommodations(*)")
        .eq("tag_id", tag.id);
      return (data || []).map((r: any) => r.accommodations).filter(Boolean) as Tables<"accommodations">[];
    },
    enabled: !!tag,
  });

  if (!tag) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const postList = posts ?? [];
  const productList = products ?? [];
  const accList = accommodations ?? [];

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      <div
        className="sticky top-0 z-10 px-4 py-3"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <h1
          className="text-base font-bold flex items-center gap-1"
          style={{ color: "var(--color-primary)" }}
        >
          <Hash size={16} /> {tag.name}
        </h1>
      </div>

      <div className="px-4 pt-4 pb-8 space-y-6">
        {postList.length > 0 && (
          <section>
            <h3 className="section-title">Posts</h3>
            <div className="flex flex-col gap-3">
              {postList.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        )}

        {productList.length > 0 && (
          <section>
            <h3 className="section-title">Products</h3>
            <div className="grid grid-cols-2 gap-3">
              {productList.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {accList.length > 0 && (
          <section>
            <h3 className="section-title">Accommodations</h3>
            <div className="flex flex-col gap-3">
              {accList.map((acc) => (
                <AccommodationCard key={acc.id} listing={acc} />
              ))}
            </div>
          </section>
        )}

        {postList.length === 0 && productList.length === 0 && accList.length === 0 && (
          <div
            className="rounded-2xl py-16 text-center"
            style={{
              background: "var(--color-surface)",
              border: "1px dashed var(--color-border)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              No content with this tag yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}