import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2, X } from "lucide-react";

interface ChartData {
  name: string;
  value: number;
  color: string;
}

interface BudgetChartProps {
  data: ChartData[];
}

export default function BudgetChart({ data }: BudgetChartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percentage = ((item.value / total) * 100).toFixed(1);
      return (
        <div className="bg-card border border-border rounded-md p-4 shadow-lg">
          <p className="font-semibold text-foreground text-base">{item.name}</p>
          <p className="text-sm text-muted-foreground mt-1">
            ${item.value.toLocaleString()} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const ChartComponent = ({ size = "normal" }: { size?: "normal" | "large" }) => {
    const outerRadius = size === "large" ? 250 : 100;
    const innerRadius = size === "large" ? 150 : 60;
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  return (
    <>
      <Card data-testid="card-budget-chart">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Budget Breakdown</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(true)}
            data-testid="button-expand-chart"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ChartComponent size="normal" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            {data.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ${item.value.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-6xl h-[90vh]" data-testid="dialog-expanded-chart">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Budget Breakdown</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" data-testid="button-close-chart">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </DialogHeader>
          <div className="flex-1 h-full pb-8">
            <ChartComponent size="large" />
          </div>
          <div className="mt-4 grid grid-cols-3 md:grid-cols-4 gap-4">
            {data.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ${item.value.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
