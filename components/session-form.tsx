"use client";

import { FormEvent, useEffect, useState } from "react";
import type { CoachingSession, CoachingSessionInput } from "@/lib/types";

const emptyForm: CoachingSessionInput = {
  session_date: new Date().toISOString().slice(0, 10),
  start_time: "",
  end_time: "",
  client_name: "",
  paid_minutes: 0,
  free_minutes: 0,
  received_coach_the_coach_minutes: 0,
  coaching_format: "1:1 비대면",
  given_coach_the_coach_minutes: 0,
  mentor_coaching_minutes: 0,
  milestone: "",
  notes: "",
};

export function SessionForm({ open, session, onClose, onSave }: {
  open: boolean;
  session: CoachingSession | null;
  onClose: () => void;
  onSave: (input: CoachingSessionInput, id?: string) => Promise<void>;
}) {
  const [form, setForm] = useState<CoachingSessionInput>(emptyForm);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) {
      const { id: _id, user_id: _userId, created_at: _created, updated_at: _updated, ...input } = session;
      setForm(input);
    } else {
      setForm({ ...emptyForm, session_date: new Date().toISOString().slice(0, 10) });
    }
  }, [session, open]);

  if (!open) return null;
  const number = (key: keyof CoachingSessionInput) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: Number(e.target.value || 0) });
  const text = (key: keyof CoachingSessionInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { await onSave(form, session?.id); onClose(); } finally { setBusy(false); }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
        <div className="modal-head"><div><p className="eyebrow">SESSION</p><h2 id="form-title">{session ? "기록 수정" : "새 코칭 기록"}</h2></div><button className="icon-button" onClick={onClose} aria-label="닫기">×</button></div>
        <form className="session-form" onSubmit={submit}>
          <div className="form-grid three"><label>날짜<input type="date" value={form.session_date} onChange={text("session_date")} required /></label><label>시작<input type="time" value={form.start_time} onChange={text("start_time")} required /></label><label>종료<input type="time" value={form.end_time} onChange={text("end_time")} required /></label></div>
          <div className="form-grid two"><label>고객명<input value={form.client_name} onChange={text("client_name")} required placeholder="고객명" /></label><label>코칭 형태<select value={form.coaching_format} onChange={text("coaching_format")}><option>1:1 비대면</option><option>1:1 대면</option><option>그룹 비대면</option><option>그룹 대면</option><option>기타</option></select></label></div>
          <fieldset><legend>인증 시간 (분)</legend><div className="form-grid three"><label>유료<input type="number" min="0" value={form.paid_minutes} onChange={number("paid_minutes")} /></label><label>무료<input type="number" min="0" value={form.free_minutes} onChange={number("free_minutes")} /></label><label>받은 코치더코치<input type="number" min="0" value={form.received_coach_the_coach_minutes} onChange={number("received_coach_the_coach_minutes")} /></label></div></fieldset>
          <fieldset><legend>별도 활동 (분)</legend><div className="form-grid two"><label>진행한 코치더코치<input type="number" min="0" value={form.given_coach_the_coach_minutes} onChange={number("given_coach_the_coach_minutes")} /></label><label>멘토코칭 진행<input type="number" min="0" value={form.mentor_coaching_minutes} onChange={number("mentor_coaching_minutes")} /></label></div></fieldset>
          <div className="form-grid two"><label>마일스톤<input value={form.milestone} onChange={text("milestone")} placeholder="예: KPC, 미래경영자" /></label><label>메모<input value={form.notes} onChange={text("notes")} placeholder="선택 입력" /></label></div>
          <div className="form-actions"><button type="button" className="secondary-button" onClick={onClose}>취소</button><button type="submit" className="primary-button" disabled={busy}>{busy ? "저장 중…" : "저장"}</button></div>
        </form>
      </section>
    </div>
  );
}
