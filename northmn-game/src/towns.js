// Playable geography only: Grand Rapids (home), the Iron Range, and Duluth.
// Do not add towns outside this corridor.
'use strict';

(function () {
  const G = globalThis.G = globalThis.G || {};

  G.TOWNS = [
    { id: 'cohasset', name: 'Cohasset', region: 'home' },
    { id: 'grandrapids', name: 'Grand Rapids', region: 'home', home: true },
    { id: 'coleraine', name: 'Coleraine', region: 'home' },
    { id: 'bovey', name: 'Bovey', region: 'home' },
    { id: 'nashwauk', name: 'Nashwauk', region: 'range' },
    { id: 'keewatin', name: 'Keewatin', region: 'range' },
    { id: 'hibbing', name: 'Hibbing', region: 'range' },
    { id: 'chisholm', name: 'Chisholm', region: 'range' },
    { id: 'buhl', name: 'Buhl', region: 'range' },
    { id: 'mtiron', name: 'Mountain Iron', region: 'range' },
    { id: 'virginia', name: 'Virginia', region: 'range' },
    { id: 'eveleth', name: 'Eveleth', region: 'range' },
    { id: 'gilbert', name: 'Gilbert', region: 'range' },
    { id: 'biwabik', name: 'Biwabik', region: 'range' },
    { id: 'aurora', name: 'Aurora', region: 'range' },
    { id: 'hoytlakes', name: 'Hoyt Lakes', region: 'range' },
    { id: 'hermantown', name: 'Hermantown', region: 'duluth' },
    { id: 'proctor', name: 'Proctor', region: 'duluth' },
    { id: 'duluth', name: 'Duluth', region: 'duluth' },
  ];

  G.REGIONS = {
    home: { id: 'home', label: 'Grand Rapids', short: 'HOME' },
    range: { id: 'range', label: 'Iron Range', short: 'RANGE' },
    duluth: { id: 'duluth', label: 'Duluth', short: 'DULUTH' },
  };

  G.townById = function (id) {
    for (let i = 0; i < G.TOWNS.length; i++) {
      if (G.TOWNS[i].id === id) return G.TOWNS[i];
    }
    return G.TOWNS[1];
  };

  G.townsIn = function (region) {
    return G.TOWNS.filter(function (t) { return t.region === region; });
  };
})();
