import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

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

type TripContext = {
  name: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
};

type TripAssistantProps = {
  tripContext: TripContext;
  onAddExpense: (expense: ExpenseData) => void;
};

// Parse expense data from AI response
function parseExpenseFromResponse(content: string): ExpenseData | null {
  const expenseMatch = content.match(/```expense\n([\s\S]*?)\n```/);
  if (expenseMatch) {
    try {
      const data = JSON.parse(expenseMatch[1]);
      if (data.category && typeof data.cost === 'number' && data.description) {
        return data as ExpenseData;
      }
    } catch (e) {
      // Failed to parse, return null
    }
  }
  return null;
}

// Remove expense code block from display text
function cleanMessageContent(content: string): string {
  return content.replace(/```expense\n[\s\S]*?\n```/g, '').trim();
}

// Map AI category names to our category values
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

export default function TripAssistant({ tripContext, onAddExpense }: TripAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hi! I'm your travel budgeting assistant. I can help you estimate costs for ${tripContext.destination || "your trip"}. Ask me things like:\n\n• "What does a typical meal cost in Madrid?"\n• "How much should I budget for hostels?"\n• "What's the average flight price to Barcelona?"`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [addedExpenses, setAddedExpenses] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Create placeholder for assistant response
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
          tripContext,
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
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // After streaming is complete, parse for expense data
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
    onAddExpense({
      ...expense,
      category: mapCategory(expense.category),
    });
    setAddedExpenses((prev) => new Set(prev).add(messageId));
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
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg",
          isOpen && "bg-muted text-muted-foreground"
        )}
        data-testid="button-trip-assistant"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat Panel */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 z-50 w-[380px] h-[500px] flex flex-col shadow-xl border">
          {/* Header */}
          <div className="p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
            <h3 className="font-semibold">Travel Budget Assistant</h3>
            <p className="text-xs opacity-90">
              Ask me about costs for {tripContext.destination || "your trip"}
            </p>
          </div>

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
                      {cleanMessageContent(message.content)}
                    </p>
                  </div>

                  {/* Add to Budget Button */}
                  {message.expenseData && !addedExpenses.has(message.id) && (
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

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t">
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
        </Card>
      )}
    </>
  );
}
