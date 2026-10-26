// Interactive 2D Top-Down Pitch Engine + 3D Ball Impact Spot (Exact NSS Mechanics)
const NSSPitch = (() => {
  let canvas, ctx;
  let spotCanvas, spotCtx;
  let animId = null;

  // Scenario state
  let mode = 'shot'; // 'shot' | 'pass' | 'freekick' | 'dribble' | 'train_skill'
  let onComplete = null;
  let windX = 0; // mph (-15 to +15)

  // Entities on 440 x 580 pitch
  // Goal is at top: y = 42, x from 145 to 295 (width 150)
  const GOAL = { x1: 145, x2: 295, y: 42, depth: 22, crossbarZ: 34 };

  let ball = { x: 220, y: 360, z: 0, vx: 0, vy: 0, vz: 0, spinX: 0, moving: false };
  let player = { x: 220, y: 382, vx: 0, vy: 0 };
  let keeper = { x: 220, y: 50, baseX: 220, vx: 0, diveDir: 0, speed: 2.6 };
  let defenders = [];
  let teammates = [];
  let targetZone = null; // For training or pass target

  // Aiming drag state
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let dragCurr = { x: 0, y: 0 };
  let aimAngle = -Math.PI / 2;
  let aimPower = 0.65; // 0.15 to 1.0

  // Ball impact spot (-1 to +1 on X and Y)
  let impactSpot = { x: 0, y: 0 }; // x: curve, y: height (+y is bottom of ball -> high loft)
  let phase = 'aim'; // 'aim' | 'spot' | 'flight' | 'dribble_run' | 'done'

  function init() {
    canvas = document.getElementById('pitch-canvas');
    ctx = canvas.getContext('2d');
    spotCanvas = document.getElementById('ball-spot-canvas');
    spotCtx = spotCanvas.getContext('2d');

    bindEvents();
    drawSpotWidget();
  }

  function bindEvents() {
    const getPos = (e, c) => {
      const rect = c.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: ((clientX - rect.left) / rect.width) * c.width,
        y: ((clientY - rect.top) / rect.height) * c.height,
      };
    };

    const onDown = (e) => {
      if (phase === 'dribble_run') {
        const p = getPos(e, canvas);
        const dx = p.x - player.x;
        const dy = p.y - player.y;
        const dist = Math.hypot(dx, dy) || 1;
        const spd = 2.6 + NSSState.getEffectiveSkill('pace') * 0.022;
        player.vx = (dx / dist) * spd;
        player.vy = (dy / dist) * spd;
        return;
      }
      if (phase !== 'aim') return;
      const p = getPos(e, canvas);
      isDragging = true;
      dragStart = { x: ball.x, y: ball.y };
      dragCurr = p;
      updateAimFromDrag();
    };

    const onMove = (e) => {
      if (phase === 'dribble_run' && (e.buttons === 1 || e.touches)) {
        const p = getPos(e, canvas);
        const dx = p.x - player.x;
        const dy = p.y - player.y;
        const dist = Math.hypot(dx, dy) || 1;
        const spd = 2.6 + NSSState.getEffectiveSkill('pace') * 0.022;
        player.vx = (dx / dist) * spd;
        player.vy = (dy / dist) * spd;
        return;
      }
      if (!isDragging || phase !== 'aim') return;
      dragCurr = getPos(e, canvas);
      updateAimFromDrag();
    };

    const onUp = () => {
      if (!isDragging || phase !== 'aim') return;
      isDragging = false;
      if (aimPower > 0.12) {
        NSSAudio.click();
        openBallSpotModal();
      }
    };

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); onDown(e); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); onMove(e); }, { passive: false });
    canvas.addEventListener('touchend', (e) => { e.preventDefault(); onUp(); }, { passive: false });

    // Ball Spot Canvas click
    const onSpotSelect = (e) => {
      const p = getPos(e, spotCanvas);
      const cx = spotCanvas.width / 2;
      const cy = spotCanvas.height / 2;
      const r = 74;
      let nx = (p.x - cx) / r;
      let ny = (p.y - cy) / r;
      const mag = Math.hypot(nx, ny);
      if (mag > 0.92) {
        nx = (nx / mag) * 0.92;
        ny = (ny / mag) * 0.92;
      }
      impactSpot = { x: nx, y: ny };
      NSSAudio.click();
      drawSpotWidget();
      updateSpotLabel();
    };

    spotCanvas.addEventListener('mousedown', onSpotSelect);
    spotCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); onSpotSelect(e); }, { passive: false });

    document.getElementById('btn-strike-ball').addEventListener('click', () => {
      executeStrike();
    });
  }

  function updateAimFromDrag() {
    const dx = dragCurr.x - ball.x;
    const dy = dragCurr.y - ball.y;
    const rawDist = Math.hypot(dx, dy);
    if (rawDist < 8) return;

    // Support both pulling back (slingshot) or dragging toward target:
    // If user drags downward away from goal (dy > 20), treat as slingshot pull-back;
    // If user drags upward toward the pitch/goal, point directly where they drag!
    if (dy > 35 && ball.y > 160) {
      aimAngle = Math.atan2(-dy, -dx);
    } else {
      aimAngle = Math.atan2(dy, dx);
    }
    aimPower = Math.min(1.0, Math.max(0.18, rawDist / 170));
  }

  function openBallSpotModal() {
    phase = 'spot';
    impactSpot = { x: 0, y: 0.1 };
    drawSpotWidget();
    updateSpotLabel();
    document.getElementById('ball-spot-modal').classList.remove('hidden');
  }

  function updateSpotLabel() {
    const curveTxt =
      impactSpot.x < -0.25 ? 'Efecto Derecha ↪' :
      impactSpot.x > 0.25 ? '↩ Efecto Izquierda' : 'Recto';
    const loftTxt =
      impactSpot.y > 0.35 ? 'Alto / Vaselina' :
      impactSpot.y < -0.25 ? 'Raso Potente' : 'Media Altura';
    document.getElementById('spot-preview-label').textContent = `Impacto: ${curveTxt} | ${loftTxt}`;
  }

  function drawSpotWidget() {
    if (!spotCtx) return;
    const w = spotCanvas.width;
    const h = spotCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = 76;

    spotCtx.clearRect(0, 0, w, h);

    // 3D Sphere gradient
    const grad = spotCtx.createRadialGradient(cx - 22, cy - 22, 10, cx, cy, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.7, '#e2e8f0');
    grad.addColorStop(1, '#64748b');

    spotCtx.beginPath();
    spotCtx.arc(cx, cy, r, 0, Math.PI * 2);
    spotCtx.fillStyle = grad;
    spotCtx.fill();
    spotCtx.lineWidth = 3;
    spotCtx.strokeStyle = '#1e293b';
    spotCtx.stroke();

    // Classic pentagon pattern
    spotCtx.fillStyle = '#1e293b';
    const drawPentagon = (px, py, pr) => {
      spotCtx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const x = px + Math.cos(a) * pr;
        const y = py + Math.sin(a) * pr;
        if (i === 0) spotCtx.moveTo(x, y);
        else spotCtx.lineTo(x, y);
      }
      spotCtx.closePath();
      spotCtx.fill();
    };
    drawPentagon(cx, cy, 20);
    drawPentagon(cx - 42, cy - 26, 13);
    drawPentagon(cx + 42, cy - 26, 13);
    drawPentagon(cx - 28, cy + 44, 13);
    drawPentagon(cx + 28, cy + 44, 13);

    // Crosshair guide lines
    spotCtx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
    spotCtx.lineWidth = 1;
    spotCtx.beginPath();
    spotCtx.moveTo(cx - r, cy);
    spotCtx.lineTo(cx + r, cy);
    spotCtx.moveTo(cx, cy - r);
    spotCtx.lineTo(cx, cy + r);
    spotCtx.stroke();

    // Selected Red Bullseye
    const sx = cx + impactSpot.x * r;
    const sy = cy + impactSpot.y * r;

    spotCtx.beginPath();
    spotCtx.arc(sx, sy, 12, 0, Math.PI * 2);
    spotCtx.fillStyle = 'rgba(239, 68, 68, 0.85)';
    spotCtx.fill();
    spotCtx.lineWidth = 2.5;
    spotCtx.strokeStyle = '#fde047';
    spotCtx.stroke();

    spotCtx.beginPath();
    spotCtx.arc(sx, sy, 3, 0, Math.PI * 2);
    spotCtx.fillStyle = '#fff';
    spotCtx.fill();
  }

  function executeStrike() {
    document.getElementById('ball-spot-modal').classList.add('hidden');
    NSSAudio.kick();

    const pwrSkill = NSSState.getEffectiveSkill('power');
    const techSkill = NSSState.getEffectiveSkill(mode === 'freekick' ? 'freekick' : 'technique');

    const maxSpeed = 8.4 + (pwrSkill / 100) * 4.5;
    const speed = Math.max(4.2, aimPower * maxSpeed);

    // Accuracy jitter reduced by Technique/Vision
    const jitterMax = (105 - techSkill) * 0.0012;
    const finalAngle = aimAngle + (Math.random() - 0.5) * jitterMax;

    ball.vx = Math.cos(finalAngle) * speed;
    ball.vy = Math.sin(finalAngle) * speed;

    // Loft (vertical Z velocity): striking bottom of ball (impactSpot.y > 0) lifts the ball
    const loftFactor = Math.max(0, impactSpot.y + 0.25);
    ball.vz = loftFactor * (4.2 + aimPower * 3.5);

    // Spin/Curve: striking left of center curves right, striking right of center curves left
    const curveSkillMult = 0.035 + (techSkill / 100) * 0.065;
    ball.spinX = -impactSpot.x * curveSkillMult * speed;

    ball.moving = true;
    phase = 'flight';
  }

  // Launch a scenario ('shot', 'pass', 'freekick', 'dribble', or 'train_skill')
  function startScenario(scenarioType, windVal, callback) {
    mode = scenarioType;
    windX = windVal || 0;
    onComplete = callback;
    isDragging = false;
    impactSpot = { x: 0, y: 0.1 };

    document.getElementById('pitch-container').classList.remove('hidden');
    document.getElementById('ball-spot-modal').classList.add('hidden');

    setupEntitiesForMode(scenarioType);
    if (animId) cancelAnimationFrame(animId);
    loop();
  }

  function setupEntitiesForMode(type) {
    defenders = [];
    teammates = [];
    targetZone = null;
    ball.z = 0;
    ball.vx = 0;
    ball.vy = 0;
    ball.vz = 0;
    ball.spinX = 0;
    ball.moving = false;

    const tierBonus = NSSState.get() ? NSSState.get().tier * 0.55 : 0;
    keeper = {
      x: 220,
      y: 52,
      baseX: 220,
      vx: 0,
      speed: 2.3 + tierBonus,
    };

    const bannerEl = document.getElementById('pitch-banner');
    const instrEl = document.getElementById('pitch-instructions');

    if (type === 'shot') {
      bannerEl.textContent = '⚽ ¡OCASIÓN DE GOL!';
      instrEl.textContent = 'Apunta hacia la portería evitando al portero y defensas';
      ball.x = 120 + Math.random() * 200;
      ball.y = 250 + Math.random() * 140;
      player.x = ball.x;
      player.y = ball.y + 22;
      aimAngle = Math.atan2(GOAL.y - ball.y, 220 - ball.x);
      aimPower = 0.72;
      phase = 'aim';

      // 1 or 2 closing defenders
      const numDef = Math.random() > 0.45 ? 2 : 1;
      for (let i = 0; i < numDef; i++) {
        defenders.push({
          x: 150 + Math.random() * 140,
          y: 130 + Math.random() * (ball.y - 175),
          vx: (Math.random() - 0.5) * 1.4,
          vy: 0,
          patrol: true,
        });
      }
    } else if (type === 'freekick') {
      bannerEl.textContent = '🎯 ¡TIRO LIBRE DIRECTO!';
      instrEl.textContent = 'Usa efecto o altura en el balón para superar la barrera';
      ball.x = 115 + Math.random() * 210;
      ball.y = 290 + Math.random() * 85;
      player.x = ball.x - 10;
      player.y = ball.y + 24;
      aimAngle = Math.atan2(GOAL.y - ball.y, 220 - ball.x);
      aimPower = 0.76;
      phase = 'aim';

      // Defensive Wall of 3-4 players between ball and goal
      const wallDist = 92;
      const angleToGoal = Math.atan2(GOAL.y - ball.y, 220 - ball.x);
      const wx = ball.x + Math.cos(angleToGoal) * wallDist;
      const wy = ball.y + Math.sin(angleToGoal) * wallDist;
      for (let i = -1; i <= 1; i++) {
        defenders.push({
          x: wx + i * 20,
          y: wy,
          vx: 0,
          vy: 0,
          isWall: true,
        });
      }
      keeper.x = ball.x > 220 ? 195 : 245;
    } else if (type === 'pass') {
      bannerEl.textContent = '👟 ¡PASE DE ASISTENCIA!';
      instrEl.textContent = 'Pasa el balón al círculo amarillo delante de tu compañero';
      ball.x = 110 + Math.random() * 220;
      ball.y = 430 + Math.random() * 65;
      player.x = ball.x;
      player.y = ball.y + 22;

      const mateX = ball.x > 220 ? 115 + Math.random() * 70 : 255 + Math.random() * 70;
      const mateY = 185 + Math.random() * 90;
      teammates.push({
        x: mateX,
        y: mateY,
        vx: 0,
        vy: -0.45, // Making a forward run!
      });
      targetZone = { x: mateX, y: mateY - 26, r: 34 };
      aimAngle = Math.atan2(targetZone.y - ball.y, targetZone.x - ball.x);
      aimPower = 0.62;
      phase = 'aim';

      // 2 intercepting defenders
      for (let i = 0; i < 2; i++) {
        defenders.push({
          x: 130 + i * 150,
          y: 250 + Math.random() * 110,
          vx: i === 0 ? 1.3 : -1.3,
          vy: 0,
          patrol: true,
        });
      }
    } else if (type === 'dribble') {
      bannerEl.textContent = '⚡ ¡REGATE EN CARRERA!';
      instrEl.textContent = 'Toca/arrastra en el campo para esquivar a los defensas y entrar al área';
      player.x = 220;
      player.y = 490;
      player.vx = 0;
      player.vy = -1.8;
      ball.x = player.x;
      ball.y = player.y - 14;
      phase = 'dribble_run';

      for (let i = 0; i < 3; i++) {
        defenders.push({
          x: 120 + i * 95,
          y: 230 + i * 75,
          vx: (i % 2 === 0 ? 1 : -1) * (1.5 + tierBonus * 0.4),
          vy: 0.45,
          patrol: true,
        });
      }
    } else if (type === 'train_skill') {
      bannerEl.textContent = '🏋️ ENTRENAMIENTO DE PRECISIÓN';
      instrEl.textContent = 'Golpea la diana dorada o marca gol para subir tu habilidad';
      ball.x = 220;
      ball.y = 370;
      player.x = 220;
      player.y = 394;
      targetZone = {
        x: 165 + Math.random() * 110,
        y: 62,
        r: 28,
      };
      // 2 dummy wall cones
      defenders.push({ x: targetZone.x - 15, y: 215, vx: 0, vy: 0, isWall: true });
      defenders.push({ x: targetZone.x + 15, y: 215, vx: 0, vy: 0, isWall: true });
      keeper.x = 220;
      keeper.speed = 1.6;
      aimAngle = -Math.PI / 2;
      aimPower = 0.72;
      phase = 'aim';
    }
  }

  function finishScenario(success, label, detailType) {
    if (phase === 'done') return;
    phase = 'done';
    document.getElementById('pitch-banner').textContent = label;

    setTimeout(() => {
      if (animId) cancelAnimationFrame(animId);
      document.getElementById('pitch-container').classList.add('hidden');
      if (onComplete) onComplete({ success, label, detailType });
    }, 1050);
  }

  function updatePhysics() {
    // Move patrolling defenders
    defenders.forEach((d) => {
      if (d.patrol) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 75 || d.x > 365) d.vx *= -1;
      }
    });

    // Dribble Run mode
    if (phase === 'dribble_run') {
      player.x = Math.max(55, Math.min(385, player.x + player.vx));
      player.y = Math.max(90, Math.min(540, player.y + player.vy));
      ball.x = player.x + player.vx * 3;
      ball.y = player.y - 13;

      // Defenders chase slightly
      defenders.forEach((d) => {
        const dx = player.x - d.x;
        const dy = player.y - d.y;
        const dist = Math.hypot(dx, dy) || 1;
        d.x += (dx / dist) * 1.35;
        d.y += (dy / dist) * 1.15;

        if (dist < 22) {
          NSSAudio.miss();
          finishScenario(false, '❌ ¡ENTRADA DEL DEFENSA!', 'tackled');
        }
      });

      // Reached shooting box! Transition seamlessly into a shot!
      if (player.y <= 215 && phase === 'dribble_run') {
        NSSAudio.whistle(false);
        phase = 'aim';
        mode = 'shot';
        ball.x = player.x;
        ball.y = player.y - 10;
        aimAngle = Math.atan2(GOAL.y - ball.y, 220 - ball.x);
        aimPower = 0.7;
        document.getElementById('pitch-banner').textContent = '🔥 ¡REGATES COMPLETADOS! ¡CHUTA!';
        document.getElementById('pitch-instructions').textContent = 'Apunta y dispara a portería';
      }
      return;
    }

    if (phase !== 'flight' || !ball.moving) return;

    // Teammates run during ball flight
    teammates.forEach((m) => {
      m.x += m.vx;
      m.y += m.vy;
      if (targetZone) {
        targetZone.x = m.x;
        targetZone.y = m.y - 18;
      }
    });

    // Ball position + Magnus spin + wind
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.z = Math.max(0, ball.z + ball.vz);

    // Apply spin curve & wind
    ball.vx += ball.spinX + windX * 0.0045;

    // Gravity & turf friction
    if (ball.z > 0 || ball.vz > 0) {
      ball.vz -= 0.22;
      if (ball.z <= 0) {
        ball.z = 0;
        ball.vz = -ball.vz * 0.42; // bounce
        if (Math.abs(ball.vz) < 0.6) ball.vz = 0;
      }
    } else {
      ball.vx *= 0.982;
      ball.vy *= 0.982;
    }

    // Goalkeeper AI tracks ball when moving toward goal
    if (ball.vy < 0 && ball.y < 320) {
      const targetX = Math.max(GOAL.x1 + 14, Math.min(GOAL.x2 - 14, ball.x));
      if (keeper.x < targetX - 3) keeper.x += keeper.speed;
      else if (keeper.x > targetX + 3) keeper.x -= keeper.speed;
    }

    // Check Pass / Target Zone hit
    if (mode === 'pass' && targetZone) {
      const distToTarget = Math.hypot(ball.x - targetZone.x, ball.y - targetZone.y);
      if (distToTarget <= targetZone.r && ball.z < 28) {
        NSSAudio.goalCrowd();
        finishScenario(true, '✨ ¡PASE PERFECTO! ¡ASISTENCIA!', 'assist');
        return;
      }
    }

    if (mode === 'train_skill' && targetZone) {
      const distToTarget = Math.hypot(ball.x - targetZone.x, ball.y - targetZone.y);
      if (distToTarget <= targetZone.r + 6) {
        NSSAudio.goalCrowd();
        finishScenario(true, '🎯 ¡DIANA PERFECTA!', 'train_hit');
        return;
      }
    }

    // Check Defender collisions (only if ball height z is low enough to be blocked!)
    for (const d of defenders) {
      const blockHeight = d.isWall ? 22 : 16;
      const dist = Math.hypot(ball.x - d.x, ball.y - d.y);
      if (dist < 17 && ball.z < blockHeight) {
        NSSAudio.miss();
        finishScenario(false, '🧱 ¡BLOQUEADO POR LA DEFENSA!', 'blocked');
        return;
      }
    }

    // Check Goalkeeper save (unless chipped high right under the crossbar!)
    const gkDist = Math.hypot(ball.x - keeper.x, ball.y - keeper.y);
    if (gkDist < 21 && ball.z < 27) {
      NSSAudio.miss();
      finishScenario(false, '🧤 ¡PARADÓN DEL PORTERO!', 'saved');
      return;
    }

    // Check Goal Line crossing (y <= GOAL.y)
    if (ball.y <= GOAL.y) {
      // Hit goalpost?
      if (Math.abs(ball.x - GOAL.x1) < 7 || Math.abs(ball.x - GOAL.x2) < 7) {
        NSSAudio.postClang();
        finishScenario(false, '💥 ¡AL PALO!', 'post');
        return;
      }
      // Inside goal width?
      if (ball.x > GOAL.x1 && ball.x < GOAL.x2) {
        if (ball.z > GOAL.crossbarZ) {
          NSSAudio.miss();
          finishScenario(false, '⬆️ ¡POR ENCIMA DEL LARGUERO!', 'high');
          return;
        }
        NSSAudio.goalCrowd();
        finishScenario(true, '⚽ ¡¡¡GOOOOOLAZO!!!', 'goal');
        return;
      } else {
        NSSAudio.miss();
        finishScenario(false, '❌ ¡FUERA DESVIADO!', 'wide');
        return;
      }
    }

    // Out of bounds or stopped
    const totalSpeed = Math.hypot(ball.vx, ball.vy);
    if (ball.x < 15 || ball.x > 425 || ball.y > 570 || totalSpeed < 0.35) {
      NSSAudio.miss();
      finishScenario(false, '❌ ¡JUGADA PERDIDA!', 'out');
    }
  }

  function drawPitch() {
    const w = canvas.width;
    const h = canvas.height;

    // Turf stripes
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#156327' : '#19732e';
      ctx.fillRect(0, i * 50, w, 50);
    }

    // Pitch chalk lines
    ctx.strokeStyle = 'rgba(255,255,255,0.82)';
    ctx.lineWidth = 2.5;

    // Outer boundary & top goal line
    ctx.strokeRect(24, GOAL.y, w - 48, h - 52);

    // Penalty Box
    ctx.strokeRect(85, GOAL.y, 270, 145);

    // 6-yard Box
    ctx.strokeRect(140, GOAL.y, 160, 52);

    // Penalty spot & arc
    ctx.beginPath();
    ctx.arc(220, GOAL.y + 102, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(220, GOAL.y + 102, 48, 0.22 * Math.PI, 0.78 * Math.PI);
    ctx.stroke();

    // Goal Net
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(GOAL.x1, GOAL.y - GOAL.depth, GOAL.x2 - GOAL.x1, GOAL.depth);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(GOAL.x1, GOAL.y - GOAL.depth, GOAL.x2 - GOAL.x1, GOAL.depth);

    // Goalposts
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(GOAL.x1, GOAL.y, 5, 0, Math.PI * 2);
    ctx.arc(GOAL.x2, GOAL.y, 5, 0, Math.PI * 2);
    ctx.fill();

    // Target Zone (for pass or skill training)
    if (targetZone) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(targetZone.x, targetZone.y, targetZone.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(250, 204, 21, 0.28)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = '#facc15';
      ctx.stroke();
      ctx.restore();
    }

    // Aiming Guide Arrow (when phase === 'aim')
    if (phase === 'aim') {
      const len = 55 + aimPower * 125;
      const ex = ball.x + Math.cos(aimAngle) * len;
      const ey = ball.y + Math.sin(aimAngle) * len;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(ball.x, ball.y);
      ctx.lineTo(ex, ey);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#fde047';
      ctx.setLineDash([8, 6]);
      ctx.stroke();

      // Arrowhead
      ctx.beginPath();
      ctx.arc(ex, ey, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.restore();
    }

    // Draw Teammates
    const myColor = NSSState.get()
      ? NSSData.leagues[NSSState.get().country].tiers[NSSState.get().tier].clubs[NSSState.get().clubIdx].color
      : '#2563eb';

    teammates.forEach((m) => {
      drawPlayerSprite(m.x, m.y, myColor, 'COMPAÑERO');
    });

    // Draw Defenders
    defenders.forEach((d) => {
      drawPlayerSprite(d.x, d.y, '#ef4444', '');
    });

    // Draw Goalkeeper
    drawPlayerSprite(keeper.x, keeper.y, '#eab308', 'GK');

    // Draw User Player
    drawPlayerSprite(player.x, player.y, myColor, NSSState.get() ? NSSState.get().name : 'TÚ', true);

    // Draw Ball Shadow & Ball (scaled by height z)
    ctx.beginPath();
    ctx.arc(ball.x + ball.z * 0.35, ball.y + ball.z * 0.25 + 3, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fill();

    const ballRadius = 7 + Math.min(6, ball.z * 0.16);
    ctx.beginPath();
    ctx.arc(ball.x, ball.y - ball.z * 0.65, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();
  }

  function drawPlayerSprite(x, y, shirtColor, label, isStar = false) {
    // Shadow
    ctx.beginPath();
    ctx.ellipse(x, y + 8, 10, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();

    // Shoulders / Kit
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fillStyle = shirtColor;
    ctx.fill();
    ctx.lineWidth = isStar ? 2.5 : 1.8;
    ctx.strokeStyle = isStar ? '#fde047' : '#ffffff';
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.arc(x, y - 2, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fed7aa';
    ctx.fill();

    if (label) {
      ctx.font = 'bold 9px Trebuchet MS';
      ctx.fillStyle = isStar ? '#fde047' : '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y + 22);
    }
  }

  function loop() {
    updatePhysics();
    drawPitch();
    if (phase !== 'done') {
      animId = requestAnimationFrame(loop);
    }
  }

  return {
    init,
    startScenario,
  };
})();
