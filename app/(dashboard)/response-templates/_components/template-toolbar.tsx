// src/app/(dashboard)/response-templates/_components/template-toolbar.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle } from "lucide-react";

interface TemplateToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onAddClick: () => void;
}

export function TemplateToolbar({
  searchQuery,
  setSearchQuery,
  onAddClick,
}: TemplateToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <Input
        placeholder="Filtruj po tytule lub tagu..."
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        className="h-9 max-w-sm"
      />
      <Button onClick={onAddClick}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Dodaj Szablon
      </Button>
    </div>
  );
}
