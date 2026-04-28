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