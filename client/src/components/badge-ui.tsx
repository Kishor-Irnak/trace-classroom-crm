import { Badge as BadgeDef, BADGES } from "@/lib/badges";
import { cn } from "@/lib/utils";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";

interface BadgeIconProps {
  badgeId: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
}

export function BadgeIcon({
  badgeId,
  size = "md",
  className,
  showLabel = false,
}: BadgeIconProps) {
  const badge = BADGES[badgeId];
  const [isOpen, setIsOpen] = useState(false);

  if (!badge) return null;

  const Icon = badge.icon;

  const sizeClasses = {
    sm: "h-5 w-5 sm:h-6 sm:w-6 p-1",
    md: "h-6 w-6 sm:h-9 sm:w-9 p-1.5 sm:p-2",
    lg: "h-10 w-10 sm:h-14 sm:w-14 p-2 sm:p-3",
  };

  const iconSizes = {
    sm: "h-3 w-3 sm:h-3.5 sm:w-3.5",
    md: "h-3.5 w-3.5 sm:h-5 sm:w-5",
    lg: "h-5 w-5 sm:h-8 sm:w-8",
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/10 transition-transform active:scale-95 cursor-pointer shadow-sm hover:shadow-md hover:ring-2",
              badge.color, // Apply color schema (bg + text)
              sizeClasses[size],
              showLabel && "px-3 w-auto h-auto py-1", // Adjust shape if label shown
              className
            )}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen); // Toggle tooltip on click
            }}
            onMouseEnter={() => setIsOpen(true)} // Show on hover (desktop)
            onMouseLeave={() => setIsOpen(false)} // Hide on hover out (desktop)
          >
            {badge.imageSrc ? (
              <img
                src={badge.imageSrc}
                alt={badge.label}
                className={cn(iconSizes[size], "object-contain")}
              />
            ) : (
              <Icon className={cn(iconSizes[size])} strokeWidth={2.5} />
            )}
            {showLabel && (
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                {badge.label}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipPrimitive.Portal>
          <TooltipContent
            side="top"
            className="max-w-[200px] text-center p-3 space-y-1 z-50 bg-popover/95 backdrop-blur-sm shadow-xl"
            onPointerDownOutside={() => setIsOpen(false)} // Close when clicking outside
          >
            <p className="font-bold text-xs uppercase tracking-wide text-popover-foreground">
              {badge.label}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium leading-tight">
              {badge.description}
            </p>
          </TooltipContent>
        </TooltipPrimitive.Portal>
      </Tooltip>
    </TooltipProvider>
  );
}

export function BadgeList({
  badges,
  limit,
  size = "sm",
  className,
}: {
  badges: string[];
  limit?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  if (!badges || badges.length === 0) return null;

  const displayBadges = limit ? badges.slice(0, limit) : badges;
  const remainingBadges = limit ? badges.slice(limit) : [];
  const remainingCount = remainingBadges.length;

  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
      {displayBadges.map((id) => (
        <BadgeIcon key={id} badgeId={id} size={size} />
      ))}
      {remainingCount > 0 && (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[10px] sm:text-xs text-muted-foreground font-medium pl-1 cursor-default hover:text-foreground transition-colors">
                +{remainingCount}
              </span>
            </TooltipTrigger>
            <TooltipPrimitive.Portal>
              <TooltipContent
                side="top"
                className="z-50 bg-popover/95 backdrop-blur-sm shadow-md p-2"
              >
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                    More Badges
                  </p>
                  {remainingBadges.map((id) => (
                    <div key={id} className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span className="text-xs font-medium">
                        {BADGES[id]?.label || "Unknown"}
                      </span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </TooltipPrimitive.Portal>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
