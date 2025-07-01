import { Outfit, ClothingItem } from "@shared/schema";
import { RatingBadge } from "@/components/shared/RatingBadge";
import { Trash2, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

type OutfitCardProps = {
  outfit: Outfit;
  clothingItems?: ClothingItem[]; // Items to display if we have them
  onDelete?: () => void;
};

export function OutfitCard({ outfit, clothingItems, onDelete }: OutfitCardProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await apiRequest(`/api/outfits/${outfit.id}`, { method: 'DELETE' });
      queryClient.invalidateQueries({ queryKey: ['/api/outfits'] });
      toast({
        title: "Outfit deleted",
        description: `${outfit.name} has been removed from your outfits.`,
      });
      if (onDelete) onDelete();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete outfit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  // Format relative time like "Added yesterday", "Added 3 days ago"
  const getRelativeTime = (date: Date | string | null) => {
    if (!date) return "Added recently";
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return `Added ${formatDistanceToNow(dateObj, { addSuffix: false })} ago`;
  };

  // Get the proper image source
  const getImageSrc = () => {
    if (!outfit.imageUrl) {
      return null;
    }
    
    // If it's already a data URL, return as is
    if (outfit.imageUrl.startsWith('data:')) {
      return outfit.imageUrl;
    }
    
    // If it's base64 data without the data URL prefix, add it
    if (outfit.imageUrl && !outfit.imageUrl.startsWith('data:') && !outfit.imageUrl.startsWith('http')) {
      // Try to detect the image type from the base64 data
      const firstChar = outfit.imageUrl.charAt(0);
      let mimeType = 'image/jpeg'; // default
      
      // Simple MIME type detection based on base64 prefix
      if (firstChar === 'i') mimeType = 'image/png';
      else if (firstChar === 'R') mimeType = 'image/gif';
      else if (firstChar === 'U') mimeType = 'image/webp';
      
      return `data:${mimeType};base64,${outfit.imageUrl}`;
    }
    
    // If it's a regular URL, return as is
    if (outfit.imageUrl.startsWith('http')) {
      return outfit.imageUrl;
    }
    
    return outfit.imageUrl;
  };

  const imageSrc = getImageSrc();
  
  // Handle image load error with better debugging
  const handleImageError = (error: any) => {
    console.error('Image failed to load for outfit:', outfit.name, {
      imageUrl: outfit.imageUrl,
      imageSrc,
      error
    });
    setImageError(true);
  };

  if (showConfirm) {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition">
        <Alert variant="destructive" className="h-full flex flex-col justify-center border-none">
          <AlertTitle>Are you sure?</AlertTitle>
          <AlertDescription className="mb-2">
            This will permanently delete this outfit.
          </AlertDescription>
          <div className="flex gap-2 mt-2">
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition group">
      <div className="w-full h-64 bg-gray-100 flex items-center justify-center">
        {imageSrc && !imageError ? (
          <img 
            src={imageSrc} 
            alt={outfit.name} 
            className="w-full h-full object-cover object-top"
            onError={handleImageError}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <ImageIcon className="h-12 w-12 mb-2" />
            <p className="text-sm">Image not available</p>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-medium text-neutral-800">{outfit.name}</h3>
            <p className="text-sm text-neutral-500">{getRelativeTime(outfit.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" 
              onClick={() => setShowConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <RatingBadge rating={outfit.rating || 0} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {outfit.tags?.map((tag, index) => (
            <span key={index} className="bg-neutral-100 text-neutral-600 text-xs px-2 py-1 rounded">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
