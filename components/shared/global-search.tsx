"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, Package, ArrowRightLeft, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import api from "@/lib/api";
import Link from "next/link";

const getProductsLabel = (order: any) => {
  const items = order.line_items || [];
  if (items.length === 0) return "Brak produktów";
  const firstItemName = items[0]?.offer?.name || items[0]?.name || "Produkt";
  if (items.length > 1) {
    return `${firstItemName} (+${items.length - 1})`;
  }
  return firstItemName;
};

const getReturnProductsLabel = (ret: any) => {
  if (ret.order) {
    return getProductsLabel(ret.order);
  }
  return ret.external_return_id || ret.reference_number || "Zwrot";
};

const translateStatus = (status: string) => {
  if (!status) return "Nieznany";
  const s = String(status).toUpperCase();
  switch (s) {
    case "NEW": return "Nowe";
    case "PROCESSING": return "W realizacji";
    case "READY_FOR_SHIPMENT": return "Gotowe do wysyłki";
    case "SENT": return "Wysłane";
    case "CANCELLED": return "Anulowane";
    default: return status;
  }
};

const translateReturnStatus = (status: string) => {
  if (!status) return "Nieznany";
  const s = String(status).toUpperCase();
  switch (s) {
    case "NEW": return "Nowy";
    case "PROCESSING": return "W procesie";
    case "COMPLETED": return "Zakończony";
    case "REFUNDED": return "Zwrócono środki";
    case "REJECTED": return "Odrzucony";
    default: return status;
  }
};

interface SearchResult {
  orders: any[];
  returns: any[];
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult>({ orders: [], returns: [] });
  
  const debouncedQuery = useDebounce(query, 400);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Zamykanie po kliknięciu poza komponentem
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        if (!query) {
          setIsExpanded(false);
        } else {
            // Jeśli mamy wpisany tekst i klikamy poza, można zamknąć całą lupkę (dropdown) 
            // jeśli użytkownik tak woli, ale zostawiamy rozwinięte z zapytaniem żeby nie gubić kontekstu.
            // Poniższa logika zwinęłaby to całkowicie. Użytkownik prosił by "nie przeszkadzała".
            // Zatem zamykamy dropdown po kliknięciu poza.
            setIsExpanded(false); 
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [query]);

  // Pobieranie danych
  useEffect(() => {
    if (!isExpanded || debouncedQuery.length < 2) {
      setResults({ orders: [], returns: [] });
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [ordersRes, returnsRes] = await Promise.all([
          api.get(`/orders?search=${encodeURIComponent(debouncedQuery)}&size=5`),
          api.get(`/returns?search=${encodeURIComponent(debouncedQuery)}&size=3`)
        ]);
        
        if (!isCancelled) {
          setResults({
            orders: ordersRes.data?.items || [],
            returns: returnsRes.data?.items || []
          });
        }
      } catch (error) {
        console.error("Search error", error);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    fetchData();
    return () => { isCancelled = true; };
  }, [debouncedQuery, isExpanded]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/orders?search=${encodeURIComponent(query.trim())}`);
      setQuery("");
      setIsExpanded(false);
    } else if (!isExpanded) {
      setIsExpanded(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const clearAndClose = () => {
    setQuery("");
    setIsExpanded(false);
  };

  const showDropdown = isExpanded && query.length >= 2;
  const hasResults = results.orders.length > 0 || results.returns.length > 0;

  return (
    <div ref={containerRef} className="relative z-50">
      <motion.form
        onSubmit={handleSearch}
        initial={false}
        animate={{ width: isExpanded ? 320 : 44 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "relative flex items-center h-11 bg-slate-950/40 backdrop-blur-xl border rounded-full shadow-lg overflow-hidden transition-colors duration-300",
          isExpanded ? "border-primary/50 shadow-primary/10" : "border-border/30 hover:border-border/60 hover:bg-slate-900/60"
        )}
      >
        <button
          type="button"
          onClick={() => {
            if (!isExpanded) {
              setIsExpanded(true);
              setTimeout(() => inputRef.current?.focus(), 100);
            } else if (query.trim()) {
              handleSearch(new Event("submit") as any);
            }
          }}
          className={cn(
            "absolute left-0 top-0 h-11 w-11 flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground z-10",
            isExpanded && "text-primary hover:text-primary/80"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Search className="h-5 w-5" />
          )}
        </button>

        <Input
          ref={inputRef}
          placeholder="ID, nick, nr listu..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isExpanded) setIsExpanded(true);
          }}
          onFocus={() => setIsExpanded(true)}
          className={cn(
            "pl-11 pr-10 h-full w-full bg-transparent border-none focus-visible:ring-0 rounded-full text-sm font-semibold placeholder:text-muted-foreground/60 text-foreground transition-opacity duration-200",
            isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        />

        <AnimatePresence>
          {isExpanded && query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              type="button"
              onClick={clearAndClose}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full hover:bg-white/10 transition-colors z-10"
            >
              <X className="h-4 w-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.form>

      {/* Wyniki wyszukiwania w dropdownie */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-[360px] max-h-[400px] overflow-y-auto bg-slate-950/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-2 z-50 flex flex-col gap-2 scrollbar-none"
          >
            {isLoading && !hasResults ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground text-xs">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Wyszukiwanie...
              </div>
            ) : !hasResults ? (
              <div className="text-center py-6 text-muted-foreground text-xs font-medium">
                Brak wyników dla &quot;{query}&quot;
              </div>
            ) : (
              <>
                {results.orders.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <div className="px-2 py-1 flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <Package className="h-3 w-3" /> Zamówienia
                    </div>
                    {results.orders.map((order) => (
                      <Link
                        key={order.id}
                        href={`/orders/${order.id}`}
                        target="_blank"
                        onClick={() => setIsExpanded(false)}
                        className="flex flex-col gap-0.5 p-2 rounded-xl hover:bg-white/5 transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1" title={getProductsLabel(order)}>
                            {getProductsLabel(order)}
                          </span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                          <span className="truncate text-foreground/80 font-medium max-w-[90px]" title={order.buyer_login || "Brak loginu"}>
                            {order.buyer_login || "Brak loginu"}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-border/40 shrink-0" />
                          <span className="shrink-0 font-semibold px-1 py-0.2 bg-primary/10 border border-primary/20 text-primary rounded-[3px] text-[8px] uppercase">
                            {translateStatus(order.status)}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-border/40 shrink-0" />
                          <span className="shrink-0">
                            {order.purchased_at ? new Date(order.purchased_at).toLocaleDateString('pl-PL') : ""}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-border/40 shrink-0" />
                          <span className="shrink-0 font-mono text-[9px] text-muted-foreground/60">
                            {order.external_order_id}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {results.returns.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1 pt-2 border-t border-border/20">
                    <div className="px-2 py-1 flex items-center gap-2 text-[10px] font-bold text-rose-500/80 uppercase tracking-wider">
                      <ArrowRightLeft className="h-3 w-3" /> Zwroty
                    </div>
                    {results.returns.map((ret) => (
                      <Link
                        key={ret.id}
                        href={`/returns/${ret.id}`}
                        target="_blank"
                        onClick={() => setIsExpanded(false)}
                        className="flex flex-col gap-0.5 p-2 rounded-xl hover:bg-white/5 transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-foreground group-hover:text-rose-400 transition-colors line-clamp-1" title={getReturnProductsLabel(ret)}>
                            {getReturnProductsLabel(ret)}
                          </span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                          <span className="truncate text-foreground/80 font-medium max-w-[90px]" title={ret.buyer_login || "Brak loginu"}>
                            {ret.buyer_login || "Brak loginu"}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-border/40 shrink-0" />
                          <span className="shrink-0 font-semibold px-1 py-0.2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-[3px] text-[8px] uppercase">
                            {translateReturnStatus(ret.status)}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-border/40 shrink-0" />
                          <span className="shrink-0">
                            {ret.created_at ? new Date(ret.created_at).toLocaleDateString('pl-PL') : ""}
                          </span>
                          {ret.order?.external_order_id && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-border/40 shrink-0" />
                              <span className="shrink-0 font-mono text-[9px] text-muted-foreground/60">
                                {ret.order.external_order_id}
                              </span>
                            </>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
