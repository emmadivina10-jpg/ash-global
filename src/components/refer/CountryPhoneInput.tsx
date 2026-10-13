import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";

export type Country = { iso: string; name: string; dial: string };

/** US first by default; members pick their own country. */
export const COUNTRIES: Country[] = [
  { iso: "US", name: "United States", dial: "+1" },
  { iso: "CA", name: "Canada", dial: "+1" },
  { iso: "CM", name: "Cameroon", dial: "+237" },
  { iso: "NG", name: "Nigeria", dial: "+234" },
  { iso: "GB", name: "United Kingdom", dial: "+44" },
  { iso: "FR", name: "France", dial: "+33" },
  { iso: "DE", name: "Germany", dial: "+49" },
  { iso: "BE", name: "Belgium", dial: "+32" },
  { iso: "GH", name: "Ghana", dial: "+233" },
  { iso: "KE", name: "Kenya", dial: "+254" },
  { iso: "ZA", name: "South Africa", dial: "+27" },
  { iso: "CI", name: "Côte d'Ivoire", dial: "+225" },
  { iso: "SN", name: "Senegal", dial: "+221" },
  { iso: "GA", name: "Gabon", dial: "+241" },
  { iso: "TD", name: "Chad", dial: "+235" },
  { iso: "CF", name: "Central African Rep.", dial: "+236" },
  { iso: "CG", name: "Congo", dial: "+242" },
  { iso: "CD", name: "DR Congo", dial: "+243" },
  { iso: "GQ", name: "Equatorial Guinea", dial: "+240" },
  { iso: "MA", name: "Morocco", dial: "+212" },
  { iso: "EG", name: "Egypt", dial: "+20" },
  { iso: "AE", name: "United Arab Emirates", dial: "+971" },
  { iso: "SA", name: "Saudi Arabia", dial: "+966" },
  { iso: "IN", name: "India", dial: "+91" },
  { iso: "CN", name: "China", dial: "+86" },
  { iso: "ES", name: "Spain", dial: "+34" },
  { iso: "IT", name: "Italy", dial: "+39" },
  { iso: "BR", name: "Brazil", dial: "+55" },
  { iso: "MX", name: "Mexico", dial: "+52" },
  { iso: "AU", name: "Australia", dial: "+61" },
];

export function flagOf(iso: string) {
  return String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

/** Country flag + dial code selector joined to a local number field. Emits full "+<dial><number>". */
export function CountryPhoneInput({
  id,
  onChange,
}: {
  id: string;
  onChange: (full: string) => void;
}) {
  const [iso, setIso] = useState("US");
  const [local, setLocal] = useState("");
  const country = COUNTRIES.find((c) => c.iso === iso) ?? COUNTRIES[0]!;

  function emit(nextIso: string, nextLocal: string) {
    const c = COUNTRIES.find((x) => x.iso === nextIso) ?? COUNTRIES[0]!;
    const digits = nextLocal.replace(/[^\d]/g, "").replace(/^0+/, "");
    onChange(digits ? `${c.dial}${digits}` : "");
  }

  return (
    <div className="flex h-11 overflow-hidden rounded-xl border border-input bg-background transition-shadow focus-within:ring-2 focus-within:ring-ring/40">
      <label className="relative flex shrink-0 items-center gap-1.5 border-r border-border bg-muted/40 pl-3 pr-2 text-sm font-semibold text-foreground">
        <span className="text-lg leading-none" aria-hidden>
          {flagOf(country.iso)}
        </span>
        <span>{country.dial}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
        <select
          aria-label="Country"
          value={iso}
          onChange={(e) => {
            setIso(e.target.value);
            emit(e.target.value, local);
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {COUNTRIES.map((c) => (
            <option key={c.iso} value={c.iso}>
              {flagOf(c.iso)} {c.name} ({c.dial})
            </option>
          ))}
        </select>
      </label>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          emit(iso, e.target.value);
        }}
        placeholder="Phone number"
        className="h-full rounded-none border-0 shadow-none focus-visible:ring-0"
      />
    </div>
  );
}
