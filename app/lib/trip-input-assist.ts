export type TripAssistValues = Partial<Record<"rst_number" | "origin" | "destination" | "material_name" | "gross_weight" | "tare_weight" | "quantity_tonnes" | "rate", string>> & { customer?: string; vehicle?: string; driver?: string };

const cleanNumber = (value: string) => value.replace(/,/g, "").trim();
const weightInTonnes = (value?: string) => { if (!value) return undefined; const parsed = Number(cleanNumber(value)); if (!Number.isFinite(parsed)) return undefined; return String(Number((parsed > 1000 ? parsed / 1000 : parsed).toFixed(3))); };
const capture = (text: string, patterns: RegExp[]) => { for (const pattern of patterns) { const match = text.match(pattern); if (match?.[1]) return match[1].trim(); } return undefined; };

export function parseWeighbridgeText(raw: string): TripAssistValues {
  const text = raw.replace(/\r/g, "\n").replace(/[|]/g, " ");
  const rst = capture(text, [/(?:rst|slip|ticket|serial|sr)\s*(?:no|number|#)?\s*[:.-]?\s*([A-Z0-9/-]{2,30})/i]);
  const vehicle = capture(text, [/(?:vehicle|truck|lorry)\s*(?:no|number|#)?\s*[:.-]?\s*([A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{3,4})/i, /\b([A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{3,4})\b/i]);
  const gross = weightInTonnes(capture(text, [/(?:gross|g\.\s*wt)\s*(?:weight|wt)?\s*[:.-]?\s*([0-9][0-9,.]*)/i]));
  const tare = weightInTonnes(capture(text, [/(?:tare|t\.\s*wt)\s*(?:weight|wt)?\s*[:.-]?\s*([0-9][0-9,.]*)/i]));
  const net = weightInTonnes(capture(text, [/(?:net|n\.\s*wt)\s*(?:weight|wt)?\s*[:.-]?\s*([0-9][0-9,.]*)/i]));
  const material = capture(text, [/(?:material|commodity|product)\s*[:.-]?\s*([A-Z][A-Z0-9 /-]{2,40})/i]);
  return { rst_number: rst, vehicle: vehicle?.replace(/\s/g, "").toUpperCase(), gross_weight: gross, tare_weight: tare, quantity_tonnes: net ?? (gross && tare ? String(Math.max(0, Number(gross) - Number(tare))) : undefined), material_name: material };
}

export function parseVoiceTrip(raw: string): TripAssistValues {
  const text = raw.replace(/[।,]/g, " ").replace(/\s+/g, " ").trim();
  const value = (labels: string, stops: string) => capture(text, [new RegExp(`(?:${labels})\\s+(.+?)(?=\\s+(?:${stops})\\s+|$)`, "i")]);
  const allStops = "party|customer|ग्राहक|पार्टी|origin|from|कहाँ से|कहां से|destination|to|कहाँ तक|कहां तक|material|सामान|मटेरियल|gross weight|gross|कुल वजन|tare weight|tare|खाली वजन|net weight|net|शुद्ध वजन|rate|रेट|भाव|rst|आरएसटी|truck|vehicle|गाड़ी|driver|ड्राइवर";
  const gross = weightInTonnes(value("gross weight|gross|कुल वजन", allStops)); const tare = weightInTonnes(value("tare weight|tare|खाली वजन", allStops));
  return {
    customer: value("party|customer|ग्राहक|पार्टी", allStops), origin: value("origin|from|कहाँ से|कहां से", allStops), destination: value("destination|to|कहाँ तक|कहां तक", allStops), material_name: value("material|सामान|मटेरियल", allStops),
    gross_weight: gross, tare_weight: tare, quantity_tonnes: weightInTonnes(value("net weight|net|शुद्ध वजन", allStops)) ?? (gross && tare ? String(Math.max(0, Number(gross) - Number(tare))) : undefined),
    rate: cleanNumber(value("rate|रेट|भाव", allStops) ?? "") || undefined, rst_number: value("rst|आरएसटी", allStops), vehicle: value("truck|vehicle|गाड़ी", allStops)?.replace(/\s/g, "").toUpperCase(), driver: value("driver|ड्राइवर", allStops),
  };
}
