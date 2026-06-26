import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { productService } from "@/services/products/productService";
import { messageService } from "@/services/messages/messageService";
import { useAuthStore } from "@/store/auth/authStore";
import { triggerNotification } from "@/services/notifications/triggerService";
import { reportService } from "@/services/reports/reportService";
import { useRecentlyViewed } from "@/hooks/useRecentlyviewed";
import type { Tables } from "@/types/database/database.types";
import {
  ArrowLeft, MessageCircle, Share2, Loader2, ShieldCheck, Flag
} from "lucide-react";

type Product = Tables<"products">;
type Profile = Tables<"profiles">;

type ProductWithSeller = Product & {
  seller?: Pick<Profile, "id" | "full_name" | "avatar_url" | "is_verified">;
};

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const [product, setProduct] = useState<ProductWithSeller | null>(null);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);
  const { addToRecent } = useRecentlyViewed();

  useEffect(() => {
    if (!id) return;
    productService.getProductWithSeller(id).then((data) => {
      setProduct(data);
      setLoading(false);

      // Add to recently viewed
      addToRecent({
        id: data.id,
        type: "product",
        title: data.title,
        imageUrl: data.image_url,
      });
    }).catch(() => setLoading(false));
  }, [id, addToRecent]);

  const handleContactSeller = async () => {
    if (!user || !product) return;
    setContacting(true);
    try {
      const existing = (await messageService.getConversations(user.id))
        .find(c => (c.user1_id === user.id && c.user2_id === product.seller_id) ||
                   (c.user2_id === user.id && c.user1_id === product.seller_id));
      let convId = existing?.id;
      if (!convId) {
        const newConv = await messageService.createConversation(user.id, product.seller_id);
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
    if (!user) return;
    const reason = prompt("Why are you reporting this listing?");
    if (reason) {
      try {
        await reportService.submitReport(user.id, "product", product!.id, reason);
        alert("Report submitted. Thank you.");
      } catch (err) {
        console.error(err);
        alert("Failed to submit report.");
      }
    }
  };

  const handleToggleStock = async () => {
    if (!product) return;
    const newStatus = product.in_stock === false;
    await productService.toggleStock(product.id, newStatus);
    setProduct({ ...product, in_stock: newStatus });
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>;
  if (!product) return <div className="text-center py-10 text-sm">Product not found.</div>;

  const isOwner = user?.id === product.seller_id;

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
           style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
        <button onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-sm font-bold" style={{ color: "var(--color-primary)" }}>Detail</h1>
        <div className="flex items-center gap-2">
          {!isOwner && (
            <button onClick={handleReport} aria-label="Report listing">
              <Flag size={18} style={{ color: "var(--color-text-muted)" }} />
            </button>
          )}
          <button onClick={() => navigator.share?.({ title: product.title, text: product.description ?? "", url: window.location.href })}
                  aria-label="Share product">
            <Share2 size={18} />
          </button>
        </div>
      </div>
      {product.image_url && <img src={product.image_url} alt={product.title} className="w-full h-64 object-cover" />}
      <div className="px-4 pt-4 pb-8 space-y-4">
        <h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>{product.title}</h2>
        <p className="text-2xl font-extrabold" style={{ color: "var(--color-primary)" }}>K{product.price.toLocaleString()}</p>

        {/* Stock toggle for owner */}
        {isOwner && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>Status:</span>
            <button
              onClick={handleToggleStock}
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                product.in_stock !== false ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}
            >
              {product.in_stock !== false ? "In Stock" : "Out of Stock"}
            </button>
          </div>
        )}

        {/* Stock badge for buyers */}
        {!isOwner && (
          <span className={`badge ${product.in_stock !== false ? "badge-green" : "bg-red-100 text-red-700"}`}>
            {product.in_stock !== false ? "In Stock" : "Out of Stock"}
          </span>
        )}

        {product.description && <p className="text-sm" style={{ color: "var(--color-text)" }}>{product.description}</p>}
        {product.seller && (
  <div className="card p-4 flex items-center gap-4">
    <Link to={`/user/${product.seller.id}`} className="flex-shrink-0">
      {product.seller.avatar_url ? (
        <img src={product.seller.avatar_url} alt="" className="w-10 h-10 rounded-full" />
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
          <button onClick={async () => { if (confirm("Delete?")) { await productService.deleteProduct(product.id); navigate(-1); } }}
                  className="w-full py-2 rounded-lg text-sm font-semibold bg-red-100 text-red-600"
                  aria-label="Delete listing">
            Delete Listing
          </button>
        )}
      </div>
    </div>
  );
}