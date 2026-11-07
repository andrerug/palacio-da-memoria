import { Pair, Settings, StyleKey } from '../types';

export const STYLES: Record<StyleKey, { label: string; hint: string }> = {
  foto:   { label: 'Fotorrealista',        hint: 'ESTILO DO QUE FOR ACRESCENTADO: fotorrealista, com a mesma luz, sombra, granulação e nitidez da foto original, como se tivesse sido fotografado ali.' },
  ilus:   { label: 'Ilustração vibrante',  hint: 'ESTILO DO QUE FOR ACRESCENTADO: só o protagonista e os detalhes em ilustração digital vibrante, cores saturadas e contornos nítidos. O ambiente continua sendo a foto original, sem nenhum filtro.' },
  cartum: { label: 'Cartum exagerado',     hint: 'ESTILO DO QUE FOR ACRESCENTADO: só o protagonista em estética de cartum exagerado, proporções absurdas e expressão cômica. O ambiente continua sendo a foto original, sem nenhum filtro.' },
  noir:   { label: 'Sombrio dramático',    hint: 'ESTILO DO QUE FOR ACRESCENTADO: só o protagonista com aparência sombria e dramática, expressão intensa e roupas escuras. Não escureça, não enevoe e não mude a luz do ambiente: ele continua sendo a foto original.' },
};

export const DEFAULT_MODEL = 'gemini-3-pro-image';

/** A chave do Gemini fica só no servidor (api/gerar-palacio.ts). */
export const injectedKey = '';

/* Todo este prompt existe para evitar o erro clássico: encher o cômodo de símbolos soltos.
   Uma cena, um protagonista, cada traço ancorado numa palavra da letra fria da lei. */
const REGRA_UMA_CENA =
`REGRA DE OURO — UMA CENA SÓ, NUNCA UMA COLAGEM:
• Insira UM único protagonista (uma figura, criatura ou objeto) executando UMA ação clara, em UM ponto do ambiente.
• O protagonista está SEMPRE EM AÇÃO, no meio do movimento: puxando, empurrando, derramando, arrombando, equilibrando,
  correndo, lacrando, gritando. Nunca só parado, posando, sorrindo para a câmera ou segurando algo sem fazer nada.
• A ação envolve um móvel ou objeto específico do cômodo (a pia, a porta do armário, a geladeira) e, sempre que der,
  representa o verbo do comando da lei (deverá, poderá, é vedado, obedecerá).
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
`REGRA MAIS IMPORTANTE: O FUNDO É INTOCÁVEL.
A foto enviada é um cômodo real que a pessoa conhece de cor. É esse cenário conhecido que faz a memorização funcionar,
então ele tem que voltar IDÊNTICO.
• Mantenha exatamente: paredes, azulejos, piso, teto, móveis, eletrodomésticos, objetos, cores, texturas, posições,
  iluminação, sombras, perspectiva, ângulo da câmera e enquadramento.
• Não remova, não troque, não mova, não limpe, não arrume, não redesenhe, não estilize e não aplique filtro em nada
  do ambiente. Nenhum objeto da foto pode sumir ou mudar de lugar.
• Você só ACRESCENTA: o protagonista e, no máximo, 2 detalhes de apoio. Eles entram no cenário real, apoiados, encostados
  ou interagindo com um móvel, com sombra coerente com a luz que já existe na foto.
• Formato: a imagem final tem no mínimo a mesma proporção e a mesma orientação da foto enviada (foto horizontal volta
  horizontal; vertical volta vertical). Não recorte, não gire e não amplie o ambiente.`;

const REGRA_FICTICIO =
`PERSONAGEM FICTÍCIO: o protagonista é sempre uma figura inventada. Nunca retrate pessoas reais, famosas ou públicas
(juízes, políticos, artistas), nem rostos parecidos com elas. Profissões e cargos aparecem pelo uniforme e pelos objetos.`;

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
    'TAREFA: acrescentar UMA cena-gatilho de memorização a esta foto de um ambiente real, sem alterar o ambiente.',
    REGRA_AMBIENTE,
    REGRA_UMA_CENA,
    REGRA_ANCORA,
    REGRA_FICTICIO,
    `TEXTO A MEMORIZAR (letra fria da lei):\n"${pair.text}"`,
    idea, ref, style, noText,
    'LEMBRETE FINAL: o cômodo da foto volta exatamente como estava, e o protagonista aparece fazendo uma ação, não posando. A única mudança permitida é o que você acrescentou.',
  ].filter(Boolean).join('\n\n');
}

interface ApiError extends Error { retryable?: boolean; codigo?: string }

// ---- Senha de acesso (a chave do Gemini fica no servidor, em api/gerar-palacio.ts)
const CHAVE_SENHA = 'senha-palacio';
export const getSenha = (): string => { try { return localStorage.getItem(CHAVE_SENHA) || ''; } catch { return ''; } };
export const setSenha = (v: string) => { try { localStorage.setItem(CHAVE_SENHA, v); } catch { /* sem armazenamento */ } };
export const limparSenha = () => { try { localStorage.removeItem(CHAVE_SENHA); } catch { /* idem */ } };

/** Reduz a foto no navegador (lado maior 1536 px, JPEG) para caber no limite do servidor.
    Devolve também largura e altura, para a resposta voltar no mesmo formato. */
async function reduzir(file: File, lado = 1536): Promise<{ mimeType: string; data: string; w: number; h: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await carregar(url);
    const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * escala);
    c.height = Math.round(img.naturalHeight * escala);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return { mimeType: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.86).split(',')[1], w: c.width, h: c.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function carregar(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, falha) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => falha(new Error('Não foi possível ler uma das fotos.'));
    i.src = src;
  });
}

/** Proporções que o modelo de imagem aceita. Escolhe a mais próxima da foto. */
const PROPORCOES: [string, number][] = [
  ['21:9', 21 / 9], ['16:9', 16 / 9], ['3:2', 3 / 2], ['4:3', 4 / 3], ['5:4', 5 / 4], ['1:1', 1],
  ['4:5', 4 / 5], ['3:4', 3 / 4], ['2:3', 2 / 3], ['9:16', 9 / 16],
];
export function proporcaoMaisProxima(w: number, h: number): string {
  const r = w / h;
  return PROPORCOES.reduce((melhor, p) => (Math.abs(Math.log(p[1] / r)) < Math.abs(Math.log(melhor[1] / r)) ? p : melhor))[0];
}

/** Pede a cena ao servidor (que confere a senha e chama o Gemini) e devolve um data: URL. */
export async function generateMemoryImage(pair: Pair, s: Settings): Promise<string> {
  const loci = await reduzir(pair.loci.file);
  const ref = pair.ref ? await reduzir(pair.ref.file, 1024) : undefined;
  const corpo = {
    prompt: buildPrompt(pair, s),
    loci: { mimeType: loci.mimeType, data: loci.data },
    ref: ref ? { mimeType: ref.mimeType, data: ref.data } : undefined,
    aspectRatio: proporcaoMaisProxima(loci.w, loci.h),
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
