import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/clerk-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import TripsList from "@/pages/TripsList";
import TripDetail from "@/pages/TripDetail";
import PostTrip from "@/pages/PostTrip";
import ItineraryPlanner from "@/pages/ItineraryPlanner";
import SharedTrip from "@/pages/SharedTrip";
import Explore from "@/pages/Explore";
import ExploreTripDetail from "@/pages/ExploreTripDetail";
import ProfileSettings from "@/pages/ProfileSettings";
import PublicProfile from "@/pages/PublicProfile";
import MyMap from "@/pages/MyMap";
import TravelDeals from "@/pages/TravelDeals";
import NotFound from "@/pages/not-found";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error("Missing Clerk Publishable Key");
}

function Router() {
  return (
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
