import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Tag, 
  ArrowLeft, 
  Sparkles, 
  Plane, 
  Hotel, 
  Ticket,
  Car,
  BadgePercent,
  Search,
  Bell
} from "lucide-react";
import Header from "@/components/Header";

export default function TravelDeals() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section - Matching other pages */}
      <div 
        className="relative h-[350px] bg-cover bg-center flex items-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81?w=1600&h=400&fit=crop')`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/")}
            className="text-white/90 hover:text-white hover:bg-white/20 mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-3 mb-4">
            <Badge className="bg-primary hover:bg-primary text-primary-foreground border-0 gap-1">
              <Sparkles className="h-3 w-3" />
              Coming Soon
            </Badge>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
            Travel Deals
          </h1>
          <p className="text-xl text-white/80 max-w-2xl">
            Your hub for finding the best travel deals and saving money on your adventures
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        {/* Building Something Special */}
        <div className="text-center mb-20">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Tag className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            We're Building Something Special
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Travel Deals is coming soon! Get ready for the best curated travel discounts 
            on flights, hotels, transportation, and activities all in one place.
          </p>
        </div>

        {/* What to Expect */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">What to Expect</h2>
            <p className="text-muted-foreground">Here's what we're building for you</p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Flights */}
            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Plane className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Flights</h3>
              <p className="text-sm text-muted-foreground">
                Compare prices from top airlines and find the cheapest routes
              </p>
            </Card>

            {/* Hotels */}
            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Hotel className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Accommodation</h3>
              <p className="text-sm text-muted-foreground">
                Special rates on hostels, hotels, and unique stays
              </p>
            </Card>

            {/* Transportation */}
            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Car className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Transportation</h3>
              <p className="text-sm text-muted-foreground">
                Buses, trains, and car rentals at great prices
              </p>
            </Card>

            {/* Activities */}
            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Ticket className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Activities</h3>
              <p className="text-sm text-muted-foreground">
                Tours, experiences, and attraction tickets
              </p>
            </Card>
          </div>
        </div>

        {/* How It Will Work */}
        <div className="bg-muted/30 rounded-2xl p-8 sm:p-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            How It Will Work
          </h2>
          
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-6">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-primary-foreground font-bold text-lg">
                1
              </div>
              <h3 className="font-semibold mb-2">Browse Deals</h3>
              <p className="text-sm text-muted-foreground">
                Discover curated travel deals from verified partners across all categories
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-primary-foreground font-bold text-lg">
                2
              </div>
              <h3 className="font-semibold mb-2">Compare & Save</h3>
              <p className="text-sm text-muted-foreground">
                Compare prices and find the best deals for your next adventure
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-primary-foreground font-bold text-lg">
                3
              </div>
              <h3 className="font-semibold mb-2">Book & Go</h3>
              <p className="text-sm text-muted-foreground">
                Secure your deal and add expenses directly to your trip budget
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground mb-6">
            Ready to start planning your next adventure?
          </p>
          <Button 
            size="lg" 
            onClick={() => setLocation("/")}
            className="gap-2"
            data-testid="button-back-home"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
