// src/app/(dashboard)/settings/organization/_components/address-book-form-dialog.tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { AddressBookContact } from "./address-book-tab";

// Schemat walidacji Zod
const ContactSchema = z.object({
  name: z.string().min(2, "Nazwa jest wymagana."),
  email: z.string().email("Proszę podać poprawny adres e-mail."),
  notes: z.string().optional(),
});
type ContactSchemaType = z.infer<typeof ContactSchema>;

interface AddressBookFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSuccess: () => void;
  contact: AddressBookContact | null; // Jeśli przekazany, jesteśmy w trybie edycji
}

export function AddressBookFormDialog({
  isOpen,
  setIsOpen,
  onSuccess,
  contact,
}: AddressBookFormDialogProps) {
  const isEditMode = !!contact;

  const form = useForm<ContactSchemaType>({
    resolver: zodResolver(ContactSchema),
    defaultValues: { name: "", email: "", notes: "" },
  });

  useEffect(() => {
    if (isOpen) {
      if (contact) {
        // === POPRAWKA: Mapujemy `null` na `undefined` ===
        form.reset({
          name: contact.name,
          email: contact.email,
          notes: contact.notes ?? undefined, // Operator `??` robi dokładnie to, czego potrzebujemy
        });
        // === KONIEC POPRAWKI ===
      } else {
        form.reset({ name: "", email: "", notes: "" });
      }
    }
  }, [isOpen, contact, form]);

  const onSubmit = async (values: ContactSchemaType) => {
    const apiCall = isEditMode
      ? api.put(`/address-book/${contact.id}`, values)
      : api.post("/address-book", values);

    await toast.promise(apiCall, {
      loading: isEditMode
        ? "Aktualizowanie kontaktu..."
        : "Dodawanie kontaktu...",
      success: () => {
        onSuccess();
        return `Kontakt ${isEditMode ? "zaktualizowany" : "dodany"} pomyślnie.`;
      },
      error: (err) =>
        err.response?.data?.detail ||
        `Nie udało się ${isEditMode ? "zaktualizować" : "dodać"} kontaktu.`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edytuj Kontakt" : "Dodaj Nowy Kontakt"}
          </DialogTitle>
          <DialogDescription>
            Wprowadź dane kontaktu, aby łatwo go wybierać podczas wysyłania
            e-maili.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 pt-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa / Imię i Nazwisko</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="np. Jan Kowalski (Księgowość)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adres e-mail</FormLabel>
                  <FormControl>
                    <Input placeholder="kontakt@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notatki (opcjonalnie)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Dodatkowe informacje o kontakcie..."
                      {...field}
                    />
                  </FormControl>
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
