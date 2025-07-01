import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Camera, UploadCloud, X, ImageIcon } from "lucide-react";

export type UploadType = "outfit" | "item" | "shopping";

type UploadModalProps = {
  open: boolean;
  onClose: () => void;
  type: UploadType;
};

export function UploadModal({ open, onClose, type }: UploadModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const resetForm = () => {
    setName("");
    setCategory("");
    setTags("");
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async () => {
    if (!name || !selectedFile) {
      toast({
        title: "Missing information",
        description: "Please provide a name and upload an image.",
        variant: "destructive",
      });
      return;
    }

    if (type === "item" && !category) {
      toast({
        title: "Missing category",
        description: "Please select a category for the item.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("tags", tags);
      
      if (type === "item") {
        formData.append("category", category);
      }
      
      if (type === "outfit") {
        formData.append("aiGenerated", "false");
      }
      
      formData.append("file", selectedFile);
      
      const endpoint = type === "item" 
        ? "/api/clothing-items" 
        : type === "outfit" 
        ? "/api/outfits" 
        : "/api/shopping";
        
      await apiRequest(endpoint, {
        method: "POST",
        body: formData,
      });
      
      // Invalidate the query to refetch data from the server
      if (type === "item") {
        queryClient.invalidateQueries({ queryKey: ['/api/clothing-items'] });
      } else if (type === "outfit") {
        queryClient.invalidateQueries({ queryKey: ['/api/outfits'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/shopping'] });
      }
      
      toast({
        title: "Upload successful",
        description: `Your ${type} has been uploaded and analyzed.`,
      });
      
      resetForm();
      onClose();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case "outfit": return "Upload New Outfit";
      case "item": return "Add Clothing Item";
      case "shopping": return "Analyze Shopping Item";
    }
  };

  const getDescription = () => {
    switch (type) {
      case "outfit": return "Upload a photo of your complete outfit for AI analysis and rating.";
      case "item": return "Add an individual clothing item to your digital wardrobe.";
      case "shopping": return "Upload a photo of an item you're considering buying to see how it fits with your wardrobe.";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input 
              id="name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`E.g., ${type === "outfit" ? "Casual Friday Look" : type === "item" ? "Blue Denim Jacket" : "Black Leather Jacket"}`}
            />
          </div>
          
          {type === "item" && (
            <div className="grid w-full gap-1.5">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tops">Tops</SelectItem>
                  <SelectItem value="Bottoms">Bottoms</SelectItem>
                  <SelectItem value="Outerwear">Outerwear</SelectItem>
                  <SelectItem value="Dresses">Dresses</SelectItem>
                  <SelectItem value="Footwear">Footwear</SelectItem>
                  <SelectItem value="Accessories">Accessories</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div 
            className="border-2 border-dashed border-neutral-200 rounded-lg p-6 text-center"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {previewUrl ? (
              <div className="relative">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="max-h-60 mx-auto rounded-md object-contain" 
                />
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="absolute top-1 right-1 h-7 w-7 rounded-full bg-white"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="mx-auto mb-4 w-12 h-12 flex items-center justify-center bg-primary/10 text-primary rounded-full">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <p className="text-sm text-neutral-500 mb-2">Drop your image here, or browse</p>
                <p className="text-xs text-neutral-400 mb-3">Supports JPG, PNG - Max 5MB</p>
                <div className="flex justify-center gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center"
                  >
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Choose File
                  </Button>
                  {type !== "shopping" && (
                    <Button 
                      variant="outline" 
                      onClick={() => {/* Would activate camera */}}
                      className="flex items-center"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Take Photo
                    </Button>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileSelect} 
                />
              </>
            )}
          </div>
          
          <div className="grid w-full gap-1.5">
            <Label htmlFor="tags">Tags</Label>
            <Input 
              id="tags" 
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="E.g., casual, summer, weekend (separate with commas)"
            />
            <p className="text-xs text-neutral-500 mt-1">Separate tags with commas</p>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isUploading || !name || !selectedFile}
          >
            {isUploading ? "Uploading..." : "Upload & Analyze"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
