interface Props {
  step: 1 | 2 | 3;
  canGo: (n: 1 | 2 | 3) => boolean;
  onGo: (n: 1 | 2 | 3) => void;
}

const LABELS = ['Preparar', 'Parear', 'Gerar & entregar'];

export default function Stepper({ step, canGo, onGo }: Props) {
  return (
    <nav className="stepper">
      {LABELS.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const cls = step === n ? 'on' : step > n ? 'done' : '';
        return (
          <div key={label} style={{ display: 'contents' }}>
            {i > 0 && <span className="sep" />}
            <button className={`st ${cls}`} disabled={!canGo(n)} onClick={() => onGo(n)}>
              <span className="n">{n}</span>
              <span className="lbl">{label}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
