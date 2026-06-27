import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { shopService } from "@/services/shop/shopService";
import { shopReviewService } from "@/services/shop/shopReviewService";
import { Loader2, Plus, UserPlus, Star } from "lucide-react";
import ProductCard from "@/features/marketplace/components/ProductCard";
import type { Tables } from "@/types/database/database.types";

type Product = Tables<"products">;

interface Shop {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  owner_id: string;
  products: Product[];
}

export default function ShopPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [shop, setShop] = useState<Shop | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await shopService.getShop(id);
        setShop(data as any);
        const revs = await shopReviewService.getReviews(id);
        setReviews(revs);
        const avg = await shopReviewService.getAverageRating(id);
        setAvgRating(avg);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleAddCollaborator = async () => {
    const userId = prompt("Enter user ID to add as collaborator:");
    if (userId && shop) {
      await shopService.addCollaborator(shop.id, userId);
      // Refresh shop data
      const refreshed = await shopService.getShop(shop.id);
      setShop(refreshed as any);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !shop) return;
    setSubmittingReview(true);
    try {
      await shopReviewService.createReview(user.id, shop.id, reviewRating, reviewComment.trim() || undefined);
      const revs = await shopReviewService.getReviews(shop.id);
      setReviews(revs);
      const avg = await shopReviewService.getAverageRating(shop.id);
      setAvgRating(avg);
      setReviewComment("");
      setReviewRating(5);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
  if (!shop) return <div className="text-center py-10">Shop not found.</div>;

  const isOwner = user?.id === shop.owner_id;

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
           style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
        <button onClick={() => navigate(-1)} className="p-1">←</button>
        <h1 className="text-base font-bold">{shop.name}</h1>
        {isOwner && (
          <button onClick={() => navigate(`/shop/${shop.id}/add-product`)} className="btn-primary w-auto px-3 py-1 text-xs">
            <Plus size={14} /> Add Product
          </button>
        )}
      </div>
      <div className="px-4 pt-4">
        {shop.description && <p className="text-sm mb-4">{shop.description}</p>}

        {/* Average Rating */}
        {avgRating > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <Star size={16} style={{ color: "var(--color-accent)", fill: "var(--color-accent)" }} />
            <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{avgRating}</span>
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>({reviews.length} reviews)</span>
          </div>
        )}

        {isOwner && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2">Collaborators</h3>
            <button onClick={handleAddCollaborator} className="btn-ghost text-xs">
              <UserPlus size={14} /> Add Collaborator
            </button>
          </div>
        )}

        <h3 className="section-title">Products ({shop.products?.length || 0})</h3>
        <div className="grid grid-cols-2 gap-3">
          {shop.products?.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        {/* Reviews Section */}
        <div className="mt-6">
          <h3 className="section-title">Reviews ({reviews.length})</h3>

          {/* Review Form */}
          {!isOwner && user && (
            <form onSubmit={handleSubmitReview} className="card p-4 mb-4 space-y-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-0.5"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      size={20}
                      fill={star <= reviewRating ? "var(--color-accent)" : "none"}
                      style={{ color: star <= reviewRating ? "var(--color-accent)" : "var(--color-text-muted)" }}
                    />
                  </button>
                ))}
              </div>
              <textarea
                className="input-field resize-none text-sm"
                rows={2}
                placeholder="Write a review… (optional)"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
              <button type="submit" disabled={submittingReview} className="btn-primary">
                {submittingReview ? <Loader2 size={16} className="animate-spin" /> : "Submit Review"}
              </button>
            </form>
          )}

          {/* Review List */}
          {reviews.map((review) => (
            <div key={review.id} className="card p-4 mb-2">
              <div className="flex items-center gap-2 mb-1">
                {review.reviewer?.avatar_url ? (
                  <img src={review.reviewer.avatar_url} className="w-6 h-6 rounded-full" alt="" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                    {(review.reviewer?.full_name?.[0] ?? "?")}
                  </div>
                )}
                <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                  {review.reviewer?.full_name ?? "Unknown"}
                </span>
                <div className="flex gap-0.5">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} size={12} fill="var(--color-accent)" style={{ color: "var(--color-accent)" }} />
                  ))}
                </div>
              </div>
              {review.comment && (
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{review.comment}</p>
              )}
              <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                {new Date(review.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}