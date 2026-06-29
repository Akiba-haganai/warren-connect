import { useEffect, useState } from "react";
import { adminService } from "@/services/admin/adminService";
import { Loader2 } from "lucide-react";

export default function AdminTagsPage() {
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getAllTags().then(setTags).finally(() => setLoading(false));
  }, []);

  const handleCreateTag = async () => {
    const name = prompt("Enter tag name:");
    if (!name) return;
    await adminService.createTag(name);
    setTags(await adminService.getAllTags());
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm("Delete this tag?")) return;
    await adminService.deleteTag(tagId);
    setTags((prev) => prev.filter((t) => t.id !== tagId));
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>Tags</h1>
      <button onClick={handleCreateTag} className="btn-primary w-auto px-4">+ Create Tag</button>
      <div className="grid grid-cols-2 gap-3">
        {tags.map((tag) => (
          <div key={tag.id} className="card p-3 flex justify-between items-center">
            <span className="text-sm font-medium">{tag.name}</span>
            <button onClick={() => handleDeleteTag(tag.id)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}