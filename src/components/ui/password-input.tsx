import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PasswordInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  wrapperClassName?: string;
};

export function PasswordInput({
  className,
  wrapperClassName,
  id,
  autoComplete,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={cn("relative", wrapperClassName)}>
      <Input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        className={cn("pr-10", className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        aria-controls={id}
        className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
        onClick={() => setVisible((prev) => !prev)}
        tabIndex={-1}
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden />
        ) : (
          <Eye className="size-4" aria-hidden />
        )}
      </Button>
    </div>
  );
}
