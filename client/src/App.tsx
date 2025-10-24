import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import TripsList from "@/pages/TripsList";
import TripDetail from "@/pages/TripDetail";
import TripSettings from "@/pages/TripSettings";
import ItineraryPlanner from "@/pages/ItineraryPlanner";
import SharedTrip from "@/pages/SharedTrip";
import Explore from "@/pages/Explore";
import ExploreTripDetail from "@/pages/ExploreTripDetail";
import ProfileSettings from "@/pages/ProfileSettings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/my-trips" component={TripsList} />
      <Route path="/trip/:id" component={TripDetail} />
      <Route path="/trip/:id/settings" component={TripSettings} />
      <Route path="/trip/:id/itinerary" component={ItineraryPlanner} />
      <Route path="/share/:shareId" component={SharedTrip} />
      <Route path="/explore" component={Explore} />
      <Route path="/explore/:id" component={ExploreTripDetail} />
      <Route path="/profile-settings" component={ProfileSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
