// Estimativa de custo da geração de imagens (Gemini), em dólar.
// Preço por imagem de saída, da tabela do Google; a entrada (fotos e texto) custa frações de centavo
// e não entra na conta. É estimativa: o valor final aparece no faturamento do Google Cloud.
export const PRECO_POR_IMAGEM_USD = 0.134; // gemini-3-pro-image, 1K ou 2K

/** Texto curto ("≈ US$ 0.27") e explicação para o title. */
export function textoCusto(qtd: number, precoUsd: number) {
  const total = qtd * precoUsd;
  return {
    curto: `≈ US$ ${total.toFixed(2)}`,
    detalhe: `Estimativa: ${qtd} × US$ ${precoUsd.toFixed(3)} por imagem. O valor final aparece no faturamento do Google.`,
  };
}
