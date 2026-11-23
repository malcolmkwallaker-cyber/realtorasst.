// Job cards. Towns come from towns.js. People come from roster.js.
'use strict';

(function () {
  const G = globalThis.G = globalThis.G || {};

  function pick(arr, rand) {
    return arr[Math.floor(rand() * arr.length)];
  }

  function shuffle(items, rand) {
    const a = items.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function fill(str, town, extra) {
    return str.replaceAll('{town}', town.name).replaceAll('{from}', extra || '');
  }

  const ANY = function () { return G.TOWNS; };
  const HOME = function () { return G.townsIn('home'); };
  const RANGE = function () { return G.townsIn('range'); };
  const DULUTH = function () { return G.townsIn('duluth'); };

  const SPECS = {
    lead: {
      towns: ANY,
      title: 'Another chair',
      texts: [
        'The Grand Rapids desk needs another set of hands on a {town} file.',
        'Office leader card. Who sits with the {town} clients?',
        'More files than chairs. {town} is the one that needs a partner.',
      ],
      right: 'Pull up a chair and split the file',
      wrong: ['Keep it on one desk', 'Wait for someone else to notice'],
    },
    price: {
      towns: ANY,
      title: 'The number',
      texts: [
        'Price the house in {town}. Engineer\'s habit. Pricing pro.',
        '{town} seller wants a dream number. The comps are on the table.',
        'Bridge Out Ahead can wait. {town} needs a price.',
      ],
      right: 'Price it on the comps',
      wrong: ['Price the daydream', 'Cut it to the bone'],
    },
    handbook: {
      towns: ANY,
      title: 'Handbook',
      texts: [
        'PembertonRE call. One handbook decision on the {town} file.',
        'A handbook and a cubicle started this. {town} needs one clear page.',
        'CEO card, same size as everyone else\'s. What does the page say for {town}?',
      ],
      right: 'One clear decision, then the desk runs it',
      wrong: ['Add three more meetings', 'Skip the page and guess'],
    },
    checklist: {
      towns: ANY,
      title: 'Checklist',
      texts: [
        'Item on the hundred. The {town} file needs a complete sentence and a next step.',
        'Liz\'s list. {town} is stuck on a vague line.',
        'Second in command card. Finish the next {town} items.',
      ],
      right: 'Write the next item in a complete sentence',
      wrong: ['Skip to the fun part', 'Leave the line fuzzy'],
    },
    grant: {
      towns: ANY,
      title: 'Grant path',
      texts: [
        'Wise Elephant looks for a grant path on a {town} listing.',
        'Public-art eye on the {town} photos, then the grant note.',
        '{town} needs a frame and a way to pay for the work.',
      ],
      right: 'Match a grant and reframe the photos',
      wrong: ['Skip the paperwork', 'Use a blurry phone photo and hope'],
    },
    mighty: {
      towns: ANY,
      title: 'Mighty offer',
      texts: [
        'Small agent, mighty offer. {town} numbers get counted twice.',
        'Court-admin tidy. The {town} paper has to be in order.',
        'Goose and James are along. The {town} offer is the job.',
      ],
      right: 'Count it twice, then send a clean offer',
      wrong: ['Send a rough number', 'Wait until it feels huge'],
    },
    travel: {
      towns: DULUTH,
      title: 'The long road',
      texts: [
        'Drive from {from} to {town}. Deb\'s card.',
        'The long road between the Range and {town}.',
        'Travel expert. {from} to {town} is the appointment.',
      ],
      from: RANGE,
      right: 'Take the road and keep the appointment',
      wrong: ['Skip the drive', 'Leave the time blank'],
    },
    firsthome: {
      towns: ANY,
      title: 'First home',
      texts: [
        'First-time buyers in {town}. Jordan can read the concrete and the carpentry.',
        'Licensed May 2026. The {town} question is: what does the build say?',
        'A first home in {town}. Walk them through it.',
      ],
      right: 'Walk the build with the first-time buyers',
      wrong: ['Send twelve links and vanish', 'Tell them to wait five years'],
    },
    beard: {
      towns: ANY,
      title: 'Marketplace',
      texts: [
        'Facebook Marketplace house in {town}. The beard enters first.',
        'Home-services eye on a {town} flip from Marketplace.',
        '{town} post is still up. Matt knows that kind of house.',
      ],
      right: 'Answer the post and price the work',
      wrong: ['Scroll past it', 'Promise it is perfect'],
    },
    nurse: {
      towns: ANY,
      title: 'Check-in',
      texts: [
        'Nurse\'s heart on a {town} client who needs a follow-up.',
        'Bethany still picks up shifts. The {town} check-in still happens.',
        'Nobody forgotten in {town}. Make the call.',
      ],
      right: 'Check in and stay kind',
      wrong: ['Assume they are fine', 'Only call the easy ones'],
    },
    zillow: {
      towns: ANY,
      title: 'Zillow lead',
      texts: [
        'Zillow lead in {town}. Emily answers like a person.',
        'The {town} ping is a person. Convert it.',
        'Online lead, {town}. Chemist-clear notes, human reply.',
      ],
      right: 'Answer now and set the appointment',
      wrong: ['Let the ping sit', 'Send a blank auto-reply'],
    },
    know: {
      towns: DULUTH,
      title: 'Duluth file',
      texts: [
        'Duluth ground. {town}. Adam already read the accounting, the geography, and the geology.',
        '{town} file. He knows this one.',
        'Geography, geology, the MBA. {town} is not a guess.',
      ],
      right: 'Use what he already knows',
      wrong: ['Guess the lot', 'Ignore the map'],
      hint: true,
    },
    anyhome: {
      towns: ANY,
      title: 'Any home',
      texts: [
        'A hard house in {town}. Stephanie can sell any home.',
        '{town} is a stubborn listing. She can sell any home.',
        'A decade of claims files, then this {town} house. She can sell any home.',
      ],
      right: 'Stay on it and find the buyer',
      wrong: ['Drop the odd house', 'Hide the flaw'],
    },
    figure: {
      towns: ANY,
      title: 'Figure it out',
      texts: [
        'The {town} file is snarled. Everything is figure-out-able.',
        'About a year in. Teacher habit. {town} becomes steps.',
        'Scotty\'s motto on a {town} snag.',
      ],
      right: 'Break it into the next step',
      wrong: ['Call it impossible', 'Stare at the whole knot'],
    },
    range: {
      towns: RANGE,
      title: 'Iron Range',
      texts: [
        'Range card in {town}. Lifelong Hibbing is the root. This town is the work.',
        '{town}. Tania had the file habits before she had the Range answer.',
        'Iron Range expert. {town} is on her map.',
      ],
      right: 'Answer it like a local and file it clean',
      wrong: ['Treat it like a town you have never seen', 'Skip the callback'],
    },
    room: {
      towns: ANY,
      title: 'The room',
      prefer: ['nashwauk', 'keewatin', 'hibbing'],
      texts: [
        'Kitchen-table talk in {town}. Ex bartender. He reads who is ready.',
        '{town}. Broccoli, not a perm. The earring clocked the room.',
        'From Nashwauk, working {town}. Listen before the pitch.',
      ],
      right: 'Read the room, then talk',
      wrong: ['Pitch over them', 'Check the game and miss the tell'],
    },
    guy: {
      towns: HOME,
      title: 'Knows a guy',
      texts: [
        'Kaila knows a guy north of Grand Rapids. The callback lands in {town}.',
        'Math-teacher clean numbers, farm patience, and a guy. {town} is the file.',
        '{town}. The guy called back. Onions are not invited.',
      ],
      right: 'Take the callback and keep the numbers clean',
      wrong: ['Ignore the call', 'Bring onions to the table'],
    },
    lender: {
      towns: ANY,
      title: 'Clear to close',
      texts: [
        'Joel, blond lender, on a {town} approval. He will walk the desk through it.',
        'Mentor card. The {town} buyer needs the file explained.',
        '{town}. Approved, then the walkthrough.',
      ],
      right: 'Clear it and walk a teammate through',
      wrong: ['Toss the approval over the wall', 'Skip the explanation'],
    },
  };

  function townFor(spec, rand) {
    let pool = spec.towns();
    if (spec.prefer && rand() < 0.45) {
      const preferred = spec.prefer
        .map(function (id) { return G.townById(id); })
        .filter(function (t) { return pool.some(function (p) { return p.id === t.id; }); });
      if (preferred.length) pool = preferred;
    }
    return pick(pool, rand);
  }

  G.Flavor = {
    seasons: [
      { id: 'FALL', name: 'Fall', line: 'Leaves on the corridor.' },
      { id: 'WINTER', name: 'Winter', line: 'Winter. The plows are out.' },
      { id: 'THAW', name: 'Thaw', line: 'Mud season on the shoulders.' },
      { id: 'SUMMER', name: 'Summer', line: 'Lake season. The corridor is green.' },
    ],

    season(week) {
      const i = Math.floor(week / 3);
      return this.seasons[Math.min(3, Math.max(0, i))];
    },

    offer(perkId, rand) {
      const spec = SPECS[perkId];
      if (!spec) {
        const never = perkId;
        throw new Error('No card for perk ' + never);
      }
      const town = townFor(spec, rand);
      let from = '';
      if (spec.from) from = pick(spec.from(), rand).name;
      const text = fill(pick(spec.texts, rand), town, from);
      const packed = shuffle([
        { t: spec.right, ok: true },
        { t: spec.wrong[0], ok: false },
        { t: spec.wrong[1], ok: false },
      ], rand);
      let correct = 0;
      const choices = packed.map(function (item, i) {
        if (item.ok) correct = i;
        return item.t;
      });
      return {
        perkTag: perkId,
        townId: town.id,
        townName: town.name,
        region: town.region,
        title: spec.title,
        text: text,
        choices: choices,
        correct: correct,
        hint: spec.hint ? 'Adam already knows: ' + spec.right + '.' : '',
      };
    },

    randomTown(rand) {
      return pick(G.TOWNS, rand);
    },

    rangeTown(rand) {
      return pick(G.townsIn('range'), rand);
    },

    duluthTown(rand) {
      return pick(G.townsIn('duluth'), rand);
    },
  };
})();
