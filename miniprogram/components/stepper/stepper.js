Component({
  properties: {
    value: { type: Number, value: 0 },
    min: { type: Number, value: 0 },
    max: { type: Number, value: 99 },
    step: { type: Number, value: 1 }
  },
  methods: {
    _emit: function (v) {
      v = Math.max(this.data.min, Math.min(this.data.max, v));
      this.triggerEvent('change', { value: v });
    },
    onMinus: function () {
      this._emit(Number(this.data.value) - this.data.step);
    },
    onPlus: function () {
      this._emit(Number(this.data.value) + this.data.step);
    },
    onInput: function (e) {
      var v = parseInt(e.detail.value, 10);
      if (isNaN(v)) v = this.data.min;
      this._emit(v);
    }
  }
});
