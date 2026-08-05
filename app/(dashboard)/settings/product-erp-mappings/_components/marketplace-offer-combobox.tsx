"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Check, ChevronsUpDown, Loader2, Search, PlusCircle, Tag } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";

interface MarketplaceOffer {
  id: string;
  name: string;
  image_url?: string;
  price?: number;
  channel_sku?: string;
}

interface MarketplaceOfferComboboxProps {
  marketplaceIntegrationId: number;
  value: string;
  onValueChange: (offerId: string, offerName: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MarketplaceOfferCombobox({
  marketplaceIntegrationId,
  value,
  onValueChange,
  disabled,
  placeholder = "Wyszukaj lub wybierz ofertę (po tytule, ID lub SKU)...",
}: MarketplaceOfferComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchQuery(searchQuery), 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data, isLoading } = useQuery<{
    items: MarketplaceOffer[];
    total: number;
  }>({
    queryKey: [
      "marketplaceOffers",
      marketplaceIntegrationId,
      debouncedSearchQuery,
    ],
    queryFn: async () => {
      const response = await api.get(
        `/erp-proxy/integrations/${marketplaceIntegrationId}/offers`,
        { params: { q: debouncedSearchQuery, size: 50 } }
      );
      return response.data;
    },
    enabled: !!marketplaceIntegrationId && open,
  });

  const offers = data?.items ?? [];
  const selectedOffer = useMemo(() => {
    return offers.find((offer) => offer.id === value);
  }, [offers, value]);

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
          className="w-full justify-between font-normal h-11 px-3 bg-card hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-2 truncate">
            {selectedOffer?.image_url ? (
              <img
                src={selectedOffer.image_url}
                alt={selectedOffer.name}
                className="w-7 h-7 object-contain bg-white rounded border shrink-0"
              />
            ) : value ? (
              <Tag className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className="truncate text-sm font-medium">
              {selectedOffer?.name || (value ? `Oferta ID: ${value}` : placeholder)}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[550px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Wpisz tytuł, ID aukcji lub SKU sprzedawcy..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="h-11 text-sm"
          />
          <CommandList className="max-h-[350px]">
            <CommandEmpty className="p-4 text-center text-xs text-muted-foreground">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Przeszukiwanie bazy aukcji w serwisie...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <p>Brak wyników pasujących do &quot;{searchQuery}&quot;.</p>
                  {searchQuery.trim() && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onValueChange(searchQuery.trim(), `Custom ID: ${searchQuery.trim()}`);
                        setOpen(false);
                      }}
                      className="text-xs text-primary hover:bg-primary/10"
                    >
                      <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Użyj wpisanej wartości jako ID &quot;{searchQuery}&quot;
                    </Button>
                  )}
                </div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {offers.map((offer) => (
                <CommandItem
                  key={offer.id}
                  value={offer.id}
                  onSelect={() => {
                    onValueChange(offer.id, offer.name);
                    setOpen(false);
                  }}
                  className="py-2.5 px-3 flex items-center justify-between cursor-pointer border-b border-border/30 last:border-0 hover:bg-muted/60"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0 text-primary transition-opacity",
                        value === offer.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {offer.image_url ? (
                      <img
                        src={offer.image_url}
                        alt={offer.name}
                        className="w-9 h-9 object-contain bg-white rounded border border-border/60 p-0.5 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 bg-muted rounded border flex items-center justify-center text-[10px] text-muted-foreground shrink-0 font-mono">
                        AUKCJA
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold truncate text-foreground leading-tight">
                        {offer.name}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-mono">
                          ID: {offer.id}
                        </Badge>
                        {offer.channel_sku && offer.channel_sku !== offer.id && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono text-muted-foreground">
                            SKU: {offer.channel_sku}
                          </Badge>
                        )}
                      </div>
                    </div>
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
