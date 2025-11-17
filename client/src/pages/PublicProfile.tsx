import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, MapPin, Calendar, Settings, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Header from "@/components/Header";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import MapDisplay from "@/components/MapDisplay";

type User = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  profileImageUrl?: string;
  bio?: string;
};

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
  user: User;
};

type ProfileData = {
  user: User;
  trips: Trip[];
};

const DEFAULT_HEADER_IMAGE = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=400&fit=crop";

export default function PublicProfile() {
  const [, params] = useRoute("/profile/:userId");
  const [, setLocation] = useLocation();
  const userId = params?.userId;
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  const isOwnProfile = currentUser && (currentUser as any).id === userId;

  const { data: profileData, isLoading } = useQuery<ProfileData>({
    queryKey: ["/api/users", userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        const error = new Error("Failed to fetch user profile");
        if (response.status === 401) {
          (error as any).statusCode = 401;
        }
        throw error;
      }
      return response.json();
    },
    enabled: !!userId,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) {
        window.location.href = "/api/login";
        return false;
      }
      return failureCount < 3;
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async (tripId: string) => {
      const response = await apiRequest("PATCH", `/api/trips/${tripId}/unpublish`);
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/explore/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      toast({
        title: "Trip unpublished",
        description: "Your trip has been removed from public view",
      });
    },
    onError: (error: Error) => {
      const is401 = error.message.includes("401");
      const is403 = error.message.includes("403");
      
      let description = "Failed to unpublish trip";
      if (is401) {
        description = "Your session has expired. Please log in again.";
      } else if (is403) {
        description = "You don't have permission to unpublish this trip";
      }
      
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
      
      if (is401) {
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 2000);
      }
    },
  });

  const handleUnpost = (e: React.MouseEvent, tripId: string) => {
    e.stopPropagation();
    if (confirm("Remove this trip from public view? It will still be in your My Trips.")) {
      unpublishMutation.mutate(tripId);
    }
  };

  const getUserDisplayName = (user: User) => {
    if (user.displayName) return user.displayName;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    return "Anonymous";
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center">
          <div className="text-muted-foreground">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center">
          <div className="text-muted-foreground">User not found</div>
        </div>
      </div>
    );
  }

  const { user, trips } = profileData;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => setLocation("/explore")}
            data-testid="button-back-to-explore"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </Button>
        </div>

        {/* User Profile Section */}
        <Card className="p-8 mb-12">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.profileImageUrl} alt={getUserDisplayName(user)} />
              <AvatarFallback className="text-2xl">
                {getUserInitial(user)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
                <h1 className="text-3xl font-bold" data-testid="text-user-name">
                  {getUserDisplayName(user)}
                </h1>
                
                {isOwnProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation("/profile-settings")}
                    className="gap-2"
                    data-testid="button-edit-profile"
                  >
                    <Settings className="h-4 w-4" />
                    Edit Profile
                  </Button>
                )}
              </div>
              
              {user.bio && (
                <p className="text-muted-foreground mb-4 whitespace-pre-wrap" data-testid="text-user-bio">
                  {user.bio}
                </p>
              )}
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{trips.length} {trips.length === 1 ? 'trip' : 'trips'} shared</span>
              </div>
            </div>
          </div>
        </Card>

        {/* User's Public Trips */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Public Trips</h2>
          
          {trips.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No public trips yet</p>
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
                        <p className="text-white/90 text-sm flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(trip.startDate)}
                          {trip.days && ` • ${trip.days} days`}
                        </p>
                      )}
                    </div>

                    {/* Cost Badge */}
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-white/95 dark:bg-gray-900/95 text-gray-900 dark:text-white backdrop-blur font-bold text-base px-3 py-1">
                        ${trip.totalCost.toFixed(0)}
                      </Badge>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4">
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

                    {/* Per Day Cost and Unpost Button */}
                    {trip.days && trip.days > 0 && (
                      <div className="mt-3 pt-3 border-t flex items-center justify-between gap-2">
                        <div className="text-sm font-medium text-foreground">
                          ${(trip.totalCost / trip.days).toFixed(0)} per day
                        </div>
                        {isOwnProfile && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => handleUnpost(e, trip.id)}
                            className="gap-1.5 text-xs"
                            data-testid={`button-unpost-${trip.id}`}
                          >
                            <EyeOff className="h-3 w-3" />
                            Unpost
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* User's Travel Map */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">
            My Map
          </h2>
          <Card className="overflow-hidden">
            <MapDisplay 
              userId={userId!} 
              isOwnMap={!!isOwnProfile} 
              height="500px"
            />
          </Card>
          {isOwnProfile && (
            <p className="text-sm text-muted-foreground mt-2">
              Click anywhere on the map to drop a pin where you've traveled
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
