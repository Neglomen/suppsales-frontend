"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, RefreshCw, CheckCircle2, PlusCircle, ArrowRight, Wand2 } from "lucide-react";
import toast from "react-hot-toast";

interface AutoMatchItem {
  service_integration_id: number;
  service_integration_name: string;
  external_offer_id: string;
  offer_name: string;
  offer_sku: string;
  matched_product_id: string | null;
  matched_product_name: string | null;
  action: "LINK_EXISTING" | "CREATE_NEW";
}

interface AutoLinkWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AutoLinkWizardModal({
  open,
  onOpenChange,
  onSuccess,
}: AutoLinkWizardModalProps) {
  const [items, setItems] = useState<AutoMatchItem[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const fetchPreview = async () => {
    try {
      setIsLoading(true);
      const res = await api.post("/inventory/auto-match-preview");
      const fetchedItems: AutoMatchItem[] = res.data.items || [];
      setItems(fetchedItems);
      // Select all by default
      setSelectedIndices(fetchedItems.map((_, idx) => idx));
    } catch (error: any) {
      console.error("Auto match preview error", error);
      toast.error("Nie udało się pobrać propozycji automatycznych powiązań.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchPreview();
    }
  }, [open]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIndices(items.map((_, idx) => idx));
    } else {
      setSelectedIndices([]);
    }
  };

  const handleToggleOne = (index: number) => {
    if (selectedIndices.includes(index)) {
      setSelectedIndices((prev) => prev.filter((i) => i !== index));
    } else {
      setSelectedIndices((prev) => [...prev, index]);
    }
  };

  const handleConfirm = async () => {
    const selectedItems = selectedIndices.map((idx) => items[idx]);
    if (selectedItems.length === 0) {
      toast.error("Zaznacz co najmniej jedną pozycję do podpięcia.");
      return;
    }

    try {
      setIsConfirming(true);
      toast.loading("Zatwierdzanie i podpinanie aukcji...", { id: "confirm-auto-match" });
      const res = await api.post("/inventory/auto-match-confirm", { items: selectedItems });
      toast.success(res.data.message || "Pomyślnie powiązano oferty z magazynem!", {
        id: "confirm-auto-match",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Nie udało się zatwierdzić powiązań.", { id: "confirm-auto-match" });
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                Magiczny Kreator Powiązań Allegro / ERP
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                Automatycznie wykrywa niepodpięte aukcje Allegro i dopasowuje je do produktów w magazynie lub tworzy nowe towary jednym kliknięciem.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-[300px] border rounded-lg p-2 bg-card mt-2">
          {isLoading ? (
            <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="font-semibold text-sm">Skanowanie ofert Allegro i szukanie dopasowań...</p>
              <p className="text-xs text-muted-foreground mt-1">To może zająć kilka sekund.</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground border border-dashed rounded-lg flex flex-col items-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
              <p className="font-semibold">Wszystkie aktywne aukcje Allegro są już podpięte!</p>
              <p className="text-xs text-muted-foreground mt-1">Brak nowych niepowiązanych ofert do przetworzenia.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-[40px] pl-4">
                    <Checkbox
                      checked={selectedIndices.length === items.length}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    />
                  </TableHead>
                  <TableHead>Konto / Integracja</TableHead>
                  <TableHead>Oferta Allegro</TableHead>
                  <TableHead className="text-center">Akcja Systemu</TableHead>
                  <TableHead>Dopasowany Produkt Centralny</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => {
                  const isChecked = selectedIndices.includes(idx);
                  return (
                    <TableRow key={idx} className={isChecked ? "bg-primary/5" : ""}>
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleToggleOne(idx)}
                        />
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        <Badge variant="outline">{item.service_integration_name}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm line-clamp-1">{item.offer_name}</div>
                        <div className="text-xs text-muted-foreground font-mono">ID: {item.external_offer_id}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.action === "LINK_EXISTING" ? (
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Znaleziono Towar
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-indigo-500/30 text-indigo-600 bg-indigo-500/10 gap-1">
                            <PlusCircle className="h-3 w-3" /> Utwórz Nowy
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.matched_product_name ? (
                          <div className="font-semibold text-foreground">{item.matched_product_name}</div>
                        ) : (
                          <span className="text-muted-foreground italic">Automatycznie utworzy produkt z tytułu aukcji</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between mt-4">
          <div className="text-xs text-muted-foreground">
            Zaznaczono <span className="font-bold text-foreground">{selectedIndices.length}</span> z {items.length} ofert.
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isConfirming || selectedIndices.length === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {isConfirming ? "Podpinanie..." : `Zastosuj wybrane (${selectedIndices.length})`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
