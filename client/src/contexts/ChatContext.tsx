import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type ExpenseData = {
  category: string;
  cost: number;
  description: string;
};

type TripContext = {
  name: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
};

type ChatContextType = {
  tripContext: TripContext | null;
  onAddExpense: ((expense: ExpenseData) => void) | null;
  setTripContext: (context: TripContext | null) => void;
  setExpenseHandler: (handler: ((expense: ExpenseData) => void) | null) => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [tripContext, setTripContext] = useState<TripContext | null>(null);
  const [onAddExpense, setOnAddExpense] = useState<((expense: ExpenseData) => void) | null>(null);

  const setExpenseHandler = useCallback((handler: ((expense: ExpenseData) => void) | null) => {
    setOnAddExpense(() => handler);
  }, []);

  return (
    <ChatContext.Provider value={{ tripContext, onAddExpense, setTripContext, setExpenseHandler }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}
