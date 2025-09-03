"use client";
import { useTransition } from "react";

type Props = {
  reviewId: string;
  approved: boolean;
  disabled?: boolean;
  reason?: string;
};

export default function ApprovalButton({
  reviewId,
  approved,
  disabled = false,
  reason,
}: Props) {
  const [pending, startTransition] = useTransition();

  async function onToggle() {
    if (disabled || pending) return;

    startTransition(async () => {
      try {
        const response = await fetch("/api/selection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewId, approved: !approved }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          console.error("Approval failed:", error.message);
          alert(`Error: ${error.message}`);
          return;
        }
        
        // Refresh page to show updated state
        window.location.reload();
      } catch (error) {
        console.error("Network error:", error);
        alert("Network error occurred. Please try again.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled || pending}
      title={disabled ? reason : undefined}
      className="btn"
      aria-disabled={disabled || pending}
      style={{
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {pending ? "..." : approved ? "Unapprove" : "Approve"}
    </button>
  );
}
