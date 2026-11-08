App({
  globalData: {
    params: null
  },
  onLaunch: function () {
    // 首次进入写入默认参数，后续读取本地缓存
    const D = require('./utils/data');
    var saved = wx.getStorageSync('zzz_params');
    // 兼容旧缓存：单局高维产出由 2.5 调整为 5
    if (saved && Number(saved.dimYield) === 2.5) {
      saved.dimYield = 5;
      wx.setStorageSync('zzz_params', saved);
    }
    this.globalData.params = saved || Object.assign({}, D.PARAMS);
    if (!saved) wx.setStorageSync('zzz_params', this.globalData.params);
  }
});
