import { cn } from "@workspace/ui/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative rounded-xl overflow-hidden bg-muted/70 dark:bg-muted/40",
        className
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -translate-x-full"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, oklch(1 0 0 / 0.06) 50%, transparent 100%)",
          animation: "shimmer 1.8s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}

export { Skeleton }
