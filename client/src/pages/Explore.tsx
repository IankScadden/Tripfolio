import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import { isUnauthorizedError } from "@/lib/authUtils";

type Trip = {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  totalCost: number;
  headerImageUrl?: string;
  description?: string;
  tags?: string[];
};

type User = {
  id: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImageUrl?: string;
};

type TripWithUser = Trip & { user: User };

const DEFAULT_HEADER_IMAGE = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=400&fit=crop";

export default function Explore() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: trips = [], isLoading } = useQuery<TripWithUser[]>({
    queryKey: ["/api/explore/trips", searchQuery],
    queryFn: async () => {
      const url = searchQuery.trim() 
        ? `/api/explore/trips?search=${encodeURIComponent(searchQuery.trim())}`
        : "/api/explore/trips";
      const response = await fetch(url);
      if (!response.ok) {
        const error = new Error("Failed to fetch trips");
        if (response.status === 401) {
          (error as any).statusCode = 401;
        }
        throw error;
      }
      return response.json();
    },
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) {
        window.location.href = "/api/login";
        return false;
      }
      return failureCount < 3;
    },
  });

  const getUserDisplayName = (user: User) => {
    if (user.displayName) return user.displayName;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    return user.email || "Anonymous";
  };

  const getUserInitial = (user: User) => {
    if (user.displayName) return user.displayName[0].toUpperCase();
    if (user.firstName) return user.firstName[0].toUpperCase();
    return "?";
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <div 
        className="relative h-[400px] bg-cover bg-center flex items-center justify-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&h=400&fit=crop')`,
        }}
      >
        <div className="text-center text-white z-10 px-4 max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Discover Real Travel Budgets
          </h1>
          <p className="text-lg md:text-xl mb-8 text-white/90">
            Explore detailed trip budgets from real travelers around the world
          </p>
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by destination or trip name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-lg bg-white/95 backdrop-blur text-foreground"
              data-testid="input-search-trips"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Trips Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground">Loading trips...</div>
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No trips found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "Try a different search term" : "Be the first to share your trip!"}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <Card 
                key={trip.id}
                className="overflow-hidden cursor-pointer hover-elevate active-elevate-2 transition-all"
                onClick={() => setLocation(`/explore/${trip.id}`)}
                data-testid={`trip-card-${trip.id}`}
              >
                {/* Header Image */}
                <div className="relative h-48 bg-muted">
                  <img 
                    src={trip.headerImageUrl || DEFAULT_HEADER_IMAGE}
                    alt={trip.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_HEADER_IMAGE;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  
                  {/* Trip Name Overlay */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-white font-bold text-xl mb-1 line-clamp-2">
                      {trip.name}
                    </h3>
                    {trip.startDate && (
                      <p className="text-white/90 text-sm">
                        {formatDate(trip.startDate)}
                        {trip.days && ` • ${trip.days} days`}
                      </p>
                    )}
                  </div>

                  {/* Cost Badge */}
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-white/95 text-foreground backdrop-blur font-bold text-base px-3 py-1">
                      ${trip.totalCost.toFixed(0)}
                    </Badge>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4">
                  {/* User Info */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {trip.user.profileImageUrl ? (
                        <img 
                          src={trip.user.profileImageUrl} 
                          alt={getUserDisplayName(trip.user)}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        getUserInitial(trip.user)
                      )}
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      {getUserDisplayName(trip.user)}
                    </span>
                  </div>

                  {/* Description Preview */}
                  {trip.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {trip.description}
                    </p>
                  )}

                  {/* Tags */}
                  {trip.tags && trip.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {trip.tags.slice(0, 3).map((tag, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className="text-xs px-2 py-0"
                        >
                          {tag.startsWith('#') ? tag : `#${tag}`}
                        </Badge>
                      ))}
                      {trip.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs px-2 py-0">
                          +{trip.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Per Day Cost */}
                  {trip.days && trip.days > 0 && (
                    <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                      ${(trip.totalCost / trip.days).toFixed(0)} per day
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
