// Casino (Blackjack, Slots, Roulette) & Contract Negotiation Minigames (Higher/Lower Card Game like NSS!)
const NSSMinigames = (() => {
  // 1. SLOTS
  const SLOT_SYMBOLS = ['⚽', '🏆', '⭐', '👟', '💎'];

  function spinSlots(bet, callback) {
    const s = NSSState.get();
    if (s.money < bet) {
      NSSUI.toast('No tienes suficientes StarBucks ($)');
      return;
    }
    s.money -= bet;
    NSSAudio.click();

    const r1 = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
    const r2 = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
    const r3 = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];

    let win = 0;
    if (r1 === r2 && r2 === r3) {
      win = r1 === '💎' ? bet * 12 : bet * 6;
    } else if (r1 === r2 || r2 === r3 || r1 === r3) {
      win = bet * 2;
    }

    if (win > 0) {
      s.money += win;
      NSSAudio.cash();
    } else {
      NSSAudio.miss();
    }
    NSSState.save();
    callback({ r1, r2, r3, win });
  }

  // 2. BLACKJACK
  let bjState = null;

  function drawCard() {
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const suits = ['♠', '♥', '♦', '♣'];
    const r = ranks[Math.floor(Math.random() * ranks.length)];
    const suit = suits[Math.floor(Math.random() * suits.length)];
    let val = parseInt(r, 10);
    if (['J', 'Q', 'K'].includes(r)) val = 10;
    if (r === 'A') val = 11;
    return { label: `${r}${suit}`, val, isRed: suit === '♥' || suit === '♦', isAce: r === 'A' };
  }

  function handScore(cards) {
    let sum = cards.reduce((acc, c) => acc + c.val, 0);
    let aces = cards.filter((c) => c.isAce).length;
    while (sum > 21 && aces > 0) {
      sum -= 10;
      aces--;
    }
    return sum;
  }

  function startBlackjack(bet) {
    const s = NSSState.get();
    if (s.money < bet) {
      NSSUI.toast('No tienes suficientes StarBucks ($)');
      return null;
    }
    s.money -= bet;
    NSSAudio.click();
    bjState = {
      bet,
      player: [drawCard(), drawCard()],
      dealer: [drawCard()],
      done: false,
      msg: '¿Pedir carta o Plantarse?',
    };
    if (handScore(bjState.player) === 21) {
      standBlackjack();
    }
    NSSState.save();
    return bjState;
  }

  function hitBlackjack() {
    if (!bjState || bjState.done) return bjState;
    NSSAudio.click();
    bjState.player.push(drawCard());
    const pScore = handScore(bjState.player);
    if (pScore > 21) {
      bjState.done = true;
      bjState.msg = `¡Te pasaste (${pScore})! Pierdes $${bjState.bet}`;
      NSSAudio.miss();
    } else if (pScore === 21) {
      return standBlackjack();
    }
    return bjState;
  }

  function standBlackjack() {
    if (!bjState || bjState.done) return bjState;
    while (handScore(bjState.dealer) < 17) {
      bjState.dealer.push(drawCard());
    }
    const pScore = handScore(bjState.player);
    const dScore = handScore(bjState.dealer);
    const s = NSSState.get();
    bjState.done = true;

    if (dScore > 21 || pScore > dScore) {
      const prize = bjState.bet * 2;
      s.money += prize;
      bjState.msg = `¡GANASTE! (${pScore} vs ${dScore}) +$${prize}`;
      NSSAudio.cash();
    } else if (pScore === dScore) {
      s.money += bjState.bet;
      bjState.msg = `Empate (${pScore}). Recuperas $${bjState.bet}`;
    } else {
      bjState.msg = `La banca gana (${dScore} vs ${pScore}).`;
      NSSAudio.miss();
    }
    NSSState.save();
    return bjState;
  }

  function getBlackjack() {
    return bjState;
  }

  // 3. NSS CONTRACT / RELATIONSHIP HIGHER-LOWER CARD GAME
  function openContractNegotiationModal(onDone) {
    const s = NSSState.get();
    const tierBase = NSSData.leagues[s.country].tiers[s.tier].wageBase;
    const agentMult = s.hasAgent ? 1.4 : 1.0;
    let baseOffer = Math.round((tierBase + s.starLevel * 4) * agentMult);
    let currentCard = 2 + Math.floor(Math.random() * 12); // 2 to 13
    let roundsLeft = 3;

    const renderNegotiation = (statusMsg = 'Adivina si la siguiente carta es MAYOR o MENOR para subir tu sueldo') => {
      const cardNames = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
      const disp = cardNames[currentCard] || currentCard;

      NSSUI.showModal(
        '📝 NEGOCIACIÓN DE CONTRATO',
        `
        <div style="text-align:center;">
          <p style="margin-bottom:8px;">${statusMsg}</p>
          <div style="font-size:16px;color:#facc15;font-weight:900;margin-bottom:10px;">
            Oferta Actual: $${baseOffer}/partido (Bono Gol: $${Math.round(baseOffer * 0.35)})
          </div>
          <div class="cards-row">
            <div class="playing-card" style="width:56px;height:76px;font-size:22px;">${disp}♠</div>
          </div>
          <p style="font-size:11px;color:#94a3b8;margin-top:6px;">Intentos restantes: ${roundsLeft}</p>
        </div>
        `,
        roundsLeft > 0
          ? [
              {
                label: '⬆️ MAYOR (+25% Sueldo)',
                cls: 'btn-green',
                onClick: () => guess(true),
              },
              {
                label: '⬇️ MENOR (+25% Sueldo)',
                cls: 'btn-blue',
                onClick: () => guess(false),
              },
              {
                label: `✅ FIRMAR POR $${baseOffer}/PARTIDO`,
                cls: 'btn-gold',
                onClick: () => finish(),
              },
            ]
          : [
              {
                label: `✅ FIRMAR CONTRATO ($${baseOffer}/PARTIDO)`,
                cls: 'btn-gold',
                onClick: () => finish(),
              },
            ]
      );
    };

    const guess = (isHigher) => {
      let next = 2 + Math.floor(Math.random() * 13);
      while (next === currentCard) next = 2 + Math.floor(Math.random() * 13);
      const won = isHigher ? next > currentCard : next < currentCard;
      currentCard = next;
      roundsLeft--;
      if (won) {
        baseOffer = Math.round(baseOffer * 1.25);
        NSSAudio.cash();
        renderNegotiation('¡Acertaste! El club sube su oferta.');
      } else {
        baseOffer = Math.max(8, Math.round(baseOffer * 0.85));
        roundsLeft = 0;
        NSSAudio.miss();
        renderNegotiation('¡Fallaste! El presidente cierra la oferta final.');
      }
    };

    const finish = () => {
      s.wage = baseOffer;
      s.goalBonus = Math.max(3, Math.round(baseOffer * 0.35));
      s.assistBonus = Math.max(2, Math.round(baseOffer * 0.22));
      NSSState.save();
      NSSUI.closeModal();
      NSSUI.toast(`¡Nuevo contrato firmado: $${s.wage}/partido!`);
      if (onDone) onDone();
    };

    renderNegotiation();
  }

  return {
    spinSlots,
    startBlackjack,
    hitBlackjack,
    standBlackjack,
    getBlackjack,
    handScore,
    openContractNegotiationModal,
  };
})();
