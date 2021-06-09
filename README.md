# WebGBA

Play GBA game on your Web browser!

## Todos

- Improve BIOS high level emulation accuracy
- Fix sound ch1 & ch2 bug
- Responsive
- PWA
- Keymap setting by player
- Support GamePad
- Native support DMG/CGB ROM (using goombacolor now)
- Support NES ROM using PocketNES

## Accuracy

**environment**

```
Runtime: Google chrome(arm64 v91.0.4472.77)
BIOS: HLE
```

| Test             | Result      |
| -- | -- | 
| [gba-tests/arm](https://github.com/jsmolka/gba-tests/tree/a6447c5404c8fc2898ddc51f438271f832083b7e/arm) | 358 |
| [gba-tests/thumb](https://github.com/jsmolka/gba-tests/tree/a6447c5404c8fc2898ddc51f438271f832083b7e/thumb) | 227 |
| [Memory tests](https://github.com/mgba-emu/suite/blob/04ada216ee13c56d786e54636ac980a71d791145/src/memory.c) | 1151/1552 |
| [I/O read tests](https://github.com/mgba-emu/suite/blob/04ada216ee13c56d786e54636ac980a71d791145/src/io-read.c) | 107/123 |
| [Timing tests](https://github.com/mgba-emu/suite/blob/04ada216ee13c56d786e54636ac980a71d791145/src/timing.c) | 420/1660 |
| [Timer count-up tests](https://github.com/mgba-emu/suite/blob/04ada216ee13c56d786e54636ac980a71d791145/src/timers.c) | 344/936 |
| [Timer IRQ tests](https://github.com/mgba-emu/suite/blob/04ada216ee13c56d786e54636ac980a71d791145/src/timer-irq.c) | 8/90 |
| [Shifter tests](https://github.com/mgba-emu/suite/blob/04ada216ee13c56d786e54636ac980a71d791145/src/shifter.c) | 140/140 |
| [Carry tests](https://github.com/mgba-emu/suite/blob/04ada216ee13c56d786e54636ac980a71d791145/src/carry.c) | 93/93 |
| [Multiply long tests](https://github.com/mgba-emu/suite/blob/04ada216ee13c56d786e54636ac980a71d791145/src/multiply-long.c) | 51/72 |
| [BIOS math tests](https://github.com/mgba-emu/suite/blob/04ada216ee13c56d786e54636ac980a71d791145/src/bios-math.c) | 607/625 |
| [DMA tests](https://github.com/mgba-emu/suite/blob/04ada216ee13c56d786e54636ac980a71d791145/src/dma.c) | 964/1256 |
| [Misc. edge case tests](https://github.com/mgba-emu/suite/blob/04ada216ee13c56d786e54636ac980a71d791145/src/misc-edge.c) | 6/10 |

## Credits

- [endrift/gbajs](https://github.com/endrift/gbajs)
- [andychase/gbajs2](https://github.com/andychase/gbajs2) 
- [masterhou/goombacolor](https://github.com/masterhou/goombacolor/tree/82505813da728bfe88902e48096246a61fbccf79)
