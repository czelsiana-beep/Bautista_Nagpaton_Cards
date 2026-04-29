 /* ============================================================
   Colors of Deception — game.js
   Dark Fantasy Card Battler
   OOP Architecture: GameManager, Player, Card, Deck, UIController
   ============================================================ */


'use strict';


// ============================================================
// CARD CLASS
// ============================================================
class Card {
  constructor(color, number, isCurse = false) {
    this.color = color;
    this.number = number;
    this.isCurse = isCurse;
  }


  canPlayOn(topColor, topNumber) {
    if (this.isCurse) return false;
    return this.color === topColor || this.number === topNumber;
  }


  get displayValue() {
    return this.isCurse ? '☠' : this.number;
  }


  get cssClass() {
    return this.isCurse ? 'card-curse-bg' : `card-${this.color}`;
  }
}

// ============================================================
// DECK CLASS
// ============================================================
class Deck {
  constructor() {
    this.cards = [];
    this.build();
  }


  build() {
    const COLORS = ['red', 'blue', 'green', 'yellow'];
    this.cards = [];
    for (const c of COLORS) {
      for (let n = 1; n <= 10; n++) {
        this.cards.push(new Card(c, n));
        if (n <= 8) this.cards.push(new Card(c, n)); // two of each low card
      }
    }
    // Curse cards
    for (let i = 0; i < 8; i++) {
      this.cards.push(new Card(COLORS[i % 4], '☠', true));
    }
    this.shuffle();
  }


  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }


  draw() {
    return this.cards.pop() || null;
  }


  get count() {
    return this.cards.length;
  }


  reshuffleFrom(discardPile) {
    if (discardPile.length <= 1) return;
    const top = discardPile.pop();
    this.cards = [...discardPile];
    discardPile.length = 0;
    discardPile.push(top);
    this.shuffle();
    UIController.showToast('📜 The deck has been reshuffled from the discard pile!');
  }
}

// ============================================================
// PLAYER CLASS
// ============================================================
class Player {
  constructor(id, name, isHuman, roleData) {
    this.id = id;
    this.name = name;
    this.isHuman = isHuman;
    this.role = roleData;
    this.hand = [];
    this.abilityUsed = false;
    this.shielded = false;
    this.silenced = false;
    this.silencedTurns = 0;
    this.eliminated = false;
    this.drawnThisTurn = false; // draw limit tracker
  }


  receiveCard(card) {
    if (card) this.hand.push(card);
  }


  removeCard(index) {
    return this.hand.splice(index, 1)[0];
  }


  get playableCards() {
    return this.hand.filter(c => c.canPlayOn(GameManager.currentColor, GameManager.currentNumber));
  }


  get isAlive() {
    return !this.eliminated;
  }
}

// ============================================================
// ROLE DATA
// ============================================================
const ROLES = [
  {
    id: 'mage', name: 'The Mage', emoji: '🔮', team: 'good',
    desc: "You know who the evil players are. Stay hidden. If Nica guesses you are the Mage — evil wins!",
    ability: 'REVEAL VISION',
    abilityDesc: 'You see evil players secretly. No active ability — your power is knowledge.'
  },
  {
    id: 'jose', name: 'Jose', emoji: '⚔️', team: 'good',
    desc: "Strike one player. If evil → they're eliminated. If good → you lose 2 cards.",
    ability: '⚔️ STRIKE',
    abilityDesc: 'Eliminate a player. Right guess = great. Wrong guess = lose 2 cards.'
  },
  {
    id: 'carl', name: 'Carl', emoji: '🛡️', team: 'good',
    desc: 'Shield yourself or an ally from the next ability used against them.',
    ability: '🛡️ SHIELD',
    abilityDesc: 'Protect a player from the next ability aimed at them.'
  },
  {
    id: 'louise', name: 'Louise', emoji: '👑', team: 'evil',
    desc: "You are the Shadow Queen. Use 3 abilities to destroy the Mage's team.",
    ability: '👑 POWERS',
    abilityDesc: 'Corrupt Draw / False Vision / Silence Curse'
  },
  {
    id: 'nica', name: 'Nica', emoji: '🕷️', team: 'evil',
    desc: 'Find and expose the Mage. If you guess correctly once — evil wins instantly.',
    ability: '🕷️ HUNT',
    abilityDesc: 'Guess which player is the Mage. Correct = Evil wins!'
  },
];


const AI_NAMES = ['Sir Aldric', 'Lady Maren', 'Thane Bors', 'Ser Voss', 'Dame Elara', 'Lord Fenwick'];

// ============================================================
// GAME MANAGER
// ============================================================
const GameManager = {
  players: [],
  deck: null,
  discard: [],
  currentTurn: 0,
  currentColor: null,
  currentNumber: null,
  gameOver: false,
  aiThinkingTimer: null,


  init(humanName, opponentCount) {
    this.players = [];
    this.deck = new Deck();
    this.discard = [];
    this.currentTurn = 0;
    this.currentColor = null;
    this.currentNumber = null;
    this.gameOver = false;


    const totalPlayers = opponentCount + 1; // human + AI opponents
    const rolePool = this._shuffleArray([...ROLES]).slice(0, totalPlayers);


    // Player 0 = human
    this.players.push(new Player(0, humanName || 'Noble Hero', true, rolePool[0]));
    for (let i = 1; i < totalPlayers; i++) {
      this.players.push(new Player(i, AI_NAMES[i - 1], false, rolePool[i]));
    }


    // Deal 5 cards each
    for (const p of this.players) {
      for (let k = 0; k < 5; k++) this._dealCard(p);
    }


    // Flip first non-curse card
    let startCard;
    do { startCard = this.deck.draw(); } while (startCard && startCard.isCurse);
    if (startCard) {
      this.discard.push(startCard);
      this.currentColor = startCard.color;
      this.currentNumber = startCard.number;
    }
  },


  _dealCard(player) {
    if (this.deck.count === 0) this.deck.reshuffleFrom(this.discard);
    const card = this.deck.draw();
    if (card) player.receiveCard(card);
  },


  _shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },


  get humanPlayer() {
    return this.players[0];
  },


  get currentPlayer() {
    return this.players[this.currentTurn];
  },


  playCard(playerIndex, cardIndex) {
    const player = this.players[playerIndex];
    const card = player.hand[cardIndex];
    if (!card || !card.canPlayOn(this.currentColor, this.currentNumber)) return false;


    player.removeCard(cardIndex);
    this.discard.push(card);
    this.currentColor = card.color;
    this.currentNumber = card.number;


    UIController.setLog(`${player.name} played a ${card.color.toUpperCase()} ${card.displayValue}.`);


    if (player.hand.length === 0) {
      const winTeam = player.role.team === 'evil' ? 'evil' : 'good';
      this.endGame(winTeam, `${player.name} emptied their hand! ${winTeam === 'good' ? 'The realm is saved!' : 'Darkness prevails!'}`);
      return true;
    }


    return true;
  },


  drawCard(playerIndex, forceAllow = false) {
    const player = this.players[playerIndex];
    if (!forceAllow && player.drawnThisTurn) return null;


    if (this.deck.count === 0) this.deck.reshuffleFrom(this.discard);
    const card = this.deck.draw();
    if (!card) return null;


    player.receiveCard(card);
    player.drawnThisTurn = true;


    if (card.isCurse) {
      player.silenced = true;
      player.silencedTurns = 1;
      UIController.showToast(`☠️ ${player.name} drew a CURSE card — next turn skipped!`);
    }
    return card;
  },


  nextTurn() {
    if (this.gameOver) return;
    this.checkFactionWin();
    if (this.gameOver) return;


    let next = (this.currentTurn + 1) % this.players.length;
    let attempts = 0;
    while (this.players[next].eliminated && attempts < this.players.length) {
      next = (next + 1) % this.players.length;
      attempts++;
    }
    this.currentTurn = next;


    const cp = this.players[this.currentTurn];
    cp.drawnThisTurn = false; // reset draw for new turn


    if (cp.silenced) {
      cp.silencedTurns--;
      if (cp.silencedTurns <= 0) cp.silenced = false;
      UIController.setLog(`${cp.name} is silenced — turn skipped!`);
      UIController.renderGame();
      this.aiThinkingTimer = setTimeout(() => this.nextTurn(), 1100);
      return;
    }


    UIController.renderGame();
    if (this.currentTurn !== 0) {
      this.aiThinkingTimer = setTimeout(() => AIController.takeTurn(cp), 1400);
    }
  },


  checkFactionWin() {
    const living = this.players.filter(p => p.isAlive);
    const goodAlive = living.filter(p => p.role.team === 'good').length;
    const evilAlive = living.filter(p => p.role.team === 'evil').length;
    if (evilAlive === 0) {
      this.endGame('good', 'All Shadow Court members have been eliminated. The realm is saved!');
    } else if (goodAlive === 0) {
      this.endGame('evil', 'The Shadow Court has prevailed. Darkness covers the realm.');
    }
  },


  endGame(winTeam, message) {
    if (this.gameOver) return;
    this.gameOver = true;
    if (this.aiThinkingTimer) clearTimeout(this.aiThinkingTimer);
    UIController.showGameOver(winTeam, message, this.players);
  }
};

// ============================================================
// AI CONTROLLER
// ============================================================
const AIController = {
  takeTurn(player) {
    if (GameManager.gameOver || !player || player.eliminated || player.isHuman) return;


    // Try ability with 25% chance
    if (!player.abilityUsed && Math.random() < 0.25) {
      const used = this.tryAbility(player);
      if (used) {
        UIController.renderGame();
        setTimeout(() => this.continueTurn(player), 900);
        return;
      }
    }
    this.continueTurn(player);
  },


  continueTurn(player) {
    if (GameManager.gameOver) return;
    const playable = player.hand.filter(c => c.canPlayOn(GameManager.currentColor, GameManager.currentNumber));


    if (playable.length > 0) {
      // Prefer non-curse playable cards; play highest value for strategy
      const card = playable.sort((a, b) => (b.number || 0) - (a.number || 0))[0];
      const idx = player.hand.indexOf(card);
      GameManager.playCard(player.id, idx);
    } else {
      const drew = GameManager.drawCard(player.id, true);
      UIController.setLog(`${player.name} cannot play and draws a card.`);
    }
    UIController.renderGame();
    setTimeout(() => GameManager.nextTurn(), 700);
  },


  tryAbility(player) {
    const others = GameManager.players.filter(p => p.id !== player.id && p.isAlive);
    if (others.length === 0) return false;
    const role = player.role;


    if (role.id === 'jose') {
      const evilTarget = others.find(p => p.role.team === 'evil');
      if (evilTarget) {
        player.abilityUsed = true;
        evilTarget.eliminated = true;
        UIController.setLogBig(`⚔️ ${player.name} strikes! ${evilTarget.name} is eliminated!`);
        GameManager.checkFactionWin();
        return true;
      }
    }


    if (role.id === 'carl') {
      const goodTarget = others.find(p => p.role.team === 'good');
      if (goodTarget) {
        player.abilityUsed = true;
        goodTarget.shielded = true;
        UIController.setLogBig(`🛡️ ${player.name} shields ${goodTarget.name}!`);
        return true;
      }
    }


    if (role.id === 'louise') {
      const goodTarget = others.find(p => p.role.team === 'good');
      if (goodTarget) {
        player.abilityUsed = true;
        if (goodTarget.shielded) {
          goodTarget.shielded = false;
          UIController.setLogBig(`💀 Louise's Corrupt Draw was BLOCKED by ${goodTarget.name}'s shield!`);
        } else {
          GameManager.drawCard(goodTarget.id, true);
          GameManager.drawCard(goodTarget.id, true);
          UIController.setLogBig(`💀 Louise forces ${goodTarget.name} to draw +2 cards!`);
        }
        return true;
      }
    }


    if (role.id === 'nica') {
      if (Math.random() < 0.35) {
        const magePlayer = others.find(p => p.role.id === 'mage');
        if (magePlayer) {
          player.abilityUsed = true;
          UIController.setLogBig(`🕷️ Nica hunts the Mage and finds ${magePlayer.name}! EVIL WINS!`);
          GameManager.endGame('evil', `Nica correctly identified ${magePlayer.name} as the Mage! The Shadow Court wins!`);
          return true;
        }
      } else if (Math.random() < 0.25) {
        player.abilityUsed = true;
        const wrongTarget = others[Math.floor(Math.random() * others.length)];
        UIController.setLogBig(`🕷️ Nica hunts... but ${wrongTarget.name} is not the Mage. Hunt fails.`);
        return true;
      }
    }


    return false;
  }
};

// ============================================================
// UI CONTROLLER
// ============================================================
const UIController = {
  toastTimer: null,
  targetCallback: null,


  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo(0, 0);
  },


  renderGame() {
    this.renderOpponents();
    this.renderDiscardPile();
    this.renderPlayerHand();
    this.renderAbilities();
    const cp = GameManager.currentPlayer;
    document.getElementById('turn-name').textContent = cp ? cp.name : '—';
    document.getElementById('deck-count').textContent = GameManager.deck.count;
    const human = GameManager.humanPlayer;
    document.getElementById('player-name-tag').textContent = `${human.role.emoji} ${human.name}`;


    const pz = document.getElementById('player-zone');
    pz.classList.toggle('my-turn', GameManager.currentTurn === 0);


    // Draw deck clickability
    const drawDeckEl = document.getElementById('draw-deck');
    if (human.drawnThisTurn || GameManager.currentTurn !== 0) {
      drawDeckEl.classList.add('already-drawn');
    } else {
      drawDeckEl.classList.remove('already-drawn');
    }
  },


  renderOpponents() {
    const row = document.getElementById('opponents-row');
    row.innerHTML = '';
    const opponents = GameManager.players.filter(p => p.id !== 0);
    if (opponents.length === 0) return;


    for (const p of opponents) {
      const isActive = GameManager.currentTurn === p.id;
      const el = document.createElement('div');
      el.className = 'opponent-zone' + (isActive ? ' active-turn' : '') + (p.eliminated ? ' eliminated' : '');
      el.innerHTML = `
        ${p.abilityUsed ? '<div class="ability-used-badge">Used</div>' : ''}
        ${isActive && !p.eliminated ? '<div class="ai-thinking-badge">⚙ Thinking</div>' : ''}
        <div class="opp-name">${p.role.emoji} ${p.name}</div>
        <div class="opp-cards">${p.hand.map(() => '<div class="opp-card-back">🂠</div>').join('')}</div>
        <div class="opp-tag">${p.hand.length} cards${p.shielded ? ' 🛡️' : ''}${p.silenced ? ' 🤫' : ''}${p.eliminated ? ' 💀' : ''}</div>
      `;
      row.appendChild(el);
    }
  },


  renderDiscardPile() {
    const topCard = GameManager.discard[GameManager.discard.length - 1];
    const pile = document.getElementById('discard-pile');
    const numEl = document.getElementById('top-card-num');
    const clrEl = document.getElementById('top-card-color');
    pile.className = 'discard-pile';
    if (!topCard) { numEl.textContent = '—'; clrEl.textContent = '—'; return; }
    const displayColor = GameManager.currentColor || topCard.color;
    pile.classList.add(`card-${displayColor}`);
    numEl.textContent = topCard.isCurse ? '☠️' : topCard.number;
    clrEl.textContent = displayColor.toUpperCase();
  },


  renderPlayerHand() {
    const container = document.getElementById('hand-cards');
    container.innerHTML = '';
    const player = GameManager.humanPlayer;


    if (player.eliminated) {
      container.innerHTML = '<div style="color:#f06060;font-size:14px;padding:10px;">You have been eliminated from the game.</div>';
      return;
    }


    const isMyTurn = GameManager.currentTurn === 0;


    player.hand.forEach((card, idx) => {
      const canPlay = isMyTurn && card.canPlayOn(GameManager.currentColor, GameManager.currentNumber);
      const div = document.createElement('div');
      div.className = `card ${card.cssClass}${canPlay ? '' : ' unplayable'}`;
      div.innerHTML = `
        <div class="card-num">${card.displayValue}</div>
        <div class="card-clr">${card.isCurse ? 'CURSE' : card.color}</div>
      `;
      if (canPlay) div.addEventListener('click', () => this.onPlayerPlayCard(idx));
      container.appendChild(div);
    });
  },


  renderAbilities() {
    const panel = document.getElementById('ability-panel');
    panel.innerHTML = '';
    const player = GameManager.humanPlayer;
    if (player.eliminated) return;


    const role = player.role;


    if (role.id === 'mage') {
      const info = document.createElement('div');
      info.style.cssText = 'font-size:12px;color:rgba(244,232,193,0.4);padding:8px;font-style:italic;text-align:center;';
      info.textContent = '🔮 You are the Mage. Your power is knowledge — guide your allies wisely.';
      panel.appendChild(info);
      return;
    }


    const addBtn = (emoji, name, desc, used, handler, isEvil) => {
      const btn = document.createElement('div');
      btn.className = `ability-btn${isEvil ? ' evil-ab' : ''}${used ? ' used' : ''}`;
      btn.innerHTML = `<div class="ab-emoji">${emoji}</div><div class="ab-name">${name}</div><div class="ab-desc">${desc}</div>`;
      if (!used) btn.addEventListener('click', handler);
      panel.appendChild(btn);
    };


    if (role.id === 'jose') addBtn('⚔️', 'STRIKE', 'Eliminate one player (risky!)', player.abilityUsed, () => this.activateJose(), false);
    if (role.id === 'carl') addBtn('🛡️', 'SHIELD', 'Protect a player from next ability', player.abilityUsed, () => this.activateCarl(), false);
    if (role.id === 'louise') {
      addBtn('💀', 'CORRUPT DRAW', '+2 cards on a target', player.abilityUsed, () => this.activateLouise('corrupt'), true);
      addBtn('👁️', 'FALSE VISION', "Peek a player's alignment", player.abilityUsed, () => this.activateLouise('vision'), true);
      addBtn('🤫', 'SILENCE CURSE', 'Skip target ability for 1 turn', player.abilityUsed, () => this.activateLouise('silence'), true);
    }
    if (role.id === 'nica') addBtn('🕵️', 'HUNT MAGE', 'Guess the Mage — Win if correct!', player.abilityUsed, () => this.activateNica(), true);
  }

  // --- Player Actions ---
  onPlayerPlayCard(idx) {
    if (GameManager.currentTurn !== 0 || GameManager.gameOver) return;
    const player = GameManager.humanPlayer;
    if (player.silenced) { this.showToast('🤫 You are silenced and cannot act this turn!'); return; }
    const success = GameManager.playCard(0, idx);
    if (success) {
      this.renderGame();
      if (!GameManager.gameOver) setTimeout(() => GameManager.nextTurn(), 500);
    } else {
      this.showToast('❌ That card cannot be played right now.');
    }
  },


  onPlayerDrawCard() {
    if (GameManager.currentTurn !== 0 || GameManager.gameOver) return;
    const player = GameManager.humanPlayer;
    if (player.eliminated) return;
    if (player.drawnThisTurn) { this.showToast('🚫 You already drew a card this turn. Play a card or End Turn.'); return; }


    const drew = GameManager.drawCard(0);
    if (!drew) { this.showToast('No cards left to draw!'); return; }


    let msg = `You drew a ${drew.color} ${drew.displayValue} card.`;
    if (drew.isCurse) msg = `☠️ CURSE drawn! Your next turn is skipped!`;
    this.setLog(msg);
    this.renderGame();
    // After drawing, if no playable cards exist, auto end turn
    setTimeout(() => {
      if (!player.playableCards.length) {
        this.setLog(msg + ' No playable cards — turn passes.');
        setTimeout(() => GameManager.nextTurn(), 700);
      }
    }, 300);
  },


  // --- Ability Activations ---
  activateJose() {
    if (GameManager.currentTurn !== 0) return;
    const player = GameManager.humanPlayer;
    if (player.abilityUsed) { this.showToast('Ability already used!'); return; }
    const targets = GameManager.players.filter(p => p.id !== 0 && p.isAlive);
    this.openTargetOverlay('⚔️ STRIKE — Choose Your Target', 'If evil → eliminated. If good → you lose 2 cards.', targets, (target) => {
      player.abilityUsed = true;
      if (target.role.team === 'evil') {
        target.eliminated = true;
        this.setLogBig(`⚔️ ${player.name} strikes ${target.name}! They were EVIL — eliminated!`);
        GameManager.checkFactionWin();
      } else {
        GameManager.drawCard(0, true);
        GameManager.drawCard(0, true);
        this.setLogBig(`⚔️ ${player.name} struck an innocent! ${target.name} was GOOD. Lose 2 cards as penance.`);
      }
      this.renderGame();
    });
  },


  activateCarl() {
    if (GameManager.currentTurn !== 0) return;
    const player = GameManager.humanPlayer;
    if (player.abilityUsed) { this.showToast('Ability already used!'); return; }
    const targets = GameManager.players.filter(p => p.isAlive);
    this.openTargetOverlay('🛡️ SHIELD — Choose Who to Protect', 'This player will be immune to the next ability.', targets, (target) => {
      player.abilityUsed = true;
      target.shielded = true;
      this.setLogBig(`🛡️ ${target.name} is now shielded!`);
      this.renderGame();
    });
  },


  activateLouise(type) {
    if (GameManager.currentTurn !== 0) return;
    const player = GameManager.humanPlayer;
    if (player.abilityUsed) { this.showToast('Ability already used this game!'); return; }
    const targets = GameManager.players.filter(p => p.id !== 0 && p.isAlive);
    const titles = { corrupt: '💀 CORRUPT DRAW', vision: '👁️ FALSE VISION', silence: '🤫 SILENCE CURSE' };
    const subs = { corrupt: 'Force target to draw +2 cards.', vision: 'See if target is GOOD or EVIL.', silence: 'Target skips ability use for 1 turn.' };
    this.openTargetOverlay(titles[type], subs[type], targets, (target) => {
      player.abilityUsed = true;
      if (type === 'corrupt') {
        if (target.shielded) { target.shielded = false; this.setLogBig(`💀 Corrupt Draw BLOCKED by ${target.name}'s shield!`); }
        else { GameManager.drawCard(target.id, true); GameManager.drawCard(target.id, true); this.setLogBig(`💀 Louise forces ${target.name} to draw +2 cards!`); }
      }
      if (type === 'vision') {
        const align = target.role.team === 'good' ? 'GOOD ⚔️' : 'EVIL ☠️';
        this.showToast(`👁️ Vision reveals: ${target.name} is ${align}`);
        this.setLog(`Louise used False Vision on ${target.name}.`);
      }
      if (type === 'silence') {
        if (target.shielded) { target.shielded = false; this.setLogBig(`🤫 Silence Curse BLOCKED by ${target.name}'s shield!`); }
        else { target.silenced = true; target.silencedTurns = 1; this.setLogBig(`🤫 ${target.name} is silenced for 1 turn!`); }
      }
      this.renderGame();
    });
  },


  activateNica() {
    if (GameManager.currentTurn !== 0) return;
    const player = GameManager.humanPlayer;
    if (player.abilityUsed) { this.showToast('Ability already used!'); return; }
    const targets = GameManager.players.filter(p => p.id !== 0 && p.isAlive);
    this.openTargetOverlay('🕷️ HUNT — Guess the Mage', 'If your target is the Mage — EVIL WINS INSTANTLY!', targets, (target) => {
      player.abilityUsed = true;
      if (target.role.id === 'mage') {
        this.setLogBig(`🕷️ Nica exposes ${target.name} as THE MAGE! EVIL WINS!`);
        setTimeout(() => GameManager.endGame('evil', `Nica identified ${target.name} as the Mage! The Shadow Court wins!`), 800);
      } else {
        this.setLogBig(`🕷️ Nica guesses ${target.name} is the Mage... WRONG. Hunt fails.`);
        this.renderGame();
      }
    });
  },


  // --- Target Overlay ---
  openTargetOverlay(title, sub, targets, callback) {
    this.targetCallback = callback;
    document.getElementById('target-title').textContent = title;
    document.getElementById('target-subtitle').textContent = sub;
    const list = document.getElementById('target-list');
    list.innerHTML = '';
    for (const t of targets) {
      const el = document.createElement('div');
      el.className = 'target-card';
      el.innerHTML = `<div class="tc-emoji">${t.role.emoji}</div><div class="tc-name">${t.name}</div>`;
      el.addEventListener('click', () => { this.closeTarget(); callback(t); });
      list.appendChild(el);
    }
    document.getElementById('target-overlay').classList.add('show');
  },


  closeTarget() {
    document.getElementById('target-overlay').classList.remove('show');
    this.targetCallback = null;
  },


  // --- Game Over ---
  showGameOver(winTeam, message, players) {
    const isGoodWin = winTeam === 'good';
    document.getElementById('go-crest').textContent = isGoodWin ? '⚔️' : '☠️';
    document.getElementById('go-title').textContent = isGoodWin ? '⚜️ Victory for the Realm!' : '☠️ The Shadow Court Prevails';
    document.getElementById('go-title').style.color = isGoodWin ? 'var(--gold-light)' : '#f06060';
    document.getElementById('go-sub').textContent = message;


    const reveals = document.getElementById('go-reveals');
    reveals.innerHTML = '';
    for (const p of players) {
      const badge = document.createElement('div');
      badge.className = 'reveal-badge';
      badge.innerHTML = `<div class="rb-emoji">${p.role.emoji}</div><div class="rb-name">${p.name}</div><div class="rb-role" style="color:${p.role.team === 'good' ? '#6ab0f5' : '#f06060'}">${p.role.name}</div>`;
      reveals.appendChild(badge);
    }
    setTimeout(() => this.showScreen('screen-gameover'), 1600);
  },


  // --- Log ---
  setLog(msg) {
    const el = document.getElementById('action-log');
    el.className = 'action-log';
    el.textContent = msg;
  },
  setLogBig(msg) {
    const el = document.getElementById('action-log');
    el.className = 'action-log big-announce';
    el.textContent = msg;
  },


  // --- Toast ---
  showToast(msg) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.remove(), 2800);
  }
};

// ============================================================
// MENU STATE
// ============================================================
let selectedOpponents = 1; // default 1 opponent (2 players total)


function initMenu() {
  // Opponent count selection
  document.querySelectorAll('.opp-select-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.opp-select-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedOpponents = parseInt(card.dataset.opponents);
    });
  });
}


function startGame() {
  const nameInput = document.getElementById('player-name-input').value.trim();
  const humanName = nameInput || 'Noble Hero';


  GameManager.init(humanName, selectedOpponents);
  showRoleReveal();
}


function showRoleReveal() {
  const human = GameManager.humanPlayer;
  const role = human.role;
  const isGood = role.team === 'good';


  let extraInfo = '';
  if (role.id === 'mage') {
    const evilNames = GameManager.players
      .filter(p => p.role.team === 'evil')
      .map(p => `${p.role.emoji} ${p.name}`)
      .join(', ');
    extraInfo = `
      <div class="role-ability-box" style="margin-top:8px;border-color:rgba(240,96,96,0.3);">
        <strong>🔮 Secret Vision:</strong><br>
        Evil players: <span style="color:#f06060">${evilNames}</span><br>
        <em style="font-size:11px;opacity:.7">Guide allies — but never reveal this directly.</em>
      </div>`;
  }


  document.getElementById('role-reveal-content').innerHTML = `
    <div class="role-reveal-card">
      <div class="role-reveal-header ${isGood ? 'good-team' : 'evil-team'}">
        <div class="role-reveal-emoji">${role.emoji}</div>
        <div class="role-reveal-name">${role.name}</div>
        <div class="role-reveal-team" style="color:${isGood ? '#6ab0f5' : '#f06060'}">
          ${isGood ? '⚔️ Loyal Servant of Rina' : '☠️ Shadow Court — Evil'}
        </div>
      </div>
      <div class="role-reveal-body">
        <p>${role.desc}</p>
        <div class="role-ability-box">
          <strong>Your Ability:</strong> ${role.ability}<br>
          <span style="opacity:.8">${role.abilityDesc}</span>
        </div>
        ${extraInfo}
      </div>
    </div>`;


  UIController.showScreen('screen-role');
}


function proceedAfterRole() {
  UIController.renderGame();
  UIController.showScreen('screen-game');
  UIController.setLog(`The game begins! It is ${GameManager.currentPlayer.name}'s turn.`);
  if (GameManager.currentTurn !== 0) {
    setTimeout(() => AIController.takeTurn(GameManager.currentPlayer), 1400);
  }
}


function showCodex() { UIController.showScreen('screen-codex'); }
function showCodexInGame() { UIController.showScreen('screen-codex'); }
function showMenu() { UIController.showScreen('screen-menu'); }
function cancelTarget() { UIController.closeTarget(); }
function playerDrawCard() { UIController.onPlayerDrawCard(); }





// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initMenu();
});

