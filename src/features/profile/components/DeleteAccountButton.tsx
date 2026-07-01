import { useState } from "react";
import { useAuthStore } from "@/store/auth/authStore";
import { profileService } from "@/services/profiles/profileService";
import { useNavigate } from "react-router-dom";
import { Trash2, Loader2 } from "lucide-react";

export default function DeleteAccountButton() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRequest = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      await profileService.requestAccountDeletion(user.id);
      alert("Deletion request submitted. You'll be logged out.");
      // Reset entire auth store
      useAuthStore.setState({ user: null, session: null, profile: null, loading: false });
      navigate("/");
    } catch (err: any) {
      alert(err.message || "Failed to submit deletion request.");
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full py-3 rounded-xl text-sm font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
        >
          <Trash2 size={16} className="inline mr-2" />
          Delete Account
        </button>
      ) : (
        <div className="card p-4 space-y-3">
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            Are you sure you want to delete your account?
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            Your data will be permanently removed after admin approval.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleRequest}
              disabled={submitting}
              className="flex-1 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : "Yes, delete my account"}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold border border-gray-200"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}