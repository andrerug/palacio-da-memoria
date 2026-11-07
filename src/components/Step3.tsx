import { useState } from 'react';
import {
  ArrowLeft, Check, Eye, FileArchive, FileText, Image as ImageIcon, Loader2, RotateCw, TriangleAlert,
} from 'lucide-react';
import { Mode, Pair, Settings } from '../types';
import { exportPdf, exportZip, readyPairs } from '../lib/export';
import { PRECO_POR_IMAGEM_USD, textoCusto } from '../lib/custo';

interface Props {
  mode: Mode;
  pairs: Pair[];
  settings: Settings;
  running: boolean;
  onBack: () => void;
  onRetry: (ids: string[]) => void;
  onPreview: () => void;
}

export default function Step3({ mode, pairs, settings, running, onBack, onRetry, onPreview }: Props) {
  const [pdfAt, setPdfAt] = useState<number | null>(null);

  const total = pairs.length;
  const ok = pairs.filter((p) => p.status === 'success').length;
  const err = pairs.filter((p) => p.status === 'error');
  const ready = readyPairs(pairs).length;

  const statusPill = (p: Pair) => {
    if (p.status === 'generating') return <span className="pill accent"><Loader2 size={14} className="spin" /> gerando…</span>;
    if (p.status === 'success') return <span className="pill ok"><Check size={14} /> pronto</span>;
    if (p.status === 'error') return <span className="pill danger"><TriangleAlert size={14} /> falhou</span>;
    return <span className="pill">na fila</span>;
  };

  const doPdf = async () => {
    setPdfAt(0);
    try {
      await exportPdf(pairs, { deckTitle: settings.deckTitle, band: settings.textBand }, (d) => setPdfAt(d));
    } finally {
      setPdfAt(null);
    }
  };

  return (
    <>
      <div className="stack fade">
        <div className="page-h">
          <h2>Resultados</h2>
          <p className="sub">
            {running
              ? 'Gerando as cenas. Pode deixar essa aba aberta e ir tomar um café.'
              : err.length
                ? 'Terminou, mas alguns itens falharam. Dá para refazer só eles.'
                : 'Tudo pronto. Confira a prévia e baixe o material.'}
          </p>
        </div>

        <div className="card tight">
          <div className="progress"><i style={{ width: `${total ? ((ok + err.length) / total) * 100 : 0}%` }} /></div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <span className="pill ok">{ok} pronta(s)</span>
            {err.length > 0 && <span className="pill danger">{err.length} com erro</span>}
            <span className="pill">{total - ok - err.length} restante(s)</span>
          </div>
        </div>

        {mode === 'montar' && (
          <div className="note warn" role="status">
            <TriangleAlert size={20} style={{ flex: 'none' }} />
            <div>
              <b>Modo "Só montar o PDF": nenhuma imagem foi gerada.</b>{' '}
              Os slides usam as suas fotos como estão. Para a IA desenhar as cenas, volte ao passo 1 e escolha "Gerar as cenas com IA".
            </div>
          </div>
        )}

        {!running && err.length > 0 && (
          <div className="note warn">
            <TriangleAlert size={20} style={{ flex: 'none' }} />
            <div>
              <b>{err.length} item(ns) não geraram.</b>{' '}
              Erros de limite (429) costumam passar tentando de novo com menos imagens em paralelo.
            </div>
          </div>
        )}

        <div className="stack">
          {pairs.map((p, i) => (
            <div className="res" key={p.id}>
              <div className="res-h">
                <span className="n">Item {i + 1}</span>
                {statusPill(p)}
                <span className="spacer" style={{ marginLeft: 'auto' }} />
                {mode === 'gerar' && (
                  <button className="btn quiet sm" disabled={running} onClick={() => onRetry([p.id])}>
                    <RotateCw size={15} /> Refazer <span className="custo-mini">{textoCusto(1, PRECO_POR_IMAGEM_USD).curto}</span>
                  </button>
                )}
              </div>
              <div className="res-b">
                <div className="res-img">
                  {p.status === 'success' && p.imageUrl && <img src={p.imageUrl} alt={`Cena gerada para o item ${i + 1}`} />}
                  {p.status === 'generating' && <div className="skeleton" />}
                  {p.status === 'error' && (
                    <div style={{ padding: 22, textAlign: 'center', color: 'var(--danger)', fontSize: 15 }}>
                      <TriangleAlert size={26} />
                      <div style={{ marginTop: 8 }}>{p.error}</div>
                    </div>
                  )}
                  {p.status === 'idle' && <ImageIcon size={34} color="var(--ink-3)" />}
                </div>
                <div className="res-txt">
                  <span className="label">Texto do slide</span>
                  <p>{p.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bar">
        <div className="wrap bar-in">
          {running
            ? <span className="pill accent"><Loader2 size={14} className="spin" /> gerando {ok + err.length}/{total}</span>
            : <button className="btn ghost" onClick={onBack}><ArrowLeft size={18} /> Voltar</button>}
          {!running && err.length > 0 && (
            <button className="btn ghost" onClick={() => onRetry(err.map((p) => p.id))}>
              <RotateCw size={16} /> Refazer os que falharam
              <span className="custo-mini">{textoCusto(err.length, PRECO_POR_IMAGEM_USD).curto}</span>
            </button>
          )}
          <span className="spacer" />
          <button className="btn ghost" disabled={!ready} onClick={onPreview}><Eye size={18} /> Prévia</button>
          <button className="btn ghost" disabled={!ready} onClick={() => exportZip(pairs, settings.deckTitle)}>
            <FileArchive size={18} /> Imagens (.zip)
          </button>
          <button className="btn" disabled={!ready || pdfAt !== null} onClick={doPdf}>
            {pdfAt === null
              ? <><FileText size={18} /> Baixar PDF de slides</>
              : <><Loader2 size={18} className="spin" /> Montando {pdfAt}/{ready}</>}
          </button>
        </div>
      </div>
    </>
  );
}
