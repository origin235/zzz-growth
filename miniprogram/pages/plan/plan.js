const C = require('../../utils/calc');
const D = require('../../utils/data');

const SKILL_NAMES = D.SKILL_NAMES; // 普攻 / 闪避 / 支援 / 特殊技 / 终结技

// 通用模版：满级 60、音擎 60、核心 F、技能 普攻11 / 闪避7 / 支援7 / 特殊技11 / 终结技12
const GENERAL = {
  lvTo: 60,
  coreTo: 6,
  engTo: 60,
  skillTo: [11, 7, 7, 11, 12]
};

const MAX_ROWS = 8;

function fullRow(name) {
  return {
    name: name, elem: '冰', art: '强攻', engType: '强攻',
    lv: [1, 60], core: [1, 6],
    skills: [[1, 12], [1, 12], [1, 12], [1, 12], [1, 12]],
    eng: [1, 60],
    noEng: false
  };
}

// 新增角色默认套用通用模版目标（当前仍为 1）
function generalRow(name) {
  return {
    name: name, elem: '冰', art: '强攻', engType: '强攻',
    lv: [1, GENERAL.lvTo], core: [1, GENERAL.coreTo],
    skills: GENERAL.skillTo.map(function (v) { return [1, v]; }),
    eng: [1, GENERAL.engTo],
    noEng: false
  };
}

function isEmptyRow(r) {
  return r.lv[0] === r.lv[1] && r.core[0] === r.core[1] && r.eng[0] === r.eng[1] &&
    r.skills.every(function (k) { return k[0] === k[1]; });
}

function makeRows() {
  return [fullRow('角色1')];
}

Page({
  data: {
    coreLabels: D.CORE_LABELS,
    skillNames: SKILL_NAMES,
    elements: D.ELEMENTS,
    arts: D.ARTS,
    engTypes: D.ENG_TYPES,
    plan: [],
    rows: [],
    sum: {},
    mats: [],
    active: 0,
    p: {}
  },

  onLoad: function () {
    const p = getApp().globalData.params || Object.assign({}, D.PARAMS);
    var plan = wx.getStorageSync('zzz_plan');
    if (!plan || !plan.length) {
      plan = makeRows();
      wx.setStorageSync('zzz_plan', plan);
    }
    if (!plan[0].skills || !plan[0].skills.length) plan = makeRows();
    // 旧数据有 8 行（其余为空），只保留实际填写的角色，至少 1 个
    while (plan.length > 1 && isEmptyRow(plan[plan.length - 1])) plan.pop();
    plan.forEach(function (r) {
      if (!r.elem) r.elem = '冰';
      if (!r.art) r.art = '强攻';
      if (!r.engType) r.engType = r.art;
      r.engType = String(r.engType).replace(/型$/, '');
      if (D.ENG_TYPES.indexOf(r.engType) < 0) r.engType = r.art;
    });
    if (!plan.length) plan = makeRows();
    this.setData({ p: p, plan: plan });
    this.recalc();
  },

  onShow: function () {
    const p = getApp().globalData.params;
    const patch = {};
    if (p) patch.p = p;
    const latest = wx.getStorageSync('zzz_plan');
    if (latest && latest.length) patch.plan = latest;
    this.setData(patch);
    this.recalc();
  },

  toggle: function (e) {
    const idx = e.currentTarget.dataset.index;
    this.setData({ active: this.data.active === idx ? -1 : idx });
  },

  onName: function (e) {
    const idx = e.currentTarget.dataset.index;
    const patch = {};
    patch['plan[' + idx + '].name'] = e.detail.value;
    this.setData(patch);
    this.save();
    this.recalcNames();
  },

  recalcNames: function () {
    const patch = {};
    this.data.plan.forEach(function (r, i) {
      patch['rows[' + i + '].name'] = r.name;
    });
    this.setData(patch);
  },

  /* ---------- 数字输入（只允许数字，自动限幅） ---------- */
  // 数据模型路径（真正存值）
  _modelPath: function (i, arr, j, si) {
    if (arr === 'sk') return 'plan[' + i + '].skills[' + si + '][' + j + ']';
    return 'plan[' + i + '].' + arr + '[' + j + ']';
  },
  // 视图显示路径（输入框回显）
  _dispPath: function (i, arr, j, si) {
    if (arr === 'sk') return 'rows[' + i + '].d.sk[' + si + '][' + j + ']';
    return 'rows[' + i + '].d.' + arr + '[' + j + ']';
  },

  onNum: function (e) {
    const ds = e.currentTarget.dataset;
    const raw = (e.detail.value || '').replace(/[^\d]/g, '');
    const i = Number(ds.i);
    const j = Number(ds.j);
    const si = Number(ds.si);
    const min = Number(ds.min);
    const max = Number(ds.max);

    const dpath = this._dispPath(i, ds.arr, j, si);
    const patch = {};
    patch[dpath] = raw; // 输入框即时回显，允许暂时为空

    if (raw === '') {
      this.setData(patch);
      return;
    }

    var v = parseInt(raw, 10);
    if (isNaN(v)) return;

    if (v > max) {
      v = max;
      patch[dpath] = String(max); // 超出上限立刻改回上限
    }

    if (v >= min) {
      const mpath = this._modelPath(i, ds.arr, j, si);
      patch[mpath] = v;
      this.setData(patch);
      this.save();
      this.recalc();
    } else {
      this.setData(patch); // 低于下限先不回写，等失焦修正
    }
  },

  onNumBlur: function (e) {
    const ds = e.currentTarget.dataset;
    const i = Number(ds.i);
    const j = Number(ds.j);
    const si = Number(ds.si);
    const dpath = this._dispPath(i, ds.arr, j, si);
    var v;
    if (ds.arr === 'sk') v = this.data.plan[i].skills[si][j];
    else v = this.data.plan[i][ds.arr][j];
    const patch = {};
    patch[dpath] = String(v);
    this.setData(patch);
  },

  /* ---------- 核心技选择（A~F） ---------- */
  onCore: function (e) {
    const idx = e.currentTarget.dataset.index;
    const end = e.currentTarget.dataset.end;
    const patch = {};
    patch['plan[' + idx + '].core[' + end + ']'] = Number(e.detail.value) + 1;
    this.setData(patch);
    this.save();
    this.recalc();
  },

  /* ---------- 不含音擎开关 ---------- */
  onElem: function (e) {
    const idx = e.currentTarget.dataset.index;
    const v = this.data.elements[Number(e.detail.value)] || D.ELEMENTS[0];
    const patch = {};
    patch['plan[' + idx + '].elem'] = v;
    this.setData(patch);
    this.save();
    this.recalc();
  },

  onArt: function (e) {
    const idx = e.currentTarget.dataset.index;
    const r = this.data.plan[idx];
    const v = this.data.arts[Number(e.detail.value)] || D.ARTS[0];
    const patch = {};
    patch['plan[' + idx + '].art'] = v;
    // 音擎特性跟随特性变化（仅在未单独改过时）
    if ((r.engType || '').replace(/型$/, '') === r.art) patch['plan[' + idx + '].engType'] = v;
    this.setData(patch);
    this.save();
    this.recalc();
  },

  onEngType: function (e) {
    const idx = e.currentTarget.dataset.index;
    const v = this.data.engTypes[Number(e.detail.value)] || D.ENG_TYPES[0];
    const patch = {};
    patch['plan[' + idx + '].engType'] = v;
    this.setData(patch);
    this.save();
    this.recalc();
  },

  addRow: function () {
    if (this.data.plan.length >= MAX_ROWS) {
      wx.showToast({ title: '最多 8 名角色', icon: 'none' });
      return;
    }
    const plan = this.data.plan.slice();
    plan.push(generalRow('角色' + (plan.length + 1)));
    this.setData({ plan: plan, active: plan.length - 1 });
    this.save();
    this.recalc();
  },

  removeRow: function (e) {
    const idx = e.currentTarget.dataset.index;
    const plan = this.data.plan.slice();
    if (plan.length <= 1) return;
    plan.splice(idx, 1);
    plan.forEach(function (r, i) {
      if (r.name === '角色' + (i + 2)) r.name = '角色' + (i + 1);
    });
    let active = this.data.active;
    if (active >= plan.length) active = plan.length - 1;
    this.setData({ plan: plan, active: active });
    this.save();
    this.recalc();
  },

  toggleNoEng: function (e) {
    const idx = e.currentTarget.dataset.index;
    const r = this.data.plan[idx];
    const on = !r.noEng;
    const patch = {};
    patch['plan[' + idx + '].noEng'] = on;
    // 开启：目标压回当前（不养音擎）；关闭：目标直接拉到 60
    patch['plan[' + idx + '].eng'] = on ? [r.eng[0], r.eng[0]] : [r.eng[0], 60];
    this.setData(patch);
    this.save();
    this.recalc();
  },

  /* ---------- 模版 ---------- */
  // 满级模板：只把目标拉满，保留当前等级
  fillRowMax: function (e) {
    const idx = e.currentTarget.dataset.index;
    const r = this.data.plan[idx];
    const patch = {};
    patch['plan[' + idx + ']'] = {
      name: r.name,
      lv: [r.lv[0], 60], core: [r.core[0], 6],
      skills: r.skills.map(function (k) { return [k[0], 12]; }),
      eng: r.noEng ? [r.eng[0], r.eng[0]] : [r.eng[0], 60],
      noEng: !!r.noEng
    };
    this.setData(patch);
    this.save();
    this.recalc();
  },

  // 通用模版：保留「当前」等级，只改目标
  fillRowGeneral: function (e) {
    const idx = e.currentTarget.dataset.index;
    const r = this.data.plan[idx];
    const patch = {};
    // 当前等级已经超过模版目标时，目标跟随当前（不倒退）
    patch['plan[' + idx + ']'] = {
      name: r.name,
      lv: [r.lv[0], Math.max(r.lv[0], GENERAL.lvTo)],
      core: [r.core[0], Math.max(r.core[0], GENERAL.coreTo)],
      skills: r.skills.map(function (k, si) {
        return [k[0], Math.max(k[0], GENERAL.skillTo[si])];
      }),
      eng: r.noEng ? [r.eng[0], r.eng[0]] : [r.eng[0], Math.max(r.eng[0], GENERAL.engTo)],
      noEng: !!r.noEng
    };
    this.setData(patch);
    this.save();
    this.recalc();
    wx.showToast({ title: '已套用通用模版', icon: 'none' });
  },

  resetRow: function (e) {
    const idx = e.currentTarget.dataset.index;
    const r = this.data.plan[idx];
    const patch = {};
    patch['plan[' + idx + ']'] = {
      name: '角色' + (idx + 1),
      lv: [1, 1], core: [1, 1], skills: [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1]], eng: [1, 1], noEng: false,
      elem: r.elem, art: r.art, engType: r.engType
    };
    this.setData(patch);
    this.save();
    this.recalc();
  },

  save: function () {
    wx.setStorageSync('zzz_plan', this.data.plan);
  },

  recalc: function () {
    const p = this.data.p;
    const rows = this.data.plan;
    const view = rows.map(function (r, i) {
      const s = C.computeSingle(
        { lvFrom: r.lv[0], lvTo: r.lv[1], coreFrom: r.core[0], coreTo: r.core[1], engFrom: r.eng[0], engTo: r.eng[1] },
        r.skills.map(function (k) { return { from: k[0], to: k[1] }; }),
        p,
        { art: r.art || '强攻', elem: r.elem || '冰', engType: String(r.engType || r.art || '强攻').replace(/型$/, '') }
      );
      const T = GENERAL.skillTo;
      const noEng = !!r.noEng;
      const engOk = noEng || r.eng[1] === 60;
      const gLv = Math.max(r.lv[0], GENERAL.lvTo);
      const gCore = Math.max(r.core[0], GENERAL.coreTo);
      const gEng = noEng ? r.eng[0] : Math.max(r.eng[0], GENERAL.engTo);
      const isGeneral = r.lv[1] === gLv && r.core[1] === gCore && r.eng[1] === gEng &&
        r.skills.every(function (k, si) { return k[1] === Math.max(k[0], T[si]); });
      const isMax = r.lv[1] === 60 && r.core[1] === 6 && engOk &&
        r.skills.every(function (k) { return k[1] === 12; });
      const tpl = isMax ? 'max' : (isGeneral ? 'general' : '');

      return Object.assign({}, r, {
        k: i,
        elem: r.elem || '冰',
        art: r.art || '强攻',
        engType: r.engType || r.art || '强攻',
        elemIndex: Math.max(0, D.ELEMENTS.indexOf(r.elem || '冰')),
        artIndex: Math.max(0, D.ARTS.indexOf(r.art || '强攻')),
        engTypeIndex: Math.max(0, D.ENG_TYPES.indexOf(r.engType || r.art || '强攻')),
        noEng: noEng,
        engOk: engOk,
        tpl: tpl,
        lv: r.lv.slice(),
        core: r.core.slice(),
        eng: r.eng.slice(),
        skills: r.skills.map(function (k) { return k.slice(); }),
        energyText: C.fmtInt(s.total),
        lvText: r.lv[0] + ' → ' + r.lv[1],
        coreText: D.CORE_LABELS[r.core[0] - 1] + ' → ' + D.CORE_LABELS[r.core[1] - 1],
        engText: r.eng[0] + ' → ' + r.eng[1],
        empty: s.total <= 0,
        d: {
          lv: [String(r.lv[0]), String(r.lv[1])],
          eng: [String(r.eng[0]), String(r.eng[1])],
          sk: r.skills.map(function (k) { return [String(k[0]), String(k[1])]; })
        }
      });
    });

    const sum = C.aggregate(rows, p);

    // 认证章按特性、芯片按属性、音擎组件按音擎型分别汇总
    const mats = [
      { name: '角色经验', value: C.fmtInt(sum.exp) },
      { name: '丁尼', value: C.fmtInt(sum.denny) }
    ];
    (sum.usedArts || []).forEach(function (a) {
      mats.push({ name: '认证章·' + a + '(紫)', value: C.fmtDec(sum.certs[a].equiv, 1) });
    });
    (sum.usedChips || []).forEach(function (stem) {
      mats.push({ name: '芯片·' + stem + '(紫)', value: C.fmtDec(sum.chips[stem].equiv, 1) });
    });
    mats.push({ name: '高维数据', value: C.fmtInt(sum.dim) });
    mats.push({ name: '周本素材', value: C.fmtInt(sum.weekly) });
    mats.push({ name: '仓鼠笼', value: C.fmtInt(sum.hamster) });
    mats.push({ name: '音擎蓄电池', value: C.fmtInt(sum.engModule) });
    (sum.usedEngTypes || []).forEach(function (t) {
      mats.push({ name: '音擎突破材料·' + t, value: C.fmtInt(sum.engs[t].part) });
    });

    this.setData({
      rows: view,
      sum: {
        energyText: C.fmtInt(sum.energy),
        daysText: C.fmtDec(sum.days, 1),
        battText: C.fmtDec(sum.batteries, 1),
        count: rows.filter(function (r) {
          return r.lv[1] > r.lv[0] || r.core[1] > r.core[0] || r.eng[1] > r.eng[0] ||
            r.skills.some(function (k) { return k[1] > k[0]; });
        }).length
      },
      mats: mats
    });
  },

  clearAll: function () {
    wx.showModal({
      title: '清空全部角色',
      content: '所有角色的养成目标都会重置为未养成状态。',
      success: (res) => {
        if (res.confirm) {
          const plan = makeRows();
          plan[0].lv = [1, 1];
          plan[0].core = [1, 1];
          plan[0].skills = [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1]];
          plan[0].eng = [1, 1];
          this.setData({ plan: plan, active: 0 });
          this.save();
          this.recalc();
        }
      }
    });
  }
});
