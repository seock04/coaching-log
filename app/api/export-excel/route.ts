import { readFile } from "node:fs/promises";
import path from "node:path";
import XlsxPopulate from "xlsx-populate";
import type { CoachingSession } from "@/lib/types";

export const runtime = "nodejs";

function totalMinutes(session: CoachingSession) { return session.paid_minutes + session.free_minutes + session.received_coach_the_coach_minutes; }
function hoursMinutes(minutes: number) { return `${Math.floor(minutes / 60)} 시간   ${minutes % 60} 분`; }

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { sessions?: CoachingSession[]; applicantName?: string } | null;
  const sessions = body?.sessions?.slice().sort((a, b) => `${a.session_date} ${a.start_time}`.localeCompare(`${b.session_date} ${b.start_time}`)) ?? [];
  if (sessions.length > 540) return Response.json({ error: "협회 양식에는 최대 540개 기록만 저장할 수 있습니다." }, { status: 400 });
  const template = await readFile(path.join(process.cwd(), "public", "templates", "ksc-coaching-log-template.xlsx"));
  const workbook = await XlsxPopulate.fromDataAsync(template);
  const sheet = workbook.sheet("코칭일지");
  sheet.range("A7:J546").clear({ contentsOnly: true });
  sheet.cell("A4").value(`응시자 명: ${String(body?.applicantName ?? "").trim()}`.trim());
  sessions.forEach((session, index) => {
    const row = index + 7;
    sheet.cell(`A${row}`).value(new Date(`${session.session_date}T00:00:00`));
    sheet.cell(`B${row}`).value(`${session.start_time.slice(0, 5)}-${session.end_time.slice(0, 5)}`);
    sheet.cell(`C${row}`).value(session.client_name);
    sheet.cell(`D${row}`).value(session.paid_minutes || undefined);
    sheet.cell(`E${row}`).value(session.free_minutes || undefined);
    sheet.cell(`F${row}`).value(session.received_coach_the_coach_minutes || undefined);
    sheet.cell(`G${row}`).value(session.coaching_format);
    sheet.cell(`H${row}`).value(session.given_coach_the_coach_minutes || undefined);
    sheet.cell(`I${row}`).value(session.mentor_coaching_minutes || undefined);
    sheet.cell(`J${row}`).value(session.milestone);
  });
  sheet.cell("D547").formula("SUM(D7:D546)");
  sheet.cell("E547").formula("SUM(E7:E546)");
  sheet.cell("F547").formula("SUM(F7:F546)");
  sheet.cell("H547").formula("SUM(H7:H546)");
  sheet.cell("I547").formula("SUM(I7:I546)");
  sheet.cell("I553").formula('COUNTIF(H7:H546, ">0")');
  sheet.cell("I554").formula('COUNTIF(I7:I546, ">0")');
  const paid = sessions.reduce((sum, item) => sum + item.paid_minutes, 0);
  const free = sessions.reduce((sum, item) => sum + item.free_minutes + item.received_coach_the_coach_minutes, 0);
  const grand = sessions.reduce((sum, item) => sum + totalMinutes(item), 0);
  sheet.cell("G547").value(`총 유료코칭 시간: ${hoursMinutes(paid)}\n총 무료코칭 시간: ${hoursMinutes(free)}\n\n총 시간 합계:      ${hoursMinutes(grand)}`);
  const output = await workbook.outputAsync();
  return new Response(output, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`코칭일지(KSC)_${new Date().toISOString().slice(0, 10)}.xlsx`)}`, "Cache-Control": "no-store" } });
}
