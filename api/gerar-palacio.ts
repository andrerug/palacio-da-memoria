// Função de servidor da Vercel: gera a cena do palácio da memória com o Gemini.
// A GEMINI_API_KEY fica só aqui no servidor e nunca chega ao navegador.
// Só atende quem enviar a senha certa (variável SENHA_APP na Vercel).

import { createHash, timingSafeEqual } from "node:crypto";

// Pro (Nano Banana Pro): o mais preciso para editar foto real mantendo o ambiente. Reserva: Flash novo.
const MODELO_PADRAO = process.env.MODELO_IMAGEM || "gemini-3-pro-image";
const MODELO_RESERVA = "gemini-3.1-flash-image";
const TAMANHO = "2K"; // no Pro, 2K custa o mesmo que 1K
const MAX_CORPO = 4_000_000; // bytes (limite de pedido das funções da Vercel é 4,5 MB)
const MAX_RESPOSTA = 4_200_000; // bytes
const MAX_PROMPT = 12_000;
const MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PROPORCOES = new Set(["21:9", "16:9", "3:2", "4:3", "5:4", "1:1", "4:5", "3:4", "2:3", "9:16"]);

function json(status: number, corpo: Record<string, unknown>): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
const erro = (status: number, codigo: string, mensagem: string) => json(status, { erro: codigo, mensagem });

function senhaConfere(recebida: string, esperada: string): boolean {
  const a = createHash("sha256").update(recebida).digest();
  const b = createHash("sha256").update(esperada).digest();
  return timingSafeEqual(a, b);
}

type Imagem = { mimeType: string; data: string };
function lerImagem(v: any): Imagem | null {
  if (!v || typeof v.data !== "string" || !MIMES.has(String(v.mimeType))) return null;
  if (!/^[A-Za-z0-9+/=]+$/.test(v.data)) return null;
  return { mimeType: String(v.mimeType), data: v.data };
}

export async function POST(request: Request): Promise<Response> {
  const chave = process.env.GEMINI_API_KEY;
  const senhaApp = process.env.SENHA_APP;
  if (!senhaApp) return erro(500, "SEM_SENHA_APP", "O servidor está sem a variável SENHA_APP. Configure na Vercel e refaça o deploy.");
  if (!chave) return erro(500, "SEM_CHAVE", "O servidor está sem a variável GEMINI_API_KEY. Configure na Vercel e refaça o deploy.");

  const senha = request.headers.get("x-senha-app") || "";
  if (!senhaConfere(senha, senhaApp)) return erro(401, "SENHA", "Senha de acesso incorreta.");

  if (Number(request.headers.get("content-length") || 0) > MAX_CORPO) return erro(413, "ENTRADA", "Fotos grandes demais. Use imagens menores.");

  let dados: any;
  try { dados = await request.json(); } catch { return erro(400, "ENTRADA", "Pedido inválido."); }

  const prompt = typeof dados?.prompt === "string" ? dados.prompt.trim() : "";
  const loci = lerImagem(dados?.loci);
  const ref = dados?.ref ? lerImagem(dados.ref) : null;
  if (!prompt || prompt.length > MAX_PROMPT) return erro(400, "ENTRADA", "Descrição vazia ou longa demais.");
  if (!loci) return erro(400, "ENTRADA", "Foto do lugar inválida.");
  if (dados?.ref && !ref) return erro(400, "ENTRADA", "Foto do personagem inválida.");
  const proporcao = PROPORCOES.has(String(dados?.aspectRatio)) ? String(dados.aspectRatio) : null;
  if (loci.data.length + (ref?.data.length || 0) > MAX_CORPO) return erro(413, "ENTRADA", "Fotos grandes demais. Use imagens menores.");

  const partes: any[] = [{ inline_data: { mime_type: loci.mimeType, data: loci.data } }];
  if (ref) partes.push({ inline_data: { mime_type: ref.mimeType, data: ref.data } });
  partes.push({ text: prompt });

  const chamar = (modelo: string, comFormato = true) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
      body: JSON.stringify({
        contents: [{ role: "user", parts: partes }],
        generationConfig: { imageConfig: { imageSize: TAMANHO, ...(proporcao && comFormato ? { aspectRatio: proporcao } : {}) } },
      }),
    });

  try {
    let res = await chamar(MODELO_PADRAO);
    if (res.status === 404 && MODELO_PADRAO !== MODELO_RESERVA) res = await chamar(MODELO_RESERVA);
    // Se o modelo recusar a proporção, tenta sem ela (o navegador recorta no formato da foto depois).
    if (res.status === 400 && proporcao) {
      // Só tenta sem a proporção se o erro for justamente sobre ela.
      const corpoErro = await res.clone().text();
      if (/aspect|image_config|imageConfig/i.test(corpoErro)) {
        res = await chamar(res.url.includes(MODELO_RESERVA) ? MODELO_RESERVA : MODELO_PADRAO, false);
      }
    }

    if (!res.ok) {
      let detalhe = "";
      try { detalhe = (await res.json())?.error?.message || ""; } catch { /* sem JSON */ }
      console.error("Falha no Gemini:", res.status, detalhe.slice(0, 300));
      if (res.status === 400 && /API key/i.test(detalhe)) return erro(502, "CHAVE_INVALIDA", "A chave do Gemini no servidor é inválida. Atualize a GEMINI_API_KEY na Vercel.");
      if (res.status === 403) return erro(502, "CHAVE_INVALIDA", "A chave do servidor não tem permissão para o modelo de imagem. Confira o faturamento no Google.");
      if (res.status === 404) return erro(502, "MODELO", "O modelo de imagem não está disponível para esta chave.");
      if (res.status === 429) return erro(429, "LIMITE", "Limite de uso do Gemini atingido. Aguarde um pouco e tente de novo.");
      if (res.status >= 500) return erro(503, "OCUPADO", "O Gemini está ocupado. Tente de novo em instantes.");
      return erro(502, "FALHA", "Falha ao gerar a imagem.");
    }

    const resposta: any = await res.json();
    const cand = resposta?.candidates?.[0];
    for (const p of cand?.content?.parts || []) {
      const inl = p.inlineData || p.inline_data;
      if (inl?.data) {
        if (inl.data.length > MAX_RESPOSTA) return erro(413, "GRANDE", "A imagem ficou grande demais para o servidor.");
        return json(200, { imagem: `data:${inl.mimeType || inl.mime_type || "image/png"};base64,${inl.data}` });
      }
    }
    if (cand?.finishReason === "SAFETY" || cand?.finishReason === "PROHIBITED_CONTENT") {
      return erro(422, "SEGURANCA", "O Google bloqueou esta cena por segurança. Reescreva a ideia da cena.");
    }
    return erro(502, "SEM_IMAGEM", "O Gemini não devolveu imagem. Tente de novo.");
  } catch (e: any) {
    console.error("Falha no Gemini:", String(e?.message || e).slice(0, 300));
    return erro(502, "FALHA", "Falha ao falar com o Gemini.");
  }
}
