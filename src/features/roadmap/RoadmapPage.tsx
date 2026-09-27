import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface RoadmapItem {
  title: string;
  body: string;
}

interface RoadmapPageProps {
  phase: string;
  title: string;
  subtitle: string;
  description: string;
  items: RoadmapItem[];
}

/**
 * Honest placeholder: sections not yet implemented get a real explanation of
 * what is coming and when — never a fake dashboard.
 */
export function RoadmapPage({
  phase,
  title,
  subtitle,
  description,
  items,
}: RoadmapPageProps) {
  return (
    <div className="mx-auto max-w-4xl px-8 py-12">
      <div className="pb-8">
        <Badge variant="default" className="mb-3">
          <Construction className="h-3 w-3" />
          Under construction · {phase}
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm font-medium text-primary/90">{subtitle}</p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <Card key={item.title} className="overflow-hidden">
            <CardContent className="p-5">
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-8 text-xs text-muted-foreground/70">
        This screen is a live roadmap entry — the feature will appear here when its
        phase lands. No mock data, ever.
      </p>
    </div>
  );
}
