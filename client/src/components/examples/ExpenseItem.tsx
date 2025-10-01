import ExpenseItem from "../ExpenseItem";
import { Plane } from "lucide-react";

export default function ExpenseItemExample() {
  return (
    <ExpenseItem
      description="Flight to Paris"
      cost={450}
      url="https://example.com"
      date="2024-06-15"
      icon={<Plane className="h-5 w-5" />}
      categoryColor="hsl(25, 85%, 55%)"
      onEdit={() => console.log("Edit clicked")}
      onDelete={() => console.log("Delete clicked")}
    />
  );
}
