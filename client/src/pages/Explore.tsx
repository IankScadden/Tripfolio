import Header from "@/components/Header";
import { Telescope } from "lucide-react";

export default function Explore() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-6 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <div className="w-20 h-20 bg-primary/10 rounded-full mx-auto mb-6 flex items-center justify-center">
            <Telescope className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Explore Community Trips</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Coming soon! Discover trip budgets from travelers around the world, get inspired for your next adventure, and share your own experiences.
          </p>
          <p className="text-muted-foreground">
            This feature is currently under development. You'll soon be able to browse public trips, search by destination, and connect with other travelers.
          </p>
        </div>
      </div>
    </div>
  );
}
