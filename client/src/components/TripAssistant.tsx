import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Minus, Send, Loader2, Plus, PlusCircle, Compass, Crown, Sparkles, Zap, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatContext } from "@/contexts/ChatContext";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser, SignInButton } from "@clerk/clerk-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type ExpenseData = {
  category: string;
  cost: number;
  description: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  expenseData?: ExpenseData;
};

function parseExpenseFromResponse(content: string): ExpenseData | null {
  const expenseMatch = content.match(/```expense\n([\s\S]*?)\n```/);
  if (expenseMatch) {
    try {
      const data = JSON.parse(expenseMatch[1]);
      if (data.category && typeof data.cost === 'number' && data.description) {
        return data as ExpenseData;
      }
    } catch (e) {
    }
  }
  return null;
}

function cleanMessageContent(content: string): string {
  return content.replace(/```expense\n[\s\S]*?\n```/g, '').trim();
}

function formatMarkdown(content: string): string {
  let formatted = content;
  
  // Remove ### headers and make them bold
  formatted = formatted.replace(/^###\s*(.+)$/gm, '$1');
  
  // Remove ** bold markers
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '$1');
  
  // Convert markdown lists with - to bullet points
  formatted = formatted.replace(/^-\s+/gm, '• ');
  
  // Clean up extra newlines
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  
  return formatted.trim();
}

function mapCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    'flights': 'flights',
    'accommodation': 'accommodation',
    'food': 'food',
    'activities': 'activities',
    'local_transportation': 'localTransportation',
    'city_transportation': 'cityTransportation',
    'other': 'other',
  };
  return categoryMap[category] || 'other';
}

function getWelcomeMessage(destination?: string): string {
  if (destination) {
    return `Hi! I'm your travel budgeting assistant. I can help you estimate costs for ${destination}. Ask me things like:\n\n• "What does a typical meal cost in ${destination}?"\n• "How much should I budget for hostels?"\n• "What's the average flight price?"`;
  }
  return `Hi! I'm your travel budgeting assistant. I can help you estimate costs for any destination.\n\nAsk me things like:\n\n• "Where is the cheapest place to travel but have the most amount of fun?"\n\n• "How much would a 5-day trip to Barcelona cost in July?"\n\n• "Can you estimate daily food, hostel, and activity costs for Thailand?"`;
}

function extractDestinationFromMessage(content: string): string | null {
  // Common travel destinations - cities and countries
  const destinations = [
    'Paris', 'London', 'Rome', 'Barcelona', 'Madrid', 'Berlin', 'Amsterdam', 'Prague', 'Vienna', 'Budapest',
    'Lisbon', 'Dublin', 'Edinburgh', 'Brussels', 'Copenhagen', 'Stockholm', 'Oslo', 'Helsinki', 'Athens', 'Istanbul',
    'Venice', 'Florence', 'Milan', 'Munich', 'Zurich', 'Geneva', 'Nice', 'Lyon', 'Marseille', 'Seville',
    'Tokyo', 'Kyoto', 'Osaka', 'Seoul', 'Bangkok', 'Singapore', 'Hong Kong', 'Taipei', 'Hanoi', 'Ho Chi Minh',
    'Bali', 'Phuket', 'Chiang Mai', 'Kuala Lumpur', 'Manila', 'Jakarta', 'Mumbai', 'Delhi', 'Goa',
    'New York', 'Los Angeles', 'San Francisco', 'Chicago', 'Miami', 'Las Vegas', 'Seattle', 'Boston', 'Denver',
    'Mexico City', 'Cancun', 'Cabo', 'Buenos Aires', 'Rio', 'Lima', 'Bogota', 'Cartagena', 'Medellin',
    'Sydney', 'Melbourne', 'Auckland', 'Queenstown', 'Cape Town', 'Marrakech', 'Cairo', 'Dubai', 'Abu Dhabi',
    'France', 'Italy', 'Spain', 'Germany', 'Portugal', 'Greece', 'Croatia', 'Netherlands', 'Belgium', 'Switzerland',
    'Japan', 'Thailand', 'Vietnam', 'Indonesia', 'Philippines', 'Malaysia', 'India', 'China', 'South Korea',
    'Australia', 'New Zealand', 'Morocco', 'Egypt', 'South Africa', 'Mexico', 'Brazil', 'Argentina', 'Colombia', 'Peru',
    'Europe', 'Asia', 'Southeast Asia', 'Central America', 'South America'
  ];
  
  const contentLower = content.toLowerCase();
  
  for (const dest of destinations) {
    if (contentLower.includes(dest.toLowerCase())) {
      return dest;
    }
  }
  
  return null;
}

export default function TripAssistant() {
  const { tripContext, onAddExpense } = useChatContext();
  const [location, setLocation] = useLocation();
  const { isSignedIn } = useUser();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  
  // Hide chatbot on shared trip links and explore trip detail pages
  const isSharedPage = location.startsWith('/share/');
  const isExploreTripPage = location.startsWith('/explore/') && location !== '/explore';
  const shouldHide = isSharedPage || isExploreTripPage;
  
  // Don't render anything on shared/explore detail pages
  if (shouldHide) {
    return null;
  }
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: getWelcomeMessage(tripContext?.destination),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [addedExpenses, setAddedExpenses] = useState<Set<string>>(new Set());
  const [lastMentionedDestination, setLastMentionedDestination] = useState<string | null>(null);
  const [showCTA, setShowCTA] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch subscription status
  const { data: subscription, refetch: refetchSubscription } = useQuery<{
    plan: string;
    aiUsesRemaining: number;
    status: string | null;
    endsAt: string | null;
  }>({
    queryKey: ["/api/subscription"],
    enabled: isSignedIn,
  });

  // Track AI usage mutation
  const trackUsageMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/use");
      return await response.json();
    },
    onSuccess: () => {
      refetchSubscription();
    },
  });

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/billing/checkout");
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: "Error",
          description: "No checkout URL received. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout Failed",
        description: error.message || "Unable to start checkout. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Promo code mutation
  const redeemPromoMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/promo-codes/redeem", { code });
      return await response.json();
    },
    onSuccess: (data) => {
      setPromoSuccess(data.message || "Promo code applied successfully!");
      setPromoError("");
      setPromoCode("");
      refetchSubscription();
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
    },
    onError: (error: any) => {
      setPromoError(error.message || "Invalid promo code");
      setPromoSuccess("");
    },
  });

  const canUseAI = () => {
    if (!isSignedIn) return false;
    if (!subscription) return true; // Loading state, allow
    if (subscription.plan === 'premium') return true;
    return (subscription.aiUsesRemaining || 0) > 0;
  };

  const getRemainingUses = () => {
    if (!subscription) return null;
    if (subscription.plan === 'premium') return 'unlimited';
    return subscription.aiUsesRemaining || 0;
  };

  useEffect(() => {
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: getWelcomeMessage(tripContext?.destination),
    }]);
  }, [tripContext?.destination]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Check if user is signed in
    if (!isSignedIn) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "user",
          content: input.trim(),
        },
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Please sign in to use the AI Travel Assistant. You get 3 free uses every day!",
        },
      ]);
      setInput("");
      return;
    }

    // Check AI usage limits
    if (!canUseAI()) {
      setShowUpgradeModal(true);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    // Try to extract destination from user's question
    const destination = extractDestinationFromMessage(userMessage.content);
    if (destination) {
      setLastMentionedDestination(destination);
    }

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setShowCTA(false);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          tripContext: tripContext || { name: "General Travel" },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantId
                        ? { ...msg, content: fullContent }
                        : msg
                    )
                  );
                }
              } catch (e) {
              }
            }
          }
        }
      }

      // Track AI usage after successful response
      trackUsageMutation.mutate();

      // Try to extract destination from response too
      const responseDestination = extractDestinationFromMessage(fullContent);
      if (responseDestination && !lastMentionedDestination) {
        setLastMentionedDestination(responseDestination);
      }

      const expenseData = parseExpenseFromResponse(fullContent);
      if (expenseData) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, expenseData }
              : msg
          )
        );
      }

      // Show CTA buttons after response completes (only if not on a trip detail page with expense handler)
      if (!onAddExpense) {
        setShowCTA(true);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? { ...msg, content: "Sorry, I had trouble processing that. Please try again." }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExpense = (messageId: string, expense: ExpenseData) => {
    if (onAddExpense) {
      onAddExpense({
        ...expense,
        category: mapCategory(expense.category),
      });
      setAddedExpenses((prev) => new Set(prev).add(messageId));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className={cn(
          "!fixed !bottom-6 !right-6 !left-auto z-50 h-14 w-14 rounded-full shadow-lg",
          isOpen && "bg-muted text-muted-foreground"
        )}
        style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', left: 'auto' }}
        data-testid="button-trip-assistant"
      >
        {isOpen ? <Minus className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat Panel */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-8rem)] flex flex-col shadow-xl border">
          {/* Header */}
          <div className="p-4 border-b bg-primary text-primary-foreground rounded-t-lg flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Travel Budget Assistant</h3>
              <p className="text-xs opacity-90">
                {tripContext?.destination 
                  ? `Ask me about costs for ${tripContext.destination}`
                  : "Ask me about travel costs anywhere"
                }
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              data-testid="button-minimize-chat"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>

          {/* Sign-in Required Message for Non-Authenticated Users */}
          {!isSignedIn ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <LogIn className="h-8 w-8 text-primary" />
              </div>
              <h4 className="font-semibold text-lg mb-2">Sign In Required</h4>
              <p className="text-muted-foreground text-sm mb-6">
                Sign in to use the AI Travel Budget Assistant and get personalized cost estimates for your trips.
              </p>
              <SignInButton mode="modal">
                <Button data-testid="button-signin-chat">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In to Continue
                </Button>
              </SignInButton>
            </div>
          ) : (
          <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex flex-col gap-2",
                    message.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="whitespace-pre-wrap">
                      {formatMarkdown(cleanMessageContent(message.content))}
                    </p>
                  </div>

                  {/* Add to Budget Button - only show if on a trip page with expense handler */}
                  {message.expenseData && onAddExpense && !addedExpenses.has(message.id) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs h-8"
                      onClick={() => handleAddExpense(message.id, message.expenseData!)}
                      data-testid={`button-add-expense-${message.id}`}
                    >
                      <Plus className="h-3 w-3" />
                      Add ${message.expenseData.cost} to {message.expenseData.category.replace('_', ' ')}
                    </Button>
                  )}

                  {/* Added Confirmation */}
                  {message.expenseData && addedExpenses.has(message.id) && (
                    <span className="text-xs text-green-600 dark:text-green-400">
                      Added to budget
                    </span>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && messages[messages.length - 1]?.content === "" && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Thinking...</span>
                </div>
              )}

              {/* CTA Buttons - show after assistant responds */}
              {showCTA && !isLoading && (
                <div className="flex gap-2 flex-wrap mt-3">
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-1.5 text-xs"
                    onClick={() => {
                      setLocation("/my-trips");
                      setIsOpen(false);
                    }}
                    data-testid="button-cta-create-trip"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Create Trip
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() => {
                      setLocation("/explore");
                      setIsOpen(false);
                    }}
                    data-testid="button-cta-explore"
                  >
                    <Compass className="h-3.5 w-3.5" />
                    Explore Trips
                  </Button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t">
            {/* Usage indicator for signed-in users */}
            {isSignedIn && subscription && (
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                {subscription.plan === 'premium' ? (
                  <>
                    <Crown className="h-3 w-3 text-yellow-500" />
                    <span>Premium - Unlimited uses</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" />
                    <span>{getRemainingUses()} of 3 uses left today</span>
                    {(getRemainingUses() as number) === 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-auto p-0 text-xs text-primary underline"
                        onClick={() => setShowUpgradeModal(true)}
                      >
                        Upgrade
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about travel costs..."
                disabled={isLoading}
                className="flex-1"
                data-testid="input-chat-message"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          </>
          )}
        </Card>
      )}

      {/* Upgrade Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Upgrade to Premium
            </DialogTitle>
            <DialogDescription>
              You've used all 3 of your daily AI assistant messages. Upgrade to Premium for unlimited access!
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Benefits */}
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Premium Benefits - $2/month
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  Unlimited AI Travel Assistant usage
                </li>
                <li className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4 text-green-500" />
                  Unlimited trip creation
                </li>
              </ul>
            </div>

            {/* Upgrade Button */}
            <Button 
              className="w-full" 
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
              data-testid="button-upgrade-premium"
            >
              {checkoutMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Crown className="h-4 w-4 mr-2" />
              )}
              Upgrade for $2/month
            </Button>

            {/* Promo Code Section */}
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-2">Have a promo code?</p>
              <div className="flex gap-2">
                <Input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="flex-1"
                  data-testid="input-promo-code"
                />
                <Button
                  variant="outline"
                  onClick={() => redeemPromoMutation.mutate(promoCode)}
                  disabled={!promoCode.trim() || redeemPromoMutation.isPending}
                  data-testid="button-apply-promo"
                >
                  {redeemPromoMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Apply"
                  )}
                </Button>
              </div>
              {promoError && (
                <p className="text-xs text-destructive mt-1">{promoError}</p>
              )}
              {promoSuccess && (
                <p className="text-xs text-green-600 mt-1">{promoSuccess}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
