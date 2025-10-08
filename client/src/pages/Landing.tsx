import { Button } from "@/components/ui/button";
import { Plane, Calendar, DollarSign, Share2 } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            TripBudget
          </h1>
          <p className="text-2xl text-muted-foreground mb-8">
            Plan your backpacking adventures with confidence
          </p>
          <p className="text-lg text-muted-foreground mb-12">
            Track expenses, visualize your budget, and share trip plans with friends
          </p>
          
          <Button 
            size="lg" 
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-login"
            className="text-lg px-8 py-6"
          >
            Get Started
          </Button>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20">
            <div className="p-6 bg-card rounded-lg border">
              <Plane className="w-12 h-12 mb-4 text-primary mx-auto" />
              <h3 className="font-semibold mb-2">Track Expenses</h3>
              <p className="text-sm text-muted-foreground">
                Organize costs across flights, accommodation, food, and activities
              </p>
            </div>
            
            <div className="p-6 bg-card rounded-lg border">
              <Calendar className="w-12 h-12 mb-4 text-primary mx-auto" />
              <h3 className="font-semibold mb-2">Plan Trips</h3>
              <p className="text-sm text-muted-foreground">
                Create detailed itineraries with dates and budget breakdowns
              </p>
            </div>
            
            <div className="p-6 bg-card rounded-lg border">
              <DollarSign className="w-12 h-12 mb-4 text-primary mx-auto" />
              <h3 className="font-semibold mb-2">Visualize Budget</h3>
              <p className="text-sm text-muted-foreground">
                See spending breakdowns with interactive charts
              </p>
            </div>
            
            <div className="p-6 bg-card rounded-lg border">
              <Share2 className="w-12 h-12 mb-4 text-primary mx-auto" />
              <h3 className="font-semibold mb-2">Share Plans</h3>
              <p className="text-sm text-muted-foreground">
                Generate shareable links to collaborate with travel buddies
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
