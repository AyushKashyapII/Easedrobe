import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { WardrobeItemCard, AddWardrobeItemCard } from "@/components/wardrobe/ItemCard";
import { UploadModal } from "@/components/wardrobe/UploadModal";

// Categories for the tab filter
const CATEGORIES = ["All Items", "Tops", "Bottoms", "Outerwear", "Dresses", "Footwear", "Accessories"];

export default function Wardrobe() {
  const [selectedCategory, setSelectedCategory] = useState("All Items");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  
  // Fetch all clothing items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['/api/clothing-items'],
  });
  
  // Filter items by category if a specific one is selected
  const filteredItems = selectedCategory === "All Items"
    ? items
    : items.filter(item => item.category === selectedCategory);
  
  return (
    <>
      <section>
        <h1 className="font-poppins font-bold text-2xl md:text-3xl mb-6">My Wardrobe</h1>
        
        {/* Category Tabs */}
        <div className="flex overflow-x-auto pb-2 mb-6 -mx-1">
          {CATEGORIES.map(category => (
            <button
              key={category}
              className={`whitespace-nowrap mx-1 px-4 py-2 rounded-full font-medium text-sm transition ${
                selectedCategory === category
                  ? "bg-primary text-white"
                  : "bg-white text-neutral-600 hover:bg-neutral-100"
              }`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
        
        {/* Items Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {isLoading ? (
            // Skeleton loading state
            Array(10).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
                <div className="w-full h-40 bg-gray-200"></div>
                <div className="p-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))
          ) : filteredItems.length > 0 ? (
            <>
              {filteredItems.map(item => (
                <WardrobeItemCard key={item.id} item={item} />
              ))}
              <AddWardrobeItemCard onClick={() => setUploadModalOpen(true)} />
            </>
          ) : (
            <div className="col-span-full bg-white rounded-xl p-8 text-center">
              <h3 className="font-medium text-lg mb-2">No items in this category</h3>
              {selectedCategory === "All Items" ? (
                <p className="text-neutral-600 mb-4">Your wardrobe is empty. Add some clothing items to get started.</p>
              ) : (
                <p className="text-neutral-600 mb-4">You don't have any {selectedCategory.toLowerCase()} in your wardrobe yet.</p>
              )}
              <Button onClick={() => setUploadModalOpen(true)}>
                Add Clothing Item
              </Button>
            </div>
          )}
        </div>
      </section>
      
      {/* Upload Modal */}
      <UploadModal 
        open={uploadModalOpen} 
        onClose={() => setUploadModalOpen(false)} 
        type="item" 
      />
    </>
  );
}
