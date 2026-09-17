"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthPanel } from "./auth-panel";
import { SessionForm } from "./session-form";
import { ExcelImportDialog } from "./excel-import-dialog";
import { demoSessions } from "@/lib/demo-data";
import type { CoachingSession, CoachingSessionInput } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

function duration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours.toLocaleString("ko-KR")}시간${rest ? ` ${rest}분` : ""}`;
}

function csvCell(value: string | number) { return `"${String(value).replaceAll('"', '""')}"`; }

export function CoachingDashboard({ configured }: { configured: boolean }) {
  const [auth, setAuth] = useState<Session | null | undefined>(configured ? undefined : null);
  const [sessions, setSessions] = useState<CoachingSession[]>(configured ? [] : demoSessions);
  const [loading, setLoading] = useState(configured);
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("전체");
  const [category, setCategory] = useState("전체");
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<CoachingSession | null>(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    if (!configured) return;
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("coaching_sessions").select("*").order("session_date", { ascending: false }).order("start_time", { ascending: false });
    if (error) setToast(error.message); else setSessions((data ?? []) as CoachingSession[]);
    setLoading(false);
  }, [configured]);

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => { setAuth(data.session); if (data.session) load(); else setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setAuth(session); if (session) load(); });
    return () => listener.subscription.unsubscribe();
  }, [configured, load]);

  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(""), 3500); return () => clearTimeout(id); }, [toast]);

  const years = useMemo(() => Array.from(new Set(sessions.map((s) => s.session_date.slice(0, 4)))).sort().reverse(), [sessions]);
  const filtered = useMemo(() => sessions.filter((s) => {
    const search = `${s.client_name} ${s.coaching_format} ${s.milestone} ${s.notes}`.toLowerCase();
    const minuteCategory = category === "유료" ? s.paid_minutes > 0 : category === "무료" ? s.free_minutes > 0 : category === "코치더코치" ? s.received_coach_the_coach_minutes > 0 || s.given_coach_the_coach_minutes > 0 : category === "멘토코칭" ? s.mentor_coaching_minutes > 0 : true;
    return (year === "전체" || s.session_date.startsWith(year)) && minuteCategory && search.includes(query.toLowerCase());
  }), [sessions, year, category, query]);

  const totals = useMemo(() => filtered.reduce((a, s) => ({
    paid: a.paid + s.paid_minutes,
    free: a.free + s.free_minutes,
    received: a.received + s.received_coach_the_coach_minutes,
    given: a.given + s.given_coach_the_coach_minutes,
    mentor: a.mentor + s.mentor_coaching_minutes,
  }), { paid: 0, free: 0, received: 0, given: 0, mentor: 0 }), [filtered]);
  const total = totals.paid + totals.free + totals.received;
  const clientCount = new Set(filtered.map((s) => s.client_name)).size;
  const paidRatio = total ? Math.round((totals.paid / total) * 100) : 0;

  async function save(input: CoachingSessionInput, id?: string) {
    if (!configured) {
      if (id) setSessions((old) => old.map((s) => s.id === id ? { ...s, ...input } : s));
      else setSessions((old) => [{ id: crypto.randomUUID(), ...input }, ...old]);
      setToast("데모 기록을 저장했습니다. Supabase 연결 전에는 새로고침 시 초기화됩니다.");
      return;
    }
    const supabase = createClient();
    const { error } = id ? await supabase.from("coaching_sessions").update(input).eq("id", id) : await supabase.from("coaching_sessions").insert(input);
    if (error) { setToast(error.message); throw error; }
    setToast(id ? "기록을 수정했습니다." : "새 기록을 추가했습니다.");
    await load();
  }

  async function remove(session: CoachingSession) {
    if (!window.confirm(`${session.client_name}님의 ${session.session_date} 기록을 삭제할까요?`)) return;
    if (!configured) setSessions((old) => old.filter((s) => s.id !== session.id));
    else {
      const { error } = await createClient().from("coaching_sessions").delete().eq("id", session.id);
      if (error) return setToast(error.message);
      await load();
    }
    setToast("기록을 삭제했습니다.");
  }

  async function importExcel(records: CoachingSessionInput[]) {
    if (!configured) {
      const incoming = records.map((record) => ({ id: crypto.randomUUID(), ...record }));
      setSessions((old) => {
        const merged = new Map(old.map((item) => [`${item.session_date}|${item.start_time.slice(0, 5)}|${item.end_time.slice(0, 5)}|${item.client_name}`, item]));
        incoming.forEach((item) => merged.set(`${item.session_date}|${item.start_time}|${item.end_time}|${item.client_name}`, item));
        return [...merged.values()];
      });
      setToast(`${records.length.toLocaleString("ko-KR")}개 기록을 데모 화면에 가져왔습니다.`);
      return;
    }
    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw userError ?? new Error("로그인이 필요합니다.");
    for (let index = 0; index < records.length; index += 100) {
      const chunk = records.slice(index, index + 100).map((record) => ({ ...record, user_id: userData.user.id }));
      const { error } = await supabase.from("coaching_sessions").upsert(chunk, { onConflict: "user_id,session_date,start_time,end_time,client_name" });
      if (error) throw error;
    }
    await load();
    setToast(`${records.length.toLocaleString("ko-KR")}개 기록을 가져왔습니다. 중복 기록은 갱신했습니다.`);
  }

  async function exportExcel() {
    const savedName = window.localStorage.getItem("coaching-log-applicant-name") ?? "";
    const applicantName = window.prompt("협회 양식에 표시할 응시자 명을 입력해 주세요.", savedName);
    if (applicantName === null) return;
    window.localStorage.setItem("coaching-log-applicant-name", applicantName.trim());
    setToast("한국코치협회 Excel 양식을 만드는 중입니다.");
    const response = await fetch("/api/export-excel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessions: filtered, applicantName }) });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Excel 파일을 만들지 못했습니다." }));
      setToast(error.error);
      return;
    }
    const link = document.createElement("a");
    link.href = URL.createObjectURL(await response.blob());
    link.download = `코칭일지(KSC)_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click(); URL.revokeObjectURL(link.href);
    setToast(`${filtered.length.toLocaleString("ko-KR")}개 기록을 협회 양식으로 내보냈습니다.`);
  }

  function exportCsv() {
    const headers = ["날짜", "시작", "종료", "고객명", "유료(분)", "무료(분)", "받은 코치더코치(분)", "코칭형태", "진행한 코치더코치(분)", "멘토코칭(분)", "마일스톤", "메모"];
    const rows = filtered.map((s) => [s.session_date, s.start_time, s.end_time, s.client_name, s.paid_minutes, s.free_minutes, s.received_coach_the_coach_minutes, s.coaching_format, s.given_coach_the_coach_minutes, s.mentor_coaching_minutes, s.milestone, s.notes]);
    const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}`;
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); link.download = `코칭일지_${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
  }

  if (configured && auth === undefined) return <main className="loading-screen">코칭 일지를 불러오는 중…</main>;
  if (configured && !auth) return <AuthPanel />;

  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <div className="logo-row"><div className="brand-mark small">C</div><div><strong>코칭 일지</strong><span>COACHING LOG</span></div></div>
        <nav><button className="nav-item active"><span>◫</span>대시보드</button><button className="nav-item" onClick={() => { setEditing(null); setFormOpen(true); }}><span>＋</span>새 기록</button><button className="nav-item" onClick={() => setImportOpen(true)}><span>⇧</span>Excel 가져오기</button><button className="nav-item" onClick={exportExcel}><span>⇩</span>Excel로 내보내기</button><button className="nav-item" onClick={exportCsv}><span>↧</span>CSV 내보내기</button></nav>
        <div className="sidebar-bottom"><div className="privacy-note"><strong>나만의 기록 공간</strong><span>{configured ? "Supabase RLS로 보호됩니다." : "현재는 데모 모드입니다."}</span></div>{configured && <button className="nav-item" onClick={async () => { await createClient().auth.signOut(); window.location.reload(); }}><span>↪</span>로그아웃</button>}</div>
      </aside>

      <section className="workspace">
        <header className="topbar"><div><p className="eyebrow">MY PRACTICE</p><h1>코칭 기록 대시보드</h1><p className="muted">세션과 인증 시간을 한눈에 확인하세요.</p></div><div className="header-actions"><button className="secondary-button" onClick={() => setImportOpen(true)}>Excel 가져오기</button><button className="secondary-button" onClick={exportExcel}>Excel로 내보내기</button><button className="primary-button" onClick={() => { setEditing(null); setFormOpen(true); }}>새 코칭 기록</button></div></header>
        {!configured && <div className="demo-banner"><strong>데모 모드</strong><span>화면과 입력 기능을 미리 확인할 수 있습니다. Supabase 키를 연결하면 로그인과 영구 저장이 활성화됩니다.</span></div>}

        <section className="metric-grid">
          <article className="metric-card hero-metric"><div><span>총 코칭 시간</span><strong>{duration(total)}</strong><small>{filtered.length.toLocaleString("ko-KR")}회 · 고객 {clientCount.toLocaleString("ko-KR")}명</small></div><div className="ring" style={{ "--ratio": `${paidRatio * 3.6}deg` } as React.CSSProperties}><span>{paidRatio}%<small>유료</small></span></div></article>
          <article className="metric-card"><span>유료 코칭</span><strong>{duration(totals.paid)}</strong><div className="mini-bar"><i style={{ width: `${paidRatio}%` }} /></div><small>총 코칭 시간의 {paidRatio}%</small></article>
          <article className="metric-card"><span>총 무료 코칭</span><strong>{duration(totals.free + totals.received)}</strong><div className="metric-split"><small>일반 무료 {duration(totals.free)}</small><small>받은 코더코 {duration(totals.received)}</small></div></article>
          <article className="metric-card"><span>코칭 지원 활동</span><strong>{duration(totals.given + totals.mentor)}</strong><div className="metric-split"><small>코더코 {duration(totals.given)}</small><small>멘토코칭 {duration(totals.mentor)}</small></div></article>
        </section>

        <section className="data-card">
          <div className="data-head"><div><h2>코칭 기록</h2><p>{filtered.length.toLocaleString("ko-KR")}개의 기록</p></div><div className="filters"><input className="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="고객명, 마일스톤 검색" /><select value={year} onChange={(e) => setYear(e.target.value)}><option>전체</option>{years.map((y) => <option key={y}>{y}</option>)}</select><select value={category} onChange={(e) => setCategory(e.target.value)}><option>전체</option><option>유료</option><option>무료</option><option>코치더코치</option><option>멘토코칭</option></select></div></div>
          <div className="table-wrap"><table><thead><tr><th>날짜</th><th>고객</th><th>시간</th><th>형태</th><th>구분</th><th className="number">인증 시간</th><th>마일스톤</th><th></th></tr></thead><tbody>
            {loading ? <tr><td colSpan={8} className="empty">기록을 불러오는 중…</td></tr> : filtered.length === 0 ? <tr><td colSpan={8} className="empty">조건에 맞는 기록이 없습니다.</td></tr> : filtered.map((s) => {
              const certificationMinutes = s.paid_minutes + s.free_minutes + s.received_coach_the_coach_minutes;
              const kind = s.paid_minutes > 0 ? "유료" : s.free_minutes > 0 ? "무료" : s.received_coach_the_coach_minutes > 0 ? "받은 코더코" : s.given_coach_the_coach_minutes > 0 ? "진행 코더코" : "멘토코칭";
              return <tr key={s.id}><td><strong>{s.session_date.slice(5).replace("-", ".")}</strong><small>{s.session_date.slice(0,4)}</small></td><td><strong>{s.client_name}</strong><small>{s.notes || "메모 없음"}</small></td><td>{s.start_time.slice(0,5)}–{s.end_time.slice(0,5)}</td><td>{s.coaching_format}</td><td><span className={`badge ${kind === "유료" ? "paid" : "free"}`}>{kind}</span></td><td className="number"><strong>{certificationMinutes || s.given_coach_the_coach_minutes || s.mentor_coaching_minutes}분</strong></td><td>{s.milestone || "—"}</td><td><div className="row-actions"><button onClick={() => { setEditing(s); setFormOpen(true); }} aria-label="수정">수정</button><button onClick={() => remove(s)} aria-label="삭제">삭제</button></div></td></tr>;
            })}
          </tbody></table></div>
        </section>
      </section>
      <SessionForm open={formOpen} session={editing} onClose={() => setFormOpen(false)} onSave={save} />
      <ExcelImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={importExcel} />
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
