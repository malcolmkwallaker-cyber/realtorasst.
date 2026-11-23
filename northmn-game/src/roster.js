'use strict';

(() => {
  const ND = globalThis.ND;
  // These are the existing North Desk roles and appearance notes. All scene dialogue is fictional.
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
  ].map(([id, name, title, hair, shirt, style, base, line]) => ({
    id, name, title, hair, shirt, style, base, line, short: id === 'bekkah' ? 'Bekkah' : name.split(' ')[0],
  }));

  ND.roster = team;
  ND.agents = Object.fromEntries(team.map((person) => [person.id, person]));
})();
