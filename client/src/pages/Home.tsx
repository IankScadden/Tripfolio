import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Users, Plus } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import CreateTripDialog from "@/components/CreateTripDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import heroImage from "@assets/stock_images/beautiful_mountain_l_d965efef.jpg";

export default function Home() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

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

  const features = [
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "Smart Budgeting",
      description: "Track every expense from flights to activities. See exactly where your money goes with visual breakdowns.",
      color: "bg-blue-100 text-blue-600",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Real-Time Totals",
      description: "Watch your trip budget update instantly as you add destinations, stays, and experiences.",
      color: "bg-purple-100 text-purple-600",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Share & Explore",
      description: "Get inspired by real trip budgets from other travelers. Share your own itineraries with friends.",
      color: "bg-orange-100 text-orange-600",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Hero Section */}
      <div 
        className="relative h-[500px] bg-cover bg-center flex items-center justify-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url(${heroImage})`,
        }}
      >
        <div className="text-center z-10 px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Budget Your Dream Trip
          </h1>
          <p className="text-xl text-gray-100 mb-8 max-w-2xl mx-auto">
            Budget smarter, travel better. Create detailed trip budgets with cost breakdowns, share with friends, and get inspired by travelers worldwide.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="lg"
              onClick={handleCreateTrip}
              className="gap-2"
              data-testid="button-create-new-trip"
            >
              <Plus className="w-5 h-5" />
              Create New Trip
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleExplore}
              className="bg-white/10 text-white border-white hover:bg-white hover:text-foreground backdrop-blur-sm"
              data-testid="button-explore-community"
            >
              Explore Community Trips
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-card border rounded-lg p-8 text-center hover-elevate transition-all"
            >
              <div className={`w-14 h-14 rounded-full ${feature.color} mx-auto mb-4 flex items-center justify-center`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center py-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Budgeting?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Whether you're backpacking through Europe or exploring Southeast Asia, our app makes trip budgeting simple and visual.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="lg"
              onClick={handleCreateTrip}
              data-testid="button-start-first-trip"
            >
              Start Your First Trip
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleCreateTrip}
              data-testid="button-view-my-trips"
            >
              View My Trips
            </Button>
          </div>
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
