'use strict';

(() => {
  const ND = globalThis.ND;
  // These are the existing North Desk roles and appearance notes. All scene dialogue is fictional.
  const perks = {
    malcolm: ['Office rhythm','Review a new file in five minutes.',{intake:5}],
    adam: ['Hillside specialist','Earn extra client trust for Duluth walkthrough notes.',{markets:['duluth'],marketTrust:5}],
    bethany: ['Steady hand','Start each accepted file with 12 extra trust.',{leadTrust:12}],
    bridger: ['Comparable sales','Bring buyer counteroffers up to $1,200 closer to your number.',{counter:1200}],
    deb: ['Road book','Allow less in-game travel time on an assisted GPS drive.',{driveTime:.85}],
    emily: ['Quick response','Accept a new online or referral file in three minutes.',{intake:3}],
    gaige: ['After hours','Book showings until 7 PM.',{afterHours:60}],
    jillian: ['Credit negotiation','Secure up to $400 more on requested repair credits.',{repair:400}],
    joel: ['Lender’s line','Schedule closing one day after title review.',{closeDays:1}],
    jordan: ['Builder’s eye','Earn extra trust when accurately noting basement and roof concerns.',{structuralTrust:5}],
    kaila: ['Rural connections','Earn extra trust for well and septic notes at the cabin.',{markets:['cabin'],marketTrust:6}],
    liz: ['Closing checklist','Complete title review in 14 minutes.',{titleTime:14}],
    matt: ['Contractor network','Review the inspection report and estimates in 15 minutes.',{inspectionTime:15}],
    parker: ['Fleet account','Pay less for SUV fuel delivery.',{fuelFactor:.75}],
    bekkah: ['Marketing plan','Bring in the first listing offer sooner.',{publishTime:.58}],
    scotty: ['Plan B','Keep a showing slot for 35 extra minutes if you run late.',{grace:35}],
    stephanie: ['Seller’s advocate','Attract stronger opening offers when you publish a listing.',{buyerBump:1250}],
    tania: ['Range local','Earn extra client trust for walkthroughs in Hibbing and Hoyt Lakes.',{markets:['range','hoyt'],marketTrust:5}],
    tanya: ['Listing packet','Write each walkthrough note in three minutes.',{noteTime:3}],
    'brother-malcolm': ['Twin’s cut','Pocket $125 from the North Desk expense float once per career.',{floatCash:125}],
  };

  const team = [
    ['malcolm', 'Malcolm Wallaker', 'Office leader', '#665343', '#446654', 'short', 'rapids',
      'Pull up a chair. The first thing I ask a new agent is which client is waiting to hear back.'],
    ['adam', 'Adam Marks', 'Duluth market and land', '#614632', '#59636b', 'bald', 'duluth',
      'Pull the parcel map first. Two houses with the same view can have very different access and drainage.'],
    ['bethany', 'Bethany Leadley', 'Buyer care', '#bda37d', '#526759', 'long', 'rapids',
      'Give them a time you’ll call back. That helps more than telling them there’s nothing to worry about.'],
    ['bridger', 'Bridger Hopkins', 'Pricing and comps', '#a5492e', '#344a5a', 'red', 'rapids',
      'I pulled the last three closes. Look at the condition adjustments. I’d rather explain a number once than defend it all week.'],
    ['deb', 'Deb Danley', 'Relocation and travel', '#b8a27b', '#4a716e', 'bob', 'range',
      'Give them the drive time in both directions. A half hour in July can look different after a January storm.'],
    ['emily', 'Emily Lutz', 'Online buyer leads', '#d9b76c', '#80556c', 'long', 'rapids',
      'I reached the lead. They’re working until lunch and can get to the house soon after. I sent you the whole conversation.'],
    ['gaige', 'Gaige Waldvogel', 'Short-notice showings', '#594134', '#895c3f', 'broccoli', 'nashwauk',
      'I can cover the showing. Tell me what the buyer asked before they got off the phone.'],
    ['jillian', 'Jillian Bilden', 'Offers and negotiation', '#755095', '#883f4f', 'small', 'rapids',
      'Small agent, mighty offer. Tell me where each side can move before we change the price.'],
    ['joel', 'Joel', 'Lender and mentor', '#d9b476', '#4d6680', 'short', 'rapids',
      'I checked the letter and the funds for closing. Put that limit in the file before you write anything.'],
    ['jordan', 'Jordan Hess', 'Construction and first homes', '#bca371', '#515e78', 'shortbeard', 'ramble',
      'I used to pour concrete. See the old stain under the window? Let’s ask the inspector to check where that water came from.'],
    ['kaila', 'Kaila Wass', 'Rural homes and contractors', '#584037', '#4d6247', 'long', 'cabin',
      'I know a guy who can get you a real estimate. Bring me the well disclosure first.'],
    ['liz', 'Liz Rein', 'Chief operating officer', '#584134', '#536b77', 'bob', 'rapids',
      'Good morning. Check the file with your name on it. For every contingency I want a date and someone responsible for it.'],
    ['matt', 'Matt Huebscher', 'Fixers and home services', '#33323a', '#495361', 'beard', 'range',
      'The photos look great. I’d still separate the work you can price today from what’s behind the walls.'],
    ['parker', 'Parker Pemberton', 'CEO', '#bc8159', '#324358', 'short', 'rapids',
      'Call the office if a file stalls. We’ve got people who can help with title, lending, and marketing.'],
    ['bekkah', 'Rebekkah Anderson', 'Commercial property and grant research', '#ccac6c', '#906850', 'long', 'tower',
      'I can look for eligible grant programs. Work the numbers with the funding you’ve actually confirmed.'],
    ['scotty', 'Scotty Puglisi', 'Buyers and problem solving', '#c6aa82', '#8a7164', 'bob', 'rapids',
      'Everything is figure-out-able. What’s the next thing we need a straight answer on?'],
    ['stephanie', 'Stephanie Mascarenas', 'Hoyt Lakes listings', '#d6b476', '#5d6f88', 'long', 'hoyt',
      'Somebody needs exactly what this house offers. I start with the disclosure and the actual layout.'],
    ['tania', 'Tania Suonvieri', 'Iron Range market', '#c9ab73', '#754340', 'bob', 'range',
      'I know this block. If they’re comparing that place in Chisholm, remind them to look at the two condition reports.'],
    ['tanya', 'Tanya Sage', 'Listing coordinator', '#794735', '#78917c', 'long', 'rapids',
      'Come on in, honey. I’ve got the disclosures ready and a fresh pot of coffee. Tell me what would make your day a little easier.'],
    ['brother-malcolm', 'Brother Malcolm', 'Malcolm’s evil twin', '#302522', '#584257', 'short', 'rapids',
      'My brother and I keep score differently. I like to leave the office with more than I came in with.', '#76503d'],
  ].map(([id, name, title, hair, shirt, style, base, line, skin]) => ({
    id, name, title, hair, shirt, style, base, line, skin,
    short: id === 'bekkah' ? 'Bekkah' : id === 'brother-malcolm' ? name : name.split(' ')[0],
    perk:{name:perks[id][0],description:perks[id][1],...perks[id][2]},
  }));

  const townBanter = {
    rapids: [
      'I saw half the office at the coffee shop before nine. We could have held the huddle right there.',
      'If the buyer gets turned around on Pokegama, send them the cross street. The number alone won’t do.',
      'Someone brought bars for the office. Grab one before the afternoon showings.',
    ],
    range: [
      'The wind was coming straight across the Range this morning. I left an extra scraper in the car.',
      'Hibbing is a different market a few blocks at a time. Keep the neighborhood in your notes.',
      'If a showing runs long, give the next client a heads-up before you head out on 169.',
    ],
    duluth: [
      'It was clear up the hill and fog by the lake. Leave a little room in the showing schedule.',
      'The hill looks short on the map. Let the clients see how they’d actually park.',
      'The Lift Bridge traffic can make the whole afternoon run ten minutes late.',
    ],
  };

  function conversation(person,career,site) {
    const file = career.file;
    const r = career.record;
    const name = file.client;
    const address = site.road.segment.name || site.town;
    const topics = {
      liz:{
        lead: 'I’ve put '+name+'’s file by the monitor. Check the signed agreement before we book anything.',
        schedule: 'Put the showing time and '+address+' on the same line. Then anybody in the office can cover if you get held up.',
        booked: 'Leave yourself ten minutes before '+ND.time(r.showAt)+'. Check the lockbox instructions before you leave the desk.',
        tour: 'If you see something '+name+' will ask about later, put it in the notes today while it’s fresh.',
        offer: 'Read the price, dates, and contingencies aloud. If you have to guess at a detail, come find me.',
        inspection: 'Get the credit amount in writing and keep it with the inspection notes for '+name+'.',
        title: 'Bring me '+name+'’s contract and signed addendum. I’ll check the names against the title report.',
        sign: 'The closing table is set for '+name+'. We’re just waiting on the final signatures.',
        closed: 'I filed the closing for '+name+'. Send your thank-you before turning to the next lead.',
      },
      scotty:{
        lead: 'When you call '+name+', ask what would make a showing worth leaving work for.',
        schedule: 'Here’s a quick Plan B. Pick one time for '+name+' and keep a second slot in your pocket.',
        booked: 'I’d text the cross street and which door to use. Saves a lap around '+site.town+'.',
        tour: 'Take a photo of anything you’d have trouble describing later. '+name+' will appreciate seeing what you saw.',
        offer: 'Try reading the number back to '+name+' before you hit send. One minute now can save an hour.',
        counter: 'Walk '+name+' through the change in plain language. Ask what they’d be comfortable signing.',
        inspection: 'Everything is figure-out-able. Write down who calls the contractor, and by when.',
        title: 'I’ll help double-check the file before the office closes. We can split it into three small jobs.',
        sign: 'Put the key pickup in '+name+'’s calendar. That’s the part everybody remembers.',
        closed: 'You got '+name+' all the way to the keys. Go grab a bar from the break room.',
      },
    };
    const regional = townBanter[person.base] || townBanter[person.town === 'Grand Rapids'?'rapids':'range'];
    const stages = ['lead','schedule','booked','tour','offer','counter','inspection','title','sign','closed'];
    const index = (career.day.index+career.closed+stages.indexOf(r.stage))%regional.length;
    const line = topics[person.id]?.[r.stage] || (person.id === file.staff && r.stage === 'lead' ?
      name+'’s inquiry is on your phone. Take a look before you head out.' : person.line);
    return [line,regional[index]];
  }

  ND.roster = team;
  ND.agents = Object.fromEntries(team.map((person) => [person.id, person]));
  ND.conversation = conversation;
})();
