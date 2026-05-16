"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ErpProduct {
  id: number;
  symbol: string;
  name: string | null;
}

interface SubiektProductComboboxProps {
  erpIntegrationId: number;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function SubiektProductCombobox({
  erpIntegrationId,
  value,
  onValueChange,
  disabled,
}: SubiektProductComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: products, isLoading: isProductsLoading } = useQuery<
    ErpProduct[]
  >({
    queryKey: ["subiektProducts", erpIntegrationId, debouncedSearchQuery],
    queryFn: async () => {
      const response = await api.get(
        `/erp-proxy/integrations/${erpIntegrationId}/products`,
        { params: { q: debouncedSearchQuery } }
      );
      return response.data;
    },
    enabled: !!erpIntegrationId && open,
  });

  const selectedProduct = useMemo(() => {
    // === POPRAWKA: Defensywne sprawdzenie `value` ===
    // Jeśli `value` nie jest stringiem, nie próbuj na nim operować.
    if (typeof value !== "string") {
      return null;
    }
    return products?.find(
      (p) => p.symbol.toUpperCase() === value.toUpperCase()
    );
  }, [products, value]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {selectedProduct
              ? `${selectedProduct.symbol} - ${selectedProduct.name}`
              : value || "Wyszukaj lub wpisz symbol..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput
            placeholder="Szukaj po symbolu lub nazwie..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {isProductsLoading ? (
                <div className="p-2 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                "Brak wyników."
              )}
            </CommandEmpty>
            <CommandGroup>
              {products?.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.symbol} // `value` jest stringiem
                  onSelect={(currentValue) => {
                    // Używamy onSelect
                    onValueChange(currentValue.toUpperCase());
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      (value || "").toUpperCase() ===
                        product.symbol.toUpperCase()
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{product.symbol}</span>
                    <span className="text-xs text-muted-foreground">
                      {product.name}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
