import type { ReactNode } from "react";
import { Dialog, DialogPortal, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import * as Primitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ChatActionDialog({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; children: ReactNode }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogPortal>
    <DialogOverlay className="chat-action-overlay bg-foreground/20 backdrop-blur-md motion-reduce:animate-none" />
    <Primitive.Content aria-describedby={undefined} className="chat-action-panel fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-5 shadow-raised duration-300 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 motion-reduce:animate-none">
      <DialogTitle className="mb-5 pr-10 text-xl font-bold">{title}</DialogTitle>
      <Primitive.Close asChild><Button size="icon" variant="ghost" className="absolute right-3 top-3 rounded-full" aria-label="Close"><X /></Button></Primitive.Close>
      <div className="space-y-2 [&_button_svg]:size-5">{children}</div>
    </Primitive.Content>
  </DialogPortal></Dialog>;
}