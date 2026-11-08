const C = require('../../utils/calc');
const D = require('../../utils/data');
const app = getApp();

const SKILL_DEFAULT = [
  { name: '普攻', from: 1, to: 12 },
  { name: '闪避', from: 1, to: 12 },
  { name: '支援', from: 1, to: 12 },
  { name: '特殊技', from: 1, to: 12 },
  { name: '终结技', from: 1, to: 12 }
];

Page({
  data: {
    coreLabels: D.CORE_LABELS,
    elements: D.ELEMENTS,
    arts: D.ARTS,
    engTypes: D.ENG_TYPES,
    info: { elem: '冰', art: '强攻', engType: '强攻' },
    t: { lvFrom: 1, lvTo: 60, coreFrom: 1, coreTo: 6, engFrom: 1, engTo: 60 },
    skills: SKILL_DEFAULT,
    p: {},
    pRaw: {},
    paramRows: [],
    showParams: false,
    items: [],
    sum: {},
    paramOpen: false
  },

  onLoad: function () {
    const savedP = wx.getStorageSync('zzz_params') || Object.assign({}, D.PARAMS);
    const savedT = wx.getStorageSync('zzz_calc_target');
    const savedS = wx.getStorageSync('zzz_calc_skills');
    const savedInfo = wx.getStorageSync('zzz_calc_info') || {};
    this.setData({
      p: savedP,
      t: savedT || this.data.t,
      skills: savedS || SKILL_DEFAULT,
      info: {
        elem: savedInfo.elem || '冰',
        art: savedInfo.art || '强攻',
        engType: (savedInfo.engType || savedInfo.art || '强攻').replace(/型$/, '')
      }
    });
    this.buildParams();
    this.recalc();
  },

  /* 参数行渲染数据 */
  buildParams: function () {
    const labels = [
      ['runEnergy', '实战模拟室单局电量', '电量'],
      ['expYield', '单局经验产出', '经验'],
      ['dennyYield', '单局丁尼产出', '丁尼'],
      ['lowYield', '单局初阶认证章', '个'],
      ['midYield', '单局高阶认证章', '个'],
      ['highYield', '单局特化认证章', '个'],
      ['basicYield', '单局基础芯片', '个'],
      ['advYield', '单局进阶芯片', '个'],
      ['specYield', '单局特化芯片', '个'],
      ['dimEnergy', '专家挑战室单局电量', '电量'],
      ['dimYield', '单局高维数据', '个'],
      ['engEnergy', '音擎副本单局电量', '电量'],
      ['moduleYield', '单局能源模块', '个'],
      ['partYield', '单局改装部件', '个'],
      ['dailyNatural', '每日自然恢复', '电量'],
      ['dailyCoffee', '每日咖啡', '电量'],
      ['dailyExtra', '每日额外电量', '电量']
    ];
    const p = this.data.p;
    const rows = labels.map(function (l) {
      return { key: l[0], name: l[1], unit: l[2], text: String(p[l[0]]) };
    });
    this.setData({ paramRows: rows });
  },

  /* 目标变更 */
  onTargetChange: function (e) {
    const field = e.currentTarget.dataset.field;
    const v = e.detail.value;
    const t = Object.assign({}, this.data.t);
    t[field] = v;
    this.setData({ t: t });
    wx.setStorageSync('zzz_calc_target', t);
    this.recalc();
  },

  onCorePick: function (e) {
    const field = e.currentTarget.dataset.field;
    const v = Number(e.detail.value) + 1;
    const t = Object.assign({}, this.data.t);
    t[field] = v;
    this.setData({ t: t });
    wx.setStorageSync('zzz_calc_target', t);
    this.recalc();
  },

  onSkillChange: function (e) {
    const idx = e.currentTarget.dataset.index;
    const end = e.currentTarget.dataset.end;
    const v = e.detail.value;
    const skills = this.data.skills.slice();
    skills[idx] = Object.assign({}, skills[idx]);
    skills[idx][end] = v;
    this.setData({ skills: skills });
    wx.setStorageSync('zzz_calc_skills', skills);
    this.recalc();
  },

  /* 属性 / 特性 / 音擎特性 */
  onInfo: function (e) {
    const field = e.currentTarget.dataset.field;
    const list = field === 'elem' ? this.data.elements : this.data.arts;
    const v = list[Number(e.detail.value)] || list[0];
    const info = Object.assign({}, this.data.info);
    const oldArt = info.art;
    info[field] = v;
    if (field === 'art' && info.engType === oldArt) info.engType = v;
    this.setData({ info: info });
    wx.setStorageSync('zzz_calc_info', info);
    this.recalc();
  },

  /* 参数输入 */
  onParamInput: function (e) {
    const key = e.currentTarget.dataset.key;
    const idx = e.currentTarget.dataset.index;
    const raw = e.detail.value;
    const p = Object.assign({}, this.data.p);
    const num = parseFloat(raw);
    p[key] = isNaN(num) ? 0 : num;
    const patch = { p: p };
    patch['paramRows[' + idx + '].text'] = raw;
    this.setData(patch);
    wx.setStorageSync('zzz_params', p);
    this.recalc();
  },

  toggleParams: function () {
    this.setData({ showParams: !this.data.showParams });
  },

  /* 一键满级 */
  fillMax: function () {
    const skills = SKILL_DEFAULT.map(function (s) {
      return { name: s.name, from: 1, to: 12 };
    });
    this.setData({
      t: { lvFrom: 1, lvTo: 60, coreFrom: 1, coreTo: 6, engFrom: 1, engTo: 60 },
      skills: skills
    });
    wx.setStorageSync('zzz_calc_target', this.data.t);
    wx.setStorageSync('zzz_calc_skills', skills);
    this.recalc();
  },

  /* 核心计算 */
  recalc: function () {
    const p = this.data.p;
    const t = this.data.t;
    const r = C.computeSingle(
      t,
      this.data.skills.map(function (s) { return { from: s.from, to: s.to }; }),
      p,
      this.data.info
    );
    const items = r.items.map(function (i) {
      return {
        key: i.key, name: i.name, unit: i.unit, note: i.note,
        qtyText: C.fmtInt(i.qty),
        energyText: C.fmtInt(i.energy),
        hasEnergy: i.energy > 0
      };
    });
    this.setData({
      items: items,
      sum: {
        total: C.fmtInt(r.total),
        days: C.fmtDec(r.days, 1),
        batteries: C.fmtDec(r.batteries, 1),
        noEngTotal: C.fmtInt(r.noEngTotal),
        noEngDays: C.fmtDec(r.noEngDays, 1),
        ratio: C.fmtDec(r.ratio * 100, 1) + '%',
        daily: C.fmtInt(r.daily)
      }
    });
    this._result = r;
  },

  /* 保存为计划角色 */
  saveToPlan: function () {
    const t = this.data.t;
    const skills = this.data.skills;
    const plan = wx.getStorageSync('zzz_plan');
    if (!plan || !plan.length) {
      wx.showToast({ title: '请先到「计划」页初始化', icon: 'none' });
      return;
    }
    // 找一个未使用（当前=目标）的槽位
    var emptyIdx = -1;
    for (var i = 0; i < plan.length; i++) {
      const r = plan[i];
      const untouched = r.lv[0] === r.lv[1] && r.core[0] === r.core[1] &&
        r.eng[0] === r.eng[1] &&
        r.skills.every(function (k) { return k[0] === k[1]; });
      if (untouched) { emptyIdx = i; break; }
    }
    if (emptyIdx < 0) {
      if (plan.length >= 8) {
        wx.showToast({ title: '最多 8 名角色，可先在计划页清空', icon: 'none' });
        return;
      }
      plan.push({});
      emptyIdx = plan.length - 1;
    }
    const info = this.data.info || {};
    plan[emptyIdx] = {
      name: '角色' + (emptyIdx + 1),
      elem: info.elem || '冰',
      art: info.art || '强攻',
      engType: (info.engType || info.art || '强攻').replace(/型$/, ''),
      lv: [t.lvFrom, t.lvTo],
      core: [t.coreFrom, t.coreTo],
      skills: skills.map(function (s) { return [s.from, s.to]; }),
      eng: [t.engFrom, t.engTo],
      noEng: false
    };
    wx.setStorageSync('zzz_plan', plan);
    wx.showToast({ title: '已写入第 ' + (emptyIdx + 1) + ' 位角色', icon: 'success' });
  },

  resetParams: function () {
    wx.showModal({
      title: '恢复默认参数',
      content: '掉落与电量参数将恢复为社区实测均值。',
      success: (res) => {
        if (res.confirm) {
          const p = Object.assign({}, D.PARAMS);
          this.setData({ p: p });
          wx.setStorageSync('zzz_params', p);
          this.buildParams();
          this.recalc();
        }
      }
    });
  }
});
