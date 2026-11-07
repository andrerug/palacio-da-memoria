import { Pair, Settings, StyleKey } from '../types';

export const STYLES: Record<StyleKey, { label: string; hint: string }> = {
  foto:   { label: 'Fotorrealista',        hint: 'Mantenha aparência de fotografia real, luz e textura coerentes com a foto original.' },
  ilus:   { label: 'Ilustração vibrante',  hint: 'Transforme a cena em ilustração digital vibrante, cores saturadas e contornos nítidos, mantendo o enquadramento.' },
  cartum: { label: 'Cartum exagerado',     hint: 'Use estética de cartum exagerado, proporções absurdas e expressões cômicas, mantendo o enquadramento.' },
  noir:   { label: 'Sombrio dramático',    hint: 'Use clima sombrio e dramático, contraste alto e névoa, mantendo o enquadramento.' },
};

export const DEFAULT_MODEL = 'gemini-3.1-flash-image';

/** A chave do Gemini fica só no servidor (api/gerar-palacio.ts). */
export const injectedKey = '';

/* Todo este prompt existe para evitar o erro clássico: encher o cômodo de símbolos soltos.
   Uma cena, um protagonista, cada traço ancorado numa palavra da letra fria da lei. */
const REGRA_UMA_CENA =
`REGRA DE OURO — UMA CENA SÓ, NUNCA UMA COLAGEM:
• Insira UM único protagonista (uma figura, criatura ou objeto) executando UMA ação clara, em UM ponto do ambiente.
• No máximo 2 detalhes de apoio, e apenas se cada um codificar uma palavra-chave específica do texto.
• É proibido: espalhar objetos pelo cômodo, repetir o mesmo símbolo em vários lugares, encher a cena de elementos
  decorativos, criar várias mini-cenas na mesma imagem. Menos elementos e mais absurdo é sempre melhor.
• A imagem tem um único foco visual imediato: quem bate o olho entende a cena inteira em um segundo.`;

const REGRA_ANCORA =
`COMO ANCORAR NA LETRA FRIA DA LEI:
1. Leia o texto e escolha de 1 a 3 palavras que sustentam o sentido — o verbo do comando (poderá, deverá, é vedado),
   o sujeito, números e prazos, a exceção.
2. Transforme cada uma dessas palavras num traço visual concreto e exagerado do protagonista ou da ação. Prefira
   sempre o trocadilho visual e o objeto concreto ao símbolo abstrato (ex.: "prazo de 5 dias" → cinco relógios
   derretendo na mão dele; "é vedado" → um cadeado gigante lacrando a boca; "servidor público" → um garçom de
   gravata servindo uma bandeja).
3. Exagere escala, cor e emoção: absurdo, cômico ou perturbador. Cena banal ou meramente decorativa não serve.
4. A cena é um gatilho de recuperação: olhando para ela, a pessoa precisa conseguir voltar às palavras exatas do
   texto. Não invente nenhum elemento que não corresponda a algo do texto.`;

const REGRA_AMBIENTE =
`PRESERVE O AMBIENTE: mantenha rigorosamente a estrutura, o enquadramento, a perspectiva, os móveis e a iluminação da
foto original. A familiaridade com o local é o que faz a técnica funcionar. O protagonista interage fisicamente com o
cenário real (apoiado, encostado, projetando sombra no lugar certo), como se sempre tivesse estado ali.`;

export function buildPrompt(pair: Pair, s: Settings): string {
  const style = STYLES[s.style]?.hint || '';
  const noText = s.noText
    ? 'Não escreva palavras, letras, números nem legendas dentro da imagem: a cena precisa ser lembrada pelo símbolo visual.'
    : '';
  const idea = pair.prompt && pair.prompt.trim()
    ? `PONTO DE PARTIDA DO USUÁRIO: "${pair.prompt.trim()}". Use como base, mas obedeça à regra de uma cena só.`
    : '';
  const ref = pair.ref
    ? 'A segunda imagem enviada é o protagonista da cena: use aquele personagem/objeto como figura central, e nenhuma outra.'
    : '';
  return [
    'TAREFA: editar esta foto de um ambiente real para criar UMA ÚNICA imagem-gatilho de memorização.',
    REGRA_UMA_CENA,
    REGRA_ANCORA,
    REGRA_AMBIENTE,
    `TEXTO A MEMORIZAR (letra fria da lei):\n"${pair.text}"`,
    idea, ref, style, noText,
  ].filter(Boolean).join('\n\n');
}

interface ApiError extends Error { retryable?: boolean; codigo?: string }

// ---- Senha de acesso (a chave do Gemini fica no servidor, em api/gerar-palacio.ts)
const CHAVE_SENHA = 'senha-palacio';
export const getSenha = (): string => { try { return localStorage.getItem(CHAVE_SENHA) || ''; } catch { return ''; } };
export const setSenha = (v: string) => { try { localStorage.setItem(CHAVE_SENHA, v); } catch { /* sem armazenamento */ } };
export const limparSenha = () => { try { localStorage.removeItem(CHAVE_SENHA); } catch { /* idem */ } };

/** Reduz a foto no navegador (lado maior 1536 px, JPEG) para caber no limite do servidor. */
async function reduzir(file: File, lado = 1536): Promise<{ mimeType: string; data: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => falha(new Error('Não foi possível ler uma das fotos.'));
      i.src = url;
    });
    const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * escala);
    c.height = Math.round(img.naturalHeight * escala);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return { mimeType: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.86).split(',')[1] };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Pede a cena ao servidor (que confere a senha e chama o Gemini) e devolve um data: URL. */
export async function generateMemoryImage(pair: Pair, s: Settings): Promise<string> {
  const corpo = {
    prompt: buildPrompt(pair, s),
    loci: await reduzir(pair.loci.file),
    ref: pair.ref ? await reduzir(pair.ref.file, 1024) : undefined,
  };

  let res: Response;
  try {
    res = await fetch('/api/gerar-palacio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-senha-app': getSenha() },
      body: JSON.stringify(corpo),
    });
  } catch {
    throw new Error('Sem conexão com o servidor. Verifique a internet.');
  }

  let dados: any = null;
  try { dados = await res.json(); } catch { /* sem JSON */ }
  if (res.ok && dados?.imagem) return dados.imagem;

  const codigo = dados?.erro || `HTTP_${res.status}`;
  const msg = dados?.mensagem || `Falha no servidor (${res.status}).`;
  const e = Object.assign(new Error(msg) as ApiError, { codigo, retryable: codigo === 'LIMITE' || codigo === 'OCUPADO' });
  throw e;
}
