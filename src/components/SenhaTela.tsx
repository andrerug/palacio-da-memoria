import { useState } from 'react';

interface Props {
  onEntrar: (senha: string) => void;
  erro?: string | null;
}

// Tela de acesso: pede a senha do app (a chave do Gemini fica no servidor).
export default function SenhaTela({ onEntrar, erro }: Props) {
  const [senha, setSenha] = useState('');
  return (
    <div className="center-screen">
      <form
        className="card fade"
        style={{ width: 'min(440px, 100%)' }}
        onSubmit={(e) => { e.preventDefault(); if (senha.trim()) onEntrar(senha.trim()); }}
      >
        <div className="brand" style={{ marginBottom: 22 }}>
          <div className="mark" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" />
            </svg>
          </div>
          <b>Palácio da Memória</b>
        </div>
        <h1 style={{ fontSize: 30, marginBottom: 8 }}>Entrar</h1>
        <p className="muted" style={{ marginBottom: 22 }}>Digite a senha de acesso. Ela fica guardada neste navegador.</p>

        {erro && (
          <div className="note danger" role="alert" style={{ marginBottom: 18 }}>
            <div><b>Não foi possível entrar.</b> {erro}</div>
          </div>
        )}

        <label className="label" htmlFor="senha">Senha de acesso</label>
        <input
          id="senha" type="password" value={senha} autoFocus autoComplete="current-password"
          aria-invalid={!!erro} onChange={(e) => setSenha(e.target.value)}
        />
        <button className="btn block" style={{ marginTop: 20 }} type="submit" disabled={!senha.trim()}>Entrar</button>
      </form>
    </div>
  );
}
