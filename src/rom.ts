import md5 from 'md5';

type ROMInfo = {
  title: string;
  caption?: string;
  image?: string;
};

export const romInfoTable: {
  [md5: string]: ROMInfo;
} = {
  '5c9a6664da79a4893895fd0c380fd020': {
    title: 'バトルネットワーク ロックマンエグゼ2',
    caption: 'ロックマンエグゼ2',
  },
  d0b1fadd8bc6f0a7c881bb9604962158: {
    title: 'バトルネットワーク ロックマンエグゼ3 BLACK',
    caption: 'ロックマンエグゼ3 BLACK',
  },
  '73ddea9abd509f650addd4998e86976f': {
    title: 'ロックマンエグゼ4トーナメント ブルームーン',
    caption: 'ロックマンエグゼ4 ブルームーン',
  },
  '504dc19d9f102f1f202ae76decb12998': {
    title: 'ロックマンエグゼ5 チームオブカーネル',
    caption: 'ロックマンエグゼ5 カーネル',
  },
  '053cf73404dcc39be7cbd77c8e833150': {
    title: 'ロックマンエグゼ6 電脳獣グレイガ',
  },
  '0e3ed3a6cc2f201897c58cb31d43a35f': {
    title: 'ロックマンエグゼ6 電脳獣ファルザー',
  },
  '084f1e457749cdec86183189bd88ce69': {
    title: 'TETRIS',
  },
  '4c44844f8d5aa3305a0cf2c95cf96333': {
    title: 'ポケットモンスター 赤',
    caption: 'ポケモン 赤',
  },
  '85be569fe89f58c40f60480313314c67': {
    title: 'ポケットモンスター 金',
    caption: 'ポケモン 金',
  },
  '9c3ae66bffb28ea8ed2896822da02992': {
    title: 'ポケットモンスター クリスタル',
    caption: 'ポケモン クリスタル',
  },
  '5de4f04f745c1ab89f08f74f63760991': {
    title: 'Pokémon Prism 0.94.0235',
  },
  '47596db5a16556c60027e7bf372ec917': {
    title: 'ポケットモンスター ファイアレッド',
    caption: 'ポケモン ファイアレッド',
  },
  fc6a66c32b91fa0e526ae7782f29e86a: {
    title: 'ドラゴンクエストモンスターズ キャラバンハート',
    caption: 'ドラクエ キャラバンハート',
  },
  f41e36204356974c94fabf7d144dd32a: {
    title: 'MOTHER 1+2',
  },
  '9f1c1202ed1d856c5836cee6818a171e': {
    title: 'ボクらの太陽',
  },
} as const;

export const fetchROMInfo = (raw: ArrayBufferLike): ROMInfo => {
  const md5Hash = md5(new Uint8Array(raw));
  const romInfo = romInfoTable[md5Hash];
  if (romInfo) return romInfo;

  return {
    title: parseROMTitle(raw),
  };
};

const parseROMTitle = (raw: ArrayBufferLike): string => {
  const titleBin = raw.slice(0xa0, 0xa0 + 12);

  return new TextDecoder().decode(titleBin);
};
