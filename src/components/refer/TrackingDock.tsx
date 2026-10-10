import { type ReactNode } from "react";
import { CompassSurface } from "./CompassSurface";

/** The tracking page supplies its live map to the same viewport-owned control. */
export function TrackingDock({ children }: { children: ReactNode }) {
  return <CompassSurface map={children} initiallyOpen active />;
}
