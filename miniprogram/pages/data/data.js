const C = require('../../utils/calc');
const D = require('../../utils/data');

function f(n) {
  return C.fmtInt(n);
}

Page({
  data: {
    tables: []
  },

  onLoad: function () {
    const tables = [
      {
        id: 'exp',
        title: '① 代理人等级经验',
        sub: '官方分段累计',
        headers: ['等级', '累计经验', '该段每级'],
        rows: D.EXP.map(function (r) {
          return [r.lv, f(r.cum), C.fmtDec(r.per, 1)];
        })
      },
      {
        id: 'break',
        title: '② 等级突破',
        sub: '认证章 / 丁尼',
        headers: ['等级', '初阶', '高阶', '特化', '丁尼'],
        rows: D.BREAK.map(function (r) {
          return [r.lv, r.low, r.mid, r.high, f(r.denny)];
        })
      },
      {
        id: 'skill',
        title: '③ 单个技能（1~12）',
        sub: '累计消耗',
        headers: ['等级', '基础', '进阶', '特化', '丁尼', '仓鼠笼'],
        rows: D.SKILL.map(function (r) {
          return [r.lv, r.basic, r.adv, r.spec, f(r.denny), r.hamster];
        })
      },
      {
        id: 'core',
        title: '④ 核心技（A~F）',
        sub: '累计消耗',
        headers: ['等级', '高维', '周本', '丁尼'],
        rows: D.CORE.map(function (r, i) {
          return [D.CORE_LABELS[i], r.dim, r.weekly, f(r.denny)];
        })
      },
      {
        id: 'engine',
        title: '⑤ 音擎升级',
        sub: '突破里程碑累计',
        headers: ['等级', '能源模块', '改装部件', '丁尼'],
        rows: D.ENGINE.map(function (r) {
          return [r.lv, r.module, r.part, f(r.denny)];
        })
      },
      {
        id: 'elem',
        title: '⑥ 属性 · 技能芯片',
        sub: '芯片按属性分',
        headers: ['属性', '基础', '进阶', '特化'],
        rows: D.ELEMENTS.map(function (e) {
          return [e, D.chipName('基础', e), D.chipName('进阶', e), D.chipName('特化', e)];
        })
      },
      {
        id: 'cert',
        title: '⑦ 特性 · 认证章',
        sub: '认证章按特性分',
        headers: ['特性', '初阶', '高阶', '专属'],
        rows: D.ARTS.map(function (a) {
          return [a, D.certName('初阶', a), D.certName('高阶', a), D.certName('紫', a)];
        })
      },
      {
        id: 'part',
        title: '⑧ 音擎特性 · 突破件',
        sub: '音擎突破件按特性分',
        headers: ['特性', '普通', '增强型', '特化型'],
        rows: D.ARTS.map(function (a) {
          return [a, D.partName('普通', a), D.partName('增强型', a), D.partName('特化型', a)];
        })
      }
    ];
    this.setData({ tables: tables });
  }
});
