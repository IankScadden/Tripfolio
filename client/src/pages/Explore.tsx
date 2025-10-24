import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, MapPin, Calendar, Plane, Hotel, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";

type PublicTrip = {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  totalCost: number;
  costPerDay: number;
  destinations: string[];
  expenseCounts: {
    flights: number;
    accommodation: number;
    activities: number;
  };
  user: {
    id: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
};

export default function Explore() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data: trips = [], isLoading } = useQuery<PublicTrip[]>({
    queryKey: ["/api/explore/trips", debouncedSearch],
    queryFn: async () => {
      const params = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : "";
      const response = await fetch(`/api/explore/trips${params}`);
      if (!response.ok) throw new Error("Failed to fetch trips");
      return response.json();
    },
  });

  const handleSearch = () => {
    setDebouncedSearch(searchQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getUserDisplayName = (user: PublicTrip['user']) => {
    if (user.displayName) return user.displayName;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    return user.email || "Anonymous";
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-3" data-testid="text-explore-title">
              Explore Trip Budgets
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get real cost estimates from travelers around the world. Search by destination to plan your next adventure.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by country, city, or trip name..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  data-testid="input-search"
                />
              </div>
              <Button onClick={handleSearch} data-testid="button-search">
                Search
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-8 flex justify-center gap-8 text-sm">
            <div className="text-center">
              <div className="font-bold text-lg" data-testid="text-trip-count">{trips.length}</div>
              <div className="text-muted-foreground">Trip Budgets</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg">
                {Array.from(new Set(trips.flatMap(t => t.destinations))).length}
              </div>
              <div className="text-muted-foreground">Destinations</div>
            </div>
          </div>
        </div>
      </div>

      {/* Trips Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading trips...
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {debouncedSearch ? "No trips found matching your search" : "No public trips available yet"}
            </p>
            <Button variant="outline" onClick={() => setLocation("/my-trips")} data-testid="button-create-first">
              Create Your Trip
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold">
                {debouncedSearch ? `Results for "${debouncedSearch}"` : "All Community Trips"}
              </h2>
              <p className="text-sm text-muted-foreground">{trips.length} trips available</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips.map((trip) => (
                <Card
                  key={trip.id}
                  className="hover-elevate active-elevate-2 cursor-pointer transition-all"
                  onClick={() => setLocation(`/explore/${trip.id}`)}
                  data-testid={`card-trip-${trip.id}`}
                >
                  {/* Gradient Header */}
                  <div className="h-32 bg-gradient-to-br from-blue-400 via-blue-300 to-orange-300 rounded-t-lg" />
                  
                  <CardContent className="pt-4">
                    {/* Trip Name */}
                    <h3 className="font-bold text-lg mb-2" data-testid={`text-trip-name-${trip.id}`}>
                      {trip.name}
                    </h3>

                    {/* Author & Date */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(trip.startDate)}</span>
                      </div>
                      {trip.days && (
                        <span>{trip.days} days</span>
                      )}
                    </div>

                    {/* Destinations */}
                    {trip.destinations.length > 0 && (
                      <div className="flex items-start gap-1 mb-3 text-sm">
                        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <span className="text-muted-foreground line-clamp-2">
                          {trip.destinations.join(" • ")}
                        </span>
                      </div>
                    )}

                    {/* Category Counts */}
                    <div className="flex gap-4 mb-4 text-sm">
                      {trip.expenseCounts.flights > 0 && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Plane className="h-3 w-3" />
                          <span>{trip.expenseCounts.flights}</span>
                        </div>
                      )}
                      {trip.expenseCounts.accommodation > 0 && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Hotel className="h-3 w-3" />
                          <span>{trip.expenseCounts.accommodation}</span>
                        </div>
                      )}
                      {trip.expenseCounts.activities > 0 && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Ticket className="h-3 w-3" />
                          <span>{trip.expenseCounts.activities}</span>
                        </div>
                      )}
                    </div>

                    {/* Total Budget */}
                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Budget</span>
                        <span className="text-xl font-bold text-primary" data-testid={`text-cost-${trip.id}`}>
                          ${trip.totalCost.toFixed(0)}
                        </span>
                      </div>
                      {trip.days && trip.days > 0 && (
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">Per Day</span>
                          <span className="text-sm font-medium text-muted-foreground">
                            ${trip.costPerDay.toFixed(0)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Author */}
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                      by {getUserDisplayName(trip.user)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* CTA Section */}
        {trips.length > 0 && (
          <div className="mt-12 bg-gradient-to-br from-primary via-primary/90 to-primary/70 rounded-lg p-8 text-center text-primary-foreground">
            <h2 className="text-2xl font-bold mb-2">Ready to Share Your Adventure?</h2>
            <p className="mb-6 opacity-90">
              Create your own trip budget and inspire other travelers
            </p>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setLocation("/my-trips")}
              data-testid="button-create-trip-cta"
            >
              Create Your Trip
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
