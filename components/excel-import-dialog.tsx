"use client";

import { useRef, useState } from "react";
import type { CoachingSessionInput } from "@/lib/types";
import { parseCoachingWorkbook, type ExcelImportResult } from "@/lib/excel";

export function ExcelImportDialog({ open, onClose, onImport }: { open: boolean; onClose: () => void; onImport: (records: CoachingSessionInput[]) => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ExcelImportResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  async function pick(file?: File) {
    if (!file) return;
    setBusy(true); setMessage(""); setResult(null); setFileName(file.name);
    try { setResult(await parseCoachingWorkbook(file)); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Excel 파일을 읽지 못했습니다."); }
    finally { setBusy(false); }
  }

  async function confirm() {
    if (!result?.records.length) return;
    setBusy(true); setMessage("");
    try { await onImport(result.records); onClose(); setResult(null); setFileName(""); }
    catch (error) { setMessage(error instanceof Error ? error.message : "기록을 저장하지 못했습니다."); }
    finally { setBusy(false); }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="modal import-modal" role="dialog" aria-modal="true" aria-labelledby="excel-import-title">
      <div className="modal-head"><div><p className="eyebrow">KSC EXCEL IMPORT</p><h2 id="excel-import-title">기존 코칭일지 가져오기</h2></div><button className="icon-button" onClick={onClose} aria-label="닫기">×</button></div>
      <div className="import-body">
        <div className="import-guide"><strong>한국코치협회 코칭일지 양식을 그대로 선택하세요.</strong><span>‘코칭일지’ 시트의 7~546행을 읽습니다. 같은 날짜·시간·고객 기록은 새 값으로 갱신됩니다.</span></div>
        <input ref={inputRef} className="file-input" type="file" accept=".xlsx,.xls" onChange={(event) => pick(event.target.files?.[0])} />
        <button className="file-picker" onClick={() => inputRef.current?.click()} disabled={busy}><span>⇧</span><strong>{busy ? "파일 확인 중…" : fileName || "Excel 파일 선택"}</strong><small>.xlsx 또는 .xls</small></button>
        {result && <div className="import-summary"><div><strong>{result.records.length.toLocaleString("ko-KR")}</strong><span>가져올 기록</span></div><div><strong>{result.errors.length.toLocaleString("ko-KR")}</strong><span>확인 사항</span></div><div><strong>{result.skipped.toLocaleString("ko-KR")}</strong><span>빈 행</span></div></div>}
        {result?.errors.length ? <details className="import-errors"><summary>확인 사항 보기</summary><ul>{result.errors.slice(0, 30).map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}</ul>{result.errors.length > 30 && <p>외 {result.errors.length - 30}건</p>}</details> : null}
        {message && <p className="form-message">{message}</p>}
        <div className="form-actions"><button className="secondary-button" onClick={onClose}>취소</button><button className="primary-button" onClick={confirm} disabled={busy || !result?.records.length}>{busy ? "저장 중…" : `${result?.records.length ?? 0}개 기록 가져오기`}</button></div>
      </div>
    </section>
  </div>;
}
