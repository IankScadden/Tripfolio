import { useEffect } from "react";
import { useLocation } from "wouter";
import { Coffee, Heart, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";

export default function TipSuccess() {
  const [, setLocation] = useLocation();

  const urlParams = new URLSearchParams(window.location.search);
  const tripId = urlParams.get("tripId");
  const amount = urlParams.get("amount");
  
  const formattedAmount = amount ? `$${(parseInt(amount) / 100).toFixed(0)}` : "";

  useEffect(() => {
    document.title = "Thank You! | Tripfolio";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto text-center">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-8">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Coffee className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Thank You!
              </h1>
              {formattedAmount && (
                <p className="text-white/90 text-lg">
                  Your {formattedAmount} tip was received
                </p>
              )}
            </div>
            
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-6">
                <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                <span>Your support means the world!</span>
                <Heart className="h-4 w-4 text-red-500 fill-red-500" />
              </div>
              
              <p className="text-sm text-muted-foreground mb-6">
                Your generosity helps create more detailed travel guides and itineraries
                to help fellow travelers explore the world.
              </p>

              <div className="flex flex-col gap-3">
                {tripId && (
                  <Button
                    onClick={() => setLocation(`/explore/${tripId}`)}
                    className="w-full"
                    data-testid="button-back-to-trip"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Trip
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setLocation("/explore")}
                  className="w-full"
                  data-testid="button-explore-more"
                >
                  Explore More Trips
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
