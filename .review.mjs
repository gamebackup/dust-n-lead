import fs from 'node:fs';
import vm from 'node:vm';

const files = process.argv.slice(2);
const NAMES = ['gameState','startGame','startCombat','playCard','cardDefs','weaponDefs','buildDeck','updateCampDisplay','goToCamp','wildernessEnvironmental','wildernessLoot','strongboxEvent','drifterEvent','mineShaftEvent','riverCrossingEvent','snakeOilEvent','posseEvent','hangingEvent','badgeEvent','fordRiver','payFerry','buyTonic','helpPosse','cutHimDown','stealBadge','openStrongbox','helpDrifter','robDrifter','ignoreDrifter','enterMine','goToStore','goToSaloon','saloonRest','saloonGamble','saloonDrink','goToSheriff','goToGunsmith','updateGunsmithDisplay','goToWilderness','ventureOut','endRun','updateAchievementsScreen','updateEquipmentScreen','updateUpgradesScreen','renderCardLibrary','updateTitleScreen','updateInventoryDisplay','init','victory','fleeCombat','burnCard','buyCardUpgrade','getRunDeckComposition','showCardRemovalPicker','updateTownDisplay','resumeRun','saveRun','updateStoreDisplay','showWildChoices','updateWildernessDisplay','getActualGun'];

let totalFail = 0;
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const src = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).pop();
  const els = new Map();
  class El {
    constructor(id) { this._id = id; if (id) els.set(id, this); this.children = []; this._cls = new Set(); this._h = {};
      this.style = { cssText: '', setProperty() {} };
      this.classList = { add: (...c) => c.forEach(x => this._cls.add(x)), remove: (...c) => c.forEach(x => this._cls.delete(x)),
        contains: c => this._cls.has(c), toggle: c => this._cls.has(c) ? this._cls.delete(c) : this._cls.add(c) };
      this.textContent = ''; this._html = ''; this.disabled = false; }
    set id(v) { this._id = v; if (v) els.set(v, this); }
    get id() { return this._id; }
    set innerHTML(v) { this._html = v; if (v === '') this.children = []; }
    get innerHTML() { return this._html; }
    appendChild(c) { this.children.push(c); return c; }
    removeChild(c) { this.children = this.children.filter(x => x !== c); }
    remove() {}
    addEventListener(t, fn) { (this._h[t] = this._h[t] || []).push(fn); }
  }
  for (const m of html.matchAll(/id="([^"]+)"/g)) els.set(m[1], new El(m[1]));
  const docHandlers = {};
  const document = {
    getElementById(id) { return els.get(id) || null; },
    createElement() { return new El(); },
    querySelectorAll() { return []; },
    querySelector() { return new El(); },
    addEventListener(t, fn) { (docHandlers[t] = docHandlers[t] || []).push(fn); },
  };
  const store = new Map();
  const localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  let timers = [];
  const ctx = { document, localStorage, window: { addEventListener() {} }, console, Math, Date, JSON, Object, Array, String, Number, Set, Map, Error, parseInt, parseFloat, isNaN,
    setTimeout: (fn) => { timers.push(fn); return timers.length; }, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: fn => fn(0), performance: { now: () => 0 }, alert: m => console.log('  [alert]', m) };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  const exportSrc = `\n;globalThis.__T=(function(){var names=${JSON.stringify(NAMES)};var out={};for(var i=0;i<names.length;i++){try{out[names[i]]=eval(names[i]);}catch(e){}}return out;})();`;
  vm.runInContext(src + exportSrc, ctx, { filename: file });
  const T = ctx.__T;

  const fails = [];
  const err = (label, e) => fails.push(`${label}: ${e && e.message ? e.message : e}`);
  const call = (label, fn) => { try { const r = typeof fn === 'function' ? fn() : fn; return r; } catch (e) { err(label, e); } };

  console.log(`\n=== ${file} ===`);
  call('init', () => T.init && T.init());
  call('startGame', () => T.startGame());
  const p = T.gameState.player;

  // economy/screens
  call('town display', () => T.updateTownDisplay());
  call('store', () => T.goToStore());
  call('saloon', () => T.goToSaloon());
  call('sheriff', () => T.goToSheriff());
  call('gunsmith', () => T.goToGunsmith());
  call('achievements', () => T.updateAchievementsScreen());
  call('equipment', () => T.updateEquipmentScreen());
  call('upgrades', () => T.updateUpgradesScreen());
  call('card library', () => T.renderCardLibrary());
  call('inventory', () => T.updateInventoryDisplay());

  // every card effect, single and multi target
  const names = Object.keys(T.cardDefs || {});
  let cardCrashes = 0;
  for (const multi of [false, true]) {
    for (const name of names) {
      T.gameState.combatEnemies = multi
        ? [{ name: 'A', health: 999, maxHealth: 999, damage: 1, id: 1, nextAction: 'attack', skipNextTurn: false, defendActive: false, poisoned: 0, bleed: 0, marked: 0, disarmed: 0 }, { name: 'B', health: 999, maxHealth: 999, damage: 1, id: 2, nextAction: 'attack', skipNextTurn: false, defendActive: false, poisoned: 0, bleed: 0, marked: 0, disarmed: 0 }]
        : [{ name: 'A', health: 999, maxHealth: 999, damage: 1, id: 1, nextAction: 'attack', skipNextTurn: false, defendActive: false, poisoned: 0, bleed: 0, marked: 0, disarmed: 0 }];
      T.gameState.combatActive = true; T.gameState.cardProcessing = false; T.gameState.discardMode = false; T.gameState.discardTargets = [];
      T.gameState.selectedEnemyIndex = 0; T.gameState.firstShotThisCombat = false;
      p.health = 100; p.maxHealth = 100; p.coverActive = 0; p.dodgeActive = false; p.bullets = { regular: 99, express: 99, trick: 99 };
      p.trinkets = []; p.guns = [
        { name: 'Revolver', damage: 5, capacity: 20, loaded: { regular: 20, express: 20, trick: 20 }, currentType: 'regular', accuracyBonus: 0, upgdDmg: 0, upgdCap: 0, upgdAcc: 0 },
        { name: 'Rifle', damage: 7, capacity: 20, loaded: { regular: 20, express: 20, trick: 20 }, currentType: 'regular', accuracyBonus: 0, upgdDmg: 0, upgdCap: 0, upgdAcc: 0 }];
      T.gameState.player.equippedGunIndex = 0;
      T.gameState.combatHand = [{ ...T.cardDefs[name], name }];
      const el = new El(); el.classList.add('card');
      try { T.playCard(0, el); } catch (e) { cardCrashes++; err(`card ${name}${multi ? ' (multi)' : ''}`, e); }
      timers = [];
    }
  }
  console.log(`cards exercised: ${names.length * 2}, crashes: ${cardCrashes}`);

  // camp economy
  T.gameState.currentScreen = 'camp';
  call('camp', () => T.goToCamp());
  p.food = 5; p.health = 10; p.maxHealth = 20;
  T.gameState.currentScreen = 'camp';
  call('camp display', () => T.updateCampDisplay());
  let camp = document.getElementById('camp-actions');
  const foodSeq = [p.food];
  for (let i = 0; i < 3; i++) {
    const rows = document.getElementById('camp-actions').children;
    const cookBtn = rows[1] && rows[1].children[0];
    if (!cookBtn || !cookBtn._h.click) break;
    call('cook click', () => cookBtn._h.click[0]());
    foodSeq.push(p.food);
  }
  console.log('camp food sequence:', foodSeq.join(' -> '));
  if (foodSeq.length > 2 && foodSeq[foodSeq.length - 1] > foodSeq[1]) fails.push(`camp cooking can be repeated for free food (${foodSeq.join('->')})`);

  // kit/smokebomb stacking
  const kitDeck = () => { p.inventory = [{ name: 'Bandage Kit', type: 'heal', qty: 3 }]; p.extraCards = []; p.removedCards = []; p.trinkets = []; return T.buildDeck().filter(c => c.name === 'Bandage').length; };
  const kitCards = call('kit deck', kitDeck);
  console.log('Bandage cards from one stack of 3 kits:', kitCards, '| kits left:', JSON.stringify(p.inventory));
  if (kitCards !== 4) fails.push(`3 stacked Bandage Kits produce ${kitCards} Bandage cards (expected 4 incl. base)`);
  p.inventory = [{ name: 'Smokebomb', type: 'consumable', qty: 2 }];
  const smokeCards = T.buildDeck().filter(c => c.name === 'Smokebomb').length;
  console.log('Smokebomb cards from a stack of 2:', smokeCards);
  if (smokeCards !== 2) fails.push(`2 stacked Smokebombs produce ${smokeCards} card(s)`);

  // wilderness events
  T.gameState.combatInWilderness = true; T.gameState.currentScreen = 'wilderness';
  for (const ev of ['strongboxEvent', 'drifterEvent', 'mineShaftEvent', 'riverCrossingEvent', 'snakeOilEvent', 'posseEvent', 'hangingEvent', 'badgeEvent']) {
    if (typeof T[ev] !== 'function') continue;
    T.gameState.player.health = 20; T.gameState.player.food = 5; T.gameState.player.money = 100;
    call(ev, () => T[ev]());
    const btns = document.getElementById('wild-buttons');
    if (!btns || !btns.innerHTML.length) fails.push(`${ev} renders no buttons`);
  }
  // drifter with no food must explain itself rather than no-op
  document.getElementById('wild-result').textContent = 'SENTINEL';
  p.food = 0;
  call('helpDrifter (no food)', () => T.helpDrifter());
  if (document.getElementById('wild-result').textContent === 'SENTINEL') fails.push('helpDrifter silently does nothing with <2 food');

  // end run
  call('endRun', () => T.endRun('killed'));
  const title = document.getElementById('gameover-title');
  if (!title || !title.textContent) fails.push('endRun did not set the game-over title');

  console.log(fails.length ? fails.map(f => '  BUG ' + f).join('\n') : '  no failures');
  totalFail += fails.length;
}
console.log(`\n${totalFail} issue(s) found`);
process.exit(totalFail ? 1 : 0);
