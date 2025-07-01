import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

type RatingBadgeProps = {
  rating: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  type?: "pill" | "badge" | "block";
};

export function RatingBadge({ 
  rating, 
  className,
  size = "md",
  type = "badge"
}: RatingBadgeProps) {
  // Ensure rating is between 0 and 10
  const safeRating = Math.min(10, Math.max(0, rating));
  
  // Format rating to have one decimal place if not a whole number
  const formattedRating = safeRating % 1 === 0 ? safeRating.toString() : safeRating.toFixed(1);
  
  if (type === "pill") {
    return (
      <div className={cn(
        "absolute top-2 right-2 bg-primary/90 text-white text-xs rounded-full px-1.5 py-0.5 font-medium",
        className
      )}>
        <span>{formattedRating}</span>
      </div>
    );
  }
  
  if (type === "block") {
    return (
      <div className={cn(
        "bg-primary text-white font-bold rounded-md px-2 py-1 text-sm",
        className
      )}>
        {formattedRating}
      </div>
    );
  }
  
  // Default is badge
  return (
    <div className={cn(
      "bg-primary/10 text-primary rounded-full font-medium flex items-center",
      {
        "px-2 py-0.5 text-xs": size === "sm",
        "px-2.5 py-1 text-sm": size === "md",
        "px-3 py-1.5 text-base": size === "lg",
      },
      className
    )}>
      <Star className={cn(
        "mr-1 fill-current",
        {
          "w-3 h-3": size === "sm",
          "w-4 h-4": size === "md",
          "w-5 h-5": size === "lg",
        }
      )} />
      <span>{formattedRating}</span>
    </div>
  );
}
