import { lookFromSeed, type Look } from '../art/characters';
import { Scene, type Daylight, type SeatView } from '../art/scene';
import { play, setMusic, setSound, unlockAudio } from '../audio';
import {
  BASIC_IDS,
  CRAFTERS,
  DECOR_MAX,
  GEAR,
  GEAR_IDS,
  INGREDIENT_IDS,
  ITEMS,
  MATERIAL_IDS,
  MAX_LEVEL,
  RECIPES,
  STOVE_MAX,
  decorCost,
  gearPrice,
  maxRooms,
  menuSlots,
  recipePrice,
  roomCost,
  seatCount,
  stoveCost,
  xpForLevel,
  type CrafterId,
  type GearId,
  type GearSlot,
  type IngredientId,
  type ItemId,
  type RecipeId,
} from '../game/data';
import {
  acceptOffer,
  adventurer,
  buyBasic,
  buyDecor,
  buyFromMerchant,
  buyRoom,
  buyStove,
  canCraft,
  canMake,
  craft,
  finishDay,
  gearWishes,
  guests,
  hasFlag,
  hireCrafter,
  knowsDesign,
  lodgingPrice,
  newGame,
  questChance,
  startMorning,
  toggleMenu,
  unknownCrafters,
  type Adventurer,
  type GameState,
  type News,
} from '../game/game';
import { playService } from '../game/autoplay';
import { PAN_SIZE, addToPan, cook, discard, removeFromPan, seatWanting, serve, startService, tick, type Service } from '../game/service';
import { STORY_BEATS, STORY_SPEAKERS, type StoryBeat } from '../game/story';
import { GAME_NAME, LANGUAGES, LANGUAGE_NAMES, MESSAGES, type Language, type Messages } from '../i18n';
import { clearGame, loadGame, loadSettings, saveGame, saveSettings, type Settings } from '../storage';
import { CRAFTER_SPEAKER, SPEAKER_LOOKS, dishIcon, dishSwaps, face, icon, portraitUrl } from './icons';

type Tab = 'guests' | 'market' | 'menu' | 'inn' | 'workshop';
type Screen = 'title' | 'morning' | 'service' | 'evening';

interface StoryView {
  beat: StoryBeat;
  /** -1 shows the chapter card. */
  line: number;
  shown: number;
}

function el<T extends HTMLElement>(parent: ParentNode, selector: string): T {
  const found = parent.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element: ${selector}`);
  return found;
}

export class App {
  private settings: Settings = loadSettings();
  private state: GameState | null = loadGame();
  private service: Service | null = null;
  private screen: Screen = 'title';
  private tab: Tab = 'guests';
  private story: StoryView | null = null;
  private settingsOpen = false;
  private confirmNew = false;
  private readonly scene = new Scene();
  private readonly titleScene = new Scene();
  private lastFrame = 0;
  private time = 0;
  private readonly looks = new Map<number, Look>();
  private kitchenKey = '';

  private readonly hud: HTMLElement;
  private readonly sceneWrap: HTMLElement;
  private readonly hits: HTMLElement;
  private readonly floats: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly menuCard: HTMLElement;
  private readonly overlay: HTMLElement;
  private readonly toasts: HTMLElement;

  constructor(private readonly root: HTMLElement) {
    root.innerHTML = `
      <div class="game">
        <header class="hud"></header>
        <div class="stage">
          <div class="scene-wrap">
            <div class="hits"></div>
            <div class="floats"></div>
          </div>
          <div class="menu-card"></div>
        </div>
        <section class="panel"></section>
      </div>
      <div class="toasts"></div>
      <div class="overlay" hidden></div>
    `;
    this.hud = el(root, '.hud');
    this.sceneWrap = el(root, '.scene-wrap');
    this.hits = el(root, '.hits');
    this.floats = el(root, '.floats');
    this.panel = el(root, '.panel');
    this.menuCard = el(root, '.menu-card');
    this.overlay = el(root, '.overlay');
    this.toasts = el(root, '.toasts');
    this.sceneWrap.prepend(this.scene.canvas);
    this.titleScene.canvas.classList.add('title-backdrop');

    setSound(this.settings.sound);
    setMusic(false);
    root.addEventListener('click', (event) => this.onClick(event));
    document.addEventListener('keydown', (event) => this.onKey(event));
    this.applyLanguage();
    this.render();
    requestAnimationFrame((now) => this.frame(now));
    if (import.meta.env.DEV) {
      // A hook for automated play-testing in development.
      (window as unknown as Record<string, unknown>).__tt = {
        app: this,
        skipDays: (days: number) => {
          const state = this.state!;
          for (let i = 0; i < days; i++) {
            for (const offer of [...state.offers]) acceptOffer(state, offer.id);
            for (const item of BASIC_IDS) while (state.stock[item] < 14 && buyBasic(state, item, 1));
            for (const recipe of state.recipes) if (!state.menu.includes(recipe)) toggleMenu(state, recipe);
            state.pendingStory = null;
            finishDay(state, playService(state).totals);
            startMorning(state);
          }
          this.enterMorning();
        },
        firstOrder: () => {
          const waiting = this.service?.seats.find((customer) => customer?.mood === 'waiting');
          return waiting?.order ? RECIPES[waiting.order].ingredients : null;
        },
      };
    }
  }

  private get t(): Messages {
    return MESSAGES[this.settings.language];
  }

  private applyLanguage(): void {
    document.documentElement.lang = this.settings.language;
    document.title = GAME_NAME;
  }

  // ---------------------------------------------------------------- frame loop

  private frame(now: number): void {
    const dt = Math.min(0.1, this.lastFrame ? (now - this.lastFrame) / 1000 : 0);
    this.lastFrame = now;
    this.time += dt;

    if (this.screen === 'service' && this.service && this.state && !this.story && !this.settingsOpen && !document.hidden) {
      tick(this.state, this.service, dt);
      this.handleServiceEvents();
      if (this.service.done) this.endService();
      else this.updateKitchen();
    }

    if (this.story) this.advanceTypewriter(dt);

    if (this.screen === 'title') {
      this.titleScene.draw(this.time, 'evening', []);
    } else {
      this.scene.draw(this.time, this.daylight(), this.seatViews());
    }
    requestAnimationFrame((next) => this.frame(next));
  }

  private daylight(): Daylight {
    return this.screen === 'morning' ? 'morning' : this.screen === 'evening' ? 'evening' : 'day';
  }

  private lookOf(seed: number, cls: Look['cls']): Look {
    const key = seed * 8 + ['warrior', 'mage', 'rogue', 'ranger', 'villager'].indexOf(cls);
    let look = this.looks.get(key);
    if (!look) {
      look = lookFromSeed(cls, seed);
      this.looks.set(key, look);
    }
    return look;
  }

  private advLook(adv: Adventurer): Look {
    return this.lookOf(adv.seed, adv.cls);
  }

  private seatViews(): (SeatView | null)[] {
    const state = this.state;
    if (!state) return [];
    if (this.screen === 'service' && this.service) {
      return this.service.seats.map((customer) => {
        if (!customer) return null;
        const adv = customer.spec.advId !== undefined ? adventurer(state, customer.spec.advId) : undefined;
        const look = adv ? this.advLook(adv) : this.lookOf(customer.spec.seed, 'villager');
        return {
          key: customer.uid,
          look,
          icons: customer.order ? RECIPES[customer.order].ingredients : [],
          patience: customer.patience / customer.maxPatience,
          mood: customer.mood,
          age: customer.age,
          leaveIn: customer.mood === 'waiting' ? 9 : customer.timer,
          dish: customer.order ? { art: RECIPES[customer.order].shape, swaps: dishSwaps(customer.order) } : undefined,
        };
      });
    }
    // Outside opening hours the lodgers hang around the counter.
    const staying = guests(state).slice(0, 4);
    const seats: (SeatView | null)[] = Array.from({ length: Math.max(3, staying.length) }, () => null);
    const order = seats.length === 3 ? [1, 0, 2] : [1, 2, 0, 3];
    staying.forEach((adv, index) => {
      seats[order[index]!] = {
        key: adv.id,
        look: this.advLook(adv),
        icons: [],
        patience: -1,
        mood: 'idle',
        age: 9,
        leaveIn: 9,
      };
    });
    return seats;
  }

  // ---------------------------------------------------------------- flow

  private save(): void {
    if (this.state) saveGame(this.state);
  }

  private startNewGame(): void {
    clearGame();
    this.state = newGame(Math.floor(Math.random() * 0x7fffffff));
    this.looks.clear();
    this.save();
    this.enterMorning();
  }

  private continueGame(): void {
    if (!this.state) return this.startNewGame();
    if (this.state.phase === 'evening') {
      this.screen = 'evening';
      this.render();
    } else {
      this.enterMorning();
    }
  }

  private enterMorning(): void {
    const state = this.state!;
    this.screen = 'morning';
    this.service = null;
    this.tab = 'guests';
    if (state.pendingStory) this.story = { beat: state.pendingStory, line: -1, shown: 0 };
    this.render();
  }

  private openInn(): void {
    const state = this.state!;
    if (state.menu.length === 0) {
      this.toast(this.t.emptyMenu, 'bad');
      this.tab = 'menu';
      this.render();
      return;
    }
    this.save();
    this.service = startService(state);
    this.screen = 'service';
    this.kitchenKey = '';
    play('bell');
    this.render();
  }

  private endService(): void {
    const state = this.state!;
    const totals = this.service!.totals;
    finishDay(state, totals);
    this.service = null;
    this.screen = 'evening';
    this.save();
    play('page');
    this.render();
  }

  private nextDay(): void {
    const state = this.state!;
    startMorning(state);
    this.save();
    play('page');
    this.enterMorning();
  }

  private handleServiceEvents(): void {
    const service = this.service!;
    const state = this.state!;
    if (service.events.length === 0) return;
    for (const event of service.events.splice(0)) {
      switch (event.type) {
        case 'arrive':
          play('tap');
          break;
        case 'served':
          play('coin');
          this.float(event.seat, `+${event.gold + event.tip}`, 'gold');
          break;
        case 'left':
          play('fail');
          this.float(event.seat, '…', 'bad');
          break;
        case 'cooked':
          play(event.dish === 'slop' ? 'fail' : 'ready');
          break;
        case 'discovered':
          play('discover');
          this.toast(this.t.discovered(this.t.recipes[event.recipe]), 'good', dishIcon(event.recipe));
          break;
        case 'levelUp': {
          play('level');
          this.toast(this.t.levelUpToast(event.level), 'good', icon('star'));
          if (menuSlots(event.level) > menuSlots(event.level - 1)) {
            this.toast(this.t.unlockedMenu(menuSlots(event.level)), 'good', icon('scroll'));
          }
          if (seatCount(event.level) > seatCount(event.level - 1)) this.toast(this.t.unlockedSeat, 'good', icon('heart'));
          break;
        }
      }
    }
    this.renderHud();
    this.renderHits();
    void state;
  }

  // ---------------------------------------------------------------- input

  private onKey(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (this.story) {
      event.preventDefault();
      this.advanceStory();
    }
  }

  private onClick(event: MouseEvent): void {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!target || target.hasAttribute('disabled')) return;
    unlockAudio();
    if (this.settings.music) setMusic(true);
    const act = target.dataset.act!;
    const arg = target.dataset.arg ?? '';
    const state = this.state;

    switch (act) {
      case 'new':
        if (this.state && !this.confirmNew) {
          this.confirmNew = true;
          this.render();
        } else {
          this.confirmNew = false;
          this.settingsOpen = false;
          play('page');
          this.startNewGame();
        }
        return;
      case 'cancel-new':
        this.confirmNew = false;
        this.render();
        return;
      case 'continue':
        play('page');
        this.continueGame();
        return;
      case 'lang':
        this.settings.language = arg as Language;
        saveSettings(this.settings);
        this.applyLanguage();
        play('tap');
        this.render();
        return;
      case 'settings':
        this.settingsOpen = !this.settingsOpen;
        this.confirmNew = false;
        play('tap');
        this.render();
        return;
      case 'sound':
        this.settings.sound = !this.settings.sound;
        setSound(this.settings.sound);
        saveSettings(this.settings);
        play('tap');
        this.render();
        return;
      case 'music':
        this.settings.music = !this.settings.music;
        setMusic(this.settings.music);
        saveSettings(this.settings);
        play('tap');
        this.render();
        return;
      case 'story':
        this.advanceStory();
        return;
    }

    if (!state) return;
    let ok = true;
    switch (act) {
      case 'tab':
        this.tab = arg as Tab;
        play('tap');
        this.panel.scrollTop = 0;
        break;
      case 'offer':
        ok = acceptOffer(state, Number(arg));
        play(ok ? 'buy' : 'fail');
        break;
      case 'basic': {
        const [item, qty] = arg.split(':');
        ok = buyBasic(state, item as ItemId, Number(qty));
        play(ok ? 'buy' : 'fail');
        break;
      }
      case 'merchant':
        ok = buyFromMerchant(state, Number(arg));
        play(ok ? 'buy' : 'fail');
        break;
      case 'menu':
        ok = toggleMenu(state, arg as RecipeId);
        play(ok ? 'tap' : 'fail');
        break;
      case 'room':
        ok = buyRoom(state);
        play(ok ? 'buy' : 'fail');
        break;
      case 'stove':
        ok = buyStove(state);
        play(ok ? 'buy' : 'fail');
        break;
      case 'decor':
        ok = buyDecor(state);
        play(ok ? 'buy' : 'fail');
        break;
      case 'hire':
        ok = hireCrafter(state, arg as CrafterId);
        play(ok ? 'level' : 'fail');
        break;
      case 'craft':
        ok = craft(state, arg as GearId);
        play(ok ? 'ready' : 'fail');
        break;
      case 'open':
        this.openInn();
        return;
      case 'next-day':
        this.nextDay();
        return;
      case 'add':
        if (this.service && addToPan(state, this.service, arg as IngredientId)) play('pan');
        this.updateKitchen();
        return;
      case 'unpan':
        if (this.service && removeFromPan(state, this.service, Number(arg))) play('tap');
        this.updateKitchen();
        return;
      case 'cook':
        if (this.service && cook(state, this.service)) play('cook');
        this.updateKitchen();
        return;
      case 'serve':
        if (this.service) serve(state, this.service);
        this.handleServiceEvents();
        this.updateKitchen();
        return;
      case 'seat':
        if (this.service && this.service.plate) serve(state, this.service, Number(arg));
        this.handleServiceEvents();
        this.updateKitchen();
        return;
      case 'discard':
        if (this.service && discard(this.service)) play('tap');
        this.updateKitchen();
        return;
      default:
        return;
    }
    if (ok) this.save();
    this.render();
  }

  // ---------------------------------------------------------------- story

  private advanceTypewriter(dt: number): void {
    const story = this.story!;
    if (story.line < 0) return;
    const text = this.t.story[story.beat].lines[story.line] ?? '';
    if (story.shown >= text.length) return;
    story.shown = Math.min(text.length, story.shown + dt * 55);
    const node = this.overlay.querySelector<HTMLElement>('.story-text');
    if (node) node.textContent = text.slice(0, Math.floor(story.shown));
    if (story.shown >= text.length) this.overlay.querySelector('.story-next')?.classList.add('ready');
  }

  private advanceStory(): void {
    const story = this.story;
    if (!story) return;
    const lines = this.t.story[story.beat].lines;
    if (story.line >= 0 && story.shown < (lines[story.line]?.length ?? 0)) {
      story.shown = lines[story.line]!.length - 0.01;
      return;
    }
    play('page');
    story.line += 1;
    story.shown = 0;
    if (story.line >= lines.length) {
      this.story = null;
      if (this.state) {
        this.state.pendingStory = null;
        this.save();
      }
    }
    this.render();
  }

  // ---------------------------------------------------------------- feedback

  private toast(text: string, kind: 'good' | 'bad' = 'good', iconHtml = ''): void {
    const node = document.createElement('div');
    node.className = `toast ${kind}`;
    node.innerHTML = `${iconHtml}<span>${text}</span>`;
    this.toasts.append(node);
    window.setTimeout(() => node.remove(), 3200);
  }

  private float(seat: number, text: string, kind: string): void {
    const seats = this.service?.seats.length ?? 3;
    const node = document.createElement('div');
    node.className = `float ${kind}`;
    node.textContent = text;
    node.style.left = `${((seat + 0.5) / seats) * 100}%`;
    this.floats.append(node);
    window.setTimeout(() => node.remove(), 1100);
  }

  // ---------------------------------------------------------------- rendering

  private render(): void {
    this.root.dataset.screen = this.screen;
    this.renderHud();
    this.renderHits();
    this.renderPanel();
    this.renderMenuCard();
    this.renderOverlay();
  }

  /** Today's menu with what goes into each dish; shown under the scene where there is room. */
  private renderMenuCard(): void {
    const state = this.state;
    if (!state || this.screen === 'title') {
      this.menuCard.innerHTML = '';
      return;
    }
    const t = this.t;
    const rows = state.menu
      .map((recipe) => {
        const needs = RECIPES[recipe].ingredients.map((item) => icon(item, 'mini')).join('');
        return `<div class="menu-line">${dishIcon(recipe)}<span>${t.recipes[recipe]}</span><span class="needs">${needs}</span>${this.price(recipePrice(recipe), true)}</div>`;
      })
      .join('');
    this.menuCard.innerHTML = `<h3>${t.tabs.menu}</h3><div class="menu-lines">${rows}</div>`;
  }

  private renderHud(): void {
    const state = this.state;
    if (!state || this.screen === 'title') {
      this.hud.innerHTML = '';
      return;
    }
    const t = this.t;
    const phase = this.screen === 'morning' ? t.morning : this.screen === 'service' ? t.service : t.evening;
    const need = xpForLevel(state.level);
    const percent = state.level >= MAX_LEVEL ? 100 : Math.min(100, Math.round((state.xp / need) * 100));
    this.hud.innerHTML = `
      <div class="hud-day"><b>${t.day(state.day)}</b><span>${phase}</span></div>
      <div class="hud-level" title="${t.xp}: ${state.xp}/${need}">
        ${icon('star')}<b>${state.level}</b>
        <div class="bar"><i style="width:${percent}%"></i></div>
      </div>
      <div class="hud-gold">${icon('coin')}<b>${state.gold}</b></div>
      <button class="icon-btn" data-act="settings" aria-label="${t.settings}">${icon('hammer')}</button>
    `;
  }

  /** Invisible buttons over the seats, so guests themselves can be tapped to serve them. */
  private renderHits(): void {
    if (this.screen !== 'service' || !this.service) {
      this.hits.innerHTML = '';
      return;
    }
    const count = this.service.seats.length;
    this.hits.innerHTML = this.service.seats
      .map(
        (_, index) =>
          `<button class="hit" data-act="seat" data-arg="${index}" style="left:${(index / count) * 100}%;width:${100 / count}%" tabindex="-1"></button>`,
      )
      .join('');
  }

  private renderPanel(): void {
    const scroll = this.panel.scrollTop;
    const state = this.state;
    if (!state || this.screen === 'title') {
      this.panel.innerHTML = '';
      return;
    }
    if (this.screen === 'morning') this.panel.innerHTML = this.morningHtml(state);
    else if (this.screen === 'service') {
      this.panel.innerHTML = this.kitchenHtml(state);
      this.kitchenKey = this.kitchenStateKey(state);
    } else this.panel.innerHTML = this.eveningHtml(state);
    this.panel.scrollTop = scroll;
    const body = this.panel.querySelector<HTMLElement>('.tab-body');
    if (body) body.scrollTop = this.tabScroll;
    body?.addEventListener('scroll', () => (this.tabScroll = body.scrollTop), { passive: true });
  }

  private tabScroll = 0;

  // ---- morning

  private advName(state: GameState, id: number): string {
    return adventurer(state, id)?.name ?? '?';
  }

  private newsHtml(state: GameState, news: News[]): string {
    const t = this.t;
    return news
      .map((item) => {
        switch (item.type) {
          case 'arrived': {
            const adv = adventurer(state, item.advId);
            return adv ? `<li>${face(this.advLook(adv), 'small')}<span>${t.news.arrived(adv.name, t.classes[adv.cls])}</span></li>` : '';
          }
          case 'returned': {
            const adv = adventurer(state, item.advId);
            if (!adv) return '';
            const text = item.success ? t.news.returnedWin(adv.name) : t.news.returnedLoss(adv.name);
            const level = item.levelUp ? ` <b>${t.news.levelUp(adv.name, adv.level)}</b>` : '';
            return `<li class="${item.success ? 'good' : 'bad'}">${face(this.advLook(adv), 'small')}<span>${text}${level}</span></li>`;
          }
          case 'noRoom':
            return `<li class="bad">${icon('bed')}<span>${t.news.noRoom(this.advName(state, item.advId))}</span></li>`;
          case 'departed':
            return `<li>${icon('bag')}<span>${t.news.departed(this.advName(state, item.advId))}</span></li>`;
          case 'bought':
            return `<li class="good">${icon(item.gear)}<span>${t.news.bought(this.advName(state, item.advId), t.gear[item.gear], item.price)}</span></li>`;
          case 'lodging':
            return `<li>${icon('bed')}<span>${t.news.lodging(this.advName(state, item.advId), item.price)}</span></li>`;
          case 'gift':
            return `<li class="good">${icon('turnip')}<span>${t.news.gift}</span></li>`;
        }
      })
      .join('');
  }

  private price(amount: number, affordable: boolean): string {
    return `<span class="price ${affordable ? '' : 'short'}">${icon('coin')}${amount}</span>`;
  }

  private guestsTab(state: GameState): string {
    const t = this.t;
    const news = this.newsHtml(state, state.news);
    const sellers = [...new Set(state.offers.map((offer) => offer.advId))];
    const offers = sellers
      .map((advId) => {
        const adv = adventurer(state, advId);
        if (!adv) return '';
        const rows = state.offers
          .filter((offer) => offer.advId === advId)
          .map((offer) => {
            const can = state.gold >= offer.price;
            let what: string;
            if (offer.kind === 'item') {
              what = `${icon(offer.item)}<span><b>${offer.qty}×</b> ${t.items[offer.item]}</span>`;
            } else if (offer.kind === 'recipe') {
              const needs = RECIPES[offer.recipe].ingredients.map((item) => icon(item, 'mini')).join('');
              what = `${dishIcon(offer.recipe)}<span><em>${t.recipeOffer}:</em> ${t.recipes[offer.recipe]}<span class="needs">${needs}</span></span>`;
            } else {
              what = `${icon(offer.gear)}<span><em>${t.designOffer}:</em> ${t.gear[offer.gear]}</span>`;
            }
            return `<div class="row">${what}<button class="btn" data-act="offer" data-arg="${offer.id}" ${can ? '' : 'disabled'}>${this.price(offer.price, can)}</button></div>`;
          })
          .join('');
        return `<div class="card"><div class="card-head">${face(this.advLook(adv))}<div><b>${adv.name}</b><small>${t.classes[adv.cls]} · ${t.level(adv.level)}</small></div></div>${rows}</div>`;
      })
      .join('');
    return `
      ${news ? `<h3>${t.newsTitle}</h3><ul class="news">${news}</ul>` : ''}
      <h3>${t.offersTitle}</h3>
      ${offers || `<p class="hint">${t.noOffers}</p>`}
    `;
  }

  private marketTab(state: GameState): string {
    const t = this.t;
    const basics = BASIC_IDS.map((item) => {
      const value = ITEMS[item].value;
      const buttons = [1, 5]
        .map((qty) => {
          const can = state.gold >= value * qty;
          return `<button class="btn" data-act="basic" data-arg="${item}:${qty}" ${can ? '' : 'disabled'}>+${qty} ${this.price(value * qty, can)}</button>`;
        })
        .join('');
      return `<div class="row">${icon(item)}<span>${t.items[item]}<small>${t.have(state.stock[item])}</small></span><span class="btns">${buttons}</span></div>`;
    }).join('');
    let pedlar: string;
    if (!hasFlag(state, 'pedlar')) pedlar = `<p class="hint">${t.pedlarLocked}</p>`;
    else if (state.merchant.every((lot) => lot.qty <= 0)) pedlar = `<p class="hint">${t.pedlarEmpty}</p>`;
    else {
      pedlar = state.merchant
        .map((lot, index) => {
          if (lot.qty <= 0) return '';
          const can = state.gold >= lot.price;
          return `<div class="row">${icon(lot.item)}<span>${t.items[lot.item]}<small>${t.have(state.stock[lot.item])} · ${t.left(lot.qty)}</small></span><button class="btn" data-act="merchant" data-arg="${index}" ${can ? '' : 'disabled'}>+1 ${this.price(lot.price, can)}</button></div>`;
        })
        .join('');
    }
    return `
      <h3>${t.basicsTitle}</h3><div class="card">${basics}</div>
      <h3>${t.pedlarTitle}</h3><div class="card">${pedlar}</div>
      ${this.larderHtml(state)}
    `;
  }

  private larderHtml(state: GameState): string {
    const owned = INGREDIENT_IDS.filter((item) => state.stock[item] > 0);
    if (owned.length === 0) return '';
    return `<div class="larder">${owned.map((item) => `<span class="chip" title="${this.t.items[item]}">${icon(item)}${state.stock[item]}</span>`).join('')}</div>`;
  }

  private menuTab(state: GameState): string {
    const t = this.t;
    const slots = menuSlots(state.level);
    const full = state.menu.length >= slots;
    const sorted = [...state.recipes].sort(
      (a, b) => Number(state.menu.includes(b)) - Number(state.menu.includes(a)) || recipePrice(a) - recipePrice(b),
    );
    const rows = sorted
      .map((recipe) => {
        const on = state.menu.includes(recipe);
        const needs = RECIPES[recipe].ingredients
          .map((item) => `<span class="need ${state.stock[item] > 0 ? '' : 'lacking'}" title="${t.items[item]}">${icon(item, 'mini')}</span>`)
          .join('');
        const makeable = canMake(state.stock, recipe);
        const label = on ? `✓ ${t.onMenu}` : full ? t.menuFull : t.offMenu;
        return `<div class="row recipe ${on ? 'on' : ''}">${dishIcon(recipe)}<span>${t.recipes[recipe]}<span class="needs">${needs}${makeable ? '' : `<small class="warn">${t.missing}</small>`}</span></span>${this.price(recipePrice(recipe), true)}<button class="btn ${on ? 'active' : ''}" data-act="menu" data-arg="${recipe}" ${!on && full ? 'disabled' : ''}>${label}</button></div>`;
      })
      .join('');
    return `
      <h3>${t.menuTitle(state.menu.length, slots)}</h3>
      <p class="hint">${t.menuHint}</p>
      <div class="card">${rows}</div>
      <p class="hint">${icon('scroll', 'mini')} ${t.recipeHint}</p>
    `;
  }

  private gearIcons(adv: Adventurer): string {
    const slots: GearSlot[] = ['weapon', 'body', 'head', 'feet', 'trinket', 'potion'];
    const worn = slots.flatMap((slot) => (adv.gear[slot] ? [adv.gear[slot]] : []));
    if (worn.length === 0) return '';
    return `<span class="needs">${worn.map((gear) => `<span title="${this.t.gear[gear]}">${icon(gear, 'mini')}</span>`).join('')}</span>`;
  }

  private innTab(state: GameState): string {
    const t = this.t;
    const upgrade = (
      act: string,
      iconName: string,
      title: string,
      desc: string,
      cost: number,
      maxed: boolean,
      locked = '',
    ) => {
      const can = state.gold >= cost;
      const button = maxed
        ? `<span class="done">${locked || t.maxed}</span>`
        : `<button class="btn" data-act="${act}" ${can ? '' : 'disabled'}>${this.price(cost, can)}</button>`;
      return `<div class="row">${icon(iconName)}<span>${title}<small>${desc}</small></span>${button}</div>`;
    };
    const roomCap = maxRooms(state.level);
    const roomsMaxed = state.rooms >= roomCap;
    const upgrades =
      upgrade('room', 'bed', t.rooms(state.rooms, roomCap), t.roomsDesc, roomCost(state.rooms), roomsMaxed, roomsMaxed && roomCap < 8 ? t.needLevel(state.level + 1) : '') +
      upgrade('stove', 'flame', t.stove(state.stove, STOVE_MAX), t.stoveDesc, stoveCost(state.stove), state.stove >= STOVE_MAX) +
      upgrade('decor', 'heart', t.decor(state.decor, DECOR_MAX), t.decorDesc, decorCost(state.decor), state.decor >= DECOR_MAX);
    const list = [...state.adventurers]
      .sort((a, b) => Number(b.status === 'inn') - Number(a.status === 'inn') || b.level - a.level)
      .map((adv) => {
        const status =
          adv.status === 'inn'
            ? `${adv.lodged ? `${t.atInn(adv.nights)} · ${icon('coin', 'mini')}${lodgingPrice(adv)}` : t.news.noRoom(adv.name)}`
            : t.onQuest(adv.questDays);
        const chance = adv.status === 'inn' ? `<small>${t.questChance(Math.round(questChance(adv) * 100))}</small>` : '';
        return `<div class="row adv ${adv.status}">${face(this.advLook(adv))}<span><b>${adv.name}</b> <em>${t.classes[adv.cls]} · ${t.level(adv.level)}</em><small>${status}</small>${chance}${this.gearIcons(adv)}</span></div>`;
      })
      .join('');
    return `
      <h3>${t.upgrades}</h3><div class="card">${upgrades}</div>
      <h3>${t.adventurersTitle}</h3>
      ${list ? `<div class="card">${list}</div>` : `<p class="hint">${t.noAdventurers}</p>`}
    `;
  }

  private workshopTab(state: GameState): string {
    const t = this.t;
    if (!hasFlag(state, 'workshop')) return `<p class="hint">${icon('lock')} ${t.workshopLocked}</p>`;
    const materials = `<div class="larder">${[...MATERIAL_IDS, 'herbs' as ItemId, 'mushroom' as ItemId]
      .map((item) => `<span class="chip" title="${t.items[item]}">${icon(item)}${state.stock[item]}</span>`)
      .join('')}</div>`;

    const hires = unknownCrafters(state)
      .map((crafter) => {
        const cost = CRAFTERS[crafter].cost;
        const can = state.gold >= cost;
        const who = t.crafters[crafter];
        return `<div class="card"><div class="card-head">${face(SPEAKER_LOOKS[CRAFTER_SPEAKER[crafter]])}<div><b>${who.name}</b><small>${who.title}</small></div><button class="btn" data-act="hire" data-arg="${crafter}" ${can ? '' : 'disabled'}>${t.hire} ${this.price(cost, can)}</button></div></div>`;
      })
      .join('');

    const crafters = state.crafters
      .map((crafter) => {
        const who = t.crafters[crafter];
        const energy = state.energy[crafter] ?? 0;
        const max = CRAFTERS[crafter].energy;
        const pips = Array.from({ length: max }, (_, i) => `<i class="${i < energy ? 'full' : ''}"></i>`).join('');
        const designs = GEAR_IDS.filter((gear) => GEAR[gear].crafter === crafter);
        const rows = designs
          .map((gear) => {
            const def = GEAR[gear];
            if (!knowsDesign(state, gear)) return `<div class="row locked">${icon('lock')}<span>???<small>${t.designsHint}</small></span></div>`;
            const needs = Object.entries(def.materials)
              .map(([item, count]) => `<span class="need ${state.stock[item as ItemId] >= (count ?? 0) ? '' : 'lacking'}" title="${t.items[item as ItemId]}">${icon(item, 'mini')}${count}</span>`)
              .join('');
            const who2 = def.classes.length === 4 ? '' : `<small>${t.fits}: ${def.classes.map((cls) => t.classes[cls]).join(', ')}</small>`;
            const stock = state.gear[gear] ?? 0;
            return `<div class="row">${icon(gear)}<span>${t.gear[gear]}${stock ? ` <b class="stock">×${stock}</b>` : ''}<span class="needs">${needs}${def.work > 1 ? `<span class="need">${icon('hammer', 'mini')}${def.work}</span>` : ''}</span>${who2}</span>${this.price(gearPrice(gear), true)}<button class="btn" data-act="craft" data-arg="${gear}" ${canCraft(state, gear) ? '' : 'disabled'}>${t.make}</button></div>`;
          })
          .join('');
        return `<div class="card"><div class="card-head">${face(SPEAKER_LOOKS[CRAFTER_SPEAKER[crafter]])}<div><b>${who.name}</b><small>${who.title}</small></div><span class="pips" title="${t.work(energy, max)}">${icon('hammer', 'mini')}${pips}</span></div>${rows}</div>`;
      })
      .join('');

    const wishes = guests(state)
      .map((adv) => {
        const wanted = gearWishes(state, adv);
        if (wanted.length === 0) return '';
        return `<div class="row adv">${face(this.advLook(adv), 'small')}<span><b>${adv.name}</b> <em>${t.classes[adv.cls]}</em><small>${icon('coin', 'mini')}${adv.purse}</small></span><span class="needs">${wanted
          .map((gear) => `<span class="need ${(state.gear[gear] ?? 0) > 0 ? '' : 'lacking'}" title="${t.gear[gear]}">${icon(gear, 'mini')}</span>`)
          .join('')}</span></div>`;
      })
      .join('');

    const shelf = GEAR_IDS.filter((gear) => (state.gear[gear] ?? 0) > 0)
      .map((gear) => `<span class="chip" title="${t.gear[gear]}">${icon(gear)}${state.gear[gear]}</span>`)
      .join('');

    return `
      <h3>${t.materialsTitle}</h3>${materials}
      ${hires}
      ${crafters}
      <h3>${t.wanted}</h3>${wishes ? `<div class="card">${wishes}</div>` : `<p class="hint">–</p>`}
      <h3>${t.shelf}</h3>${shelf ? `<div class="larder">${shelf}</div>` : `<p class="hint">${t.shelfEmpty}</p>`}
    `;
  }

  private morningHtml(state: GameState): string {
    const t = this.t;
    const tabs: Tab[] = ['guests', 'market', 'menu', 'inn'];
    if (hasFlag(state, 'workshop')) tabs.push('workshop');
    if (!tabs.includes(this.tab)) this.tab = 'guests';
    const badge: Partial<Record<Tab, number>> = {
      guests: state.offers.length,
      workshop: unknownCrafters(state).length,
    };
    const tabIcon: Record<Tab, string> = { guests: 'bag', market: 'coin', menu: 'scroll', inn: 'bed', workshop: 'hammer' };
    const tabButtons = tabs
      .map(
        (tab) =>
          `<button class="tab ${tab === this.tab ? 'active' : ''}" data-act="tab" data-arg="${tab}">${icon(tabIcon[tab])}<span>${t.tabs[tab]}</span>${badge[tab] ? `<i class="badge">${badge[tab]}</i>` : ''}</button>`,
      )
      .join('');
    const body =
      this.tab === 'guests'
        ? this.guestsTab(state)
        : this.tab === 'market'
          ? this.marketTab(state)
          : this.tab === 'menu'
            ? this.menuTab(state)
            : this.tab === 'inn'
              ? this.innTab(state)
              : this.workshopTab(state);
    return `
      <nav class="tabs">${tabButtons}</nav>
      <div class="tab-body">${body}</div>
      <div class="footer"><button class="btn big primary" data-act="open">${icon('flame')} ${t.open}</button></div>
    `;
  }

  // ---- service

  private pantry(state: GameState): IngredientId[] {
    const service = this.service!;
    return INGREDIENT_IDS.filter((item) => state.stock[item] > 0 || service.pan.includes(item));
  }

  private kitchenStateKey(state: GameState): string {
    const service = this.service!;
    return [
      service.pan.join(','),
      service.plate ?? '',
      service.cooking ? 'c' : '',
      seatWanting(service, service.plate),
      service.queue.length,
      service.seats.map((customer) => (customer ? customer.mood[0] : '-')).join(''),
      this.pantry(state)
        .map((item) => `${item}${state.stock[item]}`)
        .join(','),
      state.recipes.length,
    ].join('|');
  }

  private kitchenHtml(state: GameState): string {
    const t = this.t;
    const service = this.service!;
    const busy = service.cooking !== null;
    const slots = Array.from({ length: PAN_SIZE }, (_, index) => {
      const item = service.pan[index];
      return item
        ? `<button class="slot filled" data-act="unpan" data-arg="${index}" ${busy ? 'disabled' : ''}>${icon(item)}</button>`
        : `<span class="slot"></span>`;
    }).join('');

    let action: string;
    let plate = '';
    if (service.plate) {
      const target = seatWanting(service, service.plate);
      const name = service.plate === 'slop' ? t.slop : t.recipes[service.plate];
      plate = `<div class="plate">${dishIcon(service.plate, 'large')}<b>${name}</b></div>`;
      action =
        target >= 0
          ? `<button class="btn big primary" data-act="serve">${icon('heart')} ${t.serve}</button>`
          : `<button class="btn big" disabled>${t.nobodyWants}</button>`;
      action += `<button class="btn big danger" data-act="discard" aria-label="${t.discard}">${icon('trash')}</button>`;
    } else if (busy) {
      action = `<button class="btn big cooking" disabled>${icon('flame')} ${t.cooking}<i class="progress"></i></button>`;
    } else {
      action = `<button class="btn big primary" data-act="cook" ${service.pan.length ? '' : 'disabled'}>${icon('flame')} ${t.cook}</button>`;
    }

    const lockPantry = busy || service.plate !== null || service.pan.length >= PAN_SIZE;
    const pantry = this.pantry(state)
      .map(
        (item) =>
          `<button class="ingredient" data-act="add" data-arg="${item}" ${lockPantry || state.stock[item] <= 0 ? 'disabled' : ''} title="${t.items[item]}">${icon(item)}<b>${state.stock[item]}</b><small>${t.items[item]}</small></button>`,
      )
      .join('');

    const waiting = service.queue.length + service.seats.filter((customer) => customer?.mood === 'waiting').length;
    const hint = state.day === 1 && state.stats.served < 3 ? `<p class="hint tutorial">${t.tutorial}</p>` : '';
    return `
      <div class="kitchen">
        <div class="kitchen-top"><span>${t.guestsLeft(waiting)}</span><span class="menu-strip">${state.menu.map((recipe) => dishIcon(recipe, 'mini')).join('')}</span></div>
        ${hint}
        <div class="stove ${busy ? 'busy' : ''}">
          ${plate || `<div class="pan">${slots}</div>`}
          ${!plate && service.pan.length === 0 && !busy ? `<p class="pan-hint">${t.panEmpty}</p>` : ''}
        </div>
        <div class="actions">${action}</div>
        <div class="pantry">${pantry || `<p class="hint">${t.nothingToEat}</p>`}</div>
      </div>
    `;
  }

  /** Called every frame during service; rebuilds the kitchen only when something changed. */
  private updateKitchen(): void {
    const state = this.state;
    const service = this.service;
    if (!state || !service || this.screen !== 'service') return;
    const key = this.kitchenStateKey(state);
    if (key !== this.kitchenKey) {
      this.kitchenKey = key;
      this.panel.innerHTML = this.kitchenHtml(state);
      this.renderHud();
      if (this.menuCard.childElementCount !== 0 && state.menu.length !== this.menuCard.querySelectorAll('.menu-line').length) {
        this.renderMenuCard();
      }
    }
    if (service.cooking) {
      const bar = this.panel.querySelector<HTMLElement>('.progress');
      if (bar) bar.style.width = `${Math.round((1 - service.cooking.left / service.cooking.total) * 100)}%`;
    }
  }

  // ---- evening

  private eveningHtml(state: GameState): string {
    const t = this.t;
    const summary = state.summary;
    if (!summary) return `<div class="footer"><button class="btn big primary" data-act="next-day">${t.nextDay}</button></div>`;
    const total = summary.food + summary.tips + summary.lodging + summary.gearSales;
    const line = (label: string, value: string, cls = '') => `<div class="sum ${cls}"><span>${label}</span><b>${value}</b></div>`;
    const coins = (amount: number) => `${icon('coin', 'mini')}${amount}`;
    const news = this.newsHtml(
      state,
      summary.news.filter((item) => item.type !== 'lodging'),
    );
    return `
      <div class="tab-body">
        <h2>${t.summaryTitle(state.day)}</h2>
        <div class="card summary">
          ${line(t.served, String(summary.served))}
          ${summary.lost ? line(t.lost, String(summary.lost), 'bad') : ''}
          ${line(t.food, coins(summary.food))}
          ${line(t.tips, coins(summary.tips))}
          ${line(t.lodging, coins(summary.lodging))}
          ${summary.gearSales ? line(t.gearSales, coins(summary.gearSales)) : ''}
          ${line(t.total, coins(total), 'total')}
          ${line(t.xp, `${icon('star', 'mini')}+${summary.xp}`)}
        </div>
        ${news ? `<h3>${t.eveningNews}</h3><ul class="news">${news}</ul>` : ''}
      </div>
      <div class="footer"><button class="btn big primary" data-act="next-day">${icon('bed')} ${t.nextDay}</button></div>
    `;
  }

  // ---- overlays

  private languageButtons(): string {
    return `<div class="langs">${LANGUAGES.map(
      (lang) => `<button class="btn ${lang === this.settings.language ? 'active' : ''}" data-act="lang" data-arg="${lang}">${LANGUAGE_NAMES[lang]}</button>`,
    ).join('')}</div>`;
  }

  private titleHtml(): string {
    const t = this.t;
    const confirm = this.confirmNew
      ? `<p class="confirm">${t.newGameConfirm}</p><div class="title-buttons"><button class="btn big danger" data-act="new">${t.yes}</button><button class="btn big" data-act="cancel-new">${t.no}</button></div>`
      : `<div class="title-buttons">${this.state ? `<button class="btn big primary" data-act="continue">${t.continueGame}<small>${t.day(this.state.day)} · ${t.level(this.state.level)}</small></button>` : ''}<button class="btn big ${this.state ? '' : 'primary'}" data-act="new">${t.newGame}</button></div>`;
    return `
      <div class="title">
        <div class="logo">
          <div class="logo-icons">${icon('turnip')}${icon('ale')}</div>
          <h1>Turnip <span>&amp;</span> Tankard</h1>
          <p>${t.tagline}</p>
        </div>
        ${confirm}
        ${this.languageButtons()}
      </div>
    `;
  }

  private storyHtml(story: StoryView): string {
    const t = this.t;
    const scene = t.story[story.beat];
    const chapter = STORY_BEATS.indexOf(story.beat) + 1;
    if (story.line < 0) {
      return `<button class="chapter" data-act="story"><small>${t.chapter(chapter)}</small><h2>${scene.title}</h2><span class="story-next ready">${t.next} ▸</span></button>`;
    }
    const speaker = STORY_SPEAKERS[story.beat][story.line] ?? 'rozi';
    return `
      <button class="dialog" data-act="story">
        <img class="px portrait" src="${portraitUrl(SPEAKER_LOOKS[speaker])}" alt="">
        <div class="dialog-box">
          <b>${t.speakers[speaker]}</b>
          <p class="story-text"></p>
          <span class="story-next">${t.next} ▸</span>
        </div>
      </button>
    `;
  }

  private settingsHtml(): string {
    const t = this.t;
    const toggle = (act: string, label: string, on: boolean) =>
      `<div class="row"><span>${label}</span><button class="btn ${on ? 'active' : ''}" data-act="${act}">${on ? t.on : t.off}</button></div>`;
    const reset = this.confirmNew
      ? `<p class="confirm">${t.newGameConfirm}</p><div class="title-buttons"><button class="btn danger" data-act="new">${t.yes}</button><button class="btn" data-act="cancel-new">${t.no}</button></div>`
      : `<button class="btn danger" data-act="new">${t.newGame}</button>`;
    return `
      <div class="modal">
        <h2>${t.settings}</h2>
        <div class="card">
          ${toggle('sound', t.sound, this.settings.sound)}
          ${toggle('music', t.music, this.settings.music)}
          <div class="row"><span>${t.language}</span></div>
          ${this.languageButtons()}
        </div>
        ${reset}
        <button class="btn big primary" data-act="settings">${t.close}</button>
      </div>
    `;
  }

  private renderOverlay(): void {
    let html = '';
    let kind = '';
    if (this.screen === 'title') {
      html = this.titleHtml();
      kind = 'title-screen';
    } else if (this.settingsOpen) {
      html = this.settingsHtml();
      kind = 'dim';
    } else if (this.story) {
      html = this.storyHtml(this.story);
      kind = 'story';
    }
    this.overlay.hidden = html === '';
    this.overlay.className = `overlay ${kind}`;
    this.overlay.innerHTML = html;
    if (this.screen === 'title') this.overlay.prepend(this.titleScene.canvas);
  }
}
