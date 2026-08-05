// app/(dashboard)/communication/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { 
  MessageSquare, Search, Send, Sparkles, Clock, User, 
  ExternalLink, AlertTriangle, CheckCircle, RefreshCw, 
  FileText, ChevronRight, Info, AlertCircle, ShoppingBag, 
  Truck, ArrowRight, UserCheck, ShieldAlert, Lock, Paperclip, X, Maximize2, Minimize2,
  Eye, Download, Image as ImageIcon, ChevronLeft, ZoomIn, ZoomOut, RotateCcw,
  MapPin, Receipt, Building2, CreditCard, ClipboardList, Loader2, Plus
} from "lucide-react";
import api, { getErrorMessage } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { usePlanFeatures } from "@/hooks/use-plan-features";
import { UpgradePrompt } from "@/components/shared/upgrade-prompt";

interface UnifiedMessage {
  id: string;
  thread_id: string;
  author_login: string;
  author_role: "BUYER" | "SELLER" | "ADMIN" | "SYSTEM";
  text: string;
  created_at: string;
  attachments?: { id?: string; url?: string; fileName?: string; name?: string }[];
}

interface UnifiedThread {
  id: string;
  integration_id: number;
  provider_type: string; // ALLEGRO, EMPIK
  type: "MESSAGE_CENTER" | "DISPUTE";
  interlocutor_login: string;
  last_message_at: string;
  read: boolean;
  order_id: string | null;
  subject: string | null;
  status: string | null;
  sla_deadline: string | null;
  messages: UnifiedMessage[];
}

interface OrderContext {
  order: {
    id: string;
    external_order_id: string;
    status: string;
    external_status: string;
    purchased_at: string;
    tracking_numbers: string[];
    erp_sales_document_number?: string;
  };
  buyer: {
    login: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
  };
  delivery: {
    method_name: string;
    address?: {
      first_name?: string;
      last_name?: string;
      company_name?: string;
      street?: string;
      city?: string;
      zip_code?: string;
      country_code?: string;
    };
  };
  invoice_address?: {
    company_name?: string;
    tax_id?: string;
    first_name?: string;
    last_name?: string;
    street?: string;
    city?: string;
    zip_code?: string;
    country_code?: string;
  };
  payment: {
    type: string;
    provider: string;
    total: string;
  };
  line_items: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
  related_orders?: Array<{
    id: string;
    external_order_id: string;
    status: string;
    purchased_at: string;
    items_summary?: string;
    total?: string;
  }>;
}

interface ResponseTemplate {
  id: string;
  title: string;
  content: string;
}

export default function CommunicationCenterPage() {
  const [threads, setThreads] = useState<UnifiedThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<UnifiedThread | null>(null);
  const [activeOrder, setActiveOrder] = useState<OrderContext | null>(null);
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);

  const [threadTasks, setThreadTasks] = useState<any[]>([]);
  const [isThreadTasksLoading, setIsThreadTasksLoading] = useState(false);

  const fetchThreadTasks = useCallback(async () => {
    if (!activeThreadId) return;
    setIsThreadTasksLoading(true);
    try {
      const res = await api.get(`/internal-tasks/?thread_id=${activeThreadId}`);
      setThreadTasks(res.data.items || []);
    } catch (err) {
      console.error("Błąd pobierania zadań wątku:", err);
    } finally {
      setIsThreadTasksLoading(false);
    }
  }, [activeThreadId]);
  
  // Plan features
  const { hasFeature, planInfo } = usePlanFeatures();
  const canUseAI = hasFeature("ai_assistant");

  // UI states
  const [mainTab, setMainTab] = useState<"MESSAGES" | "DISPUTES">("MESSAGES");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "UNREAD" | "SLA">("UNREAD");
  const [replyText, setReplyText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isExpandedReply, setIsExpandedReply] = useState(false);
  const [previewModal, setPreviewModal] = useState<{
    attachments: { id?: string; url?: string; fileName?: string; name?: string }[];
    currentIndex: number;
    url: string;
    fileName: string;
    type: "image" | "pdf" | "other";
    zoom: number;
    loading: boolean;
  } | null>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Pobierz wątki
  const fetchThreads = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get<UnifiedThread[]>("/communication/threads");
      setThreads(response.data);
    } catch (err) {
      toast.error(getErrorMessage(err) || "Błąd wczytywania wątków");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Pobierz szablony
  const fetchTemplates = async () => {
    try {
      const response = await api.get<ResponseTemplate[]>("/response-templates");
      setTemplates(response.data);
    } catch (err) {
      console.error("Nie udało się pobrać szablonów", err);
    }
  };

  useEffect(() => {
    fetchThreads();
    fetchTemplates();
    
    // Auto-odświeżanie co 30 sekund
    const interval = setInterval(() => {
      fetchThreads(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Załaduj aktywny wątek i powiązane zamówienie
  useEffect(() => {
    if (!activeThreadId) {
      setActiveThread(null);
      setActiveOrder(null);
      return;
    }

    const loadThreadDetails = async () => {
      try {
        const response = await api.get<UnifiedThread>(`/communication/threads/${activeThreadId}`);
        setActiveThread(response.data);
        
        // Jeśli wątek ma order_id, pobierz szczegóły zamówienia do kontekstu
        if (response.data.order_id) {
          try {
            const orderRes = await api.get(`/orders/${response.data.order_id}`);
            // Mapowanie struktury orderu do uproszczonego kontekstu
            const rawOrder = orderRes.data;
            const details = rawOrder.details_payload || {};
            // Prosta heurystyka budowy struktury do szablonów
            const mappedOrder: OrderContext = {
              order: {
                id: rawOrder.id,
                external_order_id: rawOrder.external_order_id,
                status: rawOrder.status,
                external_status: rawOrder.external_status,
                purchased_at: new Date(rawOrder.purchased_at).toLocaleString("pl-PL"),
                tracking_numbers: rawOrder.tracking_numbers || [],
                erp_sales_document_number: rawOrder.erp_sales_document_number || details.invoice?.number || undefined,
              },
              buyer: {
                login: rawOrder.buyer_login || "",
                email: rawOrder.buyer_email || "",
                first_name: rawOrder.buyer_first_name || "",
                last_name: rawOrder.buyer_last_name || "",
                phone_number: rawOrder.buyer_phone_number || "",
              },
              delivery: {
                method_name: rawOrder.delivery_method || details.delivery?.method?.name || "Standard",
                address: rawOrder.delivery_address || details.delivery?.address || {},
              },
              invoice_address: rawOrder.invoice_address || details.invoice?.address || null,
              payment: {
                type: rawOrder.payment_type || details.payment?.type || "ONLINE",
                provider: details.payment?.provider || "System płatności",
                total: rawOrder.total_to_pay ? `${rawOrder.total_to_pay} PLN` : `${details.summary?.totalToPay?.amount || "0.00"} PLN`,
              },
              line_items: (rawOrder.line_items || details.lineItems || []).map((item: any) => ({
                name: item.name || item.offer?.name || "Produkt",
                quantity: item.quantity,
                price: item.price ? `${item.price} PLN` : "0 PLN",
              })),
              related_orders: (rawOrder.related_orders || []).map((ro: any) => {
                const lineItems = ro.line_items || ro.details_payload?.lineItems || [];
                let itemsSummary = "";
                if (lineItems.length > 0) {
                  const first = lineItems[0];
                  const name = first.name || first.offer?.name || "Produkt";
                  const qty = first.quantity || 1;
                  itemsSummary = lineItems.length === 1 ? `${name} (x${qty})` : `${name} (x${qty}) +${lineItems.length - 1} inne`;
                } else {
                  itemsSummary = `Zamówienie #${ro.external_order_id || ro.id.substring(0, 8)}`;
                }

                return {
                  id: ro.id,
                  external_order_id: ro.external_order_id,
                  status: ro.status,
                  purchased_at: ro.purchased_at
                    ? new Date(ro.purchased_at).toLocaleString("pl-PL", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })
                    : "",
                  items_summary: itemsSummary,
                  total: ro.total_to_pay ? `${ro.total_to_pay} PLN` : undefined,
                };
              }),
            };
            setActiveOrder(mappedOrder);
          } catch (orderErr) {
            console.error("Błąd pobierania zamówienia", orderErr);
            setActiveOrder(null);
          }
        } else {
          setActiveOrder(null);
        }
      } catch (err) {
        toast.error("Błąd ładowania szczegółów wątku");
      }
    };

    loadThreadDetails();
    fetchThreadTasks();
  }, [activeThreadId, fetchThreadTasks]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread?.messages]);

  // Filtrowanie wątków
  const filteredThreads = threads.filter((t) => {
    // 1. Filtrowanie po typie głównym (Centrum Wiadomości vs Dyskusje i Incydenty)
    if (mainTab === "MESSAGES" && t.type !== "MESSAGE_CENTER") return false;
    if (mainTab === "DISPUTES" && t.type !== "DISPUTE") return false;

    // 2. Filtrowanie wyszukiwaniem
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      t.interlocutor_login.toLowerCase().includes(query) || 
      (t.subject && t.subject.toLowerCase().includes(query)) ||
      (t.id && t.id.toLowerCase().includes(query));
      
    if (!matchesSearch) return false;

    // 3. Filtrowanie po zakładce statusu
    if (activeTab === "UNREAD") {
      const isRecent = new Date(t.last_message_at).getTime() > new Date().getTime() - 60 * 24 * 60 * 60 * 1000;
      return !t.read && isRecent;
    }
    if (activeTab === "SLA") return t.sla_deadline !== null && !t.read;
    
    return true;
  });

  // Obsługa wstawiania szablonu
  const insertTemplate = (template: ResponseTemplate) => {
    let rendered = template.content;
    if (activeOrder) {
      rendered = rendered.replace(/\{\{\s*buyer\.first_name\s*\}\}/g, activeOrder.buyer.first_name || "Kliencie");
      rendered = rendered.replace(/\{\{\s*buyer\.last_name\s*\}\}/g, activeOrder.buyer.last_name || "");
      rendered = rendered.replace(/\{\{\s*buyer\.login\s*\}\}/g, activeOrder.buyer.login || "");
      rendered = rendered.replace(/\{\{\s*order\.external_order_id\s*\}\}/g, activeOrder.order.external_order_id || "");
      rendered = rendered.replace(/\{\{\s*order\.status\s*\}\}/g, activeOrder.order.status || "");
      rendered = rendered.replace(/\{\{\s*order\.tracking_numbers\s*\}\}/g, activeOrder.order.tracking_numbers.join(", ") || "brak");
    }
    setReplyText(rendered);
    setShowTemplatesDropdown(false);
    toast.success("Wstawiono szablon!");
  };

  // Obsługa generowania AI Draft
  const handleGenerateAIDraft = async () => {
    if (!activeThread) return;
    setAiLoading(true);
    try {
      const response = await api.post(`/communication/threads/${activeThread.id}/ai-draft`);
      setReplyText(response.data.draft_text);
      toast.success("Asystent AI wygenerował szkic odpowiedzi! ✨");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Błąd generowania asystenta AI");
    } finally {
      setAiLoading(false);
    }
  };

  const getAttachmentId = (att: { id?: string; url?: string }) => {
    if (att.id) return att.id;
    if (att.url) {
      const parts = att.url.split("/");
      return parts[parts.length - 1];
    }
    return null;
  };

  const getAllThreadAttachments = () => {
    if (!activeThread?.messages) return [];
    const list: { id?: string; url?: string; fileName?: string; name?: string }[] = [];
    activeThread.messages.forEach((msg) => {
      if (msg.attachments && msg.attachments.length > 0) {
        list.push(...msg.attachments);
      }
    });
    return list;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (previewModal?.type !== "image" || previewModal.zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (previewModal?.type !== "image") return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setPreviewModal((prev) => {
      if (!prev) return null;
      const newZoom = Math.min(4.0, Math.max(0.5, prev.zoom + delta));
      if (newZoom === 1) setPan({ x: 0, y: 0 });
      return { ...prev, zoom: newZoom };
    });
  };

  const loadAttachmentAtIndex = async (
    attachmentsList: { id?: string; url?: string; fileName?: string; name?: string }[],
    index: number
  ) => {
    if (!activeThread || index < 0 || index >= attachmentsList.length) return;
    const att = attachmentsList[index];
    const attachmentId = getAttachmentId(att);
    const fileName = att.fileName || att.name || `Załącznik_${index + 1}`;

    if (!attachmentId) {
      toast.error("Brak identyfikatora załącznika");
      return;
    }

    setPan({ x: 0, y: 0 });

    setPreviewModal((prev) => {
      if (prev?.url) window.URL.revokeObjectURL(prev.url);
      return prev ? { ...prev, loading: true, currentIndex: index, zoom: 1 } : {
        attachments: attachmentsList,
        currentIndex: index,
        url: "",
        fileName,
        type: "other",
        zoom: 1,
        loading: true
      };
    });

    try {
      const response = await api.get(`/communication/attachments/${attachmentId}`, {
        params: {
          thread_id: activeThread.id,
          is_dispute: activeThread.type === "DISPUTE"
        },
        responseType: "blob"
      });

      const lowerName = fileName.toLowerCase();
      let fileType: "image" | "pdf" | "other" = "other";

      if (
        lowerName.endsWith(".png") ||
        lowerName.endsWith(".jpg") ||
        lowerName.endsWith(".jpeg") ||
        lowerName.endsWith(".webp") ||
        lowerName.endsWith(".gif")
      ) {
        fileType = "image";
      } else if (lowerName.endsWith(".pdf")) {
        fileType = "pdf";
      }

      const mimeType = fileType === "pdf" ? "application/pdf" : (fileType === "image" ? (lowerName.endsWith(".png") ? "image/png" : "image/jpeg") : "application/octet-stream");

      const rawBlob: Blob = response.data;
      const cleanBlob = new Blob([rawBlob], { type: mimeType });
      const objectUrl = window.URL.createObjectURL(cleanBlob);

      setPreviewModal({
        attachments: attachmentsList,
        currentIndex: index,
        url: objectUrl,
        fileName,
        type: fileType,
        zoom: 1,
        loading: false
      });
    } catch (err) {
      toast.error(getErrorMessage(err) || "Błąd pobierania załącznika");
      setPreviewModal((prev) => prev ? { ...prev, loading: false } : null);
    }
  };

  const translateOrderStatus = (status: string) => {
    if (!status) return "Nieznany";
    const s = status.toUpperCase();
    switch (s) {
      case "NEW":
      case "NOWE":
        return "Nowe";
      case "PROCESSING":
      case "IN_PROGRESS":
      case "W_REALIZACJI":
        return "W realizacji";
      case "SENT":
      case "READY_FOR_SHIPMENT":
      case "FULFILLED":
      case "SHIPPED":
      case "WYSŁANE":
        return "Wysłane";
      case "PICKUP":
      case "READY_FOR_PICKUP":
        return "Do odbioru";
      case "DELIVERED":
      case "ZAKOŃCZONE":
      case "COMPLETED":
        return "Dostarczone";
      case "CANCELLED":
      case "CANCELED":
      case "ANULOWANE":
        return "Anulowane";
      case "RETURNED":
      case "ZWRÓCONE":
        return "Zwrócone";
      default:
        return status;
    }
  };

  useEffect(() => {
    if (!previewModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previewModal.url) window.URL.revokeObjectURL(previewModal.url);
        setPreviewModal(null);
      } else if (e.key === "ArrowLeft" && previewModal.currentIndex > 0) {
        loadAttachmentAtIndex(previewModal.attachments, previewModal.currentIndex - 1);
      } else if (e.key === "ArrowRight" && previewModal.currentIndex < previewModal.attachments.length - 1) {
        loadAttachmentAtIndex(previewModal.attachments, previewModal.currentIndex + 1);
      } else if (e.key === "+" || e.key === "=") {
        setPreviewModal((prev) => prev ? { ...prev, zoom: Math.min(4.0, prev.zoom + 0.25) } : null);
      } else if (e.key === "-") {
        setPreviewModal((prev) => prev ? { ...prev, zoom: Math.max(0.5, prev.zoom - 0.25) } : null);
      } else if (e.key === "0") {
        setPan({ x: 0, y: 0 });
        setPreviewModal((prev) => prev ? { ...prev, zoom: 1 } : null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewModal, activeThread]);

  const handleInvoiceError = (err: any) => {
    if (err?.response?.status === 404) {
      toast.error("Brak przypisanej faktury sprzedaży w ERP (Subiekt GT) dla tego zamówienia.", { duration: 4000 });
    } else {
      toast.error(getErrorMessage(err) || "Błąd pobierania faktury z ERP");
    }
  };

  const handlePreviewInvoice = async (orderId: string, docNumber?: string) => {
    try {
      const response = await api.get(`/orders/${orderId}/sales-invoice/pdf`, {
        responseType: "blob"
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const objectUrl = window.URL.createObjectURL(blob);
      const fileName = docNumber ? `Faktura_${docNumber.replace(/\//g, "_")}.pdf` : `Faktura_${orderId}.pdf`;
      setPreviewModal({
        attachments: [{ id: orderId, fileName }],
        currentIndex: 0,
        url: objectUrl,
        fileName,
        type: "pdf",
        zoom: 1,
        loading: false
      });
    } catch (err) {
      handleInvoiceError(err);
    }
  };

  const handleDownloadInvoice = async (orderId: string, docNumber?: string) => {
    try {
      const response = await api.get(`/orders/${orderId}/sales-invoice/pdf`, {
        responseType: "blob"
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const objectUrl = window.URL.createObjectURL(blob);
      const fileName = docNumber ? `Faktura_${docNumber.replace(/\//g, "_")}.pdf` : `Faktura_${orderId}.pdf`;
      const link = document.createElement("a");
      link.href = objectUrl;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      handleInvoiceError(err);
    }
  };

  const handleAttachInvoiceToReply = async (orderId: string, docNumber?: string) => {
    try {
      const response = await api.get(`/orders/${orderId}/sales-invoice/pdf`, {
        responseType: "blob"
      });
      const fileName = docNumber ? `Faktura_${docNumber.replace(/\//g, "_")}.pdf` : `Faktura_${orderId}.pdf`;
      const invoiceFile = new File([response.data], fileName, { type: "application/pdf" });
      
      setSelectedFiles((prev) => {
        if (prev.some((f) => f.name === fileName)) {
          toast("Faktura jest już dołączona do odpowiedzi", { icon: "ℹ️" });
          return prev;
        }
        toast.success("Faktura VAT została dołączona do wiadomości!");
        return [...prev, invoiceFile];
      });
    } catch (err) {
      handleInvoiceError(err);
    }
  };

  const handleDownloadAttachment = async (att: { id?: string; url?: string; fileName?: string; name?: string }) => {
    const attachmentId = getAttachmentId(att);
    const fileName = att.fileName || att.name || "Załącznik";
    if (!attachmentId || !activeThread) {
      toast.error("Brak identyfikatora załącznika");
      return;
    }
    try {
      const response = await api.get(`/communication/attachments/${attachmentId}`, {
        params: {
          thread_id: activeThread.id,
          is_dispute: activeThread.type === "DISPUTE"
        },
        responseType: "blob"
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName || "Zalacznik");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getErrorMessage(err) || "Błąd pobierania załącznika");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Obsługa wysyłania wiadomości
  const handleSendReply = async () => {
    if (!activeThread || (!replyText.trim() && selectedFiles.length === 0)) return;
    setSending(true);
    try {
      const attachment_ids: string[] = [];
      
      // Upload files first
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("is_dispute", activeThread.type === "DISPUTE" ? "true" : "false");
          formData.append("thread_id", activeThread.id);
          
          // Using raw fetch or axios if needed, but api.post with multipart form
          const uploadRes = await api.post("/communication/attachments", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            }
          });
          if (uploadRes.data?.id) {
            attachment_ids.push(uploadRes.data.id);
          }
        }
      }

      await api.post(`/communication/threads/${activeThread.id}/reply`, {
        text: replyText,
        attachment_ids: attachment_ids.length > 0 ? attachment_ids : undefined
      });
      setReplyText("");
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Odpowiedź wysłana pomyślnie");
      
      // Odśwież szczegóły aktywnego wątku i listę wątków
      const updatedThread = await api.get<UnifiedThread>(`/communication/threads/${activeThread.id}`);
      setActiveThread(updatedThread.data);
      fetchThreads(true);
    } catch (err) {
      toast.error(getErrorMessage(err) || "Błąd wysyłania odpowiedzi");
    } finally {
      setSending(false);
    }
  };

  // Formatowanie pozostałego czasu SLA
  const renderSLATimer = (deadlineStr: string | null) => {
    if (!deadlineStr) return null;
    const deadline = new Date(deadlineStr);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    
    if (diffMs < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
          <Clock className="h-3 w-3" /> SLA PRZEKROCZONE
        </span>
      );
    }
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    let timerColor = "text-emerald-500 bg-emerald-500/10 border border-emerald-500/20";
    if (diffHours < 4) {
      timerColor = "text-red-500 bg-red-500/10 border border-red-500/20 animate-pulse";
    } else if (diffHours < 12) {
      timerColor = "text-amber-500 bg-amber-500/10 border border-amber-500/20";
    }
    
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${timerColor}`}>
        <Clock className="h-3 w-3" /> SLA: {diffHours}h {diffMins}m
      </span>
    );
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Centrum Komunikacji
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Zintegrowana skrzynka odbiorcza dla wiadomości, dyskusji i incydentów z marketplace.
          </p>
        </div>
        <button
          onClick={() => fetchThreads()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 px-4 py-2 text-sm font-semibold transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Odśwież
        </button>
      </div>

      {/* Wybór Widoku: Wiadomości vs Dyskusje */}
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => {
            setMainTab("MESSAGES");
            setActiveTab("UNREAD");
            setActiveThreadId(null);
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border ${
            mainTab === "MESSAGES"
              ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105"
              : "bg-slate-900/40 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Centrum Wiadomości
          {threads.filter(t => t.type === "MESSAGE_CENTER" && !t.read).length > 0 && (
            <Badge variant="destructive" className="ml-1.5 px-1.5 py-0.5 text-[9px] bg-red-500 hover:bg-red-500 font-extrabold">
              {threads.filter(t => t.type === "MESSAGE_CENTER" && !t.read).length}
            </Badge>
          )}
        </button>
        <button
          onClick={() => {
            setMainTab("DISPUTES");
            setActiveTab("UNREAD");
            setActiveThreadId(null);
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border ${
            mainTab === "DISPUTES"
              ? "bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/20 scale-105"
              : "bg-slate-900/40 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          Dyskusje i Incydenty
          {threads.filter(t => t.type === "DISPUTE" && !t.read).length > 0 && (
            <Badge variant="destructive" className="ml-1.5 px-1.5 py-0.5 text-[9px] bg-red-500 hover:bg-red-500 font-extrabold">
              {threads.filter(t => t.type === "DISPUTE" && !t.read).length}
            </Badge>
          )}
        </button>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden min-h-0">
        
        {/* Kolumna 1 (Lewa): Lista Wątków (lg:col-span-3 lub 4) */}
        <Card className="lg:col-span-3 flex flex-col border-white/5 bg-slate-900/50 backdrop-blur-xl overflow-hidden min-h-0">
          <CardHeader className="p-4 pb-2 space-y-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Szukaj klienta, tematu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/40 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {/* Tabsy filtrów */}
            <div className="flex flex-wrap gap-1 p-0.5 bg-slate-950/50 rounded-xl border border-white/5">
              {[
                { id: "ALL", label: "Wszystkie" },
                { id: "UNREAD", label: "Nieprzeczytane" },
                { id: "SLA", label: "Pilne SLA" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 text-[10px] font-bold py-1.5 px-2 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? "bg-primary text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-2 flex-1 overflow-y-auto min-h-0 space-y-1">
            {loading ? (
              <div className="space-y-2 p-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full bg-slate-800/40 rounded-xl" />
                ))}
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="text-center py-16 space-y-2 text-slate-500">
                <MessageSquare className="h-8 w-8 mx-auto opacity-30" />
                <p className="text-xs">Brak wątków pasujących do filtra</p>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = thread.id === activeThreadId;
                const isAllegro = thread.provider_type.toUpperCase() === "ALLEGRO";
                const isDispute = thread.type === "DISPUTE";

                return (
                  <div
                    key={thread.id}
                    onClick={() => setActiveThreadId(thread.id)}
                    className={`flex flex-col gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-primary/10 border-primary/30 shadow-md shadow-primary/5"
                        : "bg-slate-950/20 border-white/5 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {/* Badge Platformy */}
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                        isAllegro 
                          ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" 
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {thread.provider_type}
                      </span>

                      {/* SLA Timer */}
                      {renderSLATimer(thread.sla_deadline)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isDispute && <ShieldAlert className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                        <p className="font-semibold text-xs text-slate-200 truncate">
                          {thread.interlocutor_login}
                        </p>
                        {!thread.read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 animate-ping" />
                        )}
                      </div>

                      {thread.subject && (
                        <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                          {thread.subject}
                        </p>
                      )}

                      {thread.messages && thread.messages.length > 0 && (
                        <p className="text-[11px] text-slate-500 truncate mt-1">
                          {thread.messages[thread.messages.length - 1].text}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-500 border-t border-white/5 pt-1.5 mt-0.5">
                      <span>{new Date(thread.last_message_at).toLocaleDateString("pl-PL")}</span>
                      <span>{new Date(thread.last_message_at).toLocaleTimeString("pl-PL", { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Kolumna 2 (Środkowa): Rozmowa (lg:col-span-6) */}
        <Card className="lg:col-span-6 flex flex-col border-white/5 bg-slate-900/50 backdrop-blur-xl overflow-hidden min-h-0">
          {activeThread ? (
            <>
              {/* Header Czatu */}
              <div className="p-4 border-b border-white/5 bg-slate-950/20 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-200">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-200 flex items-center gap-1.5">
                      {activeThread.interlocutor_login}
                      {activeThread.type === "DISPUTE" && (
                        <Badge variant="destructive" className="text-[9px] font-extrabold uppercase py-0.5 px-1.5">
                          DYSKUSJA / SPÓR
                        </Badge>
                      )}
                    </h3>
                    {activeThread.order_id && (
                      <p className="text-[10px] text-slate-500">
                        Wątek powiązany z zamówieniem: <span className="font-mono">#{activeThread.order_id}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Oś czasu czatu */}
              <div className="flex-1 p-4 overflow-y-auto min-h-0 space-y-4 bg-slate-950/10">
                {activeThread.messages && activeThread.messages.length > 0 ? (
                  activeThread.messages.map((msg) => {
                    const isMerchant = msg.author_role === "SELLER";
                    const isSystem = msg.author_role === "SYSTEM" || msg.author_role === "ADMIN";

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center my-2">
                          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-2.5 max-w-md text-center space-y-1">
                            <div className="flex items-center justify-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
                              <ShieldAlert className="h-3.5 w-3.5" /> Moderator Marketplace
                            </div>
                            <p className="text-xs text-slate-300 font-medium">
                              {msg.text}
                            </p>
                            <span className="block text-[9px] text-slate-500 font-mono">
                              {new Date(msg.created_at).toLocaleString("pl-PL")}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className={`flex ${isMerchant ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl p-3.5 space-y-1.5 shadow-md ${
                          isMerchant
                            ? "bg-gradient-to-tr from-primary to-violet-600 text-white rounded-tr-none"
                            : "bg-slate-900 border border-white/5 text-slate-200 rounded-tl-none"
                        }`}>
                          <p className="text-xs whitespace-pre-wrap leading-relaxed">
                            {msg.text}
                          </p>
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {msg.attachments.map((att, idx) => {
                                const fileName = att.fileName || att.name || "Załącznik";
                                const lower = fileName.toLowerCase();
                                const isImg = lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp") || lower.endsWith(".gif");

                                return (
                                  <div
                                    key={idx}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all ${
                                      isMerchant 
                                        ? "bg-white/15 border-white/20 text-white" 
                                        : "bg-slate-950/60 border-white/10 text-slate-200"
                                    }`}
                                  >
                                    {isImg ? <ImageIcon className="h-3.5 w-3.5 text-blue-400 shrink-0" /> : <Paperclip className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                    <span className="truncate max-w-[160px]" title={fileName}>{fileName}</span>
                                    <div className="flex items-center gap-1 ml-1 pl-1 border-l border-white/10">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const allAtts = getAllThreadAttachments();
                                          const targetId = getAttachmentId(att);
                                          const globalIndex = allAtts.findIndex((a) => getAttachmentId(a) === targetId);
                                          loadAttachmentAtIndex(allAtts.length > 0 ? allAtts : msg.attachments!, globalIndex >= 0 ? globalIndex : idx);
                                        }}
                                        className="p-1 rounded-md hover:bg-white/20 transition-colors"
                                        title="Podgląd załącznika"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadAttachment(att)}
                                        className="p-1 rounded-md hover:bg-white/20 transition-colors"
                                        title="Pobierz załącznik"
                                      >
                                        <Download className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <div className={`flex items-center justify-between text-[9px] ${
                            isMerchant ? "text-white/60" : "text-slate-500"
                          } font-medium gap-2 pt-0.5`}>
                            <span className="font-semibold">{isMerchant ? "Ty (SuppSales)" : msg.author_login}</span>
                            <span className="font-mono">{new Date(msg.created_at).toLocaleString("pl-PL", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                    Brak wiadomości w historii
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Edytor Odpowiedzi */}
              <div className="p-4 border-t border-white/5 bg-slate-950/30 shrink-0 space-y-3 relative">
                
                {/* Toolbar narzędziowy */}
                <div className="flex items-center justify-between gap-2 shrink-0">
                  <div className="relative">
                    <button
                      onClick={() => setShowTemplatesDropdown(!showTemplatesDropdown)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 px-3 py-1.5 text-xs font-semibold transition-all"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Wstaw szablon
                    </button>
                    
                    {showTemplatesDropdown && (
                      <div className="absolute bottom-10 left-0 w-64 bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-1 z-50 max-h-48 overflow-y-auto">
                        <div className="p-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/5">
                          Dostępne szablony
                        </div>
                        {templates.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-600">Brak szablonów</div>
                        ) : (
                          templates.map((tpl) => (
                            <button
                              key={tpl.id}
                              onClick={() => insertTemplate(tpl)}
                              className="w-full text-left text-xs text-slate-300 hover:bg-white/5 p-2 rounded-lg truncate transition-all"
                            >
                              {tpl.title}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* File Upload */}
                  <div>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 px-3 py-1.5 text-xs font-semibold transition-all"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      Załącznik
                    </button>
                  </div>

                  <div className="flex-1"></div>

                  {/* Przycisk AI Assistant – Plan Gating */}
                  {canUseAI ? (
                    <button
                      onClick={handleGenerateAIDraft}
                      disabled={aiLoading}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:scale-105 active:scale-95 text-white px-3.5 py-1.5 text-xs font-bold shadow-lg shadow-violet-500/10 transition-all duration-300"
                    >
                      <Sparkles className={`h-3.5 w-3.5 ${aiLoading ? "animate-spin" : ""}`} />
                      Szkic AI Gemini ✨
                    </button>
                  ) : (
                    <div className="group relative inline-flex">
                      <button
                        disabled
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/60 border border-white/10 text-slate-500 px-3.5 py-1.5 text-xs font-bold cursor-not-allowed"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        Szkic AI Gemini
                      </button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-slate-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
                        Dostępne od planu <span className="font-bold text-primary">PRO</span>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Pole edycji */}
                <div className="relative">
                  {aiLoading && (
                    <div className="absolute inset-0 bg-slate-950/60 rounded-xl flex items-center justify-center z-10">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        <span className="text-xs text-slate-400 font-semibold">Gemini generuje propozycję...</span>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsExpandedReply(!isExpandedReply)}
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-white/10 transition-colors"
                      title={isExpandedReply ? "Zmniejsz okno edycji" : "Powiększ okno edycji"}
                    >
                      {isExpandedReply ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <textarea
                    rows={isExpandedReply ? 16 : 8}
                    placeholder="Wpisz odpowiedź do klienta..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className={`w-full bg-slate-950/50 border border-white/10 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/60 transition-all resize-y font-normal leading-relaxed ${
                      isExpandedReply ? "min-h-[360px]" : "min-h-[180px]"
                    }`}
                  />
                </div>

                {/* Selected Files Preview */}
                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-[10px] text-slate-300">
                        <Paperclip className="h-3 w-3 text-slate-500" />
                        <span className="truncate max-w-[150px]">{file.name}</span>
                        <button onClick={() => removeFile(idx)} className="text-slate-500 hover:text-red-400 ml-1">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Przycisk Wyślij */}
                <div className="flex justify-end shrink-0">
                  <button
                    onClick={handleSendReply}
                    disabled={sending || (!replyText.trim() && selectedFiles.length === 0)}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 text-white px-5 py-2.5 text-xs font-bold shadow-lg shadow-primary/20 transition-all duration-200"
                  >
                    {sending ? (
                      <div className="h-4.5 w-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        Wyślij odpowiedź
                      </>
                    )}
                  </button>
                </div>

              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
              <MessageSquare className="h-12 w-12 opacity-20" />
              <p className="text-xs font-medium">Wybierz konwersację z lewego panelu, aby rozpocząć czat</p>
            </div>
          )}
        </Card>

        {/* Kolumna 3 (Prawa): Kontekst Zamówienia (lg:col-span-3) */}
        <Card className="lg:col-span-3 flex flex-col border-white/5 bg-slate-900/50 backdrop-blur-xl overflow-y-auto min-h-0 p-4 space-y-4">
          
          <div className="border-b border-white/5 pb-2">
            <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-1.5">
              <ShoppingBag className="h-4.5 w-4.5 text-primary" /> Kontekst Klienta
            </h3>
            <p className="text-[10px] text-slate-500">Powiązane dane transakcyjne z marketplace</p>
          </div>

          {activeOrder ? (
            <div className="space-y-4 text-xs">
              
              {/* Sekcja 1: Zamówienie */}
              <div className="bg-slate-950/20 border border-white/5 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                  <span className="font-bold text-slate-300">Zamówienie</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[9px] font-extrabold uppercase py-0.5">
                      {activeOrder.order.status}
                    </Badge>
                    <a 
                      href={`/orders/${activeOrder.order.id}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:bg-primary/20 bg-primary/10 p-1 rounded-md transition-colors"
                      title="Otwórz szczegóły zamówienia w nowej karcie"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
                
                <div className="space-y-1 text-[11px] text-slate-400">
                  <div className="flex justify-between">
                    <span>ID Zewnętrzne:</span>
                    <span className="font-mono text-slate-200">{activeOrder.order.external_order_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Data zakupu:</span>
                    <span className="text-slate-200">{activeOrder.order.purchased_at}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Płatność:</span>
                    <span className="text-slate-200">{activeOrder.payment.total} ({activeOrder.payment.type})</span>
                  </div>
                </div>
              </div>

              {/* Sekcja 2: Dane Kupującego */}
              <div className="bg-slate-950/20 border border-white/5 rounded-xl p-3 space-y-2">
                <div className="font-bold text-slate-300 border-b border-white/5 pb-1.5 flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-slate-400" /> Kupujący
                </div>
                <div className="space-y-1 text-[11px] text-slate-400">
                  <p className="text-slate-200 font-semibold">
                    {activeOrder.buyer.first_name} {activeOrder.buyer.last_name}
                  </p>
                  <p className="truncate">Email: {activeOrder.buyer.email}</p>
                  {activeOrder.buyer.phone_number && <p>Tel: {activeOrder.buyer.phone_number}</p>}
                </div>
              </div>

              {/* Sekcja 3: Produkty */}
              <div className="bg-slate-950/20 border border-white/5 rounded-xl p-3 space-y-2">
                <div className="font-bold text-slate-300 border-b border-white/5 pb-1.5">
                  Zakupione Produkty
                </div>
                <div className="space-y-2 max-h-28 overflow-y-auto">
                  {activeOrder.line_items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-2 text-[11px] text-slate-400">
                      <span className="line-clamp-2 text-slate-300">{item.name}</span>
                      <span className="font-bold text-slate-200 shrink-0">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sekcja 4: Dostawa & Adres z Podglądem Tooltip */}
              <div className="bg-slate-950/20 border border-white/5 rounded-xl p-3 space-y-2">
                <div className="font-bold text-slate-300 border-b border-white/5 pb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5 text-slate-400" /> Dostawa & Paczka
                  </div>
                  <div className="group relative">
                    <button type="button" className="p-1 text-slate-400 hover:text-primary transition-colors">
                      <MapPin className="h-3.5 w-3.5" />
                    </button>
                    {/* Tooltip ze szczegółami adresu dostawy */}
                    <div className="absolute right-0 bottom-full mb-2 w-64 p-3 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-300 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 space-y-1">
                      <p className="font-bold text-slate-200 border-b border-white/10 pb-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-primary" /> Adres Dostawy
                      </p>
                      {activeOrder.delivery.address ? (
                        <>
                          <p className="font-semibold text-slate-200">
                            {activeOrder.delivery.address.first_name} {activeOrder.delivery.address.last_name}
                            {activeOrder.delivery.address.company_name && ` (${activeOrder.delivery.address.company_name})`}
                          </p>
                          <p>{activeOrder.delivery.address.street}</p>
                          <p>{activeOrder.delivery.address.zip_code} {activeOrder.delivery.address.city}</p>
                          {activeOrder.delivery.address.country_code && <p className="text-[10px] text-slate-500 uppercase">{activeOrder.delivery.address.country_code}</p>}
                        </>
                      ) : (
                        <p className="text-slate-500 italic">Brak pełnego adresu dostawy</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-400">
                  <p className="text-slate-200 font-semibold truncate">
                    {activeOrder.delivery.method_name}
                  </p>
                  {activeOrder.delivery.address && (
                    <p className="text-[10px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      <span>{activeOrder.delivery.address.street || ""}, {activeOrder.delivery.address.city || ""}</span>
                    </p>
                  )}
                  
                  {activeOrder.order.tracking_numbers && activeOrder.order.tracking_numbers.length > 0 ? (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Numery listów:</span>
                      {activeOrder.order.tracking_numbers.map((track, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-950/50 p-1.5 rounded-lg border border-white/5 font-mono text-[10px] text-slate-300">
                          <span>{track}</span>
                          <a
                            href={`https://allegro.pl/sledz-przesylke?numer=${track}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary-focus"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-600 italic">Brak numerów śledzenia przesyłki</p>
                  )}
                </div>
              </div>

              {/* Sekcja 5: Faktura VAT (FV) z Akcjami i Tooltipem */}
              <div className="bg-slate-950/20 border border-white/5 rounded-xl p-3 space-y-2">
                <div className="font-bold text-slate-300 border-b border-white/5 pb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Receipt className="h-3.5 w-3.5 text-slate-400" /> Faktura VAT (FV)
                  </div>
                  {activeOrder.invoice_address && (
                    <div className="group relative">
                      <button type="button" className="p-1 text-slate-400 hover:text-primary transition-colors">
                        <Building2 className="h-3.5 w-3.5" />
                      </button>
                      {/* Tooltip ze szczegółami adresu do faktury */}
                      <div className="absolute right-0 bottom-full mb-2 w-64 p-3 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-300 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 space-y-1">
                        <p className="font-bold text-slate-200 border-b border-white/10 pb-1 flex items-center gap-1">
                          <Receipt className="h-3 w-3 text-primary" /> Dane do Faktury
                        </p>
                        <p className="font-semibold text-slate-200">
                          {activeOrder.invoice_address.company_name || `${activeOrder.invoice_address.first_name || ""} ${activeOrder.invoice_address.last_name || ""}`}
                        </p>
                        {activeOrder.invoice_address.tax_id && (
                          <p className="font-mono text-primary text-[11px] font-bold">NIP: {activeOrder.invoice_address.tax_id}</p>
                        )}
                        <p>{activeOrder.invoice_address.street}</p>
                        <p>{activeOrder.invoice_address.zip_code} {activeOrder.invoice_address.city}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-[11px]">
                  {activeOrder.invoice_address ? (
                    <div className="space-y-0.5">
                      <p className="text-slate-200 font-semibold truncate">
                        {activeOrder.invoice_address.company_name || `${activeOrder.invoice_address.first_name || ""} ${activeOrder.invoice_address.last_name || ""}`}
                      </p>
                      {activeOrder.invoice_address.tax_id && (
                        <p className="text-primary font-mono font-bold text-[10px]">
                          NIP: {activeOrder.invoice_address.tax_id}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">Brak danych do faktury (paragon)</p>
                  )}

                  {/* Przycisk Podglądu, Dołączenia i Pobierania FV */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handlePreviewInvoice(activeOrder.order.id, activeOrder.order.erp_sales_document_number)}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-[10px] font-bold transition-all"
                      title="Podgląd faktury VAT"
                    >
                      <Eye className="h-3 w-3" /> Podgląd
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttachInvoiceToReply(activeOrder.order.id, activeOrder.order.erp_sales_document_number)}
                      className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-[10px] font-bold transition-all"
                      title="Dołącz fakturę PDF do odpowiedzi"
                    >
                      <Paperclip className="h-3 w-3" /> Dołącz FV
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadInvoice(activeOrder.order.id, activeOrder.order.erp_sales_document_number)}
                      className="inline-flex items-center justify-center p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 transition-colors"
                      title="Pobierz fakturę PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sekcja 6: Inne zamówienia klienta */}
              {activeOrder.related_orders && activeOrder.related_orders.length > 0 && (
                <div className="bg-slate-950/20 border border-white/5 rounded-xl p-3 space-y-2">
                  <div className="font-bold text-slate-300 border-b border-white/5 pb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShoppingBag className="h-3.5 w-3.5 text-primary" /> Inne zamówienia ({activeOrder.related_orders.length})
                    </div>
                    <span className="text-[9px] text-slate-500 font-normal">Kupujący</span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {activeOrder.related_orders.map((ro) => (
                      <a 
                        key={ro.id} 
                        href={`/orders/${ro.id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        title={ro.items_summary || ro.external_order_id}
                        className="relative block bg-slate-950/60 p-2.5 rounded-xl border border-white/5 hover:border-primary/50 hover:bg-slate-900 transition-all group space-y-1.5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span 
                            title={ro.items_summary || ro.external_order_id}
                            className="text-xs font-semibold text-slate-200 group-hover:text-primary transition-colors line-clamp-2 leading-tight"
                          >
                            {ro.items_summary || ro.external_order_id}
                          </span>
                          <Badge variant="outline" className="text-[9px] font-extrabold uppercase shrink-0 px-1.5 py-0.5 border-primary/30 text-primary bg-primary/5">
                            {translateOrderStatus(ro.status)}
                          </Badge>
                        </div>

                        {/* Tooltip po najechaniu z pełną nazwą zamówienia */}
                        <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-50 w-full p-2 rounded-lg bg-slate-900 border border-white/10 text-xs text-slate-200 shadow-2xl pointer-events-none">
                          <p className="font-bold text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Zamówiony towar:</p>
                          <p className="font-semibold text-slate-100 leading-snug">{ro.items_summary}</p>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-white/5">
                          <span className="flex items-center gap-1 text-slate-300 font-sans font-medium">
                            📅 <span className="font-semibold text-slate-200">{ro.purchased_at}</span>
                          </span>
                          {ro.total && <span className="font-bold text-slate-200">{ro.total}</span>}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="h-36 flex flex-col items-center justify-center text-slate-600 text-center space-y-1">
              <ShoppingBag className="h-6 w-6 opacity-30" />
              <p className="text-[11px]">Brak powiązanego zamówienia dla tego wątku</p>
            </div>
          )}

          {/* Sekcja: Zadania i decyzje wątku */}
          <div className="bg-slate-950/20 border border-white/5 rounded-xl p-3 space-y-2 mt-4">
            <div className="font-bold text-slate-300 border-b border-white/5 pb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5 text-indigo-400" /> Zadania i decyzje
              </div>
              <Badge variant="outline" className="text-[10px] bg-indigo-500/5 text-indigo-400 border-indigo-500/10">
                {threadTasks.length}
              </Badge>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {isThreadTasksLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                </div>
              ) : threadTasks.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic py-1">Brak zadań powiązanych z tym wątkiem.</p>
              ) : (
                threadTasks.map((task) => {
                  const statusColor = 
                    task.status === "NEW" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                    task.status === "IN_PROGRESS" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                    task.status === "RESOLVED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    "bg-slate-500/10 text-slate-400 border-white/10";

                  return (
                    <div 
                      key={task.id} 
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent("open-internal-task", { detail: { taskId: task.id } }));
                      }}
                      className="bg-slate-950/60 p-2 rounded-lg border border-white/5 hover:border-indigo-500/30 hover:bg-slate-900 transition-all cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between text-[9px]">
                        <span className="font-semibold text-slate-400">
                          {task.created_by.name || task.created_by.email.split("@")[0]}
                        </span>
                        <Badge variant="outline" className={`text-[8px] px-1 py-0 h-3.5 border-none font-bold rounded ${statusColor}`}>
                          {task.status === "NEW" ? "Nowe" : task.status === "IN_PROGRESS" ? "W toku" : task.status === "RESOLVED" ? "Odpowiedź" : "Zamknięte"}
                        </Badge>
                      </div>
                      <p className="font-bold text-[10px] text-slate-200 truncate leading-tight">{task.title}</p>
                      {task.description && (
                        <p className="text-[9px] text-slate-500 line-clamp-1 leading-normal">{task.description}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <Button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("open-internal-task", { detail: { taskId: "", threadId: activeThreadId } }));
              }}
              variant="outline"
              size="sm"
              className="w-full h-7 text-[10px] bg-slate-900 border-white/10 text-slate-300 hover:bg-white/5 hover:text-white rounded-lg flex items-center justify-center gap-1"
            >
              <Plus className="h-3 w-3" /> Zgłoś prośbę / zadanie
            </Button>
          </div>
        </Card>

      </div>

      {/* Modal Lightbox Podglądu Załącznika z nawigacją i zoomowaniem */}
      {previewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 relative">
            
            {/* Header Modala */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-slate-950/70 shrink-0">
              <div className="flex items-center gap-2.5 truncate">
                <Paperclip className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-semibold text-slate-200 truncate max-w-sm sm:max-w-md">{previewModal.fileName}</span>
                {previewModal.attachments.length > 1 && (
                  <Badge variant="outline" className="text-[10px] font-bold bg-slate-800/80 text-slate-300 border-white/10 shrink-0">
                    {previewModal.currentIndex + 1} / {previewModal.attachments.length}
                  </Badge>
                )}
              </div>

              {/* Pasek Narzędzi: Zoom & Akcje */}
              <div className="flex items-center gap-2">
                {previewModal.type === "image" && (
                  <div className="flex items-center gap-1 bg-slate-800/80 border border-white/10 rounded-lg p-0.5 mr-2">
                    <button
                      type="button"
                      onClick={() => setPreviewModal((prev) => prev ? { ...prev, zoom: Math.max(0.5, prev.zoom - 0.25) } : null)}
                      className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
                      title="Pomniejsz (-)"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-[11px] font-mono text-slate-300 px-1.5 font-bold min-w-[42px] text-center">
                      {Math.round(previewModal.zoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewModal((prev) => prev ? { ...prev, zoom: Math.min(3.5, prev.zoom + 0.25) } : null)}
                      className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
                      title="Powiększ (+)"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPan({ x: 0, y: 0 });
                        setPreviewModal((prev) => prev ? { ...prev, zoom: 1 } : null);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors border-l border-white/10 ml-0.5"
                      title="Resetuj powiększenie (100%)"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {previewModal.url && (
                  <a
                    href={previewModal.url}
                    download={previewModal.fileName}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition-colors"
                    title="Pobierz plik na dysk"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                )}
                
                <button
                  type="button"
                  onClick={() => {
                    if (previewModal.url) window.URL.revokeObjectURL(previewModal.url);
                    setPreviewModal(null);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-white/10 transition-colors"
                  title="Zamknij (Esc)"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Treść Modala z Przyciskami Nawigacji (Strzałkami) */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/50 relative min-h-[400px]">
              
              {/* Strzałka W LEWO (Poprzedni załącznik) */}
              {previewModal.attachments.length > 1 && (
                <button
                  type="button"
                  disabled={previewModal.currentIndex === 0 || previewModal.loading}
                  onClick={() => loadAttachmentAtIndex(previewModal.attachments, previewModal.currentIndex - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-slate-900/90 border border-white/15 text-slate-200 hover:bg-primary hover:border-primary disabled:opacity-30 disabled:hover:bg-slate-900 shadow-xl backdrop-blur-md transition-all group"
                  title="Poprzedni załącznik (Strzałka w lewo)"
                >
                  <ChevronLeft className="h-5 w-5 group-hover:scale-110 transition-transform" />
                </button>
              )}

              {/* Strzałka W PRAWO (Następny załącznik) */}
              {previewModal.attachments.length > 1 && (
                <button
                  type="button"
                  disabled={previewModal.currentIndex === previewModal.attachments.length - 1 || previewModal.loading}
                  onClick={() => loadAttachmentAtIndex(previewModal.attachments, previewModal.currentIndex + 1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-slate-900/90 border border-white/15 text-slate-200 hover:bg-primary hover:border-primary disabled:opacity-30 disabled:hover:bg-slate-900 shadow-xl backdrop-blur-md transition-all group"
                  title="Następny załącznik (Strzałka w prawo)"
                >
                  <ChevronRight className="h-5 w-5 group-hover:scale-110 transition-transform" />
                </button>
              )}

              {/* Content Loading Indicator */}
              {previewModal.loading ? (
                <div className="flex flex-col items-center gap-3 text-slate-400 py-16">
                  <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <span className="text-xs font-semibold">Ładowanie załącznika...</span>
                </div>
              ) : previewModal.type === "image" ? (
                <div
                  onWheel={handleWheel}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className={`w-full h-full flex items-center justify-center overflow-hidden max-h-[78vh] select-none ${
                    previewModal.zoom > 1 
                      ? isDragging ? "cursor-grabbing" : "cursor-grab" 
                      : "cursor-default"
                  }`}
                >
                  <img
                    src={previewModal.url}
                    alt={previewModal.fileName}
                    draggable={false}
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${previewModal.zoom})`
                    }}
                    className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-75 origin-center pointer-events-none"
                  />
                </div>
              ) : previewModal.type === "pdf" ? (
                <div className="w-full h-[78vh] rounded-xl overflow-hidden bg-slate-950">
                  <object
                    data={previewModal.url}
                    type="application/pdf"
                    className="w-full h-full rounded-xl border-0"
                  >
                    <embed src={previewModal.url} type="application/pdf" className="w-full h-full rounded-xl" />
                    <div className="text-center py-16 space-y-4">
                      <FileText className="h-14 w-14 text-slate-500 mx-auto" />
                      <p className="text-sm text-slate-300 font-medium">Podgląd PDF wymaga pobrania dokumentu</p>
                      <a
                        href={previewModal.url}
                        download={previewModal.fileName}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                      >
                        <Download className="h-4 w-4" /> Pobierz dokument PDF
                      </a>
                    </div>
                  </object>
                </div>
              ) : (
                <div className="text-center py-16 space-y-4">
                  <FileText className="h-14 w-14 text-slate-500 mx-auto" />
                  <p className="text-sm text-slate-400 font-medium">Podgląd niedostępny dla tego typu pliku</p>
                  <a
                    href={previewModal.url}
                    download={previewModal.fileName}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                  >
                    <Download className="h-4 w-4" /> Pobierz plik ({previewModal.fileName})
                  </a>
                </div>
              )}

            </div>

            {/* Wskazówka nawigacji i zoomowania */}
            {previewModal.type === "image" && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-950/80 border border-white/10 text-[10px] text-slate-400 backdrop-blur-md pointer-events-none z-20 flex items-center gap-2 shadow-xl">
                <span>💡 Scroll myszy lub <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-white/10 font-mono text-[9px] text-slate-300">+</kbd> / <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-white/10 font-mono text-[9px] text-slate-300">-</kbd> powiększa</span>
                <span>•</span>
                <span>Przeciągaj łapką przy powiększeniu</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
