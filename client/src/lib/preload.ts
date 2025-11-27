import { queryClient } from "./queryClient";

// Preload functions for lazy-loaded pages
// Call these on hover to load pages before navigation

const imports = {
  myTrips: () => import("@/pages/TripsList"),
  tripDetail: () => import("@/pages/TripDetail"),
  postTrip: () => import("@/pages/PostTrip"),
  itinerary: () => import("@/pages/ItineraryPlanner"),
  sharedTrip: () => import("@/pages/SharedTrip"),
  explore: () => import("@/pages/Explore"),
  exploreTripDetail: () => import("@/pages/ExploreTripDetail"),
  profileSettings: () => import("@/pages/ProfileSettings"),
  publicProfile: () => import("@/pages/PublicProfile"),
  myMap: () => import("@/pages/MyMap"),
  travelDeals: () => import("@/pages/TravelDeals"),
};

// Cache to prevent duplicate imports
const preloaded = new Set<string>();

// Prefetch trip data for faster navigation
export const prefetchTripData = (tripId: string) => {
  queryClient.prefetchQuery({
    queryKey: ["/api/trips", tripId],
  });
  queryClient.prefetchQuery({
    queryKey: ["/api/trips", tripId, "expenses"],
  });
};

// Prefetch trips list data
export const prefetchTripsListData = () => {
  queryClient.prefetchQuery({
    queryKey: ["/api/trips"],
  });
};

// Prefetch explore page data
export const prefetchExploreData = () => {
  queryClient.prefetchQuery({
    queryKey: ["/api/explore/trips"],
  });
};

export const preloadPage = {
  myTrips: () => {
    if (!preloaded.has("myTrips")) {
      preloaded.add("myTrips");
      imports.myTrips();
    }
  },
  tripDetail: () => {
    if (!preloaded.has("tripDetail")) {
      preloaded.add("tripDetail");
      imports.tripDetail();
    }
  },
  postTrip: () => {
    if (!preloaded.has("postTrip")) {
      preloaded.add("postTrip");
      imports.postTrip();
    }
  },
  itinerary: () => {
    if (!preloaded.has("itinerary")) {
      preloaded.add("itinerary");
      imports.itinerary();
    }
  },
  sharedTrip: () => {
    if (!preloaded.has("sharedTrip")) {
      preloaded.add("sharedTrip");
      imports.sharedTrip();
    }
  },
  explore: () => {
    if (!preloaded.has("explore")) {
      preloaded.add("explore");
      imports.explore();
    }
  },
  exploreTripDetail: () => {
    if (!preloaded.has("exploreTripDetail")) {
      preloaded.add("exploreTripDetail");
      imports.exploreTripDetail();
    }
  },
  profileSettings: () => {
    if (!preloaded.has("profileSettings")) {
      preloaded.add("profileSettings");
      imports.profileSettings();
    }
  },
  publicProfile: () => {
    if (!preloaded.has("publicProfile")) {
      preloaded.add("publicProfile");
      imports.publicProfile();
    }
  },
  myMap: () => {
    if (!preloaded.has("myMap")) {
      preloaded.add("myMap");
      imports.myMap();
    }
  },
  travelDeals: () => {
    if (!preloaded.has("travelDeals")) {
      preloaded.add("travelDeals");
      imports.travelDeals();
    }
  },
};
