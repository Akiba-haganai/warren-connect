import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { shopService } from "@/services/shop/shopService";
import { useAuthStore } from "@/store/auth/authStore";
import { Loader2, AlertCircle } from "lucide-react";

export default function ShopJoinPage() {
  const { id: shopId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token || !shopId || !user) {
      setStatus("error");
      setErrorMsg("Invalid link or you are not logged in.");
      return;
    }

    (async () => {
      try {
        const verifiedShopId = await shopService.verifyInviteToken(token);
        if (verifiedShopId !== shopId) {
          throw new Error("Token is invalid or expired.");
        }
        await shopService.addCollaborator(shopId, user.id);
        setStatus("success");
        setTimeout(() => navigate(`/shop/${shopId}`), 1500);
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(err.message);
      }
    })();
  }, [searchParams, shopId, user, navigate]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-4"
      style={{ background: "var(--color-bg)" }}
    >
      {status === "loading" && (
        <>
          <Loader2 className="animate-spin mb-4" size={32} style={{ color: "var(--color-primary)" }} />
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Joining shop...
          </p>
        </>
      )}
      {status === "success" && (
        <div className="text-center">
          <div className="text-green-500 text-3xl mb-2">✓</div>
          <p className="font-semibold" style={{ color: "var(--color-text)" }}>
            Successfully joined!
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Redirecting to shop...
          </p>
        </div>
      )}
      {status === "error" && (
        <div className="text-center">
          <AlertCircle size={32} className="mx-auto mb-2" style={{ color: "var(--color-error)" }} />
          <p className="font-semibold" style={{ color: "var(--color-text)" }}>
            Failed to join
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {errorMsg}
          </p>
          <button onClick={() => navigate("/marketplace")} className="btn-primary mt-4">
            Go to Marketplace
          </button>
        </div>
      )}
    </div>
  );
}