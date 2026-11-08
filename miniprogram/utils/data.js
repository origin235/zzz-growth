/**
 * 绝区零养成数据表
 * 数据来源：官方/维基数据整理（与原飞书表格「数据表」子表一致）
 * 单位说明：经验=点，丁尼=丁尼，芯片/认证章=个，高维数据=个
 */

// ① 代理人等级累计经验（官方分段数据；段内按线性估算）
// lv：该段起始等级；cum：升到该等级所需累计经验；per：该段每级经验
const EXP = [
  { lv: 1, cum: 0, per: 1578.9 },
  { lv: 20, cum: 30000, per: 6000 },
  { lv: 30, cum: 90000, per: 13500 },
  { lv: 40, cum: 225000, per: 22500 },
  { lv: 50, cum: 450000, per: 45000 },
  { lv: 60, cum: 900000, per: 45000 }
];

// ② 等级突破：达到 lv 时一次性消耗（认证章 / 丁尼）
const BREAK = [
  { lv: 20, low: 4, mid: 0, high: 0, denny: 24000 },
  { lv: 30, low: 0, mid: 12, high: 0, denny: 56000 },
  { lv: 40, low: 0, mid: 20, high: 0, denny: 120000 },
  { lv: 50, low: 0, mid: 0, high: 10, denny: 200000 },
  { lv: 60, low: 0, mid: 0, high: 20, denny: 400000 }
];

// ③ 单个技能累计消耗（技能等级 1~12）
const SKILL = [
  { lv: 1, basic: 0, adv: 0, spec: 0, denny: 0, hamster: 0 },
  { lv: 2, basic: 2, adv: 0, spec: 0, denny: 2000, hamster: 0 },
  { lv: 3, basic: 5, adv: 0, spec: 0, denny: 5000, hamster: 0 },
  { lv: 4, basic: 5, adv: 2, spec: 0, denny: 11000, hamster: 0 },
  { lv: 5, basic: 5, adv: 5, spec: 0, denny: 20000, hamster: 0 },
  { lv: 6, basic: 5, adv: 9, spec: 0, denny: 32000, hamster: 0 },
  { lv: 7, basic: 5, adv: 15, spec: 0, denny: 50000, hamster: 0 },
  { lv: 8, basic: 5, adv: 15, spec: 5, denny: 95000, hamster: 0 },
  { lv: 9, basic: 5, adv: 15, spec: 13, denny: 162500, hamster: 0 },
  { lv: 10, basic: 5, adv: 15, spec: 23, denny: 252500, hamster: 0 },
  { lv: 11, basic: 5, adv: 15, spec: 35, denny: 365000, hamster: 0 },
  { lv: 12, basic: 5, adv: 15, spec: 50, denny: 500000, hamster: 1 }
];

// ④ 核心技累计消耗（1=A 2=B 3=C 4=D 5=E 6=F）
const CORE = [
  { lv: 1, dim: 0, weekly: 0, denny: 5000 },
  { lv: 2, dim: 2, weekly: 0, denny: 17000 },
  { lv: 3, dim: 6, weekly: 0, denny: 45000 },
  { lv: 4, dim: 15, weekly: 5, denny: 105000 },
  { lv: 5, dim: 30, weekly: 8, denny: 205000 },
  { lv: 6, dim: 60, weekly: 9, denny: 405000 }
];

// ⑤ 音擎累计消耗（突破里程碑 1/20/30/40/50/60）
const ENGINE = [
  { lv: 1, module: 0, part: 0, denny: 0 },
  { lv: 20, module: 3, part: 4, denny: 8000 },
  { lv: 30, module: 13, part: 16, denny: 32000 },
  { lv: 40, module: 40, part: 36, denny: 82000 },
  { lv: 50, module: 100, part: 46, denny: 182000 },
  { lv: 60, module: 200, part: 66, denny: 400000 }
];

// 默认电量与掉落参数（可调）
const PARAMS = {
  runEnergy: 20,        // 实战模拟室单局电量
  expYield: 12600,      // 单局代理人经验产出
  dennyYield: 25000,    // 单局丁尼产出
  lowYield: 12,         // 单局初阶认证章产出
  midYield: 5.5,        // 单局高阶认证章产出
  highYield: 1.5,       // 单局特化认证章产出
  basicYield: 8,        // 单局基础芯片产出
  advYield: 6,          // 单局进阶芯片产出
  specYield: 1.5,       // 单局特化芯片产出
  dimEnergy: 40,        // 专家挑战室单局电量
  dimYield: 5,        // 单局高维数据产出
  engEnergy: 20,        // 音擎副本单局电量
  moduleYield: 5,       // 单局能源模块产出
  partYield: 3,         // 单局改装部件产出
  dailyNatural: 240,    // 每日自然恢复电量
  dailyCoffee: 80,      // 每日咖啡电量
  dailyExtra: 0         // 每日额外电量
};

const CORE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

const SKILL_NAMES = ['普攻', '闪避', '支援', '特殊技', '终结技'];


/* 代理人属性 / 特性（职业）/ 音擎特性 —— 名称取自米游社官方词条（截至 3.3 版本） */
const ELEMENTS = ['物理', '火', '冰', '电', '以太', '风', '烈霜', '流明', '玄墨', '凛刃'];
const ARTS = ['强攻', '击破', '异常', '支援', '防护', '命破', '锋御'];
// 音擎特性与代理人特性同名：音擎突破件按「特性」分
const ENG_TYPES = ['强攻', '击破', '异常', '支援', '防护', '命破', '锋御'];

// 认证章按「特性」分：初阶（绿）/ 高阶（蓝）/ 专属（紫，各级名称取自官方词条）
const CERT_PURPLE = {
  强攻: '先行者认证章', 击破: '破阵者认证章', 异常: '掌控者认证章',
  支援: '统御者认证章', 防护: '捍卫者认证章',
  命破: '裁决者认证章', 锋御: '执锋者认证章'
};

/**
 * 芯片按「属性」分：基础 / 进阶 / 特化 + 属性芯片名。
 * 特殊属性沿用属性芯片：烈霜 → 冰结芯片（星见雅已确认），
 * 流明 / 玄墨 / 凛刃有各自的芯片系列。
 */
const CHIP_STEM = {
  物理: '物理', 火: '引燃', 冰: '冰结', 电: '电击', 以太: '以太',
  风: '风蚀', 烈霜: '冰结', 流明: '流明', 玄墨: '玄墨', 凛刃: '凛刃'
};

function chipName(tier, elem) {
  const stem = CHIP_STEM[elem] || elem;
  return tier + stem + '芯片';
}

function certName(tier, art) {
  if (tier === '紫') return CERT_PURPLE[art] || (art + '认证章');
  return tier + art + '认证章';
}

// 音擎突破件：普通（绿）/ 增强型（蓝）/ 特化型（紫）+ 特性 + 组件
function partName(tier, engType) {
  const t = engType.replace(/型$/, '');
  return tier + t + '组件';
}

module.exports = {
  ELEMENTS: ELEMENTS,
  ARTS: ARTS,
  ENG_TYPES: ENG_TYPES,
  CERT_PURPLE: CERT_PURPLE,
  CHIP_STEM: CHIP_STEM,
  chipName: chipName,
  certName: certName,
  partName: partName,
  EXP,
  BREAK,
  SKILL,
  CORE,
  ENGINE,
  PARAMS,
  CORE_LABELS,
  SKILL_NAMES
};
