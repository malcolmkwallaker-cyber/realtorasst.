'use strict';

(() => {
  const ND = globalThis.ND;
  const rate = 22050;
  const tau = Math.PI*2;
  // The vowels are three vocal-tract resonances in Hz. ~ stretches a syllable, ! accents it.
  const vowels = {
    ah:[735,1130,2470], aw:[570,840,2440], eh:[530,1800,2520], ee:[310,2220,2950],
    ih:[420,1960,2620], oh:[440,880,2530], oo:[310,810,2300], uh:[610,1360,2540],
  };
  const vowelPattern = /ah|aw|eh|ee|ih|oh|oo|uh/;
  const voices = {
    malcolm: { pitch:136, beat:.153, tract:1.02, phrase:'moh deh vah nuh loh' },
    adam: { pitch:112, beat:.172, tract:.93, phrase:'buhm grah dohm~ eh' },
    bethany: { pitch:228, beat:.135, tract:1.14, phrase:'veh nee woh muh deh~' },
    bridger: { pitch:87, beat:.204, tract:.75, rasp:.46, melody:[-3,7,2,-5], phrase:'vrawh~ zhee! mroh dah~' },
    deb: { pitch:171, beat:.156, tract:1.02, phrase:'neh voo dah cheh uh' },
    emily: { pitch:257, beat:.102, tract:1.25, phrase:'beep veh ih dawh weh!' },
    gaige: { pitch:164, beat:.111, tract:1.08, rasp:.16, phrase:'keh yah doh vuh reh!' },
    jillian: { pitch:402, beat:.090, tract:1.53, melody:[2,6,4,9,0], phrase:'tih pee zee keh teeh' },
    joel: { pitch:126, beat:.205, tract:.98, phrase:'loh veh dahr nuhm' },
    jordan: { pitch:113, beat:.149, tract:.89, rasp:.22, phrase:'druh gaw bleh brohm' },
    kaila: { pitch:196, beat:.143, tract:1.09, phrase:'lah fooh nehm yeh' },
    liz: { pitch:189, beat:.126, tract:1.12, phrase:'zeh keh vuh tohm!' },
    matt: { pitch:101, beat:.174, tract:.82, rasp:.72, melody:[5,-1,3,-6], phrase:'grrah~! kreh! gawrk rrohm' },
    parker: { pitch:145, beat:.176, tract:.98, phrase:'prah vee doh wah!' },
    bekkah: { pitch:213, beat:.156, tract:1.17, phrase:'leh shuhm doh vee noh~' },
    scotty: { pitch:159, beat:.142, tract:1.07, phrase:'froh puh meh wah yeht' },
    stephanie: { pitch:208, beat:.175, tract:1.04, phrase:'sheh vohn lah deh' },
    tania: { pitch:177, beat:.191, tract:.96, phrase:'dohm keh grah veh' },
    tanya: { pitch:196, beat:.167, tract:1.07, rasp:.30, drawl:true, melody:[0,4,-2,7,-3], phrase:'hyeh~ naw~ rrah! yoh~ gah!' },
    'brother-malcolm': { pitch:68, beat:.225, tract:.70, rasp:.63, melody:[-2,-4,0,-6], phrase:'vroom hruhm~ zheh gahm' },
    gene: { pitch:129, beat:.130, tract:.81, rasp:.37, melody:[4,-3,5,1,-5], phrase:'bwuh dahm hohk bleh waw!' },
  };

  function syllable(word, index, voice, count) {
    const match = vowelPattern.exec(word);
    const vowel = match[0];
    const prefix = word.slice(0,match.index);
    const accented = word.includes('!');
    const long = word.includes('~');
    const semitones = voice.melody?.[index] ?? (index===count-1 ? -3 : [0,2,-1,3][index%4]);
    return {
      pitch:voice.pitch*2**(semitones/12),
      duration:voice.beat*(long?1.65:accented?.82:1),
      stress:accented?1:.83,
      onset:/[kptshz]/.test(prefix) ? .041 : .024,
      start:vowels[vowel],
      end:voice.drawl ? vowels[vowel==='eh'?'ah':vowel==='aw'?'uh':'eh'] : vowels[vowel],
    };
  }

  function voiceBuffer(context, id) {
    const voice = voices[id];
    if (!voice) return null;
    const words = voice.phrase.split(' ');
    const parts = words.map((word,index) => syllable(word,index,voice,words.length));
    const gap = Math.round(rate*.024);
    const size = parts.reduce((sum,part) => sum+Math.round(part.duration*rate)+gap,0);
    const buffer = context.createBuffer(1,size,rate);
    const data = buffer.getChannelData(0);
    const random = ND.rng(Math.floor(voice.pitch*voice.beat*65536));
    const rasp = voice.rasp || 0;
    let offset = 0;
    let peak = 0;
    for (const part of parts) {
      const length = Math.round(part.duration*rate);
      const formants = [100,150,220].map((band,index) => {
        const damping = Math.exp(-Math.PI*band/rate);
        const start = 2*damping*Math.cos(tau*part.start[index]*voice.tract/rate);
        const end = 2*damping*Math.cos(tau*part.end[index]*voice.tract/rate);
        return { start, glide:end-start, damping:damping*damping, gain:(1-damping)*[1,.68,.38][index],
          last:0, previous:0 };
      });
      let phase = 0;
      let previousNoise = 0;
      for (let i=0;i<length;i++) {
        const seconds = i/rate;
        const progress = i/length;
        const glide = Math.max(0,(progress-.30)/.70);
        const flutter = .016*Math.sin(tau*seconds*7.5);
        const bend = (voice.drawl?.18:.085)*Math.sin(Math.PI*progress)-.16*progress;
        phase += part.pitch*(1+bend+flutter)/rate;
        const cycle = Math.floor(phase);
        const pulse = phase-cycle;
        const voiced = pulse<.43 ? Math.sin(Math.PI*pulse/.43)*(1-rasp*.56*(cycle%2)) : 0;
        const noise = random()*2-1;
        const attack = Math.min(1,seconds/part.onset);
        const input = voiced*attack+(noise-previousNoise*.86)*(.28*(1-attack)+.14*rasp);
        previousNoise = noise;
        let value = (noise-.5)*.033*(1-attack);
        for (const formant of formants) {
          const next = input*formant.gain+(formant.start+formant.glide*glide)*formant.last-
            formant.damping*formant.previous;
          formant.previous = formant.last;
          formant.last = next;
          value += next;
        }
        const envelope = Math.min(1,seconds/.012,(length-i)/(rate*.048));
        value *= envelope*part.stress;
        data[offset+i] = value;
        peak = Math.max(peak,Math.abs(value));
      }
      offset += length+gap;
    }
    const volume = .69/Math.max(peak,.04);
    for (let i=0;i<data.length;i++) data[i] *= volume;
    return buffer;
  }

  ND.voiceBuffer = voiceBuffer;
})();
