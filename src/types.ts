export type Status = 'idle' | 'generating' | 'success' | 'error';

/** Uma imagem escolhida pelo usuário, com a URL de preview já criada. */
export interface Img {
  id: string;
  file: File;
  url: string;
}

export interface Pair {
  id: string;
  loci: Img;
  ref: Img | null;
  text: string;
  prompt: string;
  status: Status;
  imageUrl?: string;
  error?: string;
}

export type SplitMode = 'line' | 'blank' | 'dash';
export type TextBand = 'm' | 'g' | 'xg';
export type StyleKey = 'foto' | 'ilus' | 'cartum' | 'noir';
export type Mode = 'gerar' | 'montar';

export interface Settings {
  apiKey: string;
  model: string;
  style: StyleKey;
  noText: boolean;
  parallel: number;
  split: SplitMode;
  textBand: TextBand;
  deckTitle: string;
  texts: string;
  prompts: string;
}
