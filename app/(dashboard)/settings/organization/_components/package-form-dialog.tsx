"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PackageFormValues, packageFormSchema } from "@/lib/zod";
import api from "@/lib/api";
import toast from "react-hot-toast";

import { PackageDefinition } from "@/types/package-definition";
import { SUUS_PACKAGE_CODES, RABEN_PACKAGE_CODES } from "@/lib/courier-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

interface PackageFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSuccess: () => void;
  packageDef: PackageDefinition | null;
}

export function PackageFormDialog({
  isOpen,
  setIsOpen,
  onSuccess,
  packageDef,
}: PackageFormDialogProps) {
  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      name: "",
      length_cm: "",
      width_cm: "",
      height_cm: "",
      weight_kg: "",
      courier_code: "NONE", // Domyślna wartość "uniwersalne"
    },
  });

  const isEditing = !!packageDef;

  useEffect(() => {
    if (isOpen) {
      if (packageDef) {
        form.reset({
          name: packageDef.name,
          length_cm: String(packageDef.length_cm),
          width_cm: String(packageDef.width_cm),
          height_cm: String(packageDef.height_cm),
          weight_kg: String(packageDef.weight_kg),
          courier_code: packageDef.courier_code || "NONE",
        });
      } else {
        form.reset({
          name: "",
          length_cm: "",
          width_cm: "",
          height_cm: "",
          weight_kg: "",
          courier_code: "NONE",
        });
      }
    }
  }, [packageDef, form, isOpen]);

  const onSubmit = async (values: PackageFormValues) => {
    // Przygotowujemy payload, konwertując liczby i obsługując `courier_code`
    const payload = {
      ...values,
      length_cm: parseFloat(values.length_cm.replace(",", ".")),
      width_cm: parseFloat(values.width_cm.replace(",", ".")),
      height_cm: parseFloat(values.height_cm.replace(",", ".")),
      weight_kg: parseFloat(values.weight_kg.replace(",", ".")),
      courier_code: values.courier_code === "NONE" ? null : values.courier_code,
    };

    const apiCall = isEditing
      ? api.put(`/package-definitions/${packageDef!.id}`, payload)
      : api.post("/package-definitions", payload);

    await toast.promise(apiCall, {
      loading: isEditing
        ? "Aktualizowanie opakowania..."
        : "Dodawanie opakowania...",
      success: () => {
        onSuccess();
        setIsOpen(false);
        return `Opakowanie pomyślnie ${
          isEditing ? "zaktualizowane" : "dodane"
        }.`;
      },
      error: (err) => err.response?.data?.detail || "Wystąpił błąd.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edytuj opakowanie" : "Dodaj nowe opakowanie"}
          </DialogTitle>
          <DialogDescription>
            Wprowadź dane opakowania. Będziesz mógł go później przypisać do
            metod dostawy.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa opakowania</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Np. Karton mały, Foliopak S"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="length_cm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Długość (cm)</FormLabel>
                    <FormControl>
                      <Input type="text" inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="width_cm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Szerokość (cm)</FormLabel>
                    <FormControl>
                      <Input type="text" inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="height_cm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wysokość (cm)</FormLabel>
                    <FormControl>
                      <Input type="text" inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="weight_kg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Waga (kg)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="Np. 0.25"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="courier_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kod kuriera (opcjonalnie)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || "NONE"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz specyficzny kod..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="NONE">
                        Opakowanie uniwersalne (bez kodu)
                      </SelectItem>
                      <Separator />
                      <Label className="px-2 py-1.5 text-sm font-semibold">
                        Kody SUUS
                      </Label>
                      {Object.entries(SUUS_PACKAGE_CODES).map(
                        ([code, name]) => (
                          <SelectItem key={code} value={code}>
                            {code} - {name}
                          </SelectItem>
                        )
                      )}
                      <Separator />
                      <Label className="px-2 py-1.5 text-sm font-semibold">
                        Kody Raben
                      </Label>
                      {Object.entries(RABEN_PACKAGE_CODES).map(
                        ([code, name]) => (
                          <SelectItem key={code} value={code}>
                            {code} - {name}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Wybierz, jeśli to opakowanie jest specyficzne dla systemu
                    SUUS lub Raben.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Zapisz
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
