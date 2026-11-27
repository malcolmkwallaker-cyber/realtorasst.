'use strict';

(() => {
  function fieldMusic(context) {
    const chords = [[48,55,64,59],[45,52,60,55],[41,48,57,52],[43,50,62,57]];
    const pattern = [[0,0],[.5,2],[1,1],[1.75,3],[2.5,2],[3.25,1]];
    const beat = .74;
    const rate = context.sampleRate;
    const buffer = context.createBuffer(1,Math.ceil(chords.length*4*beat*rate),rate);
    const samples = buffer.getChannelData(0);
    for (const [bar,chord] of chords.entries()) {
      for (const [offset,note] of pattern) {
        const start = Math.round((bar*4+offset)*beat*rate);
        const period = 2*Math.PI*440*2**((chord[note]-69)/12)/rate;
        const length = Math.round(rate*(note===0?1.48:1.04));
        for (let i=0;i<length;i++) {
          const t = i/rate;
          const envelope = Math.min(1,t*64,(length-i)/(rate*.10))*Math.exp(-t*(note===0?2.9:4.7));
          const phase = period*i;
          samples[(start+i)%samples.length] += (Math.sin(phase)+.19*Math.sin(phase*2))*envelope*.38;
        }
      }
    }
    return buffer;
  }

  class Soundscape {
    constructor() {
      this.enabled = true;
      try { this.musicEnabled = localStorage.getItem('north-desk-music')!=='off'; }
      catch { this.musicEnabled = true; }
      this.lastStep = 0;
      this.voices = new Map();
    }

    open() {
      if (!this.enabled || typeof AudioContext === 'undefined') return;
      if (this.context) {
        this.context.resume().catch(() => {});
        return;
      }
      const ctx = this.context = new AudioContext();
      const makeGain = (gain,target=ctx.destination) => {
        const node = ctx.createGain();
        node.gain.value = gain;
        node.connect(target);
        return node;
      };
      this.master = makeGain(.34);
      this.music = makeGain(this.musicEnabled?.16:0,this.master);
      const score = ctx.createBufferSource();
      score.buffer = fieldMusic(ctx);
      score.loop = true;
      score.connect(this.music);
      score.start();
      this.rustle = makeGain(.004,this.master);
      this.weather = ctx.createBiquadFilter();
      this.weather.type = 'lowpass';
      this.weather.frequency.value = 270;
      this.weather.connect(this.rustle);
      const field = ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
      const data = field.getChannelData(0);
      for (let i=0;i<data.length;i++) data[i]=Math.random()*2-1;
      this.noise = field;
      const wind = ctx.createBufferSource();
      wind.buffer=field;
      wind.loop=true;
      wind.connect(this.weather);
      wind.start();
      this.motor = ctx.createOscillator();
      this.motor.type='triangle';
      this.motor.frequency.value=49;
      this.engine = makeGain(0,this.master);
      this.motor.connect(this.engine);
      this.motor.start();
      ctx.resume().catch(() => {});
    }

    toggle() {
      this.enabled = !this.enabled;
      if (this.enabled) this.open();
      else {
        this.stopVoice();
        this.context?.suspend().catch(() => {});
      }
    }

    toggleMusic() {
      this.musicEnabled = !this.musicEnabled;
      try { localStorage.setItem('north-desk-music',this.musicEnabled?'on':'off'); }
      catch {}
      this.setMusicVolume(.16);
    }

    setMusicVolume(volume) {
      if (this.music) this.music.gain.setTargetAtTime(this.musicEnabled?volume:0,this.context.currentTime,.23);
    }

    speak(id) {
      if (!this.enabled) return;
      this.open();
      const ctx = this.context;
      if (!ctx) return;
      this.stopVoice();
      if (!this.voices.has(id)) this.voices.set(id,globalThis.ND.voiceBuffer(ctx,id));
      const buffer = this.voices.get(id);
      if (!buffer) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const voice = { source,gain };
      this.currentVoice = voice;
      source.buffer = buffer;
      source.playbackRate.value = .98+Math.random()*.04;
      gain.gain.value = .76;
      source.connect(gain).connect(this.master);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        if (this.currentVoice===voice) this.currentVoice = null;
      };
      source.start();
    }

    say(text,id) {
      if (!this.enabled) return;
      const speech = globalThis.speechSynthesis;
      const localVoice = speech?.getVoices().find((voice)=>voice.localService && voice.lang.startsWith('en-US'));
      if (!localVoice || typeof SpeechSynthesisUtterance==='undefined') {
        this.speak(id);
        return;
      }
      this.stopVoice();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = localVoice;
      utterance.volume = .78;
      this.utterance = utterance;
      utterance.onend = () => { if (this.utterance===utterance) this.utterance = null; };
      utterance.onerror = () => { if (this.utterance===utterance) this.speak(id); };
      speech.speak(utterance);
    }

    stopVoice() {
      if (this.utterance) {
        this.utterance = null;
        globalThis.speechSynthesis.cancel();
      }
      const voice = this.currentVoice;
      if (!voice) return;
      this.currentVoice = null;
      const now = this.context.currentTime;
      voice.gain.gain.setTargetAtTime(0,now,.008);
      voice.source.stop(now+.04);
    }

    step(paved) {
      const ctx = this.context;
      const tick = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      tick.buffer = this.noise;
      tick.playbackRate.value = .83+Math.random()*.39;
      filter.type='lowpass';
      filter.frequency.value=paved?710:410;
      tick.connect(filter).connect(gain).connect(this.master);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(.19, now);
      gain.gain.exponentialRampToValueAtTime(.0001,now+.16);
      tick.start(now,Math.random()*.8,.18);
    }

    arcade(hit) {
      const ctx = this.context;
      if (!this.enabled || !ctx || ctx.state !== 'running') return;
      const tone = ctx.createOscillator();
      const volume = ctx.createGain();
      const now = ctx.currentTime;
      tone.type = 'sine';
      tone.frequency.setValueAtTime(hit ? 580 : 380,now);
      tone.frequency.exponentialRampToValueAtTime(hit ? 870 : 175,now+.13);
      volume.gain.setValueAtTime(.17,now);
      volume.gain.exponentialRampToValueAtTime(.001,now+.15);
      tone.connect(volume).connect(this.master);
      tone.start(now);
      tone.stop(now+.16);
    }

    quiet() {
      this.stopVoice();
      if (!this.context) return;
      const now = this.context.currentTime;
      this.engine.gain.setTargetAtTime(0,now,.12);
      this.rustle.gain.setTargetAtTime(.004,now,.20);
      this.setMusicVolume(.085);
    }

    progress(kind) {
      const ctx = this.context;
      if (!this.enabled || !ctx || ctx.state !== 'running') return;
      const notes = kind==='booking' ? [523,659,784] : [392,587];
      for (const [index,freq] of notes.entries()) {
        const start = ctx.currentTime + index*.067;
        const tone = ctx.createOscillator();
        const gain = ctx.createGain();
        tone.frequency.value=freq;
        gain.gain.setValueAtTime(.001,start);
        gain.gain.exponentialRampToValueAtTime(.13,start+.018);
        gain.gain.exponentialRampToValueAtTime(.001,start+.20);
        tone.connect(gain).connect(this.master);
        tone.start(start);
        tone.stop(start+.22);
      }
    }

    celebrate() {
      const ctx = this.context;
      if (!this.enabled || !ctx || ctx.state !== 'running') return;
      const notes = [[523,0],[659,.12],[784,.24],[1047,.38],[784,.58],[1047,.7]];
      for (const [freq,offset] of notes) {
        const start = ctx.currentTime+offset;
        const tone = ctx.createOscillator();
        const gain = ctx.createGain();
        tone.type = 'triangle';
        tone.frequency.value = freq;
        gain.gain.setValueAtTime(.001,start);
        gain.gain.exponentialRampToValueAtTime(.15,start+.02);
        gain.gain.exponentialRampToValueAtTime(.001,start+(offset>.6?.75:.28));
        tone.connect(gain).connect(this.master);
        tone.start(start);
        tone.stop(start+.8);
      }
    }

    phoneBuzz() {
      const ctx = this.context;
      if (!this.enabled || !ctx || ctx.state!=='running') return;
      const tone = ctx.createOscillator();
      const volume = ctx.createGain();
      const now = ctx.currentTime;
      tone.type = 'triangle';
      tone.frequency.value = 137;
      volume.gain.setValueAtTime(.001,now);
      for (const offset of [0,.16]) {
        volume.gain.setValueAtTime(.001,now+offset);
        volume.gain.linearRampToValueAtTime(.25,now+offset+.014);
        volume.gain.exponentialRampToValueAtTime(.001,now+offset+.105);
      }
      tone.connect(volume).connect(this.master);
      tone.start(now);
      tone.stop(now+.28);
    }

    roadBump() {
      const ctx = this.context;
      if (!this.enabled || !ctx || ctx.state!=='running') return;
      const tone = ctx.createOscillator();
      const volume = ctx.createGain();
      const now = ctx.currentTime;
      tone.type = 'triangle';
      tone.frequency.setValueAtTime(81,now);
      tone.frequency.exponentialRampToValueAtTime(37,now+.12);
      volume.gain.setValueAtTime(.24,now);
      volume.gain.exponentialRampToValueAtTime(.001,now+.16);
      tone.connect(volume).connect(this.master);
      tone.start(now);
      tone.stop(now+.17);
    }

    update({ moving, driving, rain, stride, speed, indoors, paved }) {
      const ctx = this.context;
      if (!this.enabled || !ctx || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      const movementSpeed = Math.abs(speed);
      this.setMusicVolume(this.currentVoice || this.utterance ? .07 : driving ? .27 : .19);
      this.motor.frequency.setTargetAtTime(47+movementSpeed*2.6,now,.14);
      this.engine.gain.setTargetAtTime(moving && driving ? .095 + movementSpeed*.0017 : 0,now,.17);
      this.weather.frequency.setTargetAtTime(240 + rain*2800 + (driving?movementSpeed*24:0),now,.21);
      this.rustle.gain.setTargetAtTime(moving ? (indoors?.018:.083) + rain*.11 + (driving?movementSpeed*.005:0) : .004,now,.20);
      const step = Math.floor(stride / Math.PI);
      if (moving && !driving && step !== this.lastStep) this.step(paved);
      this.lastStep = step;
    }
  }

  globalThis.ND.Soundscape = Soundscape;
})();
