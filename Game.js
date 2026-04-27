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
