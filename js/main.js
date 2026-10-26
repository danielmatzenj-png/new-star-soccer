// Match Commentary Engine, Dilemmas, Season End & App Entrypoint
const NSSMatch = (() => {
  let timer = null;
  let minute = 0;
  let homeScore = 0;
  let awayScore = 0;
  let rating = 6.0;
  let myGoals = 0;
  let myAssists = 0;
  let workRate = 'NORMAL'; // 'DESCANSO' | 'NORMAL' | 'ESFUERZO'
  let simSpeed = 1; // 1x or 2x
  let wind = 0;
  let fixture = null;
  let paused = false;

  function startMatch() {
    const s = NSSState.get();
    fixture = NSSState.getCurrentMatchFixture();
    minute = s.relations.boss >= 35 ? 1 : 46; // Subbed on at 46' if Boss relation is low!
    homeScore = 0;
    awayScore = 0;
    rating = 6.0;
    myGoals = 0;
    myAssists = 0;
    workRate = 'NORMAL';
    wind = Math.floor((Math.random() - 0.5) * 24); // -12 to +12 mph

    // If starting on bench in 2nd half, simulate first half score
    if (minute === 46) {
      homeScore = Math.floor(Math.random() * 2);
      awayScore = Math.floor(Math.random() * 2);
    }

    document.getElementById('screen-hub').classList.remove('active');
    document.getElementById('screen-match').classList.add('active');
    document.getElementById('pitch-container').classList.add('hidden');

    document.getElementById('match-home-name').textContent = fixture.homeClub.name;
    document.getElementById('match-away-name').textContent = fixture.awayClub.name;
    document.getElementById('match-home-badge').style.background = fixture.homeClub.color;
    document.getElementById('match-away-badge').style.background = fixture.awayClub.color;
    document.getElementById('btn-workrate').textContent = workRate;

    const windArrow = wind > 0 ? `${wind} mph →` : wind < 0 ? `← ${Math.abs(wind)} mph` : 'Calma';
    document.getElementById('match-wind').textContent = windArrow;

    const feed = document.getElementById('match-feed');
    feed.innerHTML = '';

    addFeedLine(
      0,
      minute === 1
        ? `¡Arranca el partido! Eres TITULAR hoy con ${fixture.myClub.name}.`
        : `Empiezas en el banquillo por baja relación con el Jefe. ¡Entras al 46'!`,
      'highlight-chance'
    );

    updateScoreboardUI();
    paused = false;
    scheduleNextTick();
  }

  function toggleWorkRate() {
    const order = ['NORMAL', 'ESFUERZO', 'DESCANSO'];
    workRate = order[(order.indexOf(workRate) + 1) % order.length];
    document.getElementById('btn-workrate').textContent = workRate;
    NSSAudio.click();
  }

  function toggleSimSpeed() {
    simSpeed = simSpeed === 1 ? 2 : 1;
    document.getElementById('btn-sim-speed').textContent = `${simSpeed}x`;
    NSSAudio.click();
  }

  function scheduleNextTick() {
    if (timer) clearTimeout(timer);
    if (paused) return;
    const delay = simSpeed === 1 ? 330 : 160;
    timer = setTimeout(tickMinute, delay);
  }

  function updateScoreboardUI() {
    document.getElementById('match-home-score').textContent = homeScore;
    document.getElementById('match-away-score').textContent = awayScore;
    document.getElementById('match-clock').textContent = `${minute}'`;
    document.getElementById('match-rating').textContent = rating.toFixed(1);
    NSSUI.updateHeader();
  }

  function addFeedLine(min, text, cls = '') {
    const feed = document.getElementById('match-feed');
    const div = document.createElement('div');
    div.className = `feed-line ${cls}`;
    div.innerHTML = `<span class="feed-min">${min}'</span><span>${text}</span>`;
    feed.appendChild(div);
    const panel = document.getElementById('match-ticker-panel');
    panel.scrollTop = panel.scrollHeight;
  }

  function tickMinute() {
    if (paused) return;
    const s = NSSState.get();

    if (minute >= 90) {
      NSSAudio.whistle(true);
      endMatch();
      return;
    }

    minute++;

    // Energy drain every 5 minutes depending on Work Rate
    if (minute % 5 === 0) {
      const drain = workRate === 'ESFUERZO' ? 2 : workRate === 'NORMAL' ? 1 : 0;
      s.nrg = Math.max(0, s.nrg - drain);
    }

    updateScoreboardUI();

    // Chance calculation for interactive player action!
    // Higher Team relation + Higher NRG + ESFUERZO workrate = more passes to player!
    const teamFactor = s.relations.team / 100;
    const nrgFactor = Math.max(0.25, s.nrg / 100);
    const wrBonus = workRate === 'ESFUERZO' ? 0.045 : workRate === 'DESCANSO' ? -0.03 : 0;
    const myChanceProb = 0.085 + teamFactor * 0.055 * nrgFactor + wrBonus;

    const roll = Math.random();

    if (roll < myChanceProb) {
      triggerPlayerAction();
      return;
    } else if (roll < myChanceProb + 0.042) {
      // Opponent attack!
      if (Math.random() < 0.36) {
        if (fixture.isHome) awayScore++;
        else homeScore++;
        NSSAudio.miss();
        addFeedLine(minute, `⚽ Gol de ${fixture.oppClub.name}. La defensa no pudo despejar.`, 'highlight-bad');
        updateScoreboardUI();
      } else {
        addFeedLine(minute, `🧤 ¡Gran parada del portero de ${fixture.myClub.name} ante el disparo rival!`);
      }
    } else if (roll < myChanceProb + 0.068) {
      // Teammate attack without user
      if (Math.random() < 0.28) {
        if (fixture.isHome) homeScore++;
        else awayScore++;
        NSSAudio.goalCrowd();
        addFeedLine(minute, `⚽ ¡Gol de un compañero para ${fixture.myClub.name}!`, 'highlight-goal');
        updateScoreboardUI();
      } else {
        addFeedLine(minute, `${fixture.myClub.name} toca el balón buscando huecos en el mediocampo.`);
      }
    } else if (minute % 9 === 0) {
      const ambient = [
        'La afición canta en la grada.',
        'Disputa intensa en el círculo central.',
        'El entrenador pide más presión desde la banda.',
        'Balón largo buscando la espalda de la defensa.',
      ];
      addFeedLine(minute, ambient[Math.floor(Math.random() * ambient.length)]);
    }

    scheduleNextTick();
  }

  function triggerPlayerAction() {
    paused = true;
    const s = NSSState.get();
    const types = ['shot', 'pass', 'dribble', 'freekick'];
    const weights = [0.38, 0.32, 0.18, 0.12];
    let r = Math.random();
    let chosen = 'shot';
    for (let i = 0; i < types.length; i++) {
      if (r < weights[i]) {
        chosen = types[i];
        break;
      }
      r -= weights[i];
    }

    const introText = {
      shot: `¡Balón filtrado para ${s.name} en la frontal del área!`,
      pass: `¡${s.name} levanta la cabeza y ve el desmarque de un compañero!`,
      dribble: `¡${s.name} recibe en banda con espacio para encarar en velocidad!`,
      freekick: `¡Falta peligrosa al borde del área! ${s.name} coloca el balón.`,
    };

    addFeedLine(minute, introText[chosen], 'highlight-chance');
    NSSAudio.whistle(false);

    setTimeout(() => {
      NSSPitch.startScenario(chosen, wind, (result) => {
        handleActionOutcome(chosen, result);
      });
    }, 450);
  }

  function handleActionOutcome(chosen, result) {
    const s = NSSState.get();

    if (result.success) {
      if (result.detailType === 'goal') {
        if (fixture.isHome) homeScore++;
        else awayScore++;
        myGoals++;
        s.stats.goals++;
        s.stats.seasonGoals++;
        rating = Math.min(10.0, rating + 1.2);
        s.relations.boss += 6;
        s.relations.fans += 8;
        s.relations.team += 4;
        NSSState.addXP(45);
        addFeedLine(minute, `⚽ ¡¡¡GOOOOL DE ${s.name}!!! Qué definición espectacular.`, 'highlight-goal');
      } else if (result.detailType === 'assist') {
        if (fixture.isHome) homeScore++;
        else awayScore++;
        myAssists++;
        s.stats.assists++;
        s.stats.seasonAssists++;
        s.stats.passCompleted++;
        rating = Math.min(10.0, rating + 0.9);
        s.relations.team += 8;
        s.relations.boss += 5;
        NSSState.addXP(35);
        addFeedLine(minute, `👟 ¡ASISTENCIA DE ${s.name}! Su compañero fusila a la red.`, 'highlight-goal');
      }
    } else {
      rating = Math.max(3.5, rating - 0.3);
      s.relations.boss -= 2;
      if ( chosen === 'shot' && Math.random() < 0.5 ) {
        s.relations.team -= 3; // Teammates annoyed you missed
      }
      addFeedLine(minute, `${result.label} (${s.name} pierde la ocasión).`, 'highlight-bad');
    }

    NSSState.clampRelations();
    updateScoreboardUI();
    paused = false;
    scheduleNextTick();
  }

  function endMatch() {
    paused = true;
    const s = NSSState.get();
    s.stats.matches++;

    const myTeamGoals = fixture.isHome ? homeScore : awayScore;
    const oppTeamGoals = fixture.isHome ? awayScore : homeScore;
    const won = myTeamGoals > oppTeamGoals;
    const drew = myTeamGoals === oppTeamGoals;

    // Star Man (MVP) check
    const isStarMan = rating >= 8.2 || myGoals >= 2 || (myGoals >= 1 && myAssists >= 1);
    if (isStarMan) {
      s.stats.starManAwards++;
      NSSState.addXP(40);
    }

    // Earnings calculation
    const wagePay = s.wage;
    const goalPay = myGoals * s.goalBonus;
    const assistPay = myAssists * s.assistBonus;
    const starManBonus = isStarMan ? 15 : 0;
    const currentSp = NSSData.sponsors.find((sp) => sp.id === s.activeSponsorId);
    const sponsorPay = currentSp && s.relations.sponsor >= 30 ? currentSp.payPerMatch : 0;
    const gfBonus = s.hasGirlfriend && s.relations.girlfriend >= 60 ? 5 : 0;

    const totalEarned = wagePay + goalPay + assistPay + starManBonus + sponsorPay;
    s.money += totalEarned;
    s.nrg = Math.min(100, s.nrg + 12 + gfBonus); // Natural post-match recovery

    if (won) {
      s.relations.boss += 5;
      s.relations.fans += 5;
    } else if (!drew) {
      s.relations.boss -= 4;
      s.relations.fans -= 4;
    }

    NSSState.clampRelations();
    NSSState.recordRoundResults(homeScore, awayScore);
    NSSAudio.cash();

    const resultBanner = won ? '🏆 ¡VICTORIA!' : drew ? '🤝 EMPATE' : '❌ DERROTA';

    NSSUI.showModal(
      `FINAL: ${fixture.homeClub.name} ${homeScore} - ${awayScore} ${fixture.awayClub.name}`,
      `
      <div style="text-align:center;">
        <div style="font-size:18px;font-weight:900;color:#fde047;margin-bottom:6px;">${resultBanner}</div>
        <div style="font-size:13px;margin-bottom:10px;">
          Nota del Partido: <strong>${rating.toFixed(1)}</strong> | Goles: <strong>${myGoals}</strong> | Asistencias: <strong>${myAssists}</strong>
        </div>
        ${
          isStarMan
            ? `<div style="background:#854d0e;border:2px solid #facc15;padding:6px;border-radius:8px;color:#fef08a;font-weight:900;margin-bottom:10px;">
                ⭐ ¡HOMBRE DEL PARTIDO (STAR MAN)! +$15 & +40 XP
               </div>`
            : ''
        }
        <div style="background:#090d16;padding:10px;border-radius:8px;text-align:left;font-size:12px;">
          <div style="display:flex;justify-content:space-between;"><span>Sueldo base:</span><strong>+$${wagePay}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span>Prima por goles (${myGoals}):</span><strong>+$${goalPay}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span>Prima asistencias (${myAssists}):</span><strong>+$${assistPay}</strong></div>
          ${sponsorPay > 0 ? `<div style="display:flex;justify-content:space-between;"><span>Patrocinador:</span><strong>+$${sponsorPay}</strong></div>` : ''}
          <hr style="border-color:#334155;margin:6px 0;" />
          <div style="display:flex;justify-content:space-between;color:#4ade80;font-size:14px;">
            <span>TOTAL GANADO:</span><strong>+$${totalEarned}</strong>
          </div>
        </div>
      </div>
      `,
      [
        {
          label: 'CONTINUAR',
          cls: 'btn-green',
          onClick: () => {
            NSSUI.closeModal();
            document.getElementById('screen-match').classList.remove('active');
            document.getElementById('screen-hub').classList.add('active');
            NSSUI.renderHub();
            checkPostMatchEvents();
          },
        },
      ]
    );
  }

  function checkPostMatchEvents() {
    const s = NSSState.get();

    // End of Season check!
    if (s.week > s.maxWeeks) {
      handleSeasonEnd();
      return;
    }

    // 40% chance of an interactive NSS Dilemma (Press, Sponsor, Fans, Girlfriend)
    if (Math.random() < 0.42) {
      const d = NSSData.dilemmas[Math.floor(Math.random() * NSSData.dilemmas.length)];
      const applyEff = (eff) => {
        if (eff.boss) s.relations.boss += eff.boss;
        if (eff.team) s.relations.team += eff.team;
        if (eff.fans) s.relations.fans += eff.fans;
        if (eff.sponsor) s.relations.sponsor += eff.sponsor;
        if (eff.girlfriend) s.relations.girlfriend += eff.girlfriend;
        if (eff.nrg) s.nrg += eff.nrg;
        if (eff.money) s.money = Math.max(0, s.money + eff.money);
        NSSState.clampRelations();
        NSSState.save();
        NSSUI.closeModal();
        NSSUI.renderHub();
      };

      NSSUI.showModal(d.title, `<p>${d.text}</p>`, [
        { label: d.optA.label, cls: 'btn-blue', onClick: () => applyEff(d.optA.eff) },
        { label: d.optB.label, cls: 'btn-gold', onClick: () => applyEff(d.optB.eff) },
      ]);
    }
  }

  function handleSeasonEnd() {
    const s = NSSState.get();
    const myRank = s.table.findIndex((r) => r.idx === s.clubIdx) + 1;
    const wonTitle = myRank === 1;
    const promoted = myRank <= 2 && s.tier < 2;

    if (wonTitle) {
      s.stats.trophies++;
      s.money += 150;
      NSSAudio.levelUp();
    }

    let summaryHtml = `
      <div style="text-align:center;">
        <p style="font-size:15px;font-weight:900;color:#fde047;margin-bottom:8px;">
          FIN DE LA TEMPORADA ${s.season} (${s.age} años)
        </p>
        <p style="margin-bottom:8px;">
          Posición final de tu equipo: <strong>#${myRank}</strong><br/>
          Tus Goles en temporada: <strong>${s.stats.seasonGoals}</strong> | Asistencias: <strong>${s.stats.seasonAssists}</strong>
        </p>
        ${wonTitle ? '<div style="color:#4ade80;font-weight:900;margin-bottom:8px;">🏆 ¡CAMPEÓN DE LIGA! Bono +$150</div>' : ''}
        ${promoted ? '<div style="color:#38bdf8;font-weight:900;margin-bottom:8px;">⬆️ ¡ASCENSO A DIVISIÓN SUPERIOR!</div>' : ''}
      </div>
    `;

    // Offer transfer options or stay
    const nextTier = promoted ? Math.min(2, s.tier + 1) : Math.min(2, s.tier + (s.stats.seasonGoals >= 6 ? 1 : 0));
    const targetClubs = NSSData.leagues[s.country].tiers[nextTier].clubs;
    const randomOfferIdx = Math.floor(Math.random() * targetClubs.length);
    const offerClub = targetClubs[randomOfferIdx];

    NSSUI.showModal('🏅 RESUMEN DE TEMPORADA Y MERCADO', summaryHtml, [
      {
        label: promoted
          ? `SEGUIR EN TU CLUB EN ${NSSData.leagues[s.country].tiers[nextTier].name.toUpperCase()}`
          : 'RENOVAR Y SEGUIR EN TU CLUB ACTUAL',
        cls: 'btn-green',
        onClick: () => {
          s.age++;
          s.season++;
          if (promoted) s.tier = nextTier;
          NSSState.initSeasonTableAndFixtures();
          NSSUI.closeModal();
          NSSMinigames.openContractNegotiationModal(() => NSSUI.renderHub());
        },
      },
      {
        label: `✈️ FICHAR POR ${offerClub.name.toUpperCase()} (${NSSData.leagues[s.country].tiers[nextTier].name})`,
        cls: 'btn-gold',
        onClick: () => {
          s.age++;
          s.season++;
          s.tier = nextTier;
          s.clubIdx = randomOfferIdx;
          NSSState.initSeasonTableAndFixtures();
          NSSUI.closeModal();
          NSSMinigames.openContractNegotiationModal(() => NSSUI.renderHub());
        },
      },
    ]);
  }

  return {
    startMatch,
    toggleWorkRate,
    toggleSimSpeed,
  };
})();

// App Initialization
window.addEventListener('DOMContentLoaded', () => {
  NSSPitch.init();

  // Check if save exists
  const btnCont = document.getElementById('btn-continue-career');
  const btnReset = document.getElementById('btn-reset-save');
  if (NSSState.hasSave()) {
    btnCont.classList.remove('hidden');
    btnReset.classList.remove('hidden');
  }

  document.getElementById('btn-start-career').addEventListener('click', () => {
    const name = document.getElementById('inp-player-name').value;
    const nat = document.getElementById('sel-nationality').value;
    NSSAudio.whistle(false);
    NSSState.createInitialState(name, nat);
    document.getElementById('screen-title').classList.remove('active');
    document.getElementById('screen-hub').classList.add('active');
    NSSUI.renderHub();
  });

  btnCont.addEventListener('click', () => {
    if (NSSState.load()) {
      NSSAudio.click();
      document.getElementById('screen-title').classList.remove('active');
      document.getElementById('screen-hub').classList.add('active');
      NSSUI.renderHub();
    }
  });

  btnReset.addEventListener('click', () => {
    NSSState.clearSave();
    btnCont.classList.add('hidden');
    btnReset.classList.add('hidden');
    NSSUI.toast('Partida guardada eliminada.');
  });

  // Bottom navigation tabs
  document.querySelectorAll('.nav-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      NSSAudio.click();
      NSSUI.switchTab(btn.dataset.tab);
    });
  });

  // Sound toggle
  document.getElementById('btn-sound').addEventListener('click', (e) => {
    const on = NSSAudio.toggle();
    e.currentTarget.textContent = on ? '🔊' : '🔇';
  });

  // Match controls
  document.getElementById('btn-workrate').addEventListener('click', () => NSSMatch.toggleWorkRate());
  document.getElementById('btn-sim-speed').addEventListener('click', () => NSSMatch.toggleSimSpeed());
});
