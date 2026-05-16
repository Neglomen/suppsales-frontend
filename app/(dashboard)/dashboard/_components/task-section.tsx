"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const initialTasks = [
  { id: 1, text: "Zweryfikować synchronizację KSeF", status: "pending", priority: "high" },
  { id: 2, text: "Ustawić mapowanie kurierów dla Allegro", status: "completed", priority: "medium" },
  { id: 3, text: "Połączyć nowe konto Subiekt ERP", status: "pending", priority: "medium" },
  { id: 4, text: "Pobrać faktury archiwalne z KSeF", status: "pending", priority: "low" },
];

export function TaskSection() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-bold">Zadania i Priorytety</CardTitle>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full">
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {initialTasks.map((task) => (
            <div key={task.id} className="flex items-start gap-3 group">
              <Checkbox id={`task-${task.id}`} checked={task.status === "completed"} className="mt-1" />
              <div className="flex-1 min-w-0">
                <label
                  htmlFor={`task-${task.id}`}
                  className={`text-sm font-medium leading-none cursor-pointer group-hover:text-primary transition-colors ${
                    task.status === "completed" ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {task.text}
                </label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="outline" className={`text-[10px] uppercase tracking-wider h-4 px-1 ${
                    task.priority === "high" ? "text-destructive border-destructive/20 bg-destructive/5" : 
                    task.priority === "medium" ? "text-yellow-600 border-yellow-600/20 bg-yellow-600/5" :
                    "text-blue-600 border-blue-600/20 bg-blue-600/5"
                  }`}>
                    {task.priority === "high" ? "Wysoki" : task.priority === "medium" ? "Średni" : "Niski"}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
