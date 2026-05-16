"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Check, ChevronsUpDown } from "lucide-react";
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

export interface ErpProduct {
  id: number;
  symbol: string;
  name: string | null;
}

export interface SubiektProductComboboxProps {
  erpIntegrationId: number;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function SubiektProductCombobox({
  erpIntegrationId,
  value,
  onValueChange,
  className,
}: SubiektProductComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
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
    return products?.find(
      (p) => p.symbol.toUpperCase() === value.toUpperCase()
    );
  }, [products, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-8 text-xs font-normal", className)}
        >
          <span className="truncate">
            {value
              ? selectedProduct
                ? `${selectedProduct.symbol} - ${selectedProduct.name}`
                : value
              : "Wyszukaj lub wpisz symbol..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Szukaj po symbolu lub nazwie..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {isProductsLoading ? "Ładowanie..." : "Brak wyników."}
            </CommandEmpty>
            <CommandGroup>
              {products?.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.symbol}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue.toUpperCase());
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.toUpperCase() === product.symbol.toUpperCase()
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
