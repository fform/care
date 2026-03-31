/**
 * Hermes builds used by some RN/Expo setups do not expose WeakRef globally.
 * @react-navigation/core v7 uses `new WeakRef(route.params)` — without this, the app throws.
 * This holds a strong reference (acceptable for short-lived route params).
 */
if (typeof globalThis.WeakRef === 'undefined') {
  globalThis.WeakRef = class WeakRef {
    constructor(value) {
      if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
        throw new TypeError('Invalid WeakRef target');
      }
      this._target = value;
    }
    deref() {
      return this._target;
    }
  };
}
