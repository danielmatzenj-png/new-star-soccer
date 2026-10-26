// Career Hub UI, Tabs, Modals, and Toasts
const NSSUI = (() => {
  let activeTab = 'overview';
  let lastSlots = { r1: '⚽', r2: '🏆', r3: '⭐', win: 0 };

  function updateHeader() {
    const s = NSSState.get();
    if (!s) return;
    document.getElementById('top-bar').classList.remove('hidden');
    document.getElementById('hdr-level').textContent = s.starLevel;
    document.getElementById('hdr-name').textContent = `${s.name} (${s.age}a)`;
    const club = NSSData.leagues[s.country].tiers[s.tier].clubs[s.clubIdx];
    const tierName = NSSData.leagues[s.country].tiers[s.tier].name;
    document.getElementById('hdr-club').textContent = `${club.name} • ${tierName}`;
    document.getElementById('hdr-nrg-bar').style.width = `${s.nrg}%`;
    document.getElementById('hdr-nrg-val').textContent = `${s.nrg}%`;
    document.getElementById('hdr-money').textContent = s.money;
  }

  function switchTab(tabName) {
    activeTab = tabName;
    document.querySelectorAll('.nav-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    renderHub();
  }

  function renderHub() {
    updateHeader();
    const container = document.getElementById('hub-content');
    const s = NSSState.get();
    if (!s) return;

    if (activeTab === 'overview') renderOverviewTab(container, s);
    else if (activeTab === 'skills') renderSkillsTab(container, s);
    else if (activeTab === 'relations') renderRelationsTab(container, s);
    else if (activeTab === 'shop') renderShopTab(container, s);
    else if (activeTab === 'casino') renderCasinoTab(container, s);
  }

  // TAB 1: CLUB / NEXT MATCH / LEAGUE TABLE / STATS
  function renderOverviewTab(container, s) {
    const fix = NSSState.getCurrentMatchFixture();
    const leagueInfo = NSSData.leagues[s.country];
    const tierInfo = leagueInfo.tiers[s.tier];
    const starterStatus = s.relations.boss >= 35 ? 'TITULAR' : 'SUPLENTE (Entra 2ª Parte)';

    const tableRowsHtml = s.table
      .map(
        (r, i) => `
      <tr class="${r.idx === s.clubIdx ? 'my-team-row' : ''}">
        <td>${i + 1}</td>
        <td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${r.color};margin-right:5px;"></span>${r.name}</td>
        <td>${r.played}</td>
        <td>${r.gf - r.ga}</td>
        <td><strong>${r.pts}</strong></td>
      </tr>
    `
      )
      .join('');

    container.innerHTML = `
      <div class="next-match-banner">
        <div style="font-size:11px;color:#93c5fd;font-weight:800;">
          ${leagueInfo.flag} ${tierInfo.name.toUpperCase()} • JORNADA ${s.week} DE ${s.maxWeeks}
        </div>
        <div class="matchup-row">
          <div class="club-pill">
            <div class="club-crest" style="background:${fix.homeClub.color}">${fix.homeClub.name.slice(0, 2).toUpperCase()}</div>
            <div style="font-size:12px;font-weight:900;">${fix.homeClub.name}</div>
          </div>
          <div class="vs-badge">VS</div>
          <div class="club-pill">
            <div class="club-crest" style="background:${fix.awayClub.color}">${fix.awayClub.name.slice(0, 2).toUpperCase()}</div>
            <div style="font-size:12px;font-weight:900;">${fix.awayClub.name}</div>
          </div>
        </div>
        <div style="font-size:11px;color:#fde047;margin-bottom:10px;">
          Estado: <strong>${starterStatus}</strong> | Sueldo: <strong>$${s.wage}</strong> (+$${s.goalBonus}/gol)
        </div>
        <button id="btn-play-match" class="btn-nss btn-green btn-lg" style="width:100%;">
          ⚽ ¡JUGAR PARTIDO!
        </button>
      </div>

      <div class="card">
        <div class="section-title">
          <span>🏆 CLASIFICACIÓN (${tierInfo.name})</span>
          <span>Temp. ${s.season}</span>
        </div>
        <table class="league-table">
          <thead>
            <tr><th>#</th><th>Club</th><th>PJ</th><th>DG</th><th>PTS</th></tr>
          </thead>
          <tbody>${tableRowsHtml}</tbody>
        </table>
      </div>

      <div class="card">
        <div class="section-title">
          <span>📊 ESTADÍSTICAS DE CARRERA</span>
          <span>Nivel ★${s.starLevel} (${s.xp}/${s.xpNext} XP)</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;text-align:center;font-size:11px;">
          <div style="background:#0f172a;padding:6px;border-radius:6px;">
            <div style="color:#94a3b8;">PARTIDOS</div>
            <div style="font-size:15px;font-weight:900;color:#fff;">${s.stats.matches}</div>
          </div>
          <div style="background:#0f172a;padding:6px;border-radius:6px;">
            <div style="color:#94a3b8;">GOLES</div>
            <div style="font-size:15px;font-weight:900;color:#4ade80;">${s.stats.goals}</div>
          </div>
          <div style="background:#0f172a;padding:6px;border-radius:6px;">
            <div style="color:#94a3b8;">ASISTENCIAS</div>
            <div style="font-size:15px;font-weight:900;color:#38bdf8;">${s.stats.assists}</div>
          </div>
          <div style="background:#0f172a;padding:6px;border-radius:6px;">
            <div style="color:#94a3b8;">ESTRELLA MVP</div>
            <div style="font-size:15px;font-weight:900;color:#facc15;">${s.stats.starManAwards}</div>
          </div>
          <div style="background:#0f172a;padding:6px;border-radius:6px;">
            <div style="color:#94a3b8;">TROFEOS</div>
            <div style="font-size:15px;font-weight:900;color:#f59e0b;">${s.stats.trophies}</div>
          </div>
          <div style="background:#0f172a;padding:6px;border-radius:6px;">
            <div style="color:#94a3b8;">ESTILO VIDA</div>
            <div style="font-size:15px;font-weight:900;color:#ec4899;">★${NSSState.getLifestyleStars()}</div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-play-match').addEventListener('click', () => {
      if (s.nrg < 12) {
        toast('¡Estás agotado! Compra una bebida NRG en la Tienda antes de jugar.');
        switchTab('shop');
        return;
      }
      NSSAudio.whistle(false);
      NSSMatch.startMatch();
    });
  }

  // TAB 2: SKILLS & INTERACTIVE TRAINING
  function renderSkillsTab(container, s) {
    const nrgCost = s.hasTrainer ? 12 : 18;
    const skillMeta = [
      { key: 'power', name: 'FUERZA', sub: 'Potencia de disparo' },
      { key: 'technique', name: 'TÉCNICA', sub: 'Efecto (comba) y precisión' },
      { key: 'vision', name: 'VISIÓN', sub: 'Precisión de pases y asistencias' },
      { key: 'pace', name: 'VELOCIDAD', sub: 'Regate en carrera y desmarque' },
      { key: 'freekick', name: 'TIRO LIBRE', sub: 'Especialista a balón parado' },
    ];

    const rowsHtml = skillMeta
      .map((sk) => {
        const baseVal = s.skills[sk.key];
        const effVal = NSSState.getEffectiveSkill(sk.key);
        const bonusTxt = effVal > baseVal ? ` (+${effVal - baseVal}👟)` : '';
        return `
        <div class="bar-row">
          <div class="bar-info">
            <div class="bar-title">${sk.name}</div>
            <div class="bar-sub">${sk.sub}</div>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${effVal}%"></div>
          </div>
          <div class="bar-val">${effVal}${bonusTxt}</div>
          <button class="btn-nss btn-blue btn-sm btn-train" data-skill="${sk.key}" ${baseVal >= 100 ? 'disabled' : ''}>
            ENTRENAR (-${nrgCost}⚡)
          </button>
        </div>
      `;
      })
      .join('');

    container.innerHTML = `
      <div class="card">
        <div class="section-title">
          <span>⚡ HABILIDADES DEL JUGADOR</span>
          <span>${s.hasTrainer ? '🏋️ Entrenador Activo' : 'Sin Entrenador'}</span>
        </div>
        <p style="font-size:11px;color:#cbd5e1;margin-bottom:10px;">
          Entrena en el campo interactivo para mejorar tus atributos o usa bebidas NRG para recuperar energía.
        </p>
        ${rowsHtml}
      </div>
    `;

    container.querySelectorAll('.btn-train').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.skill;
        if (s.nrg < nrgCost) {
          toast(`Necesitas al menos ${nrgCost}% de NRG para entrenar.`);
          return;
        }
        s.nrg -= nrgCost;
        NSSState.clampRelations();
        updateHeader();

        // Launch interactive pitch training!
        document.getElementById('screen-hub').classList.remove('active');
        document.getElementById('screen-match').classList.add('active');
        NSSPitch.startScenario('train_skill', 0, (res) => {
          document.getElementById('screen-match').classList.remove('active');
          document.getElementById('screen-hub').classList.add('active');

          const gain = res.success ? (s.hasTrainer ? 5 : 4) : 1;
          s.skills[key] = Math.min(100, s.skills[key] + gain);
          NSSState.addXP(res.success ? 25 : 8);
          NSSState.save();
          toast(
            res.success
              ? `¡Entrenamiento superado! +${gain} en habilidad`
              : `Fallaste la diana, pero ganas +${gain} por practicar`
          );
          renderHub();
        });
      });
    });
  }

  // TAB 3: RELATIONSHIPS (Boss, Team, Fans, Girlfriend, Sponsor)
  function renderRelationsTab(container, s) {
    const relMeta = [
      { key: 'boss', name: 'ENTRENADOR (JEFE)', sub: 'Define si eres Titular o Suplente', act: 'Charlar (15⚡)' },
      { key: 'team', name: 'COMPAÑEROS', sub: 'Te pasan más balones en el partido', act: 'Invitar cena ($20)' },
      { key: 'fans', name: 'AFICIÓN', sub: 'Aumenta tu valoración y fama', act: 'Firmar autógrafos (12⚡)' },
    ];

    const rowsHtml = relMeta
      .map(
        (r) => `
      <div class="bar-row">
        <div class="bar-info">
          <div class="bar-title">${r.name}</div>
          <div class="bar-sub">${r.sub}</div>
        </div>
        <div class="bar-track">
          <div class="bar-fill rel-fill" style="width:${s.relations[r.key]}%"></div>
        </div>
        <div class="bar-val">${s.relations[r.key]}%</div>
        <button class="btn-nss btn-green btn-sm btn-rel-boost" data-rel="${r.key}">${r.act}</button>
      </div>
    `
      )
      .join('');

    // Girlfriend panel
    const gfHtml = s.hasGirlfriend
      ? `
        <div class="bar-row">
          <div class="bar-info">
            <div class="bar-title">❤️ ${s.girlfriendName}</div>
            <div class="bar-sub">Da bono de felicidad post-partido</div>
          </div>
          <div class="bar-track">
            <div class="bar-fill rel-fill" style="width:${s.relations.girlfriend}%"></div>
          </div>
          <div class="bar-val">${s.relations.girlfriend}%</div>
          <button id="btn-gf-gift" class="btn-nss btn-gold btn-sm">Regalo ($25)</button>
        </div>
      `
      : `
        <div style="background:#0f172a;padding:10px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div>
            <div style="font-size:12px;font-weight:900;color:#f43f5e;">❤️ SIN PAREJA ACTUALMENTE</div>
            <div style="font-size:10px;color:#94a3b8;">Requiere al menos ★1 de Estilo de Vida para salir a conocer gente</div>
          </div>
          <button id="btn-find-gf" class="btn-nss btn-blue btn-sm">Conocer (15⚡)</button>
        </div>
      `;

    // Sponsor panel
    const currentSp = NSSData.sponsors.find((sp) => sp.id === s.activeSponsorId);
    const spHtml = currentSp
      ? `
        <div class="bar-row">
          <div class="bar-info">
            <div class="bar-title">${currentSp.ico} ${currentSp.name}</div>
            <div class="bar-sub">Paga $${currentSp.payPerMatch} por cada partido</div>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${s.relations.sponsor}%"></div>
          </div>
          <div class="bar-val">${s.relations.sponsor}%</div>
          <button id="btn-sp-event" class="btn-nss btn-blue btn-sm">Evento (12⚡)</button>
        </div>
      `
      : `
        <div style="background:#0f172a;padding:10px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:12px;font-weight:900;color:#facc15;">💼 SIN PATROCINADOR</div>
            <div style="font-size:10px;color:#94a3b8;">Alcanza Nivel ★2+ para firmar contratos publicitarios</div>
          </div>
          <button id="btn-find-sp" class="btn-nss btn-gold btn-sm">Buscar Sponsor</button>
        </div>
      `;

    container.innerHTML = `
      <div class="card">
        <div class="section-title">
          <span>❤️ RELACIONES Y CONTRATOS</span>
          <button id="btn-renegotiate" class="btn-nss btn-gold btn-sm">Negociar Sueldo ($${s.wage})</button>
        </div>
        ${rowsHtml}
        ${gfHtml}
        ${spHtml}
      </div>
    `;

    container.querySelectorAll('.btn-rel-boost').forEach((btn) => {
      btn.addEventListener('click', () => {
        const k = btn.dataset.rel;
        if (k === 'boss') {
          if (s.nrg < 15) return toast('Necesitas 15% NRG.');
          s.nrg -= 15;
          s.relations.boss += 16;
          toast('Entrenaste tácticas extra con el míster (+16% Jefe)');
        } else if (k === 'team') {
          if (s.money < 20) return toast('Necesitas $20 StarBucks.');
          s.money -= 20;
          s.relations.team += 18;
          toast('Pagaste la cena del vestuario (+18% Compañeros)');
        } else if (k === 'fans') {
          if (s.nrg < 12) return toast('Necesitas 12% NRG.');
          s.nrg -= 12;
          s.relations.fans += 18;
          toast('Firmaste camisetas tras el entreno (+18% Afición)');
        }
        NSSAudio.cash();
        NSSState.clampRelations();
        NSSState.save();
        renderHub();
      });
    });

    const btnReneg = document.getElementById('btn-renegotiate');
    if (btnReneg) {
      btnReneg.addEventListener('click', () => {
        if (s.relations.boss < 65) {
          toast('El Entrenador pide al menos 65% de relación para renovar contrato.');
          return;
        }
        s.relations.boss -= 20;
        NSSMinigames.openContractNegotiationModal(() => renderHub());
      });
    }

    const btnFindGf = document.getElementById('btn-find-gf');
    if (btnFindGf) {
      btnFindGf.addEventListener('click', () => {
        if (NSSState.getLifestyleStars() < 1) {
          toast('Compra al menos un artículo de Estilo de Vida en la Tienda primero.');
          return;
        }
        if (s.nrg < 15) return toast('Necesitas 15% NRG.');
        s.nrg -= 15;
        const names = ['Sofía (Modelo)', 'Valentina (Actriz)', 'Lucía (Influencer)', 'Camila (Cantante)'];
        s.hasGirlfriend = true;
        s.girlfriendName = names[Math.floor(Math.random() * names.length)];
        s.relations.girlfriend = 70;
        NSSAudio.levelUp();
        NSSState.save();
        toast(`¡Ahora sales con ${s.girlfriendName}!`);
        renderHub();
      });
    }

    const btnGfGift = document.getElementById('btn-gf-gift');
    if (btnGfGift) {
      btnGfGift.addEventListener('click', () => {
        if (s.money < 25) return toast('Necesitas $25.');
        s.money -= 25;
        s.relations.girlfriend += 22;
        NSSState.clampRelations();
        NSSState.save();
        NSSAudio.cash();
        toast(`¡A ${s.girlfriendName} le encantó el regalo! (+22%)`);
        renderHub();
      });
    }

    const btnFindSp = document.getElementById('btn-find-sp');
    if (btnFindSp) {
      btnFindSp.addEventListener('click', () => {
        const eligible = NSSData.sponsors.filter((sp) => s.starLevel >= sp.minStar);
        if (eligible.length === 0) {
          toast('Necesitas al menos Nivel ★2 para atraer patrocinadores.');
          return;
        }
        const best = eligible[eligible.length - 1];
        s.activeSponsorId = best.id;
        s.relations.sponsor = 75;
        NSSAudio.cash();
        NSSState.save();
        toast(`¡Firmaste con ${best.name} ($${best.payPerMatch}/partido)!`);
        renderHub();
      });
    }

    const btnSpEvent = document.getElementById('btn-sp-event');
    if (btnSpEvent) {
      btnSpEvent.addEventListener('click', () => {
        if (s.nrg < 12) return toast('Necesitas 12% NRG.');
        s.nrg -= 12;
        s.relations.sponsor += 20;
        NSSState.clampRelations();
        NSSState.save();
        NSSAudio.cash();
        toast('Grabaste un spot publicitario (+20% Patrocinador)');
        renderHub();
      });
    }
  }

  // TAB 4: SHOP (NRG Drinks, Boots, Staff, Lifestyle)
  function renderShopTab(container, s) {
    const drinksHtml = NSSData.consumables
      .map(
        (d) => `
      <div class="shop-item">
        <div class="shop-ico">${d.ico}</div>
        <div class="shop-name">${d.name}</div>
        <div class="shop-desc">${d.desc}</div>
        <button class="btn-nss btn-green btn-sm btn-buy-drink" data-id="${d.id}">COMPRAR $${d.price}</button>
      </div>
    `
      )
      .join('');

    const bootsHtml = NSSData.boots
      .map((b) => {
        const owned = s.ownedBoots === b.id;
        return `
        <div class="shop-item ${owned ? 'owned' : ''}">
          <div class="shop-ico">${b.ico}</div>
          <div class="shop-name">${b.name}</div>
          <div class="shop-desc">${b.bonusText}</div>
          <button class="btn-nss ${owned ? 'btn-gold' : 'btn-blue'} btn-sm btn-buy-boot" data-id="${b.id}" ${owned ? 'disabled' : ''}>
            ${owned ? 'EQUIPADAS' : `COMPRAR $${b.price}`}
          </button>
        </div>
      `;
      })
      .join('');

    const lifeHtml = NSSData.lifestyle
      .map((item) => {
        const owned = s.ownedLifestyle.includes(item.id);
        return `
        <div class="shop-item ${owned ? 'owned' : ''}">
          <div class="shop-ico">${item.ico}</div>
          <div class="shop-name">${item.name}</div>
          <div class="shop-desc">${item.desc}</div>
          <button class="btn-nss ${owned ? 'btn-gold' : 'btn-green'} btn-sm btn-buy-life" data-id="${item.id}" ${owned ? 'disabled' : ''}>
            ${owned ? 'EN PROPIEDAD' : `COMPRAR $${item.price}`}
          </button>
        </div>
      `;
      })
      .join('');

    container.innerHTML = `
      <div class="card">
        <div class="section-title"><span>🥤 BEBIDAS ENERGÉTICAS (NRG)</span></div>
        <div class="shop-grid">${drinksHtml}</div>
      </div>

      <div class="card">
        <div class="section-title"><span>👟 BOTAS Y AGENTES</span></div>
        <div class="shop-grid">
          ${bootsHtml}
          <div class="shop-item ${s.hasTrainer ? 'owned' : ''}">
            <div class="shop-ico">🏋️</div>
            <div class="shop-name">Entrenador Personal</div>
            <div class="shop-desc">-30% coste NRG al entrenar</div>
            <button id="btn-buy-trainer" class="btn-nss btn-blue btn-sm" ${s.hasTrainer ? 'disabled' : ''}>
              ${s.hasTrainer ? 'CONTRATADO' : 'CONTRATAR $140'}
            </button>
          </div>
          <div class="shop-item ${s.hasAgent ? 'owned' : ''}">
            <div class="shop-ico">🕶️</div>
            <div class="shop-name">Agente FIFA VIP</div>
            <div class="shop-desc">+40% sueldo en tus contratos</div>
            <button id="btn-buy-agent" class="btn-nss btn-blue btn-sm" ${s.hasAgent ? 'disabled' : ''}>
              ${s.hasAgent ? 'CONTRATADO' : 'CONTRATAR $220'}
            </button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="section-title">
          <span>🏰 ESTILO DE VIDA (LIFESTYLE)</span>
          <span>★${NSSState.getLifestyleStars()} Estrellas</span>
        </div>
        <div class="shop-grid">${lifeHtml}</div>
      </div>
    `;

    container.querySelectorAll('.btn-buy-drink').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = NSSData.consumables.find((x) => x.id === btn.dataset.id);
        if (s.money < item.price) return toast('No tienes suficientes StarBucks ($).');
        if (s.nrg >= 100) return toast('Tu energía ya está al 100%.');
        s.money -= item.price;
        s.nrg = Math.min(100, s.nrg + item.nrg);
        NSSAudio.cash();
        NSSState.save();
        toast(`¡Tomaste ${item.name}! Energía al ${s.nrg}%`);
        renderHub();
      });
    });

    container.querySelectorAll('.btn-buy-boot').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = NSSData.boots.find((x) => x.id === btn.dataset.id);
        if (s.money < item.price) return toast('No tienes suficientes StarBucks ($).');
        s.money -= item.price;
        s.ownedBoots = item.id;
        NSSAudio.levelUp();
        NSSState.save();
        toast(`¡Equipaste ${item.name}!`);
        renderHub();
      });
    });

    container.querySelectorAll('.btn-buy-life').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = NSSData.lifestyle.find((x) => x.id === btn.dataset.id);
        if (s.money < item.price) return toast('No tienes suficientes StarBucks ($).');
        s.money -= item.price;
        s.ownedLifestyle.push(item.id);
        NSSState.addXP(item.stars * 18);
        NSSAudio.cash();
        NSSState.save();
        toast(`¡Compraste ${item.name}! (+${item.stars}★ Estilo de Vida)`);
        renderHub();
      });
    });

    const btnTrainer = document.getElementById('btn-buy-trainer');
    if (btnTrainer) {
      btnTrainer.addEventListener('click', () => {
        if (s.money < 140) return toast('Necesitas $140.');
        s.money -= 140;
        s.hasTrainer = true;
        NSSAudio.cash();
        NSSState.save();
        toast('¡Contrataste al Entrenador Personal!');
        renderHub();
      });
    }

    const btnAgent = document.getElementById('btn-buy-agent');
    if (btnAgent) {
      btnAgent.addEventListener('click', () => {
        if (s.money < 220) return toast('Necesitas $220.');
        s.money -= 220;
        s.hasAgent = true;
        NSSAudio.cash();
        NSSState.save();
        toast('¡Contrataste al Agente FIFA VIP!');
        renderHub();
      });
    }
  }

  // TAB 5: CASINO (Blackjack & Slots)
  function renderCasinoTab(container, s) {
    const bj = NSSMinigames.getBlackjack();
    const renderCards = (cards) =>
      cards
        .map((c) => `<div class="playing-card ${c.isRed ? 'red' : ''}">${c.label}</div>`)
        .join('');

    container.innerHTML = `
      <div class="card" style="text-align:center;">
        <div class="section-title"><span>🎰 TRAGAMONEDAS NEW STAR</span><span>Premio hasta x12</span></div>
        <div class="slot-machine">
          <div class="slot-reel">${lastSlots.r1}</div>
          <div class="slot-reel">${lastSlots.r2}</div>
          <div class="slot-reel">${lastSlots.r3}</div>
        </div>
        <div style="font-size:12px;color:#fde047;margin-bottom:8px;font-weight:800;">
          ${lastSlots.win > 0 ? `¡GANASTE $${lastSlots.win}!` : 'Junta 2 o 3 símbolos iguales'}
        </div>
        <div style="display:flex;gap:8px;justify-content:center;">
          <button class="btn-nss btn-green btn-slot" data-bet="5">TIRAR ($5)</button>
          <button class="btn-nss btn-gold btn-slot" data-bet="20">TIRAR ($20)</button>
          <button class="btn-nss btn-red btn-slot" data-bet="50">TIRAR ($50)</button>
        </div>
      </div>

      <div class="card" style="text-align:center;">
        <div class="section-title"><span>🃏 BLACKJACK 21</span><span>Paga x2</span></div>
        ${
          bj
            ? `
          <div style="font-size:11px;color:#94a3b8;">BANCA (${NSSMinigames.handScore(bj.dealer)})</div>
          <div class="cards-row">${renderCards(bj.dealer)}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:6px;">TU MANO (${NSSMinigames.handScore(bj.player)})</div>
          <div class="cards-row">${renderCards(bj.player)}</div>
          <div style="font-size:12px;color:#fde047;font-weight:900;margin:8px 0;">${bj.msg}</div>
          ${
            !bj.done
              ? `
            <div style="display:flex;gap:8px;justify-content:center;">
              <button id="btn-bj-hit" class="btn-nss btn-green">PEDIR CARTA</button>
              <button id="btn-bj-stand" class="btn-nss btn-gold">PLANTARSE</button>
            </div>
          `
              : `
            <div style="display:flex;gap:8px;justify-content:center;">
              <button class="btn-nss btn-blue btn-bj-start" data-bet="10">JUGAR $10</button>
              <button class="btn-nss btn-gold btn-bj-start" data-bet="30">JUGAR $30</button>
            </div>
          `
          }
        `
            : `
          <p style="font-size:12px;color:#cbd5e1;margin:10px 0;">Suma 21 o acércate más que el crupier sin pasarte.</p>
          <div style="display:flex;gap:8px;justify-content:center;">
            <button class="btn-nss btn-blue btn-bj-start" data-bet="10">APOSTAR $10</button>
            <button class="btn-nss btn-gold btn-bj-start" data-bet="30">APOSTAR $30</button>
          </div>
        `
        }
      </div>
    `;

    container.querySelectorAll('.btn-slot').forEach((btn) => {
      btn.addEventListener('click', () => {
        const bet = parseInt(btn.dataset.bet, 10);
        NSSMinigames.spinSlots(bet, (res) => {
          lastSlots = res;
          renderHub();
        });
      });
    });

    container.querySelectorAll('.btn-bj-start').forEach((btn) => {
      btn.addEventListener('click', () => {
        const bet = parseInt(btn.dataset.bet, 10);
        NSSMinigames.startBlackjack(bet);
        renderHub();
      });
    });

    const btnHit = document.getElementById('btn-bj-hit');
    if (btnHit) {
      btnHit.addEventListener('click', () => {
        NSSMinigames.hitBlackjack();
        renderHub();
      });
    }

    const btnStand = document.getElementById('btn-bj-stand');
    if (btnStand) {
      btnStand.addEventListener('click', () => {
        NSSMinigames.standBlackjack();
        renderHub();
      });
    }
  }

  // MODAL & TOAST HELPERS
  function showModal(title, htmlBody, actions = []) {
    document.getElementById('modal-header').textContent = title;
    document.getElementById('modal-body').innerHTML = htmlBody;
    const actBox = document.getElementById('modal-actions');
    actBox.innerHTML = '';

    actions.forEach((a) => {
      const btn = document.createElement('button');
      btn.className = `btn-nss ${a.cls || 'btn-green'}`;
      btn.textContent = a.label;
      btn.addEventListener('click', () => {
        NSSAudio.click();
        if (a.onClick) a.onClick();
      });
      actBox.appendChild(btn);
    });

    document.getElementById('modal-overlay').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }

  let toastTimer = null;
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.add('hidden');
    }, 2600);
  }

  return {
    updateHeader,
    switchTab,
    renderHub,
    showModal,
    closeModal,
    toast,
  };
})();
