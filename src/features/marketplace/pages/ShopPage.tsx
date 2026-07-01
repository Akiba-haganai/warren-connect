import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { shopService } from "@/services/shop/shopService";
import { shopReviewService } from "@/services/shop/shopReviewService";
import { productService } from "@/services/products/productService";
import { supabase } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2, Plus, Star, UserX, Copy, Check, Users,
  Pencil, Share2, Store, Trash2, ToggleLeft, ToggleRight
} from "lucide-react";
import ProductCard from "@/features/marketplace/components/ProductCard";
import ShopSettingsModal from "@/features/marketplace/components/ShopSettingsModal";
import type { Tables } from "@/types/database/database.types";
import toast from "react-hot-toast";
import { useConfirm } from "@/hooks/useConfirm";

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
  const queryClient = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();

  const [shop, setShop] = useState<Shop | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [isCollaborator, setIsCollaborator] = useState(false);
  const [collabSearch, setCollabSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [addingCollab, setAddingCollab] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const [togglingProductId, setTogglingProductId] = useState<string | null>(null);

  const loadShop = async () => {
    if (!id) return;
    const data = await shopService.getShop(id);
    setShop(data as any);
  };

  const loadReviews = async () => {
    if (!id) return;
    const revs = await shopReviewService.getReviews(id);
    setReviews(revs);
    const avg = await shopReviewService.getAverageRating(id);
    setAvgRating(avg);
  };

  const loadCollaborators = async () => {
    if (!id || !user) return;
    const collabs = await shopService.getCollaborators(id);
    setCollaborators(collabs);
    setIsCollaborator(collabs.some((c) => c.user_id === user.id));
  };

  const loadInviteLink = async () => {
    if (!id || !user || !shop || user.id !== shop.owner_id) return;
    const token = await shopService.generateInviteToken(shop.id, user.id);
    setInviteLink(`${window.location.origin}/shop/${shop.id}/join?token=${token}`);
  };

  const refreshAll = async () => {
    await Promise.all([loadShop(), loadReviews(), loadCollaborators()]);
  };

  useEffect(() => {
    setLoading(true);
    refreshAll().finally(() => setLoading(false));
  }, [id, user]);

  useEffect(() => {
    if (shop && user && user.id === shop.owner_id) {
      loadInviteLink();
    }
  }, [shop, user]);

  const isOwner = user?.id === shop?.owner_id;
  const canManageShop = isOwner || isCollaborator;

  const handleToggleStock = async (product: Product) => {
    if (togglingProductId) return;
    const previousStatus = product.in_stock;
    const newStatus = previousStatus === false;
    setTogglingProductId(product.id);
    setShop((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        products: prev.products.map((p) =>
          p.id === product.id ? { ...p, in_stock: newStatus } : p
        ),
      };
    });
    try {
      await productService.toggleStock(product.id, newStatus);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      setShop((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          products: prev.products.map((p) =>
            p.id === product.id ? { ...p, in_stock: previousStatus } : p
          ),
        };
      });
      toast.error("Could not update stock status.");
    } finally {
      setTogglingProductId(null);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const ok = await confirm({
      title: "Delete this product?",
      message: "This cannot be undone.",
    });
    if (!ok) return;
    try {
      await shopService.deleteProduct(productId);
      setShop((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          products: prev.products.filter((p) => p.id !== productId),
        };
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["all-shops"] });
      toast.success("Product deleted.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product.");
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!user) return;
    const ok = await confirm({
      title: "Delete your review?",
      message: "This cannot be undone.",
    });
    if (!ok) return;
    try {
      await shopService.deleteReview(reviewId, user.id);
      await loadReviews();
      toast.success("Review deleted.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete review.");
    }
  };

  const handleSearchUsers = async (query: string) => {
    setCollabSearch(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .ilike("full_name", `%${query}%`)
      .limit(5);
    setSearchResults(profiles || []);
  };

  const handleAddCollaborator = async (userId: string) => {
    if (!shop) return;
    setAddingCollab(true);
    try {
      await shopService.addCollaborator(shop.id, userId);
      await loadCollaborators();
      setCollabSearch("");
      setSearchResults([]);
      toast.success("Collaborator added.");
    } catch (err: any) {
      toast.error(err.message || "Failed to add collaborator.");
    } finally {
      setAddingCollab(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!shop) return;
    const ok = await confirm({
      title: "Remove collaborator?",
      message: "They will lose access to manage this shop.",
    });
    if (!ok) return;
    try {
      await shopService.removeCollaborator(shop.id, userId);
      await loadCollaborators();
      toast.success("Collaborator removed.");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove collaborator.");
    }
  };

  const copyInviteLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setInviteCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareData = {
      title: shop?.name ?? "Shop",
      text: shop?.description ?? "",
      url: window.location.href,
    };
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Shop link copied!");
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !shop) return;
    setSubmittingReview(true);
    try {
      await shopReviewService.createReview(user.id, shop.id, reviewRating, reviewComment.trim() || undefined);
      await loadReviews();
      setReviewComment("");
      setReviewRating(5);
      toast.success("Review submitted!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
  if (!shop) return <div className="text-center py-10">Shop not found.</div>;

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
           style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
        <button onClick={() => navigate(-1)} className="p-1" aria-label="Back">←</button>
        <div className="flex items-center gap-2">
          {shop.logo_url ? (
            <img src={shop.logo_url} className="w-6 h-6 rounded-full object-cover" alt="" />
          ) : (
            <Store size={18} style={{ color: "var(--color-text-muted)" }} />
          )}
          <h1 className="text-sm font-bold truncate max-w-[150px]">{shop.name}</h1>
        </div>
        <div className="flex items-center gap-1">
          {isOwner && (
            <button onClick={() => setShowSettings(true)} className="p-1" aria-label="Edit shop">
              <Pencil size={16} />
            </button>
          )}
          <button onClick={handleShare} className="p-1" aria-label="Share shop">
            <Share2 size={16} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 pb-8">
        {shop.description && <p className="text-sm mb-3">{shop.description}</p>}

        {/* Average Rating */}
        <div className="flex items-center gap-2 mb-4">
          <Star size={18} style={{ color: "var(--color-accent)", fill: "var(--color-accent)" }} />
          <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{avgRating || "—"}</span>
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>({reviews.length} reviews)</span>
        </div>

        {canManageShop && (
          <div className="mb-4">
            <button onClick={() => navigate(`/shop/${shop.id}/add-product`)} className="btn-primary w-full text-sm">
              <Plus size={14} /> Add Product
            </button>
          </div>
        )}

        {/* Collaborator section (owner only) */}
        {isOwner && (
          <div className="mb-6 p-4 rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Users size={16} /> Collaborators
              </h3>
              <button onClick={copyInviteLink} className="text-xs flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: "var(--color-bg)", color: "var(--color-text-secondary)" }}>
                {inviteCopied ? <Check size={12} /> : <Copy size={12} />}
                {inviteCopied ? "Copied" : "Invite link"}
              </button>
            </div>

            {collaborators.length > 0 && (
              <ul className="space-y-2 mb-3">
                {collaborators.map((collab) => (
                  <li key={collab.user_id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {collab.profiles?.avatar_url ? (
                        <img src={collab.profiles.avatar_url} className="w-6 h-6 rounded-full" alt="" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                          {(collab.profiles?.full_name?.[0] ?? "?")}
                        </div>
                      )}
                      <span>{collab.profiles?.full_name ?? "Unknown"}</span>
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>({collab.role})</span>
                    </div>
                    <button onClick={() => handleRemoveCollaborator(collab.user_id)} className="text-red-500" aria-label="Remove collaborator">
                      <UserX size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="relative">
              <input
                type="text"
                placeholder="Search user by name..."
                value={collabSearch}
                onChange={(e) => handleSearchUsers(e.target.value)}
                className="input-field text-sm mb-2"
              />
              {searchResults.length > 0 && (
                <div className="absolute z-20 w-full rounded-xl shadow-lg overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                  {searchResults.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => handleAddCollaborator(profile.id)}
                      disabled={addingCollab}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} className="w-6 h-6 rounded-full" alt="" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                          {(profile.full_name?.[0] ?? "?")}
                        </div>
                      )}
                      {profile.full_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!isOwner && isCollaborator && (
          <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <p className="flex items-center gap-2"><Users size={14} /> You are a collaborator</p>
          </div>
        )}

        <h3 className="section-title mb-3">Products ({shop.products?.length || 0})</h3>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {shop.products?.map((product) => (
            <div key={product.id} className="relative group">
              <ProductCard product={product} />
              {canManageShop && (
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {togglingProductId === product.id ? (
                    <div className="bg-white rounded-full p-1 shadow">
                      <Loader2 size={14} className="animate-spin" style={{ color: "var(--color-text-muted)" }} />
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.preventDefault(); handleToggleStock(product); }}
                      className="bg-white rounded-full p-1 shadow"
                      title={product.in_stock !== false ? "Mark out of stock" : "Mark in stock"}
                    >
                      {product.in_stock !== false ? <ToggleRight size={14} style={{ color: "var(--color-success)" }} /> : <ToggleLeft size={14} style={{ color: "var(--color-error)" }} />}
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.preventDefault(); handleDeleteProduct(product.id); }}
                    className="bg-white rounded-full p-1 shadow"
                    title="Delete product"
                  >
                    <Trash2 size={14} style={{ color: "var(--color-error)" }} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {!shop.products?.length && (
            <div className="col-span-2 text-center py-10">
              <Store size={32} style={{ color: "var(--color-text-muted)", margin: "0 auto 8px" }} />
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>No products yet.</p>
              {canManageShop && (
                <button onClick={() => navigate(`/shop/${shop.id}/add-product`)} className="btn-primary mt-3 text-xs">Add first product</button>
              )}
            </div>
          )}
        </div>

        <h3 className="section-title mb-3">Reviews ({reviews.length})</h3>

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

        {reviews.length === 0 ? (
          <div className="text-center py-8">
            <Star size={32} style={{ color: "var(--color-text-muted)", margin: "0 auto 8px" }} />
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              No reviews yet. Be the first!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {reviews.map((review) => (
              <div key={review.id} className="card p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
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
                  {user && review.reviewer_id === user.id && (
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      className="text-red-500"
                      aria-label="Delete my review"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                {review.comment && (
                  <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{review.comment}</p>
                )}
                <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                  {new Date(review.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showSettings && (
        <ShopSettingsModal
          shop={shop}
          onClose={() => setShowSettings(false)}
          onSaved={refreshAll}
        />
      )}
      {ConfirmDialog}
    </div>
  );
}