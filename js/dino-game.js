/**
 * 2D DINO RUNNER MINI-GAME - GEOGRAPHY EDU
 * Classic Chrome Dino style runner with Canvas 2D & Web Audio API
 * Nha phat trien: Tran Huy Vu
 */

(function () {
  "use strict";

  const STORAGE_HIGH_SCORE_KEY = "geo_dino_high_score";

  // Web Audio Synthesizer for Retro Sound FX
  class DinoAudio {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
    }

    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    }

    playJump() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.12);
      } catch (e) {}
    }

    playScore() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc1.type = "triangle";
        osc2.type = "triangle";
        osc1.frequency.setValueAtTime(587.33, now); // D5
        osc2.frequency.setValueAtTime(880, now + 0.08); // A5
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.08);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.25);
      } catch (e) {}
    }

    playHit() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
      } catch (e) {}
    }
  }

  // Dino Game Engine
  class DinoGameEngine {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
      this.audio = new DinoAudio();

      this.width = 680;
      this.height = 240;
      this.groundY = 195;

      this.isRunning = false;
      this.isGameOver = false;
      this.hasStarted = false;

      this.score = 0;
      this.highScore = parseInt(localStorage.getItem(STORAGE_HIGH_SCORE_KEY) || "0", 10);
      this.lastScoreMilestone = 0;
      this.speed = 6;
      this.baseSpeed = 6;
      this.maxSpeed = 13.5;

      this.dino = {
        x: 45,
        y: this.groundY - 44,
        w: 42,
        h: 44,
        vy: 0,
        gravity: 0.65,
        jumpForce: -11.8,
        isGrounded: true,
        isDucking: false,
        animFrame: 0,
        animTimer: 0
      };

      this.obstacles = [];
      this.clouds = [];
      this.groundBumps = [];
      this.obstacleTimer = 0;
      this.minObstacleGap = 75;

      this.dayNightCycle = 0; // 0 = day, 1 = night
      this.nightTransition = 0;

      this.animationReq = null;
      this.lastTimestamp = 0;

      this.bindControls();
    }

    init() {
      if (!this.canvas) {
        this.canvas = document.getElementById("dino-game-canvas");
        if (this.canvas) this.ctx = this.canvas.getContext("2d");
      }
      if (!this.canvas || !this.ctx) return;

      this.attachCanvasListeners();
      this.resize();
      this.reset();
      this.render();
    }

    attachCanvasListeners() {
      if (!this.canvas || this._listenersAttached) return;
      this._listenersAttached = true;

      const handleAction = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (this.isGameOver) {
          this.reset();
          this.start();
        } else if (!this.hasStarted) {
          this.start();
          this.jump();
        } else {
          this.jump();
        }
      };

      this.canvas.addEventListener("pointerdown", handleAction);
      this.canvas.addEventListener("touchstart", handleAction, { passive: false });
      this.canvas.addEventListener("mousedown", handleAction);
    }

    resize() {
      if (!this.canvas) return;
      const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : null;
      const displayWidth = rect && rect.width ? Math.min(rect.width - 20, 680) : 680;
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.canvas.style.width = displayWidth + "px";
      this.canvas.style.height = (displayWidth * (this.height / this.width)) + "px";
    }

    reset() {
      this.isGameOver = false;
      this.isRunning = false;
      this.hasStarted = false;
      this.score = 0;
      this.lastScoreMilestone = 0;
      this.speed = this.baseSpeed;
      this.dayNightCycle = 0;
      this.nightTransition = 0;

      this.dino.x = 45;
      this.dino.y = this.groundY - 44;
      this.dino.w = 42;
      this.dino.h = 44;
      this.dino.vy = 0;
      this.dino.isGrounded = true;
      this.dino.isDucking = false;
      this.dino.animFrame = 0;

      this.obstacles = [];
      this.clouds = [
        { x: 120, y: 35, w: 46, speed: 0.6 },
        { x: 340, y: 55, w: 58, speed: 0.4 },
        { x: 550, y: 25, w: 40, speed: 0.5 }
      ];

      this.groundBumps = [];
      for (let x = 0; x < this.width + 100; x += 30) {
        this.groundBumps.push({
          x: x,
          len: Math.floor(Math.random() * 8) + 4,
          type: Math.random() > 0.6 ? "bump" : "dot"
        });
      }

      this.updateUI();
    }

    start() {
      if (this.isRunning) return;
      this.audio.init();
      this.hasStarted = true;
      this.isRunning = true;
      this.isGameOver = false;
      this.lastTimestamp = performance.now();
      if (this.animationReq) cancelAnimationFrame(this.animationReq);
      this.loop(performance.now());
      this.updateUI();
    }

    jump() {
      if (!this.hasStarted) {
        this.start();
      }
      if (this.isGameOver) {
        this.reset();
        this.start();
        return;
      }
      if (this.dino.isGrounded) {
        this.dino.vy = this.dino.jumpForce;
        this.dino.isGrounded = false;
        this.audio.playJump();
      }
    }

    duck(enable) {
      if (!this.hasStarted || this.isGameOver) return;
      this.dino.isDucking = Boolean(enable);
      if (this.dino.isDucking) {
        this.dino.h = 28;
        if (this.dino.isGrounded) {
          this.dino.y = this.groundY - 28;
        } else {
          this.dino.vy += 4;
        }
      } else {
        this.dino.h = 44;
        if (this.dino.isGrounded) {
          this.dino.y = this.groundY - 44;
        }
      }
    }

    spawnObstacle() {
      const typeRand = Math.random();
      
      // Pterodactyl bird when score > 250
      if (this.score > 250 && typeRand < 0.28) {
        const heightLevel = Math.random() > 0.5 ? this.groundY - 48 : this.groundY - 72;
        this.obstacles.push({
          type: "bird",
          x: this.width + 20,
          y: heightLevel,
          w: 40,
          h: 30,
          animFrame: 0,
          animTimer: 0
        });
      } else if (typeRand < 0.65) {
        // Small or double cactus
        const count = Math.random() > 0.6 ? 2 : 1;
        this.obstacles.push({
          type: "cactus_small",
          x: this.width + 20,
          y: this.groundY - 34,
          w: 16 * count + (count > 1 ? 4 : 0),
          h: 34,
          count: count
        });
      } else {
        // Large cactus or geological stone
        const isStone = Math.random() > 0.5;
        this.obstacles.push({
          type: isStone ? "stone" : "cactus_large",
          x: this.width + 20,
          y: isStone ? this.groundY - 28 : this.groundY - 46,
          w: isStone ? 32 : 24,
          h: isStone ? 28 : 46
        });
      }
    }

    update(dt) {
      if (!this.isRunning || this.isGameOver) return;

      // Update score & speed
      this.score += 0.15 * (this.speed / this.baseSpeed);
      if (this.speed < this.maxSpeed) {
        this.speed += 0.0012;
      }

      // Check 100-point milestone chime
      const currentMilestone = Math.floor(this.score / 100);
      if (currentMilestone > this.lastScoreMilestone) {
        this.lastScoreMilestone = currentMilestone;
        this.audio.playScore();
      }

      // Day / Night cycle every 400 pts
      const cycleState = Math.floor(this.score / 400) % 2;
      this.dayNightCycle = cycleState;

      // Update High Score
      if (Math.floor(this.score) > this.highScore) {
        this.highScore = Math.floor(this.score);
        localStorage.setItem(STORAGE_HIGH_SCORE_KEY, String(this.highScore));
      }

      // Dino physics
      this.dino.vy += this.dino.gravity;
      this.dino.y += this.dino.vy;

      const targetGroundY = this.groundY - (this.dino.isDucking ? 28 : 44);
      if (this.dino.y >= targetGroundY) {
        this.dino.y = targetGroundY;
        this.dino.vy = 0;
        this.dino.isGrounded = true;
      }

      // Dino animation
      this.dino.animTimer += dt;
      if (this.dino.animTimer > 85) {
        this.dino.animTimer = 0;
        this.dino.animFrame = (this.dino.animFrame + 1) % 2;
      }

      // Clouds
      this.clouds.forEach(c => {
        c.x -= c.speed;
        if (c.x + c.w < 0) {
          c.x = this.width + Math.random() * 80;
          c.y = 20 + Math.random() * 60;
        }
      });

      // Ground bumps
      this.groundBumps.forEach(b => {
        b.x -= this.speed;
        if (b.x < -20) {
          b.x = this.width + Math.random() * 40;
        }
      });

      // Obstacles
      this.obstacleTimer += dt;
      const minInterval = Math.max(900, 1600 - (this.speed - this.baseSpeed) * 120);
      if (this.obstacleTimer > minInterval && Math.random() < 0.45) {
        const lastObs = this.obstacles[this.obstacles.length - 1];
        if (!lastObs || this.width - lastObs.x > this.minObstacleGap) {
          this.spawnObstacle();
          this.obstacleTimer = 0;
        }
      }

      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obs = this.obstacles[i];
        obs.x -= this.speed;

        // Bird animation
        if (obs.type === "bird") {
          obs.animTimer = (obs.animTimer || 0) + dt;
          if (obs.animTimer > 160) {
            obs.animTimer = 0;
            obs.animFrame = (obs.animFrame + 1) % 2;
          }
        }

        // Collision check
        if (this.checkCollision(this.dino, obs)) {
          this.gameOver();
          return;
        }

        // Remove off-screen
        if (obs.x + obs.w < -20) {
          this.obstacles.splice(i, 1);
        }
      }

      this.updateUI();
    }

    checkCollision(dino, obs) {
      const padX = 6;
      const padY = 5;
      const dinoBox = {
        l: dino.x + padX,
        r: dino.x + dino.w - padX,
        t: dino.y + padY,
        b: dino.y + dino.h - 2
      };

      const obsBox = {
        l: obs.x + 3,
        r: obs.x + obs.w - 3,
        t: obs.y + 4,
        b: obs.y + obs.h - 1
      };

      return !(
        dinoBox.r < obsBox.l ||
        dinoBox.l > obsBox.r ||
        dinoBox.b < obsBox.t ||
        dinoBox.t > obsBox.b
      );
    }

    gameOver() {
      this.isGameOver = true;
      this.isRunning = false;
      this.audio.playHit();
      this.updateUI();
      this.render();
    }

    loop(timestamp) {
      if (!this.isRunning) return;
      const dt = Math.min(timestamp - this.lastTimestamp, 60);
      this.lastTimestamp = timestamp;

      this.update(dt);
      this.render();

      if (this.isRunning) {
        this.animationReq = requestAnimationFrame(t => this.loop(t));
      }
    }

    render() {
      if (!this.ctx) return;
      const ctx = this.ctx;

      // Background
      const isNight = this.dayNightCycle === 1;
      ctx.fillStyle = isNight ? "#0f172a" : "#f8fafc";
      ctx.fillRect(0, 0, this.width, this.height);

      // Distant mountain silhouettes (Geography theme)
      ctx.fillStyle = isNight ? "#1e293b" : "#e2e8f0";
      ctx.beginPath();
      ctx.moveTo(0, this.groundY);
      ctx.lineTo(80, this.groundY - 35);
      ctx.lineTo(160, this.groundY - 15);
      ctx.lineTo(260, this.groundY - 48);
      ctx.lineTo(380, this.groundY - 18);
      ctx.lineTo(490, this.groundY - 42);
      ctx.lineTo(600, this.groundY - 20);
      ctx.lineTo(this.width, this.groundY - 30);
      ctx.lineTo(this.width, this.groundY);
      ctx.closePath();
      ctx.fill();

      // Clouds
      ctx.fillStyle = isNight ? "#334155" : "#cbd5e1";
      this.clouds.forEach(c => {
        this.drawCloud(ctx, c.x, c.y, c.w);
      });

      // Ground Line
      ctx.strokeStyle = isNight ? "#64748b" : "#475569";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, this.groundY);
      ctx.lineTo(this.width, this.groundY);
      ctx.stroke();

      // Ground bumps/dots
      ctx.fillStyle = isNight ? "#475569" : "#94a3b8";
      this.groundBumps.forEach(b => {
        if (b.type === "bump") {
          ctx.fillRect(b.x, this.groundY + 3, b.len, 2);
        } else {
          ctx.fillRect(b.x, this.groundY + 5, 2, 2);
        }
      });

      // Obstacles
      this.obstacles.forEach(obs => {
        if (obs.type.startsWith("cactus")) {
          this.drawCactus(ctx, obs, isNight);
        } else if (obs.type === "stone") {
          this.drawStone(ctx, obs, isNight);
        } else if (obs.type === "bird") {
          this.drawBird(ctx, obs, isNight);
        }
      });

      // Dino
      this.drawDino(ctx, this.dino, isNight);

      // HUD: Score & High Score
      ctx.fillStyle = isNight ? "#f8fafc" : "#1e293b";
      ctx.font = "bold 15px 'Space Grotesk', monospace, sans-serif";
      ctx.textAlign = "right";
      const scoreStr = String(Math.floor(this.score)).padStart(5, "0");
      const highStr = String(this.highScore).padStart(5, "0");
      ctx.fillText(`HI ${highStr}  ${scoreStr}`, this.width - 16, 26);

      // Start screen prompt
      if (!this.hasStarted && !this.isGameOver) {
        const prompt1 = (window.t ? window.t("dinoCanvasPrompt", "NHAN PHIM CACH HOAC CHAM DE BAT DAU") : "NHAN PHIM CACH HOAC CHAM DE BAT DAU");
        const prompt2 = (window.t ? window.t("dinoCanvasSubPrompt", "Su dung Phim Cach / Mui ten Len de Nhay, Mui ten Xuong de Cui") : "Su dung Phim Cach / Mui ten Len de Nhay, Mui ten Xuong de Cui");

        ctx.fillStyle = isNight ? "#38bdf8" : "#0d9488";
        ctx.font = "bold 15px 'Plus Jakarta Sans', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(prompt1, this.width / 2, 105);
        ctx.font = "12px 'Plus Jakarta Sans', sans-serif";
        ctx.fillStyle = isNight ? "#94a3b8" : "#64748b";
        ctx.fillText(prompt2, this.width / 2, 130);
      }

      // Game Over Overlay
      if (this.isGameOver) {
        ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = "#ef4444";
        ctx.font = "800 24px 'Space Grotesk', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("G A M E   O V E R", this.width / 2, 85);

        const scorePrefix = (window.t ? window.t("dinoGameOverScore", "Diem dat duoc:") : "Diem dat duoc:");
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText(`${scorePrefix} ${Math.floor(this.score)}`, this.width / 2, 115);

        // Restart button box
        ctx.fillStyle = "#0d9488";
        ctx.beginPath();
        ctx.roundRect(this.width / 2 - 95, 135, 190, 36, 8);
        ctx.fill();

        const restartBtnTxt = (window.t ? window.t("dinoCanvasRestart", "CHOI LAI (SPACE)") : "CHOI LAI (SPACE)");
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText(restartBtnTxt, this.width / 2, 158);
      }
    }

    drawDino(ctx, dino, isNight) {
      const x = dino.x;
      const y = dino.y;
      const mainColor = isNight ? "#38bdf8" : "#0d9488";
      const eyeColor = isNight ? "#0f172a" : "#ffffff";

      ctx.fillStyle = mainColor;

      if (dino.isDucking) {
        // Ducking Body
        ctx.fillRect(x, y + 8, 48, 18);
        // Head
        ctx.fillRect(x + 36, y + 2, 16, 16);
        // Eye
        ctx.fillStyle = eyeColor;
        ctx.fillRect(x + 44, y + 5, 3, 3);
        ctx.fillStyle = mainColor;
        // Feet
        const legStep = dino.animFrame === 0;
        ctx.fillRect(x + 12, y + 24, 4, legStep ? 4 : 2);
        ctx.fillRect(x + 28, y + 24, 4, legStep ? 2 : 4);
      } else {
        // Normal Standing / Running
        // Tail
        ctx.fillRect(x, y + 16, 8, 12);
        ctx.fillRect(x + 4, y + 12, 6, 8);
        // Body
        ctx.fillRect(x + 8, y + 12, 22, 22);
        // Chest & Neck
        ctx.fillRect(x + 20, y + 4, 12, 16);
        // Head
        ctx.fillRect(x + 24, y, 18, 14);
        // Snout
        ctx.fillRect(x + 30, y + 4, 12, 10);
        // Arms
        ctx.fillRect(x + 30, y + 18, 6, 3);

        // Eye
        if (this.isGameOver) {
          // Shocked 'X' eye
          ctx.strokeStyle = isNight ? "#ef4444" : "#b91c1c";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(x + 32, y + 4);
          ctx.lineTo(x + 36, y + 8);
          ctx.moveTo(x + 36, y + 4);
          ctx.lineTo(x + 32, y + 8);
          ctx.stroke();
        } else {
          ctx.fillStyle = eyeColor;
          ctx.fillRect(x + 32, y + 4, 3, 3);
        }

        ctx.fillStyle = mainColor;
        // Running Feet (alternating)
        if (!dino.isGrounded) {
          ctx.fillRect(x + 12, y + 34, 4, 6);
          ctx.fillRect(x + 20, y + 34, 4, 4);
        } else {
          const step = dino.animFrame === 0;
          ctx.fillRect(x + 12, y + 34, 4, step ? 10 : 4);
          ctx.fillRect(x + 22, y + 34, 4, step ? 4 : 10);
        }
      }
    }

    drawCactus(ctx, obs, isNight) {
      const x = obs.x;
      const y = obs.y;
      const count = obs.count || 1;
      ctx.fillStyle = isNight ? "#34d399" : "#059669";

      for (let i = 0; i < count; i++) {
        const cx = x + i * 18;
        ctx.fillRect(cx + 4, y, 7, obs.h);
        ctx.fillRect(cx, y + 10, 4, 10);
        ctx.fillRect(cx, y + 10, 6, 4);
        ctx.fillRect(cx + 9, y + 6, 4, 10);
        ctx.fillRect(cx + 7, y + 12, 6, 4);
      }
    }

    drawStone(ctx, obs, isNight) {
      const x = obs.x;
      const y = obs.y;
      ctx.fillStyle = isNight ? "#94a3b8" : "#64748b";

      ctx.beginPath();
      ctx.moveTo(x, y + obs.h);
      ctx.lineTo(x + 8, y + 6);
      ctx.lineTo(x + 18, y);
      ctx.lineTo(x + 28, y + 10);
      ctx.lineTo(x + obs.w, y + obs.h);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = isNight ? "#64748b" : "#475569";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 4, y + obs.h - 8);
      ctx.lineTo(x + obs.w - 4, y + obs.h - 10);
      ctx.stroke();
    }

    drawBird(ctx, obs, isNight) {
      const x = obs.x;
      const y = obs.y;
      ctx.fillStyle = isNight ? "#f472b6" : "#e11d48";

      ctx.fillRect(x + 10, y + 10, 18, 8);
      ctx.fillRect(x, y + 6, 10, 6);
      ctx.fillRect(x - 6, y + 8, 6, 3);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 4, y + 7, 2, 2);

      ctx.fillStyle = isNight ? "#f472b6" : "#e11d48";
      const wingUp = obs.animFrame === 0;
      if (wingUp) {
        ctx.fillRect(x + 14, y, 8, 12);
        ctx.fillRect(x + 18, y - 6, 6, 8);
      } else {
        ctx.fillRect(x + 14, y + 14, 8, 12);
        ctx.fillRect(x + 18, y + 22, 6, 8);
      }
    }

    drawCloud(ctx, x, y, w) {
      ctx.beginPath();
      ctx.arc(x + 12, y + 10, 10, 0, Math.PI * 2);
      ctx.arc(x + 24, y + 6, 14, 0, Math.PI * 2);
      ctx.arc(x + 36, y + 10, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    updateUI() {
      const scoreEl = document.getElementById("dino-current-score");
      const highEl = document.getElementById("dino-best-score");
      if (scoreEl) scoreEl.textContent = String(Math.floor(this.score)).padStart(5, "0");
      if (highEl) highEl.textContent = String(this.highScore).padStart(5, "0");
    }

    bindControls() {
      window.addEventListener("keydown", e => {
        const modal = document.getElementById("modal-dino-game");
        const isOpen = modal && (modal.classList.contains("show") || modal.classList.contains("active") || modal.style.display === "flex");
        if (!isOpen) return;

        if (e.code === "Space" || e.code === "ArrowUp" || e.key === "w" || e.key === "W") {
          e.preventDefault();
          this.jump();
        } else if (e.code === "ArrowDown" || e.key === "s" || e.key === "S") {
          e.preventDefault();
          this.duck(true);
        }
      });

      window.addEventListener("keyup", e => {
        if (e.code === "ArrowDown" || e.key === "s" || e.key === "S") {
          this.duck(false);
        }
      });
    }
  }

  // Global instance
  let gameInstance = null;

  function openDinoGameModal() {
    const modal = document.getElementById("modal-dino-game");
    if (!modal) return;
    modal.classList.add("show");
    modal.style.display = "flex";
    modal.style.zIndex = "10000002";
    document.body.style.overflow = "hidden";

    if (!gameInstance) {
      gameInstance = new DinoGameEngine("dino-game-canvas");
    }
    setTimeout(() => {
      gameInstance.init();
      gameInstance.reset();
      gameInstance.render();
    }, 50);
  }

  function closeDinoGameModal() {
    const modal = document.getElementById("modal-dino-game");
    if (modal) {
      modal.classList.remove("show");
      modal.style.display = "none";
    }
    document.body.style.overflow = "";
    if (gameInstance) {
      gameInstance.isRunning = false;
      if (gameInstance.animationReq) cancelAnimationFrame(gameInstance.animationReq);
    }
  }

  function restartDinoGame() {
    if (gameInstance) {
      gameInstance.reset();
      gameInstance.start();
    }
  }

  function toggleDinoAudio() {
    if (gameInstance && gameInstance.audio) {
      gameInstance.audio.isMuted = !gameInstance.audio.isMuted;
      const btn = document.getElementById("btn-dino-mute");
      if (btn) {
        btn.innerHTML = gameInstance.audio.isMuted
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
      }
    }
  }

  // Export globals
  window.openDinoGameModal = openDinoGameModal;
  window.closeDinoGameModal = closeDinoGameModal;
  window.restartDinoGame = restartDinoGame;
  window.toggleDinoAudio = toggleDinoAudio;
  window.getDinoGameInstance = () => gameInstance;

})();
