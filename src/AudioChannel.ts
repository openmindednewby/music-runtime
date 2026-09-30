// A regular (not const) enum: a published `declare const enum` cannot be used
// by consumers compiled with isolatedModules.
export enum AudioChannel {
  Music = 'music',
  Sfx = 'sfx',
}
