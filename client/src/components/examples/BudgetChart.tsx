import BudgetChart from "../BudgetChart";

export default function BudgetChartExample() {
  const data = [
    { name: "Flights", value: 830, color: "hsl(25, 85%, 55%)" },
    { name: "Transportation", value: 450, color: "hsl(45, 90%, 50%)" },
    { name: "Accommodation", value: 1200, color: "hsl(150, 60%, 45%)" },
    { name: "Food", value: 600, color: "hsl(0, 70%, 55%)" },
    { name: "Activities", value: 370, color: "hsl(270, 60%, 55%)" },
  ];

  return <BudgetChart data={data} />;
}
