// State management, Save/Load, League Table & Season Progression
const NSSState = (() => {
  const SAVE_KEY = 'NSS_EXACT_SAVE_V1';
  let state = null;

  function createInitialState(playerName, countryCode) {
    const cleanName = (playerName || 'RODRÍGUEZ').trim().toUpperCase();
    const code = NSSData.leagues[countryCode] ? countryCode : 'ES';
    const tierIdx = 0; // Start in 3rd tier (División Bronce) at age 16 like NSS
    const tierData = NSSData.leagues[code].tiers[tierIdx];
    const myClubIdx = 0;

    state = {
      name: cleanName,
      country: code,
      age: 16,
      season: 1,
      week: 1,
      maxWeeks: 14, // 8 teams double round-robin (14 matchdays)
      tier: tierIdx,
      clubIdx: myClubIdx,
      starLevel: 1,
      xp: 0,
      xpNext: 100,
      nrg: 100,
      money: 50,
      wage: 12,
      goalBonus: 5,
      assistBonus: 3,

      // Core 5 NSS Skills (1 to 100)
      skills: {
        power: 28,
        technique: 28,
        vision: 26,
        pace: 30,
        freekick: 25,
      },

      // Core 5 NSS Relationships (0 to 100)
      relations: {
        boss: 55,
        team: 55,
        fans: 50,
        girlfriend: 0,
        sponsor: 0,
      },

      hasGirlfriend: false,
      girlfriendName: '',
      activeSponsorId: null,
      ownedLifestyle: [],
      ownedBoots: null,
      hasTrainer: false,
      hasAgent: false,

      // Career statistics
      stats: {
        matches: 0,
        goals: 0,
        assists: 0,
        passCompleted: 0,
        starManAwards: 0,
        trophies: 0,
        seasonGoals: 0,
        seasonAssists: 0,
      },

      table: [],
      fixtures: [],
    };

    initSeasonTableAndFixtures();
    save();
    return state;
  }

  function initSeasonTableAndFixtures() {
    const clubs = NSSData.leagues[state.country].tiers[state.tier].clubs;
    state.table = clubs.map((c, idx) => ({
      idx,
      name: c.name,
      color: c.color,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      pts: 0,
    }));

    // Round-robin generator for 8 teams (14 rounds)
    const n = clubs.length;
    const teams = clubs.map((_, i) => i);
    const rounds = [];

    for (let r = 0; r < n - 1; r++) {
      const pairs = [];
      for (let i = 0; i < n / 2; i++) {
        const t1 = teams[i];
        const t2 = teams[n - 1 - i];
        pairs.push(r % 2 === 0 ? [t1, t2] : [t2, t1]);
      }
      rounds.push(pairs);
      // Rotate all except first
      teams.splice(1, 0, teams.pop());
    }

    // Second half (reverse home/away)
    const secondHalf = rounds.map((pairs) => pairs.map(([a, b]) => [b, a]));
    state.fixtures = [...rounds, ...secondHalf];
    state.week = 1;
    state.maxWeeks = state.fixtures.length;
    state.stats.seasonGoals = 0;
    state.stats.seasonAssists = 0;
  }

  function getEffectiveSkill(skillName) {
    let val = state.skills[skillName] || 25;
    if (state.ownedBoots) {
      const boot = NSSData.boots.find((b) => b.id === state.ownedBoots);
      if (boot) {
        if (boot.stat === 'all' || boot.stat === skillName) {
          val += boot.boost;
        }
      }
    }
    return Math.min(100, val);
  }

  function getLifestyleStars() {
    return state.ownedLifestyle.reduce((sum, id) => {
      const item = NSSData.lifestyle.find((x) => x.id === id);
      return sum + (item ? item.stars : 0);
    }, 0);
  }

  function addXP(amount) {
    state.xp += amount;
    let leveledUp = false;
    while (state.xp >= state.xpNext) {
      state.xp -= state.xpNext;
      state.starLevel += 1;
      state.xpNext = Math.round(state.xpNext * 1.18 + 30);
      leveledUp = true;
    }
    if (leveledUp) NSSAudio.levelUp();
    save();
    return leveledUp;
  }

  function clampRelations() {
    Object.keys(state.relations).forEach((k) => {
      state.relations[k] = Math.max(0, Math.min(100, Math.round(state.relations[k])));
    });
    state.nrg = Math.max(0, Math.min(100, Math.round(state.nrg)));
  }

  function getCurrentMatchFixture() {
    const roundPairs = state.fixtures[state.week - 1] || state.fixtures[0];
    const pair = roundPairs.find(([h, a]) => h === state.clubIdx || a === state.clubIdx) || roundPairs[0];
    const clubs = NSSData.leagues[state.country].tiers[state.tier].clubs;
    const isHome = pair[0] === state.clubIdx;
    const oppIdx = isHome ? pair[1] : pair[0];
    return {
      homeIdx: pair[0],
      awayIdx: pair[1],
      isHome,
      oppIdx,
      homeClub: clubs[pair[0]],
      awayClub: clubs[pair[1]],
      myClub: clubs[state.clubIdx],
      oppClub: clubs[oppIdx],
    };
  }

  function recordRoundResults(myHomeScore, myAwayScore) {
    const roundPairs = state.fixtures[state.week - 1];
    if (!roundPairs) return;

    roundPairs.forEach(([hIdx, aIdx]) => {
      let hg, ag;
      if (hIdx === state.clubIdx || aIdx === state.clubIdx) {
        hg = myHomeScore;
        ag = myAwayScore;
      } else {
        hg = Math.floor(Math.random() * 4);
        ag = Math.floor(Math.random() * 3);
      }

      const hRow = state.table.find((r) => r.idx === hIdx);
      const aRow = state.table.find((r) => r.idx === aIdx);
      if (!hRow || !aRow) return;

      hRow.played++;
      aRow.played++;
      hRow.gf += hg;
      hRow.ga += ag;
      aRow.gf += ag;
      aRow.ga += hg;

      if (hg > ag) {
        hRow.won++;
        hRow.pts += 3;
        aRow.lost++;
      } else if (hg < ag) {
        aRow.won++;
        aRow.pts += 3;
        hRow.lost++;
      } else {
        hRow.drawn++;
        aRow.drawn++;
        hRow.pts += 1;
        aRow.pts += 1;
      }
    });

    state.table.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const gdB = b.gf - b.ga;
      const gdA = a.gf - a.ga;
      if (gdB !== gdA) return gdB - gdA;
      return b.gf - a.gf;
    });

    state.week++;
    save();
  }

  function save() {
    if (!state) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save state:', e);
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      state = JSON.parse(raw);
      return state;
    } catch (e) {
      return null;
    }
  }

  function hasSave() {
    return !!localStorage.getItem(SAVE_KEY);
  }

  function clearSave() {
    localStorage.removeItem(SAVE_KEY);
    state = null;
  }

  function get() {
    return state;
  }

  return {
    createInitialState,
    initSeasonTableAndFixtures,
    getEffectiveSkill,
    getLifestyleStars,
    addXP,
    clampRelations,
    getCurrentMatchFixture,
    recordRoundResults,
    save,
    load,
    hasSave,
    clearSave,
    get,
  };
})();
