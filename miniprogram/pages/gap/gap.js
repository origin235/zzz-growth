const C = require('../../utils/calc');
const D = require('../../utils/data');

function num(x) {
  const v = Number(x) || 0;
  if (Math.abs(v - Math.round(v)) < 0.05) return C.fmtInt(v);
  return C.fmtDec(v, 1);
}

Page({
  data: {
    rows: [],
    inv: {},
    p: {},
    sum: {},
    empty: true
  },

  onLoad: function () {
    const p = getApp().globalData.params || Object.assign({}, D.PARAMS);
    const rawInv = wx.getStorageSync('zzz_inv') || {};
    // 旧版材料键带「型」后缀（如 engPart_强攻型），迁移为不带「型」
    const inv = {};
    Object.keys(rawInv).forEach(function (k) {
      const nk = k.replace(/型$/, '');
      inv[nk] = rawInv[k];
    });
    this.setData({ p: p, inv: inv });
  },

  onShow: function () {
    const p = getApp().globalData.params;
    if (p) this.setData({ p: p });
    const plan = wx.getStorageSync('zzz_plan');
    this._plan = plan || [];
    this.recalc();
  },

  recalc: function () {
    const p = this.data.p;
    const s = C.aggregate(this._plan || [], p);
    const g = C.computeGap(s, this.data.inv, p);

    const rows = g.rows.map(function (r) {
      return {
        key: r.key, name: r.name, unit: r.unit, note: r.note, single: r.single,
        top: r.top, mid: r.mid, low: r.low,
        demandText: num(r.demand),
        equivText: num(r.equiv),
        gapText: num(r.gap),
        energyText: C.fmtInt(r.energy),
        done: r.gap <= 0
      };
    });

    this.setData({
      rows: rows,
      empty: s.energy <= 0,
      sum: {
        energyText: C.fmtInt(g.totalEnergy),
        daysText: C.fmtDec(g.days, 1),
        battText: C.fmtDec(g.batteries, 1),
        dailyText: C.fmtInt(p.dailyNatural + p.dailyCoffee + p.dailyExtra)
      }
    });
  },

  onHold: function (e) {
    const key = e.currentTarget.dataset.key;
    const field = e.currentTarget.dataset.field;
    const v = parseInt(e.detail.value, 10);
    const inv = JSON.parse(JSON.stringify(this.data.inv || {}));
    if (!inv[key]) inv[key] = { top: 0, mid: 0, low: 0 };
    inv[key][field] = isNaN(v) ? 0 : v;
    this.setData({ inv: inv });
    wx.setStorageSync('zzz_inv', inv);
    this.recalc();
  },

  clearInv: function () {
    wx.showModal({
      title: '清空库存',
      content: '所有材料的持有数量都会归零。',
      success: (res) => {
        if (res.confirm) {
          this.setData({ inv: {} });
          wx.setStorageSync('zzz_inv', {});
          this.recalc();
        }
      }
    });
  },

  goPlan: function () {
    wx.switchTab({ url: '/pages/plan/plan' });
  }
});
