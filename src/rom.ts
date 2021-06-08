import md5 from 'md5';

type ROMInfo = {
  title: string;
  caption?: string;
  hardware?: 'dmg' | 'cgb' | 'agb';
  image?: string;
};

export const romInfoTable: {
  [md5: string]: ROMInfo;
} = {
  '1e35207a805af5bafde2361df6721c60': {
    title: 'バトルネットワーク ロックマンエグゼ',
    caption: 'ロックマンエグゼ',
    hardware: 'agb',
  },
  '5c9a6664da79a4893895fd0c380fd020': {
    title: 'バトルネットワーク ロックマンエグゼ2',
    caption: 'ロックマンエグゼ2',
    hardware: 'agb',
  },
  d0b1fadd8bc6f0a7c881bb9604962158: {
    title: 'バトルネットワーク ロックマンエグゼ3 BLACK',
    caption: 'ロックマンエグゼ3 BLACK',
    hardware: 'agb',
  },
  '73ddea9abd509f650addd4998e86976f': {
    title: 'ロックマンエグゼ4トーナメント ブルームーン',
    caption: 'ロックマンエグゼ4 ブルームーン',
    hardware: 'agb',
  },
  '504dc19d9f102f1f202ae76decb12998': {
    title: 'ロックマンエグゼ5 チームオブカーネル',
    caption: 'ロックマンエグゼ5 カーネル',
    hardware: 'agb',
  },
  '053cf73404dcc39be7cbd77c8e833150': {
    title: 'ロックマンエグゼ6 電脳獣グレイガ',
    hardware: 'agb',
  },
  '0e3ed3a6cc2f201897c58cb31d43a35f': {
    title: 'ロックマンエグゼ6 電脳獣ファルザー',
    hardware: 'agb',
  },
  '084f1e457749cdec86183189bd88ce69': {
    title: 'TETRIS',
    hardware: 'dmg',
  },
  '4c44844f8d5aa3305a0cf2c95cf96333': {
    title: 'ポケットモンスター 赤',
    caption: 'ポケモン 赤',
    hardware: 'dmg',
  },
  '85be569fe89f58c40f60480313314c67': {
    title: 'ポケットモンスター 金',
    caption: 'ポケモン 金',
    hardware: 'cgb',
  },
  '9c3ae66bffb28ea8ed2896822da02992': {
    title: 'ポケットモンスター クリスタル',
    caption: 'ポケモン クリスタル',
    hardware: 'cgb',
  },
  '3d45c1ee9abd5738df46d2bdda8b57dc': {
    title: 'Pokémon Red',
    hardware: 'dmg',
  },
  '50927e843568814f7ed45ec4f944bd8b': {
    title: 'Pokémon Blue',
    hardware: 'dmg',
  },
  a6924ce1f9ad2228e1c6580779b23878: {
    title: 'Pokémon Gold',
    hardware: 'cgb',
  },
  '301899b8087289a6436b0a241fbbb474': {
    title: 'Pokémon Crystal',
    hardware: 'cgb',
  },
  '5de4f04f745c1ab89f08f74f63760991': {
    title: 'Pokémon Prism 0.94.0235',
    hardware: 'cgb',
  },
  '47596db5a16556c60027e7bf372ec917': {
    title: 'ポケットモンスター ファイアレッド',
    caption: 'ポケモン ファイアレッド',
  },
  fc6a66c32b91fa0e526ae7782f29e86a: {
    title: 'ドラゴンクエストモンスターズ キャラバンハート',
    caption: 'ドラクエ キャラバンハート',
    hardware: 'agb',
  },
  f41e36204356974c94fabf7d144dd32a: {
    title: 'MOTHER 1+2',
    hardware: 'agb',
  },
  '9f1c1202ed1d856c5836cee6818a171e': {
    title: 'ボクらの太陽',
    hardware: 'agb',
  },
  b8fb00c59242afc33b1a40d0d2b94ee7: {
    title: 'ファイナルファンタジーV アドバンス',
    caption: 'ファイナルファンタジー5',
    hardware: 'agb',
  },
  '09daf6531ded19b7921367084e439b2f': {
    title: 'ファイナルファンタジーVI アドバンス',
    caption: 'ファイナルファンタジー6',
    hardware: 'agb',
  },
  b6f2c552e3282344a81d8da3cdcb7041: {
    title: 'トルネコの大冒険2アドバンス 不思議のダンジョン',
    caption: 'トルネコ2',
    hardware: 'agb',
  },
  '2e2596c008d47df901394d28f5bd66ec': {
    title: 'ゼルダの伝説 夢をみる島DX',
    hardware: 'cgb',
  },
  '729934ddb7aa39779a456523a81b4a45': {
    title: 'ドラゴンクエストIII そして伝説へ…',
    caption: 'ドラクエ3 GBC',
    hardware: 'cgb',
  },
  d7f63bbb351a95d73d085a58c8e9f449: {
    title: 'マリオテニスGB',
    hardware: 'cgb',
  },
  b7963a68f95d644f8adedb269d29666c: {
    title: '星のカービィ',
    caption: '星のカービィ GB',
    hardware: 'dmg',
  },
  '3627bbd90cb1950892989cadf4519f3b': {
    title: 'jsmolka/gba-tests/arm.gba@a6447c5404c8fc2898ddc51f438271f832083b7e',
    caption: 'gba-tests/arm.gba@a6447c',
    hardware: 'agb',
  },
  b8e0ee5467808a8af7cb15c6e65827e5: {
    title: 'jsmolka/gba-tests/thumb.gba@a6447c5404c8fc2898ddc51f438271f832083b7e',
    caption: 'gba-tests/thumb.gba@a6447c',
    hardware: 'agb',
  },
  '647fcd9daaf525a656e9cd81b791ddb6': {
    title: 'mgba-emu/suite@04ada216ee13c56d786e54636ac980a71d791145',
    caption: 'mgba-emu/suite@04ada2',
    hardware: 'agb',
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

const parseROMTitle = (raw: ArrayBufferLike, isGB?: boolean): string => {
  const titleBin = isGB ? raw.slice(0x134, 0x143) : raw.slice(0xa0, 0xa0 + 12);

  return new TextDecoder().decode(titleBin);
};
