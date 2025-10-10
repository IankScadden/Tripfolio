import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { Compass } from "lucide-react";

export default function Header() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="link-home">
            <Compass className="w-6 h-6 text-primary" />
            <span className="text-xl font-semibold">TripBudget</span>
          </Link>
          
          <nav className="flex items-center gap-6">
            {isAuthenticated && (
              <>
                <Link href="/my-trips" className="text-sm font-medium hover:text-primary transition-colors" data-testid="link-my-trips">
                  My Trips
                </Link>
                <Link href="/explore" className="text-sm font-medium hover:text-primary transition-colors" data-testid="link-explore">
                  Explore
                </Link>
              </>
            )}
            {isAuthenticated ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = "/api/logout"}
                data-testid="button-header-logout"
              >
                Logout
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => window.location.href = "/api/login"}
                data-testid="button-header-login"
              >
                Sign In
              </Button>
            )}
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
}
