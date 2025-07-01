import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { MainLayout } from "@/components/layout/MainLayout";
import Home from "@/pages/home";
import Wardrobe from "@/pages/wardrobe";
import Outfits from "@/pages/outfits";
import Shopping from "@/pages/shopping";
import Login from "@/pages/login";
import Register from "@/pages/register";

function Router() {
  return (
    <Switch>
      {/* Public pages */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* App pages */}
      <Route path="/" component={Home} />
      <Route path="/wardrobe" component={Wardrobe} />
      <Route path="/outfits" component={Outfits} />
      <Route path="/shopping" component={Shopping} />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MainLayout>
          <Router />
        </MainLayout>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
