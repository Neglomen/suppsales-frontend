"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Loader2,
  ServerCrash,
  MessageCircle,
  Link as LinkIcon,
  Send,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Thread, Message } from "@/types/thread"; // Importujemy nowe typy
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  buyerLogin: string;
  integrationId: number;
  currentOrderId: string;
  myLogin: string | null;
}

const MessageBubble = ({
  msg,
  isMyMessage,
}: {
  msg: Message;
  isMyMessage: boolean;
}) => (
  <div
    className={cn(
      "flex items-end gap-2",
      isMyMessage ? "justify-end" : "justify-start"
    )}
  >
    <div
      className={cn(
        "rounded-lg p-3 max-w-xs md:max-w-md",
        isMyMessage ? "bg-primary text-primary-foreground" : "bg-muted"
      )}
    >
      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
      <p className="text-xs text-right mt-1 opacity-70">
        {new Date(msg.created_at).toLocaleTimeString("pl-PL", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </div>
  </div>
);

export function ChatPanel({
  buyerLogin,
  integrationId,
  currentOrderId,
  myLogin,
}: ChatPanelProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!buyerLogin || !integrationId) return;

    const fetchThreads = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get<Thread[]>("/threads/by-buyer-login", {
          params: { buyer_login: buyerLogin, integration_id: integrationId },
        });
        setThreads(response.data);
      } catch (err) {
        setError("Nie udało się załadować historii konwersacji.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchThreads();
  }, [buyerLogin, integrationId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <ServerCrash className="h-4 w-4" />
        <AlertTitle>Błąd</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8">
        Brak historii konwersacji z tym klientem.
      </div>
    );
  }

  const defaultOpenThreadId = threads.find(
    (t) => t.order_id === currentOrderId
  )?.id;

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpenThreadId}
      className="w-full"
    >
      {threads.map((thread) => (
        <AccordionItem value={thread.id} key={thread.id}>
          <AccordionTrigger className="p-4 hover:no-underline text-sm">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-semibold">
                    Konwersacja z
                    {new Date(thread.last_message_at).toLocaleString("pl-PL", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ostatnia wiadomość:
                    {new Date(thread.last_message_at).toLocaleTimeString(
                      "pl-PL"
                    )}
                  </p>
                </div>
              </div>
              {thread.order_id && (
                <Badge
                  variant={
                    thread.order_id === currentOrderId ? "default" : "secondary"
                  }
                >
                  <LinkIcon className="mr-1 h-3 w-3" />
                  Powiązane z zamówieniem
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="border-t">
            <div className="flex flex-col h-[450px]">
              <div className="flex-1 space-y-4 p-4 overflow-y-auto">
                {thread.messages
                  .sort(
                    (a, b) =>
                      new Date(a.created_at).getTime() -
                      new Date(b.created_at).getTime()
                  ) // Upewnij się, że są posortowane chronologicznie
                  .map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      isMyMessage={msg.author_login === myLogin}
                    />
                  ))}
              </div>
              <div className="border-t p-4 bg-background">
                <div className="relative">
                  <Textarea
                    placeholder="Napisz odpowiedź..."
                    className="pr-12"
                    rows={3}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="absolute top-1/2 right-2 -translate-y-1/2"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
