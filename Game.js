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
