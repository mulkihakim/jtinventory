import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export type LoanSummary = {
  pending: number;
  approved: number;
  borrowed: number;
  returned: number;
};

type LoanSummaryCardsProps = {
  summary: LoanSummary;
};

export function LoanSummaryCards({ summary }: LoanSummaryCardsProps) {
  const metricItems = [
    { label: "Pending", value: summary.pending, tone: "secondary" as const },
    { label: "Approved", value: summary.approved, tone: "default" as const },
    { label: "Borrowed", value: summary.borrowed, tone: "outline" as const },
    { label: "Returned", value: summary.returned, tone: "default" as const },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metricItems.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-2xl font-bold">{item.value}</p>
              </div>

              <Badge variant={item.tone}>{item.label}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
