/**
 * 绝区零养成计算核心
 * 算法与飞书表格一致：
 *   1) 经验按官方分段线性估算
 *   2) 突破/技能/核心/音擎 用累计表做差值
 *   3) 单材料折算电量 = 数量 × 单局电量 ÷ 单局产出
 *   4) 缺口页：等效持有 = 顶 + 中/x + 低/y；局数向上取整
 */
const D = require('./data');

/* ---------------- 基础查表 ---------------- */

// 累计经验：取不大于 lv 的最大分段，段内线性
function expAt(lv) {
  lv = clamp(lv, 1, 60);
  let idx = 0;
  for (let i = 0; i < D.EXP.length; i++) {
    if (D.EXP[i].lv <= lv) idx = i;
  }
  const s = D.EXP[idx];
  return s.cum + (lv - s.lv) * s.per;
}

// 等级突破：跨越 (a, b] 之间的里程碑消耗合计
function breakSum(a, b) {
  const r = { low: 0, mid: 0, high: 0, denny: 0 };
  D.BREAK.forEach(function (row) {
    if (row.lv > a && row.lv <= b) {
      r.low += row.low;
      r.mid += row.mid;
      r.high += row.high;
      r.denny += row.denny;
    }
  });
  return r;
}

// 通用「累计表差值」：a、b 为等级，field 为字段名
function cumDelta(table, a, b, field) {
  if (b <= a) return 0;
  return rowAt(table, b)[field] - rowAt(table, a)[field];
}

function rowAt(table, lv) {
  let idx = 0;
  for (let i = 0; i < table.length; i++) {
    if (table[i].lv <= lv) idx = i;
  }
  return table[idx];
}

/* ---------------- 单角色计算 ---------------- */

/**
 * @param {Object} t 目标 { lvFrom, lvTo, coreFrom, coreTo, engFrom, engTo }
 * @param {Array}  skills [{from, to}] 5 个技能
 * @param {Object} p 参数
 */
function computeSingle(t, skills, p, info) {
  info = info || {};
  const art = info.art || '强攻';
  const elem = info.elem || '冰';
  const engType = info.engType || art;
  const expQty = Math.max(0, expAt(t.lvTo) - expAt(t.lvFrom));
  const brk = breakSum(t.lvFrom, t.lvTo);

  var s = { basic: 0, adv: 0, spec: 0, denny: 0, hamster: 0 };
  skills.forEach(function (k) {
    ['basic', 'adv', 'spec', 'denny', 'hamster'].forEach(function (f) {
      s[f] += cumDelta(D.SKILL, k.from, k.to, f);
    });
  });

  const core = {
    dim: cumDelta(D.CORE, t.coreFrom, t.coreTo, 'dim'),
    weekly: cumDelta(D.CORE, t.coreFrom, t.coreTo, 'weekly'),
    denny: cumDelta(D.CORE, t.coreFrom, t.coreTo, 'denny')
  };
  const eng = {
    module: cumDelta(D.ENGINE, t.engFrom, t.engTo, 'module'),
    part: cumDelta(D.ENGINE, t.engFrom, t.engTo, 'part'),
    denny: cumDelta(D.ENGINE, t.engFrom, t.engTo, 'denny')
  };

  // 单项折算电量
  function e(qty, energy, yield_) {
    if (yield_ <= 0) return 0;
    return qty * energy / yield_;
  }

  const pE = p.runEnergy;
  const items = [
    { key: 'exp', name: '角色经验', unit: '经验', qty: expQty, energy: e(expQty, pE, p.expYield), note: '1 局约 ' + fmtInt(p.expYield) + ' 经验' },
    { key: 'certLow', name: D.certName('初阶', art), unit: '个', qty: brk.low, energy: e(brk.low, pE, p.lowYield), note: '绿色·等级突破·按特性「' + art + '」' },
    { key: 'certMid', name: D.certName('高阶', art), unit: '个', qty: brk.mid, energy: e(brk.mid, pE, p.midYield), note: '蓝色·等级突破·按特性「' + art + '」' },
    { key: 'certHigh', name: D.certName('紫', art), unit: '个', qty: brk.high, energy: e(brk.high, pE, p.highYield), note: '紫色·等级突破·按特性「' + art + '」' },
    { key: 'dennyBreak', name: '丁尼·等级突破', unit: '丁尼', qty: brk.denny, energy: e(brk.denny, pE, p.dennyYield), note: '突破消耗' },
    { key: 'chipBasic', name: D.chipName('基础', elem), unit: '个', qty: s.basic, energy: e(s.basic, pE, p.basicYield), note: '5 个技能合计·按属性「' + elem + '」' },
    { key: 'chipAdv', name: D.chipName('进阶', elem), unit: '个', qty: s.adv, energy: e(s.adv, pE, p.advYield), note: '5 个技能合计·按属性「' + elem + '」' },
    { key: 'chipSpec', name: D.chipName('特化', elem), unit: '个', qty: s.spec, energy: e(s.spec, pE, p.specYield), note: '5 个技能合计·按属性「' + elem + '」' },
    { key: 'hamster', name: '「仓鼠笼」访问器', unit: '个', qty: s.hamster, energy: 0, note: '活动/礼包限定，不计电量' },
    { key: 'dennySkill', name: '丁尼·技能升级', unit: '丁尼', qty: s.denny, energy: e(s.denny, pE, p.dennyYield), note: '技能升级消耗' },
    { key: 'dim', name: '高维数据', unit: '个', qty: core.dim, energy: e(core.dim, p.dimEnergy, p.dimYield), note: '专家挑战室' },
    { key: 'weekly', name: '周本材料-核心技突破材料', unit: '个', qty: core.weekly, energy: 0, note: '每周 3 次免费恶猎' },
    { key: 'dennyCore', name: '丁尼·核心技', unit: '丁尼', qty: core.denny, energy: e(core.denny, pE, p.dennyYield), note: '核心 A→F' },
    { key: 'engModule', name: '音擎升级材料', unit: '个', qty: eng.module, energy: e(eng.module, p.engEnergy, p.moduleYield), note: '音擎副本' },
    { key: 'engPart', name: '音擎突破材料（' + engType + '）', unit: '个', qty: eng.part, energy: e(eng.part, p.engEnergy, p.partYield), note: '音擎副本·按特性「' + engType + '」' },
    { key: 'dennyEng', name: '丁尼·音擎升级', unit: '丁尼', qty: eng.denny, energy: e(eng.denny, pE, p.dennyYield), note: '音擎升级消耗' }
  ];

  const total = items.reduce(function (a, b) { return a + b.energy; }, 0);
  const engEnergy = items[13].energy + items[14].energy + items[15].energy;
  const noEngTotal = total - engEnergy;
  const daily = p.dailyNatural + p.dailyCoffee + p.dailyExtra;

  // 汇总材料（给计划 / 缺口页用）
  const mat = {
    exp: expQty,
    denny: brk.denny + s.denny + core.denny + eng.denny,
    certLow: brk.low,
    certMid: brk.mid,
    certHigh: brk.high,
    chipBasic: s.basic,
    chipAdv: s.adv,
    chipSpec: s.spec,
    dim: core.dim,
    weekly: core.weekly,
    hamster: s.hamster,
    engModule: eng.module,
    engPart: eng.part
  };

  return {
    items: items,
    total: total,
    engEnergy: engEnergy,
    noEngTotal: noEngTotal,
    daily: daily,
    days: daily > 0 ? total / daily : 0,
    noEngDays: daily > 0 ? noEngTotal / daily : 0,
    batteries: total / 60,
    ratio: total > 0 ? noEngTotal / total : 0,
    mat: mat
  };
}

/* ---------------- 多角色汇总 ---------------- */

function aggregate(rows, p) {
  const sum = {
    exp: 0, denny: 0, certLow: 0, certMid: 0, certHigh: 0,
    chipBasic: 0, chipAdv: 0, chipSpec: 0,
    dim: 0, weekly: 0, hamster: 0, engModule: 0, engPart: 0,
    energy: 0,
    certs: {}, chips: {}, engs: {}, usedElems: [], usedArts: [], usedEngTypes: []
  };

  rows.forEach(function (r) {
    const art = r.art || '强攻';
    const elem = r.elem || '冰';
    const engType = (r.engType || art).replace(/型$/, '');
    const stem = D.CHIP_STEM[elem] || elem;
    const r2 = computeSingle(
      { lvFrom: r.lv[0], lvTo: r.lv[1], coreFrom: r.core[0], coreTo: r.core[1], engFrom: r.eng[0], engTo: r.eng[1] },
      r.skills.map(function (k) { return { from: k[0], to: k[1] }; }),
      p,
      { art: art, elem: elem, engType: engType }
    );

    sum.exp += r2.mat.exp;
    sum.denny += r2.mat.denny;
    sum.certLow += r2.mat.certLow;
    sum.certMid += r2.mat.certMid;
    sum.certHigh += r2.mat.certHigh;
    sum.chipBasic += r2.mat.chipBasic;
    sum.chipAdv += r2.mat.chipAdv;
    sum.chipSpec += r2.mat.chipSpec;
    sum.dim += r2.mat.dim;
    sum.weekly += r2.mat.weekly;
    sum.hamster += r2.mat.hamster;
    sum.engModule += r2.mat.engModule;
    sum.engPart += r2.mat.engPart;
    sum.energy += r2.total;

    // 按特性 / 属性 / 音擎型分别累计（不同属性、特性的材料不能合并）
    if (!sum.certs[art]) sum.certs[art] = { low: 0, mid: 0, high: 0, equiv: 0, count: 0 };
    sum.certs[art].low += r2.mat.certLow;
    sum.certs[art].mid += r2.mat.certMid;
    sum.certs[art].high += r2.mat.certHigh;
    sum.certs[art].count += 1;

    // 芯片按「芯片种类」归组：冰与烈霜共用冰结芯片，自动合并
    if (!sum.chips[stem]) sum.chips[stem] = { basic: 0, adv: 0, spec: 0, equiv: 0, count: 0, elems: [] };
    sum.chips[stem].basic += r2.mat.chipBasic;
    sum.chips[stem].adv += r2.mat.chipAdv;
    sum.chips[stem].spec += r2.mat.chipSpec;
    sum.chips[stem].count += 1;
    if (sum.chips[stem].elems.indexOf(elem) < 0) sum.chips[stem].elems.push(elem);

    if (!sum.engs[engType]) sum.engs[engType] = { part: 0, count: 0 };
    sum.engs[engType].part += r2.mat.engPart;
    sum.engs[engType].count += 1;
  });

  sum.usedArts = D.ARTS.filter(function (a) { return sum.certs[a]; });
  sum.usedEngTypes = D.ENG_TYPES.filter(function (t) { return sum.engs[t]; });
  sum.usedChips = Object.keys(sum.chips);
  sum.usedArts.forEach(function (a) {
    const c = sum.certs[a];
    c.equiv = c.low / 9 + c.mid / 3 + c.high;
  });
  sum.usedChips.forEach(function (k) {
    const c = sum.chips[k];
    c.equiv = c.basic / 9 + c.adv / 3 + c.spec;
  });

  sum.days = p.dailyNatural + p.dailyCoffee + p.dailyExtra > 0
    ? sum.energy / (p.dailyNatural + p.dailyCoffee + p.dailyExtra) : 0;
  sum.batteries = sum.energy / 60;
  sum.certEquiv = sum.certLow / 9 + sum.certMid / 3 + sum.certHigh;
  sum.chipEquiv = sum.chipBasic / 9 + sum.chipAdv / 3 + sum.chipSpec;
  sum.expBooks = sum.exp / 3000;
  return sum;
}

/* ---------------- 资源缺口 ---------------- */

/**
 * @param {Object} s aggregate 结果
 * @param {Object} inv { exp:{top,mid,low}, denny:{...}, ... }
 * @param {Object} p 参数
 */
function computeGap(s, inv, p) {
  const certRows = (s.usedArts || []).map(function (art) {
    const c = s.certs[art];
    return {
      key: 'cert_' + art,
      name: '角色突破材料 · ' + art,
      unit: '个',
      demand: c.equiv,
      midDiv: 3,
      lowDiv: 9,
      yield: p.highYield,
      runEnergy: p.runEnergy,
      note: '绿=' + D.certName('初阶', art) + '，蓝=' + D.certName('高阶', art) + '，紫=' + D.certName('紫', art)
    };
  });

  const chipRows = (s.usedChips || []).map(function (stem) {
    const c = s.chips[stem];
    const label = c.elems && c.elems.length ? c.elems.join(' / ') : stem;
    return {
      key: 'chip_' + stem,
      name: '技能升级材料 · ' + stem,
      unit: '个',
      demand: c.equiv,
      midDiv: 3,
      lowDiv: 9,
      yield: p.specYield,
      runEnergy: p.runEnergy,
      note: '绿=基础' + stem + '芯片，蓝=进阶' + stem + '芯片，紫=特化' + stem + '芯片（属性：' + label + '）'
    };
  });

  const engRows = (s.usedEngTypes || []).map(function (t) {
    const short = t.replace(/型$/, '');
    return {
      key: 'engPart_' + short,
      name: '音擎突破材料 · ' + short,
      unit: '个',
      demand: s.engs[t].part,
      midDiv: 3,
      lowDiv: 9,
      yield: p.partYield,
      runEnergy: p.engEnergy,
      note: '绿=' + D.partName('普通', short) + '，蓝=' + D.partName('增强型', short) + '，紫=' + D.partName('特化型', short)
    };
  });

  const rows = [
    {
      key: 'exp', name: '代理人经验', unit: '本', demand: s.expBooks,
      midDiv: 5, lowDiv: 30, yield: p.expYield / 3000, runEnergy: p.runEnergy,
      note: '紫书 3000/本，蓝书 600/本，绿书 100/本'
    },
    { key: 'denny', name: '丁尼', unit: '丁尼', demand: s.denny, midDiv: 3, lowDiv: 9, yield: p.dennyYield, runEnergy: p.runEnergy, single: true, note: '不分等级，直接填持有数量；全部丁尼合并计算' }
  ]
    .concat(certRows)
    .concat(chipRows)
    .concat([
      { key: 'dim', name: '高维数据-核心技突破材料', unit: '个', demand: s.dim, midDiv: 3, lowDiv: 9, yield: p.dimYield, runEnergy: p.dimEnergy, single: true, note: '不分等级；专家挑战室 40 电量/局，单局 5 个' },
      { key: 'weekly', name: '周本材料-核心技突破材料', unit: '个', demand: s.weekly, midDiv: 3, lowDiv: 9, yield: 0, runEnergy: 60, single: true, note: '不分等级；每周免费，不计电量' },
      { key: 'hamster', name: '「仓鼠笼」访问器', unit: '个', demand: s.hamster, midDiv: 3, lowDiv: 9, yield: 0, runEnergy: 0, single: true, note: '不分等级；活动/礼包限定' },
      { key: 'engModule', name: '音擎升级材料', unit: '个', demand: s.engModule, midDiv: 3, lowDiv: 9, yield: p.moduleYield, runEnergy: p.engEnergy, note: '音擎能源模块；所有特性通用，不分类' }
    ])
    .concat(engRows);

  let totalRuns = 0, totalEnergy = 0;
  const out = rows.map(function (r) {
    const h = (inv && inv[r.key]) || { top: 0, mid: 0, low: 0 };
    const equiv = r.single
      ? (h.top || 0)
      : (h.top || 0) + (h.mid || 0) / r.midDiv + (h.low || 0) / r.lowDiv;
    const gap = Math.max(0, r.demand - equiv);
    const runs = r.yield > 0 ? Math.ceil(gap / r.yield) : 0;
    const energy = runs * r.runEnergy;
    totalRuns += runs;
    totalEnergy += energy;
    return {
      key: r.key, name: r.name, unit: r.unit, demand: r.demand, single: !!r.single,
      top: h.top || 0, mid: h.mid || 0, low: h.low || 0,
      equiv: equiv, gap: gap, yield: r.yield, runEnergy: r.runEnergy,
      runs: runs, energy: energy, note: r.note
    };
  });

  return {
    rows: out,
    totalRuns: totalRuns,
    totalEnergy: totalEnergy,
    days: (p.dailyNatural + p.dailyCoffee + p.dailyExtra) > 0
      ? totalEnergy / (p.dailyNatural + p.dailyCoffee + p.dailyExtra) : 0,
    batteries: totalEnergy / 60
  };
}

/* ---------------- 工具 ---------------- */

function clamp(v, min, max) {
  v = Number(v);
  if (isNaN(v)) v = min;
  return Math.max(min, Math.min(max, v));
}

function fmtInt(n) {
  n = Math.round(Number(n) || 0);
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fmtDec(n, d) {
  d = d === undefined ? 1 : d;
  const v = Number(n) || 0;
  const s = v.toFixed(d);
  const parts = s.split('.');
  const i = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.length > 1 ? i + '.' + parts[1] : i;
}

module.exports = {
  expAt: expAt,
  breakSum: breakSum,
  cumDelta: cumDelta,
  computeSingle: computeSingle,
  aggregate: aggregate,
  computeGap: computeGap,
  fmtInt: fmtInt,
  fmtDec: fmtDec,
  clamp: clamp
};
