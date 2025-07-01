import { ClothingItem } from "@shared/schema";
import { RatingBadge } from "@/components/shared/RatingBadge";
import { Button } from "@/components/ui/button";
import { Trash2, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

type WardrobeItemCardProps = {
  item: ClothingItem;
  onDelete?: () => void;
};

export function WardrobeItemCard({ item, onDelete }: WardrobeItemCardProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await apiRequest(`/api/clothing-items/${item.id}`, { method: 'DELETE' });
      queryClient.invalidateQueries({ queryKey: ['/api/clothing-items'] });
      toast({
        title: "Item deleted",
        description: `${item.name} has been removed from your wardrobe.`,
      });
      if (onDelete) onDelete();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  // Get the proper image source
  const getImageSrc = () => {
    if (!item.imageUrl) {
      return null;
    }
    // Always return as is, since imageUrl is already a valid data URL
    return item.imageUrl;
  };

  const imageSrc = getImageSrc();
  
  if (showConfirm) {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition">
        <Alert variant="destructive" className="h-full flex flex-col justify-center border-none">
          <AlertTitle>Are you sure?</AlertTitle>
          <AlertDescription className="mb-2">
            This will permanently delete this item.
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
      <div className="relative">
        <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
          {imageSrc && !imageError ? (
            <img 
              src={imageSrc} 
              alt={item.name} 
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400">
              <ImageIcon className="h-8 w-8 mb-1" />
              <p className="text-xs">No image</p>
            </div>
          )}
        </div>
        <RatingBadge rating={item.rating || 0} type="pill" />
        
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="destructive" 
            size="icon" 
            className="h-7 w-7" 
            onClick={() => setShowConfirm(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm text-neutral-800 truncate">{item.name}</h3>
        <p className="text-xs text-neutral-500">{item.category}</p>
      </div>
    </div>
  );
}

export function AddWardrobeItemCard({ onClick }: { onClick: () => void }) {
  return (
    <div 
      className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition 
                border-2 border-dashed border-neutral-200 flex flex-col items-center 
                justify-center h-full min-h-[176px] cursor-pointer"
      onClick={onClick}
    >
      <button className="text-primary hover:text-primary/80 transition p-3 rounded-full bg-primary/10 mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
      <span className="text-sm font-medium text-neutral-600">Add Item</span>
    </div>
  );
}
