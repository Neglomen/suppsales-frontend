"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2, ShieldAlert, Loader2 } from "lucide-react";

interface ConfirmDeleteModalProps {
  title: string;
  description: string;
  itemName?: string;
  itemSku?: string;
  requireTypedConfirmation?: boolean;
  confirmationText?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function ConfirmDeleteModal({
  title,
  description,
  itemName,
  itemSku,
  requireTypedConfirmation = true,
  confirmationText = "USUŃ",
  open,
  onOpenChange,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const [typedValue, setTypedValue] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!open) {
      setTypedValue("");
      setIsDeleting(false);
    }
  }, [open]);

  const isConfirmed = requireTypedConfirmation
    ? typedValue.trim().toUpperCase() === confirmationText.toUpperCase()
    : true;

  const handleConfirm = async () => {
    if (!isConfirmed) return;
    try {
      setIsDeleting(true);
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Deletion failed", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-red-500/10 text-red-500 shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-red-600 dark:text-red-500">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Ta akcja wiąże się z nieodwracalną utratą danych.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Warning Banner */}
          <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-sm">
              <ShieldAlert className="h-4 w-4" /> Uwaga! Operacja jest nieodwracalna!
            </div>
            <p className="leading-relaxed text-muted-foreground">{description}</p>
          </div>

          {/* Item details */}
          {(itemName || itemSku) && (
            <div className="p-3 rounded-lg bg-muted/50 border text-xs space-y-1">
              {itemSku && (
                <div>
                  <span className="text-muted-foreground">SKU Produktu:</span>{" "}
                  <code className="font-mono font-bold text-foreground bg-muted px-1.5 py-0.5 rounded">
                    {itemSku}
                  </code>
                </div>
              )}
              {itemName && (
                <div>
                  <span className="text-muted-foreground">Nazwa:</span>{" "}
                  <span className="font-medium text-foreground">{itemName}</span>
                </div>
              )}
            </div>
          )}

          {/* Safety Typed Confirmation Input */}
          {requireTypedConfirmation && (
            <div className="space-y-2 pt-1">
              <Label className="text-xs font-semibold">
                Aby potwierdzić usunięcie, wpisz słowo{" "}
                <span className="font-mono font-bold text-red-500 select-all">
                  {confirmationText}
                </span>
                :
              </Label>
              <Input
                value={typedValue}
                onChange={(e) => setTypedValue(e.target.value)}
                placeholder={`Wpisz "${confirmationText}" tutaj...`}
                className="font-mono text-sm border-red-500/30 focus-visible:ring-red-500"
              />
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t mt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Anuluj
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmed || isDeleting}
            className="bg-red-600 hover:bg-red-700 font-medium"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Usuwanie...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" /> Potwierdzam Usunięcie
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
