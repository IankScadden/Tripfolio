import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import ExpenseItem from "./ExpenseItem";

interface Expense {
  id: string;
  description: string;
  cost: number;
  url?: string;
  date?: string;
}

interface CategorySectionProps {
  title: string;
  icon: React.ReactNode;
  categoryColor: string;
  expenses: Expense[];
  total: number;
  onAddExpense: () => void;
  onEditExpense: (id: string) => void;
  onDeleteExpense: (id: string) => void;
}

export default function CategorySection({
  title,
  icon,
  categoryColor,
  expenses,
  total,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
}: CategorySectionProps) {
  return (
    <Card data-testid={`card-category-${title}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-md flex items-center justify-center"
            style={{ backgroundColor: categoryColor + "20", color: categoryColor }}
          >
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground" data-testid={`text-category-${title}`}>
              {title}
            </h3>
            <p className="text-sm text-muted-foreground" data-testid={`text-category-total-${title}`}>
              ${total.toLocaleString()} total
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={onAddExpense}
          data-testid={`button-add-${title}`}
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4" data-testid={`text-empty-${title}`}>
            No expenses added yet
          </p>
        ) : (
          expenses.map((expense) => (
            <ExpenseItem
              key={expense.id}
              description={expense.description}
              cost={expense.cost}
              url={expense.url}
              date={expense.date}
              icon={icon}
              categoryColor={categoryColor}
              onEdit={() => onEditExpense(expense.id)}
              onDelete={() => onDeleteExpense(expense.id)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
