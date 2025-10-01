import CategorySection from "../CategorySection";
import { Plane } from "lucide-react";

export default function CategorySectionExample() {
  const expenses = [
    {
      id: "1",
      description: "Flight to Paris",
      cost: 450,
      url: "https://example.com",
      date: "2024-06-15",
    },
    {
      id: "2",
      description: "Return flight from Rome",
      cost: 380,
      date: "2024-07-05",
    },
  ];

  return (
    <CategorySection
      title="Flights"
      icon={<Plane className="h-5 w-5" />}
      categoryColor="hsl(25, 85%, 55%)"
      expenses={expenses}
      total={830}
      onAddExpense={() => console.log("Add expense")}
      onEditExpense={(id) => console.log("Edit", id)}
      onDeleteExpense={(id) => console.log("Delete", id)}
    />
  );
}
