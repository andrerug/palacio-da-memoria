import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { Pair, TextBand } from '../types';
import { drawSlide, ensureFont } from '../lib/slides';

interface Props {
  pairs: Pair[];      // já filtrados: só os prontos
  start: number;
  deckTitle: string;
  band: TextBand;
  onClose: () => void;
}

export default function PreviewDialog({ pairs, start, deckTitle, band, onClose }: Props) {
  const [i, setI] = useState(Math.min(start, pairs.length - 1));
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      await ensureFont();
      if (!alive || !canvasRef.current) return;
      await drawSlide(canvasRef.current, {
        imageUrl: pairs[i].imageUrl,
        text: pairs[i].text,
        index: i,
        total: pairs.length,
        deckTitle,
        band,
      });
    })();
    return () => { alive = false; };
  }, [i, pairs, deckTitle, band]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI((v) => (v + 1) % pairs.length);
      if (e.key === 'ArrowLeft') setI((v) => (v - 1 + pairs.length) % pairs.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pairs.length, onClose]);

  return (
    <div className="veil" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal wide fade">
        <div className="modal-h">
          <div>
            <h2>Prévia do slide</h2>
            <p className="muted" style={{ fontSize: 15.5, marginTop: 4 }}>É exatamente assim que cada página sai no PDF.</p>
          </div>
          <button className="btn quiet x" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        <canvas ref={canvasRef} className="prev-canvas" />
        <div className="prev-nav">
          <button className="btn ghost sm" onClick={() => setI((v) => (v - 1 + pairs.length) % pairs.length)}>
            <ArrowLeft size={16} /> Anterior
          </button>
          <span className="pill">{i + 1} de {pairs.length}</span>
          <button className="btn ghost sm" onClick={() => setI((v) => (v + 1) % pairs.length)}>
            Próximo <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
