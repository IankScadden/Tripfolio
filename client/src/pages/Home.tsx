import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, MapPin, Calendar, Plus, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import CreateTripDialog from "@/components/CreateTripDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import heroImage from "@assets/stock_images/rome_colosseum_sunse_19223d23.jpg";

type FeaturedTrip = {
  id: string;
  name: string;
  headerImageUrl?: string;
  totalCost: number;
  owner: {
    displayName?: string;
    firstName?: string;
  };
};

const DEFAULT_HERO_IMAGE = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&h=600&fit=crop";

export default function Home() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: featuredTrips } = useQuery<{ trips: FeaturedTrip[] }>({
    queryKey: ["/api/explore/trips"],
    queryFn: async () => {
      const response = await fetch("/api/explore/trips");
      if (!response.ok) return { trips: [] };
      return response.json();
    },
  });

  const createTripMutation = useMutation({
    mutationFn: async (tripData: any) => {
      const response = await apiRequest("POST", "/api/trips", tripData);
      return await response.json();
    },
    onSuccess: (newTrip) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      setLocation(`/trip/${newTrip.id}`);
    },
  });

  const handleCreateTrip = () => {
    if (!isAuthenticated) {
      window.location.href = "/api/login";
    } else {
      setShowCreateDialog(true);
    }
  };

  const handleExplore = () => {
    if (!isAuthenticated) {
      window.location.href = "/api/login";
    } else {
      setLocation("/explore");
    }
  };

  const handleCreateTripSubmit = (trip: any) => {
    createTripMutation.mutate(trip);
    setShowCreateDialog(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section - Larger and more immersive */}
      <div 
        className="relative h-[700px] flex items-center justify-center"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-10 leading-tight">
            Budget Your Dream Trip Accurately
          </h1>
          
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="lg"
              onClick={handleCreateTrip}
              className="gap-2 h-14 px-8 text-lg"
              data-testid="button-create-new-trip"
            >
              <Plus className="w-5 h-5" />
              Create Trip
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleExplore}
              className="bg-white/10 text-white border-white/40 hover:bg-white hover:text-foreground backdrop-blur h-14 px-8 text-lg"
              data-testid="button-explore-community"
            >
              Explore Trips
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Features Grid with Visual Cards */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Everything You Need</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From detailed budgeting to trip inspiration, we've got you covered
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <Card 
            className="relative overflow-hidden h-[400px] hover-elevate transition-all cursor-pointer group"
            onClick={() => isAuthenticated ? setLocation("/my-trips") : window.location.href = "/api/login"}
          >
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
              style={{
                backgroundImage: `url(https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&h=800&fit=crop)`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <div className="bg-blue-500 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Smart Budgeting</h3>
              <p className="text-gray-200 leading-relaxed">
                Track every expense with detailed breakdowns. Visualize your spending across flights, accommodation, food, and activities.
              </p>
            </div>
          </Card>

          {/* Feature 2 */}
          <Card 
            className="relative overflow-hidden h-[400px] hover-elevate transition-all cursor-pointer group"
            onClick={() => isAuthenticated ? setLocation("/my-trips") : window.location.href = "/api/login"}
          >
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
              style={{
                backgroundImage: `url(https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&h=800&fit=crop)`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <div className="bg-purple-500 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Day-by-Day Planning</h3>
              <p className="text-gray-200 leading-relaxed">
                Organize your trip with detailed itineraries. Map your journey and track expenses for each day of your adventure.
              </p>
            </div>
          </Card>

          {/* Feature 3 */}
          <Card 
            className="relative overflow-hidden h-[400px] hover-elevate transition-all cursor-pointer group"
            onClick={handleExplore}
          >
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
              style={{
                backgroundImage: `url(https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=600&h=800&fit=crop)`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <div className="bg-orange-500 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Share & Explore</h3>
              <p className="text-gray-200 leading-relaxed">
                Post your trips to inspire others. Browse real budgets from travelers worldwide and use them as templates.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Featured Community Trips */}
      {featuredTrips && featuredTrips.trips && featuredTrips.trips.length > 0 && (
        <div className="bg-muted/30 py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">Discover Inspiring Trips</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Real budgets from real travelers. Get inspired and start planning your own adventure.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {featuredTrips.trips.slice(0, 4).map((trip) => (
                <Card 
                  key={trip.id}
                  className="relative overflow-hidden h-[350px] hover-elevate transition-all cursor-pointer group"
                  onClick={() => setLocation(`/explore/${trip.id}`)}
                >
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                    style={{
                      backgroundImage: `url(${trip.headerImageUrl || DEFAULT_HERO_IMAGE})`,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  
                  {/* Cost Badge */}
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-white text-foreground font-semibold px-3 py-1">
                      ${trip.totalCost.toFixed(0)}
                    </Badge>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <h3 className="text-xl font-bold mb-2 line-clamp-2">{trip.name}</h3>
                    <p className="text-sm text-gray-300">
                      by {trip.owner.displayName || trip.owner.firstName || "Traveler"}
                    </p>
                  </div>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Button
                size="lg"
                variant="outline"
                onClick={handleExplore}
                className="gap-2"
              >
                View All Trips
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Final CTA */}
      <div className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Plan Your Next Adventure?
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join thousands of travelers who trust Tripfolio to budget their dream trips. 
            Start planning in minutes.
          </p>
          <Button
            size="lg"
            onClick={handleCreateTrip}
            className="gap-2 h-14 px-8 text-lg"
            data-testid="button-start-first-trip"
          >
            <Plus className="w-5 h-5" />
            Create Your First Trip
          </Button>
        </div>
      </div>

      <CreateTripDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={handleCreateTripSubmit}
      />
    </div>
  );
}
