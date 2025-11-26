import { Switch, Route } from "wouter";
import { Suspense, lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/clerk-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Eager load critical pages for fast initial render
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";

// Lazy load pages - preloading handled by @/lib/preload.ts
const TripsList = lazy(() => import("@/pages/TripsList"));
const TripDetail = lazy(() => import("@/pages/TripDetail"));
const PostTrip = lazy(() => import("@/pages/PostTrip"));
const ItineraryPlanner = lazy(() => import("@/pages/ItineraryPlanner"));
const SharedTrip = lazy(() => import("@/pages/SharedTrip"));
const Explore = lazy(() => import("@/pages/Explore"));
const ExploreTripDetail = lazy(() => import("@/pages/ExploreTripDetail"));
const ProfileSettings = lazy(() => import("@/pages/ProfileSettings"));
const PublicProfile = lazy(() => import("@/pages/PublicProfile"));
const MyMap = lazy(() => import("@/pages/MyMap"));
const TravelDeals = lazy(() => import("@/pages/TravelDeals"));

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error("Missing Clerk Publishable Key");
}

// Loading fallback for lazy-loaded pages
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/20"></div>
        <div className="h-4 w-32 bg-muted rounded"></div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/my-trips" component={TripsList} />
        <Route path="/trip/:id" component={TripDetail} />
        <Route path="/trip/:id/post" component={PostTrip} />
        <Route path="/trip/:id/itinerary" component={ItineraryPlanner} />
        <Route path="/share/:shareId" component={SharedTrip} />
        <Route path="/explore" component={Explore} />
        <Route path="/explore/:id" component={ExploreTripDetail} />
        <Route path="/travel-deals" component={TravelDeals} />
        <Route path="/profile-settings" component={ProfileSettings} />
        <Route path="/profile/:userId" component={PublicProfile} />
        <Route path="/map/:userId" component={MyMap} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
