"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import Link from "next/link";

const checklistItems = [
  {
    id: "integration",
    title: "Dodaj swoją pierwszą integrację",
    description: "Połącz się z Allegro, BaseLinker lub innym marketplace.",
    link: "/settings/integrations",
    completed: true,
  },
  {
    id: "smtp",
    title: "Skonfiguruj konto SMTP",
    description: "Pozwoli to na wysyłanie e-maili do klientów.",
    link: "/settings/smtp",
    completed: false,
  },
  {
    id: "template",
    title: "Stwórz szablon odpowiedzi",
    description: "Przyspiesz komunikację z klientami.",
    link: "/settings/templates",
    completed: false,
  },
];

export function OnboardingChecklist() {
  const completedCount = checklistItems.filter((item) => item.completed).length;
  const progressValue = (completedCount / checklistItems.length) * 100;

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Zacznijmy!</CardTitle>
        <CardDescription>
          Wykonaj poniższe kroki, aby w pełni wykorzystać potencjał SuppSales.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-x-3 mb-4">
          <Progress value={progressValue} className="w-full" />
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            {completedCount} / {checklistItems.length}
          </span>
        </div>
        <ul className="space-y-4">
          {checklistItems.map((item) => (
            <li key={item.id}>
              <Link
                href={item.link}
                className="flex items-start gap-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={item.completed}
                  aria-label={`Status for ${item.title}`}
                  className="mt-1"
                />
                <div>
                  <p
                    className={cn(
                      "font-semibold leading-none",
                      item.completed && "line-through text-muted-foreground"
                    )}
                  >
                    {item.title}
                  </p>
                  <p
                    className={cn(
                      "text-sm text-muted-foreground mt-1",
                      item.completed && "line-through"
                    )}
                  >
                    {item.description}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
