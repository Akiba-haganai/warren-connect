import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useProduct } from "@/hooks/useProduct";
import { useToggleProductStock } from "@/hooks/useToggleProductStock";
import { useDeleteProduct } from "@/hooks/useDeleteProduct";
import { messageService } from "@/services/messages/messageService";
import { useAuthStore } from "@/store/auth/authStore";
import { triggerNotification } from "@/services/notifications/triggerService";
import { reportService } from "@/services/reports/reportService";
import { useRecentlyViewed } from "@/hooks/useRecentlyviewed";
import { productService } from "@/services/products/productService";
import { storageService } from "@/services/storage/storageService";
import { timeAgo } from "@/utils/timeAgo";
import {
  ArrowLeft, MessageCircle, Share2, Loader2, ShieldCheck, Flag, ShoppingBag, ChevronLeft, ChevronRight, Lock, Pencil
} from "lucide-react";
import EditProductModal from "@/features/marketplace/components/EditProductModal";
import ShareModal from "@/components/share/ShareModal";
import ItemSocialBar from "@/components/shared/ItemSocialBar";
import { useSEOHead } from "@/hooks/useSEOHead";
import { useQueryClient } from "@tanstack/react-query";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const { data: product, isLoading } = useProduct(id);
  const toggleStock = useToggleProductStock();
  const deleteProduct = useDeleteProduct();
  const [contacting, setContacting] = useState(false);
  const { addToRecent } = useRecentlyViewed();
  const [images, setImages] = useState<{ id: string; image_url: string }[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const location = useLocation();

  useSEOHead({
    title: product ? `${product.title} — K${Number(product.price).toLocaleString()}` : undefined,
    description: product?.description || "Find amazing student deals on PLAWZA Marketplace.",
    image: product?.image_url || undefined,
    category: "product",
  });

  useEffect(() => {
    if (product) {
      addToRecent({
        id: product.id,
        type: "product",
        title: product.title,
        imageUrl: product.image_url,
        price: product.price,
      });
      productService.getProductImages(product.id).then((imgs) => {
        const resolvedImgs = imgs.map((img) => ({
          ...img,
          image_url: storageService.getPublicUrl("product-images", img.image_url),
        }));
        const primaryUrl = product.image_url
          ? storageService.getPublicUrl("product-images", product.image_url)
          : null;
        const allImages = primaryUrl
          ? [{ id: "primary", image_url: primaryUrl }, ...resolvedImgs]
          : resolvedImgs;
        setImages(allImages);
      });
    }
  }, [product, addToRecent]);

  const requireAuth = () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return false;
    }
    return true;
  };

  const handleContactSeller = async () => {
    if (!requireAuth() || !product) return;
    setContacting(true);
    try {
      const existing = (await messageService.getConversations(user!.id))
        .find(c => (c.user1_id === user!.id && c.user2_id === product.seller_id) ||
                   (c.user2_id === user!.id && c.user1_id === product.seller_id));
      let convId = existing?.id;
      if (!convId) {
        const newConv = await messageService.createConversation(user!.id, product.seller_id);
        convId = newConv.id;
      }
      triggerNotification.accommodationInterest(
        product.seller_id,
        product.id,
        product.title,
        profile?.full_name ?? "Someone"
      );
      navigate(`/messages?conversation=${convId}`);
    } finally { setContacting(false); }
  };

  const handleReport = async () => {
    if (!requireAuth() || !product) return;
    const reason = prompt("Why are you reporting this listing?");
    if (reason) {
      try {
        await reportService.submitReport(user!.id, "product", product!.id, reason);
        alert("Report submitted. Thank you.");
      } catch (err) {
        console.error(err);
        alert("Failed to submit report.");
      }
    }
  };

  const handleToggleStock = () => {
    if (!product) return;
    toggleStock.mutate({
      productId: product.id,
      newStatus: !(product.in_stock ?? false),
    });
  };

  const handleDelete = async () => {
    if (!product) return;
    if (confirm("Delete this product?")) {
      deleteProduct.mutate(product.id, {
        onSuccess: () => navigate(-1),
      });
    }
  };

  const nextImage = () => {
    if (images.length === 0) return;
    setSelectedImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    if (images.length === 0) return;
    setSelectedImage((prev) => (prev - 1 + images.length) % images.length);
  };

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>;
  if (!product) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 px-4">
      <p className="text-sm text-center" style={{ color: "var(--color-text-muted)" }}>This item could not be found or has been removed.</p>
      <button onClick={() => navigate("/marketplace")} className="btn-primary w-auto px-6">← Back to Marketplace</button>
    </div>
  );

  const isOwner = user?.id === product.seller_id;
  const isEdited = (product as any).updated_at && product.created_at && (
    new Date((product as any).updated_at).getTime() - new Date(product.created_at).getTime() > 60000
  );

  const primaryDisplayUrl = product.image_url
    ? storageService.getPublicUrl("product-images", product.image_url)
    : null;

  return (
    <div className="pb-24" style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-border bg-surface/90 backdrop-blur-md">
        <button onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-sm font-bold text-primary">Listing Detail</h1>
        <div className="flex items-center gap-2">
          {isOwner && (
            <button onClick={() => setShowEditModal(true)} className="p-1 text-primary hover:opacity-80" aria-label="Edit listing" title="Edit Listing">
              <Pencil size={18} />
            </button>
          )}
          {!isOwner && (
            <button onClick={handleReport} aria-label="Report listing">
              <Flag size={18} style={{ color: "var(--color-text-muted)" }} />
            </button>
          )}
          <button onClick={() => setShareModalOpen(true)} aria-label="Share product">
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {/* Image Gallery */}
      {images.length > 0 ? (
        <div className="relative bg-black">
          <img
            src={images[selectedImage]?.image_url}
            alt={product.title}
            className="w-full h-72 object-contain"
            loading="lazy"
          />
          {images.length > 1 && (
            <>
              <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center">
                <ChevronLeft size={20} />
              </button>
              <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center">
                <ChevronRight size={20} />
              </button>
              <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                {selectedImage + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      ) : primaryDisplayUrl ? (
        <img src={primaryDisplayUrl} alt={product.title} className="w-full h-72 object-cover" />
      ) : (
        <div className="w-full h-72 flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))" }}>
          <ShoppingBag size={48} color="rgba(255,255,255,0.3)" />
        </div>
      )}

      {/* Thumbnails row */}
      {images.length > 1 && (
        <div className="flex gap-2 px-4 mt-2 overflow-x-auto hide-scrollbar pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setSelectedImage(i)}
              className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 ${
                i === selectedImage ? "border-primary" : "border-transparent"
              }`}
              style={{ borderColor: i === selectedImage ? "var(--color-primary)" : "transparent" }}
            >
              <img src={img.image_url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="px-4 pt-4 pb-8 space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>{product.title}</h2>
            {isEdited && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium shrink-0">
                Edited {timeAgo((product as any).updated_at)}
              </span>
            )}
          </div>
          <p className="text-2xl font-extrabold mt-1" style={{ color: "var(--color-primary)" }}>K{(product.price ?? 0).toLocaleString()}</p>
          <div className="flex flex-col gap-0.5 mt-2">
            {product.created_at && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Listed: {new Date(product.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            )}
            {isEdited && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Updated: {new Date((product as any).updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {/* Stock toggle for owner */}
        {isOwner && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-surface border border-border">
            <span className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>Stock Availability</span>
            <button
              onClick={handleToggleStock}
              disabled={toggleStock.isPending}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                product.in_stock !== false ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
              } disabled:opacity-50`}
            >
              {toggleStock.isPending && toggleStock.variables?.productId === product.id ? (
                <Loader2 size={12} className="animate-spin inline" />
              ) : product.in_stock !== false ? (
                "In Stock"
              ) : (
                "Out of Stock"
              )}
            </button>
          </div>
        )}

        {/* Stock badge for buyers */}
        {!isOwner && (
          <span className={`badge ${product.in_stock !== false ? "badge-green" : "bg-red-100 text-red-700"}`}>
            {product.in_stock !== false ? "In Stock" : "Out of Stock"}
          </span>
        )}

        {product.description && <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">{product.description}</p>}

        {/* Student Buyer Protection & Escrow Trust Card */}
        <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10 space-y-2">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs">
            <ShieldCheck size={16} />
            <span>Student Buyer Guarantee &amp; Escrow Safety</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
            Transactions are protected. Always inspect items in public campus areas before finalizing payment. Instant report &amp; dispute protection included.
          </p>
          <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1"><Lock size={11} className="text-emerald-500" /> Verified Seller ID</span>
            <span>•</span>
            <span>Campus Safe Zone</span>
          </div>
        </div>

        {product.seller && (
          <div className="card p-4 flex items-center gap-4">
            <Link to={`/user/${product.seller.id}`} className="flex-shrink-0">
              {product.seller.avatar_url ? (
                <img src={product.seller.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                  {(product.seller.full_name?.[0] ?? "?")}
                </div>
              )}
            </Link>
            <div className="flex-1">
              <Link to={`/user/${product.seller.id}`} className="font-semibold text-sm flex items-center gap-1" style={{ color: "var(--color-text)" }}>
                {product.seller.full_name}
                {product.seller.is_verified && <ShieldCheck size={14} style={{ color: "var(--color-accent)" }} />}
              </Link>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{product.seller.is_verified ? "Verified" : "Unverified"}</p>
            </div>
            {!isOwner && (
              <button onClick={handleContactSeller} disabled={contacting} className="btn-primary w-auto px-4 py-2 text-sm" aria-label="Contact seller">
                {contacting ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />} Contact
              </button>
            )}
          </div>
        )}

        {isOwner && (
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors flex items-center justify-center gap-1.5"
            >
              <Pencil size={14} /> Edit Listing
            </button>
            <button
              onClick={handleDelete}
              className="py-2.5 px-4 rounded-xl text-xs font-bold bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900 hover:bg-red-200 transition-colors"
              aria-label="Delete listing"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {showEditModal && (
        <EditProductModal
          product={product}
          onClose={() => setShowEditModal(false)}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ["product", product.id] });
            queryClient.invalidateQueries({ queryKey: ["products"] });
          }}
        />
      )}

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title={product.title}
        price={product.price}
        imageUrl={primaryDisplayUrl || undefined}
        category="product"
      />

      <ItemSocialBar
        itemId={product.id}
        type="product"
        onShare={() => setShareModalOpen(true)}
        getStats={productService.getSocialStats}
        toggleLike={productService.toggleLike}
        getComments={productService.getComments}
        createComment={productService.createComment}
        requireAuth={requireAuth}
        onCommentAdded={() => {
          if (product.seller_id !== user?.id) {
            triggerNotification.comment(product.seller_id, product.id, profile?.full_name ?? "Someone");
          }
        }}
      />
    </div>
  );
}