import { useUser as useClerkUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { type User } from "@shared/schema";

export function useAuth() {
  const { isSignedIn, isLoaded, user: clerkUser } = useClerkUser();

  const { data: dbUser, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: isSignedIn,
    retry: false,
  });

  return {
    user: dbUser,
    clerkUser,
    isLoading: !isLoaded || isLoading,
    isAuthenticated: isSignedIn && !!dbUser,
  };
}
