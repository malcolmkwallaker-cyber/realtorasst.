'use strict';

(() => {
  class Soundscape {
    constructor() {
      this.enabled = true;
      this.lastStep = 0;
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
      this.rustle = makeGain(.05,this.master);
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
      else this.context?.suspend().catch(() => {});
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

    update({ moving, driving, rain, stride, speed, indoors, paved }) {
      const ctx = this.context;
      if (!this.enabled || !ctx || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      const movementSpeed = Math.abs(speed);
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
