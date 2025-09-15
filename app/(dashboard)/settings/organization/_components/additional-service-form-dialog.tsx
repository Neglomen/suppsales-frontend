"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdditionalServiceMappingFormValues,
  additionalServiceMappingFormSchema,
} from "@/lib/zod";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { AdditionalServiceMapping } from "@/types/additional-service-mapping";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface AdditionalServiceFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSuccess: () => void;
  mapping: AdditionalServiceMapping | null;
}

export function AdditionalServiceMappingFormDialog({
  isOpen,
  setIsOpen,
  onSuccess,
  mapping,
}: AdditionalServiceFormDialogProps) {
  const form = useForm<AdditionalServiceMappingFormValues>({
    resolver: zodResolver(additionalServiceMappingFormSchema),
  });

  const isEditing = !!mapping;

  useEffect(() => {
    if (mapping) {
      form.reset(mapping);
    } else {
      form.reset({
        marketplace_service_id: "",
        marketplace_service_name: "",
        source_integration_provider: "",
        courier_provider: "",
        courier_service_code: "",
      });
    }
  }, [mapping, form]);

  const onSubmit = async (values: AdditionalServiceMappingFormValues) => {
    const apiCall = isEditing
      ? api.put(`/additional-service-mappings/${mapping!.id}`, values)
      : api.post("/additional-service-mappings", values);

    await toast.promise(apiCall, {
      loading: isEditing
        ? "Aktualizowanie mapowania..."
        : "Dodawanie mapowania...",
      success: () => {
        onSuccess();
        setIsOpen(false);
        return `Mapowanie pomyślnie ${
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
            {isEditing ? "Edytuj mapowanie" : "Dodaj nowe mapowanie usługi"}
          </DialogTitle>
          <DialogDescription>
            Zdefiniuj regułę tłumaczenia usług z marketplace na usługi
            kurierskie.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <h4 className="text-sm font-semibold text-muted-foreground">
              Dane z Marketplace
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="source_integration_provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dostawca</FormLabel>
                    <FormControl>
                      <Input placeholder="np. ALLEGRO" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="marketplace_service_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Usługi</FormLabel>
                    <FormControl>
                      <Input placeholder="np. CARRY_IN" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="marketplace_service_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa Usługi</FormLabel>
                  <FormControl>
                    <Input placeholder="np. Wniesienie" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <h4 className="text-sm font-semibold text-muted-foreground pt-4">
              Mapowanie na Kuriera
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="courier_provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dostawca</FormLabel>
                    <FormControl>
                      <Input placeholder="np. SUUS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="courier_service_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kod Usługi</FormLabel>
                    <FormControl>
                      <Input placeholder="np. StdWniesienie2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
