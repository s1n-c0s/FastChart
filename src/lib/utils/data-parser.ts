import type { Datum } from '@/types';

export function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function parseMarkdownTable(md: string, presetColors: string[]) {
  const lines = md
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const isMarkdownTable = lines.some((l) => l.includes("|"));

  if (!isMarkdownTable) {
    // CSV Processing
    const headerLine = lines[0]?.toLowerCase().replace(/\s/g, "") || "";
    const dataLines = lines.slice(1);

    let labelIndex = 0;
    let valueIndex = 1;
    let colorIndexCSV = 2;
    let hasHeader = false;

    if (headerLine.includes("label") && headerLine.includes("value")) {
      const headerParts = headerLine.split(",").map((s) => s.trim());
      labelIndex = headerParts.indexOf("label");
      valueIndex = headerParts.indexOf("value");
      colorIndexCSV = headerParts.indexOf("color");
      hasHeader = true;
    }

    return processCSVLines(
      hasHeader ? dataLines : lines,
      labelIndex,
      valueIndex,
      colorIndexCSV,
      hasHeader,
      presetColors
    );
  }

  // Markdown Table Processing
  return processMarkdownTable(lines, presetColors);
}

function processCSVLines(
  lines: string[],
  labelIndex: number,
  valueIndex: number,
  colorIndexCSV: number,
  hasHeader: boolean,
  presetColors: string[]
): Datum[] {
  let itemCount = 0;
  const result: Datum[] = [];

  lines.forEach((line) => {
    const parts = line.split(",").map((s) => s.trim());

    if (parts.length >= 2) {
      const rawLabel = parts[labelIndex] || "";
      const rawValue = parts[valueIndex] || "";
      const rawColor = parts[colorIndexCSV] || "";

      const label = hasHeader ? rawLabel : parts[0];
      const valueStr = hasHeader ? rawValue : parts[1];
      const colorStr = hasHeader && parts.length > 2 ? rawColor : parts[2] || "";

      const value = Number(valueStr.replace(/["\s,]/g, ""));

      if (isFinite(value)) {
        const color = colorStr || presetColors[itemCount % presetColors.length];

        result.push({
          id: generateId(),
          label: label || `Item ${itemCount + 1}`,
          value: Math.max(0, value),
          color,
        });
        itemCount++;
      }
    }
  });

  return result;
}

function processMarkdownTable(lines: string[], presetColors: string[]): Datum[] {
  let startIdx = 0;
  if (lines.length > 1 && /-\s*-/.test(lines[1])) {
    startIdx = 2;
  } else if (lines.length > 0 && /\|/.test(lines[0])) {
    startIdx = 1;
  }

  let itemCount = 0;
  const result: Datum[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const row = lines[i];
    if (!row.includes("|")) continue;
    const parts = row
      .split("|")
      .map((s) => s.trim())
      .filter(
        (s, idx, arr) =>
          !(idx === 0 && s === "") && !(idx === arr.length - 1 && s === "")
      );
    if (parts.length < 2) continue;

    const valueStr = parts[1] || "0";
    const value = Number(valueStr.replace(/["\s,]/g, ""));

    if (isFinite(value)) {
      const label = parts[0] || `Item ${itemCount + 1}`;
      const colorStr = parts[2] || "";
      const color = colorStr || presetColors[itemCount % presetColors.length];

      result.push({
        id: generateId(),
        label,
        value: Math.max(0, value),
        color,
      });
      itemCount++;
    }
  }

  return result;
}