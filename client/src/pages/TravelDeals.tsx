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
  Backpack,
  Users,
  BadgePercent
} from "lucide-react";
import Header from "@/components/Header";

export default function TravelDeals() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section with Gradient */}
      <div className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 opacity-90"
        />
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&h=600&fit=crop)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            mixBlendMode: 'overlay',
          }}
        />
        
        <div className="relative z-10 px-4 py-16 sm:py-24">
          <div className="max-w-4xl mx-auto">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation("/")}
              className="text-white/90 hover:text-white hover:bg-white/20 mb-6"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Tag className="h-6 w-6 text-white" />
              </div>
              <Badge className="bg-orange-500 hover:bg-orange-500 text-white border-0 gap-1">
                <Sparkles className="h-3 w-3" />
                Coming Soon
              </Badge>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
              Travel Deals Marketplace
            </h1>
            <p className="text-xl text-white/80 max-w-2xl">
              Your one-stop destination for incredible travel savings and gear exchange
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        {/* Building Something Special */}
        <div className="text-center mb-20">
          <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Tag className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            We're Building Something Special
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The Travel Deals Marketplace is coming soon! Get ready for the best travel 
            discounts and a community-driven platform to buy and sell travel gear.
          </p>
        </div>

        {/* What to Expect */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">What to Expect</h2>
            <p className="text-muted-foreground">Here's what we're building for you</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Exclusive Travel Deals Card */}
            <Card className="p-6 sm:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BadgePercent className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Exclusive Travel Deals</h3>
                  <p className="text-muted-foreground">
                    Browse discounted offers from trusted travel partners
                  </p>
                </div>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Plane className="h-4 w-4 text-muted-foreground" />
                  <span>Flight discounts from airlines</span>
                </div>
                <div className="flex items-center gap-3">
                  <Hotel className="h-4 w-4 text-muted-foreground" />
                  <span>Special rates on hostels & hotels</span>
                </div>
                <div className="flex items-center gap-3">
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                  <span>Activity & tour packages</span>
                </div>
              </div>
            </Card>

            {/* Travel Gear Marketplace Card */}
            <Card className="p-6 sm:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Backpack className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Travel Gear Marketplace</h3>
                  <p className="text-muted-foreground">
                    Buy and sell used travel equipment from fellow travelers
                  </p>
                </div>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Backpack className="h-4 w-4 text-muted-foreground" />
                  <span>Backpacks, sleeping bags, and camping gear</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Peer-to-peer marketplace</span>
                </div>
                <div className="flex items-center gap-3">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span>Great prices on quality pre-owned items</span>
                </div>
              </div>
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
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                1
              </div>
              <h3 className="font-semibold mb-2">Browse Deals</h3>
              <p className="text-sm text-muted-foreground">
                Discover curated travel deals from verified partners and community members selling gear
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                2
              </div>
              <h3 className="font-semibold mb-2">Compare & Save</h3>
              <p className="text-sm text-muted-foreground">
                Compare prices, read reviews, and find the best deals for your next adventure
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                3
              </div>
              <h3 className="font-semibold mb-2">Book or Purchase</h3>
              <p className="text-sm text-muted-foreground">
                Secure your deal or connect with sellers directly through our platform
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground mb-6">
            Want to be notified when we launch?
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
