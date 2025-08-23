// src/app/(dashboard)/response-templates/_components/template-form-dialog.tsx
"use client";

import { useEffect, useState, useRef, KeyboardEvent } from "react";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Editor } from "@tiptap/react";

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
import { Loader2, X, Users, Lock } from "lucide-react";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { SelectTrigger } from "@radix-ui/react-select";

// --- Typy i Schematy ---
const TemplateSchema = z.object({
  title: z.string().min(3, "Tytuł musi mieć co najmniej 3 znaki."),
  content: z.string().min(10, "Treść musi mieć co najmniej 10 znaków."),
  scope: z.enum(["organization", "private"]),
  parent_template_id: z.string().optional(),
});
type TemplateSchemaType = z.infer<typeof TemplateSchema>;

type ApiTemplatePayload = {
  title: string;
  content: string;
  scope: "organization" | "private";
  tags: string[];
};

export interface Variant {
  id: string;
  title: string;
  content: string;
  scope: "organization" | "private";
  tags: { id: string; name: string }[];
  parent_template: { id: string; title: string } | null;
}

export interface Template {
  id: string;
  title: string;
  content: string;
  scope: "organization" | "private";
  tags: { id: string; name: string }[];
  variants?: Omit<Template, "variants">[];
}

// --- Dostępne Zmienne ---
const PLACEHOLDERS = [
  { label: "Imię i nazwisko klienta", value: "{{ customer_name }}" },
  { label: "Email klienta", value: "{{ customer_email }}" },
  { label: "Numer zamówienia", value: "{{ order_id_external }}" },
  { label: "Numer przesyłki", value: "{{ tracking_number }}" },
];

interface TemplateFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSuccess: () => void;
  template: Template | null;
  parentTemplates: Template[]; // Nowy prop
}

export function TemplateFormDialog({
  isOpen,
  setIsOpen,
  onSuccess,
  template,
  parentTemplates,
}: TemplateFormDialogProps) {
  const [tags, setTags] = useState<string[]>([]);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);

  const form = useForm<TemplateSchemaType>({
    resolver: zodResolver(TemplateSchema),
    defaultValues: {
      title: "",
      content: "",
      scope: "organization",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (template) {
        form.reset({
          title: template.title,
          content: template.content,
          scope: template.scope,
        });
        setTags(template.tags.map((t) => t.name));
      } else {
        form.reset({
          title: "",
          content: "",
          scope: "organization",
        });
        setTags([]);
      }
    }
  }, [template, isOpen, form]);

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (tagInputRef.current) {
        const newTag = tagInputRef.current.value.trim();
        if (newTag && !tags.includes(newTag)) {
          setTags([...tags, newTag]);
          tagInputRef.current.value = "";
        }
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const insertPlaceholder = (placeholder: string) => {
    if (editorRef.current) {
      editorRef.current.chain().focus().insertContent(placeholder).run();
    }
  };

  const onSubmit = async (values: TemplateSchemaType) => {
    const payload: ApiTemplatePayload = {
      ...values,
      tags: tags,
    };

    const apiCall = template
      ? api.put(`/response-templates/${template.id}`, payload)
      : api.post("/response-templates", payload);

    await toast.promise(apiCall, {
      loading: template
        ? "Aktualizowanie szablonu..."
        : "Tworzenie szablonu...",
      success: () => {
        onSuccess();
        return `Szablon ${
          template ? "zaktualizowany" : "utworzony"
        } pomyślnie.`;
      },
      error: (err) =>
        err.response?.data?.detail ||
        `Nie udało się ${template ? "zaktualizować" : "utworzyć"} szablonu.`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent size="2xl" className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {template ? "Edytuj Szablon" : "Stwórz Nowy Szablon"}
          </DialogTitle>
          <DialogDescription>
            Wypełnij pola, aby skonfigurować nową odpowiedź. Użyj zmiennych, aby
            ją spersonalizować.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 overflow-y-auto pr-6 flex-grow"
          >
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-4">
                <FormField
                  control={form.control}
                  name="parent_template_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wariant szablonu (opcjonalnie)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Brak (jako główny szablon)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">
                            Brak (jako główny szablon)
                          </SelectItem>
                          {parentTemplates
                            .filter((p) => p.id !== template?.id) // Nie można być swoim własnym rodzicem
                            .map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.title}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Wybierz szablon nadrzędny, jeśli ten jest jego
                        wariantem.
                      </FormDescription>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tytuł / Temat e-maila</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Controller
                  control={form.control}
                  name="content"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Treść</FormLabel>
                      <FormControl>
                        <RichTextEditor
                          value={field.value}
                          onChange={field.onChange}
                          onEditorRef={(editor) => (editorRef.current = editor)}
                        />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
              </div>
              <div className="col-span-1 space-y-6">
                <FormField
                  control={form.control}
                  name="scope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Widoczność</FormLabel>
                      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1 mt-2">
                        <Button
                          type="button"
                          variant={
                            field.value === "organization" ? "default" : "ghost"
                          }
                          onClick={() => field.onChange("organization")}
                          className="h-9"
                        >
                          <Users className="mr-2 h-4 w-4" /> Organizacja
                        </Button>
                        <Button
                          type="button"
                          variant={
                            field.value === "private" ? "default" : "ghost"
                          }
                          onClick={() => field.onChange("private")}
                          className="h-9"
                        >
                          <Lock className="mr-2 h-4 w-4" /> Prywatny
                        </Button>
                      </div>
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel>Tagi</FormLabel>
                  <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px] items-center">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="flex items-center gap-1 text-sm py-1"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="rounded-full hover:bg-destructive/20 p-0.5 ml-1"
                        >
                          <X size={12} />
                        </button>
                      </Badge>
                    ))}
                    <Input
                      ref={tagInputRef}
                      onKeyDown={handleTagKeyDown}
                      className="flex-1 border-none shadow-none focus-visible:ring-0 h-auto p-0 m-1 bg-transparent"
                      placeholder={tags.length === 0 ? "Dodaj tagi..." : ""}
                    />
                  </div>
                  <FormDescription>
                    Wpisz tag i naciśnij Enter lub przecinek.
                  </FormDescription>
                </FormItem>

                <div>
                  <h3 className="text-sm font-semibold mb-2">
                    Dostępne Zmienne
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    Kliknij, aby wstawić zmienną w miejscu kursora.
                  </p>
                  <div className="space-y-1">
                    {PLACEHOLDERS.map((p) => (
                      <div
                        key={p.value}
                        className="text-xs p-1.5 rounded bg-muted cursor-pointer hover:bg-muted-foreground/20"
                        title="Kliknij, aby wstawić"
                        onClick={() => insertPlaceholder(p.value)}
                      >
                        {p.label} <code className="font-mono">{p.value}</code>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </Form>
        <DialogFooter>
          <Button onClick={() => setIsOpen(false)} variant="ghost">
            Anuluj
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Zapisz Szablon
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
