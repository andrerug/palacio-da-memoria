import { useRef, useState } from 'react';
import { ArrowRight, Image as ImageIcon, Lightbulb, Trash2, Type, Upload, TriangleAlert } from 'lucide-react';
import { Img, Mode, Settings, SplitMode } from '../types';
import { sortFiles, splitItems, uid } from '../lib/utils';

interface Props {
  mode: Mode;
  setMode: (m: Mode) => void;
  loci: Img[];
  setLoci: (f: (prev: Img[]) => Img[]) => void;
  settings: Settings;
  patch: (p: Partial<Settings>) => void;
  onNext: () => void;
}

export default function Step1({ mode, setMode, loci, setLoci, settings, patch, onNext }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const dragId = useRef<string | null>(null);

  const texts = splitItems(settings.texts, settings.split);
  const prompts = splitItems(settings.prompts, settings.split);
  const pairCount = Math.min(loci.length, texts.length);
  const gerar = mode === 'gerar';

  const add = (files: File[]) => {
    const imgs = sortFiles(files.filter((f) => f.type.startsWith('image/')));
    if (!imgs.length) return;
    setLoci((prev) => [...prev, ...imgs.map((file) => ({ id: uid(), file, url: URL.createObjectURL(file) }))]);
  };

  const remove = (id: string) =>
    setLoci((prev) => {
      const hit = prev.find((l) => l.id === id);
      if (hit) URL.revokeObjectURL(hit.url);
      return prev.filter((l) => l.id !== id);
    });

  const reorder = (toId: string) => {
    const from = dragId.current;
    dragId.current = null;
    if (!from || from === toId) return;
    setLoci((prev) => {
      const next = prev.slice();
      const a = next.findIndex((l) => l.id === from);
      const b = next.findIndex((l) => l.id === toId);
      if (a < 0 || b < 0) return prev;
      const [moved] = next.splice(a, 1);
      next.splice(b, 0, moved);
      return next;
    });
  };

  const splitBtn = (v: SplitMode, label: string) => (
    <button aria-pressed={settings.split === v} onClick={() => patch({ split: v })}>{label}</button>
  );

  return (
    <>
      <div className="stack fade">
        <div className="page-h">
          <h2>Monte seu lote</h2>
          <p className="sub">Fotos de lugares que você conhece de cor + o que precisa memorizar. O resto é automático.</p>
        </div>

        <div className="modos" role="radiogroup" aria-label="O que você quer fazer">
          <button type="button" role="radio" aria-checked={gerar} className="modo" onClick={() => setMode('gerar')}>
            <span className="modo-marca" aria-hidden="true" />
            <span>
              <b>Gerar as cenas com IA</b>
              <span>Você envia as fotos dos seus cômodos e a IA desenha uma cena absurda em cada uma.</span>
            </span>
          </button>
          <button type="button" role="radio" aria-checked={!gerar} className="modo" onClick={() => setMode('montar')}>
            <span className="modo-marca" aria-hidden="true" />
            <span>
              <b>Só montar o PDF</b>
              <span>Você já tem as imagens prontas. Nada é gerado: cada imagem vira um slide com o texto.</span>
            </span>
          </button>
        </div>

        <div className="card">
          <div className="card-h">
            <div className="ico"><ImageIcon size={20} /></div>
            <div>
              <h2>{gerar ? '1. Fotos dos seus lugares (loci)' : '1. Imagens já prontas'}</h2>
              <p className="sub">
                {gerar
                  ? 'Cômodos, trajetos, a sala da sua casa. Cada foto vira o cenário de um item.'
                  : 'As imagens que você já gerou. Cada uma vira um slide, na ordem do nome do arquivo.'}
              </p>
            </div>
          </div>

          <div
            className={`drop ${over ? 'over' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); add(Array.from(e.dataTransfer.files || [])); }}
          >
            <Upload size={30} />
            <b>Clique para escolher</b>
            <span>ou arraste as imagens até aqui. Elas entram em ordem de nome: foto2 antes de foto10.</span>
            <input
              ref={inputRef} type="file" multiple accept="image/*" className="sr"
              onChange={(e) => { add(Array.from(e.target.files || [])); e.target.value = ''; }}
            />
          </div>

          {loci.length > 0 && (
            <div className="thumbs">
              {loci.map((l, i) => (
                <div
                  key={l.id} className="thumb" draggable title="Arraste para trocar de posição"
                  onDragStart={() => { dragId.current = l.id; }}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
                  onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
                  onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('dragover'); reorder(l.id); }}
                >
                  <img src={l.url} alt="" />
                  <span className="idx">{i + 1}</span>
                  <button className="x" onClick={() => remove(l.id)} aria-label={`Remover a foto ${i + 1}`}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid2">
          <div className="card">
            <div className="card-h">
              <div className="ico"><Type size={20} /></div>
              <div>
                <h2>2. O que memorizar, em lote</h2>
                <p className="sub">Cole todos de uma vez: artigos, súmulas, conceitos. Cada item vira um slide.</p>
              </div>
            </div>
            <div className="seg" style={{ marginBottom: 14 }} role="group" aria-label="Separador">
              {splitBtn('line', 'Um por linha')}
              {splitBtn('blank', 'Linha em branco separa')}
              {splitBtn('dash', '--- separa')}
            </div>
            <textarea
              rows={11} value={settings.texts} onChange={(e) => patch({ texts: e.target.value })}
              placeholder={'Art. 1º A República Federativa do Brasil...\nArt. 2º São Poderes da União...'}
            />
            <p className="tiny" style={{ marginTop: 10 }}>{texts.length} item(ns) detectado(s).</p>
          </div>

          <div className="card">
            <div className="card-h">
              <div className="ico"><Lightbulb size={20} /></div>
              <div>
                <h2>3. Ideias de cena, em lote <span className="muted" style={{ fontWeight: 500 }}>(opcional)</span></h2>
                <p className="sub">Cole todas de uma vez, igual aos textos: uma ideia por linha, na mesma ordem. A ideia nº 1 vai com o texto nº 1. Linha em branco: a IA cria a cena sozinha.</p>
              </div>
            </div>
            <textarea
              rows={11} value={settings.prompts} onChange={(e) => patch({ prompts: e.target.value })}
              placeholder={'Um juiz gigante com martelo de fogo na pia da cozinha...\nTrês poderes brigando dentro do micro-ondas...'}
            />
            <p className="tiny" style={{ marginTop: 10 }}>
              {prompts.length
                ? `${prompts.length} ideia(s) — a nº 1 vai com o texto nº 1, e assim por diante.`
                : 'Nenhuma ideia escrita: a IA cria a cena sozinha a partir do texto.'}
            </p>
          </div>
        </div>

        {loci.length > 0 && texts.length > 0 && loci.length !== texts.length && (
          <div className="note warn">
            <TriangleAlert size={20} style={{ flex: 'none' }} />
            <div>
              <b>{loci.length} imagem(ns) para {texts.length} texto(s).</b>{' '}
              Vou parear {pairCount} e o excedente fica de fora. Ajuste antes de continuar, ou siga e resolva no pareamento.
            </div>
          </div>
        )}
      </div>

      <div className="bar">
        <div className="wrap bar-in">
          <span className="pill accent">{loci.length} imagem(ns)</span>
          <span className="pill">{texts.length} texto(s)</span>
          <span className="pill ok">{pairCount} par(es)</span>
          <span className="spacer" />
          <button className="btn" disabled={!pairCount} onClick={onNext}>
            {gerar ? 'Continuar para o pareamento' : 'Continuar'} <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </>
  );
}
