// Compiled by scripts/check-isolated-consumer.cjs against the BUILT dist with
// isolatedModules: true, the setting Surge, Aurora and Morphe use.
import { AudioChannel, AudioMixer, SfxBus, SfxPlayer, SFX_PRESETS } from '../dist/index';
import type { SfxVoice } from '../dist/index';

const bus = new SfxBus();
const mixer = new AudioMixer(bus);
mixer.setStep(AudioChannel.Music, 2);
const channel: AudioChannel = AudioChannel.Sfx;
new SfxPlayer(bus, mixer, { bank: SFX_PRESETS }).play('jump');
const noise: SfxVoice = { wave: 'noise', dur: 0.1, gain: 0.5 };

export { channel, noise };
