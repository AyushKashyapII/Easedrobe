import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, Shirt, Star, ShoppingBag, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type NavItem = {
  label: string;
  path: string;
  icon: ReactNode;
};

const navItems: NavItem[] = [
  {
    label: "Home",
    path: "/",
    icon: <Home className="w-4 h-4 md:mr-1" />
  },
  {
    label: "My Wardrobe",
    path: "/wardrobe",
    icon: <Shirt className="w-4 h-4 md:mr-1" />
  },
  {
    label: "Outfit Ideas",
    path: "/outfits",
    icon: <Star className="w-4 h-4 md:mr-1" />
  },
  {
    label: "Shopping",
    path: "/shopping",
    icon: <ShoppingBag className="w-4 h-4 md:mr-1" />
  }
];

type MainLayoutProps = {
  children: ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-neutral-100 font-inter text-neutral-700">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-primary font-poppins font-bold text-2xl">Easedrobe</h1>
          </div>
          
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "font-medium flex items-center transition",
                  location === item.path ? "text-primary" : "text-neutral-500 hover:text-primary"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>
          
          <div className="flex items-center">
            <button 
              className="md:hidden text-neutral-600 focus:outline-none"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:block">
              {/* User profile would go here if we implement auth */}
            </div>
          </div>
        </div>
        
        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center py-3 px-4 border-b",
                  location === item.path ? "text-primary font-medium" : "text-neutral-600"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.icon}
                <span className="ml-2">{item.label}</span>
              </Link>
            ))}
          </div>
        )}
      </header>
      
      {/* Mobile bottom navigation */}
      {isMobile && (
        <div className="md:hidden bg-white border-t fixed bottom-0 left-0 right-0 z-40 py-2">
          <div className="flex justify-around">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex flex-col items-center",
                  location === item.path ? "text-primary" : "text-neutral-500"
                )}
              >
                {item.icon}
                <span className="text-xs mt-1">{item.label.split(' ')[0]}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      
      {/* Main content */}
      <main className="flex-grow container mx-auto px-4 py-6 md:py-8 pb-16 md:pb-8">
        {children}
      </main>
    </div>
  );
}
