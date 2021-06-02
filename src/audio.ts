import { ARMCore } from './core';
import { GameBoyAdvance } from './gba';
import { ioAddr } from './io';

export type FrostAudio = {
  nextSample: number;
};

export class GameBoyAdvanceAudio {
  cpu: ARMCore;
  core: GameBoyAdvance;

  context: AudioContext | null;
  bufferSize: number;
  maxSamples: number;
  buffers: [Float32Array, Float32Array];
  sampleMask: number;
  jsAudio: ScriptProcessorNode | null;
  masterEnable: boolean;
  masterVolume: number;
  SOUND_MAX: number;
  FIFO_MAX: number;
  PSG_MAX: number;

  fifoA: number[];
  fifoB: number[];
  fifoASample: number;
  fifoBSample: number;
  enabled: boolean;
  enableChannel3: boolean;
  enableChannel4: boolean;
  enableChannelA: boolean;
  enableChannelB: boolean;
  enableRightChannelA: boolean;
  enableLeftChannelA: boolean;
  enableRightChannelB: boolean;
  enableLeftChannelB: boolean;
  playingChannel3: boolean;
  playingChannel4: boolean;
  volumeLeft: number;
  volumeRight: number;
  ratioChannelA: number;
  ratioChannelB: number;
  enabledLeft: number;
  enabledRight: number;
  dmaA: number;
  dmaB: number;
  soundTimerA: number;
  soundTimerB: number;
  soundRatio: number;
  soundBias: number;
  squareChannels: any[];
  waveData: Uint8Array;
  channel3Dimension: number;
  channel3Bank: number;
  channel3Volume: number;
  channel3Interval: number;
  channel3Next: number;
  channel3Length: number;
  channel3Timed: boolean;
  channel3End: number;
  channel3Pointer: number;
  channel3Sample: number;
  channel3Write: boolean;
  cpuFrequency: number;
  channel4: any;

  nextEvent: number;

  nextSample: number;
  outputPointer: number;
  samplePointer: number;

  backup: number;
  totalSamples: number;

  sampleRate: number;
  sampleInterval: number;
  resampleRatio: number;

  masterVolumeLeft: number;
  masterVolumeRight: number;

  constructor(cpu: ARMCore, core: GameBoyAdvance) {
    this.cpu = cpu;
    this.core = core;

    if (window.AudioContext) {
      this.context = new AudioContext();
      this.bufferSize = 0;
      this.bufferSize = 4096;
      this.maxSamples = this.bufferSize << 2;
      this.buffers = [new Float32Array(this.maxSamples), new Float32Array(this.maxSamples)];
      this.sampleMask = this.maxSamples - 1;
      this.jsAudio = this.context.createScriptProcessor(this.bufferSize);
      this.jsAudio.onaudioprocess = (e) => {
        this.audioProcess(e);
      };
    } else {
      this.bufferSize = 4096;
      this.buffers = [new Float32Array(0), new Float32Array(0)];
      this.context = null;
      this.maxSamples = 0;
      this.sampleMask = 0;
      this.jsAudio = null;
    }

    this.masterEnable = false;
    this.masterVolume = 1.0;

    this.SOUND_MAX = 0x400;
    this.FIFO_MAX = 0x200;
    this.PSG_MAX = 0x080;

    this.fifoA = [];
    this.fifoB = [];
    this.fifoASample = 0;
    this.fifoBSample = 0;

    this.enabled = false;

    this.enableChannel3 = false;
    this.enableChannel4 = false;
    this.enableChannelA = false;
    this.enableChannelB = false;
    this.enableRightChannelA = false;
    this.enableLeftChannelA = false;
    this.enableRightChannelB = false;
    this.enableLeftChannelB = false;

    this.playingChannel3 = false;
    this.playingChannel4 = false;

    this.volumeLeft = 0;
    this.volumeRight = 0;
    this.ratioChannelA = 1;
    this.ratioChannelB = 1;
    this.enabledLeft = 0;
    this.enabledRight = 0;

    this.dmaA = -1;
    this.dmaB = -1;
    this.soundTimerA = 0;
    this.soundTimerB = 0;

    this.soundRatio = 1;
    this.soundBias = 0x200;
    this.squareChannels = [];

    this.waveData = new Uint8Array(32);
    this.channel3Dimension = 0;
    this.channel3Bank = 0;
    this.channel3Volume = 0;
    this.channel3Interval = 0;
    this.channel3Next = 0;
    this.channel3Length = 0;
    this.channel3Timed = false;
    this.channel3End = 0;
    this.channel3Pointer = 0;
    this.channel3Sample = 0;
    this.channel3Write = false;

    this.cpuFrequency = this.core.irq?.FREQUENCY || 0;
    this.channel4 = null;

    this.nextEvent = 0;

    this.nextSample = 0;
    this.outputPointer = 0;
    this.samplePointer = 0;

    this.backup = 0;
    this.totalSamples = 0;

    this.sampleRate = 32768;
    this.sampleInterval = this.cpuFrequency / this.sampleRate;
    this.resampleRatio = 1;
    if (this.context) this.resampleRatio = this.sampleRate / this.context.sampleRate;

    this.masterVolumeLeft = 0;
    this.masterVolumeRight = 0;
  }

  clear() {
    this.fifoA = [];
    this.fifoB = [];
    this.fifoASample = 0;
    this.fifoBSample = 0;

    this.enabled = false;
    if (this.context) {
      try {
        this.jsAudio?.disconnect(this.context.destination);
      } catch (e) {}
    }

    this.enableChannel3 = false;
    this.enableChannel4 = false;
    this.enableChannelA = false;
    this.enableChannelB = false;
    this.enableRightChannelA = false;
    this.enableLeftChannelA = false;
    this.enableRightChannelB = false;
    this.enableLeftChannelB = false;

    this.playingChannel3 = false;
    this.playingChannel4 = false;

    this.volumeLeft = 0;
    this.volumeRight = 0;
    this.ratioChannelA = 1;
    this.ratioChannelB = 1;
    this.enabledLeft = 0;
    this.enabledRight = 0;

    this.dmaA = -1;
    this.dmaB = -1;
    this.soundTimerA = 0;
    this.soundTimerB = 0;

    this.soundRatio = 1;
    this.soundBias = 0x200;

    this.squareChannels = [];
    for (let i = 0; i < 2; ++i) {
      this.squareChannels[i] = {
        enabled: false,
        playing: false,
        sample: 0,
        duty: 0.5,
        increment: 0,
        step: 0,
        initialVolume: 0,
        volume: 0,
        frequency: 0,
        interval: 0,
        sweepSteps: 0,
        sweepIncrement: 0,
        sweepInterval: 0,
        doSweep: false,
        raise: 0,
        lower: 0,
        nextStep: 0,
        timed: false,
        length: 0,
        end: 0,
      };
    }

    this.waveData = new Uint8Array(32);
    this.channel3Dimension = 0;
    this.channel3Bank = 0;
    this.channel3Volume = 0;
    this.channel3Interval = 0;
    this.channel3Next = 0;
    this.channel3Length = 0;
    this.channel3Timed = false;
    this.channel3End = 0;
    this.channel3Pointer = 0;
    this.channel3Sample = 0;

    this.cpuFrequency = this.core.irq.FREQUENCY;

    this.channel4 = {
      sample: 0,
      lfsr: 0,
      width: 15,
      interval: this.cpuFrequency / 524288,
      increment: 0,
      step: 0,
      initialVolume: 0,
      volume: 0,
      nextStep: 0,
      timed: false,
      length: 0,
      end: 0,
    };

    this.nextEvent = 0;

    this.nextSample = 0;
    this.outputPointer = 0;
    this.samplePointer = 0;

    this.backup = 0;
    this.totalSamples = 0;

    this.sampleRate = 32768;
    this.sampleInterval = this.cpuFrequency / this.sampleRate;
    this.resampleRatio = 1;
    if (this.context) this.resampleRatio = this.sampleRate / this.context.sampleRate;

    this.writeSquareChannelFC(0, 0);
    this.writeSquareChannelFC(1, 0);
    this.writeChannel4FC(0);
  }

  freeze(): FrostAudio {
    return {
      nextSample: this.nextSample,
    };
  }

  defrost(frost: FrostAudio) {
    this.nextSample = frost.nextSample;
  }

  pause(paused: boolean) {
    if (this.context) {
      if (paused) {
        try {
          this.jsAudio?.disconnect(this.context.destination);
        } catch (e) {} // Sigh
      } else if (this.enabled) {
        this.jsAudio?.connect(this.context.destination);
      }
    }
  }

  updateTimers() {
    const cycles = this.cpu.cycles;
    if (!this.enabled || (cycles < this.nextEvent && cycles < this.nextSample)) {
      return;
    }

    if (cycles >= this.nextEvent) {
      let channel = this.squareChannels[0];
      this.nextEvent = Infinity;
      if (channel.playing) {
        this.updateSquareChannel(channel, cycles);
      }

      channel = this.squareChannels[1];
      if (channel.playing) {
        this.updateSquareChannel(channel, cycles);
      }

      if (this.enableChannel3 && this.playingChannel3) {
        if (cycles >= this.channel3Next) {
          if (this.channel3Write) {
            const sample = this.waveData[this.channel3Pointer >> 1];
            this.channel3Sample = (((sample >> ((this.channel3Pointer & 1) << 2)) & 0xf) - 0x8) / 8;
            this.channel3Pointer = this.channel3Pointer + 1;
            if (this.channel3Dimension && this.channel3Pointer >= 64) {
              this.channel3Pointer -= 64;
            } else if (!this.channel3Bank && this.channel3Pointer >= 32) {
              this.channel3Pointer -= 32;
            } else if (this.channel3Pointer >= 64) {
              this.channel3Pointer -= 32;
            }
          }
          this.channel3Next += this.channel3Interval;
          if (this.channel3Interval && this.nextEvent > this.channel3Next) {
            this.nextEvent = this.channel3Next;
          }
        }
        if (this.channel3Timed && cycles >= this.channel3End) {
          this.playingChannel3 = false;
        }
      }

      if (this.enableChannel4 && this.playingChannel4) {
        if (this.channel4.timed && cycles >= this.channel4.end) {
          this.playingChannel4 = false;
        } else {
          if (cycles >= this.channel4.next) {
            this.channel4.lfsr >>= 1;
            const sample = this.channel4.lfsr & 1;
            this.channel4.lfsr |=
              (((this.channel4.lfsr >> 1) & 1) ^ sample) << (this.channel4.width - 1);
            this.channel4.next += this.channel4.interval;
            this.channel4.sample = (sample - 0.5) * 2 * this.channel4.volume;
          }
          this.updateEnvelope(this.channel4, cycles);
          if (this.nextEvent > this.channel4.next) {
            this.nextEvent = this.channel4.next;
          }
          if (this.channel4.timed && this.nextEvent > this.channel4.end) {
            this.nextEvent = this.channel4.end;
          }
        }
      }
    }

    if (cycles >= this.nextSample) {
      this.sample();
      this.nextSample += this.sampleInterval;
    }

    this.nextEvent = Math.ceil(this.nextEvent);
    if (this.nextEvent < cycles || this.nextSample < cycles) {
      // STM instructions may take a long time
      this.updateTimers();
    }
  }

  writeEnable(value: number) {
    this.enabled = !!value;
    this.nextEvent = this.cpu.cycles;
    this.nextSample = this.nextEvent;
    this.updateTimers();
    this.core.irq.pollNextEvent();
    if (this.context) {
      if (value) {
        this.jsAudio?.connect(this.context.destination);
      } else {
        try {
          this.jsAudio?.disconnect(this.context.destination);
        } catch (e) {}
      }
    }
  }

  writeSoundControlLo(value: number) {
    this.masterVolumeLeft = value & 0x7;
    this.masterVolumeRight = (value >> 4) & 0x7;
    this.enabledLeft = (value >> 8) & 0xf;
    this.enabledRight = (value >> 12) & 0xf;

    this.setSquareChannelEnabled(
      this.squareChannels[0],
      (this.enabledLeft | this.enabledRight) & 0x1,
    );
    this.setSquareChannelEnabled(
      this.squareChannels[1],
      (this.enabledLeft | this.enabledRight) & 0x2,
    );
    this.enableChannel3 = !!((this.enabledLeft | this.enabledRight) & 0x4);
    this.setChannel4Enabled(!!((this.enabledLeft | this.enabledRight) & 0x8));

    this.updateTimers();
    this.core.irq.pollNextEvent();
  }

  writeSoundControlHi(value: number) {
    switch (value & 0x0003) {
      case 0:
        this.soundRatio = 0.25;
        break;
      case 1:
        this.soundRatio = 0.5;
        break;
      case 2:
        this.soundRatio = 1;
        break;
    }
    this.ratioChannelA = (((value & 0x0004) >> 2) + 1) * 0.5;
    this.ratioChannelB = (((value & 0x0008) >> 3) + 1) * 0.5;

    this.enableRightChannelA = !!(value & 0x0100);
    this.enableLeftChannelA = !!(value & 0x0200);
    this.enableChannelA = !!(value & 0x0300);
    this.soundTimerA = value & 0x0400;
    if (value & 0x0800) {
      this.fifoA = [];
    }
    this.enableRightChannelB = !!(value & 0x1000);
    this.enableLeftChannelB = !!(value & 0x2000);
    this.enableChannelB = !!(value & 0x3000);
    this.soundTimerB = value & 0x4000;
    if (value & 0x8000) this.fifoB = [];
  }

  resetSquareChannel(channel: any) {
    if (channel.step) {
      channel.nextStep = this.cpu.cycles + channel.step;
    }
    if (channel.enabled && !channel.playing) {
      channel.raise = this.cpu.cycles;
      channel.lower = channel.raise + channel.duty * channel.interval;
      channel.end = this.cpu.cycles + channel.length;
      this.nextEvent = this.cpu.cycles;
    }
    channel.playing = channel.enabled;
    this.updateTimers();
    this.core.irq.pollNextEvent();
  }

  setSquareChannelEnabled(channel: any, enable: any) {
    if (!(channel.enabled && channel.playing) && enable) {
      channel.enabled = !!enable;
      this.updateTimers();
      this.core.irq.pollNextEvent();
    } else {
      channel.enabled = !!enable;
    }
  }

  writeSquareChannelSweep(channelId: number, value: number) {
    const channel = this.squareChannels[channelId];
    channel.sweepSteps = value & 0x07;
    channel.sweepIncrement = value & 0x08 ? -1 : 1;
    channel.sweepInterval = (((value >> 4) & 0x7) * this.cpuFrequency) / 128;
    channel.doSweep = !!channel.sweepInterval;
    channel.nextSweep = this.cpu.cycles + channel.sweepInterval;
    this.resetSquareChannel(channel);
  }

  writeSquareChannelDLE(channelId: number, value: number) {
    const channel = this.squareChannels[channelId];
    const duty = (value >> 6) & 0x3;
    switch (duty) {
      case 0:
        channel.duty = 0.125;
        break;
      case 1:
        channel.duty = 0.25;
        break;
      case 2:
        channel.duty = 0.5;
        break;
      case 3:
        channel.duty = 0.75;
        break;
    }
    this.writeChannelLE(channel, value);
    this.resetSquareChannel(channel);
  }

  writeSquareChannelFC(channelId: number, value: number) {
    const channel = this.squareChannels[channelId];
    const frequency = value & 2047;
    channel.frequency = frequency;
    channel.interval = (this.cpuFrequency * (2048 - frequency)) / 131072;
    channel.timed = !!(value & 0x4000);

    if (value & 0x8000) {
      this.resetSquareChannel(channel);
      channel.volume = channel.initialVolume;
    }
  }

  updateSquareChannel(channel: any, cycles: number) {
    if (channel.timed && cycles >= channel.end) {
      channel.playing = false;

      return;
    }

    if (channel.doSweep && cycles >= channel.nextSweep) {
      channel.frequency += channel.sweepIncrement * (channel.frequency >> channel.sweepSteps);
      if (channel.frequency < 0) {
        channel.frequency = 0;
      } else if (channel.frequency > 2047) {
        channel.frequency = 2047;
        channel.playing = false;

        return;
      }
      channel.interval = (this.cpuFrequency * (2048 - channel.frequency)) / 131072;
      channel.nextSweep += channel.sweepInterval;
    }

    if (cycles >= channel.raise) {
      channel.sample = channel.volume;
      channel.lower = channel.raise + channel.duty * channel.interval;
      channel.raise += channel.interval;
    } else if (cycles >= channel.lower) {
      channel.sample = -channel.volume;
      channel.lower += channel.interval;
    }

    this.updateEnvelope(channel, cycles);

    if (this.nextEvent > channel.raise) {
      this.nextEvent = channel.raise;
    }
    if (this.nextEvent > channel.lower) {
      this.nextEvent = channel.lower;
    }
    if (channel.timed && this.nextEvent > channel.end) {
      this.nextEvent = channel.end;
    }
    if (channel.doSweep && this.nextEvent > channel.nextSweep) {
      this.nextEvent = channel.nextSweep;
    }
  }

  writeChannel3Lo(value: number) {
    this.channel3Dimension = value & 0x20;
    this.channel3Bank = value & 0x40;
    const enable = value & 0x80;
    if (!this.channel3Write && enable) {
      this.channel3Write = !!enable;
      this.resetChannel3();
    } else {
      this.channel3Write = !!enable;
    }
  }

  writeChannel3Hi(value: number) {
    this.channel3Length = (this.cpuFrequency * (0x100 - (value & 0xff))) / 256;
    const volume = (value >> 13) & 0x7;
    switch (volume) {
      case 0:
        this.channel3Volume = 0;
        break;
      case 1:
        this.channel3Volume = 1;
        break;
      case 2:
        this.channel3Volume = 0.5;
        break;
      case 3:
        this.channel3Volume = 0.25;
        break;
      default:
        this.channel3Volume = 0.75;
    }
  }

  writeChannel3X(value: number) {
    this.channel3Interval = (this.cpuFrequency * (2048 - (value & 0x7ff))) / 2097152;
    this.channel3Timed = !!(value & 0x4000);
    if (this.channel3Write) this.resetChannel3();
  }

  resetChannel3() {
    this.channel3Next = this.cpu.cycles;
    this.nextEvent = this.channel3Next;
    this.channel3End = this.cpu.cycles + this.channel3Length;
    this.playingChannel3 = this.channel3Write;
    this.updateTimers();
    this.core.irq.pollNextEvent();
  }

  writeWaveData(offset: number, data: number, width: number) {
    if (!this.channel3Bank) offset += 16;
    if (width == 2) {
      this.waveData[offset] = data & 0xff;
      data >>= 8;
      ++offset;
    }
    this.waveData[offset] = data & 0xff;
  }

  setChannel4Enabled(enable: boolean) {
    if (!this.enableChannel4 && enable) {
      this.channel4.next = this.cpu.cycles;
      this.channel4.end = this.cpu.cycles + this.channel4.length;
      this.enableChannel4 = true;
      this.playingChannel4 = true;
      this.nextEvent = this.cpu.cycles;
      this.updateEnvelope(this.channel4, 0);
      this.updateTimers();
      this.core.irq.pollNextEvent();
    } else {
      this.enableChannel4 = enable;
    }
  }

  writeChannel4LE(value: number) {
    this.writeChannelLE(this.channel4, value);
    this.resetChannel4();
  }

  writeChannel4FC(value: number) {
    this.channel4.timed = !!(value & 0x4000);

    let r = value & 0x7;
    if (!r) r = 0.5;

    const s = (value >> 4) & 0xf;
    const interval = (this.cpuFrequency * (r * (2 << s))) / 524288;
    if (interval != this.channel4.interval) {
      this.channel4.interval = interval;
      this.resetChannel4();
    }

    const width = value & 0x8 ? 7 : 15;
    if (width != this.channel4.width) {
      this.channel4.width = width;
      this.resetChannel4();
    }

    if (value & 0x8000) this.resetChannel4();
  }

  resetChannel4() {
    this.channel4.lfsr = this.channel4.width == 15 ? 0x4000 : 0x40;
    this.channel4.volume = this.channel4.initialVolume;
    if (this.channel4.step) {
      this.channel4.nextStep = this.cpu.cycles + this.channel4.step;
    }
    this.channel4.end = this.cpu.cycles + this.channel4.length;
    this.channel4.next = this.cpu.cycles;
    this.nextEvent = this.channel4.next;

    this.playingChannel4 = this.enableChannel4;
    this.updateTimers();
    this.core.irq.pollNextEvent();
  }

  writeChannelLE(channel: any, value: number) {
    channel.length = this.cpuFrequency * ((0x40 - (value & 0x3f)) / 256);
    channel.increment = value & 0x0800 ? 1 / 16 : -1 / 16;
    channel.initialVolume = ((value >> 12) & 0xf) / 16;
    channel.step = this.cpuFrequency * (((value >> 8) & 0x7) / 64);
  }

  updateEnvelope(channel: any, cycles: number) {
    if (channel.step) {
      if (cycles >= channel.nextStep) {
        channel.volume += channel.increment;
        if (channel.volume > 1) {
          channel.volume = 1;
        } else if (channel.volume < 0) {
          channel.volume = 0;
        }
        channel.nextStep += channel.step;
      }
      if (this.nextEvent > channel.nextStep) this.nextEvent = channel.nextStep;
    }
  }

  appendToFifoA(value: number) {
    if (this.fifoA.length > 28) this.fifoA = this.fifoA.slice(-28);
    for (let i = 0; i < 4; ++i) {
      const b = (value & 0xff) << 24;
      value >>= 8;
      this.fifoA.push(b / 0x80000000);
    }
  }

  appendToFifoB(value: number) {
    if (this.fifoB.length > 28) this.fifoB = this.fifoB.slice(-28);
    for (let i = 0; i < 4; ++i) {
      const b = (value & 0xff) << 24;
      value >>= 8;
      this.fifoB.push(b / 0x80000000);
    }
  }

  sampleFifoA() {
    if (this.fifoA.length <= 16) {
      const dma = this.core.irq.dma[this.dmaA];
      dma.nextCount = 4;
      this.core.mmu.serviceDma(this.dmaA, dma);
    }
    this.fifoASample = this.fifoA.shift() as number;
  }

  sampleFifoB() {
    if (this.fifoB.length <= 16) {
      const dma = this.core.irq.dma[this.dmaB];
      dma.nextCount = 4;
      this.core.mmu.serviceDma(this.dmaB, dma);
    }
    this.fifoBSample = this.fifoB.shift() as number;
  }

  scheduleFIFODma(number: number, info: any) {
    switch (info.dest) {
      case this.cpu.mmu.BASE_IO | (ioAddr.FIFO_A_LO || 0):
        // FIXME: is this needed or a hack?
        info.dstControl = 2;
        this.dmaA = number;
        break;
      case this.cpu.mmu.BASE_IO | (ioAddr.FIFO_B_LO || 0):
        info.dstControl = 2;
        this.dmaB = number;
        break;
      default:
        this.core.WARN('Tried to schedule FIFO DMA for non-FIFO destination');
        break;
    }
  }

  sample() {
    let [sampleLeft, sampleRight] = [0, 0];
    let sample, channel;

    channel = this.squareChannels[0];
    if (channel.playing) {
      sample = channel.sample * this.soundRatio * this.PSG_MAX;
      if (this.enabledLeft & 0x1) sampleLeft += sample;
      if (this.enabledRight & 0x1) sampleRight += sample;
    }

    channel = this.squareChannels[1];
    if (channel.playing) {
      sample = channel.sample * this.soundRatio * this.PSG_MAX;
      if (this.enabledLeft & 0x2) sampleLeft += sample;
      if (this.enabledRight & 0x2) sampleRight += sample;
    }

    if (this.playingChannel3) {
      sample = this.channel3Sample * this.soundRatio * this.channel3Volume * this.PSG_MAX;
      if (this.enabledLeft & 0x4) sampleLeft += sample;
      if (this.enabledRight & 0x4) sampleRight += sample;
    }

    if (this.playingChannel4) {
      sample = this.channel4.sample * this.soundRatio * this.PSG_MAX;
      if (this.enabledLeft & 0x8) sampleLeft += sample;
      if (this.enabledRight & 0x8) sampleRight += sample;
    }

    if (this.enableChannelA) {
      sample = this.fifoASample * this.FIFO_MAX * this.ratioChannelA;
      if (this.enableLeftChannelA) sampleLeft += sample;
      if (this.enableRightChannelA) sampleRight += sample;
    }

    if (this.enableChannelB) {
      sample = this.fifoBSample * this.FIFO_MAX * this.ratioChannelB;
      if (this.enableLeftChannelB) sampleLeft += sample;
      if (this.enableRightChannelB) sampleRight += sample;
    }

    const samplePointer = this.samplePointer;
    sampleLeft *= this.masterVolume / this.SOUND_MAX;
    sampleLeft = Math.max(Math.min(sampleLeft, 1), -1);
    sampleRight *= this.masterVolume / this.SOUND_MAX;
    sampleRight = Math.max(Math.min(sampleRight, 1), -1);
    if (this.buffers) {
      this.buffers[0][samplePointer] = sampleLeft;
      this.buffers[1][samplePointer] = sampleRight;
    }
    this.samplePointer = (samplePointer + 1) & this.sampleMask;
  }

  audioProcess(audioProcessingEvent: any) {
    const left = audioProcessingEvent.outputBuffer.getChannelData(0);
    const right = audioProcessingEvent.outputBuffer.getChannelData(1);
    if (this.masterEnable) {
      let i;
      let o = this.outputPointer;
      for (i = 0; i < this.bufferSize; ++i, o += this.resampleRatio) {
        if (o >= this.maxSamples) {
          o -= this.maxSamples;
        }
        if ((o | 0) == this.samplePointer) {
          ++this.backup;
          break;
        }
        left[i] = this.buffers[0][o | 0];
        right[i] = this.buffers[1][o | 0];
      }
      for (; i < this.bufferSize; ++i) {
        left[i] = 0;
        right[i] = 0;
      }
      this.outputPointer = o;
      ++this.totalSamples;
    } else {
      for (let i = 0; i < this.bufferSize; ++i) {
        left[i] = 0;
        right[i] = 0;
      }
    }
  }
}
