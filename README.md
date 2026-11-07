# Palácio da Memória

Pega fotos de lugares que você já conhece de cor (sua cozinha, o corredor do trabalho), cola nelas cenas
absurdas geradas por IA a partir do que você precisa decorar, e entrega tudo como **PDF de slides** com
tipografia grande, sem serifa e sem texto cortado.

## O que mudou nesta versão

- **Uma cena só, ancorada na letra fria**: o prompt foi reescrito. Antes ele pedia "elementos surreais" no
  plural e a IA enchia o cômodo de símbolos soltos. Agora exige **um único protagonista, uma ação, no máximo
  dois detalhes**, e cada detalhe tem que codificar uma das 1 a 3 palavras que sustentam o sentido do texto
  (verbo do comando, número/prazo, sujeito, exceção) — com trocadilho visual concreto em vez de símbolo
  abstrato. É o que faz a imagem funcionar como gatilho de recuperação da letra do artigo.
- **Design refeito**: tipografia maior em toda a interface, paleta quente, modo escuro automático,
  três etapas com barra de ação fixa.
- **Entrega**: o slide agora é desenhado em canvas (fonte Inter de verdade, acentos corretos). O corpo do
  texto é escolhido automaticamente entre 66 e 26 px — o maior que couber. **Nada é truncado**; a versão
  anterior cortava em 5 linhas com "...".
- **Imagem inteira**: a foto entra por completo (nunca cortada), centralizada, e cresce quando o texto é curto.
- **Separadores de texto**: um item por linha, por linha em branco, ou por `---` — artigos longos com quebras
  internas deixam de virar vários itens.
- **Fila com paralelismo controlado** (1 a 6 por vez) em vez de 50 chamadas simultâneas, com nova tentativa
  automática em erro 429/5xx.
- **Refazer só um item** ou só os que falharam, em vez de repetir o lote inteiro.
- **Prévia do slide** antes de baixar.
- **Modo "já tenho as imagens"**: pula a geração e só monta o PDF a partir de imagens prontas.
- **Ordem natural de arquivos**: `foto2` vem antes de `foto10`.
- **Sem dependências pesadas**: PDF e ZIP são gerados por código próprio (saíram `jspdf`, `jszip`,
  `file-saver`, `@google/genai`, `express`, `better-sqlite3`).

## Acesso e segurança

- O app pede uma **senha de acesso** (variável `SENHA_APP` na Vercel).
- A chave do Gemini (`GEMINI_API_KEY`) fica **só no servidor**, na função `api/gerar-palacio.ts`. Ela nunca vai para o navegador.
- As fotos são reduzidas no navegador (lado maior 1536 px) antes de ir para o servidor, e não ficam guardadas em lugar nenhum.

## Variáveis na Vercel (Settings > Environment Variables)

| Nome | O que é |
| --- | --- |
| `GEMINI_API_KEY` | Chave do Google AI Studio, de projeto com faturamento ativo |
| `SENHA_APP` | Senha de acesso que você escolher |
| `MODELO_IMAGEM` | Opcional. Padrão `gemini-3.1-flash-image`; se der 404, o servidor tenta `gemini-2.5-flash-image` |

Depois de mudar uma variável, faça um novo deploy.

## Rodar localmente

```bash
npm install
npx vercel dev   # a função /api só roda com a CLI da Vercel
```

## Visual

Design system André Viana (`public/av/`): fonte Archivo, tema claro e escuro (botão no topo), foco visível e contraste AA.

## Estrutura

```
src/
  App.tsx              orquestra as 3 etapas e a fila de geração
  components/          Step1, Step2, Step3, diálogos de chave e prévia
  lib/gemini.ts        prompt, senha e chamada à função do servidor
api/gerar-palacio.ts   confere a senha e chama o Gemini (chave só aqui)
  lib/slides.ts        desenho do slide em canvas (layout e tipografia)
  lib/pdf.ts           empacotamento do PDF (1 página = 1 JPEG)
  lib/zip.ts           ZIP sem compressão
  lib/export.ts        botões de exportar PDF/ZIP
  styles.css           sistema de design
```
