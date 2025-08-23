"use client";

import { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Send,
  Pencil,
  Mailbox,
  UserCircle,
  Mail,
  Check,
  ChevronsUpDown,
  PlusCircle,
  AlertTriangle,
  GitBranch,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "./rich-text-editor";
import { AddressBookFormDialog } from "@/app/(dashboard)/settings/organization/_components/address-book-form-dialog";

import type {
  Template,
  Variant,
} from "@/app/(dashboard)/response-templates/_components/template-form-dialog";
import type {
  OrderDetailsApiResponse,
  MappedOrderDetails,
} from "@/types/order";
import { useSmtpStore } from "@/store/smtp";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Definicje typów
interface AddressBookContact {
  id: string;
  name: string;
  email: string;
  notes: string | null;
}

interface SendEmailDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  template?: Template; // Opcjonalny, pełny obiekt szablonu/wariantu
  order?: OrderDetailsApiResponse;
  mappedDetails?: MappedOrderDetails;
}

// Funkcje pomocnicze
const renderPreview = (
  content: string,
  order?: OrderDetailsApiResponse,
  mapped?: MappedOrderDetails
): string => {
  let rendered = content;
  if (order && mapped) {
    const customerName = `${mapped.delivery.address.firstName || ""} ${
      mapped.delivery.address.lastName || ""
    }`.trim();
    const customerEmail =
      order.integration?.type === "BASELINKER"
        ? order.details_payload?.email
        : order.details_payload?.buyer?.email;
    const trackingNumber =
      order.integration?.type === "BASELINKER"
        ? order.details_payload?.delivery_package_nr || "Brak"
        : order.details_payload?.delivery?.tracking?.number || "Brak";

    rendered = rendered.replace(
      /{{customer_name}}/g,
      customerName || "Szanowny Kliencie"
    );
    rendered = rendered.replace(/{{customer_email}}/g, customerEmail || "");
    rendered = rendered.replace(
      /{{order_id_external}}/g,
      order.external_order_id || ""
    );
    rendered = rendered.replace(/{{tracking_number}}/g, trackingNumber);
  }
  return rendered;
};

const hasPlaceholders = (text: string): boolean => {
  return /{{\s*.*\s*}}/.test(text);
};

export function SendEmailDialog({
  isOpen,
  setIsOpen,
  template,
  order,
  mappedDetails,
}: SendEmailDialogProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const { accounts: smtpAccounts, fetchAccounts: fetchSmtpAccounts } =
    useSmtpStore();
  const [contacts, setContacts] = useState<AddressBookContact[]>([]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [selectedSmtpAccountId, setSelectedSmtpAccountId] =
    useState<string>("default");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isContactListOpen, setContactListOpen] = useState(false);
  const [isContactFormOpen, setContactFormOpen] = useState(false);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [showPlaceholderWarning, setShowPlaceholderWarning] = useState(false);

  const fetchContacts = async () => {
    try {
      const response = await api.get<AddressBookContact[]>("/address-book");
      setContacts(response.data);
    } catch {
      console.error("Failed to fetch address book contacts.");
    }
  };

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const promises: Promise<any>[] = [
            fetchSmtpAccounts(),
            fetchContacts(),
          ];
          if (!template) {
            // Pobieraj szablony tylko, gdy nie są preselekcjonowane
            promises.push(api.get<Template[]>("/response-templates"));
          }
          const results = await Promise.all(promises);
          if (!template) {
            setTemplates(results[2].data);
          }
        } catch {
          toast.error("Nie udało się pobrać danych potrzebnych do wysyłki.");
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();

      const initialId = template ? template.id : "custom";
      setSelectedTemplateId(initialId);
      setSelectedVariantId(initialId);

      const customerEmail =
        order?.integration?.type === "BASELINKER"
          ? order?.details_payload?.email
          : order?.details_payload?.buyer?.email;
      setRecipientEmail(customerEmail || "");
      setSelectedSmtpAccountId("default");
    }
  }, [isOpen, order, template, fetchSmtpAccounts]);

  const handleContactAdded = () => {
    fetchContacts();
    setContactFormOpen(false);
  };

  const selectedTemplate = useMemo(() => {
    return template || templates.find((t) => t.id === selectedTemplateId);
  }, [templates, selectedTemplateId, template]);

  const activeTemplateVersion = useMemo(() => {
    if (!selectedTemplate) return null;
    const variants =
      "variants" in selectedTemplate ? selectedTemplate.variants : undefined;
    if (
      selectedVariantId &&
      selectedVariantId !== selectedTemplate.id &&
      variants
    ) {
      return variants.find((v) => v.id === selectedVariantId);
    }
    return selectedTemplate;
  }, [selectedTemplate, selectedVariantId]);

  useEffect(() => {
    if (selectedTemplate) {
      setSelectedVariantId(selectedTemplate.id);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (activeTemplateVersion) {
      const templateText =
        activeTemplateVersion.title + activeTemplateVersion.content;
      setShowPlaceholderWarning(hasPlaceholders(templateText) && !order);
      const renderedSubject = renderPreview(
        activeTemplateVersion.title,
        order,
        mappedDetails
      );
      const renderedBody = renderPreview(
        activeTemplateVersion.content,
        order,
        mappedDetails
      );
      setEditedSubject(renderedSubject);
      setEditedContent(renderedBody);
    } else if (!template && selectedTemplateId === "custom") {
      setShowPlaceholderWarning(false);
      setEditedSubject("");
      setEditedContent("");
    }
  }, [
    activeTemplateVersion,
    order,
    mappedDetails,
    selectedTemplateId,
    template,
  ]);

  const handleSend = async () => {
    if (!editedSubject || !editedContent) {
      toast.error("Temat i treść wiadomości nie mogą być puste.");
      return;
    }
    if (!recipientEmail || !recipientEmail.includes("@")) {
      toast.error("Proszę wpisać poprawny adres e-mail odbiorcy.");
      return;
    }

    setIsSending(true);
    const isCustomMessage =
      !selectedTemplateId || selectedTemplateId === "custom";
    const templateIdToSend = isCustomMessage
      ? "custom"
      : selectedVariantId || selectedTemplateId;

    if (isCustomMessage) {
      const payload = {
        recipient_email: recipientEmail,
        subject: editedSubject,
        content: editedContent,
        order_id: order?.id,
        smtp_account_id:
          selectedSmtpAccountId === "default"
            ? undefined
            : selectedSmtpAccountId,
      };
      await toast.promise(api.post(`/emails/send`, payload), {
        loading: "Wysyłanie e-maila...",
        success: () => {
          setIsOpen(false);
          return "E-mail został pomyślnie zlecony do wysyłki!";
        },
        error: (err) =>
          err.response?.data?.detail || "Nie udało się wysłać e-maila.",
      });
    } else {
      const payload = {
        recipient_email: recipientEmail,
        order_id: order?.id,
        smtp_account_id:
          selectedSmtpAccountId === "default"
            ? undefined
            : selectedSmtpAccountId,
      };
      await toast.promise(
        api.post(`/response-templates/${templateIdToSend}/send`, payload),
        {
          loading: "Wysyłanie e-maila z szablonu...",
          success: () => {
            setIsOpen(false);
            return "E-mail z szablonu został zlecony do wysyłki!";
          },
          error: (err) =>
            err.response?.data?.detail || "Nie udało się wysłać e-maila.",
        }
      );
    }

    setIsSending(false);
  };

  const canSend =
    editedSubject && editedContent && recipientEmail && !isSending;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent size="2xl" className="h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Wyślij e-mail do klienta</DialogTitle>
            <DialogDescription>
              {template
                ? `Używasz szablonu "${template.title}". Możesz edytować treść.`
                : "Wybierz szablon lub napisz wiadomość od zera."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-grow overflow-y-auto pr-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {!template && (
                <div className="space-y-1 lg:col-span-2 grid grid-cols-2 gap-4 items-end">
                  <div className="space-y-1">
                    <label className="text-sm font-medium flex items-center">
                      <Mailbox className="mr-2 h-4 w-4 text-muted-foreground" />
                      Szablon Nadrzędny
                    </label>
                    <Select
                      onValueChange={setSelectedTemplateId}
                      value={selectedTemplateId}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz szablon..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">
                          Wiadomość niestandardowa
                        </SelectItem>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium flex items-center">
                      <GitBranch className="mr-2 h-4 w-4 text-muted-foreground" />
                      Wariant
                    </label>
                    <Select
                      onValueChange={setSelectedVariantId}
                      value={selectedVariantId}
                      disabled={
                        !selectedTemplate ||
                        !selectedTemplate.variants ||
                        selectedTemplate.variants.length === 0
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz wariant..." />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedTemplate && (
                          <SelectItem value={selectedTemplate.id}>
                            {selectedTemplate.title} (Główny)
                          </SelectItem>
                        )}
                        {selectedTemplate?.variants?.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <div className={`space-y-1 ${!template ? "" : "lg:col-span-2"}`}>
                <label className="text-sm font-medium flex items-center">
                  <UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                  Odbiorca
                </label>
                <Popover
                  open={isContactListOpen}
                  onOpenChange={setContactListOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isContactListOpen}
                      className="w-full justify-between h-10 font-normal"
                    >
                      <span className="truncate">
                        {recipientEmail || "Wybierz lub wpisz e-mail..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Szukaj lub wpisz e-mail..."
                        value={recipientEmail}
                        onValueChange={setRecipientEmail}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <Button
                            variant="ghost"
                            className="w-full justify-start text-sm h-9"
                            onClick={() => setContactFormOpen(true)}
                          >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Dodaj "{recipientEmail}" do książki...
                          </Button>
                        </CommandEmpty>
                        <CommandGroup>
                          {contacts.map((contact) => (
                            <CommandItem
                              key={contact.id}
                              value={contact.email}
                              onSelect={(currentValue) => {
                                setRecipientEmail(currentValue);
                                setContactListOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  recipientEmail === contact.email
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{contact.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {contact.email}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center">
                  <Send className="mr-2 h-4 w-4 text-muted-foreground" />
                  Wyślij z konta
                </label>
                <Select
                  onValueChange={setSelectedSmtpAccountId}
                  value={selectedSmtpAccountId}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">
                      Domyślne konto firmowe
                    </SelectItem>
                    {smtpAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({acc.user})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="my-4" />
            {showPlaceholderWarning && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Ostrzeżenie</AlertTitle>
                <AlertDescription>
                  Wybrany szablon zawiera zmienne dynamiczne. Ponieważ wysyłasz
                  ten e-mail bez powiązania z konkretnym zamówieniem, zmienne te
                  pozostaną puste.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Temat</label>
              <Input
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                placeholder="Wpisz temat wiadomości..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Treść</label>
              <RichTextEditor
                value={editedContent}
                onChange={setEditedContent}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSend} disabled={!canSend}>
              {isSending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Wyślij e-mail
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AddressBookFormDialog
        isOpen={isContactFormOpen}
        setIsOpen={setContactFormOpen}
        onSuccess={handleContactAdded}
        contact={null}
      />
    </>
  );
}
