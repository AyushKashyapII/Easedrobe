import { Button } from "@/components/ui/button";
import { ClothingItem } from "@shared/schema";
import { Bot } from "lucide-react";
import { RatingBadge } from "@/components/shared/RatingBadge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";

type OutfitSuggestion = {
  name: string;
  itemIds: number[];
  rating: number;
  rationale: string;
  tags: string[];
};

type SuggestionCardProps = {
  suggestion: OutfitSuggestion;
  clothingItems: ClothingItem[];
};

export function SuggestionCard({ suggestion, clothingItems }: SuggestionCardProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  // Find the actual clothing items based on IDs
  const outfitItems = suggestion.itemIds
    .map(id => clothingItems.find(item => item.id === id))
    .filter((item): item is ClothingItem => item !== undefined);
  
  const handleSaveOutfit = async () => {
    try {
      setIsSaving(true);
      
      // Show loading state immediately
      toast({
        title: "Processing outfit",
        description: "Analyzing and saving your outfit...",
      });
      
      // In a real app, we'd need to create a composite image of the outfit
      // For now, we'll just use the first item's image or a placeholder
      const imageData = outfitItems.length > 0 
        ? outfitItems[0].imageData 
        : "";
      
      const formData = new FormData();
      formData.append("name", suggestion.name);
      formData.append("tags", suggestion.tags.join(","));
      formData.append("aiGenerated", "true");
      formData.append("rating", suggestion.rating.toString());
      formData.append("itemIds", JSON.stringify(suggestion.itemIds));
      formData.append("analysis", suggestion.rationale);
      
      // If we have images, create a data URL and append it
      if (outfitItems.length > 0) {
        // Convert base64 string to blob
        const base64Response = await fetch(outfitItems[0].imageUrl);
        const blob = await base64Response.blob();
        formData.append("file", blob, "outfit.jpg");
      }
      
      // Optimistically update the UI
      const optimisticOutfit = {
        id: Date.now(),
        name: suggestion.name,
        tags: suggestion.tags,
        rating: suggestion.rating,
        imageUrl: outfitItems[0]?.imageUrl || "",
        createdAt: new Date().toISOString(),
      };
      
      queryClient.setQueryData(['/api/outfits'], (old: any[] = []) => [...old, optimisticOutfit]);
      
      const response = await apiRequest("/api/outfits", {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      
      // Update with real data
      queryClient.setQueryData(['/api/outfits'], (old: any[] = []) => 
        old.map(item => item.id === optimisticOutfit.id ? data : item)
      );
      
      toast({
        title: "Outfit saved",
        description: `${suggestion.name} has been saved to your outfits.`,
      });
    } catch (error) {
      console.error("Save error:", error);
      // Revert optimistic update
      queryClient.setQueryData(['/api/outfits'], (old: any[] = []) => 
        old.filter(item => item.id !== Date.now())
      );
      
      toast({
        title: "Save failed",
        description: "Failed to save outfit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition">
      <div className="p-4">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-medium text-neutral-800">{suggestion.name}</h3>
          <div className="bg-accent/10 text-accent text-xs rounded-full px-2 py-1 font-medium flex items-center">
            <Bot className="mr-1 h-3 w-3" />
            <span>AI Suggestion</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {outfitItems.map(item => (
            <div key={item.id} className="flex items-center gap-2 bg-neutral-100 rounded-full pl-1 pr-3 py-1">
              <img 
                src={item.imageUrl} 
                alt={item.name} 
                className="w-6 h-6 rounded-full object-cover" 
              />
              <span className="text-xs">{item.name}</span>
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-neutral-700">Predicted Rating</div>
            <div className="flex items-center mt-1">
              <RatingBadge rating={suggestion.rating} type="block" />
              <div className="ml-2 text-xs text-neutral-500">{suggestion.rationale.substring(0, 30)}...</div>
            </div>
          </div>
          <Button
            className="bg-primary hover:bg-primary/90 text-white"
            disabled={isSaving}
            onClick={handleSaveOutfit}
          >
            {isSaving ? "Saving..." : "Save Outfit"}
          </Button>
        </div>
      </div>
    </div>
  );
}
