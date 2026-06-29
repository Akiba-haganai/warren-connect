import { useEffect, useState } from "react";
import { adminService } from "@/services/admin/adminService";
import { supabase } from "@/lib/supabase/client";
import { Loader2, Search, EyeOff, Trash2, Star } from "lucide-react";

type ContentType = "posts" | "products" | "accommodations";

export default function AdminContentPage() {
  const [contentType, setContentType] = useState<ContentType>("posts");
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      let data;
      if (contentType === "posts") data = await adminService.getAllPosts(search);
      else if (contentType === "products") data = await adminService.getAllProducts(search);
      else data = await adminService.getAllAccommodations(search);
      setItems(data || []);
      setLoading(false);
    })();
  }, [contentType, search]);

  const handleHide = async (id: string) => {
    if (contentType === "posts") await adminService.hidePost(id, true);
    else if (contentType === "products") await adminService.hideProduct(id, true);
    else await adminService.hideAccommodation(id, true);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_hidden: true } : i)));
    alert(`${contentType.slice(0, -1)} hidden.`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Permanently delete this ${contentType.slice(0, -1)}?`)) return;
    if (contentType === "posts") await adminService.deletePost(id);
    else if (contentType === "products") await adminService.deleteProduct(id);
    else await adminService.deleteAccommodation(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleFeature = async (id: string, currentFeatured: boolean) => {
    const table = contentType === "posts" ? "posts" : contentType === "products" ? "products" : "accommodations";
    const newValue = !currentFeatured;
    const { error } = await supabase.from(table).update({ featured: newValue }).eq("id", id);
    if (!error) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, featured: newValue } : i)));
    }
  };

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>Content</h1>
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
          <input className="input-field pl-9" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={contentType} onChange={(e) => setContentType(e.target.value as ContentType)} className="input-field w-auto text-sm">
          <option value="posts">Posts</option>
          <option value="products">Products</option>
          <option value="accommodations">Accommodations</option>
        </select>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
      ) : (
        items.map((item) => (
          <div key={item.id} className="card p-4 flex justify-between items-center">
            <p className="text-sm line-clamp-2 flex-1">
              {contentType === "posts" ? item.content : item.title} {item.price ? `– K${item.price}` : item.monthly_rent ? `– K${item.monthly_rent}/mo` : ""}
            </p>
            <div className="flex gap-2 ml-2">
              <button onClick={() => handleFeature(item.id, item.featured)} className={`text-xs px-2 py-1 rounded ${item.featured ? "bg-yellow-300 text-yellow-900" : "bg-yellow-100 text-yellow-800"}`}>
                <Star size={12} /> {item.featured ? "Unfeature" : "Feature"}
              </button>
              <button onClick={() => handleHide(item.id)} className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                <EyeOff size={12} /> Hide
              </button>
              <button onClick={() => handleDelete(item.id)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}