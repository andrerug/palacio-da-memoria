import { useRef } from 'react';
import { ArrowLeft, ArrowRight, GripHorizontal, Lightbulb, Plus, Trash2 } from 'lucide-react';
import { Mode, Pair, Settings, TextBand } from '../types';
import { STYLES } from '../lib/gemini';
import { uid } from '../lib/utils';
import { PRECO_POR_IMAGEM_USD, textoCusto } from '../lib/custo';

interface Props {
  mode: Mode;
  pairs: Pair[];
  setPairs: (f: (prev: Pair[]) => Pair[]) => void;
  settings: Settings;
  patch: (p: Partial<Settings>) => void;
  onBack: () => void;
  onRun: () => void;
}

export default function Step2({ mode, pairs, setPairs, settings, patch, onBack, onRun }: Props) {
  const dragId = useRef<string | null>(null);
  const montar = mode === 'montar';

  /** Troca só a imagem entre dois itens — o texto fica onde está. */
  const swap = (toId: string) => {
    const from = dragId.current;
    dragId.current = null;
    if (!from || from === toId) return;
    setPairs((prev) => {
      const a = prev.findIndex((p) => p.id === from);
      const b = prev.findIndex((p) => p.id === toId);
      if (a < 0 || b < 0) return prev;
      const next = prev.slice();
      next[a] = { ...next[a], loci: prev[b].loci, imageUrl: montar ? prev[b].imageUrl : next[a].imageUrl };
      next[b] = { ...next[b], loci: prev[a].loci, imageUrl: montar ? prev[a].imageUrl : next[b].imageUrl };
      return next;
    });
  };

  const edit = (id: string, p: Partial<Pair>) =>
    setPairs((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const bandBtn = (v: TextBand, label: string) => (
    <button aria-pressed={settings.textBand === v} onClick={() => patch({ textBand: v })}>{label}</button>
  );

  return (
    <>
      <div className="stack fade">
        <div className="page-h">
          <h2>Pareamento</h2>
          <p className="sub">
            {montar
              ? 'Confira qual imagem vai com qual texto. Arraste uma imagem sobre a outra para trocar.'
              : 'Arraste uma imagem sobre a outra para trocar de lugar. Ajuste o texto e a ideia da cena à vontade.'}
          </p>
        </div>

        <div className="card tight">
          <div className="grid2" style={{ gap: 18 }}>
            <div>
              <label className="label" htmlFor="deck">Nome do deck (aparece no rodapé dos slides)</label>
              <input
                id="deck" type="text" placeholder="Ex.: CF/88, direitos fundamentais"
                value={settings.deckTitle} onChange={(e) => patch({ deckTitle: e.target.value })}
              />
            </div>
            <div>
              <span className="label">Tamanho do texto no slide</span>
              <div className="seg">
                {bandBtn('m', 'Grande')}
                {bandBtn('g', 'Maior')}
                {bandBtn('xg', 'Máximo')}
              </div>
            </div>
          </div>

          {!montar && (
            <>
              <div className="grid2" style={{ gap: 18, marginTop: 18 }}>
                <div>
                  <label className="label" htmlFor="style">Estilo das cenas</label>
                  <select id="style" value={settings.style} onChange={(e) => patch({ style: e.target.value as any })}>
                    {Object.entries(STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="par">Imagens em paralelo</label>
                  <select id="par" value={settings.parallel} onChange={(e) => patch({ parallel: Number(e.target.value) })}>
                    {[1, 2, 3, 4, 6].map((v) => <option key={v} value={v}>{v} por vez</option>)}
                  </select>
                </div>
              </div>
              <label className="check" style={{ marginTop: 16 }}>
                <input type="checkbox" checked={settings.noText} onChange={(e) => patch({ noText: e.target.checked })} />
                Pedir para a IA não escrever palavras dentro da imagem (texto gerado costuma sair embaralhado)
              </label>
              <div className="note info" style={{ marginTop: 16 }}>
                <Lightbulb size={20} style={{ flex: 'none' }} />
                <div>
                  Cada item vira <b>uma cena só</b>, com um protagonista único ancorado em 1 a 3 palavras-chave do
                  texto. É isso que faz a imagem virar gatilho da letra fria, em vez de um cômodo cheio de símbolos soltos.
                </div>
              </div>
            </>
          )}
        </div>

        <div className="stack">
          {pairs.map((p, i) => (
            <div className="pair" key={p.id}>
              <div className="num">{i + 1}</div>
              <div className="pair-body">
                <div>
                  <span className="label">{montar ? 'Imagem' : 'Cenário (loci)'}</span>
                  <div
                    className="slot drag" draggable
                    onDragStart={() => { dragId.current = p.id; }}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
                    onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
                    onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('dragover'); swap(p.id); }}
                  >
                    <img src={p.loci.url} alt="" />
                    <div className="hint"><GripHorizontal size={14} /> arraste para trocar</div>
                  </div>

                  {!montar && (
                    <div style={{ marginTop: 14 }}>
                      <span className="label">Personagem/objeto (opcional)</span>
                      {p.ref ? (
                        <div className="slot">
                          <img src={p.ref.url} alt="" />
                          <button
                            className="x" aria-label="Remover"
                            onClick={() => { URL.revokeObjectURL(p.ref!.url); edit(p.id, { ref: null }); }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ) : (
                        <label className="slot-add">
                          <Plus size={22} /> Adicionar foto
                          <input
                            type="file" accept="image/*" className="sr"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) edit(p.id, { ref: { id: uid(), file: f, url: URL.createObjectURL(f) } });
                            }}
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>

                <div className="side-col">
                  <div>
                    <span className="label">Texto do slide</span>
                    <textarea rows={4} value={p.text} onChange={(e) => edit(p.id, { text: e.target.value })} />
                  </div>
                  {!montar && (
                    <div>
                      <span className="label">Ideia da cena (opcional)</span>
                      <textarea
                        rows={2} value={p.prompt} onChange={(e) => edit(p.id, { prompt: e.target.value })}
                        placeholder="Ex.: um juiz gigante com martelo de fogo saindo da geladeira"
                      />
                    </div>
                  )}
                </div>
              </div>

              <button
                className="btn quiet rm" aria-label={`Remover o item ${i + 1}`}
                onClick={() => setPairs((prev) => prev.filter((x) => x.id !== p.id))}
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bar">
        <div className="wrap bar-in">
          <button className="btn ghost" onClick={onBack}><ArrowLeft size={18} /> Voltar</button>
          <span className="pill accent">{pairs.length} par(es)</span>
          <span className="spacer" />
          {!montar && pairs.length > 0 && (
            <span className="custo" title={textoCusto(pairs.length, PRECO_POR_IMAGEM_USD).detalhe}>
              {textoCusto(pairs.length, PRECO_POR_IMAGEM_USD).curto}
            </span>
          )}
          <button className="btn" disabled={!pairs.length} onClick={onRun}>
            {montar ? 'Montar deck' : 'Gerar imagens'} <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </>
  );
}
