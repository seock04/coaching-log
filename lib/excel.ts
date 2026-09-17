import * as XLSX from "xlsx";
import type { CoachingSessionInput } from "./types";

export type ExcelImportResult = {
  records: CoachingSessionInput[];
  errors: string[];
  skipped: number;
};

function excelDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    return parsed ? `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}` : null;
  }
  const text = String(value ?? "").trim().replaceAll(/[./]/g, "-");
  const match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  return match ? `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}` : null;
}

function minutes(value: unknown): number {
  const number = Number(String(value ?? "").replaceAll(",", "").trim());
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

function timeRange(value: unknown): [string, string] | null {
  const text = String(value ?? "").trim().replaceAll(/[–—~～]/g, "-").replaceAll(/\s/g, "");
  const match = text.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const startHour = Number(match[1]);
  const endHour = Number(match[3]);
  if (startHour > 23 || endHour > 24 || Number(match[2]) > 59 || Number(match[4]) > 59 || (endHour === 24 && match[4] !== "00")) return null;
  return [`${match[1].padStart(2, "0")}:${match[2]}`, `${match[3].padStart(2, "0")}:${match[4]}`];
}

export async function parseCoachingWorkbook(file: File): Promise<ExcelImportResult> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const sheet = workbook.Sheets["코칭일지"];
  if (!sheet) throw new Error("'코칭일지' 시트를 찾을 수 없습니다. 한국코치협회 양식인지 확인해 주세요.");
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });
  const records = new Map<string, CoachingSessionInput>();
  const errors: string[] = [];
  let skipped = 0;

  for (let rowNumber = 7; rowNumber <= Math.min(546, rows.length); rowNumber += 1) {
    const row = rows[rowNumber - 1] ?? [];
    if (row.slice(0, 10).every((value) => value === null || String(value).trim() === "")) { skipped += 1; continue; }
    const date = excelDate(row[0]);
    const times = timeRange(row[1]);
    const client = String(row[2] ?? "").trim();
    if (!date || !times || !client) {
      errors.push(`${rowNumber}행: 날짜, 시간 또는 고객명을 확인해 주세요.`);
      continue;
    }
    const record: CoachingSessionInput = {
      session_date: date,
      start_time: times[0],
      end_time: times[1],
      client_name: client,
      paid_minutes: minutes(row[3]),
      free_minutes: minutes(row[4]),
      received_coach_the_coach_minutes: minutes(row[5]),
      coaching_format: String(row[6] ?? "").trim(),
      given_coach_the_coach_minutes: minutes(row[7]),
      mentor_coaching_minutes: minutes(row[8]),
      milestone: String(row[9] ?? "").trim(),
      notes: "",
    };
    const key = `${record.session_date}|${record.start_time}|${record.end_time}|${record.client_name}`;
    if (records.has(key)) errors.push(`${rowNumber}행: 파일 안의 중복 기록으로 마지막 값을 사용합니다.`);
    records.set(key, record);
  }
  return { records: [...records.values()], errors, skipped };
}
