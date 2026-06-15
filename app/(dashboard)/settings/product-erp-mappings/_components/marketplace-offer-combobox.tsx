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

interface MarketplaceOffer {
  id: string;
  name: string;
  image_url?: string;
}

interface MarketplaceOfferComboboxProps {
  marketplaceIntegrationId: number;
  value: string;
  onValueChange: (offerId: string, offerName: string) => void;
  disabled?: boolean;
}

export function MarketplaceOfferCombobox({
  marketplaceIntegrationId,
  value,
  onValueChange,
  disabled,
}: MarketplaceOfferComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
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

  // Gdy popover się zamyka, a nie wybrano wartości, resetujemy wyszukiwanie
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
            {selectedOffer?.name || value || "Wybierz ofertę..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0">
        <Command>
          <CommandInput
            placeholder="Szukaj po nazwie oferty..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? (
                <div className="p-2 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                "Brak ofert."
              )}
            </CommandEmpty>
            <CommandGroup>
              {offers.map((offer) => (
                <CommandItem
                  key={offer.id}
                  value={offer.id} // `value` w CommandItem jest używane do filtrowania i identyfikacji
                  onSelect={() => {
                    // Używamy onSelect do pewnego przekazania wartości
                    onValueChange(offer.id, offer.name);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === offer.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {offer.image_url ? (
                    <img src={offer.image_url} alt={offer.name} className="w-8 h-8 object-contain bg-white p-0.5 rounded mr-2 shrink-0" />
                  ) : (
                    <div className="w-8 h-8 bg-muted rounded mr-2 shrink-0 flex items-center justify-center text-xs">
                      Brak
                    </div>
                  )}
                  <span className="truncate">{offer.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
