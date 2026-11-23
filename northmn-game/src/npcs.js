// Office dialogue. Facts only, plus the quests those facts suggest.
'use strict';

(function () {
  const G = globalThis.G = globalThis.G || {};

  const LINES = {
    adam: [
      'Adam Marks. Duluth. Accounting, geography, geology, and the MBA.',
      'He already read the file. He knows this one.',
    ],
    bethany: [
      'Bethany Leadley. Nurse turned agent. She still picks up shifts.',
      'Nurse\'s heart. Ohio State and the NHL can wait until the check-in is done.',
    ],
    bridger: [
      'Bridger Hopkins. Red hair, ex mechanical engineer, pricing pro.',
      'Junkyard Wars hooked him at age 6. He hosts Bridge Out Ahead.',
      'He keeps a few dozen birds. One is named Malcolm, and that one got out.',
    ],
    deb: [
      'Deb Danley. Travel expert.',
      'If the appointment is between the Range and Duluth, she takes the road.',
    ],
    emily: [
      'Emily Lutz. Blond, chemist, kayaker, board-game nights.',
      'She studied abroad in Ireland and ran MemSTAR Studio.',
      'A Zillow lead is a person. She answers.',
    ],
    gaige: [
      'Gaige Waldvogel, from Nashwauk. Ex bartender. Timberwolves fan.',
      'Broccoli, not a perm. One earring. He reads the room.',
      'The Mucho Si Nayarit Special is a favorite, not a listing.',
    ],
    jillian: [
      'Jillian Bilden. Small agent, but a mighty one. Purple hair.',
      'Ex bank teller and court administration. Dogs Goose and James.',
    ],
    joel: [
      'Joel. Blond mentor and lender.',
      'The file comes in approved. He walks the desk through it.',
    ],
    jordan: [
      'Jordan Hess. Blond, short beard. Licensed May 2026.',
      'Eleven years of concrete and carpentry. First-time buyers are the work.',
      'A Cohasset cabin foundation needs the eye he had before the license.',
    ],
    kaila: [
      'Kaila Wass. Brown hair. Ex math teacher. Four-generation farm family.',
      'She knows a guy north of Grand Rapids. Onions are the arch nemesis.',
    ],
    liz: [
      'Liz Rein. COO. Second in command of the whole company. She really runs the show.',
      'A decade as a commercial real estate and construction litigator.',
      'One hundred items. Complete sentences.',
    ],
    malcolm: [
      'Malcolm Wallaker. Office leader in Grand Rapids. Licensed in 2019.',
      'Itasca County\'s top agent in 2023. Herald Review Best Realtor in 2023 and 2025.',
      'Pull up a chair. The Office Cup is a desk score.',
    ],
    matt: [
      'Matt Huebscher. The beard is black. The office joke is that it could cure cancer.',
      'Ex home services. He flips houses found on Facebook Marketplace.',
    ],
    parker: [
      'Parker Pemberton. CEO. Reddish-blond hair.',
      'He ran the No. 1 eXp team worldwide and launched PembertonRE in September 2025.',
      'It started with a handbook and a cubicle.',
    ],
    bekkah: [
      'Rebekkah Anderson. Bekkah. Blond. Wise Elephant Consulting.',
      'Grant finder and public-art multimedia. Listings in Tower and on Lake Vermilion.',
    ],
    scotty: [
      'Scotty Puglisi. Blond. Teacher, about a year in.',
      'Everything is figure-out-able!',
    ],
    stephanie: [
      'Stephanie Mascarenas. Blond. Hoyt Lakes since 2011.',
      'A decade as a BCBS claims processor. Cirque du Soleil and watercolor.',
      'She can sell any home.',
    ],
    tania: [
      'Tania Suonvieri. Blond. Lifelong Hibbing. Iron Range expert.',
      'Ex healthcare and brokerage office manager. Most-reviewed on the North Team Zillow profile.',
    ],
  };

  G.Npcs = {
    lines: function (id) {
      return (LINES[id] || ['The desk is open.']).slice();
    },
  };
})();
