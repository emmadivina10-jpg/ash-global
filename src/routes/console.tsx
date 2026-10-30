import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, CheckCircle2, MapPinned, PackageCheck, Truck, Users } from "lucide-react";

import { DispatchConsolePanel } from "@/components/dispatch/DispatchConsolePanel";

export const Route = createFileRoute("/console")({
  component: ConsoleLayout,
});

// existing file content continues below...
