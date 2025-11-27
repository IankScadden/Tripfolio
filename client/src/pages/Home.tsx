import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DollarSign, MapPin, Calendar, Plus, ArrowRight, Tag } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import CreateTripDialog from "@/components/CreateTripDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import heroImage from "@assets/stock_images/rome_colosseum_sunse_19223d23.jpg";
import { SignInButton } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { isAuthenticated } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  // Check for successful upgrade
  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get('upgraded') === 'true') {
      toast({
        title: "Welcome to Premium!",
        description: "You now have unlimited AI assistant access and trip creation.",
      });
      // Clear the query param from URL
      window.history.replaceState({}, '', '/');
      // Invalidate subscription data to refresh
      queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
    }
  }, [search, toast]);

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
            {isAuthenticated ? (
              <Button
                size="lg"
                onClick={() => setShowCreateDialog(true)}
                className="gap-2 h-14 px-8 text-lg"
                data-testid="button-create-new-trip"
              >
                <Plus className="w-5 h-5" />
                Create Trip
              </Button>
            ) : (
              <SignInButton mode="modal">
                <Button
                  size="lg"
                  className="gap-2 h-14 px-8 text-lg"
                  data-testid="button-create-new-trip"
                >
                  <Plus className="w-5 h-5" />
                  Create Trip
                </Button>
              </SignInButton>
            )}
            {isAuthenticated ? (
              <Button
                size="lg"
                variant="outline"
                onClick={() => setLocation("/explore")}
                className="bg-white/10 text-white border-white/40 hover:bg-white hover:text-foreground backdrop-blur h-14 px-8 text-lg"
                data-testid="button-explore-community"
              >
                Explore Trips
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <SignInButton mode="modal">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white/10 text-white border-white/40 hover:bg-white hover:text-foreground backdrop-blur h-14 px-8 text-lg"
                  data-testid="button-explore-community"
                >
                  Explore Trips
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </SignInButton>
            )}
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLocation("/travel-deals")}
              className="bg-white/10 text-white border-white/40 hover:bg-white hover:text-foreground backdrop-blur h-14 px-8 text-lg gap-2"
              data-testid="button-travel-deals"
            >
              <Tag className="w-5 h-5" />
              Travel Deals
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
          {/* Feature 1 - Plan & Budget (Merged) */}
          {isAuthenticated ? (
            <Card 
              className="relative overflow-hidden h-[400px] hover-elevate transition-all cursor-pointer group"
              onClick={() => setLocation("/my-trips")}
            >
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                style={{
                  backgroundImage: `url(https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&h=800&fit=crop)`,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="bg-blue-500 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  <DollarSign className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Plan & Budget</h3>
                <p className="text-gray-200 text-sm leading-relaxed">
                  Track expenses with detailed breakdowns. Organize day-by-day itineraries and visualize spending across flights, accommodation, food, and activities.
                </p>
              </div>
            </Card>
          ) : (
            <SignInButton mode="modal">
              <Card 
                className="relative overflow-hidden h-[400px] hover-elevate transition-all cursor-pointer group"
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                  style={{
                    backgroundImage: `url(https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&h=800&fit=crop)`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <div className="bg-blue-500 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Plan & Budget</h3>
                  <p className="text-gray-200 text-sm leading-relaxed">
                    Track expenses with detailed breakdowns. Organize day-by-day itineraries and visualize spending across flights, accommodation, food, and activities.
                  </p>
                </div>
              </Card>
            </SignInButton>
          )}

          {/* Feature 2 - Share & Explore */}
          {isAuthenticated ? (
            <Card 
              className="relative overflow-hidden h-[400px] hover-elevate transition-all cursor-pointer group"
              onClick={() => setLocation("/explore")}
            >
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                style={{
                  backgroundImage: `url(https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=600&h=800&fit=crop)`,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="bg-orange-500 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Share & Explore</h3>
                <p className="text-gray-200 text-sm leading-relaxed">
                  Post your trips to inspire others. Browse real budgets from travelers worldwide and use them as templates for your next adventure.
                </p>
              </div>
            </Card>
          ) : (
            <SignInButton mode="modal">
              <Card 
                className="relative overflow-hidden h-[400px] hover-elevate transition-all cursor-pointer group"
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                  style={{
                    backgroundImage: `url(https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=600&h=800&fit=crop)`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <div className="bg-orange-500 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Share & Explore</h3>
                  <p className="text-gray-200 text-sm leading-relaxed">
                    Post your trips to inspire others. Browse real budgets from travelers worldwide and use them as templates for your next adventure.
                  </p>
                </div>
              </Card>
            </SignInButton>
          )}

          {/* Feature 3 - Travel Deals */}
          <Card 
            className="relative overflow-hidden h-[400px] hover-elevate transition-all cursor-pointer group"
            onClick={() => setLocation("/travel-deals")}
            data-testid="card-travel-deals"
          >
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
              style={{
                backgroundImage: `url(https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=800&fit=crop)`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <div className="bg-green-500 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Tag className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Travel Deals</h3>
              <p className="text-gray-200 text-sm leading-relaxed">
                Find the best prices on flights, hotels, and activities. Curated resources and a marketplace to save money on your trip.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Final CTA */}
      <div className="pt-8 pb-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            Ready to Budget Your Next Adventure?
          </h2>
          {isAuthenticated ? (
            <Button
              size="lg"
              onClick={() => setShowCreateDialog(true)}
              className="gap-2 h-14 px-8 text-lg"
              data-testid="button-start-first-trip"
            >
              <Plus className="w-5 h-5" />
              Create Your First Trip
            </Button>
          ) : (
            <SignInButton mode="modal">
              <Button
                size="lg"
                className="gap-2 h-14 px-8 text-lg"
                data-testid="button-start-first-trip"
              >
                <Plus className="w-5 h-5" />
                Create Your First Trip
              </Button>
            </SignInButton>
          )}
        </div>
      </div>

      {/* Footer with Contact Information */}
      <footer className="border-t bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>
              For bugs, recommendations, or concerns, reach out to{" "}
              <a 
                href="mailto:Ian@tripfolio.ai" 
                className="text-primary hover:underline font-medium"
                data-testid="link-contact-email"
              >
                Ian@tripfolio.ai
              </a>
            </p>
          </div>
        </div>
      </footer>

      <CreateTripDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={handleCreateTripSubmit}
      />
    </div>
  );
}
