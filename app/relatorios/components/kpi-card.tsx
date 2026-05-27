import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  subValue?: string;
  /** Variação percentual vs período anterior */
  variation?: number;
  /** Se true, variação negativa é boa (ex: CPL) */
  inverse?: boolean;
  icon: React.ElementType;
}

export function KpiCard({
  title,
  value,
  subValue,
  variation,
  inverse = false,
  icon: Icon,
}: KpiCardProps) {
  const hasVariation = variation !== undefined;
  const isPositive = hasVariation && variation >= 0;
  const isGood = hasVariation && (inverse ? !isPositive : isPositive);

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="font-heading text-2xl font-bold text-foreground">
              {value}
            </p>
            {subValue && (
              <p className="text-xs text-muted-foreground">{subValue}</p>
            )}
            {hasVariation && (
              <div className="flex items-center gap-1">
                <TrendingUp
                  className={cn(
                    "h-4 w-4",
                    isPositive ? "" : "rotate-180",
                    isGood ? "text-success" : "text-danger",
                  )}
                />
                <span
                  className={cn(
                    "text-sm font-medium",
                    isGood ? "text-success" : "text-danger",
                  )}
                >
                  {isPositive ? "+" : ""}
                  {variation.toFixed(1)}%
                </span>
                <span className="ml-1 text-xs text-muted-foreground">
                  vs mês anterior
                </span>
              </div>
            )}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
