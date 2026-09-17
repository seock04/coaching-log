"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (result.error) return setMessage(result.error.message);
    if (mode === "signup" && !result.data.session) {
      setMessage("가입 확인 메일을 보냈습니다. 이메일에서 확인해 주세요.");
      return;
    }
    window.location.reload();
  }

  return (
    <main className="auth-shell">
      <section className="auth-brand">
        <div className="brand-mark">C</div>
        <p className="eyebrow">COACHING LOG</p>
        <h1>코칭의 시간을<br />성장의 기록으로.</h1>
        <p>세션 기록부터 인증 시간 집계까지 한 화면에서 안전하게 관리하세요.</p>
        <div className="auth-proof">
          <span>개인별 비공개 데이터</span>
          <span>자동 시간 집계</span>
          <span>모바일 지원</span>
        </div>
      </section>
      <section className="auth-card">
        <div>
          <p className="eyebrow">WELCOME BACK</p>
          <h2>{mode === "login" ? "로그인" : "계정 만들기"}</h2>
          <p className="muted">코칭 일지는 로그인한 본인만 볼 수 있습니다.</p>
        </div>
        <form onSubmit={submit}>
          <label>이메일<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
          <label>비밀번호<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
          {message && <p className="form-message">{message}</p>}
          <button className="primary-button" type="submit" disabled={busy}>{busy ? "처리 중…" : mode === "login" ? "로그인" : "가입하기"}</button>
        </form>
        <button className="text-button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>
          {mode === "login" ? "처음이신가요? 계정 만들기" : "이미 계정이 있나요? 로그인"}
        </button>
      </section>
    </main>
  );
}
