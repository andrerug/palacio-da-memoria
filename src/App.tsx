import { useEffect, useRef, useState } from 'react';
import { LogOut, Moon, Sun } from 'lucide-react';
import Stepper from './components/Stepper';
import Step1 from './components/Step1';
import Step2 from './components/Step2';
import Step3 from './components/Step3';
import SenhaTela from './components/SenhaTela';
import PreviewDialog from './components/PreviewDialog';
import { Img, Mode, Pair, Settings } from './types';
import { DEFAULT_MODEL, generateMemoryImage, getSenha, limparSenha, setSenha } from './lib/gemini';
import { readyPairs } from './lib/export';
import { sleep, splitItems, uid } from './lib/utils';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey?: () => Promise<boolean>;
      openSelectKey?: () => Promise<void>;
    };
  }
}

const LS = 'palacio-memoria-v2';

const DEFAULTS: Settings = {
  apiKey: '', model: DEFAULT_MODEL, style: 'foto', noText: true, parallel: 3,
  split: 'line', textBand: 'g', deckTitle: '', texts: '', prompts: '',
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(LS);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export default function App() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<Mode>('gerar');
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [loci, setLoci] = useState<Img[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [running, setRunning] = useState(false);
  const [temSenha, setTemSenha] = useState(() => getSenha() !== '');
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [tema, setTema] = useState<string>(() => document.documentElement.dataset.theme || 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    try { localStorage.setItem('tema', tema); } catch { /* sem armazenamento */ }
  }, [tema]);

  const pairsRef = useRef<Pair[]>([]);
  const settingsRef = useRef(settings);
  useEffect(() => { pairsRef.current = pairs; }, [pairs]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify(settings)); } catch { /* modo privado */ }
  }, [settings]);

  // Avisa antes de fechar a aba com trabalho em andamento ou imagens ainda não baixadas.
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (running || pairsRef.current.some((p) => p.status === 'success')) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [running]);

  const patch = (p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p }));

  const go = (n: 1 | 2 | 3) => {
    if (running && n !== 3) return;
    setStep(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const buildPairs = () => {
    const texts = splitItems(settings.texts, settings.split);
    const prompts = splitItems(settings.prompts, settings.split);
    const n = Math.min(loci.length, texts.length);
    setPairs(Array.from({ length: n }, (_, i): Pair => ({
      id: uid(),
      loci: loci[i],
      ref: null,
      text: texts[i],
      prompt: prompts[i] || '',
      status: mode === 'montar' ? 'success' : 'idle',
      imageUrl: mode === 'montar' ? loci[i].url : undefined,
    })));
    go(2);
  };

  /** Fila com limite de paralelismo e uma nova tentativa em erros temporários. */
  const runQueue = async (ids: string[]) => {
    if (!ids.length) return;
    setRunning(true);
    setPairs((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, status: 'idle', error: undefined } : p)));

    const queue = ids.slice();
    const worker = async () => {
      while (queue.length) {
        const id = queue.shift()!;
        const pair = pairsRef.current.find((p) => p.id === id);
        if (!pair) continue;
        setPairs((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'generating', error: undefined } : p)));

        for (let attempt = 0; ; attempt++) {
          try {
            const imageUrl = await generateMemoryImage(pair, settingsRef.current);
            setPairs((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'success', imageUrl } : p)));
            break;
          } catch (e: any) {
            if (e?.codigo === 'SENHA') { limparSenha(); setErroSenha(e.message); setTemSenha(false); queue.length = 0; break; }
            if (e?.retryable && attempt < 2) { await sleep(2500 * (attempt + 1)); continue; }
            const error = e?.message || 'Erro desconhecido';
            setPairs((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'error', error } : p)));
            break;
          }
        }
      }
    };

    const lanes = Math.max(1, Math.min(settingsRef.current.parallel, ids.length));
    await Promise.all(Array.from({ length: lanes }, worker));
    setRunning(false);
  };

  const start = () => {
    go(3);
    if (mode === 'gerar') runQueue(pairs.map((p) => p.id));
  };

  if (!temSenha) {
    return <SenhaTela erro={erroSenha} onEntrar={(s) => { setSenha(s); setErroSenha(null); setTemSenha(true); }} />;
  }

  return (
    <>
      <header className="top">
        <div className="wrap top-in">
          <div className="brand">
            <div className="mark" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" />
              </svg>
            </div>
            <div>
              <b>Palácio da Memória</b>
              <small>Suas fotos + o texto da lei = uma cena por item</small>
            </div>
          </div>

          <Stepper
            step={step}
            canGo={(n) => n === 1 || (n === 2 && pairs.length > 0) || (n === 3 && pairs.some((p) => p.status !== 'idle'))}
            onGo={go}
          />

          <button className="btn sm ghost tema-btn" onClick={() => setTema((t) => (t === 'dark' ? 'light' : 'dark'))} aria-pressed={tema === 'dark'} aria-label={tema === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}>
            {tema === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="btn sm ghost" onClick={() => { limparSenha(); setTemSenha(false); }} aria-label="Sair">
            <LogOut size={16} /> <span className="sair-txt">Sair</span>
          </button>
        </div>
      </header>

      <main>
        <div className="wrap">
          {step === 1 && (
            <Step1
              mode={mode} setMode={setMode} loci={loci} setLoci={setLoci}
              settings={settings} patch={patch} onNext={buildPairs}
            />
          )}
          {step === 2 && (
            <Step2
              mode={mode} pairs={pairs} setPairs={setPairs}
              settings={settings} patch={patch} onBack={() => go(1)} onRun={start}
            />
          )}
          {step === 3 && (
            <Step3
              mode={mode} pairs={pairs} settings={settings} running={running}
              onBack={() => go(2)} onRetry={runQueue} onPreview={() => setPreview(true)}
            />
          )}
        </div>
      </main>


      {preview && readyPairs(pairs).length > 0 && (
        <PreviewDialog
          pairs={readyPairs(pairs)} start={0} deckTitle={settings.deckTitle}
          band={settings.textBand} onClose={() => setPreview(false)}
        />
      )}
    </>
  );
}
