import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, ImagePlus, Send, X } from "lucide-react";
import { toast } from "sonner";
import { askAssistant, type ChatTurn } from "@/lib/assistant.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

/** Reads a picked photo into a data URL the AI can look at. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/** ASH intelligence conversation surface, rendered inside the ASH orb. */
export function AssistantPanel() {
  const { tx, t, lang } = useI18n();
  const fr = lang === "fr";
  const ask = useServerFn(askAssistant);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const messages = messagesRef.current;
    if (messages) messages.scrollTop = messages.scrollHeight;
  }, [turns, busy]);

  async function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    for (const file of files.slice(0, 2)) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(tx("Photo is too large (6 MB max).", "Photo trop lourde (6 Mo max)."));
        continue;
      }
      const url = await readAsDataUrl(file);
      setImages((current) => [...current, url].slice(0, 2));
    }
  }

  async function send(text: string) {
    const message = text.trim();
    if ((!message && images.length === 0) || busy) return;
    const turn: ChatTurn = {
      role: "user",
      content: message || (tx("Look at this photo.", "Regarde cette photo.")),
      ...(images.length > 0 ? { images } : {}),
    };
    const next: ChatTurn[] = [...turns, turn];
    setTurns(next);
    setInput("");
    setImages([]);
    setBusy(true);
    try {
      const result = await ask({ data: { messages: next, lang } });
      const reply = typeof result === "string" ? result : (result?.reply ?? "");
      if (!reply) throw new Error("empty");
      setTurns([...next, { role: "assistant", content: reply }]);
    } catch {
      toast.error(t("ai.err"));
      setTurns(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={messagesRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1"
      >
        {turns.length === 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(["ai.hint1", "ai.hint2", "ai.hint3"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => void send(t(key))}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
                >
                  {t(key)}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {tx("Add a photo or take a snapshot — ASH can look at it and advise you.", "Ajoutez une photo ou prenez un instantané : ASH peut regarder et vous conseiller.")}
            </p>
          </div>
        ) : null}

        {turns.map((turn, index) => (
          <div
            key={index}
            className={cn("flex", turn.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] space-y-1.5",
                turn.role === "user" ? "items-end" : "items-start",
              )}
            >
              {(turn.images ?? []).length > 0 ? (
                <div className="flex flex-wrap justify-end gap-1.5">
                  {(turn.images ?? []).map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt=""
                      className="size-24 rounded-xl border border-border object-cover"
                    />
                  ))}
                </div>
              ) : null}
              <p
                className={cn(
                  "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm",
                  turn.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {turn.content}
              </p>
            </div>
          </div>
        ))}
        {busy ? <p className="text-sm text-muted-foreground">{t("ai.busy")}</p> : null}
      </div>

      {images.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {images.map((src, index) => (
            <span key={index} className="relative">
              <img
                src={src}
                alt=""
                className="size-16 rounded-xl border border-border object-cover"
              />
              <button
                type="button"
                aria-label={tx("Remove photo", "Retirer la photo")}
                onClick={() => setImages((current) => current.filter((_, i) => i !== index))}
                className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-foreground text-background"
              >
                <X className="size-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
        className="mt-3 flex items-center gap-2"
      >
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => cameraRef.current?.click()}
          aria-label={tx("Take a photo", "Prendre une photo")}
        >
          <Camera className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => galleryRef.current?.click()}
          aria-label={tx("Add a photo", "Ajouter une photo")}
        >
          <ImagePlus className="size-4" aria-hidden />
        </Button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => void pick(event)}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => void pick(event)}
        />
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t("ai.placeholder")}
          aria-label={t("ai.placeholder")}
        />
        <Button
          type="submit"
          size="icon"
          disabled={busy || (input.trim().length === 0 && images.length === 0)}
          aria-label={t("chat.send")}
        >
          <Send className="size-4" aria-hidden />
        </Button>
      </form>
    </div>
  );
}
