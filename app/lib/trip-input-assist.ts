export type TripAssistValues = Partial<Record<"rst_number" | "origin" | "destination" | "material_name" | "gross_weight" | "tare_weight" | "quantity_tonnes" | "rate", string>> & { customer?: string; vehicle?: string; driver?: string };

const devanagariDigits: Record<string, string> = { "०": "0", "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9" };
const normalizeDigits = (value: string) => value.replace(/[०-९]/g, digit => devanagariDigits[digit] ?? digit);
const numericValue = (value?: string) => {
  if (!value) return undefined;
  const cleaned = normalizeDigits(value)
    .replace(/(?<=\d)[Oo](?=\d)|^[Oo](?=\d)|(?<=\d)[Oo]$/g, "0")
    .replace(/(?<=\d)[Il](?=\d)|^[Il](?=\d)|(?<=\d)[Il]$/g, "1")
    .replace(/,/g, "");
  const match = cleaned.match(/\d+(?:\.\d+)?/);
  return match?.[0];
};
const weightInTonnes = (value?: string) => {
  const numeric = numericValue(value);
  if (!numeric) return undefined;
  const parsed = Number(numeric);
  if (!Number.isFinite(parsed)) return undefined;
  return String(Number((parsed > 1000 ? parsed / 1000 : parsed).toFixed(3)));
};
const capture = (text: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
};
const cleanTextValue = (value?: string) => value?.replace(/\s+/g, " ").replace(/^[\s:.-]+|[\s:.;,-]+$/g, "").trim() || undefined;
const cleanReference = (value?: string) => cleanTextValue(value)?.replace(/\s+/g, "").toUpperCase();

function extractWeight(text: string, labels: string) {
  const label = new RegExp(`\\b(?:${labels})\\b`, "i");
  const lines = text.split(/\n+/);
  for (let index = 0; index < lines.length; index += 1) {
    const match = label.exec(lines[index]);
    if (!match || match.index == null) continue;
    const candidate = `${lines[index].slice(match.index + match[0].length)} ${lines[index + 1] ?? ""}`;
    const weight = weightInTonnes(candidate);
    if (weight) return weight;
  }
  return undefined;
}

export function parseWeighbridgeText(raw: string): TripAssistValues {
  const text = raw.replace(/\r/g, "\n").replace(/[|]/g, " ").replace(/[—–]/g, "-");
  const rst = cleanReference(capture(text, [
    /(?:rst|r\.s\.t|slip|ticket|token|serial|sr|challan)\s*(?:no|number|num|#)?\s*[:.=#-]?\s*([A-Z0-9OIl/-]{1,30})/i,
  ]));
  const vehicle = cleanReference(capture(text, [
    /(?:vehicle|truck|lorry|veh)\s*(?:no|number|num|#)?\s*[:.=#-]?\s*([A-Z]{2}\s*[- ]?\s*\d{1,2}\s*[- ]?\s*[A-Z]{1,3}\s*[- ]?\s*\d{3,4})/i,
    /\b([A-Z]{2}\s*[- ]?\s*\d{1,2}\s*[- ]?\s*[A-Z]{1,3}\s*[- ]?\s*\d{3,4})\b/i,
  ]));
  const gross = extractWeight(text, "gross|g\\.?\\s*(?:wt|wgt)|loaded");
  const tare = extractWeight(text, "tare|t\\.?\\s*(?:wt|wgt)|empty");
  const statedNet = extractWeight(text, "net|n\\.?\\s*(?:wt|wgt)");
  const calculatedNet = gross && tare && Number(gross) >= Number(tare) ? String(Number((Number(gross) - Number(tare)).toFixed(3))) : undefined;
  const material = cleanTextValue(capture(text, [/(?:material|commodity|product|item|goods)\s*[:.=#-]?\s*([^\n\r]{2,50})/i]));
  const customer = cleanTextValue(capture(text, [/(?:party|customer|consignee)\s*(?:name)?\s*[:.=#-]?\s*([^\n\r]{2,60})/i]));
  const origin = cleanTextValue(capture(text, [/(?:origin|from|source)\s*[:.=#-]?\s*([^\n\r]{2,50})/i]));
  const destination = cleanTextValue(capture(text, [/(?:destination|to|delivery)\s*[:.=#-]?\s*([^\n\r]{2,50})/i]));
  const rate = numericValue(capture(text, [/(?:rate|price|freight)\s*[:.=#-]?\s*([₹Rs.\s0-9०-९OIl,.]+)/i]));
  return { rst_number: rst, vehicle, customer, origin, destination, gross_weight: gross, tare_weight: tare, quantity_tonnes: statedNet ?? calculatedNet, material_name: material, rate };
}

export function parseVoiceTrip(raw: string): TripAssistValues {
  const text = normalizeDigits(raw).replace(/[।,;:]/g, " ").replace(/\s+/g, " ").trim();
  const stops = "party|customer|ग्राहक|पार्टी|origin|from|source|कहाँ से|कहां से|destination|to|delivery|कहाँ तक|कहां तक|material|goods|सामान|मटेरियल|gross weight|gross|कुल वजन|ग्रॉस वजन|tare weight|tare|खाली वजन|टेयर वजन|net weight|net|शुद्ध वजन|rate|रेट|भाव|rst|आरएसटी|truck|vehicle|गाड़ी|driver|ड्राइवर";
  const value = (labels: string) => cleanTextValue(capture(text, [new RegExp(`(?:${labels})\\s+(?:is\\s+|number\\s+|no\\s+)?(.+?)(?=\\s+(?:${stops})\\s+|$)`, "i")]));
  const englishRoute = text.match(new RegExp(`(?:from|origin)\\s+(.+?)\\s+(?:to|destination)\\s+(.+?)(?=\\s+(?:${stops})\\s+|$)`, "i"));
  const hindiRoute = text.match(new RegExp(`(?:origin|कहाँ से|कहां से)\\s+(.+?)\\s+(?:destination|कहाँ तक|कहां तक)\\s+(.+?)(?=\\s+(?:${stops})\\s+|$)`, "i"));
  const gross = weightInTonnes(value("gross weight|gross|कुल वजन|ग्रॉस वजन"));
  const tare = weightInTonnes(value("tare weight|tare|खाली वजन|टेयर वजन"));
  const statedNet = weightInTonnes(value("net weight|net|शुद्ध वजन"));
  const calculatedNet = gross && tare && Number(gross) >= Number(tare) ? String(Number((Number(gross) - Number(tare)).toFixed(3))) : undefined;
  return {
    customer: value("party|customer|ग्राहक|पार्टी"),
    origin: cleanTextValue(englishRoute?.[1] ?? hindiRoute?.[1] ?? value("origin|from|source|कहाँ से|कहां से")),
    destination: cleanTextValue(englishRoute?.[2] ?? hindiRoute?.[2] ?? value("destination|to|delivery|कहाँ तक|कहां तक")),
    material_name: value("material|goods|सामान|मटेरियल"),
    gross_weight: gross,
    tare_weight: tare,
    quantity_tonnes: statedNet ?? calculatedNet,
    rate: numericValue(value("rate|रेट|भाव")),
    rst_number: cleanReference(value("rst|आरएसटी")),
    vehicle: cleanReference(value("truck|vehicle|गाड़ी")),
    driver: value("driver|ड्राइवर"),
  };
}
