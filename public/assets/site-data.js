//#region \0rolldown/runtime.js
var e = Object.defineProperty, t = (e, t, n) => () => {
	if (n) throw n[0];
	try {
		return e && (t = e(e = 0)), t;
	} catch (e) {
		throw n = [e], e;
	}
}, n = (t, n) => {
	let r = {};
	for (var i in t) e(r, i, {
		get: t[i],
		enumerable: !0
	});
	return n || e(r, Symbol.toStringTag, { value: "Module" }), r;
};
//#endregion
//#region node_modules/@firebase/app/node_modules/@firebase/util/dist/index.esm2017.js
function r() {
	if (typeof self < "u") return self;
	if (typeof window < "u") return window;
	if (typeof global < "u") return global;
	throw Error("Unable to locate global object.");
}
function i() {
	try {
		return typeof indexedDB == "object";
	} catch {
		return !1;
	}
}
function a() {
	return new Promise((e, t) => {
		try {
			let n = !0, r = "validate-browser-context-for-indexeddb-analytics-module", i = self.indexedDB.open(r);
			i.onsuccess = () => {
				i.result.close(), n || self.indexedDB.deleteDatabase(r), e(!0);
			}, i.onupgradeneeded = () => {
				n = !1;
			}, i.onerror = () => {
				t(i.error?.message || "");
			};
		} catch (e) {
			t(e);
		}
	});
}
function o(e, t) {
	return e.replace(ce, (e, n) => {
		let r = t[n];
		return r == null ? `<${n}?>` : String(r);
	});
}
function s(e, t) {
	if (e === t) return !0;
	let n = Object.keys(e), r = Object.keys(t);
	for (let i of n) {
		if (!r.includes(i)) return !1;
		let n = e[i], a = t[i];
		if (c(n) && c(a)) {
			if (!s(n, a)) return !1;
		} else if (n !== a) return !1;
	}
	for (let e of r) if (!n.includes(e)) return !1;
	return !0;
}
function c(e) {
	return typeof e == "object" && !!e;
}
var l, u, d, f, p, m, h, g, ee, te, ne, re, ie, ae, oe, se, ce, le = t((() => {
	l = function(e) {
		let t = [], n = 0;
		for (let r = 0; r < e.length; r++) {
			let i = e.charCodeAt(r);
			i < 128 ? t[n++] = i : i < 2048 ? (t[n++] = i >> 6 | 192, t[n++] = i & 63 | 128) : (i & 64512) == 55296 && r + 1 < e.length && (e.charCodeAt(r + 1) & 64512) == 56320 ? (i = 65536 + ((i & 1023) << 10) + (e.charCodeAt(++r) & 1023), t[n++] = i >> 18 | 240, t[n++] = i >> 12 & 63 | 128, t[n++] = i >> 6 & 63 | 128, t[n++] = i & 63 | 128) : (t[n++] = i >> 12 | 224, t[n++] = i >> 6 & 63 | 128, t[n++] = i & 63 | 128);
		}
		return t;
	}, u = function(e) {
		let t = [], n = 0, r = 0;
		for (; n < e.length;) {
			let i = e[n++];
			if (i < 128) t[r++] = String.fromCharCode(i);
			else if (i > 191 && i < 224) {
				let a = e[n++];
				t[r++] = String.fromCharCode((i & 31) << 6 | a & 63);
			} else if (i > 239 && i < 365) {
				let a = e[n++], o = e[n++], s = e[n++], c = ((i & 7) << 18 | (a & 63) << 12 | (o & 63) << 6 | s & 63) - 65536;
				t[r++] = String.fromCharCode(55296 + (c >> 10)), t[r++] = String.fromCharCode(56320 + (c & 1023));
			} else {
				let a = e[n++], o = e[n++];
				t[r++] = String.fromCharCode((i & 15) << 12 | (a & 63) << 6 | o & 63);
			}
		}
		return t.join("");
	}, d = {
		byteToCharMap_: null,
		charToByteMap_: null,
		byteToCharMapWebSafe_: null,
		charToByteMapWebSafe_: null,
		ENCODED_VALS_BASE: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
		get ENCODED_VALS() {
			return this.ENCODED_VALS_BASE + "+/=";
		},
		get ENCODED_VALS_WEBSAFE() {
			return this.ENCODED_VALS_BASE + "-_.";
		},
		HAS_NATIVE_SUPPORT: typeof atob == "function",
		encodeByteArray(e, t) {
			if (!Array.isArray(e)) throw Error("encodeByteArray takes an array as a parameter");
			this.init_();
			let n = t ? this.byteToCharMapWebSafe_ : this.byteToCharMap_, r = [];
			for (let t = 0; t < e.length; t += 3) {
				let i = e[t], a = t + 1 < e.length, o = a ? e[t + 1] : 0, s = t + 2 < e.length, c = s ? e[t + 2] : 0, l = i >> 2, u = (i & 3) << 4 | o >> 4, d = (o & 15) << 2 | c >> 6, f = c & 63;
				s || (f = 64, a || (d = 64)), r.push(n[l], n[u], n[d], n[f]);
			}
			return r.join("");
		},
		encodeString(e, t) {
			return this.HAS_NATIVE_SUPPORT && !t ? btoa(e) : this.encodeByteArray(l(e), t);
		},
		decodeString(e, t) {
			return this.HAS_NATIVE_SUPPORT && !t ? atob(e) : u(this.decodeStringToByteArray(e, t));
		},
		decodeStringToByteArray(e, t) {
			this.init_();
			let n = t ? this.charToByteMapWebSafe_ : this.charToByteMap_, r = [];
			for (let t = 0; t < e.length;) {
				let i = n[e.charAt(t++)], a = t < e.length ? n[e.charAt(t)] : 0;
				++t;
				let o = t < e.length ? n[e.charAt(t)] : 64;
				++t;
				let s = t < e.length ? n[e.charAt(t)] : 64;
				if (++t, i == null || a == null || o == null || s == null) throw new f();
				let c = i << 2 | a >> 4;
				if (r.push(c), o !== 64) {
					let e = a << 4 & 240 | o >> 2;
					if (r.push(e), s !== 64) {
						let e = o << 6 & 192 | s;
						r.push(e);
					}
				}
			}
			return r;
		},
		init_() {
			if (!this.byteToCharMap_) {
				this.byteToCharMap_ = {}, this.charToByteMap_ = {}, this.byteToCharMapWebSafe_ = {}, this.charToByteMapWebSafe_ = {};
				for (let e = 0; e < this.ENCODED_VALS.length; e++) this.byteToCharMap_[e] = this.ENCODED_VALS.charAt(e), this.charToByteMap_[this.byteToCharMap_[e]] = e, this.byteToCharMapWebSafe_[e] = this.ENCODED_VALS_WEBSAFE.charAt(e), this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[e]] = e, e >= this.ENCODED_VALS_BASE.length && (this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(e)] = e, this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(e)] = e);
			}
		}
	}, f = class extends Error {
		constructor() {
			super(...arguments), this.name = "DecodeBase64StringError";
		}
	}, p = function(e) {
		let t = l(e);
		return d.encodeByteArray(t, !0);
	}, m = function(e) {
		return p(e).replace(/\./g, "");
	}, h = function(e) {
		try {
			return d.decodeString(e, !0);
		} catch (e) {
			console.error("base64Decode failed: ", e);
		}
		return null;
	}, g = () => r().__FIREBASE_DEFAULTS__, ee = () => {
		if (typeof process > "u" || process.env === void 0) return;
		let e = process.env.__FIREBASE_DEFAULTS__;
		if (e) return JSON.parse(e);
	}, te = () => {
		if (typeof document > "u") return;
		let e;
		try {
			e = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
		} catch {
			return;
		}
		let t = e && h(e[1]);
		return t && JSON.parse(t);
	}, ne = () => {
		try {
			return g() || ee() || te();
		} catch (e) {
			console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);
			return;
		}
	}, re = () => ne()?.config, ie = class {
		constructor() {
			this.reject = () => {}, this.resolve = () => {}, this.promise = new Promise((e, t) => {
				this.resolve = e, this.reject = t;
			});
		}
		wrapCallback(e) {
			return (t, n) => {
				t ? this.reject(t) : this.resolve(n), typeof e == "function" && (this.promise.catch(() => {}), e.length === 1 ? e(t) : e(t, n));
			};
		}
	}, ae = "FirebaseError", oe = class e extends Error {
		constructor(t, n, r) {
			super(n), this.code = t, this.customData = r, this.name = ae, Object.setPrototypeOf(this, e.prototype), Error.captureStackTrace && Error.captureStackTrace(this, se.prototype.create);
		}
	}, se = class {
		constructor(e, t, n) {
			this.service = e, this.serviceName = t, this.errors = n;
		}
		create(e, ...t) {
			let n = t[0] || {}, r = `${this.service}/${e}`, i = this.errors[e], a = i ? o(i, n) : "Error", s = `${this.serviceName}: ${a} (${r}).`;
			return new oe(r, s, n);
		}
	}, ce = /\{\$([^}]+)}/g;
}));
//#endregion
//#region node_modules/@firebase/app/node_modules/@firebase/component/dist/esm/index.esm2017.js
function ue(e) {
	return e === pe ? void 0 : e;
}
function de(e) {
	return e.instantiationMode === "EAGER";
}
var fe, pe, me, he, ge = t((() => {
	le(), fe = class {
		constructor(e, t, n) {
			this.name = e, this.instanceFactory = t, this.type = n, this.multipleInstances = !1, this.serviceProps = {}, this.instantiationMode = "LAZY", this.onInstanceCreated = null;
		}
		setInstantiationMode(e) {
			return this.instantiationMode = e, this;
		}
		setMultipleInstances(e) {
			return this.multipleInstances = e, this;
		}
		setServiceProps(e) {
			return this.serviceProps = e, this;
		}
		setInstanceCreatedCallback(e) {
			return this.onInstanceCreated = e, this;
		}
	}, pe = "[DEFAULT]", me = class {
		constructor(e, t) {
			this.name = e, this.container = t, this.component = null, this.instances = /* @__PURE__ */ new Map(), this.instancesDeferred = /* @__PURE__ */ new Map(), this.instancesOptions = /* @__PURE__ */ new Map(), this.onInitCallbacks = /* @__PURE__ */ new Map();
		}
		get(e) {
			let t = this.normalizeInstanceIdentifier(e);
			if (!this.instancesDeferred.has(t)) {
				let e = new ie();
				if (this.instancesDeferred.set(t, e), this.isInitialized(t) || this.shouldAutoInitialize()) try {
					let n = this.getOrInitializeService({ instanceIdentifier: t });
					n && e.resolve(n);
				} catch {}
			}
			return this.instancesDeferred.get(t).promise;
		}
		getImmediate(e) {
			let t = this.normalizeInstanceIdentifier(e?.identifier), n = e?.optional ?? !1;
			if (this.isInitialized(t) || this.shouldAutoInitialize()) try {
				return this.getOrInitializeService({ instanceIdentifier: t });
			} catch (e) {
				if (n) return null;
				throw e;
			}
			else if (n) return null;
			else throw Error(`Service ${this.name} is not available`);
		}
		getComponent() {
			return this.component;
		}
		setComponent(e) {
			if (e.name !== this.name) throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);
			if (this.component) throw Error(`Component for ${this.name} has already been provided`);
			if (this.component = e, this.shouldAutoInitialize()) {
				if (de(e)) try {
					this.getOrInitializeService({ instanceIdentifier: pe });
				} catch {}
				for (let [e, t] of this.instancesDeferred.entries()) {
					let n = this.normalizeInstanceIdentifier(e);
					try {
						let e = this.getOrInitializeService({ instanceIdentifier: n });
						t.resolve(e);
					} catch {}
				}
			}
		}
		clearInstance(e = pe) {
			this.instancesDeferred.delete(e), this.instancesOptions.delete(e), this.instances.delete(e);
		}
		async delete() {
			let e = Array.from(this.instances.values());
			await Promise.all([...e.filter((e) => "INTERNAL" in e).map((e) => e.INTERNAL.delete()), ...e.filter((e) => "_delete" in e).map((e) => e._delete())]);
		}
		isComponentSet() {
			return this.component != null;
		}
		isInitialized(e = pe) {
			return this.instances.has(e);
		}
		getOptions(e = pe) {
			return this.instancesOptions.get(e) || {};
		}
		initialize(e = {}) {
			let { options: t = {} } = e, n = this.normalizeInstanceIdentifier(e.instanceIdentifier);
			if (this.isInitialized(n)) throw Error(`${this.name}(${n}) has already been initialized`);
			if (!this.isComponentSet()) throw Error(`Component ${this.name} has not been registered yet`);
			let r = this.getOrInitializeService({
				instanceIdentifier: n,
				options: t
			});
			for (let [e, t] of this.instancesDeferred.entries()) n === this.normalizeInstanceIdentifier(e) && t.resolve(r);
			return r;
		}
		onInit(e, t) {
			let n = this.normalizeInstanceIdentifier(t), r = this.onInitCallbacks.get(n) ?? /* @__PURE__ */ new Set();
			r.add(e), this.onInitCallbacks.set(n, r);
			let i = this.instances.get(n);
			return i && e(i, n), () => {
				r.delete(e);
			};
		}
		invokeOnInitCallbacks(e, t) {
			let n = this.onInitCallbacks.get(t);
			if (n) for (let r of n) try {
				r(e, t);
			} catch {}
		}
		getOrInitializeService({ instanceIdentifier: e, options: t = {} }) {
			let n = this.instances.get(e);
			if (!n && this.component && (n = this.component.instanceFactory(this.container, {
				instanceIdentifier: ue(e),
				options: t
			}), this.instances.set(e, n), this.instancesOptions.set(e, t), this.invokeOnInitCallbacks(n, e), this.component.onInstanceCreated)) try {
				this.component.onInstanceCreated(this.container, e, n);
			} catch {}
			return n || null;
		}
		normalizeInstanceIdentifier(e = pe) {
			return this.component ? this.component.multipleInstances ? e : pe : e;
		}
		shouldAutoInitialize() {
			return !!this.component && this.component.instantiationMode !== "EXPLICIT";
		}
	}, he = class {
		constructor(e) {
			this.name = e, this.providers = /* @__PURE__ */ new Map();
		}
		addComponent(e) {
			let t = this.getProvider(e.name);
			if (t.isComponentSet()) throw Error(`Component ${e.name} has already been registered with ${this.name}`);
			t.setComponent(e);
		}
		addOrOverwriteComponent(e) {
			this.getProvider(e.name).isComponentSet() && this.providers.delete(e.name), this.addComponent(e);
		}
		getProvider(e) {
			if (this.providers.has(e)) return this.providers.get(e);
			let t = new me(e, this);
			return this.providers.set(e, t), t;
		}
		getProviders() {
			return Array.from(this.providers.values());
		}
	};
})), _e, _, ve, ye, be, xe, Se, Ce = t((() => {
	_e = [], (function(e) {
		e[e.DEBUG = 0] = "DEBUG", e[e.VERBOSE = 1] = "VERBOSE", e[e.INFO = 2] = "INFO", e[e.WARN = 3] = "WARN", e[e.ERROR = 4] = "ERROR", e[e.SILENT = 5] = "SILENT";
	})(_ ||= {}), ve = {
		debug: _.DEBUG,
		verbose: _.VERBOSE,
		info: _.INFO,
		warn: _.WARN,
		error: _.ERROR,
		silent: _.SILENT
	}, ye = _.INFO, be = {
		[_.DEBUG]: "log",
		[_.VERBOSE]: "log",
		[_.INFO]: "info",
		[_.WARN]: "warn",
		[_.ERROR]: "error"
	}, xe = (e, t, ...n) => {
		if (t < e.logLevel) return;
		let r = (/* @__PURE__ */ new Date()).toISOString(), i = be[t];
		if (i) console[i](`[${r}]  ${e.name}:`, ...n);
		else throw Error(`Attempted to log a message with an invalid logType (value: ${t})`);
	}, Se = class {
		constructor(e) {
			this.name = e, this._logLevel = ye, this._logHandler = xe, this._userLogHandler = null, _e.push(this);
		}
		get logLevel() {
			return this._logLevel;
		}
		set logLevel(e) {
			if (!(e in _)) throw TypeError(`Invalid value "${e}" assigned to \`logLevel\``);
			this._logLevel = e;
		}
		setLogLevel(e) {
			this._logLevel = typeof e == "string" ? ve[e] : e;
		}
		get logHandler() {
			return this._logHandler;
		}
		set logHandler(e) {
			if (typeof e != "function") throw TypeError("Value assigned to `logHandler` must be a function");
			this._logHandler = e;
		}
		get userLogHandler() {
			return this._userLogHandler;
		}
		set userLogHandler(e) {
			this._userLogHandler = e;
		}
		debug(...e) {
			this._userLogHandler && this._userLogHandler(this, _.DEBUG, ...e), this._logHandler(this, _.DEBUG, ...e);
		}
		log(...e) {
			this._userLogHandler && this._userLogHandler(this, _.VERBOSE, ...e), this._logHandler(this, _.VERBOSE, ...e);
		}
		info(...e) {
			this._userLogHandler && this._userLogHandler(this, _.INFO, ...e), this._logHandler(this, _.INFO, ...e);
		}
		warn(...e) {
			this._userLogHandler && this._userLogHandler(this, _.WARN, ...e), this._logHandler(this, _.WARN, ...e);
		}
		error(...e) {
			this._userLogHandler && this._userLogHandler(this, _.ERROR, ...e), this._logHandler(this, _.ERROR, ...e);
		}
	};
}));
//#endregion
//#region node_modules/idb/build/wrap-idb-value.js
function we() {
	return Ne ||= [
		IDBDatabase,
		IDBObjectStore,
		IDBIndex,
		IDBCursor,
		IDBTransaction
	];
}
function Te() {
	return Pe ||= [
		IDBCursor.prototype.advance,
		IDBCursor.prototype.continue,
		IDBCursor.prototype.continuePrimaryKey
	];
}
function Ee(e) {
	let t = new Promise((t, n) => {
		let r = () => {
			e.removeEventListener("success", i), e.removeEventListener("error", a);
		}, i = () => {
			t(je(e.result)), r();
		}, a = () => {
			n(e.error), r();
		};
		e.addEventListener("success", i), e.addEventListener("error", a);
	});
	return t.then((t) => {
		t instanceof IDBCursor && Fe.set(t, e);
	}).catch(() => {}), ze.set(t, e), t;
}
function De(e) {
	if (Ie.has(e)) return;
	let t = new Promise((t, n) => {
		let r = () => {
			e.removeEventListener("complete", i), e.removeEventListener("error", a), e.removeEventListener("abort", a);
		}, i = () => {
			t(), r();
		}, a = () => {
			n(e.error || new DOMException("AbortError", "AbortError")), r();
		};
		e.addEventListener("complete", i), e.addEventListener("error", a), e.addEventListener("abort", a);
	});
	Ie.set(e, t);
}
function Oe(e) {
	Be = e(Be);
}
function ke(e) {
	return e === IDBDatabase.prototype.transaction && !("objectStoreNames" in IDBTransaction.prototype) ? function(t, ...n) {
		let r = e.call(Ve(this), t, ...n);
		return Le.set(r, t.sort ? t.sort() : [t]), je(r);
	} : Te().includes(e) ? function(...t) {
		return e.apply(Ve(this), t), je(Fe.get(this));
	} : function(...t) {
		return je(e.apply(Ve(this), t));
	};
}
function Ae(e) {
	return typeof e == "function" ? ke(e) : (e instanceof IDBTransaction && De(e), Me(e, we()) ? new Proxy(e, Be) : e);
}
function je(e) {
	if (e instanceof IDBRequest) return Ee(e);
	if (Re.has(e)) return Re.get(e);
	let t = Ae(e);
	return t !== e && (Re.set(e, t), ze.set(t, e)), t;
}
var Me, Ne, Pe, Fe, Ie, Le, Re, ze, Be, Ve, He = t((() => {
	Me = (e, t) => t.some((t) => e instanceof t), Fe = /* @__PURE__ */ new WeakMap(), Ie = /* @__PURE__ */ new WeakMap(), Le = /* @__PURE__ */ new WeakMap(), Re = /* @__PURE__ */ new WeakMap(), ze = /* @__PURE__ */ new WeakMap(), Be = {
		get(e, t, n) {
			if (e instanceof IDBTransaction) {
				if (t === "done") return Ie.get(e);
				if (t === "objectStoreNames") return e.objectStoreNames || Le.get(e);
				if (t === "store") return n.objectStoreNames[1] ? void 0 : n.objectStore(n.objectStoreNames[0]);
			}
			return je(e[t]);
		},
		set(e, t, n) {
			return e[t] = n, !0;
		},
		has(e, t) {
			return e instanceof IDBTransaction && (t === "done" || t === "store") || t in e;
		}
	}, Ve = (e) => ze.get(e);
}));
//#endregion
//#region node_modules/idb/build/index.js
function Ue(e, t, { blocked: n, upgrade: r, blocking: i, terminated: a } = {}) {
	let o = indexedDB.open(e, t), s = je(o);
	return r && o.addEventListener("upgradeneeded", (e) => {
		r(je(o.result), e.oldVersion, e.newVersion, je(o.transaction), e);
	}), n && o.addEventListener("blocked", (e) => n(e.oldVersion, e.newVersion, e)), s.then((e) => {
		a && e.addEventListener("close", () => a()), i && e.addEventListener("versionchange", (e) => i(e.oldVersion, e.newVersion, e));
	}).catch(() => {}), s;
}
function We(e, t) {
	if (!(e instanceof IDBDatabase && !(t in e) && typeof t == "string")) return;
	if (qe.get(t)) return qe.get(t);
	let n = t.replace(/FromIndex$/, ""), r = t !== n, i = Ke.includes(n);
	if (!(n in (r ? IDBIndex : IDBObjectStore).prototype) || !(i || Ge.includes(n))) return;
	let a = async function(e, ...t) {
		let a = this.transaction(e, i ? "readwrite" : "readonly"), o = a.store;
		return r && (o = o.index(t.shift())), (await Promise.all([o[n](...t), i && a.done]))[0];
	};
	return qe.set(t, a), a;
}
var Ge, Ke, qe, Je = t((() => {
	He(), Ge = [
		"get",
		"getKey",
		"getAll",
		"getAllKeys",
		"count"
	], Ke = [
		"put",
		"add",
		"delete",
		"clear"
	], qe = /* @__PURE__ */ new Map(), Oe((e) => ({
		...e,
		get: (t, n, r) => We(t, n) || e.get(t, n, r),
		has: (t, n) => !!We(t, n) || e.has(t, n)
	}));
}));
//#endregion
//#region node_modules/@firebase/app/dist/esm/index.esm2017.js
function Ye(e) {
	return e.getComponent()?.type === "VERSION";
}
function Xe(e, t) {
	try {
		e.container.addComponent(t);
	} catch (n) {
		v.debug(`Component ${t.name} failed to register with FirebaseApp ${e.name}`, n);
	}
}
function Ze(e) {
	let t = e.name;
	if (Kt.has(t)) return v.debug(`There were multiple attempts to register component ${t}.`), !1;
	Kt.set(t, e);
	for (let t of Wt.values()) Xe(t, e);
	for (let t of Gt.values()) Xe(t, e);
	return !0;
}
function Qe(e, t) {
	let n = e.container.getProvider("heartbeat").getImmediate({ optional: !0 });
	return n && n.triggerHeartbeat(), e.container.getProvider(t);
}
function $e(e, t, n = Ht) {
	Qe(e, t).clearInstance(n);
}
function et(e) {
	return e.settings !== void 0;
}
function tt(e, t = {}) {
	let n = e;
	typeof t != "object" && (t = { name: t });
	let r = Object.assign({
		name: Ht,
		automaticDataCollectionEnabled: !1
	}, t), i = r.name;
	if (typeof i != "string" || !i) throw qt.create("bad-app-name", { appName: String(i) });
	if (n ||= re(), !n) throw qt.create("no-options");
	let a = Wt.get(i);
	if (a) {
		if (s(n, a.options) && s(r, a.config)) return a;
		throw qt.create("duplicate-app", { appName: i });
	}
	let o = new he(i);
	for (let e of Kt.values()) o.addComponent(e);
	let c = new Jt(n, r, o);
	return Wt.set(i, c), c;
}
function nt(e = Ht) {
	let t = Wt.get(e);
	if (!t && e === "[DEFAULT]" && re()) return tt();
	if (!t) throw qt.create("no-app", { appName: e });
	return t;
}
function rt(e, t, n) {
	let r = Ut[e] ?? e;
	n && (r += `-${n}`);
	let i = r.match(/\s|\//), a = t.match(/\s|\//);
	if (i || a) {
		let e = [`Unable to register library "${r}" with version "${t}":`];
		i && e.push(`library name "${r}" contains illegal characters (whitespace or "/")`), i && a && e.push("and"), a && e.push(`version name "${t}" contains illegal characters (whitespace or "/")`), v.warn(e.join(" "));
		return;
	}
	Ze(new fe(`${r}-version`, () => ({
		library: r,
		version: t
	}), "VERSION"));
}
function it() {
	return $t ||= Ue(Xt, Zt, { upgrade: (e, t) => {
		switch (t) {
			case 0: try {
				e.createObjectStore(Qt);
			} catch (e) {
				console.warn(e);
			}
		}
	} }).catch((e) => {
		throw qt.create("idb-open", { originalErrorMessage: e.message });
	}), $t;
}
async function at(e) {
	try {
		let t = (await it()).transaction(Qt), n = await t.objectStore(Qt).get(st(e));
		return await t.done, n;
	} catch (e) {
		if (e instanceof oe) v.warn(e.message);
		else {
			let t = qt.create("idb-get", { originalErrorMessage: e?.message });
			v.warn(t.message);
		}
	}
}
async function ot(e, t) {
	try {
		let n = (await it()).transaction(Qt, "readwrite");
		await n.objectStore(Qt).put(t, st(e)), await n.done;
	} catch (e) {
		if (e instanceof oe) v.warn(e.message);
		else {
			let t = qt.create("idb-set", { originalErrorMessage: e?.message });
			v.warn(t.message);
		}
	}
}
function st(e) {
	return `${e.name}!${e.options.appId}`;
}
function ct() {
	return (/* @__PURE__ */ new Date()).toISOString().substring(0, 10);
}
function lt(e, t = en) {
	let n = [], r = e.slice();
	for (let i of e) {
		let e = n.find((e) => e.agent === i.agent);
		if (!e) {
			if (n.push({
				agent: i.agent,
				dates: [i.date]
			}), ut(n) > t) {
				n.pop();
				break;
			}
		} else if (e.dates.push(i.date), ut(n) > t) {
			e.dates.pop();
			break;
		}
		r = r.slice(1);
	}
	return {
		heartbeatsToSend: n,
		unsentEntries: r
	};
}
function ut(e) {
	return m(JSON.stringify({
		version: 2,
		heartbeats: e
	})).length;
}
function dt(e) {
	Ze(new fe("platform-logger", (e) => new ft(e), "PRIVATE")), Ze(new fe("heartbeat", (e) => new nn(e), "PRIVATE")), rt(pt, mt, e), rt(pt, mt, "esm2017"), rt("fire-js", "");
}
var ft, pt, mt, v, ht, gt, _t, vt, yt, bt, xt, St, Ct, wt, Tt, Et, Dt, Ot, kt, At, jt, Mt, Nt, Pt, Ft, It, Lt, Rt, zt, Bt, Vt, Ht, Ut, Wt, Gt, Kt, qt, Jt, Yt, Xt, Zt, Qt, $t, en, tn, nn, rn, an = t((() => {
	ge(), Ce(), le(), Je(), ft = class {
		constructor(e) {
			this.container = e;
		}
		getPlatformInfoString() {
			return this.container.getProviders().map((e) => {
				if (Ye(e)) {
					let t = e.getImmediate();
					return `${t.library}/${t.version}`;
				} else return null;
			}).filter((e) => e).join(" ");
		}
	}, pt = "@firebase/app", mt = "0.10.13", v = new Se("@firebase/app"), ht = "@firebase/app-compat", gt = "@firebase/analytics-compat", _t = "@firebase/analytics", vt = "@firebase/app-check-compat", yt = "@firebase/app-check", bt = "@firebase/auth", xt = "@firebase/auth-compat", St = "@firebase/database", Ct = "@firebase/data-connect", wt = "@firebase/database-compat", Tt = "@firebase/functions", Et = "@firebase/functions-compat", Dt = "@firebase/installations", Ot = "@firebase/installations-compat", kt = "@firebase/messaging", At = "@firebase/messaging-compat", jt = "@firebase/performance", Mt = "@firebase/performance-compat", Nt = "@firebase/remote-config", Pt = "@firebase/remote-config-compat", Ft = "@firebase/storage", It = "@firebase/storage-compat", Lt = "@firebase/firestore", Rt = "@firebase/vertexai-preview", zt = "@firebase/firestore-compat", Bt = "firebase", Vt = "10.14.1", Ht = "[DEFAULT]", Ut = {
		[pt]: "fire-core",
		[ht]: "fire-core-compat",
		[_t]: "fire-analytics",
		[gt]: "fire-analytics-compat",
		[yt]: "fire-app-check",
		[vt]: "fire-app-check-compat",
		[bt]: "fire-auth",
		[xt]: "fire-auth-compat",
		[St]: "fire-rtdb",
		[Ct]: "fire-data-connect",
		[wt]: "fire-rtdb-compat",
		[Tt]: "fire-fn",
		[Et]: "fire-fn-compat",
		[Dt]: "fire-iid",
		[Ot]: "fire-iid-compat",
		[kt]: "fire-fcm",
		[At]: "fire-fcm-compat",
		[jt]: "fire-perf",
		[Mt]: "fire-perf-compat",
		[Nt]: "fire-rc",
		[Pt]: "fire-rc-compat",
		[Ft]: "fire-gcs",
		[It]: "fire-gcs-compat",
		[Lt]: "fire-fst",
		[zt]: "fire-fst-compat",
		[Rt]: "fire-vertex",
		"fire-js": "fire-js",
		[Bt]: "fire-js-all"
	}, Wt = /* @__PURE__ */ new Map(), Gt = /* @__PURE__ */ new Map(), Kt = /* @__PURE__ */ new Map(), qt = new se("app", "Firebase", {
		"no-app": "No Firebase App '{$appName}' has been created - call initializeApp() first",
		"bad-app-name": "Illegal App name: '{$appName}'",
		"duplicate-app": "Firebase App named '{$appName}' already exists with different options or config",
		"app-deleted": "Firebase App named '{$appName}' already deleted",
		"server-app-deleted": "Firebase Server App has been deleted",
		"no-options": "Need to provide options, when not being deployed to hosting via source.",
		"invalid-app-argument": "firebase.{$appName}() takes either no argument or a Firebase App instance.",
		"invalid-log-argument": "First argument to `onLog` must be null or a function.",
		"idb-open": "Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.",
		"idb-get": "Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.",
		"idb-set": "Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.",
		"idb-delete": "Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.",
		"finalization-registry-not-supported": "FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.",
		"invalid-server-app-environment": "FirebaseServerApp is not for use in browser environments."
	}), Jt = class {
		constructor(e, t, n) {
			this._isDeleted = !1, this._options = Object.assign({}, e), this._config = Object.assign({}, t), this._name = t.name, this._automaticDataCollectionEnabled = t.automaticDataCollectionEnabled, this._container = n, this.container.addComponent(new fe("app", () => this, "PUBLIC"));
		}
		get automaticDataCollectionEnabled() {
			return this.checkDestroyed(), this._automaticDataCollectionEnabled;
		}
		set automaticDataCollectionEnabled(e) {
			this.checkDestroyed(), this._automaticDataCollectionEnabled = e;
		}
		get name() {
			return this.checkDestroyed(), this._name;
		}
		get options() {
			return this.checkDestroyed(), this._options;
		}
		get config() {
			return this.checkDestroyed(), this._config;
		}
		get container() {
			return this._container;
		}
		get isDeleted() {
			return this._isDeleted;
		}
		set isDeleted(e) {
			this._isDeleted = e;
		}
		checkDestroyed() {
			if (this.isDeleted) throw qt.create("app-deleted", { appName: this._name });
		}
	}, Yt = Vt, Xt = "firebase-heartbeat-database", Zt = 1, Qt = "firebase-heartbeat-store", $t = null, en = 1024, tn = 720 * 60 * 60 * 1e3, nn = class {
		constructor(e) {
			this.container = e, this._heartbeatsCache = null;
			let t = this.container.getProvider("app").getImmediate();
			this._storage = new rn(t), this._heartbeatsCachePromise = this._storage.read().then((e) => (this._heartbeatsCache = e, e));
		}
		async triggerHeartbeat() {
			try {
				let e = this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(), t = ct();
				return this._heartbeatsCache?.heartbeats == null && (this._heartbeatsCache = await this._heartbeatsCachePromise, this._heartbeatsCache?.heartbeats == null) || this._heartbeatsCache.lastSentHeartbeatDate === t || this._heartbeatsCache.heartbeats.some((e) => e.date === t) ? void 0 : (this._heartbeatsCache.heartbeats.push({
					date: t,
					agent: e
				}), this._heartbeatsCache.heartbeats = this._heartbeatsCache.heartbeats.filter((e) => {
					let t = new Date(e.date).valueOf();
					return Date.now() - t <= tn;
				}), this._storage.overwrite(this._heartbeatsCache));
			} catch (e) {
				v.warn(e);
			}
		}
		async getHeartbeatsHeader() {
			try {
				if (this._heartbeatsCache === null && await this._heartbeatsCachePromise, this._heartbeatsCache?.heartbeats == null || this._heartbeatsCache.heartbeats.length === 0) return "";
				let e = ct(), { heartbeatsToSend: t, unsentEntries: n } = lt(this._heartbeatsCache.heartbeats), r = m(JSON.stringify({
					version: 2,
					heartbeats: t
				}));
				return this._heartbeatsCache.lastSentHeartbeatDate = e, n.length > 0 ? (this._heartbeatsCache.heartbeats = n, await this._storage.overwrite(this._heartbeatsCache)) : (this._heartbeatsCache.heartbeats = [], this._storage.overwrite(this._heartbeatsCache)), r;
			} catch (e) {
				return v.warn(e), "";
			}
		}
	}, rn = class {
		constructor(e) {
			this.app = e, this._canUseIndexedDBPromise = this.runIndexedDBEnvironmentCheck();
		}
		async runIndexedDBEnvironmentCheck() {
			return i() ? a().then(() => !0).catch(() => !1) : !1;
		}
		async read() {
			if (await this._canUseIndexedDBPromise) {
				let e = await at(this.app);
				return e?.heartbeats ? e : { heartbeats: [] };
			} else return { heartbeats: [] };
		}
		async overwrite(e) {
			if (await this._canUseIndexedDBPromise) {
				let t = await this.read();
				return ot(this.app, {
					lastSentHeartbeatDate: e.lastSentHeartbeatDate ?? t.lastSentHeartbeatDate,
					heartbeats: e.heartbeats
				});
			} else return;
		}
		async add(e) {
			if (await this._canUseIndexedDBPromise) {
				let t = await this.read();
				return ot(this.app, {
					lastSentHeartbeatDate: e.lastSentHeartbeatDate ?? t.lastSentHeartbeatDate,
					heartbeats: [...t.heartbeats, ...e.heartbeats]
				});
			} else return;
		}
	}, dt("");
}));
//#endregion
//#region node_modules/@firebase/firestore/node_modules/@firebase/util/dist/index.esm2017.js
function y() {
	if (typeof self < "u") return self;
	if (typeof window < "u") return window;
	if (typeof global < "u") return global;
	throw Error("Unable to locate global object.");
}
function on(e, t) {
	if (e.uid) throw Error("The \"uid\" field is no longer supported by mockUserToken. Please use \"sub\" instead for Firebase Auth User ID.");
	let n = {
		alg: "none",
		type: "JWT"
	}, r = t || "demo-project", i = e.iat || 0, a = e.sub || e.user_id;
	if (!a) throw Error("mockUserToken must contain 'sub' or 'user_id' field!");
	let o = Object.assign({
		iss: `https://securetoken.google.com/${r}`,
		aud: r,
		iat: i,
		exp: i + 3600,
		auth_time: i,
		sub: a,
		user_id: a,
		firebase: {
			sign_in_provider: "custom",
			identities: {}
		}
	}, e);
	return [
		bn(JSON.stringify(n)),
		bn(JSON.stringify(o)),
		""
	].join(".");
}
function sn() {
	return typeof navigator < "u" && typeof navigator.userAgent == "string" ? navigator.userAgent : "";
}
function cn() {
	let e = Tn()?.forceEnvironment;
	if (e === "node") return !0;
	if (e === "browser") return !1;
	try {
		return Object.prototype.toString.call(global.process) === "[object process]";
	} catch {
		return !1;
	}
}
function ln() {
	return !cn() && !!navigator.userAgent && navigator.userAgent.includes("Safari") && !navigator.userAgent.includes("Chrome");
}
function un() {
	try {
		return typeof indexedDB == "object";
	} catch {
		return !1;
	}
}
function dn(e, t) {
	return e.replace(jn, (e, n) => {
		let r = t[n];
		return r == null ? `<${n}?>` : String(r);
	});
}
function fn(e, t) {
	if (e === t) return !0;
	let n = Object.keys(e), r = Object.keys(t);
	for (let i of n) {
		if (!r.includes(i)) return !1;
		let n = e[i], a = t[i];
		if (pn(n) && pn(a)) {
			if (!fn(n, a)) return !1;
		} else if (n !== a) return !1;
	}
	for (let e of r) if (!n.includes(e)) return !1;
	return !0;
}
function pn(e) {
	return typeof e == "object" && !!e;
}
function mn(e) {
	return e && e._delegate ? e._delegate : e;
}
var hn, gn, _n, vn, yn, bn, xn, Sn, Cn, wn, Tn, En, Dn, On, kn, An, jn, Mn = t((() => {
	hn = function(e) {
		let t = [], n = 0;
		for (let r = 0; r < e.length; r++) {
			let i = e.charCodeAt(r);
			i < 128 ? t[n++] = i : i < 2048 ? (t[n++] = i >> 6 | 192, t[n++] = i & 63 | 128) : (i & 64512) == 55296 && r + 1 < e.length && (e.charCodeAt(r + 1) & 64512) == 56320 ? (i = 65536 + ((i & 1023) << 10) + (e.charCodeAt(++r) & 1023), t[n++] = i >> 18 | 240, t[n++] = i >> 12 & 63 | 128, t[n++] = i >> 6 & 63 | 128, t[n++] = i & 63 | 128) : (t[n++] = i >> 12 | 224, t[n++] = i >> 6 & 63 | 128, t[n++] = i & 63 | 128);
		}
		return t;
	}, gn = function(e) {
		let t = [], n = 0, r = 0;
		for (; n < e.length;) {
			let i = e[n++];
			if (i < 128) t[r++] = String.fromCharCode(i);
			else if (i > 191 && i < 224) {
				let a = e[n++];
				t[r++] = String.fromCharCode((i & 31) << 6 | a & 63);
			} else if (i > 239 && i < 365) {
				let a = e[n++], o = e[n++], s = e[n++], c = ((i & 7) << 18 | (a & 63) << 12 | (o & 63) << 6 | s & 63) - 65536;
				t[r++] = String.fromCharCode(55296 + (c >> 10)), t[r++] = String.fromCharCode(56320 + (c & 1023));
			} else {
				let a = e[n++], o = e[n++];
				t[r++] = String.fromCharCode((i & 15) << 12 | (a & 63) << 6 | o & 63);
			}
		}
		return t.join("");
	}, _n = {
		byteToCharMap_: null,
		charToByteMap_: null,
		byteToCharMapWebSafe_: null,
		charToByteMapWebSafe_: null,
		ENCODED_VALS_BASE: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
		get ENCODED_VALS() {
			return this.ENCODED_VALS_BASE + "+/=";
		},
		get ENCODED_VALS_WEBSAFE() {
			return this.ENCODED_VALS_BASE + "-_.";
		},
		HAS_NATIVE_SUPPORT: typeof atob == "function",
		encodeByteArray(e, t) {
			if (!Array.isArray(e)) throw Error("encodeByteArray takes an array as a parameter");
			this.init_();
			let n = t ? this.byteToCharMapWebSafe_ : this.byteToCharMap_, r = [];
			for (let t = 0; t < e.length; t += 3) {
				let i = e[t], a = t + 1 < e.length, o = a ? e[t + 1] : 0, s = t + 2 < e.length, c = s ? e[t + 2] : 0, l = i >> 2, u = (i & 3) << 4 | o >> 4, d = (o & 15) << 2 | c >> 6, f = c & 63;
				s || (f = 64, a || (d = 64)), r.push(n[l], n[u], n[d], n[f]);
			}
			return r.join("");
		},
		encodeString(e, t) {
			return this.HAS_NATIVE_SUPPORT && !t ? btoa(e) : this.encodeByteArray(hn(e), t);
		},
		decodeString(e, t) {
			return this.HAS_NATIVE_SUPPORT && !t ? atob(e) : gn(this.decodeStringToByteArray(e, t));
		},
		decodeStringToByteArray(e, t) {
			this.init_();
			let n = t ? this.charToByteMapWebSafe_ : this.charToByteMap_, r = [];
			for (let t = 0; t < e.length;) {
				let i = n[e.charAt(t++)], a = t < e.length ? n[e.charAt(t)] : 0;
				++t;
				let o = t < e.length ? n[e.charAt(t)] : 64;
				++t;
				let s = t < e.length ? n[e.charAt(t)] : 64;
				if (++t, i == null || a == null || o == null || s == null) throw new vn();
				let c = i << 2 | a >> 4;
				if (r.push(c), o !== 64) {
					let e = a << 4 & 240 | o >> 2;
					if (r.push(e), s !== 64) {
						let e = o << 6 & 192 | s;
						r.push(e);
					}
				}
			}
			return r;
		},
		init_() {
			if (!this.byteToCharMap_) {
				this.byteToCharMap_ = {}, this.charToByteMap_ = {}, this.byteToCharMapWebSafe_ = {}, this.charToByteMapWebSafe_ = {};
				for (let e = 0; e < this.ENCODED_VALS.length; e++) this.byteToCharMap_[e] = this.ENCODED_VALS.charAt(e), this.charToByteMap_[this.byteToCharMap_[e]] = e, this.byteToCharMapWebSafe_[e] = this.ENCODED_VALS_WEBSAFE.charAt(e), this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[e]] = e, e >= this.ENCODED_VALS_BASE.length && (this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(e)] = e, this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(e)] = e);
			}
		}
	}, vn = class extends Error {
		constructor() {
			super(...arguments), this.name = "DecodeBase64StringError";
		}
	}, yn = function(e) {
		let t = hn(e);
		return _n.encodeByteArray(t, !0);
	}, bn = function(e) {
		return yn(e).replace(/\./g, "");
	}, xn = function(e) {
		try {
			return _n.decodeString(e, !0);
		} catch (e) {
			console.error("base64Decode failed: ", e);
		}
		return null;
	}, Sn = () => y().__FIREBASE_DEFAULTS__, Cn = () => {
		if (typeof process > "u" || process.env === void 0) return;
		let e = process.env.__FIREBASE_DEFAULTS__;
		if (e) return JSON.parse(e);
	}, wn = () => {
		if (typeof document > "u") return;
		let e;
		try {
			e = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
		} catch {
			return;
		}
		let t = e && xn(e[1]);
		return t && JSON.parse(t);
	}, Tn = () => {
		try {
			return Sn() || Cn() || wn();
		} catch (e) {
			console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);
			return;
		}
	}, En = (e) => Tn()?.emulatorHosts?.[e], Dn = (e) => {
		let t = En(e);
		if (!t) return;
		let n = t.lastIndexOf(":");
		if (n <= 0 || n + 1 === t.length) throw Error(`Invalid host ${t} with no separate hostname and port!`);
		let r = parseInt(t.substring(n + 1), 10);
		return t[0] === "[" ? [t.substring(1, n - 1), r] : [t.substring(0, n), r];
	}, On = "FirebaseError", kn = class e extends Error {
		constructor(t, n, r) {
			super(n), this.code = t, this.customData = r, this.name = On, Object.setPrototypeOf(this, e.prototype), Error.captureStackTrace && Error.captureStackTrace(this, An.prototype.create);
		}
	}, An = class {
		constructor(e, t, n) {
			this.service = e, this.serviceName = t, this.errors = n;
		}
		create(e, ...t) {
			let n = t[0] || {}, r = `${this.service}/${e}`, i = this.errors[e], a = i ? dn(i, n) : "Error", o = `${this.serviceName}: ${a} (${r}).`;
			return new kn(r, o, n);
		}
	}, jn = /\{\$([^}]+)}/g;
})), Nn, b = t((() => {
	Nn = class {
		constructor(e, t, n) {
			this.name = e, this.instanceFactory = t, this.type = n, this.multipleInstances = !1, this.serviceProps = {}, this.instantiationMode = "LAZY", this.onInstanceCreated = null;
		}
		setInstantiationMode(e) {
			return this.instantiationMode = e, this;
		}
		setMultipleInstances(e) {
			return this.multipleInstances = e, this;
		}
		setServiceProps(e) {
			return this.serviceProps = e, this;
		}
		setInstanceCreatedCallback(e) {
			return this.onInstanceCreated = e, this;
		}
	};
})), Pn, x, Fn, In, Ln, Rn, zn, Bn = t((() => {
	Pn = [], (function(e) {
		e[e.DEBUG = 0] = "DEBUG", e[e.VERBOSE = 1] = "VERBOSE", e[e.INFO = 2] = "INFO", e[e.WARN = 3] = "WARN", e[e.ERROR = 4] = "ERROR", e[e.SILENT = 5] = "SILENT";
	})(x ||= {}), Fn = {
		debug: x.DEBUG,
		verbose: x.VERBOSE,
		info: x.INFO,
		warn: x.WARN,
		error: x.ERROR,
		silent: x.SILENT
	}, In = x.INFO, Ln = {
		[x.DEBUG]: "log",
		[x.VERBOSE]: "log",
		[x.INFO]: "info",
		[x.WARN]: "warn",
		[x.ERROR]: "error"
	}, Rn = (e, t, ...n) => {
		if (t < e.logLevel) return;
		let r = (/* @__PURE__ */ new Date()).toISOString(), i = Ln[t];
		if (i) console[i](`[${r}]  ${e.name}:`, ...n);
		else throw Error(`Attempted to log a message with an invalid logType (value: ${t})`);
	}, zn = class {
		constructor(e) {
			this.name = e, this._logLevel = In, this._logHandler = Rn, this._userLogHandler = null, Pn.push(this);
		}
		get logLevel() {
			return this._logLevel;
		}
		set logLevel(e) {
			if (!(e in x)) throw TypeError(`Invalid value "${e}" assigned to \`logLevel\``);
			this._logLevel = e;
		}
		setLogLevel(e) {
			this._logLevel = typeof e == "string" ? Fn[e] : e;
		}
		get logHandler() {
			return this._logHandler;
		}
		set logHandler(e) {
			if (typeof e != "function") throw TypeError("Value assigned to `logHandler` must be a function");
			this._logHandler = e;
		}
		get userLogHandler() {
			return this._userLogHandler;
		}
		set userLogHandler(e) {
			this._userLogHandler = e;
		}
		debug(...e) {
			this._userLogHandler && this._userLogHandler(this, x.DEBUG, ...e), this._logHandler(this, x.DEBUG, ...e);
		}
		log(...e) {
			this._userLogHandler && this._userLogHandler(this, x.VERBOSE, ...e), this._logHandler(this, x.VERBOSE, ...e);
		}
		info(...e) {
			this._userLogHandler && this._userLogHandler(this, x.INFO, ...e), this._logHandler(this, x.INFO, ...e);
		}
		warn(...e) {
			this._userLogHandler && this._userLogHandler(this, x.WARN, ...e), this._logHandler(this, x.WARN, ...e);
		}
		error(...e) {
			this._userLogHandler && this._userLogHandler(this, x.ERROR, ...e), this._logHandler(this, x.ERROR, ...e);
		}
	};
})), Vn, Hn, Un, Wn, Gn = t((() => {
	Vn = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, Hn = {}, (function() {
		var e;
		function t(e, t) {
			function n() {}
			n.prototype = t.prototype, e.D = t.prototype, e.prototype = new n(), e.prototype.constructor = e, e.C = function(e, n, r) {
				for (var i = Array(arguments.length - 2), a = 2; a < arguments.length; a++) i[a - 2] = arguments[a];
				return t.prototype[n].apply(e, i);
			};
		}
		function n() {
			this.blockSize = -1;
		}
		function r() {
			this.blockSize = -1, this.blockSize = 64, this.g = [
				,
				,
				,
				,
			], this.B = Array(this.blockSize), this.o = this.h = 0, this.s();
		}
		t(r, n), r.prototype.s = function() {
			this.g[0] = 1732584193, this.g[1] = 4023233417, this.g[2] = 2562383102, this.g[3] = 271733878, this.o = this.h = 0;
		};
		function i(e, t, n) {
			n ||= 0;
			var r = Array(16);
			if (typeof t == "string") for (var i = 0; 16 > i; ++i) r[i] = t.charCodeAt(n++) | t.charCodeAt(n++) << 8 | t.charCodeAt(n++) << 16 | t.charCodeAt(n++) << 24;
			else for (i = 0; 16 > i; ++i) r[i] = t[n++] | t[n++] << 8 | t[n++] << 16 | t[n++] << 24;
			t = e.g[0], n = e.g[1], i = e.g[2];
			var a = e.g[3], o = t + (a ^ n & (i ^ a)) + r[0] + 3614090360 & 4294967295;
			t = n + (o << 7 & 4294967295 | o >>> 25), o = a + (i ^ t & (n ^ i)) + r[1] + 3905402710 & 4294967295, a = t + (o << 12 & 4294967295 | o >>> 20), o = i + (n ^ a & (t ^ n)) + r[2] + 606105819 & 4294967295, i = a + (o << 17 & 4294967295 | o >>> 15), o = n + (t ^ i & (a ^ t)) + r[3] + 3250441966 & 4294967295, n = i + (o << 22 & 4294967295 | o >>> 10), o = t + (a ^ n & (i ^ a)) + r[4] + 4118548399 & 4294967295, t = n + (o << 7 & 4294967295 | o >>> 25), o = a + (i ^ t & (n ^ i)) + r[5] + 1200080426 & 4294967295, a = t + (o << 12 & 4294967295 | o >>> 20), o = i + (n ^ a & (t ^ n)) + r[6] + 2821735955 & 4294967295, i = a + (o << 17 & 4294967295 | o >>> 15), o = n + (t ^ i & (a ^ t)) + r[7] + 4249261313 & 4294967295, n = i + (o << 22 & 4294967295 | o >>> 10), o = t + (a ^ n & (i ^ a)) + r[8] + 1770035416 & 4294967295, t = n + (o << 7 & 4294967295 | o >>> 25), o = a + (i ^ t & (n ^ i)) + r[9] + 2336552879 & 4294967295, a = t + (o << 12 & 4294967295 | o >>> 20), o = i + (n ^ a & (t ^ n)) + r[10] + 4294925233 & 4294967295, i = a + (o << 17 & 4294967295 | o >>> 15), o = n + (t ^ i & (a ^ t)) + r[11] + 2304563134 & 4294967295, n = i + (o << 22 & 4294967295 | o >>> 10), o = t + (a ^ n & (i ^ a)) + r[12] + 1804603682 & 4294967295, t = n + (o << 7 & 4294967295 | o >>> 25), o = a + (i ^ t & (n ^ i)) + r[13] + 4254626195 & 4294967295, a = t + (o << 12 & 4294967295 | o >>> 20), o = i + (n ^ a & (t ^ n)) + r[14] + 2792965006 & 4294967295, i = a + (o << 17 & 4294967295 | o >>> 15), o = n + (t ^ i & (a ^ t)) + r[15] + 1236535329 & 4294967295, n = i + (o << 22 & 4294967295 | o >>> 10), o = t + (i ^ a & (n ^ i)) + r[1] + 4129170786 & 4294967295, t = n + (o << 5 & 4294967295 | o >>> 27), o = a + (n ^ i & (t ^ n)) + r[6] + 3225465664 & 4294967295, a = t + (o << 9 & 4294967295 | o >>> 23), o = i + (t ^ n & (a ^ t)) + r[11] + 643717713 & 4294967295, i = a + (o << 14 & 4294967295 | o >>> 18), o = n + (a ^ t & (i ^ a)) + r[0] + 3921069994 & 4294967295, n = i + (o << 20 & 4294967295 | o >>> 12), o = t + (i ^ a & (n ^ i)) + r[5] + 3593408605 & 4294967295, t = n + (o << 5 & 4294967295 | o >>> 27), o = a + (n ^ i & (t ^ n)) + r[10] + 38016083 & 4294967295, a = t + (o << 9 & 4294967295 | o >>> 23), o = i + (t ^ n & (a ^ t)) + r[15] + 3634488961 & 4294967295, i = a + (o << 14 & 4294967295 | o >>> 18), o = n + (a ^ t & (i ^ a)) + r[4] + 3889429448 & 4294967295, n = i + (o << 20 & 4294967295 | o >>> 12), o = t + (i ^ a & (n ^ i)) + r[9] + 568446438 & 4294967295, t = n + (o << 5 & 4294967295 | o >>> 27), o = a + (n ^ i & (t ^ n)) + r[14] + 3275163606 & 4294967295, a = t + (o << 9 & 4294967295 | o >>> 23), o = i + (t ^ n & (a ^ t)) + r[3] + 4107603335 & 4294967295, i = a + (o << 14 & 4294967295 | o >>> 18), o = n + (a ^ t & (i ^ a)) + r[8] + 1163531501 & 4294967295, n = i + (o << 20 & 4294967295 | o >>> 12), o = t + (i ^ a & (n ^ i)) + r[13] + 2850285829 & 4294967295, t = n + (o << 5 & 4294967295 | o >>> 27), o = a + (n ^ i & (t ^ n)) + r[2] + 4243563512 & 4294967295, a = t + (o << 9 & 4294967295 | o >>> 23), o = i + (t ^ n & (a ^ t)) + r[7] + 1735328473 & 4294967295, i = a + (o << 14 & 4294967295 | o >>> 18), o = n + (a ^ t & (i ^ a)) + r[12] + 2368359562 & 4294967295, n = i + (o << 20 & 4294967295 | o >>> 12), o = t + (n ^ i ^ a) + r[5] + 4294588738 & 4294967295, t = n + (o << 4 & 4294967295 | o >>> 28), o = a + (t ^ n ^ i) + r[8] + 2272392833 & 4294967295, a = t + (o << 11 & 4294967295 | o >>> 21), o = i + (a ^ t ^ n) + r[11] + 1839030562 & 4294967295, i = a + (o << 16 & 4294967295 | o >>> 16), o = n + (i ^ a ^ t) + r[14] + 4259657740 & 4294967295, n = i + (o << 23 & 4294967295 | o >>> 9), o = t + (n ^ i ^ a) + r[1] + 2763975236 & 4294967295, t = n + (o << 4 & 4294967295 | o >>> 28), o = a + (t ^ n ^ i) + r[4] + 1272893353 & 4294967295, a = t + (o << 11 & 4294967295 | o >>> 21), o = i + (a ^ t ^ n) + r[7] + 4139469664 & 4294967295, i = a + (o << 16 & 4294967295 | o >>> 16), o = n + (i ^ a ^ t) + r[10] + 3200236656 & 4294967295, n = i + (o << 23 & 4294967295 | o >>> 9), o = t + (n ^ i ^ a) + r[13] + 681279174 & 4294967295, t = n + (o << 4 & 4294967295 | o >>> 28), o = a + (t ^ n ^ i) + r[0] + 3936430074 & 4294967295, a = t + (o << 11 & 4294967295 | o >>> 21), o = i + (a ^ t ^ n) + r[3] + 3572445317 & 4294967295, i = a + (o << 16 & 4294967295 | o >>> 16), o = n + (i ^ a ^ t) + r[6] + 76029189 & 4294967295, n = i + (o << 23 & 4294967295 | o >>> 9), o = t + (n ^ i ^ a) + r[9] + 3654602809 & 4294967295, t = n + (o << 4 & 4294967295 | o >>> 28), o = a + (t ^ n ^ i) + r[12] + 3873151461 & 4294967295, a = t + (o << 11 & 4294967295 | o >>> 21), o = i + (a ^ t ^ n) + r[15] + 530742520 & 4294967295, i = a + (o << 16 & 4294967295 | o >>> 16), o = n + (i ^ a ^ t) + r[2] + 3299628645 & 4294967295, n = i + (o << 23 & 4294967295 | o >>> 9), o = t + (i ^ (n | ~a)) + r[0] + 4096336452 & 4294967295, t = n + (o << 6 & 4294967295 | o >>> 26), o = a + (n ^ (t | ~i)) + r[7] + 1126891415 & 4294967295, a = t + (o << 10 & 4294967295 | o >>> 22), o = i + (t ^ (a | ~n)) + r[14] + 2878612391 & 4294967295, i = a + (o << 15 & 4294967295 | o >>> 17), o = n + (a ^ (i | ~t)) + r[5] + 4237533241 & 4294967295, n = i + (o << 21 & 4294967295 | o >>> 11), o = t + (i ^ (n | ~a)) + r[12] + 1700485571 & 4294967295, t = n + (o << 6 & 4294967295 | o >>> 26), o = a + (n ^ (t | ~i)) + r[3] + 2399980690 & 4294967295, a = t + (o << 10 & 4294967295 | o >>> 22), o = i + (t ^ (a | ~n)) + r[10] + 4293915773 & 4294967295, i = a + (o << 15 & 4294967295 | o >>> 17), o = n + (a ^ (i | ~t)) + r[1] + 2240044497 & 4294967295, n = i + (o << 21 & 4294967295 | o >>> 11), o = t + (i ^ (n | ~a)) + r[8] + 1873313359 & 4294967295, t = n + (o << 6 & 4294967295 | o >>> 26), o = a + (n ^ (t | ~i)) + r[15] + 4264355552 & 4294967295, a = t + (o << 10 & 4294967295 | o >>> 22), o = i + (t ^ (a | ~n)) + r[6] + 2734768916 & 4294967295, i = a + (o << 15 & 4294967295 | o >>> 17), o = n + (a ^ (i | ~t)) + r[13] + 1309151649 & 4294967295, n = i + (o << 21 & 4294967295 | o >>> 11), o = t + (i ^ (n | ~a)) + r[4] + 4149444226 & 4294967295, t = n + (o << 6 & 4294967295 | o >>> 26), o = a + (n ^ (t | ~i)) + r[11] + 3174756917 & 4294967295, a = t + (o << 10 & 4294967295 | o >>> 22), o = i + (t ^ (a | ~n)) + r[2] + 718787259 & 4294967295, i = a + (o << 15 & 4294967295 | o >>> 17), o = n + (a ^ (i | ~t)) + r[9] + 3951481745 & 4294967295, e.g[0] = e.g[0] + t & 4294967295, e.g[1] = e.g[1] + (i + (o << 21 & 4294967295 | o >>> 11)) & 4294967295, e.g[2] = e.g[2] + i & 4294967295, e.g[3] = e.g[3] + a & 4294967295;
		}
		r.prototype.u = function(e, t) {
			t === void 0 && (t = e.length);
			for (var n = t - this.blockSize, r = this.B, a = this.h, o = 0; o < t;) {
				if (a == 0) for (; o <= n;) i(this, e, o), o += this.blockSize;
				if (typeof e == "string") {
					for (; o < t;) if (r[a++] = e.charCodeAt(o++), a == this.blockSize) {
						i(this, r), a = 0;
						break;
					}
				} else for (; o < t;) if (r[a++] = e[o++], a == this.blockSize) {
					i(this, r), a = 0;
					break;
				}
			}
			this.h = a, this.o += t;
		}, r.prototype.v = function() {
			var e = Array((56 > this.h ? this.blockSize : 2 * this.blockSize) - this.h);
			e[0] = 128;
			for (var t = 1; t < e.length - 8; ++t) e[t] = 0;
			var n = 8 * this.o;
			for (t = e.length - 8; t < e.length; ++t) e[t] = n & 255, n /= 256;
			for (this.u(e), e = Array(16), t = n = 0; 4 > t; ++t) for (var r = 0; 32 > r; r += 8) e[n++] = this.g[t] >>> r & 255;
			return e;
		};
		function a(e, t) {
			var n = s;
			return Object.prototype.hasOwnProperty.call(n, e) ? n[e] : n[e] = t(e);
		}
		function o(e, t) {
			this.h = t;
			for (var n = [], r = !0, i = e.length - 1; 0 <= i; i--) {
				var a = e[i] | 0;
				r && a == t || (n[i] = a, r = !1);
			}
			this.g = n;
		}
		var s = {};
		function c(e) {
			return -128 <= e && 128 > e ? a(e, function(e) {
				return new o([e | 0], 0 > e ? -1 : 0);
			}) : new o([e | 0], 0 > e ? -1 : 0);
		}
		function l(e) {
			if (isNaN(e) || !isFinite(e)) return d;
			if (0 > e) return g(l(-e));
			for (var t = [], n = 1, r = 0; e >= n; r++) t[r] = e / n | 0, n *= 4294967296;
			return new o(t, 0);
		}
		function u(e, t) {
			if (e.length == 0) throw Error("number format error: empty string");
			if (t ||= 10, 2 > t || 36 < t) throw Error("radix out of range: " + t);
			if (e.charAt(0) == "-") return g(u(e.substring(1), t));
			if (0 <= e.indexOf("-")) throw Error("number format error: interior \"-\" character");
			for (var n = l(t ** 8), r = d, i = 0; i < e.length; i += 8) {
				var a = Math.min(8, e.length - i), o = parseInt(e.substring(i, i + a), t);
				8 > a ? (a = l(t ** +a), r = r.j(a).add(l(o))) : (r = r.j(n), r = r.add(l(o)));
			}
			return r;
		}
		var d = c(0), f = c(1), p = c(16777216);
		e = o.prototype, e.m = function() {
			if (h(this)) return -g(this).m();
			for (var e = 0, t = 1, n = 0; n < this.g.length; n++) {
				var r = this.i(n);
				e += (0 <= r ? r : 4294967296 + r) * t, t *= 4294967296;
			}
			return e;
		}, e.toString = function(e) {
			if (e ||= 10, 2 > e || 36 < e) throw Error("radix out of range: " + e);
			if (m(this)) return "0";
			if (h(this)) return "-" + g(this).toString(e);
			for (var t = l(e ** 6), n = this, r = "";;) {
				var i = re(n, t).g;
				n = ee(n, i.j(t));
				var a = ((0 < n.g.length ? n.g[0] : n.h) >>> 0).toString(e);
				if (n = i, m(n)) return a + r;
				for (; 6 > a.length;) a = "0" + a;
				r = a + r;
			}
		}, e.i = function(e) {
			return 0 > e ? 0 : e < this.g.length ? this.g[e] : this.h;
		};
		function m(e) {
			if (e.h != 0) return !1;
			for (var t = 0; t < e.g.length; t++) if (e.g[t] != 0) return !1;
			return !0;
		}
		function h(e) {
			return e.h == -1;
		}
		e.l = function(e) {
			return e = ee(this, e), h(e) ? -1 : +!m(e);
		};
		function g(e) {
			for (var t = e.g.length, n = [], r = 0; r < t; r++) n[r] = ~e.g[r];
			return new o(n, ~e.h).add(f);
		}
		e.abs = function() {
			return h(this) ? g(this) : this;
		}, e.add = function(e) {
			for (var t = Math.max(this.g.length, e.g.length), n = [], r = 0, i = 0; i <= t; i++) {
				var a = r + (this.i(i) & 65535) + (e.i(i) & 65535), s = (a >>> 16) + (this.i(i) >>> 16) + (e.i(i) >>> 16);
				r = s >>> 16, a &= 65535, s &= 65535, n[i] = s << 16 | a;
			}
			return new o(n, n[n.length - 1] & -2147483648 ? -1 : 0);
		};
		function ee(e, t) {
			return e.add(g(t));
		}
		e.j = function(e) {
			if (m(this) || m(e)) return d;
			if (h(this)) return h(e) ? g(this).j(g(e)) : g(g(this).j(e));
			if (h(e)) return g(this.j(g(e)));
			if (0 > this.l(p) && 0 > e.l(p)) return l(this.m() * e.m());
			for (var t = this.g.length + e.g.length, n = [], r = 0; r < 2 * t; r++) n[r] = 0;
			for (r = 0; r < this.g.length; r++) for (var i = 0; i < e.g.length; i++) {
				var a = this.i(r) >>> 16, s = this.i(r) & 65535, c = e.i(i) >>> 16, u = e.i(i) & 65535;
				n[2 * r + 2 * i] += s * u, te(n, 2 * r + 2 * i), n[2 * r + 2 * i + 1] += a * u, te(n, 2 * r + 2 * i + 1), n[2 * r + 2 * i + 1] += s * c, te(n, 2 * r + 2 * i + 1), n[2 * r + 2 * i + 2] += a * c, te(n, 2 * r + 2 * i + 2);
			}
			for (r = 0; r < t; r++) n[r] = n[2 * r + 1] << 16 | n[2 * r];
			for (r = t; r < 2 * t; r++) n[r] = 0;
			return new o(n, 0);
		};
		function te(e, t) {
			for (; (e[t] & 65535) != e[t];) e[t + 1] += e[t] >>> 16, e[t] &= 65535, t++;
		}
		function ne(e, t) {
			this.g = e, this.h = t;
		}
		function re(e, t) {
			if (m(t)) throw Error("division by zero");
			if (m(e)) return new ne(d, d);
			if (h(e)) return t = re(g(e), t), new ne(g(t.g), g(t.h));
			if (h(t)) return t = re(e, g(t)), new ne(g(t.g), t.h);
			if (30 < e.g.length) {
				if (h(e) || h(t)) throw Error("slowDivide_ only works with positive integers.");
				for (var n = f, r = t; 0 >= r.l(e);) n = ie(n), r = ie(r);
				var i = ae(n, 1), a = ae(r, 1);
				for (r = ae(r, 2), n = ae(n, 2); !m(r);) {
					var o = a.add(r);
					0 >= o.l(e) && (i = i.add(n), a = o), r = ae(r, 1), n = ae(n, 1);
				}
				return t = ee(e, i.j(t)), new ne(i, t);
			}
			for (i = d; 0 <= e.l(t);) {
				for (n = Math.max(1, Math.floor(e.m() / t.m())), r = Math.ceil(Math.log(n) / Math.LN2), r = 48 >= r ? 1 : 2 ** (r - 48), a = l(n), o = a.j(t); h(o) || 0 < o.l(e);) n -= r, a = l(n), o = a.j(t);
				m(a) && (a = f), i = i.add(a), e = ee(e, o);
			}
			return new ne(i, e);
		}
		e.A = function(e) {
			return re(this, e).h;
		}, e.and = function(e) {
			for (var t = Math.max(this.g.length, e.g.length), n = [], r = 0; r < t; r++) n[r] = this.i(r) & e.i(r);
			return new o(n, this.h & e.h);
		}, e.or = function(e) {
			for (var t = Math.max(this.g.length, e.g.length), n = [], r = 0; r < t; r++) n[r] = this.i(r) | e.i(r);
			return new o(n, this.h | e.h);
		}, e.xor = function(e) {
			for (var t = Math.max(this.g.length, e.g.length), n = [], r = 0; r < t; r++) n[r] = this.i(r) ^ e.i(r);
			return new o(n, this.h ^ e.h);
		};
		function ie(e) {
			for (var t = e.g.length + 1, n = [], r = 0; r < t; r++) n[r] = e.i(r) << 1 | e.i(r - 1) >>> 31;
			return new o(n, e.h);
		}
		function ae(e, t) {
			var n = t >> 5;
			t %= 32;
			for (var r = e.g.length - n, i = [], a = 0; a < r; a++) i[a] = 0 < t ? e.i(a + n) >>> t | e.i(a + n + 1) << 32 - t : e.i(a + n);
			return new o(i, e.h);
		}
		r.prototype.digest = r.prototype.v, r.prototype.reset = r.prototype.s, r.prototype.update = r.prototype.u, Wn = Hn.Md5 = r, o.prototype.add = o.prototype.add, o.prototype.multiply = o.prototype.j, o.prototype.modulo = o.prototype.A, o.prototype.compare = o.prototype.l, o.prototype.toNumber = o.prototype.m, o.prototype.toString = o.prototype.toString, o.prototype.getBits = o.prototype.i, o.fromNumber = l, o.fromString = u, Un = Hn.Integer = o;
	}).apply(Vn === void 0 ? typeof self < "u" ? self : typeof window < "u" ? window : {} : Vn);
})), Kn, qn, Jn, Yn, Xn, Zn, Qn, $n, er, tr, nr = t((() => {
	Kn = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, qn = {}, (function() {
		var e, t = typeof Object.defineProperties == "function" ? Object.defineProperty : function(e, t, n) {
			return e == Array.prototype || e == Object.prototype || (e[t] = n.value), e;
		};
		function n(e) {
			e = [
				typeof globalThis == "object" && globalThis,
				e,
				typeof window == "object" && window,
				typeof self == "object" && self,
				typeof Kn == "object" && Kn
			];
			for (var t = 0; t < e.length; ++t) {
				var n = e[t];
				if (n && n.Math == Math) return n;
			}
			throw Error("Cannot find global object");
		}
		var r = n(this);
		function i(e, n) {
			if (n) a: {
				var i = r;
				e = e.split(".");
				for (var a = 0; a < e.length - 1; a++) {
					var o = e[a];
					if (!(o in i)) break a;
					i = i[o];
				}
				e = e[e.length - 1], a = i[e], n = n(a), n != a && n != null && t(i, e, {
					configurable: !0,
					writable: !0,
					value: n
				});
			}
		}
		function a(e, t) {
			e instanceof String && (e += "");
			var n = 0, r = !1, i = { next: function() {
				if (!r && n < e.length) {
					var i = n++;
					return {
						value: t(i, e[i]),
						done: !1
					};
				}
				return r = !0, {
					done: !0,
					value: void 0
				};
			} };
			return i[Symbol.iterator] = function() {
				return i;
			}, i;
		}
		i("Array.prototype.values", function(e) {
			return e || function() {
				return a(this, function(e, t) {
					return t;
				});
			};
		});
		var o = o || {}, s = this || self;
		function c(e) {
			var t = typeof e;
			return t = t == "object" ? e ? Array.isArray(e) ? "array" : t : "null" : t, t == "array" || t == "object" && typeof e.length == "number";
		}
		function l(e) {
			var t = typeof e;
			return t == "object" && e != null || t == "function";
		}
		function u(e, t, n) {
			return e.call.apply(e.bind, arguments);
		}
		function d(e, t, n) {
			if (!e) throw Error();
			if (2 < arguments.length) {
				var r = Array.prototype.slice.call(arguments, 2);
				return function() {
					var n = Array.prototype.slice.call(arguments);
					return Array.prototype.unshift.apply(n, r), e.apply(t, n);
				};
			}
			return function() {
				return e.apply(t, arguments);
			};
		}
		function f(e, t, n) {
			return f = Function.prototype.bind && Function.prototype.bind.toString().indexOf("native code") != -1 ? u : d, f.apply(null, arguments);
		}
		function p(e, t) {
			var n = Array.prototype.slice.call(arguments, 1);
			return function() {
				var t = n.slice();
				return t.push.apply(t, arguments), e.apply(this, t);
			};
		}
		function m(e, t) {
			function n() {}
			n.prototype = t.prototype, e.aa = t.prototype, e.prototype = new n(), e.prototype.constructor = e, e.Qb = function(e, n, r) {
				for (var i = Array(arguments.length - 2), a = 2; a < arguments.length; a++) i[a - 2] = arguments[a];
				return t.prototype[n].apply(e, i);
			};
		}
		function h(e) {
			let t = e.length;
			if (0 < t) {
				let n = Array(t);
				for (let r = 0; r < t; r++) n[r] = e[r];
				return n;
			}
			return [];
		}
		function g(e, t) {
			for (let t = 1; t < arguments.length; t++) {
				let n = arguments[t];
				if (c(n)) {
					let t = e.length || 0, r = n.length || 0;
					e.length = t + r;
					for (let i = 0; i < r; i++) e[t + i] = n[i];
				} else e.push(n);
			}
		}
		class ee {
			constructor(e, t) {
				this.i = e, this.j = t, this.h = 0, this.g = null;
			}
			get() {
				let e;
				return 0 < this.h ? (this.h--, e = this.g, this.g = e.next, e.next = null) : e = this.i(), e;
			}
		}
		function te(e) {
			return /^[\s\xa0]*$/.test(e);
		}
		function ne() {
			var e = s.navigator;
			return (e &&= e.userAgent) ? e : "";
		}
		function re(e) {
			return re[" "](e), e;
		}
		re[" "] = function() {};
		var ie = ne().indexOf("Gecko") != -1 && !(ne().toLowerCase().indexOf("webkit") != -1 && ne().indexOf("Edge") == -1) && !(ne().indexOf("Trident") != -1 || ne().indexOf("MSIE") != -1) && ne().indexOf("Edge") == -1;
		function ae(e, t, n) {
			for (let r in e) t.call(n, e[r], r, e);
		}
		function oe(e, t) {
			for (let n in e) t.call(void 0, e[n], n, e);
		}
		function se(e) {
			let t = {};
			for (let n in e) t[n] = e[n];
			return t;
		}
		let ce = "constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");
		function le(e, t) {
			let n, r;
			for (let t = 1; t < arguments.length; t++) {
				for (n in r = arguments[t], r) e[n] = r[n];
				for (let t = 0; t < ce.length; t++) n = ce[t], Object.prototype.hasOwnProperty.call(r, n) && (e[n] = r[n]);
			}
		}
		function ue(e) {
			var t = 1;
			e = e.split(":");
			let n = [];
			for (; 0 < t && e.length;) n.push(e.shift()), t--;
			return e.length && n.push(e.join(":")), n;
		}
		function de(e) {
			s.setTimeout(() => {
				throw e;
			}, 0);
		}
		function fe() {
			var e = _;
			let t = null;
			return e.g && (t = e.g, e.g = e.g.next, e.g || (e.h = null), t.next = null), t;
		}
		class pe {
			constructor() {
				this.h = this.g = null;
			}
			add(e, t) {
				let n = me.get();
				n.set(e, t), this.h ? this.h.next = n : this.g = n, this.h = n;
			}
		}
		var me = new ee(() => new he(), (e) => e.reset());
		class he {
			constructor() {
				this.next = this.g = this.h = null;
			}
			set(e, t) {
				this.h = e, this.g = t, this.next = null;
			}
			reset() {
				this.next = this.g = this.h = null;
			}
		}
		let ge, _e = !1, _ = new pe(), ve = () => {
			let e = s.Promise.resolve(void 0);
			ge = () => {
				e.then(ye);
			};
		};
		var ye = () => {
			for (var e; e = fe();) {
				try {
					e.h.call(e.g);
				} catch (e) {
					de(e);
				}
				var t = me;
				t.j(e), 100 > t.h && (t.h++, e.next = t.g, t.g = e);
			}
			_e = !1;
		};
		function be() {
			this.s = this.s, this.C = this.C;
		}
		be.prototype.s = !1, be.prototype.ma = function() {
			this.s || (this.s = !0, this.N());
		}, be.prototype.N = function() {
			if (this.C) for (; this.C.length;) this.C.shift()();
		};
		function xe(e, t) {
			this.type = e, this.g = this.target = t, this.defaultPrevented = !1;
		}
		xe.prototype.h = function() {
			this.defaultPrevented = !0;
		};
		var Se = function() {
			if (!s.addEventListener || !Object.defineProperty) return !1;
			var e = !1, t = Object.defineProperty({}, "passive", { get: function() {
				e = !0;
			} });
			try {
				let e = () => {};
				s.addEventListener("test", e, t), s.removeEventListener("test", e, t);
			} catch {}
			return e;
		}();
		function Ce(e, t) {
			if (xe.call(this, e ? e.type : ""), this.relatedTarget = this.g = this.target = null, this.button = this.screenY = this.screenX = this.clientY = this.clientX = 0, this.key = "", this.metaKey = this.shiftKey = this.altKey = this.ctrlKey = !1, this.state = null, this.pointerId = 0, this.pointerType = "", this.i = null, e) {
				var n = this.type = e.type, r = e.changedTouches && e.changedTouches.length ? e.changedTouches[0] : null;
				if (this.target = e.target || e.srcElement, this.g = t, t = e.relatedTarget) {
					if (ie) {
						a: {
							try {
								re(t.nodeName);
								var i = !0;
								break a;
							} catch {}
							i = !1;
						}
						i || (t = null);
					}
				} else n == "mouseover" ? t = e.fromElement : n == "mouseout" && (t = e.toElement);
				this.relatedTarget = t, r ? (this.clientX = r.clientX === void 0 ? r.pageX : r.clientX, this.clientY = r.clientY === void 0 ? r.pageY : r.clientY, this.screenX = r.screenX || 0, this.screenY = r.screenY || 0) : (this.clientX = e.clientX === void 0 ? e.pageX : e.clientX, this.clientY = e.clientY === void 0 ? e.pageY : e.clientY, this.screenX = e.screenX || 0, this.screenY = e.screenY || 0), this.button = e.button, this.key = e.key || "", this.ctrlKey = e.ctrlKey, this.altKey = e.altKey, this.shiftKey = e.shiftKey, this.metaKey = e.metaKey, this.pointerId = e.pointerId || 0, this.pointerType = typeof e.pointerType == "string" ? e.pointerType : we[e.pointerType] || "", this.state = e.state, this.i = e, e.defaultPrevented && Ce.aa.h.call(this);
			}
		}
		m(Ce, xe);
		var we = {
			2: "touch",
			3: "pen",
			4: "mouse"
		};
		Ce.prototype.h = function() {
			Ce.aa.h.call(this);
			var e = this.i;
			e.preventDefault ? e.preventDefault() : e.returnValue = !1;
		};
		var Te = "closure_listenable_" + (1e6 * Math.random() | 0), Ee = 0;
		function De(e, t, n, r, i) {
			this.listener = e, this.proxy = null, this.src = t, this.type = n, this.capture = !!r, this.ha = i, this.key = ++Ee, this.da = this.fa = !1;
		}
		function Oe(e) {
			e.da = !0, e.listener = null, e.proxy = null, e.src = null, e.ha = null;
		}
		function ke(e) {
			this.src = e, this.g = {}, this.h = 0;
		}
		ke.prototype.add = function(e, t, n, r, i) {
			var a = e.toString();
			e = this.g[a], e || (e = this.g[a] = [], this.h++);
			var o = je(e, t, r, i);
			return -1 < o ? (t = e[o], n || (t.fa = !1)) : (t = new De(t, this.src, a, !!r, i), t.fa = n, e.push(t)), t;
		};
		function Ae(e, t) {
			var n = t.type;
			if (n in e.g) {
				var r = e.g[n], i = Array.prototype.indexOf.call(r, t, void 0), a;
				(a = 0 <= i) && Array.prototype.splice.call(r, i, 1), a && (Oe(t), e.g[n].length == 0 && (delete e.g[n], e.h--));
			}
		}
		function je(e, t, n, r) {
			for (var i = 0; i < e.length; ++i) {
				var a = e[i];
				if (!a.da && a.listener == t && a.capture == !!n && a.ha == r) return i;
			}
			return -1;
		}
		var Me = "closure_lm_" + (1e6 * Math.random() | 0), Ne = {};
		function Pe(e, t, n, r, i) {
			if (r && r.once) return Le(e, t, n, r, i);
			if (Array.isArray(t)) {
				for (var a = 0; a < t.length; a++) Pe(e, t[a], n, r, i);
				return null;
			}
			return n = We(n), e && e[Te] ? e.K(t, n, l(r) ? !!r.capture : !!r, i) : Fe(e, t, n, !1, r, i);
		}
		function Fe(e, t, n, r, i, a) {
			if (!t) throw Error("Invalid event type");
			var o = l(i) ? !!i.capture : !!i, s = He(e);
			if (s || (e[Me] = s = new ke(e)), n = s.add(t, n, r, o, a), n.proxy) return n;
			if (r = Ie(), n.proxy = r, r.src = e, r.listener = n, e.addEventListener) Se || (i = o), i === void 0 && (i = !1), e.addEventListener(t.toString(), r, i);
			else if (e.attachEvent) e.attachEvent(Be(t.toString()), r);
			else if (e.addListener && e.removeListener) e.addListener(r);
			else throw Error("addEventListener and attachEvent are unavailable.");
			return n;
		}
		function Ie() {
			function e(n) {
				return t.call(e.src, e.listener, n);
			}
			let t = Ve;
			return e;
		}
		function Le(e, t, n, r, i) {
			if (Array.isArray(t)) {
				for (var a = 0; a < t.length; a++) Le(e, t[a], n, r, i);
				return null;
			}
			return n = We(n), e && e[Te] ? e.L(t, n, l(r) ? !!r.capture : !!r, i) : Fe(e, t, n, !0, r, i);
		}
		function Re(e, t, n, r, i) {
			if (Array.isArray(t)) for (var a = 0; a < t.length; a++) Re(e, t[a], n, r, i);
			else r = l(r) ? !!r.capture : !!r, n = We(n), e && e[Te] ? (e = e.i, t = String(t).toString(), t in e.g && (a = e.g[t], n = je(a, n, r, i), -1 < n && (Oe(a[n]), Array.prototype.splice.call(a, n, 1), a.length == 0 && (delete e.g[t], e.h--)))) : (e &&= He(e)) && (t = e.g[t.toString()], e = -1, t && (e = je(t, n, r, i)), (n = -1 < e ? t[e] : null) && ze(n));
		}
		function ze(e) {
			if (typeof e != "number" && e && !e.da) {
				var t = e.src;
				if (t && t[Te]) Ae(t.i, e);
				else {
					var n = e.type, r = e.proxy;
					t.removeEventListener ? t.removeEventListener(n, r, e.capture) : t.detachEvent ? t.detachEvent(Be(n), r) : t.addListener && t.removeListener && t.removeListener(r), (n = He(t)) ? (Ae(n, e), n.h == 0 && (n.src = null, t[Me] = null)) : Oe(e);
				}
			}
		}
		function Be(e) {
			return e in Ne ? Ne[e] : Ne[e] = "on" + e;
		}
		function Ve(e, t) {
			if (e.da) e = !0;
			else {
				t = new Ce(t, this);
				var n = e.listener, r = e.ha || e.src;
				e.fa && ze(e), e = n.call(r, t);
			}
			return e;
		}
		function He(e) {
			return e = e[Me], e instanceof ke ? e : null;
		}
		var Ue = "__closure_events_fn_" + (1e9 * Math.random() >>> 0);
		function We(e) {
			return typeof e == "function" ? e : (e[Ue] || (e[Ue] = function(t) {
				return e.handleEvent(t);
			}), e[Ue]);
		}
		function Ge() {
			be.call(this), this.i = new ke(this), this.M = this, this.F = null;
		}
		m(Ge, be), Ge.prototype[Te] = !0, Ge.prototype.removeEventListener = function(e, t, n, r) {
			Re(this, e, t, n, r);
		};
		function Ke(e, t) {
			var n, r = e.F;
			if (r) for (n = []; r; r = r.F) n.push(r);
			if (e = e.M, r = t.type || t, typeof t == "string") t = new xe(t, e);
			else if (t instanceof xe) t.target = t.target || e;
			else {
				var i = t;
				t = new xe(r, e), le(t, i);
			}
			if (i = !0, n) for (var a = n.length - 1; 0 <= a; a--) {
				var o = t.g = n[a];
				i = qe(o, r, !0, t) && i;
			}
			if (o = t.g = e, i = qe(o, r, !0, t) && i, i = qe(o, r, !1, t) && i, n) for (a = 0; a < n.length; a++) o = t.g = n[a], i = qe(o, r, !1, t) && i;
		}
		Ge.prototype.N = function() {
			if (Ge.aa.N.call(this), this.i) {
				var e = this.i, t;
				for (t in e.g) {
					for (var n = e.g[t], r = 0; r < n.length; r++) Oe(n[r]);
					delete e.g[t], e.h--;
				}
			}
			this.F = null;
		}, Ge.prototype.K = function(e, t, n, r) {
			return this.i.add(String(e), t, !1, n, r);
		}, Ge.prototype.L = function(e, t, n, r) {
			return this.i.add(String(e), t, !0, n, r);
		};
		function qe(e, t, n, r) {
			if (t = e.i.g[String(t)], !t) return !0;
			t = t.concat();
			for (var i = !0, a = 0; a < t.length; ++a) {
				var o = t[a];
				if (o && !o.da && o.capture == n) {
					var s = o.listener, c = o.ha || o.src;
					o.fa && Ae(e.i, o), i = !1 !== s.call(c, r) && i;
				}
			}
			return i && !r.defaultPrevented;
		}
		function Je(e, t, n) {
			if (typeof e == "function") n && (e = f(e, n));
			else if (e && typeof e.handleEvent == "function") e = f(e.handleEvent, e);
			else throw Error("Invalid listener argument");
			return 2147483647 < Number(t) ? -1 : s.setTimeout(e, t || 0);
		}
		function Ye(e) {
			e.g = Je(() => {
				e.g = null, e.i && (e.i = !1, Ye(e));
			}, e.l);
			let t = e.h;
			e.h = null, e.m.apply(null, t);
		}
		class Xe extends be {
			constructor(e, t) {
				super(), this.m = e, this.l = t, this.h = null, this.i = !1, this.g = null;
			}
			j(e) {
				this.h = arguments, this.g ? this.i = !0 : Ye(this);
			}
			N() {
				super.N(), this.g && (s.clearTimeout(this.g), this.g = null, this.i = !1, this.h = null);
			}
		}
		function Ze(e) {
			be.call(this), this.h = e, this.g = {};
		}
		m(Ze, be);
		var Qe = [];
		function $e(e) {
			ae(e.g, function(e, t) {
				this.g.hasOwnProperty(t) && ze(e);
			}, e), e.g = {};
		}
		Ze.prototype.N = function() {
			Ze.aa.N.call(this), $e(this);
		}, Ze.prototype.handleEvent = function() {
			throw Error("EventHandler.handleEvent not implemented");
		};
		var et = s.JSON.stringify, tt = s.JSON.parse, nt = class {
			stringify(e) {
				return s.JSON.stringify(e, void 0);
			}
			parse(e) {
				return s.JSON.parse(e, void 0);
			}
		};
		function rt() {}
		rt.prototype.h = null;
		function it(e) {
			return e.h ||= e.i();
		}
		function at() {}
		var ot = {
			OPEN: "a",
			kb: "b",
			Ja: "c",
			wb: "d"
		};
		function st() {
			xe.call(this, "d");
		}
		m(st, xe);
		function ct() {
			xe.call(this, "c");
		}
		m(ct, xe);
		var lt = {}, ut = null;
		function dt() {
			return ut ||= new Ge();
		}
		lt.La = "serverreachability";
		function ft(e) {
			xe.call(this, lt.La, e);
		}
		m(ft, xe);
		function pt(e) {
			let t = dt();
			Ke(t, new ft(t));
		}
		lt.STAT_EVENT = "statevent";
		function mt(e, t) {
			xe.call(this, lt.STAT_EVENT, e), this.stat = t;
		}
		m(mt, xe);
		function v(e) {
			let t = dt();
			Ke(t, new mt(t, e));
		}
		lt.Ma = "timingevent";
		function ht(e, t) {
			xe.call(this, lt.Ma, e), this.size = t;
		}
		m(ht, xe);
		function gt(e, t) {
			if (typeof e != "function") throw Error("Fn must not be null and must be a function");
			return s.setTimeout(function() {
				e();
			}, t);
		}
		function _t() {
			this.g = !0;
		}
		_t.prototype.xa = function() {
			this.g = !1;
		};
		function vt(e, t, n, r, i, a) {
			e.info(function() {
				if (e.g) if (a) for (var o = "", s = a.split("&"), c = 0; c < s.length; c++) {
					var l = s[c].split("=");
					if (1 < l.length) {
						var u = l[0];
						l = l[1];
						var d = u.split("_");
						o = 2 <= d.length && d[1] == "type" ? o + (u + "=" + l + "&") : o + (u + "=redacted&");
					}
				}
				else o = null;
				else o = a;
				return "XMLHTTP REQ (" + r + ") [attempt " + i + "]: " + t + "\n" + n + "\n" + o;
			});
		}
		function yt(e, t, n, r, i, a, o) {
			e.info(function() {
				return "XMLHTTP RESP (" + r + ") [ attempt " + i + "]: " + t + "\n" + n + "\n" + a + " " + o;
			});
		}
		function bt(e, t, n, r) {
			e.info(function() {
				return "XMLHTTP TEXT (" + t + "): " + St(e, n) + (r ? " " + r : "");
			});
		}
		function xt(e, t) {
			e.info(function() {
				return "TIMEOUT: " + t;
			});
		}
		_t.prototype.info = function() {};
		function St(e, t) {
			if (!e.g) return t;
			if (!t) return null;
			try {
				var n = JSON.parse(t);
				if (n) {
					for (e = 0; e < n.length; e++) if (Array.isArray(n[e])) {
						var r = n[e];
						if (!(2 > r.length)) {
							var i = r[1];
							if (Array.isArray(i) && !(1 > i.length)) {
								var a = i[0];
								if (a != "noop" && a != "stop" && a != "close") for (var o = 1; o < i.length; o++) i[o] = "";
							}
						}
					}
				}
				return et(n);
			} catch {
				return t;
			}
		}
		var Ct = {
			NO_ERROR: 0,
			gb: 1,
			tb: 2,
			sb: 3,
			nb: 4,
			rb: 5,
			ub: 6,
			Ia: 7,
			TIMEOUT: 8,
			xb: 9
		}, wt = {
			lb: "complete",
			Hb: "success",
			Ja: "error",
			Ia: "abort",
			zb: "ready",
			Ab: "readystatechange",
			TIMEOUT: "timeout",
			vb: "incrementaldata",
			yb: "progress",
			ob: "downloadprogress",
			Pb: "uploadprogress"
		}, Tt;
		function Et() {}
		m(Et, rt), Et.prototype.g = function() {
			return new XMLHttpRequest();
		}, Et.prototype.i = function() {
			return {};
		}, Tt = new Et();
		function Dt(e, t, n, r) {
			this.j = e, this.i = t, this.l = n, this.R = r || 1, this.U = new Ze(this), this.I = 45e3, this.H = null, this.o = !1, this.m = this.A = this.v = this.L = this.F = this.S = this.B = null, this.D = [], this.g = null, this.C = 0, this.s = this.u = null, this.X = -1, this.J = !1, this.O = 0, this.M = null, this.W = this.K = this.T = this.P = !1, this.h = new Ot();
		}
		function Ot() {
			this.i = null, this.g = "", this.h = !1;
		}
		var kt = {}, At = {};
		function jt(e, t, n) {
			e.L = 1, e.v = on(tn(t)), e.m = n, e.P = !0, Mt(e, null);
		}
		function Mt(e, t) {
			e.F = Date.now(), Ft(e), e.A = tn(e.v);
			var n = e.A, r = e.R;
			Array.isArray(r) || (r = [String(r)]), yn(n.i, "t", r), e.C = 0, n = e.j.J, e.h = new Ot(), e.g = pr(e.j, n ? t : null, !e.m), 0 < e.O && (e.M = new Xe(f(e.Y, e, e.g), e.O)), t = e.U, n = e.g, r = e.ca;
			var i = "readystatechange";
			Array.isArray(i) || (i && (Qe[0] = i.toString()), i = Qe);
			for (var a = 0; a < i.length; a++) {
				var o = Pe(n, i[a], r || t.handleEvent, !1, t.h || t);
				if (!o) break;
				t.g[o.key] = o;
			}
			t = e.H ? se(e.H) : {}, e.m ? (e.u ||= "POST", t["Content-Type"] = "application/x-www-form-urlencoded", e.g.ea(e.A, e.u, e.m, t)) : (e.u = "GET", e.g.ea(e.A, e.u, null, t)), pt(), vt(e.i, e.u, e.A, e.l, e.R, e.m);
		}
		Dt.prototype.ca = function(e) {
			e = e.target;
			let t = this.M;
			t && Bn(e) == 3 ? t.j() : this.Y(e);
		}, Dt.prototype.Y = function(e) {
			try {
				if (e == this.g) a: {
					let f = Bn(this.g);
					var t = this.g.Ba();
					let p = this.g.Z();
					if (!(3 > f) && (f != 3 || this.g && (this.h.h || this.g.oa() || Vn(this.g)))) {
						this.J || f != 4 || t == 7 || pt(t == 8 || 0 >= p ? 3 : 2), Lt(this);
						var n = this.g.Z();
						this.X = n;
						b: if (Nt(this)) {
							var r = Vn(this.g);
							e = "";
							var i = r.length, a = Bn(this.g) == 4;
							if (!this.h.i) {
								if (typeof TextDecoder > "u") {
									zt(this), Rt(this);
									var o = "";
									break b;
								}
								this.h.i = new s.TextDecoder();
							}
							for (t = 0; t < i; t++) this.h.h = !0, e += this.h.i.decode(r[t], { stream: !(a && t == i - 1) });
							r.length = 0, this.h.g += e, this.C = 0, o = this.h.g;
						} else o = this.g.oa();
						if (this.o = n == 200, yt(this.i, this.u, this.A, this.l, this.R, f, n), this.o) {
							if (this.T && !this.K) {
								b: {
									if (this.g) {
										var c, l = this.g;
										if ((c = l.g ? l.g.getResponseHeader("X-HTTP-Initial-Response") : null) && !te(c)) {
											var u = c;
											break b;
										}
									}
									u = null;
								}
								if (n = u) bt(this.i, this.l, n, "Initial handshake response via X-HTTP-Initial-Response"), this.K = !0, Bt(this, n);
								else {
									this.o = !1, this.s = 3, v(12), zt(this), Rt(this);
									break a;
								}
							}
							if (this.P) {
								n = !0;
								let e;
								for (; !this.J && this.C < o.length;) if (e = Pt(this, o), e == At) {
									f == 4 && (this.s = 4, v(14), n = !1), bt(this.i, this.l, null, "[Incomplete Response]");
									break;
								} else if (e == kt) {
									this.s = 4, v(15), bt(this.i, this.l, o, "[Invalid Chunk]"), n = !1;
									break;
								} else bt(this.i, this.l, e, null), Bt(this, e);
								if (Nt(this) && this.C != 0 && (this.h.g = this.h.g.slice(this.C), this.C = 0), f != 4 || o.length != 0 || this.h.h || (this.s = 1, v(16), n = !1), this.o = this.o && n, !n) bt(this.i, this.l, o, "[Invalid Chunked Response]"), zt(this), Rt(this);
								else if (0 < o.length && !this.W) {
									this.W = !0;
									var d = this.j;
									d.g == this && d.ba && !d.M && (d.j.info("Great, no buffering proxy detected. Bytes received: " + o.length), sr(d), d.M = !0, v(11));
								}
							} else bt(this.i, this.l, o, null), Bt(this, o);
							f == 4 && zt(this), this.o && !this.J && (f == 4 ? D(this.j, this) : (this.o = !1, Ft(this)));
						} else Hn(this.g), n == 400 && 0 < o.indexOf("Unknown SID") ? (this.s = 3, v(12)) : (this.s = 0, v(13)), zt(this), Rt(this);
					}
				}
			} catch {}
		};
		function Nt(e) {
			return e.g ? e.u == "GET" && e.L != 2 && e.j.Ca : !1;
		}
		function Pt(e, t) {
			var n = e.C, r = t.indexOf("\n", n);
			return r == -1 ? At : (n = Number(t.substring(n, r)), isNaN(n) ? kt : (r += 1, r + n > t.length ? At : (t = t.slice(r, r + n), e.C = r + n, t)));
		}
		Dt.prototype.cancel = function() {
			this.J = !0, zt(this);
		};
		function Ft(e) {
			e.S = Date.now() + e.I, It(e, e.I);
		}
		function It(e, t) {
			if (e.B != null) throw Error("WatchDog timer not null");
			e.B = gt(f(e.ba, e), t);
		}
		function Lt(e) {
			e.B &&= (s.clearTimeout(e.B), null);
		}
		Dt.prototype.ba = function() {
			this.B = null;
			let e = Date.now();
			0 <= e - this.S ? (xt(this.i, this.A), this.L != 2 && (pt(), v(17)), zt(this), this.s = 2, Rt(this)) : It(this, this.S - e);
		};
		function Rt(e) {
			e.j.G == 0 || e.J || D(e.j, e);
		}
		function zt(e) {
			Lt(e);
			var t = e.M;
			t && typeof t.ma == "function" && t.ma(), e.M = null, $e(e.U), e.g && (t = e.g, e.g = null, t.abort(), t.ma());
		}
		function Bt(e, t) {
			try {
				var n = e.j;
				if (n.G != 0 && (n.g == e || Gt(n.h, e))) {
					if (!e.K && Gt(n.h, e) && n.G == 3) {
						try {
							var r = n.Da.g.parse(t);
						} catch {
							r = null;
						}
						if (Array.isArray(r) && r.length == 3) {
							var i = r;
							if (i[0] == 0) {
								a: if (!n.u) {
									if (n.g) if (n.g.F + 3e3 < e.F) cr(n), nr(n);
									else break a;
									T(n), v(18);
								}
							} else n.za = i[1], 0 < n.za - n.T && 37500 > i[2] && n.F && n.v == 0 && !n.C && (n.C = gt(f(n.Za, n), 6e3));
							if (1 >= Wt(n.h) && n.ca) {
								try {
									n.ca();
								} catch {}
								n.ca = void 0;
							}
						} else ur(n, 11);
					} else if ((e.K || n.g == e) && cr(n), !te(t)) for (i = n.Da.g.parse(t), t = 0; t < i.length; t++) {
						let l = i[t];
						if (n.T = l[0], l = l[1], n.G == 2) if (l[0] == "c") {
							n.K = l[1], n.ia = l[2];
							let t = l[3];
							t != null && (n.la = t, n.j.info("VER=" + n.la));
							let i = l[4];
							i != null && (n.Aa = i, n.j.info("SVER=" + n.Aa));
							let u = l[5];
							u != null && typeof u == "number" && 0 < u && (r = 1.5 * u, n.L = r, n.j.info("backChannelRequestTimeoutMs_=" + r)), r = n;
							let d = e.g;
							if (d) {
								let e = d.g ? d.g.getResponseHeader("X-Client-Wire-Protocol") : null;
								if (e) {
									var a = r.h;
									a.g || e.indexOf("spdy") == -1 && e.indexOf("quic") == -1 && e.indexOf("h2") == -1 || (a.j = a.l, a.g = /* @__PURE__ */ new Set(), a.h &&= (Kt(a, a.h), null));
								}
								if (r.D) {
									let e = d.g ? d.g.getResponseHeader("X-HTTP-Session-Id") : null;
									e && (r.ya = e, y(r.I, r.D, e));
								}
							}
							n.G = 3, n.l && n.l.ua(), n.ba && (n.R = Date.now() - e.F, n.j.info("Handshake RTT: " + n.R + "ms")), r = n;
							var o = e;
							if (r.qa = fr(r, r.J ? r.ia : null, r.W), o.K) {
								qt(r.h, o);
								var s = o, c = r.L;
								c && (s.I = c), s.B && (Lt(s), Ft(s)), r.g = o;
							} else w(r);
							0 < n.i.length && ir(n);
						} else l[0] != "stop" && l[0] != "close" || ur(n, 7);
						else n.G == 3 && (l[0] == "stop" || l[0] == "close" ? l[0] == "stop" ? ur(n, 7) : Gn(n) : l[0] != "noop" && n.l && n.l.ta(l), n.v = 0);
					}
				}
				pt(4);
			} catch {}
		}
		var Vt = class {
			constructor(e, t) {
				this.g = e, this.map = t;
			}
		};
		function Ht(e) {
			this.l = e || 10, s.PerformanceNavigationTiming ? (e = s.performance.getEntriesByType("navigation"), e = 0 < e.length && (e[0].nextHopProtocol == "hq" || e[0].nextHopProtocol == "h2")) : e = !!(s.chrome && s.chrome.loadTimes && s.chrome.loadTimes() && s.chrome.loadTimes().wasFetchedViaSpdy), this.j = e ? this.l : 1, this.g = null, 1 < this.j && (this.g = /* @__PURE__ */ new Set()), this.h = null, this.i = [];
		}
		function Ut(e) {
			return e.h ? !0 : e.g ? e.g.size >= e.j : !1;
		}
		function Wt(e) {
			return e.h ? 1 : e.g ? e.g.size : 0;
		}
		function Gt(e, t) {
			return e.h ? e.h == t : e.g ? e.g.has(t) : !1;
		}
		function Kt(e, t) {
			e.g ? e.g.add(t) : e.h = t;
		}
		function qt(e, t) {
			e.h && e.h == t ? e.h = null : e.g && e.g.has(t) && e.g.delete(t);
		}
		Ht.prototype.cancel = function() {
			if (this.i = Jt(this), this.h) this.h.cancel(), this.h = null;
			else if (this.g && this.g.size !== 0) {
				for (let e of this.g.values()) e.cancel();
				this.g.clear();
			}
		};
		function Jt(e) {
			if (e.h != null) return e.i.concat(e.h.D);
			if (e.g != null && e.g.size !== 0) {
				let t = e.i;
				for (let n of e.g.values()) t = t.concat(n.D);
				return t;
			}
			return h(e.i);
		}
		function Yt(e) {
			if (e.V && typeof e.V == "function") return e.V();
			if (typeof Map < "u" && e instanceof Map || typeof Set < "u" && e instanceof Set) return Array.from(e.values());
			if (typeof e == "string") return e.split("");
			if (c(e)) {
				for (var t = [], n = e.length, r = 0; r < n; r++) t.push(e[r]);
				return t;
			}
			for (r in t = [], n = 0, e) t[n++] = e[r];
			return t;
		}
		function Xt(e) {
			if (e.na && typeof e.na == "function") return e.na();
			if (!e.V || typeof e.V != "function") {
				if (typeof Map < "u" && e instanceof Map) return Array.from(e.keys());
				if (!(typeof Set < "u" && e instanceof Set)) {
					if (c(e) || typeof e == "string") {
						var t = [];
						e = e.length;
						for (var n = 0; n < e; n++) t.push(n);
						return t;
					}
					t = [], n = 0;
					for (let r in e) t[n++] = r;
					return t;
				}
			}
		}
		function Zt(e, t) {
			if (e.forEach && typeof e.forEach == "function") e.forEach(t, void 0);
			else if (c(e) || typeof e == "string") Array.prototype.forEach.call(e, t, void 0);
			else for (var n = Xt(e), r = Yt(e), i = r.length, a = 0; a < i; a++) t.call(void 0, r[a], n && n[a], e);
		}
		var Qt = RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");
		function $t(e, t) {
			if (e) {
				e = e.split("&");
				for (var n = 0; n < e.length; n++) {
					var r = e[n].indexOf("="), i = null;
					if (0 <= r) {
						var a = e[n].substring(0, r);
						i = e[n].substring(r + 1);
					} else a = e[n];
					t(a, i ? decodeURIComponent(i.replace(/\+/g, " ")) : "");
				}
			}
		}
		function en(e) {
			if (this.g = this.o = this.j = "", this.s = null, this.m = this.l = "", this.h = !1, e instanceof en) {
				this.h = e.h, nn(this, e.j), this.o = e.o, this.g = e.g, rn(this, e.s), this.l = e.l;
				var t = e.i, n = new hn();
				n.i = t.i, t.g && (n.g = new Map(t.g), n.h = t.h), an(this, n), this.m = e.m;
			} else e && (t = String(e).match(Qt)) ? (this.h = !1, nn(this, t[1] || "", !0), this.o = sn(t[2] || ""), this.g = sn(t[3] || "", !0), rn(this, t[4]), this.l = sn(t[5] || "", !0), an(this, t[6] || "", !0), this.m = sn(t[7] || "")) : (this.h = !1, this.i = new hn(null, this.h));
		}
		en.prototype.toString = function() {
			var e = [], t = this.j;
			t && e.push(cn(t, un, !0), ":");
			var n = this.g;
			return (n || t == "file") && (e.push("//"), (t = this.o) && e.push(cn(t, un, !0), "@"), e.push(encodeURIComponent(String(n)).replace(/%25([0-9a-fA-F]{2})/g, "%$1")), n = this.s, n != null && e.push(":", String(n))), (n = this.l) && (this.g && n.charAt(0) != "/" && e.push("/"), e.push(cn(n, n.charAt(0) == "/" ? fn : dn, !0))), (n = this.i.toString()) && e.push("?", n), (n = this.m) && e.push("#", cn(n, mn)), e.join("");
		};
		function tn(e) {
			return new en(e);
		}
		function nn(e, t, n) {
			e.j = n ? sn(t, !0) : t, e.j &&= e.j.replace(/:$/, "");
		}
		function rn(e, t) {
			if (t) {
				if (t = Number(t), isNaN(t) || 0 > t) throw Error("Bad port number " + t);
				e.s = t;
			} else e.s = null;
		}
		function an(e, t, n) {
			t instanceof hn ? (e.i = t, xn(e.i, e.h)) : (n || (t = cn(t, pn)), e.i = new hn(t, e.h));
		}
		function y(e, t, n) {
			e.i.set(t, n);
		}
		function on(e) {
			return y(e, "zx", Math.floor(2147483648 * Math.random()).toString(36) + Math.abs(Math.floor(2147483648 * Math.random()) ^ Date.now()).toString(36)), e;
		}
		function sn(e, t) {
			return e ? t ? decodeURI(e.replace(/%25/g, "%2525")) : decodeURIComponent(e) : "";
		}
		function cn(e, t, n) {
			return typeof e == "string" ? (e = encodeURI(e).replace(t, ln), n && (e = e.replace(/%25([0-9a-fA-F]{2})/g, "%$1")), e) : null;
		}
		function ln(e) {
			return e = e.charCodeAt(0), "%" + (e >> 4 & 15).toString(16) + (e & 15).toString(16);
		}
		var un = /[#\/\?@]/g, dn = /[#\?:]/g, fn = /[#\?]/g, pn = /[#\?@]/g, mn = /#/g;
		function hn(e, t) {
			this.h = this.g = null, this.i = e || null, this.j = !!t;
		}
		function gn(e) {
			e.g || (e.g = /* @__PURE__ */ new Map(), e.h = 0, e.i && $t(e.i, function(t, n) {
				e.add(decodeURIComponent(t.replace(/\+/g, " ")), n);
			}));
		}
		e = hn.prototype, e.add = function(e, t) {
			gn(this), this.i = null, e = bn(this, e);
			var n = this.g.get(e);
			return n || this.g.set(e, n = []), n.push(t), this.h += 1, this;
		};
		function _n(e, t) {
			gn(e), t = bn(e, t), e.g.has(t) && (e.i = null, e.h -= e.g.get(t).length, e.g.delete(t));
		}
		function vn(e, t) {
			return gn(e), t = bn(e, t), e.g.has(t);
		}
		e.forEach = function(e, t) {
			gn(this), this.g.forEach(function(n, r) {
				n.forEach(function(n) {
					e.call(t, n, r, this);
				}, this);
			}, this);
		}, e.na = function() {
			gn(this);
			let e = Array.from(this.g.values()), t = Array.from(this.g.keys()), n = [];
			for (let r = 0; r < t.length; r++) {
				let i = e[r];
				for (let e = 0; e < i.length; e++) n.push(t[r]);
			}
			return n;
		}, e.V = function(e) {
			gn(this);
			let t = [];
			if (typeof e == "string") vn(this, e) && (t = t.concat(this.g.get(bn(this, e))));
			else {
				e = Array.from(this.g.values());
				for (let n = 0; n < e.length; n++) t = t.concat(e[n]);
			}
			return t;
		}, e.set = function(e, t) {
			return gn(this), this.i = null, e = bn(this, e), vn(this, e) && (this.h -= this.g.get(e).length), this.g.set(e, [t]), this.h += 1, this;
		}, e.get = function(e, t) {
			return e ? (e = this.V(e), 0 < e.length ? String(e[0]) : t) : t;
		};
		function yn(e, t, n) {
			_n(e, t), 0 < n.length && (e.i = null, e.g.set(bn(e, t), h(n)), e.h += n.length);
		}
		e.toString = function() {
			if (this.i) return this.i;
			if (!this.g) return "";
			let e = [], t = Array.from(this.g.keys());
			for (var n = 0; n < t.length; n++) {
				var r = t[n];
				let a = encodeURIComponent(String(r)), o = this.V(r);
				for (r = 0; r < o.length; r++) {
					var i = a;
					o[r] !== "" && (i += "=" + encodeURIComponent(String(o[r]))), e.push(i);
				}
			}
			return this.i = e.join("&");
		};
		function bn(e, t) {
			return t = String(t), e.j && (t = t.toLowerCase()), t;
		}
		function xn(e, t) {
			t && !e.j && (gn(e), e.i = null, e.g.forEach(function(e, t) {
				var n = t.toLowerCase();
				t != n && (_n(this, t), yn(this, n, e));
			}, e)), e.j = t;
		}
		function Sn(e, t) {
			let n = new _t();
			if (s.Image) {
				let r = new Image();
				r.onload = p(wn, n, "TestLoadImage: loaded", !0, t, r), r.onerror = p(wn, n, "TestLoadImage: error", !1, t, r), r.onabort = p(wn, n, "TestLoadImage: abort", !1, t, r), r.ontimeout = p(wn, n, "TestLoadImage: timeout", !1, t, r), s.setTimeout(function() {
					r.ontimeout && r.ontimeout();
				}, 1e4), r.src = e;
			} else t(!1);
		}
		function Cn(e, t) {
			let n = new _t(), r = new AbortController(), i = setTimeout(() => {
				r.abort(), wn(n, "TestPingServer: timeout", !1, t);
			}, 1e4);
			fetch(e, { signal: r.signal }).then((e) => {
				clearTimeout(i), e.ok ? wn(n, "TestPingServer: ok", !0, t) : wn(n, "TestPingServer: server error", !1, t);
			}).catch(() => {
				clearTimeout(i), wn(n, "TestPingServer: error", !1, t);
			});
		}
		function wn(e, t, n, r, i) {
			try {
				i && (i.onload = null, i.onerror = null, i.onabort = null, i.ontimeout = null), r(n);
			} catch {}
		}
		function Tn() {
			this.g = new nt();
		}
		function En(e, t, n) {
			let r = n || "";
			try {
				Zt(e, function(e, n) {
					let i = e;
					l(e) && (i = et(e)), t.push(r + n + "=" + encodeURIComponent(i));
				});
			} catch (e) {
				throw t.push(r + "type=_badmap"), e;
			}
		}
		function Dn(e) {
			this.l = e.Ub || null, this.j = e.eb || !1;
		}
		m(Dn, rt), Dn.prototype.g = function() {
			return new On(this.l, this.j);
		}, Dn.prototype.i = function(e) {
			return function() {
				return e;
			};
		}({});
		function On(e, t) {
			Ge.call(this), this.D = e, this.o = t, this.m = void 0, this.status = this.readyState = 0, this.responseType = this.responseText = this.response = this.statusText = "", this.onreadystatechange = null, this.u = new Headers(), this.h = null, this.B = "GET", this.A = "", this.g = !1, this.v = this.j = this.l = null;
		}
		m(On, Ge), e = On.prototype, e.open = function(e, t) {
			if (this.readyState != 0) throw this.abort(), Error("Error reopening a connection");
			this.B = e, this.A = t, this.readyState = 1, jn(this);
		}, e.send = function(e) {
			if (this.readyState != 1) throw this.abort(), Error("need to call open() first. ");
			this.g = !0;
			let t = {
				headers: this.u,
				method: this.B,
				credentials: this.m,
				cache: void 0
			};
			e && (t.body = e), (this.D || s).fetch(new Request(this.A, t)).then(this.Sa.bind(this), this.ga.bind(this));
		}, e.abort = function() {
			this.response = this.responseText = "", this.u = new Headers(), this.status = 0, this.j && this.j.cancel("Request was aborted.").catch(() => {}), 1 <= this.readyState && this.g && this.readyState != 4 && (this.g = !1, An(this)), this.readyState = 0;
		}, e.Sa = function(e) {
			if (this.g && (this.l = e, this.h || (this.status = this.l.status, this.statusText = this.l.statusText, this.h = e.headers, this.readyState = 2, jn(this)), this.g && (this.readyState = 3, jn(this), this.g))) if (this.responseType === "arraybuffer") e.arrayBuffer().then(this.Qa.bind(this), this.ga.bind(this));
			else if (s.ReadableStream !== void 0 && "body" in e) {
				if (this.j = e.body.getReader(), this.o) {
					if (this.responseType) throw Error("responseType must be empty for \"streamBinaryChunks\" mode responses.");
					this.response = [];
				} else this.response = this.responseText = "", this.v = new TextDecoder();
				kn(this);
			} else e.text().then(this.Ra.bind(this), this.ga.bind(this));
		};
		function kn(e) {
			e.j.read().then(e.Pa.bind(e)).catch(e.ga.bind(e));
		}
		e.Pa = function(e) {
			if (this.g) {
				if (this.o && e.value) this.response.push(e.value);
				else if (!this.o) {
					var t = e.value ? e.value : /* @__PURE__ */ new Uint8Array();
					(t = this.v.decode(t, { stream: !e.done })) && (this.response = this.responseText += t);
				}
				e.done ? An(this) : jn(this), this.readyState == 3 && kn(this);
			}
		}, e.Ra = function(e) {
			this.g && (this.response = this.responseText = e, An(this));
		}, e.Qa = function(e) {
			this.g && (this.response = e, An(this));
		}, e.ga = function() {
			this.g && An(this);
		};
		function An(e) {
			e.readyState = 4, e.l = null, e.j = null, e.v = null, jn(e);
		}
		e.setRequestHeader = function(e, t) {
			this.u.append(e, t);
		}, e.getResponseHeader = function(e) {
			return this.h && this.h.get(e.toLowerCase()) || "";
		}, e.getAllResponseHeaders = function() {
			if (!this.h) return "";
			let e = [], t = this.h.entries();
			for (var n = t.next(); !n.done;) n = n.value, e.push(n[0] + ": " + n[1]), n = t.next();
			return e.join("\r\n");
		};
		function jn(e) {
			e.onreadystatechange && e.onreadystatechange.call(e);
		}
		Object.defineProperty(On.prototype, "withCredentials", {
			get: function() {
				return this.m === "include";
			},
			set: function(e) {
				this.m = e ? "include" : "same-origin";
			}
		});
		function Mn(e) {
			let t = "";
			return ae(e, function(e, n) {
				t += n, t += ":", t += e, t += "\r\n";
			}), t;
		}
		function Nn(e, t, n) {
			a: {
				for (r in n) {
					var r = !1;
					break a;
				}
				r = !0;
			}
			r || (n = Mn(n), typeof e == "string" || y(e, t, n));
		}
		function b(e) {
			Ge.call(this), this.headers = /* @__PURE__ */ new Map(), this.o = e || null, this.h = !1, this.v = this.g = null, this.D = "", this.m = 0, this.l = "", this.j = this.B = this.u = this.A = !1, this.I = null, this.H = "", this.J = !1;
		}
		m(b, Ge);
		var Pn = /^https?$/i, x = ["POST", "PUT"];
		e = b.prototype, e.Ha = function(e) {
			this.J = e;
		}, e.ea = function(e, t, n, r) {
			if (this.g) throw Error("[goog.net.XhrIo] Object is active with another request=" + this.D + "; newUri=" + e);
			t = t ? t.toUpperCase() : "GET", this.D = e, this.l = "", this.m = 0, this.A = !1, this.h = !0, this.g = this.o ? this.o.g() : Tt.g(), this.v = this.o ? it(this.o) : it(Tt), this.g.onreadystatechange = f(this.Ea, this);
			try {
				this.B = !0, this.g.open(t, String(e), !0), this.B = !1;
			} catch (e) {
				Fn(this, e);
				return;
			}
			if (e = n || "", n = new Map(this.headers), r) if (Object.getPrototypeOf(r) === Object.prototype) for (var i in r) n.set(i, r[i]);
			else if (typeof r.keys == "function" && typeof r.get == "function") for (let e of r.keys()) n.set(e, r.get(e));
			else throw Error("Unknown input type for opt_headers: " + String(r));
			r = Array.from(n.keys()).find((e) => e.toLowerCase() == "content-type"), i = s.FormData && e instanceof s.FormData, !(0 <= Array.prototype.indexOf.call(x, t, void 0)) || r || i || n.set("Content-Type", "application/x-www-form-urlencoded;charset=utf-8");
			for (let [e, t] of n) this.g.setRequestHeader(e, t);
			this.H && (this.g.responseType = this.H), "withCredentials" in this.g && this.g.withCredentials !== this.J && (this.g.withCredentials = this.J);
			try {
				zn(this), this.u = !0, this.g.send(e), this.u = !1;
			} catch (e) {
				Fn(this, e);
			}
		};
		function Fn(e, t) {
			e.h = !1, e.g && (e.j = !0, e.g.abort(), e.j = !1), e.l = t, e.m = 5, In(e), Rn(e);
		}
		function In(e) {
			e.A || (e.A = !0, Ke(e, "complete"), Ke(e, "error"));
		}
		e.abort = function(e) {
			this.g && this.h && (this.h = !1, this.j = !0, this.g.abort(), this.j = !1, this.m = e || 7, Ke(this, "complete"), Ke(this, "abort"), Rn(this));
		}, e.N = function() {
			this.g && (this.h && (this.h = !1, this.j = !0, this.g.abort(), this.j = !1), Rn(this, !0)), b.aa.N.call(this);
		}, e.Ea = function() {
			this.s || (this.B || this.u || this.j ? Ln(this) : this.bb());
		}, e.bb = function() {
			Ln(this);
		};
		function Ln(e) {
			if (e.h && o !== void 0 && (!e.v[1] || Bn(e) != 4 || e.Z() != 2)) {
				if (e.u && Bn(e) == 4) Je(e.Ea, 0, e);
				else if (Ke(e, "readystatechange"), Bn(e) == 4) {
					e.h = !1;
					try {
						let o = e.Z();
						a: switch (o) {
							case 200:
							case 201:
							case 202:
							case 204:
							case 206:
							case 304:
							case 1223:
								var t = !0;
								break a;
							default: t = !1;
						}
						var n;
						if (!(n = t)) {
							var r;
							if (r = o === 0) {
								var i = String(e.D).match(Qt)[1] || null;
								!i && s.self && s.self.location && (i = s.self.location.protocol.slice(0, -1)), r = !Pn.test(i ? i.toLowerCase() : "");
							}
							n = r;
						}
						if (n) Ke(e, "complete"), Ke(e, "success");
						else {
							e.m = 6;
							try {
								var a = 2 < Bn(e) ? e.g.statusText : "";
							} catch {
								a = "";
							}
							e.l = a + " [" + e.Z() + "]", In(e);
						}
					} finally {
						Rn(e);
					}
				}
			}
		}
		function Rn(e, t) {
			if (e.g) {
				zn(e);
				let n = e.g, r = e.v[0] ? () => {} : null;
				e.g = null, e.v = null, t || Ke(e, "ready");
				try {
					n.onreadystatechange = r;
				} catch {}
			}
		}
		function zn(e) {
			e.I &&= (s.clearTimeout(e.I), null);
		}
		e.isActive = function() {
			return !!this.g;
		};
		function Bn(e) {
			return e.g ? e.g.readyState : 0;
		}
		e.Z = function() {
			try {
				return 2 < Bn(this) ? this.g.status : -1;
			} catch {
				return -1;
			}
		}, e.oa = function() {
			try {
				return this.g ? this.g.responseText : "";
			} catch {
				return "";
			}
		}, e.Oa = function(e) {
			if (this.g) {
				var t = this.g.responseText;
				return e && t.indexOf(e) == 0 && (t = t.substring(e.length)), tt(t);
			}
		};
		function Vn(e) {
			try {
				if (!e.g) return null;
				if ("response" in e.g) return e.g.response;
				switch (e.H) {
					case "":
					case "text": return e.g.responseText;
					case "arraybuffer": if ("mozResponseArrayBuffer" in e.g) return e.g.mozResponseArrayBuffer;
				}
				return null;
			} catch {
				return null;
			}
		}
		function Hn(e) {
			let t = {};
			e = (e.g && 2 <= Bn(e) && e.g.getAllResponseHeaders() || "").split("\r\n");
			for (let r = 0; r < e.length; r++) {
				if (te(e[r])) continue;
				var n = ue(e[r]);
				let i = n[0];
				if (n = n[1], typeof n != "string") continue;
				n = n.trim();
				let a = t[i] || [];
				t[i] = a, a.push(n);
			}
			oe(t, function(e) {
				return e.join(", ");
			});
		}
		e.Ba = function() {
			return this.m;
		}, e.Ka = function() {
			return typeof this.l == "string" ? this.l : String(this.l);
		};
		function Un(e, t, n) {
			return n && n.internalChannelParams && n.internalChannelParams[e] || t;
		}
		function Wn(e) {
			this.Aa = 0, this.i = [], this.j = new _t(), this.ia = this.qa = this.I = this.W = this.g = this.ya = this.D = this.H = this.m = this.S = this.o = null, this.Ya = this.U = 0, this.Va = Un("failFast", !1, e), this.F = this.C = this.u = this.s = this.l = null, this.X = !0, this.za = this.T = -1, this.Y = this.v = this.B = 0, this.Ta = Un("baseRetryDelayMs", 5e3, e), this.cb = Un("retryDelaySeedMs", 1e4, e), this.Wa = Un("forwardChannelMaxRetries", 2, e), this.wa = Un("forwardChannelRequestTimeoutMs", 2e4, e), this.pa = e && e.xmlHttpFactory || void 0, this.Xa = e && e.Tb || void 0, this.Ca = e && e.useFetchStreams || !1, this.L = void 0, this.J = e && e.supportsCrossDomainXhr || !1, this.K = "", this.h = new Ht(e && e.concurrentRequestLimit), this.Da = new Tn(), this.P = e && e.fastHandshake || !1, this.O = e && e.encodeInitMessageHeaders || !1, this.P && this.O && (this.O = !1), this.Ua = e && e.Rb || !1, e && e.xa && this.j.xa(), e && e.forceLongPolling && (this.X = !1), this.ba = !this.P && this.X && e && e.detectBufferingProxy || !1, this.ja = void 0, e && e.longPollingTimeout && 0 < e.longPollingTimeout && (this.ja = e.longPollingTimeout), this.ca = void 0, this.R = 0, this.M = !1, this.ka = this.A = null;
		}
		e = Wn.prototype, e.la = 8, e.G = 1, e.connect = function(e, t, n, r) {
			v(0), this.W = e, this.H = t || {}, n && r !== void 0 && (this.H.OSID = n, this.H.OAID = r), this.F = this.X, this.I = fr(this, null, this.W), ir(this);
		};
		function Gn(e) {
			if (rr(e), e.G == 3) {
				var t = e.U++, n = tn(e.I);
				if (y(n, "SID", e.K), y(n, "RID", t), y(n, "TYPE", "terminate"), ar(e, n), t = new Dt(e, e.j, t), t.L = 2, t.v = on(tn(n)), n = !1, s.navigator && s.navigator.sendBeacon) try {
					n = s.navigator.sendBeacon(t.v.toString(), "");
				} catch {}
				!n && s.Image && (new Image().src = t.v, n = !0), n || (t.g = pr(t.j, null), t.g.ea(t.v)), t.F = Date.now(), Ft(t);
			}
			dr(e);
		}
		function nr(e) {
			e.g &&= (sr(e), e.g.cancel(), null);
		}
		function rr(e) {
			nr(e), e.u &&= (s.clearTimeout(e.u), null), cr(e), e.h.cancel(), e.s &&= (typeof e.s == "number" && s.clearTimeout(e.s), null);
		}
		function ir(e) {
			if (!Ut(e.h) && !e.s) {
				e.s = !0;
				var t = e.Ga;
				ge || ve(), _e ||= (ge(), !0), _.add(t, e), e.B = 0;
			}
		}
		function S(e, t) {
			return Wt(e.h) >= e.h.j - +!!e.s ? !1 : e.s ? (e.i = t.D.concat(e.i), !0) : e.G == 1 || e.G == 2 || e.B >= (e.Va ? 0 : e.Wa) ? !1 : (e.s = gt(f(e.Ga, e, t), lr(e, e.B)), e.B++, !0);
		}
		e.Ga = function(e) {
			if (this.s) if (this.s = null, this.G == 1) {
				if (!e) {
					this.U = Math.floor(1e5 * Math.random()), e = this.U++;
					let i = new Dt(this, this.j, e), a = this.o;
					if (this.S && (a ? (a = se(a), le(a, this.S)) : a = this.S), this.m !== null || this.O || (i.H = a, a = null), this.P) a: {
						for (var t = 0, n = 0; n < this.i.length; n++) {
							b: {
								var r = this.i[n];
								if ("__data__" in r.map && (r = r.map.__data__, typeof r == "string")) {
									r = r.length;
									break b;
								}
								r = void 0;
							}
							if (r === void 0) break;
							if (t += r, 4096 < t) {
								t = n;
								break a;
							}
							if (t === 4096 || n === this.i.length - 1) {
								t = n + 1;
								break a;
							}
						}
						t = 1e3;
					}
					else t = 1e3;
					t = or(this, i, t), n = tn(this.I), y(n, "RID", e), y(n, "CVER", 22), this.D && y(n, "X-HTTP-Session-Id", this.D), ar(this, n), a && (this.O ? t = "headers=" + encodeURIComponent(String(Mn(a))) + "&" + t : this.m && Nn(n, this.m, a)), Kt(this.h, i), this.Ua && y(n, "TYPE", "init"), this.P ? (y(n, "$req", t), y(n, "SID", "null"), i.T = !0, jt(i, n, null)) : jt(i, n, t), this.G = 2;
				}
			} else this.G == 3 && (e ? C(this, e) : this.i.length == 0 || Ut(this.h) || C(this));
		};
		function C(e, t) {
			var n = t ? t.l : e.U++;
			let r = tn(e.I);
			y(r, "SID", e.K), y(r, "RID", n), y(r, "AID", e.T), ar(e, r), e.m && e.o && Nn(r, e.m, e.o), n = new Dt(e, e.j, n, e.B + 1), e.m === null && (n.H = e.o), t && (e.i = t.D.concat(e.i)), t = or(e, n, 1e3), n.I = Math.round(.5 * e.wa) + Math.round(.5 * e.wa * Math.random()), Kt(e.h, n), jt(n, r, t);
		}
		function ar(e, t) {
			e.H && ae(e.H, function(e, n) {
				y(t, n, e);
			}), e.l && Zt({}, function(e, n) {
				y(t, n, e);
			});
		}
		function or(e, t, n) {
			n = Math.min(e.i.length, n);
			var r = e.l ? f(e.l.Na, e.l, e) : null;
			a: {
				var i = e.i;
				let t = -1;
				for (;;) {
					let e = ["count=" + n];
					t == -1 ? 0 < n ? (t = i[0].g, e.push("ofs=" + t)) : t = 0 : e.push("ofs=" + t);
					let a = !0;
					for (let o = 0; o < n; o++) {
						let n = i[o].g, s = i[o].map;
						if (n -= t, 0 > n) t = Math.max(0, i[o].g - 100), a = !1;
						else try {
							En(s, e, "req" + n + "_");
						} catch {
							r && r(s);
						}
					}
					if (a) {
						r = e.join("&");
						break a;
					}
				}
			}
			return e = e.i.splice(0, n), t.D = e, r;
		}
		function w(e) {
			if (!e.g && !e.u) {
				e.Y = 1;
				var t = e.Fa;
				ge || ve(), _e ||= (ge(), !0), _.add(t, e), e.v = 0;
			}
		}
		function T(e) {
			return e.g || e.u || 3 <= e.v ? !1 : (e.Y++, e.u = gt(f(e.Fa, e), lr(e, e.v)), e.v++, !0);
		}
		e.Fa = function() {
			if (this.u = null, E(this), this.ba && !(this.M || this.g == null || 0 >= this.R)) {
				var e = 2 * this.R;
				this.j.info("BP detection timer enabled: " + e), this.A = gt(f(this.ab, this), e);
			}
		}, e.ab = function() {
			this.A && (this.A = null, this.j.info("BP detection timeout reached."), this.j.info("Buffering proxy detected and switch to long-polling!"), this.F = !1, this.M = !0, v(10), nr(this), E(this));
		};
		function sr(e) {
			e.A != null && (s.clearTimeout(e.A), e.A = null);
		}
		function E(e) {
			e.g = new Dt(e, e.j, "rpc", e.Y), e.m === null && (e.g.H = e.o), e.g.O = 0;
			var t = tn(e.qa);
			y(t, "RID", "rpc"), y(t, "SID", e.K), y(t, "AID", e.T), y(t, "CI", e.F ? "0" : "1"), !e.F && e.ja && y(t, "TO", e.ja), y(t, "TYPE", "xmlhttp"), ar(e, t), e.m && e.o && Nn(t, e.m, e.o), e.L && (e.g.I = e.L);
			var n = e.g;
			e = e.ia, n.L = 1, n.v = on(tn(t)), n.m = null, n.P = !0, Mt(n, e);
		}
		e.Za = function() {
			this.C != null && (this.C = null, nr(this), T(this), v(19));
		};
		function cr(e) {
			e.C != null && (s.clearTimeout(e.C), e.C = null);
		}
		function D(e, t) {
			var n = null;
			if (e.g == t) {
				cr(e), sr(e), e.g = null;
				var r = 2;
			} else if (Gt(e.h, t)) n = t.D, qt(e.h, t), r = 1;
			else return;
			if (e.G != 0) {
				if (t.o) if (r == 1) {
					n = t.m ? t.m.length : 0, t = Date.now() - t.F;
					var i = e.B;
					r = dt(), Ke(r, new ht(r, n)), ir(e);
				} else w(e);
				else if (i = t.s, i == 3 || i == 0 && 0 < t.X || !(r == 1 && S(e, t) || r == 2 && T(e))) switch (n && 0 < n.length && (t = e.h, t.i = t.i.concat(n)), i) {
					case 1:
						ur(e, 5);
						break;
					case 4:
						ur(e, 10);
						break;
					case 3:
						ur(e, 6);
						break;
					default: ur(e, 2);
				}
			}
		}
		function lr(e, t) {
			let n = e.Ta + Math.floor(Math.random() * e.cb);
			return e.isActive() || (n *= 2), n * t;
		}
		function ur(e, t) {
			if (e.j.info("Error code " + t), t == 2) {
				var n = f(e.fb, e), r = e.Xa;
				let t = !r;
				r = new en(r || "//www.google.com/images/cleardot.gif"), s.location && s.location.protocol == "http" || nn(r, "https"), on(r), t ? Sn(r.toString(), n) : Cn(r.toString(), n);
			} else v(2);
			e.G = 0, e.l && e.l.sa(t), dr(e), rr(e);
		}
		e.fb = function(e) {
			e ? (this.j.info("Successfully pinged google.com"), v(2)) : (this.j.info("Failed to ping google.com"), v(1));
		};
		function dr(e) {
			if (e.G = 0, e.ka = [], e.l) {
				let t = Jt(e.h);
				(t.length != 0 || e.i.length != 0) && (g(e.ka, t), g(e.ka, e.i), e.h.i.length = 0, h(e.i), e.i.length = 0), e.l.ra();
			}
		}
		function fr(e, t, n) {
			var r = n instanceof en ? tn(n) : new en(n);
			if (r.g != "") t && (r.g = t + "." + r.g), rn(r, r.s);
			else {
				var i = s.location;
				r = i.protocol, t = t ? t + "." + i.hostname : i.hostname, i = +i.port;
				var a = new en(null);
				r && nn(a, r), t && (a.g = t), i && rn(a, i), n && (a.l = n), r = a;
			}
			return n = e.D, t = e.ya, n && t && y(r, n, t), y(r, "VER", e.la), ar(e, r), r;
		}
		function pr(e, t, n) {
			if (t && !e.J) throw Error("Can't create secondary domain capable XhrIo object.");
			return t = e.Ca && !e.pa ? new b(new Dn({ eb: n })) : new b(e.pa), t.Ha(e.J), t;
		}
		e.isActive = function() {
			return !!this.l && this.l.isActive(this);
		};
		function mr() {}
		e = mr.prototype, e.ua = function() {}, e.ta = function() {}, e.sa = function() {}, e.ra = function() {}, e.isActive = function() {
			return !0;
		}, e.Na = function() {};
		function hr() {}
		hr.prototype.g = function(e, t) {
			return new gr(e, t);
		};
		function gr(e, t) {
			Ge.call(this), this.g = new Wn(t), this.l = e, this.h = t && t.messageUrlParams || null, e = t && t.messageHeaders || null, t && t.clientProtocolHeaderRequired && (e ? e["X-Client-Protocol"] = "webchannel" : e = { "X-Client-Protocol": "webchannel" }), this.g.o = e, e = t && t.initMessageHeaders || null, t && t.messageContentType && (e ? e["X-WebChannel-Content-Type"] = t.messageContentType : e = { "X-WebChannel-Content-Type": t.messageContentType }), t && t.va && (e ? e["X-WebChannel-Client-Profile"] = t.va : e = { "X-WebChannel-Client-Profile": t.va }), this.g.S = e, (e = t && t.Sb) && !te(e) && (this.g.m = e), this.v = t && t.supportsCrossDomainXhr || !1, this.u = t && t.sendRawJson || !1, (t &&= t.httpSessionIdParam) && !te(t) && (this.g.D = t, e = this.h, e !== null && t in e && (e = this.h, t in e && delete e[t])), this.j = new yr(this);
		}
		m(gr, Ge), gr.prototype.m = function() {
			this.g.l = this.j, this.v && (this.g.J = !0), this.g.connect(this.l, this.h || void 0);
		}, gr.prototype.close = function() {
			Gn(this.g);
		}, gr.prototype.o = function(e) {
			var t = this.g;
			if (typeof e == "string") {
				var n = {};
				n.__data__ = e, e = n;
			} else this.u && (n = {}, n.__data__ = et(e), e = n);
			t.i.push(new Vt(t.Ya++, e)), t.G == 3 && ir(t);
		}, gr.prototype.N = function() {
			this.g.l = null, delete this.j, Gn(this.g), delete this.g, gr.aa.N.call(this);
		};
		function _r(e) {
			st.call(this), e.__headers__ && (this.headers = e.__headers__, this.statusCode = e.__status__, delete e.__headers__, delete e.__status__);
			var t = e.__sm__;
			if (t) {
				a: {
					for (let n in t) {
						e = n;
						break a;
					}
					e = void 0;
				}
				(this.i = e) && (e = this.i, t = t !== null && e in t ? t[e] : void 0), this.data = t;
			} else this.data = e;
		}
		m(_r, st);
		function vr() {
			ct.call(this), this.status = 1;
		}
		m(vr, ct);
		function yr(e) {
			this.g = e;
		}
		m(yr, mr), yr.prototype.ua = function() {
			Ke(this.g, "a");
		}, yr.prototype.ta = function(e) {
			Ke(this.g, new _r(e));
		}, yr.prototype.sa = function(e) {
			Ke(this.g, new vr());
		}, yr.prototype.ra = function() {
			Ke(this.g, "b");
		}, hr.prototype.createWebChannel = hr.prototype.g, gr.prototype.send = gr.prototype.o, gr.prototype.open = gr.prototype.m, gr.prototype.close = gr.prototype.close, tr = qn.createWebChannelTransport = function() {
			return new hr();
		}, er = qn.getStatEventTarget = function() {
			return dt();
		}, $n = qn.Event = lt, Qn = qn.Stat = {
			mb: 0,
			pb: 1,
			qb: 2,
			Jb: 3,
			Ob: 4,
			Lb: 5,
			Mb: 6,
			Kb: 7,
			Ib: 8,
			Nb: 9,
			PROXY: 10,
			NOPROXY: 11,
			Gb: 12,
			Cb: 13,
			Db: 14,
			Bb: 15,
			Eb: 16,
			Fb: 17,
			ib: 18,
			hb: 19,
			jb: 20
		}, Ct.NO_ERROR = 0, Ct.TIMEOUT = 8, Ct.HTTP_ERROR = 6, Zn = qn.ErrorCode = Ct, wt.COMPLETE = "complete", Xn = qn.EventType = wt, at.EventType = ot, ot.OPEN = "a", ot.CLOSE = "b", ot.ERROR = "c", ot.MESSAGE = "d", Ge.prototype.listen = Ge.prototype.K, Yn = qn.WebChannel = at, qn.FetchXmlHttpFactory = Dn, b.prototype.listenOnce = b.prototype.L, b.prototype.getLastError = b.prototype.Ka, b.prototype.getLastErrorCode = b.prototype.Ba, b.prototype.getStatus = b.prototype.Z, b.prototype.getResponseJson = b.prototype.Oa, b.prototype.getResponseText = b.prototype.oa, b.prototype.send = b.prototype.ea, b.prototype.setWithCredentials = b.prototype.Ha, Jn = qn.XhrIo = b;
	}).apply(Kn === void 0 ? typeof self < "u" ? self : typeof window < "u" ? window : {} : Kn);
}));
//#endregion
//#region node_modules/@firebase/firestore/dist/index.esm2017.js
function rr() {
	return wd.logLevel;
}
function ir(e) {
	wd.setLogLevel(e);
}
function S(e, ...t) {
	if (wd.logLevel <= x.DEBUG) {
		let n = t.map(or);
		wd.debug(`Firestore (${Cd}): ${e}`, ...n);
	}
}
function C(e, ...t) {
	if (wd.logLevel <= x.ERROR) {
		let n = t.map(or);
		wd.error(`Firestore (${Cd}): ${e}`, ...n);
	}
}
function ar(e, ...t) {
	if (wd.logLevel <= x.WARN) {
		let n = t.map(or);
		wd.warn(`Firestore (${Cd}): ${e}`, ...n);
	}
}
function or(e) {
	if (typeof e == "string") return e;
	try {
		return function(e) {
			return JSON.stringify(e);
		}(e);
	} catch {
		return e;
	}
}
function w(e = "Unexpected state") {
	let t = `FIRESTORE (${Cd}) INTERNAL ASSERTION FAILED: ` + e;
	throw C(t), Error(t);
}
function T(e, t) {
	e || w();
}
function sr(e, t) {
	e || w();
}
function E(e, t) {
	return e;
}
function cr(e) {
	let t = typeof self < "u" && (self.crypto || self.msCrypto), n = new Uint8Array(e);
	if (t && typeof t.getRandomValues == "function") t.getRandomValues(n);
	else for (let t = 0; t < e; t++) n[t] = Math.floor(256 * Math.random());
	return n;
}
function D(e, t) {
	return e < t ? -1 : +(e > t);
}
function lr(e, t, n) {
	return e.length === t.length && e.every(((e, r) => n(e, t[r])));
}
function ur(e) {
	return e + "\0";
}
function dr(e) {
	return e.fields.find(((e) => e.kind === 2));
}
function fr(e) {
	return e.fields.filter(((e) => e.kind !== 2));
}
function pr(e, t) {
	let n = D(e.collectionGroup, t.collectionGroup);
	if (n !== 0) return n;
	for (let r = 0; r < Math.min(e.fields.length, t.fields.length); ++r) if (n = mr(e.fields[r], t.fields[r]), n !== 0) return n;
	return D(e.fields.length, t.fields.length);
}
function mr(e, t) {
	let n = z.comparator(e.fieldPath, t.fieldPath);
	return n === 0 ? D(e.kind, t.kind) : n;
}
function hr(e, t) {
	let n = e.toTimestamp().seconds, r = e.toTimestamp().nanoseconds + 1, i = L.fromTimestamp(r === 1e9 ? new I(n + 1, 0) : new I(n, r));
	return new Vd(i, B.empty(), t);
}
function gr(e) {
	return new Vd(e.readTime, e.key, -1);
}
function _r(e, t) {
	let n = e.readTime.compareTo(t.readTime);
	return n === 0 ? (n = B.comparator(e.documentKey, t.documentKey), n === 0 ? D(e.largestBatchId, t.largestBatchId) : n) : n;
}
async function vr(e) {
	if (e.code !== P.FAILED_PRECONDITION || e.message !== Hd) throw e;
	S("LocalStore", "Unexpectedly lost primary lease");
}
function yr(e) {
	let t = e.match(/Android ([\d.]+)/i), n = t ? t[1].split(".").slice(0, 2).join(".") : "-1";
	return Number(n);
}
function br(e) {
	return e.name === "IndexedDbTransactionError";
}
function xr(e) {
	return new V(((t, n) => {
		e.onsuccess = (e) => {
			let n = e.target.result;
			t(n);
		}, e.onerror = (e) => {
			n(Sr(e.target.error));
		};
	}));
}
function Sr(e) {
	let t = Gd.S(sn());
	if (t >= 12.2 && t < 13) {
		let t = "An internal error was encountered in the Indexed Database server";
		if (e.message.indexOf(t) >= 0) {
			let e = new F("internal", `IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${t}'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.`);
			return Yd || (Yd = !0, setTimeout((() => {
				throw e;
			}), 0)), e;
		}
	}
	return e;
}
function Cr(e) {
	return e == null;
}
function wr(e) {
	return e === 0 && 1 / e == -Infinity;
}
function Tr(e) {
	return typeof e == "number" && Number.isInteger(e) && !wr(e) && e <= 2 ** 53 - 1 && e >= -(2 ** 53 - 1);
}
function Er(e) {
	let t = "";
	for (let n = 0; n < e.length; n++) t.length > 0 && (t = Or(t)), t = Dr(e.get(n), t);
	return Or(t);
}
function Dr(e, t) {
	let n = t, r = e.length;
	for (let t = 0; t < r; t++) {
		let r = e.charAt(t);
		switch (r) {
			case "\0":
				n += "";
				break;
			case "":
				n += "";
				break;
			default: n += r;
		}
	}
	return n;
}
function Or(e) {
	return e + "";
}
function kr(e) {
	let t = e.length;
	if (T(t >= 2), t === 2) return T(e.charAt(0) === "" && e.charAt(1) === ""), R.emptyPath();
	let n = t - 2, r = [], i = "";
	for (let a = 0; a < t;) {
		let t = e.indexOf("", a);
		switch ((t < 0 || t > n) && w(), e.charAt(t + 1)) {
			case "":
				let n = e.substring(a, t), o;
				i.length === 0 ? o = n : (i += n, o = i, i = ""), r.push(o);
				break;
			case "":
				i += e.substring(a, t), i += "\0";
				break;
			case "":
				i += e.substring(a, t + 1);
				break;
			default: w();
		}
		a = t + 2;
	}
	return new R(r);
}
function Ar(e, t) {
	return [e, Er(t)];
}
function jr(e, t, n) {
	return [
		e,
		Er(t),
		n
	];
}
function O(e, t) {
	let n = E(e);
	return Gd.F(n._e, t);
}
function Mr(e) {
	let t = 0;
	for (let n in e) Object.prototype.hasOwnProperty.call(e, n) && t++;
	return t;
}
function Nr(e, t) {
	for (let n in e) Object.prototype.hasOwnProperty.call(e, n) && t(n, e[n]);
}
function Pr(e, t) {
	let n = [];
	for (let r in e) Object.prototype.hasOwnProperty.call(e, r) && n.push(t(e[r], r, e));
	return n;
}
function Fr(e) {
	for (let t in e) if (Object.prototype.hasOwnProperty.call(e, t)) return !1;
	return !0;
}
function Ir(e) {
	return e.hasNext() ? e.getNext() : void 0;
}
function Lr() {
	return typeof atob < "u";
}
function Rr(e) {
	if (T(!!e), typeof e == "string") {
		let t = 0, n = kf.exec(e);
		if (T(!!n), n[1]) {
			let e = n[1];
			e = (e + "000000000").substr(0, 9), t = Number(e);
		}
		let r = new Date(e);
		return {
			seconds: Math.floor(r.getTime() / 1e3),
			nanos: t
		};
	}
	return {
		seconds: k(e.seconds),
		nanos: k(e.nanos)
	};
}
function k(e) {
	return typeof e == "number" ? e : typeof e == "string" ? Number(e) : 0;
}
function zr(e) {
	return typeof e == "string" ? W.fromBase64String(e) : W.fromUint8Array(e);
}
function Br(e) {
	return (e?.mapValue?.fields || {}).__type__?.stringValue === "server_timestamp";
}
function Vr(e) {
	let t = e.mapValue.fields.__previous_value__;
	return Br(t) ? Vr(t) : t;
}
function Hr(e) {
	let t = Rr(e.mapValue.fields.__local_write_time__.timestampValue);
	return new I(t.seconds, t.nanos);
}
function Ur(e) {
	return "nullValue" in e ? 0 : "booleanValue" in e ? 1 : "integerValue" in e || "doubleValue" in e ? 2 : "timestampValue" in e ? 3 : "stringValue" in e ? 5 : "bytesValue" in e ? 6 : "referenceValue" in e ? 7 : "geoPointValue" in e ? 8 : "arrayValue" in e ? 9 : "mapValue" in e ? Br(e) ? 4 : oi(e) ? 9007199254740991 : ii(e) ? 10 : 11 : w();
}
function Wr(e, t) {
	if (e === t) return !0;
	let n = Ur(e);
	if (n !== Ur(t)) return !1;
	switch (n) {
		case 0:
		case 9007199254740991: return !0;
		case 1: return e.booleanValue === t.booleanValue;
		case 4: return Hr(e).isEqual(Hr(t));
		case 3: return function(e, t) {
			if (typeof e.timestampValue == "string" && typeof t.timestampValue == "string" && e.timestampValue.length === t.timestampValue.length) return e.timestampValue === t.timestampValue;
			let n = Rr(e.timestampValue), r = Rr(t.timestampValue);
			return n.seconds === r.seconds && n.nanos === r.nanos;
		}(e, t);
		case 5: return e.stringValue === t.stringValue;
		case 6: return function(e, t) {
			return zr(e.bytesValue).isEqual(zr(t.bytesValue));
		}(e, t);
		case 7: return e.referenceValue === t.referenceValue;
		case 8: return function(e, t) {
			return k(e.geoPointValue.latitude) === k(t.geoPointValue.latitude) && k(e.geoPointValue.longitude) === k(t.geoPointValue.longitude);
		}(e, t);
		case 2: return function(e, t) {
			if ("integerValue" in e && "integerValue" in t) return k(e.integerValue) === k(t.integerValue);
			if ("doubleValue" in e && "doubleValue" in t) {
				let n = k(e.doubleValue), r = k(t.doubleValue);
				return n === r ? wr(n) === wr(r) : isNaN(n) && isNaN(r);
			}
			return !1;
		}(e, t);
		case 9: return lr(e.arrayValue.values || [], t.arrayValue.values || [], Wr);
		case 10:
		case 11: return function(e, t) {
			let n = e.mapValue.fields || {}, r = t.mapValue.fields || {};
			if (Mr(n) !== Mr(r)) return !1;
			for (let e in n) if (n.hasOwnProperty(e) && (r[e] === void 0 || !Wr(n[e], r[e]))) return !1;
			return !0;
		}(e, t);
		default: return w();
	}
}
function Gr(e, t) {
	return (e.values || []).find(((e) => Wr(e, t))) !== void 0;
}
function Kr(e, t) {
	if (e === t) return 0;
	let n = Ur(e), r = Ur(t);
	if (n !== r) return D(n, r);
	switch (n) {
		case 0:
		case 9007199254740991: return 0;
		case 1: return D(e.booleanValue, t.booleanValue);
		case 2: return function(e, t) {
			let n = k(e.integerValue || e.doubleValue), r = k(t.integerValue || t.doubleValue);
			return n < r ? -1 : n > r ? 1 : n === r ? 0 : isNaN(n) ? isNaN(r) ? 0 : -1 : 1;
		}(e, t);
		case 3: return qr(e.timestampValue, t.timestampValue);
		case 4: return qr(Hr(e), Hr(t));
		case 5: return D(e.stringValue, t.stringValue);
		case 6: return function(e, t) {
			let n = zr(e), r = zr(t);
			return n.compareTo(r);
		}(e.bytesValue, t.bytesValue);
		case 7: return function(e, t) {
			let n = e.split("/"), r = t.split("/");
			for (let e = 0; e < n.length && e < r.length; e++) {
				let t = D(n[e], r[e]);
				if (t !== 0) return t;
			}
			return D(n.length, r.length);
		}(e.referenceValue, t.referenceValue);
		case 8: return function(e, t) {
			let n = D(k(e.latitude), k(t.latitude));
			return n === 0 ? D(k(e.longitude), k(t.longitude)) : n;
		}(e.geoPointValue, t.geoPointValue);
		case 9: return Jr(e.arrayValue, t.arrayValue);
		case 10: return function(e, t) {
			let n = e.fields || {}, r = t.fields || {}, i = n.value?.arrayValue, a = r.value?.arrayValue, o = D(i?.values?.length || 0, a?.values?.length || 0);
			return o === 0 ? Jr(i, a) : o;
		}(e.mapValue, t.mapValue);
		case 11: return function(e, t) {
			if (e === Mf.mapValue && t === Mf.mapValue) return 0;
			if (e === Mf.mapValue) return 1;
			if (t === Mf.mapValue) return -1;
			let n = e.fields || {}, r = Object.keys(n), i = t.fields || {}, a = Object.keys(i);
			r.sort(), a.sort();
			for (let e = 0; e < r.length && e < a.length; ++e) {
				let t = D(r[e], a[e]);
				if (t !== 0) return t;
				let o = Kr(n[r[e]], i[a[e]]);
				if (o !== 0) return o;
			}
			return D(r.length, a.length);
		}(e.mapValue, t.mapValue);
		default: throw w();
	}
}
function qr(e, t) {
	if (typeof e == "string" && typeof t == "string" && e.length === t.length) return D(e, t);
	let n = Rr(e), r = Rr(t), i = D(n.seconds, r.seconds);
	return i === 0 ? D(n.nanos, r.nanos) : i;
}
function Jr(e, t) {
	let n = e.values || [], r = t.values || [];
	for (let e = 0; e < n.length && e < r.length; ++e) {
		let t = Kr(n[e], r[e]);
		if (t) return t;
	}
	return D(n.length, r.length);
}
function Yr(e) {
	return Xr(e);
}
function Xr(e) {
	return "nullValue" in e ? "null" : "booleanValue" in e ? "" + e.booleanValue : "integerValue" in e ? "" + e.integerValue : "doubleValue" in e ? "" + e.doubleValue : "timestampValue" in e ? function(e) {
		let t = Rr(e);
		return `time(${t.seconds},${t.nanos})`;
	}(e.timestampValue) : "stringValue" in e ? e.stringValue : "bytesValue" in e ? function(e) {
		return zr(e).toBase64();
	}(e.bytesValue) : "referenceValue" in e ? function(e) {
		return B.fromName(e).toString();
	}(e.referenceValue) : "geoPointValue" in e ? function(e) {
		return `geo(${e.latitude},${e.longitude})`;
	}(e.geoPointValue) : "arrayValue" in e ? function(e) {
		let t = "[", n = !0;
		for (let r of e.values || []) n ? n = !1 : t += ",", t += Xr(r);
		return t + "]";
	}(e.arrayValue) : "mapValue" in e ? function(e) {
		let t = Object.keys(e.fields || {}).sort(), n = "{", r = !0;
		for (let i of t) r ? r = !1 : n += ",", n += `${i}:${Xr(e.fields[i])}`;
		return n + "}";
	}(e.mapValue) : w();
}
function Zr(e) {
	switch (Ur(e)) {
		case 0:
		case 1: return 4;
		case 2: return 8;
		case 3:
		case 8: return 16;
		case 4:
			let t = Vr(e);
			return t ? 16 + Zr(t) : 16;
		case 5: return 2 * e.stringValue.length;
		case 6: return zr(e.bytesValue).approximateByteSize();
		case 7: return e.referenceValue.length;
		case 9: return function(e) {
			return (e.values || []).reduce(((e, t) => e + Zr(t)), 0);
		}(e.arrayValue);
		case 10:
		case 11: return function(e) {
			let t = 0;
			return Nr(e.fields, ((e, n) => {
				t += e.length + Zr(n);
			})), t;
		}(e.mapValue);
		default: throw w();
	}
}
function Qr(e, t) {
	return { referenceValue: `projects/${e.projectId}/databases/${e.database}/documents/${t.path.canonicalString()}` };
}
function $r(e) {
	return !!e && "integerValue" in e;
}
function ei(e) {
	return !!e && "arrayValue" in e;
}
function ti(e) {
	return !!e && "nullValue" in e;
}
function ni(e) {
	return !!e && "doubleValue" in e && isNaN(Number(e.doubleValue));
}
function ri(e) {
	return !!e && "mapValue" in e;
}
function ii(e) {
	return (e?.mapValue?.fields || {}).__type__?.stringValue === "__vector__";
}
function ai(e) {
	if (e.geoPointValue) return { geoPointValue: Object.assign({}, e.geoPointValue) };
	if (e.timestampValue && typeof e.timestampValue == "object") return { timestampValue: Object.assign({}, e.timestampValue) };
	if (e.mapValue) {
		let t = { mapValue: { fields: {} } };
		return Nr(e.mapValue.fields, ((e, n) => t.mapValue.fields[e] = ai(n))), t;
	}
	if (e.arrayValue) {
		let t = { arrayValue: { values: [] } };
		for (let n = 0; n < (e.arrayValue.values || []).length; ++n) t.arrayValue.values[n] = ai(e.arrayValue.values[n]);
		return t;
	}
	return Object.assign({}, e);
}
function oi(e) {
	return (((e.mapValue || {}).fields || {}).__type__ || {}).stringValue === "__max__";
}
function si(e) {
	return "nullValue" in e ? Nf : "booleanValue" in e ? { booleanValue: !1 } : "integerValue" in e || "doubleValue" in e ? { doubleValue: NaN } : "timestampValue" in e ? { timestampValue: { seconds: -(2 ** 53 - 1) } } : "stringValue" in e ? { stringValue: "" } : "bytesValue" in e ? { bytesValue: "" } : "referenceValue" in e ? Qr(jf.empty(), B.empty()) : "geoPointValue" in e ? { geoPointValue: {
		latitude: -90,
		longitude: -180
	} } : "arrayValue" in e ? { arrayValue: {} } : "mapValue" in e ? ii(e) ? Pf : { mapValue: {} } : w();
}
function ci(e) {
	return "nullValue" in e ? { booleanValue: !1 } : "booleanValue" in e ? { doubleValue: NaN } : "integerValue" in e || "doubleValue" in e ? { timestampValue: { seconds: -(2 ** 53 - 1) } } : "timestampValue" in e ? { stringValue: "" } : "stringValue" in e ? { bytesValue: "" } : "bytesValue" in e ? Qr(jf.empty(), B.empty()) : "referenceValue" in e ? { geoPointValue: {
		latitude: -90,
		longitude: -180
	} } : "geoPointValue" in e ? { arrayValue: {} } : "arrayValue" in e ? Pf : "mapValue" in e ? ii(e) ? { mapValue: {} } : Mf : w();
}
function li(e, t) {
	let n = Kr(e.value, t.value);
	return n === 0 ? e.inclusive && !t.inclusive ? -1 : !e.inclusive && t.inclusive ? 1 : 0 : n;
}
function ui(e, t) {
	let n = Kr(e.value, t.value);
	return n === 0 ? e.inclusive && !t.inclusive ? 1 : !e.inclusive && t.inclusive ? -1 : 0 : n;
}
function di(e) {
	let t = [];
	return Nr(e.fields, ((e, n) => {
		let r = new z([e]);
		if (ri(n)) {
			let e = di(n.mapValue).fields;
			if (e.length === 0) t.push(r);
			else for (let n of e) t.push(r.child(n));
		} else t.push(r);
	})), new Df(t);
}
function fi(e, t, n) {
	let r = 0;
	for (let i = 0; i < e.position.length; i++) {
		let a = t[i], o = e.position[i];
		if (r = a.field.isKeyField() ? B.comparator(B.fromName(o.referenceValue), n.key) : Kr(o, n.data.field(a.field)), a.dir === "desc" && (r *= -1), r !== 0) break;
	}
	return r;
}
function pi(e, t) {
	if (e === null) return t === null;
	if (t === null || e.inclusive !== t.inclusive || e.position.length !== t.position.length) return !1;
	for (let n = 0; n < e.position.length; n++) if (!Wr(e.position[n], t.position[n])) return !1;
	return !0;
}
function mi(e, t) {
	return e.dir === t.dir && e.field.isEqual(t.field);
}
function hi(e) {
	return e.op === "and";
}
function gi(e) {
	return e.op === "or";
}
function _i(e) {
	return vi(e) && hi(e);
}
function vi(e) {
	for (let t of e.filters) if (t instanceof K) return !1;
	return !0;
}
function yi(e) {
	if (e instanceof G) return e.field.canonicalString() + e.op.toString() + Yr(e.value);
	if (_i(e)) return e.filters.map(((e) => yi(e))).join(",");
	{
		let t = e.filters.map(((e) => yi(e))).join(",");
		return `${e.op}(${t})`;
	}
}
function bi(e, t) {
	return e instanceof G ? function(e, t) {
		return t instanceof G && e.op === t.op && e.field.isEqual(t.field) && Wr(e.value, t.value);
	}(e, t) : e instanceof K ? function(e, t) {
		return t instanceof K && e.op === t.op && e.filters.length === t.filters.length && e.filters.reduce(((e, n, r) => e && bi(n, t.filters[r])), !0);
	}(e, t) : void w();
}
function xi(e, t) {
	let n = e.filters.concat(t);
	return K.create(n, e.op);
}
function Si(e) {
	return e instanceof G ? function(e) {
		return `${e.field.canonicalString()} ${e.op} ${Yr(e.value)}`;
	}(e) : e instanceof K ? function(e) {
		return e.op.toString() + " {" + e.getFilters().map(Si).join(" ,") + "}";
	}(e) : "Filter";
}
function Ci(e, t) {
	return (t.arrayValue?.values || []).map(((e) => B.fromName(e.referenceValue)));
}
function wi(e, t = null, n = [], r = [], i = null, a = null, o = null) {
	return new qf(e, t, n, r, i, a, o);
}
function Ti(e) {
	let t = E(e);
	if (t.ue === null) {
		let e = t.path.canonicalString();
		t.collectionGroup !== null && (e += "|cg:" + t.collectionGroup), e += "|f:", e += t.filters.map(((e) => yi(e))).join(","), e += "|ob:", e += t.orderBy.map(((e) => function(e) {
			return e.field.canonicalString() + e.dir;
		}(e))).join(","), Cr(t.limit) || (e += "|l:", e += t.limit), t.startAt && (e += "|lb:", e += t.startAt.inclusive ? "b:" : "a:", e += t.startAt.position.map(((e) => Yr(e))).join(",")), t.endAt && (e += "|ub:", e += t.endAt.inclusive ? "a:" : "b:", e += t.endAt.position.map(((e) => Yr(e))).join(",")), t.ue = e;
	}
	return t.ue;
}
function Ei(e, t) {
	if (e.limit !== t.limit || e.orderBy.length !== t.orderBy.length) return !1;
	for (let n = 0; n < e.orderBy.length; n++) if (!mi(e.orderBy[n], t.orderBy[n])) return !1;
	if (e.filters.length !== t.filters.length) return !1;
	for (let n = 0; n < e.filters.length; n++) if (!bi(e.filters[n], t.filters[n])) return !1;
	return e.collectionGroup === t.collectionGroup && !!e.path.isEqual(t.path) && !!pi(e.startAt, t.startAt) && pi(e.endAt, t.endAt);
}
function Di(e) {
	return B.isDocumentKey(e.path) && e.collectionGroup === null && e.filters.length === 0;
}
function Oi(e, t) {
	return e.filters.filter(((e) => e instanceof G && e.field.isEqual(t)));
}
function ki(e, t, n) {
	let r = Nf, i = !0;
	for (let n of Oi(e, t)) {
		let e = Nf, t = !0;
		switch (n.op) {
			case "<":
			case "<=":
				e = si(n.value);
				break;
			case "==":
			case "in":
			case ">=":
				e = n.value;
				break;
			case ">":
				e = n.value, t = !1;
				break;
			case "!=":
			case "not-in": e = Nf;
		}
		li({
			value: r,
			inclusive: i
		}, {
			value: e,
			inclusive: t
		}) < 0 && (r = e, i = t);
	}
	if (n !== null) {
		for (let a = 0; a < e.orderBy.length; ++a) if (e.orderBy[a].field.isEqual(t)) {
			let e = n.position[a];
			li({
				value: r,
				inclusive: i
			}, {
				value: e,
				inclusive: n.inclusive
			}) < 0 && (r = e, i = n.inclusive);
			break;
		}
	}
	return {
		value: r,
		inclusive: i
	};
}
function Ai(e, t, n) {
	let r = Mf, i = !0;
	for (let n of Oi(e, t)) {
		let e = Mf, t = !0;
		switch (n.op) {
			case ">=":
			case ">":
				e = ci(n.value), t = !1;
				break;
			case "==":
			case "in":
			case "<=":
				e = n.value;
				break;
			case "<":
				e = n.value, t = !1;
				break;
			case "!=":
			case "not-in": e = Mf;
		}
		ui({
			value: r,
			inclusive: i
		}, {
			value: e,
			inclusive: t
		}) > 0 && (r = e, i = t);
	}
	if (n !== null) {
		for (let a = 0; a < e.orderBy.length; ++a) if (e.orderBy[a].field.isEqual(t)) {
			let e = n.position[a];
			ui({
				value: r,
				inclusive: i
			}, {
				value: e,
				inclusive: n.inclusive
			}) > 0 && (r = e, i = n.inclusive);
			break;
		}
	}
	return {
		value: r,
		inclusive: i
	};
}
function ji(e, t, n, r, i, a, o, s) {
	return new Jf(e, t, n, r, i, a, o, s);
}
function Mi(e) {
	return new Jf(e);
}
function Ni(e) {
	return e.filters.length === 0 && e.limit === null && e.startAt == null && e.endAt == null && (e.explicitOrderBy.length === 0 || e.explicitOrderBy.length === 1 && e.explicitOrderBy[0].field.isKeyField());
}
function Pi(e) {
	return e.collectionGroup !== null;
}
function Fi(e) {
	let t = E(e);
	if (t.ce === null) {
		t.ce = [];
		let e = /* @__PURE__ */ new Set();
		for (let n of t.explicitOrderBy) t.ce.push(n), e.add(n.field.canonicalString());
		let n = t.explicitOrderBy.length > 0 ? t.explicitOrderBy[t.explicitOrderBy.length - 1].dir : "asc";
		(function(e) {
			let t = new U(z.comparator);
			return e.filters.forEach(((e) => {
				e.getFlattenedFilters().forEach(((e) => {
					e.isInequality() && (t = t.add(e.field));
				}));
			})), t;
		})(t).forEach(((r) => {
			e.has(r.canonicalString()) || r.isKeyField() || t.ce.push(new Rf(r, n));
		})), e.has(z.keyField().canonicalString()) || t.ce.push(new Rf(z.keyField(), n));
	}
	return t.ce;
}
function Ii(e) {
	let t = E(e);
	return t.le ||= Ri(t, Fi(e)), t.le;
}
function Li(e) {
	let t = E(e);
	return t.he ||= Ri(t, e.explicitOrderBy), t.he;
}
function Ri(e, t) {
	if (e.limitType === "F") return wi(e.path, e.collectionGroup, t, e.filters, e.limit, e.startAt, e.endAt);
	{
		t = t.map(((e) => {
			let t = e.dir === "desc" ? "asc" : "desc";
			return new Rf(e.field, t);
		}));
		let n = e.endAt ? new Lf(e.endAt.position, e.endAt.inclusive) : null, r = e.startAt ? new Lf(e.startAt.position, e.startAt.inclusive) : null;
		return wi(e.path, e.collectionGroup, t, e.filters, e.limit, n, r);
	}
}
function zi(e, t) {
	let n = e.filters.concat([t]);
	return new Jf(e.path, e.collectionGroup, e.explicitOrderBy.slice(), n, e.limit, e.limitType, e.startAt, e.endAt);
}
function Bi(e, t, n) {
	return new Jf(e.path, e.collectionGroup, e.explicitOrderBy.slice(), e.filters.slice(), t, n, e.startAt, e.endAt);
}
function Vi(e, t) {
	return Ei(Ii(e), Ii(t)) && e.limitType === t.limitType;
}
function Hi(e) {
	return `${Ti(Ii(e))}|lt:${e.limitType}`;
}
function Ui(e) {
	return `Query(target=${function(e) {
		let t = e.path.canonicalString();
		return e.collectionGroup !== null && (t += " collectionGroup=" + e.collectionGroup), e.filters.length > 0 && (t += `, filters: [${e.filters.map(((e) => Si(e))).join(", ")}]`), Cr(e.limit) || (t += ", limit: " + e.limit), e.orderBy.length > 0 && (t += `, orderBy: [${e.orderBy.map(((e) => function(e) {
			return `${e.field.canonicalString()} (${e.dir})`;
		}(e))).join(", ")}]`), e.startAt && (t += ", startAt: ", t += e.startAt.inclusive ? "b:" : "a:", t += e.startAt.position.map(((e) => Yr(e))).join(",")), e.endAt && (t += ", endAt: ", t += e.endAt.inclusive ? "a:" : "b:", t += e.endAt.position.map(((e) => Yr(e))).join(",")), `Target(${t})`;
	}(Ii(e))}; limitType=${e.limitType})`;
}
function Wi(e, t) {
	return t.isFoundDocument() && function(e, t) {
		let n = t.key.path;
		return e.collectionGroup === null ? B.isDocumentKey(e.path) ? e.path.isEqual(n) : e.path.isImmediateParentOf(n) : t.key.hasCollectionId(e.collectionGroup) && e.path.isPrefixOf(n);
	}(e, t) && function(e, t) {
		for (let n of Fi(e)) if (!n.field.isKeyField() && t.data.field(n.field) === null) return !1;
		return !0;
	}(e, t) && function(e, t) {
		for (let n of e.filters) if (!n.matches(t)) return !1;
		return !0;
	}(e, t) && function(e, t) {
		return !(e.startAt && !function(e, t, n) {
			let r = fi(e, t, n);
			return e.inclusive ? r <= 0 : r < 0;
		}(e.startAt, Fi(e), t) || e.endAt && !function(e, t, n) {
			let r = fi(e, t, n);
			return e.inclusive ? r >= 0 : r > 0;
		}(e.endAt, Fi(e), t));
	}(e, t);
}
function Gi(e) {
	return e.collectionGroup || (e.path.length % 2 == 1 ? e.path.lastSegment() : e.path.get(e.path.length - 2));
}
function Ki(e) {
	return (t, n) => {
		let r = !1;
		for (let i of Fi(e)) {
			let e = qi(i, t, n);
			if (e !== 0) return e;
			r ||= i.field.isKeyField();
		}
		return 0;
	};
}
function qi(e, t, n) {
	let r = e.field.isKeyField() ? B.comparator(t.key, n.key) : function(e, t, n) {
		let r = t.data.field(e), i = n.data.field(e);
		return r !== null && i !== null ? Kr(r, i) : w();
	}(e.field, t, n);
	switch (e.dir) {
		case "asc": return r;
		case "desc": return -1 * r;
		default: return w();
	}
}
function Ji() {
	return Xf;
}
function Yi(...e) {
	let t = Zf;
	for (let n of e) t = t.insert(n.key, n);
	return t;
}
function Xi(e) {
	let t = Zf;
	return e.forEach(((e, n) => t = t.insert(e, n.overlayedDocument))), t;
}
function Zi() {
	return $i();
}
function Qi() {
	return $i();
}
function $i() {
	return new Yf(((e) => e.toString()), ((e, t) => e.isEqual(t)));
}
function A(...e) {
	let t = $f;
	for (let n of e) t = t.add(n);
	return t;
}
function ea() {
	return ep;
}
function ta(e, t) {
	if (e.useProto3Json) {
		if (isNaN(t)) return { doubleValue: "NaN" };
		if (t === Infinity) return { doubleValue: "Infinity" };
		if (t === -Infinity) return { doubleValue: "-Infinity" };
	}
	return { doubleValue: wr(t) ? "-0" : t };
}
function na(e) {
	return { integerValue: "" + e };
}
function ra(e, t) {
	return Tr(t) ? na(t) : ta(e, t);
}
function ia(e, t, n) {
	return e instanceof np ? function(e, t) {
		let n = { fields: {
			__type__: { stringValue: "server_timestamp" },
			__local_write_time__: { timestampValue: {
				seconds: e.seconds,
				nanos: e.nanoseconds
			} }
		} };
		return t && Br(t) && (t = Vr(t)), t && (n.fields.__previous_value__ = t), { mapValue: n };
	}(n, t) : e instanceof rp ? sa(e, t) : e instanceof ip ? ca(e, t) : function(e, t) {
		let n = oa(e, t), r = la(n) + la(e.Pe);
		return $r(n) && $r(e.Pe) ? na(r) : ta(e.serializer, r);
	}(e, t);
}
function aa(e, t, n) {
	return e instanceof rp ? sa(e, t) : e instanceof ip ? ca(e, t) : n;
}
function oa(e, t) {
	return e instanceof ap ? function(e) {
		return $r(e) || function(e) {
			return !!e && "doubleValue" in e;
		}(e);
	}(t) ? t : { integerValue: 0 } : null;
}
function sa(e, t) {
	let n = ua(t);
	for (let t of e.elements) n.some(((e) => Wr(e, t))) || n.push(t);
	return { arrayValue: { values: n } };
}
function ca(e, t) {
	let n = ua(t);
	for (let t of e.elements) n = n.filter(((e) => !Wr(e, t)));
	return { arrayValue: { values: n } };
}
function la(e) {
	return k(e.integerValue || e.doubleValue);
}
function ua(e) {
	return ei(e) && e.arrayValue.values ? e.arrayValue.values.slice() : [];
}
function da(e, t) {
	return e.field.isEqual(t.field) && function(e, t) {
		return e instanceof rp && t instanceof rp || e instanceof ip && t instanceof ip ? lr(e.elements, t.elements, Wr) : e instanceof ap && t instanceof ap ? Wr(e.Pe, t.Pe) : e instanceof np && t instanceof np;
	}(e.transform, t.transform);
}
function fa(e, t) {
	return e.updateTime === void 0 ? e.exists === void 0 || e.exists === t.isFoundDocument() : t.isFoundDocument() && t.version.isEqual(e.updateTime);
}
function pa(e, t) {
	if (!e.hasLocalMutations || t && t.fields.length === 0) return null;
	if (t === null) return e.isNoDocument() ? new dp(e.key, q.none()) : new lp(e.key, e.data, q.none());
	{
		let n = e.data, r = Ff.empty(), i = new U(z.comparator);
		for (let e of t.fields) if (!i.has(e)) {
			let t = n.field(e);
			t === null && e.length > 1 && (e = e.popLast(), t = n.field(e)), t === null ? r.delete(e) : r.set(e, t), i = i.add(e);
		}
		return new up(e.key, r, new Df(i.toArray()), q.none());
	}
}
function ma(e, t, n) {
	e instanceof lp ? function(e, t, n) {
		let r = e.value.clone(), i = ya(e.fieldTransforms, t, n.transformResults);
		r.setAll(i), t.convertToFoundDocument(n.version, r).setHasCommittedMutations();
	}(e, t, n) : e instanceof up ? function(e, t, n) {
		if (!fa(e.precondition, t)) return void t.convertToUnknownDocument(n.version);
		let r = ya(e.fieldTransforms, t, n.transformResults), i = t.data;
		i.setAll(va(e)), i.setAll(r), t.convertToFoundDocument(n.version, i).setHasCommittedMutations();
	}(e, t, n) : function(e, t, n) {
		t.convertToNoDocument(n.version).setHasCommittedMutations();
	}(0, t, n);
}
function ha(e, t, n, r) {
	return e instanceof lp ? function(e, t, n, r) {
		if (!fa(e.precondition, t)) return n;
		let i = e.value.clone(), a = ba(e.fieldTransforms, r, t);
		return i.setAll(a), t.convertToFoundDocument(t.version, i).setHasLocalMutations(), null;
	}(e, t, n, r) : e instanceof up ? function(e, t, n, r) {
		if (!fa(e.precondition, t)) return n;
		let i = ba(e.fieldTransforms, r, t), a = t.data;
		return a.setAll(va(e)), a.setAll(i), t.convertToFoundDocument(t.version, a).setHasLocalMutations(), n === null ? null : n.unionWith(e.fieldMask.fields).unionWith(e.fieldTransforms.map(((e) => e.field)));
	}(e, t, n, r) : function(e, t, n) {
		return fa(e.precondition, t) ? (t.convertToNoDocument(t.version).setHasLocalMutations(), null) : n;
	}(e, t, n);
}
function ga(e, t) {
	let n = null;
	for (let r of e.fieldTransforms) {
		let e = t.data.field(r.field), i = oa(r.transform, e || null);
		i != null && (n === null && (n = Ff.empty()), n.set(r.field, i));
	}
	return n || null;
}
function _a(e, t) {
	return e.type === t.type && !!e.key.isEqual(t.key) && !!e.precondition.isEqual(t.precondition) && !!function(e, t) {
		return e === void 0 && t === void 0 || !(!e || !t) && lr(e, t, ((e, t) => da(e, t)));
	}(e.fieldTransforms, t.fieldTransforms) && (e.type === 0 ? e.value.isEqual(t.value) : e.type !== 1 || e.data.isEqual(t.data) && e.fieldMask.isEqual(t.fieldMask));
}
function va(e) {
	let t = /* @__PURE__ */ new Map();
	return e.fieldMask.fields.forEach(((n) => {
		if (!n.isEmpty()) {
			let r = e.data.field(n);
			t.set(n, r);
		}
	})), t;
}
function ya(e, t, n) {
	let r = /* @__PURE__ */ new Map();
	T(e.length === n.length);
	for (let i = 0; i < n.length; i++) {
		let a = e[i], o = a.transform, s = t.data.field(a.field);
		r.set(a.field, aa(o, s, n[i]));
	}
	return r;
}
function ba(e, t, n) {
	let r = /* @__PURE__ */ new Map();
	for (let i of e) {
		let e = i.transform, a = n.data.field(i.field);
		r.set(i.field, ia(e, a, t));
	}
	return r;
}
function xa(e) {
	switch (e) {
		default: return w();
		case P.CANCELLED:
		case P.UNKNOWN:
		case P.DEADLINE_EXCEEDED:
		case P.RESOURCE_EXHAUSTED:
		case P.INTERNAL:
		case P.UNAVAILABLE:
		case P.UNAUTHENTICATED: return !1;
		case P.INVALID_ARGUMENT:
		case P.NOT_FOUND:
		case P.ALREADY_EXISTS:
		case P.PERMISSION_DENIED:
		case P.FAILED_PRECONDITION:
		case P.ABORTED:
		case P.OUT_OF_RANGE:
		case P.UNIMPLEMENTED:
		case P.DATA_LOSS: return !0;
	}
}
function Sa(e) {
	if (e === void 0) return C("GRPC error has no .code"), P.UNKNOWN;
	switch (e) {
		case vp.OK: return P.OK;
		case vp.CANCELLED: return P.CANCELLED;
		case vp.UNKNOWN: return P.UNKNOWN;
		case vp.DEADLINE_EXCEEDED: return P.DEADLINE_EXCEEDED;
		case vp.RESOURCE_EXHAUSTED: return P.RESOURCE_EXHAUSTED;
		case vp.INTERNAL: return P.INTERNAL;
		case vp.UNAVAILABLE: return P.UNAVAILABLE;
		case vp.UNAUTHENTICATED: return P.UNAUTHENTICATED;
		case vp.INVALID_ARGUMENT: return P.INVALID_ARGUMENT;
		case vp.NOT_FOUND: return P.NOT_FOUND;
		case vp.ALREADY_EXISTS: return P.ALREADY_EXISTS;
		case vp.PERMISSION_DENIED: return P.PERMISSION_DENIED;
		case vp.FAILED_PRECONDITION: return P.FAILED_PRECONDITION;
		case vp.ABORTED: return P.ABORTED;
		case vp.OUT_OF_RANGE: return P.OUT_OF_RANGE;
		case vp.UNIMPLEMENTED: return P.UNIMPLEMENTED;
		case vp.DATA_LOSS: return P.DATA_LOSS;
		default: return w();
	}
}
function Ca() {
	return new TextEncoder();
}
function wa(e) {
	let t = Ca().encode(e), n = new Wn();
	return n.update(t), new Uint8Array(n.digest());
}
function Ta(e) {
	let t = new DataView(e.buffer), n = t.getUint32(0, !0), r = t.getUint32(4, !0), i = t.getUint32(8, !0), a = t.getUint32(12, !0);
	return [new Un([n, r], 0), new Un([i, a], 0)];
}
function Ea() {
	return new H(B.comparator);
}
function Da() {
	return new H(B.comparator);
}
function Oa(e, t) {
	return e.useProto3Json || Cr(t) ? t : { value: t };
}
function ka(e, t) {
	return e.useProto3Json ? `${(/* @__PURE__ */ new Date(1e3 * t.seconds)).toISOString().replace(/\.\d*/, "").replace("Z", "")}.${("000000000" + t.nanoseconds).slice(-9)}Z` : {
		seconds: "" + t.seconds,
		nanos: t.nanoseconds
	};
}
function Aa(e, t) {
	return e.useProto3Json ? t.toBase64() : t.toUint8Array();
}
function ja(e, t) {
	return ka(e, t.toTimestamp());
}
function j(e) {
	return T(!!e), L.fromTimestamp(function(e) {
		let t = Rr(e);
		return new I(t.seconds, t.nanos);
	}(e));
}
function Ma(e, t) {
	return Na(e, t).canonicalString();
}
function Na(e, t) {
	let n = function(e) {
		return new R([
			"projects",
			e.projectId,
			"databases",
			e.database
		]);
	}(e).child("documents");
	return t === void 0 ? n : n.child(t);
}
function Pa(e) {
	let t = R.fromString(e);
	return T(so(t)), t;
}
function Fa(e, t) {
	return Ma(e.databaseId, t.path);
}
function Ia(e, t) {
	let n = Pa(t);
	if (n.get(1) !== e.databaseId.projectId) throw new F(P.INVALID_ARGUMENT, "Tried to deserialize key from different project: " + n.get(1) + " vs " + e.databaseId.projectId);
	if (n.get(3) !== e.databaseId.database) throw new F(P.INVALID_ARGUMENT, "Tried to deserialize key from different database: " + n.get(3) + " vs " + e.databaseId.database);
	return new B(Ba(n));
}
function La(e, t) {
	return Ma(e.databaseId, t);
}
function Ra(e) {
	let t = Pa(e);
	return t.length === 4 ? R.emptyPath() : Ba(t);
}
function za(e) {
	return new R([
		"projects",
		e.databaseId.projectId,
		"databases",
		e.databaseId.database
	]).canonicalString();
}
function Ba(e) {
	return T(e.length > 4 && e.get(4) === "documents"), e.popFirst(5);
}
function Va(e, t, n) {
	return {
		name: Fa(e, t),
		fields: n.value.mapValue.fields
	};
}
function Ha(e, t, n) {
	let r = Ia(e, t.name), i = j(t.updateTime), a = t.createTime ? j(t.createTime) : L.min(), o = new Ff({ mapValue: { fields: t.fields } }), s = If.newFoundDocument(r, i, a, o);
	return n && s.setHasCommittedMutations(), n ? s.setHasCommittedMutations() : s;
}
function Ua(e, t) {
	return "found" in t ? function(e, t) {
		T(!!t.found), t.found.name, t.found.updateTime;
		let n = Ia(e, t.found.name), r = j(t.found.updateTime), i = t.found.createTime ? j(t.found.createTime) : L.min(), a = new Ff({ mapValue: { fields: t.found.fields } });
		return If.newFoundDocument(n, r, i, a);
	}(e, t) : "missing" in t ? function(e, t) {
		T(!!t.missing), T(!!t.readTime);
		let n = Ia(e, t.missing), r = j(t.readTime);
		return If.newNoDocument(n, r);
	}(e, t) : w();
}
function Wa(e, t) {
	let n;
	if ("targetChange" in t) {
		t.targetChange;
		let r = function(e) {
			return e === "NO_CHANGE" ? 0 : e === "ADD" ? 1 : e === "REMOVE" ? 2 : e === "CURRENT" ? 3 : e === "RESET" ? 4 : w();
		}(t.targetChange.targetChangeType || "NO_CHANGE"), i = t.targetChange.targetIds || [], a = function(e, t) {
			return e.useProto3Json ? (T(t === void 0 || typeof t == "string"), W.fromBase64String(t || "")) : (T(t === void 0 || t instanceof Buffer || t instanceof Uint8Array), W.fromUint8Array(t || /* @__PURE__ */ new Uint8Array()));
		}(e, t.targetChange.resumeToken), o = t.targetChange.cause, s = o && function(e) {
			let t = e.code === void 0 ? P.UNKNOWN : Sa(e.code);
			return new F(t, e.message || "");
		}(o);
		n = new Dp(r, i, a, s || null);
	} else if ("documentChange" in t) {
		t.documentChange;
		let r = t.documentChange;
		r.document, r.document.name, r.document.updateTime;
		let i = Ia(e, r.document.name), a = j(r.document.updateTime), o = r.document.createTime ? j(r.document.createTime) : L.min(), s = new Ff({ mapValue: { fields: r.document.fields } }), c = If.newFoundDocument(i, a, o, s), l = r.targetIds || [], u = r.removedTargetIds || [];
		n = new Tp(l, u, c.key, c);
	} else if ("documentDelete" in t) {
		t.documentDelete;
		let r = t.documentDelete;
		r.document;
		let i = Ia(e, r.document), a = r.readTime ? j(r.readTime) : L.min(), o = If.newNoDocument(i, a), s = r.removedTargetIds || [];
		n = new Tp([], s, o.key, o);
	} else if ("documentRemove" in t) {
		t.documentRemove;
		let r = t.documentRemove;
		r.document;
		let i = Ia(e, r.document), a = r.removedTargetIds || [];
		n = new Tp([], a, i, null);
	} else {
		if (!("filter" in t)) return w();
		{
			t.filter;
			let e = t.filter;
			e.targetId;
			let { count: r = 0, unchangedNames: i } = e, a = new _p(r, i), o = e.targetId;
			n = new Ep(o, a);
		}
	}
	return n;
}
function Ga(e, t) {
	let n;
	if (t instanceof lp) n = { update: Va(e, t.key, t.value) };
	else if (t instanceof dp) n = { delete: Fa(e, t.key) };
	else if (t instanceof up) n = {
		update: Va(e, t.key, t.data),
		updateMask: oo(t.fieldMask)
	};
	else {
		if (!(t instanceof fp)) return w();
		n = { verify: Fa(e, t.key) };
	}
	return t.fieldTransforms.length > 0 && (n.updateTransforms = t.fieldTransforms.map(((e) => function(e, t) {
		let n = t.transform;
		if (n instanceof np) return {
			fieldPath: t.field.canonicalString(),
			setToServerValue: "REQUEST_TIME"
		};
		if (n instanceof rp) return {
			fieldPath: t.field.canonicalString(),
			appendMissingElements: { values: n.elements }
		};
		if (n instanceof ip) return {
			fieldPath: t.field.canonicalString(),
			removeAllFromArray: { values: n.elements }
		};
		if (n instanceof ap) return {
			fieldPath: t.field.canonicalString(),
			increment: n.Pe
		};
		throw w();
	}(0, e)))), t.precondition.isNone || (n.currentDocument = function(e, t) {
		return t.updateTime === void 0 ? t.exists === void 0 ? w() : { exists: t.exists } : { updateTime: ja(e, t.updateTime) };
	}(e, t.precondition)), n;
}
function Ka(e, t) {
	let n = t.currentDocument ? function(e) {
		return e.updateTime === void 0 ? e.exists === void 0 ? q.none() : q.exists(e.exists) : q.updateTime(j(e.updateTime));
	}(t.currentDocument) : q.none(), r = t.updateTransforms ? t.updateTransforms.map(((t) => function(e, t) {
		let n = null;
		if ("setToServerValue" in t) T(t.setToServerValue === "REQUEST_TIME"), n = new np();
		else if ("appendMissingElements" in t) {
			let e = t.appendMissingElements.values || [];
			n = new rp(e);
		} else if ("removeAllFromArray" in t) {
			let e = t.removeAllFromArray.values || [];
			n = new ip(e);
		} else "increment" in t ? n = new ap(e, t.increment) : w();
		let r = z.fromServerFormat(t.fieldPath);
		return new op(r, n);
	}(e, t))) : [];
	if (t.update) {
		t.update.name;
		let i = Ia(e, t.update.name), a = new Ff({ mapValue: { fields: t.update.fields } });
		if (t.updateMask) {
			let e = function(e) {
				let t = e.fieldPaths || [];
				return new Df(t.map(((e) => z.fromServerFormat(e))));
			}(t.updateMask);
			return new up(i, a, e, n, r);
		}
		return new lp(i, a, n, r);
	}
	if (t.delete) {
		let r = Ia(e, t.delete);
		return new dp(r, n);
	}
	if (t.verify) {
		let r = Ia(e, t.verify);
		return new fp(r, n);
	}
	return w();
}
function qa(e, t) {
	return e && e.length > 0 ? (T(t !== void 0), e.map(((e) => function(e, t) {
		let n = e.updateTime ? j(e.updateTime) : j(t);
		return n.isEqual(L.min()) && (n = j(t)), new sp(n, e.transformResults || []);
	}(e, t)))) : [];
}
function Ja(e, t) {
	return { documents: [La(e, t.path)] };
}
function Ya(e, t) {
	let n = { structuredQuery: {} }, r = t.path, i;
	t.collectionGroup === null ? (i = r.popLast(), n.structuredQuery.from = [{ collectionId: r.lastSegment() }]) : (i = r, n.structuredQuery.from = [{
		collectionId: t.collectionGroup,
		allDescendants: !0
	}]), n.parent = La(e, i);
	let a = function(e) {
		if (e.length !== 0) return ao(K.create(e, "and"));
	}(t.filters);
	a && (n.structuredQuery.where = a);
	let o = function(e) {
		if (e.length !== 0) return e.map(((e) => function(e) {
			return {
				field: ro(e.field),
				direction: eo(e.dir)
			};
		}(e)));
	}(t.orderBy);
	o && (n.structuredQuery.orderBy = o);
	let s = Oa(e, t.limit);
	return s !== null && (n.structuredQuery.limit = s), t.startAt && (n.structuredQuery.startAt = function(e) {
		return {
			before: e.inclusive,
			values: e.position
		};
	}(t.startAt)), t.endAt && (n.structuredQuery.endAt = function(e) {
		return {
			before: !e.inclusive,
			values: e.position
		};
	}(t.endAt)), {
		_t: n,
		parent: i
	};
}
function Xa(e, t, n, r) {
	let { _t: i, parent: a } = Ya(e, t), o = {}, s = [], c = 0;
	return n.forEach(((e) => {
		let t = r ? e.alias : "aggregate_" + c++;
		o[t] = e.alias, e.aggregateType === "count" ? s.push({
			alias: t,
			count: {}
		}) : e.aggregateType === "avg" ? s.push({
			alias: t,
			avg: { field: ro(e.fieldPath) }
		}) : e.aggregateType === "sum" && s.push({
			alias: t,
			sum: { field: ro(e.fieldPath) }
		});
	})), {
		request: {
			structuredAggregationQuery: {
				aggregations: s,
				structuredQuery: i.structuredQuery
			},
			parent: i.parent
		},
		ut: o,
		parent: a
	};
}
function Za(e) {
	let t = Ra(e.parent), n = e.structuredQuery, r = n.from ? n.from.length : 0, i = null;
	if (r > 0) {
		T(r === 1);
		let e = n.from[0];
		e.allDescendants ? i = e.collectionId : t = t.child(e.collectionId);
	}
	let a = [];
	n.where && (a = function(e) {
		let t = $a(e);
		return t instanceof K && _i(t) ? t.getFilters() : [t];
	}(n.where));
	let o = [];
	n.orderBy && (o = function(e) {
		return e.map(((e) => function(e) {
			return new Rf(io(e.field), function(e) {
				switch (e) {
					case "ASCENDING": return "asc";
					case "DESCENDING": return "desc";
					default: return;
				}
			}(e.direction));
		}(e)));
	}(n.orderBy));
	let s = null;
	n.limit && (s = function(e) {
		let t;
		return t = typeof e == "object" ? e.value : e, Cr(t) ? null : t;
	}(n.limit));
	let c = null;
	n.startAt && (c = function(e) {
		let t = !!e.before, n = e.values || [];
		return new Lf(n, t);
	}(n.startAt));
	let l = null;
	return n.endAt && (l = function(e) {
		let t = !e.before, n = e.values || [];
		return new Lf(n, t);
	}(n.endAt)), ji(t, i, o, a, s, "F", c, l);
}
function Qa(e, t) {
	let n = function(e) {
		switch (e) {
			case "TargetPurposeListen": return null;
			case "TargetPurposeExistenceFilterMismatch": return "existence-filter-mismatch";
			case "TargetPurposeExistenceFilterMismatchBloom": return "existence-filter-mismatch-bloom";
			case "TargetPurposeLimboResolution": return "limbo-document";
			default: return w();
		}
	}(t.purpose);
	return n == null ? null : { "goog-listen-tags": n };
}
function $a(e) {
	return e.unaryFilter === void 0 ? e.fieldFilter === void 0 ? e.compositeFilter === void 0 ? w() : function(e) {
		return K.create(e.compositeFilter.filters.map(((e) => $a(e))), function(e) {
			switch (e) {
				case "AND": return "and";
				case "OR": return "or";
				default: return w();
			}
		}(e.compositeFilter.op));
	}(e) : function(e) {
		return G.create(io(e.fieldFilter.field), function(e) {
			switch (e) {
				case "EQUAL": return "==";
				case "NOT_EQUAL": return "!=";
				case "GREATER_THAN": return ">";
				case "GREATER_THAN_OR_EQUAL": return ">=";
				case "LESS_THAN": return "<";
				case "LESS_THAN_OR_EQUAL": return "<=";
				case "ARRAY_CONTAINS": return "array-contains";
				case "IN": return "in";
				case "NOT_IN": return "not-in";
				case "ARRAY_CONTAINS_ANY": return "array-contains-any";
				default: return w();
			}
		}(e.fieldFilter.op), e.fieldFilter.value);
	}(e) : function(e) {
		switch (e.unaryFilter.op) {
			case "IS_NAN":
				let t = io(e.unaryFilter.field);
				return G.create(t, "==", { doubleValue: NaN });
			case "IS_NULL":
				let n = io(e.unaryFilter.field);
				return G.create(n, "==", { nullValue: "NULL_VALUE" });
			case "IS_NOT_NAN":
				let r = io(e.unaryFilter.field);
				return G.create(r, "!=", { doubleValue: NaN });
			case "IS_NOT_NULL":
				let i = io(e.unaryFilter.field);
				return G.create(i, "!=", { nullValue: "NULL_VALUE" });
			default: return w();
		}
	}(e);
}
function eo(e) {
	return Ap[e];
}
function to(e) {
	return jp[e];
}
function no(e) {
	return Mp[e];
}
function ro(e) {
	return { fieldPath: e.canonicalString() };
}
function io(e) {
	return z.fromServerFormat(e.fieldPath);
}
function ao(e) {
	return e instanceof G ? function(e) {
		if (e.op === "==") {
			if (ni(e.value)) return { unaryFilter: {
				field: ro(e.field),
				op: "IS_NAN"
			} };
			if (ti(e.value)) return { unaryFilter: {
				field: ro(e.field),
				op: "IS_NULL"
			} };
		} else if (e.op === "!=") {
			if (ni(e.value)) return { unaryFilter: {
				field: ro(e.field),
				op: "IS_NOT_NAN"
			} };
			if (ti(e.value)) return { unaryFilter: {
				field: ro(e.field),
				op: "IS_NOT_NULL"
			} };
		}
		return { fieldFilter: {
			field: ro(e.field),
			op: to(e.op),
			value: e.value
		} };
	}(e) : e instanceof K ? function(e) {
		let t = e.getFilters().map(((e) => ao(e)));
		return t.length === 1 ? t[0] : { compositeFilter: {
			op: no(e.op),
			filters: t
		} };
	}(e) : w();
}
function oo(e) {
	let t = [];
	return e.fields.forEach(((e) => t.push(e.canonicalString()))), { fieldPaths: t };
}
function so(e) {
	return e.length >= 4 && e.get(0) === "projects" && e.get(2) === "databases";
}
function co(e, t) {
	let n;
	if (t.document) n = Ha(e.ct, t.document, !!t.hasCommittedMutations);
	else if (t.noDocument) {
		let e = B.fromSegments(t.noDocument.path), r = po(t.noDocument.readTime);
		n = If.newNoDocument(e, r), t.hasCommittedMutations && n.setHasCommittedMutations();
	} else {
		if (!t.unknownDocument) return w();
		{
			let e = B.fromSegments(t.unknownDocument.path), r = po(t.unknownDocument.version);
			n = If.newUnknownDocument(e, r);
		}
	}
	return t.readTime && n.setReadTime(function(e) {
		let t = new I(e[0], e[1]);
		return L.fromTimestamp(t);
	}(t.readTime)), n;
}
function lo(e, t) {
	let n = t.key, r = {
		prefixPath: n.getCollectionPath().popLast().toArray(),
		collectionGroup: n.collectionGroup,
		documentId: n.path.lastSegment(),
		readTime: uo(t.readTime),
		hasCommittedMutations: t.hasCommittedMutations
	};
	if (t.isFoundDocument()) r.document = function(e, t) {
		return {
			name: Fa(e, t.key),
			fields: t.data.value.mapValue.fields,
			updateTime: ka(e, t.version.toTimestamp()),
			createTime: ka(e, t.createTime.toTimestamp())
		};
	}(e.ct, t);
	else if (t.isNoDocument()) r.noDocument = {
		path: n.path.toArray(),
		readTime: fo(t.version)
	};
	else {
		if (!t.isUnknownDocument()) return w();
		r.unknownDocument = {
			path: n.path.toArray(),
			version: fo(t.version)
		};
	}
	return r;
}
function uo(e) {
	let t = e.toTimestamp();
	return [t.seconds, t.nanoseconds];
}
function fo(e) {
	let t = e.toTimestamp();
	return {
		seconds: t.seconds,
		nanoseconds: t.nanoseconds
	};
}
function po(e) {
	let t = new I(e.seconds, e.nanoseconds);
	return L.fromTimestamp(t);
}
function mo(e, t) {
	let n = (t.baseMutations || []).map(((t) => Ka(e.ct, t)));
	for (let e = 0; e < t.mutations.length - 1; ++e) {
		let n = t.mutations[e];
		e + 1 < t.mutations.length && t.mutations[e + 1].transform !== void 0 && (n.updateTransforms = t.mutations[e + 1].transform.fieldTransforms, t.mutations.splice(e + 1, 1), ++e);
	}
	let r = t.mutations.map(((t) => Ka(e.ct, t))), i = I.fromMillis(t.localWriteTimeMs);
	return new pp(t.batchId, i, n, r);
}
function ho(e) {
	let t = po(e.readTime), n = e.lastLimboFreeSnapshotVersion === void 0 ? L.min() : po(e.lastLimboFreeSnapshotVersion), r;
	return r = function(e) {
		return e.documents !== void 0;
	}(e.query) ? function(e) {
		return T(e.documents.length === 1), Ii(Mi(Ra(e.documents[0])));
	}(e.query) : function(e) {
		return Ii(Za(e));
	}(e.query), new Pp(r, e.targetId, "TargetPurposeListen", e.lastListenSequenceNumber, t, n, W.fromBase64String(e.resumeToken));
}
function go(e, t) {
	let n = fo(t.snapshotVersion), r = fo(t.lastLimboFreeSnapshotVersion), i;
	i = Di(t.target) ? Ja(e.ct, t.target) : Ya(e.ct, t.target)._t;
	let a = t.resumeToken.toBase64();
	return {
		targetId: t.targetId,
		canonicalId: Ti(t.target),
		readTime: n,
		resumeToken: a,
		lastListenSequenceNumber: t.sequenceNumber,
		lastLimboFreeSnapshotVersion: r,
		query: i
	};
}
function _o(e) {
	let t = Za({
		parent: e.parent,
		structuredQuery: e.structuredQuery
	});
	return e.limitType === "LAST" ? Bi(t, t.limit, "L") : t;
}
function vo(e, t) {
	return new hp(t.largestBatchId, Ka(e.ct, t.overlayMutation));
}
function yo(e, t) {
	let n = t.path.lastSegment();
	return [
		e,
		Er(t.path.popLast()),
		n
	];
}
function bo(e, t, n, r) {
	return {
		indexId: e,
		uid: t,
		sequenceNumber: n,
		readTime: fo(r.readTime),
		documentKey: Er(r.documentKey.path),
		largestBatchId: r.largestBatchId
	};
}
function xo(e) {
	return O(e, "bundles");
}
function So(e) {
	return O(e, "namedQueries");
}
function Co(e) {
	return O(e, "documentOverlays");
}
function wo(e) {
	if (e === 0) return 8;
	let t = 0;
	return !(e >> 4) && (t += 4, e <<= 4), !(e >> 6) && (t += 2, e <<= 2), !(e >> 7) && (t += 1), t;
}
function To(e) {
	let t = 64 - function(e) {
		let t = 0;
		for (let n = 0; n < 8; ++n) {
			let r = wo(255 & e[n]);
			if (t += r, r !== 8) break;
		}
		return t;
	}(e);
	return Math.ceil(t / 8);
}
function Eo(e, t) {
	let n = e.indexId - t.indexId;
	return n === 0 ? (n = Do(e.arrayValue, t.arrayValue), n === 0 ? (n = Do(e.directionalValue, t.directionalValue), n === 0 ? B.comparator(e.documentKey, t.documentKey) : n) : n) : n;
}
function Do(e, t) {
	for (let n = 0; n < e.length && n < t.length; ++n) {
		let r = e[n] - t[n];
		if (r !== 0) return r;
	}
	return e.length - t.length;
}
function Oo(e) {
	if (T(e instanceof G || e instanceof K), e instanceof G) {
		if (e instanceof Wf) {
			let t = (e.value.arrayValue?.values)?.map(((t) => G.create(e.field, "==", t))) || [];
			return K.create(t, "or");
		}
		return e;
	}
	let t = e.filters.map(((e) => Oo(e)));
	return K.create(t, e.op);
}
function ko(e) {
	if (e.getFilters().length === 0) return [];
	let t = No(Oo(e));
	return T(Mo(t)), Ao(t) || jo(t) ? [t] : t.getFilters();
}
function Ao(e) {
	return e instanceof G;
}
function jo(e) {
	return e instanceof K && _i(e);
}
function Mo(e) {
	return Ao(e) || jo(e) || function(e) {
		if (e instanceof K && gi(e)) {
			for (let t of e.getFilters()) if (!Ao(t) && !jo(t)) return !1;
			return !0;
		}
		return !1;
	}(e);
}
function No(e) {
	if (T(e instanceof G || e instanceof K), e instanceof G) return e;
	if (e.filters.length === 1) return No(e.filters[0]);
	let t = e.filters.map(((e) => No(e))), n = K.create(t, e.op);
	return n = Io(n), Mo(n) ? n : (T(n instanceof K), T(hi(n)), T(n.filters.length > 1), n.filters.reduce(((e, t) => Po(e, t))));
}
function Po(e, t) {
	let n;
	return T(e instanceof G || e instanceof K), T(t instanceof G || t instanceof K), n = e instanceof G ? t instanceof G ? function(e, t) {
		return K.create([e, t], "and");
	}(e, t) : Fo(e, t) : t instanceof G ? Fo(t, e) : function(e, t) {
		if (T(e.filters.length > 0 && t.filters.length > 0), hi(e) && hi(t)) return xi(e, t.getFilters());
		let n = gi(e) ? e : t, r = gi(e) ? t : e, i = n.filters.map(((e) => Po(e, r)));
		return K.create(i, "or");
	}(e, t), Io(n);
}
function Fo(e, t) {
	if (hi(t)) return xi(t, e.getFilters());
	{
		let n = t.filters.map(((t) => Po(e, t)));
		return K.create(n, "or");
	}
}
function Io(e) {
	if (T(e instanceof G || e instanceof K), e instanceof G) return e;
	let t = e.getFilters();
	if (t.length === 1) return Io(t[0]);
	if (vi(e)) return e;
	let n = t.map(((e) => Io(e))), r = [];
	return n.forEach(((t) => {
		t instanceof G ? r.push(t) : t instanceof K && (t.op === e.op ? r.push(...t.filters) : r.push(t));
	})), r.length === 1 ? r[0] : K.create(r, e.op);
}
function Lo(e) {
	return O(e, "collectionParents");
}
function Ro(e) {
	return O(e, "indexEntries");
}
function zo(e) {
	return O(e, "indexConfiguration");
}
function Bo(e) {
	return O(e, "indexState");
}
function Vo(e) {
	T(e.length !== 0);
	let t = e[0].indexState.offset, n = t.largestBatchId;
	for (let r = 1; r < e.length; r++) {
		let i = e[r].indexState.offset;
		_r(i, t) < 0 && (t = i), n < i.largestBatchId && (n = i.largestBatchId);
	}
	return new Vd(t.readTime, t.documentKey, n);
}
function Ho(e, t, n) {
	let r = e.store("mutations"), i = e.store("documentMutations"), a = [], o = IDBKeyRange.only(n.batchId), s = 0, c = r.J({ range: o }, ((e, t, n) => (s++, n.delete())));
	a.push(c.next((() => {
		T(s === 1);
	})));
	let l = [];
	for (let e of n.mutations) {
		let r = jr(t, e.key.path, n.batchId);
		a.push(i.delete(r)), l.push(e.key);
	}
	return V.waitFor(a).next((() => l));
}
function Uo(e) {
	if (!e) return 0;
	let t;
	if (e.document) t = e.document;
	else if (e.unknownDocument) t = e.unknownDocument;
	else {
		if (!e.noDocument) throw w();
		t = e.noDocument;
	}
	return JSON.stringify(t).length;
}
function Wo(e, t, n) {
	let r = Ar(t, n.path), i = r[1], a = IDBKeyRange.lowerBound(r), o = !1;
	return Ko(e).J({
		range: a,
		H: !0
	}, ((e, n, r) => {
		let [a, s, c] = e;
		a === t && s === i && (o = !0), r.done();
	})).next((() => o));
}
function Go(e) {
	return O(e, "mutations");
}
function Ko(e) {
	return O(e, "documentMutations");
}
function qo(e) {
	return O(e, "mutationQueues");
}
function Jo(e) {
	return O(e, "targets");
}
function Yo(e) {
	return O(e, "targetGlobal");
}
function Xo(e) {
	return O(e, "targetDocuments");
}
function Zo([e, t], [n, r]) {
	let i = D(e, n);
	return i === 0 ? D(t, r) : i;
}
function Qo(e, t) {
	return new rm(e, t);
}
function $o(e, t) {
	return Xo(e).put(function(e, t) {
		return {
			targetId: 0,
			path: Er(e.path),
			sequenceNumber: t
		};
	}(t, e.currentSequenceNumber));
}
function es(e) {
	return new om(e);
}
function ts(e) {
	return O(e, "remoteDocumentGlobal");
}
function ns(e) {
	return O(e, "remoteDocumentsV14");
}
function rs(e) {
	let t = e.path.toArray();
	return [
		t.slice(0, t.length - 2),
		t[t.length - 2],
		t[t.length - 1]
	];
}
function is(e, t) {
	let n = t.documentKey.path.toArray();
	return [
		e,
		uo(t.readTime),
		n.slice(0, n.length - 2),
		n.length > 0 ? n[n.length - 1] : ""
	];
}
function as(e, t) {
	let n = e.path.toArray(), r = t.path.toArray(), i = 0;
	for (let e = 0; e < n.length - 2 && e < r.length - 2; ++e) if (i = D(n[e], r[e]), i) return i;
	return i = D(n.length, r.length), i || (i = D(n[n.length - 2], r[r.length - 2]), i || D(n[n.length - 1], r[r.length - 1]));
}
function os(e) {
	e.createObjectStore("targetDocuments", { keyPath: of }).createIndex("documentTargetsIndex", sf, { unique: !0 }), e.createObjectStore("targets", { keyPath: "targetId" }).createIndex("queryTargetsIndex", af, { unique: !0 }), e.createObjectStore("targetGlobal");
}
function ss(e) {
	return O(e, "owner");
}
function cs(e) {
	return O(e, "clientMetadata");
}
function ls(e, t) {
	let n = e.projectId;
	return e.isDefaultDatabase || (n += "." + e.database), "firestore/" + t + "/" + n + "/";
}
function us(e, t, n, r) {
	return new km(e, t, n, r);
}
async function ds(e, t) {
	let n = E(e);
	return await n.persistence.runTransaction("Handle user change", "readonly", ((e) => {
		let r;
		return n.mutationQueue.getAllMutationBatches(e).next(((i) => (r = i, n.ls(t), n.mutationQueue.getAllMutationBatches(e)))).next(((t) => {
			let i = [], a = [], o = A();
			for (let e of r) {
				i.push(e.batchId);
				for (let t of e.mutations) o = o.add(t.key);
			}
			for (let e of t) {
				a.push(e.batchId);
				for (let t of e.mutations) o = o.add(t.key);
			}
			return n.localDocuments.getDocuments(e, o).next(((e) => ({
				hs: e,
				removedBatchIds: i,
				addedBatchIds: a
			})));
		}));
	}));
}
function fs(e, t) {
	let n = E(e);
	return n.persistence.runTransaction("Acknowledge batch", "readwrite-primary", ((e) => {
		let r = t.batch.keys(), i = n.cs.newChangeBuffer({ trackRemovals: !0 });
		return function(e, t, n, r) {
			let i = n.batch, a = i.keys(), o = V.resolve();
			return a.forEach(((e) => {
				o = o.next((() => r.getEntry(t, e))).next(((t) => {
					let a = n.docVersions.get(e);
					T(a !== null), t.version.compareTo(a) < 0 && (i.applyToRemoteDocument(t, n), t.isValidDocument() && (t.setReadTime(n.commitVersion), r.addEntry(t)));
				}));
			})), o.next((() => e.mutationQueue.removeMutationBatch(t, i)));
		}(n, e, t, i).next((() => i.apply(e))).next((() => n.mutationQueue.performConsistencyCheck(e))).next((() => n.documentOverlayCache.removeOverlaysForBatchId(e, r, t.batch.batchId))).next((() => n.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(e, function(e) {
			let t = A();
			for (let n = 0; n < e.mutationResults.length; ++n) e.mutationResults[n].transformResults.length > 0 && (t = t.add(e.batch.mutations[n].key));
			return t;
		}(t)))).next((() => n.localDocuments.getDocuments(e, r)));
	}));
}
function ps(e) {
	let t = E(e);
	return t.persistence.runTransaction("Get last remote snapshot version", "readonly", ((e) => t.Ur.getLastRemoteSnapshotVersion(e)));
}
function ms(e, t) {
	let n = E(e), r = t.snapshotVersion, i = n.os;
	return n.persistence.runTransaction("Apply remote event", "readwrite-primary", ((e) => {
		let a = n.cs.newChangeBuffer({ trackRemovals: !0 });
		i = n.os;
		let o = [];
		t.targetChanges.forEach(((a, s) => {
			let c = i.get(s);
			if (!c) return;
			o.push(n.Ur.removeMatchingKeys(e, a.removedDocuments, s).next((() => n.Ur.addMatchingKeys(e, a.addedDocuments, s))));
			let l = c.withSequenceNumber(e.currentSequenceNumber);
			t.targetMismatches.get(s) === null ? a.resumeToken.approximateByteSize() > 0 && (l = l.withResumeToken(a.resumeToken, r)) : l = l.withResumeToken(W.EMPTY_BYTE_STRING, L.min()).withLastLimboFreeSnapshotVersion(L.min()), i = i.insert(s, l), function(e, t, n) {
				return e.resumeToken.approximateByteSize() === 0 || t.snapshotVersion.toMicroseconds() - e.snapshotVersion.toMicroseconds() >= 3e8 || n.addedDocuments.size + n.modifiedDocuments.size + n.removedDocuments.size > 0;
			}(c, l, a) && o.push(n.Ur.updateTargetData(e, l));
		}));
		let s = Ji(), c = A();
		if (t.documentUpdates.forEach(((r) => {
			t.resolvedLimboDocuments.has(r) && o.push(n.persistence.referenceDelegate.updateLimboDocument(e, r));
		})), o.push(hs(e, a, t.documentUpdates).next(((e) => {
			s = e.Ps, c = e.Is;
		}))), !r.isEqual(L.min())) {
			let t = n.Ur.getLastRemoteSnapshotVersion(e).next(((t) => n.Ur.setTargetsMetadata(e, e.currentSequenceNumber, r)));
			o.push(t);
		}
		return V.waitFor(o).next((() => a.apply(e))).next((() => n.localDocuments.getLocalViewOfDocuments(e, s, c))).next((() => s));
	})).then(((e) => (n.os = i, e)));
}
function hs(e, t, n) {
	let r = A(), i = A();
	return n.forEach(((e) => r = r.add(e))), t.getEntries(e, r).next(((e) => {
		let r = Ji();
		return n.forEach(((n, a) => {
			let o = e.get(n);
			a.isFoundDocument() !== o.isFoundDocument() && (i = i.add(n)), a.isNoDocument() && a.version.isEqual(L.min()) ? (t.removeEntry(n, a.readTime), r = r.insert(n, a)) : !o.isValidDocument() || a.version.compareTo(o.version) > 0 || a.version.compareTo(o.version) === 0 && o.hasPendingWrites ? (t.addEntry(a), r = r.insert(n, a)) : S("LocalStore", "Ignoring outdated watch update for ", n, ". Current version:", o.version, " Watch version:", a.version);
		})), {
			Ps: r,
			Is: i
		};
	}));
}
function gs(e, t) {
	let n = E(e);
	return n.persistence.runTransaction("Get next mutation batch", "readonly", ((e) => (t === void 0 && (t = -1), n.mutationQueue.getNextMutationBatchAfterBatchId(e, t))));
}
function _s(e, t) {
	let n = E(e);
	return n.persistence.runTransaction("Allocate target", "readwrite", ((e) => {
		let r;
		return n.Ur.getTargetData(e, t).next(((i) => i ? (r = i, V.resolve(r)) : n.Ur.allocateTargetId(e).next(((i) => (r = new Pp(t, i, "TargetPurposeListen", e.currentSequenceNumber), n.Ur.addTargetData(e, r).next((() => r)))))));
	})).then(((e) => {
		let r = n.os.get(e.targetId);
		return (r === null || e.snapshotVersion.compareTo(r.snapshotVersion) > 0) && (n.os = n.os.insert(e.targetId, e), n._s.set(t, e.targetId)), e;
	}));
}
async function vs(e, t, n) {
	let r = E(e), i = r.os.get(t), a = n ? "readwrite" : "readwrite-primary";
	try {
		n || await r.persistence.runTransaction("Release target", a, ((e) => r.persistence.referenceDelegate.removeTarget(e, i)));
	} catch (e) {
		if (!br(e)) throw e;
		S("LocalStore", `Failed to update sequence numbers for target ${t}: ${e}`);
	}
	r.os = r.os.remove(t), r._s.delete(i.target);
}
function ys(e, t, n) {
	let r = E(e), i = L.min(), a = A();
	return r.persistence.runTransaction("Execute query", "readwrite", ((e) => function(e, t, n) {
		let r = E(e), i = r._s.get(n);
		return i === void 0 ? r.Ur.getTargetData(t, n) : V.resolve(r.os.get(i));
	}(r, e, Ii(t)).next(((t) => {
		if (t) return i = t.lastLimboFreeSnapshotVersion, r.Ur.getMatchingKeysForTargetId(e, t.targetId).next(((e) => {
			a = e;
		}));
	})).next((() => r.ss.getDocumentsMatchingQuery(e, t, n ? i : L.min(), n ? a : A()))).next(((e) => (Ss(r, Gi(t), e), {
		documents: e,
		Ts: a
	})))));
}
function bs(e, t) {
	let n = E(e), r = E(n.Ur), i = n.os.get(t);
	return i ? Promise.resolve(i.target) : n.persistence.runTransaction("Get target data", "readonly", ((e) => r.ot(e, t).next(((e) => e ? e.target : null))));
}
function xs(e, t) {
	let n = E(e), r = n.us.get(t) || L.min();
	return n.persistence.runTransaction("Get new document changes", "readonly", ((e) => n.cs.getAllFromCollectionGroup(e, t, hr(r, -1), 2 ** 53 - 1))).then(((e) => (Ss(n, t, e), e)));
}
function Ss(e, t, n) {
	let r = e.us.get(t) || L.min();
	n.forEach(((e, t) => {
		t.readTime.compareTo(r) > 0 && (r = t.readTime);
	})), e.us.set(t, r);
}
async function Cs(e, t, n, r) {
	let i = E(e), a = A(), o = Ji();
	for (let e of n) {
		let n = t.Es(e.metadata.name);
		e.document && (a = a.add(n));
		let r = t.ds(e);
		r.setReadTime(t.As(e.metadata.readTime)), o = o.insert(n, r);
	}
	let s = i.cs.newChangeBuffer({ trackRemovals: !0 }), c = await _s(i, function(e) {
		return Ii(Mi(R.fromString(`__bundle__/docs/${e}`)));
	}(r));
	return i.persistence.runTransaction("Apply bundle documents", "readwrite", ((e) => hs(e, s, o).next(((t) => (s.apply(e), t))).next(((t) => i.Ur.removeMatchingKeysForTargetId(e, c.targetId).next((() => i.Ur.addMatchingKeys(e, a, c.targetId))).next((() => i.localDocuments.getLocalViewOfDocuments(e, t.Ps, t.Is))).next((() => t.Ps))))));
}
async function ws(e, t, n = A()) {
	let r = await _s(e, Ii(_o(t.bundledQuery))), i = E(e);
	return i.persistence.runTransaction("Save named query", "readwrite", ((e) => {
		let a = j(t.readTime);
		if (r.snapshotVersion.compareTo(a) >= 0) return i.Gr.saveNamedQuery(e, t);
		let o = r.withResumeToken(W.EMPTY_BYTE_STRING, a);
		return i.os = i.os.insert(o.targetId, o), i.Ur.updateTargetData(e, o).next((() => i.Ur.removeMatchingKeysForTargetId(e, r.targetId))).next((() => i.Ur.addMatchingKeys(e, n, r.targetId))).next((() => i.Gr.saveNamedQuery(e, t)));
	}));
}
function Ts(e, t) {
	return `firestore_clients_${e}_${t}`;
}
function Es(e, t, n) {
	let r = `firestore_mutations_${e}_${n}`;
	return t.isAuthenticated() && (r += `_${t.uid}`), r;
}
function Ds(e, t) {
	return `firestore_targets_${e}_${t}`;
}
function Os() {
	return zm === null ? zm = function() {
		return 268435456 + Math.round(2147483648 * Math.random());
	}() : zm++, "0x" + zm.toString(16);
}
function ks() {
	return typeof window < "u" ? window : null;
}
function As() {
	return typeof document < "u" ? document : null;
}
function js(e) {
	return new Np(e, !0);
}
async function Ms(e) {
	if (Bs(e)) for (let t of e.B_) await t(!0);
}
async function Ns(e) {
	for (let t of e.B_) await t(!1);
}
function Ps(e, t) {
	let n = E(e);
	n.N_.has(t.targetId) || (n.N_.set(t.targetId, t), zs(n) ? Rs(n) : ac(n).r_() && Is(n, t));
}
function Fs(e, t) {
	let n = E(e), r = ac(n);
	n.N_.delete(t), r.r_() && Ls(n, t), n.N_.size === 0 && (r.r_() ? r.o_() : Bs(n) && n.q_.set("Unknown"));
}
function Is(e, t) {
	if (e.Q_.xe(t.targetId), t.resumeToken.approximateByteSize() > 0 || t.snapshotVersion.compareTo(L.min()) > 0) {
		let n = e.remoteSyncer.getRemoteKeysForTarget(t.targetId).size;
		t = t.withExpectedCount(n);
	}
	ac(e).A_(t);
}
function Ls(e, t) {
	e.Q_.xe(t), ac(e).R_(t);
}
function Rs(e) {
	e.Q_ = new kp({
		getRemoteKeysForTarget: (t) => e.remoteSyncer.getRemoteKeysForTarget(t),
		ot: (t) => e.N_.get(t) || null,
		tt: () => e.datastore.serializer.databaseId
	}), ac(e).start(), e.q_.v_();
}
function zs(e) {
	return Bs(e) && !ac(e).n_() && e.N_.size > 0;
}
function Bs(e) {
	return E(e).L_.size === 0;
}
function Vs(e) {
	e.Q_ = void 0;
}
async function Hs(e) {
	e.q_.set("Online");
}
async function Us(e) {
	e.N_.forEach(((t, n) => {
		Is(e, t);
	}));
}
async function Ws(e, t) {
	Vs(e), zs(e) ? (e.q_.M_(t), Rs(e)) : e.q_.set("Unknown");
}
async function Gs(e, t, n) {
	if (e.q_.set("Online"), t instanceof Dp && t.state === 2 && t.cause) try {
		await async function(e, t) {
			let n = t.cause;
			for (let r of t.targetIds) e.N_.has(r) && (await e.remoteSyncer.rejectListen(r, n), e.N_.delete(r), e.Q_.removeTarget(r));
		}(e, t);
	} catch (n) {
		S("RemoteStore", "Failed to remove targets %s: %s ", t.targetIds.join(","), n), await Ks(e, n);
	}
	else if (t instanceof Tp ? e.Q_.Ke(t) : t instanceof Ep ? e.Q_.He(t) : e.Q_.We(t), !n.isEqual(L.min())) try {
		let t = await ps(e.localStore);
		n.compareTo(t) >= 0 && await function(e, t) {
			let n = e.Q_.rt(t);
			return n.targetChanges.forEach(((n, r) => {
				if (n.resumeToken.approximateByteSize() > 0) {
					let i = e.N_.get(r);
					i && e.N_.set(r, i.withResumeToken(n.resumeToken, t));
				}
			})), n.targetMismatches.forEach(((t, n) => {
				let r = e.N_.get(t);
				r && (e.N_.set(t, r.withResumeToken(W.EMPTY_BYTE_STRING, r.snapshotVersion)), Ls(e, t), Is(e, new Pp(r.target, t, n, r.sequenceNumber)));
			})), e.remoteSyncer.applyRemoteEvent(n);
		}(e, n);
	} catch (t) {
		S("RemoteStore", "Failed to raise snapshot:", t), await Ks(e, t);
	}
}
async function Ks(e, t, n) {
	if (!br(t)) throw t;
	e.L_.add(1), await Ns(e), e.q_.set("Offline"), n ||= () => ps(e.localStore), e.asyncQueue.enqueueRetryable((async () => {
		S("RemoteStore", "Retrying IndexedDB access"), await n(), e.L_.delete(1), await Ms(e);
	}));
}
function qs(e, t) {
	return t().catch(((n) => Ks(e, n, t)));
}
async function Js(e) {
	let t = E(e), n = oc(t), r = t.O_.length > 0 ? t.O_[t.O_.length - 1].batchId : -1;
	for (; Ys(t);) try {
		let e = await gs(t.localStore, r);
		if (e === null) {
			t.O_.length === 0 && n.o_();
			break;
		}
		r = e.batchId, Xs(t, e);
	} catch (e) {
		await Ks(t, e);
	}
	Zs(t) && Qs(t);
}
function Ys(e) {
	return Bs(e) && e.O_.length < 10;
}
function Xs(e, t) {
	e.O_.push(t);
	let n = oc(e);
	n.r_() && n.V_ && n.m_(t.mutations);
}
function Zs(e) {
	return Bs(e) && !oc(e).n_() && e.O_.length > 0;
}
function Qs(e) {
	oc(e).start();
}
async function $s(e) {
	oc(e).p_();
}
async function ec(e) {
	let t = oc(e);
	for (let n of e.O_) t.m_(n.mutations);
}
async function tc(e, t, n) {
	let r = e.O_.shift(), i = mp.from(r, t, n);
	await qs(e, (() => e.remoteSyncer.applySuccessfulWrite(i))), await Js(e);
}
async function nc(e, t) {
	t && oc(e).V_ && await async function(e, t) {
		if (function(e) {
			return xa(e) && e !== P.ABORTED;
		}(t.code)) {
			let n = e.O_.shift();
			oc(e).s_(), await qs(e, (() => e.remoteSyncer.rejectFailedWrite(n.batchId, t))), await Js(e);
		}
	}(e, t), Zs(e) && Qs(e);
}
async function rc(e, t) {
	let n = E(e);
	n.asyncQueue.verifyOperationInProgress(), S("RemoteStore", "RemoteStore received new credentials");
	let r = Bs(n);
	n.L_.add(3), await Ns(n), r && n.q_.set("Unknown"), await n.remoteSyncer.handleCredentialChange(t), n.L_.delete(3), await Ms(n);
}
async function ic(e, t) {
	let n = E(e);
	t ? (n.L_.delete(2), await Ms(n)) : t || (n.L_.add(2), await Ns(n), n.q_.set("Unknown"));
}
function ac(e) {
	return e.K_ || (e.K_ = function(e, t, n) {
		let r = E(e);
		return r.w_(), new Km(t, r.connection, r.authCredentials, r.appCheckCredentials, r.serializer, n);
	}(e.datastore, e.asyncQueue, {
		Eo: Hs.bind(null, e),
		Ro: Us.bind(null, e),
		mo: Ws.bind(null, e),
		d_: Gs.bind(null, e)
	}), e.B_.push((async (t) => {
		t ? (e.K_.s_(), zs(e) ? Rs(e) : e.q_.set("Unknown")) : (await e.K_.stop(), Vs(e));
	}))), e.K_;
}
function oc(e) {
	return e.U_ || (e.U_ = function(e, t, n) {
		let r = E(e);
		return r.w_(), new qm(t, r.connection, r.authCredentials, r.appCheckCredentials, r.serializer, n);
	}(e.datastore, e.asyncQueue, {
		Eo: () => Promise.resolve(),
		Ro: $s.bind(null, e),
		mo: nc.bind(null, e),
		f_: ec.bind(null, e),
		g_: tc.bind(null, e)
	}), e.B_.push((async (t) => {
		t ? (e.U_.s_(), await Js(e)) : (await e.U_.stop(), e.O_.length > 0 && (S("RemoteStore", `Stopping write stream with ${e.O_.length} pending writes`), e.O_ = []));
	}))), e.U_;
}
function sc(e, t) {
	if (C("AsyncQueue", `${t}: ${e}`), br(e)) return new F(P.UNAVAILABLE, `${t}: ${e}`);
	throw e;
}
function cc() {
	return new Yf(((e) => Hi(e)), Vi);
}
async function lc(e, t) {
	let n = E(e), r = 3, i = t.query, a = n.queries.get(i);
	a ? !a.H_() && t.J_() && (r = 2) : (a = new th(), r = +!t.J_());
	try {
		switch (r) {
			case 0:
				a.z_ = await n.onListen(i, !0);
				break;
			case 1:
				a.z_ = await n.onListen(i, !1);
				break;
			case 2: await n.onFirstRemoteStoreListen(i);
		}
	} catch (e) {
		let n = sc(e, `Initialization of query '${Ui(t.query)}' failed`);
		t.onError(n);
		return;
	}
	n.queries.set(i, a), a.j_.push(t), t.Z_(n.onlineState), a.z_ && t.X_(a.z_) && pc(n);
}
async function uc(e, t) {
	let n = E(e), r = t.query, i = 3, a = n.queries.get(r);
	if (a) {
		let e = a.j_.indexOf(t);
		e >= 0 && (a.j_.splice(e, 1), a.j_.length === 0 ? i = +!t.J_() : !a.H_() && t.J_() && (i = 2));
	}
	switch (i) {
		case 0: return n.queries.delete(r), n.onUnlisten(r, !0);
		case 1: return n.queries.delete(r), n.onUnlisten(r, !1);
		case 2: return n.onLastRemoteStoreUnlisten(r);
		default: return;
	}
}
function dc(e, t) {
	let n = E(e), r = !1;
	for (let e of t) {
		let t = e.query, i = n.queries.get(t);
		if (i) {
			for (let t of i.j_) t.X_(e) && (r = !0);
			i.z_ = e;
		}
	}
	r && pc(n);
}
function fc(e, t, n) {
	let r = E(e), i = r.queries.get(t);
	if (i) for (let e of i.j_) e.onError(n);
	r.queries.delete(t);
}
function pc(e) {
	e.Y_.forEach(((e) => {
		e.next();
	}));
}
function mc(e) {
	return {
		taskState: "Running",
		documentsLoaded: 0,
		bytesLoaded: 0,
		totalDocuments: e.totalDocuments,
		totalBytes: e.totalBytes
	};
}
async function hc(e, t, n = !0) {
	let r = qc(e), i, a = r.Fa.get(t);
	return a ? (r.sharedClientState.addLocalQueryTarget(a.targetId), i = a.view.Da()) : i = await _c(r, t, n, !0), i;
}
async function gc(e, t) {
	await _c(qc(e), t, !0, !1);
}
async function _c(e, t, n, r) {
	let i = await _s(e.localStore, Ii(t)), a = i.targetId, o = e.sharedClientState.addLocalQueryTarget(a, n), s;
	return r && (s = await vc(e, t, a, o === "current", i.resumeToken)), e.isPrimaryClient && n && Ps(e.remoteStore, i), s;
}
async function vc(e, t, n, r, i) {
	e.Ka = (t, n, r) => async function(e, t, n, r) {
		let i = t.view.ma(n);
		i.ns && (i = await ys(e.localStore, t.query, !1).then((({ documents: e }) => t.view.ma(e, i))));
		let a = r && r.targetChanges.get(t.targetId), o = r && r.targetMismatches.get(t.targetId) != null, s = t.view.applyChanges(i, e.isPrimaryClient, a, o);
		return Mc(e, t.targetId, s.wa), s.snapshot;
	}(e, t, n, r);
	let a = await ys(e.localStore, t, !0), o = new dh(t, a.Ts), s = o.ma(a.documents), c = wp.createSynthesizedTargetChangeForCurrentChange(n, r && e.onlineState !== "Offline", i), l = o.applyChanges(s, e.isPrimaryClient, c);
	Mc(e, n, l.wa);
	let u = new fh(t, n, o);
	return e.Fa.set(t, u), e.Ma.has(n) ? e.Ma.get(n).push(t) : e.Ma.set(n, [t]), l.snapshot;
}
async function yc(e, t, n) {
	let r = E(e), i = r.Fa.get(t), a = r.Ma.get(i.targetId);
	if (a.length > 1) return r.Ma.set(i.targetId, a.filter(((e) => !Vi(e, t)))), void r.Fa.delete(t);
	r.isPrimaryClient ? (r.sharedClientState.removeLocalQueryTarget(i.targetId), r.sharedClientState.isActiveQueryTarget(i.targetId) || await vs(r.localStore, i.targetId, !1).then((() => {
		r.sharedClientState.clearQueryState(i.targetId), n && Fs(r.remoteStore, i.targetId), Ac(r, i.targetId);
	})).catch(vr)) : (Ac(r, i.targetId), await vs(r.localStore, i.targetId, !0));
}
async function bc(e, t) {
	let n = E(e), r = n.Fa.get(t), i = n.Ma.get(r.targetId);
	n.isPrimaryClient && i.length === 1 && (n.sharedClientState.removeLocalQueryTarget(r.targetId), Fs(n.remoteStore, r.targetId));
}
async function xc(e, t, n) {
	let r = Jc(e);
	try {
		let e = await function(e, t) {
			let n = E(e), r = I.now(), i = t.reduce(((e, t) => e.add(t.key)), A()), a, o;
			return n.persistence.runTransaction("Locally write mutations", "readwrite", ((e) => {
				let s = Ji(), c = A();
				return n.cs.getEntries(e, i).next(((e) => {
					s = e, s.forEach(((e, t) => {
						t.isValidDocument() || (c = c.add(e));
					}));
				})).next((() => n.localDocuments.getOverlayedDocuments(e, s))).next(((i) => {
					a = i;
					let o = [];
					for (let e of t) {
						let t = ga(e, a.get(e.key).overlayedDocument);
						t != null && o.push(new up(e.key, t, di(t.value.mapValue), q.exists(!0)));
					}
					return n.mutationQueue.addMutationBatch(e, r, o, t);
				})).next(((t) => {
					o = t;
					let r = t.applyToLocalDocumentSet(a, c);
					return n.documentOverlayCache.saveOverlays(e, t.batchId, r);
				}));
			})).then((() => ({
				batchId: o.batchId,
				changes: Xi(a)
			})));
		}(r.localStore, t);
		r.sharedClientState.addPendingMutation(e.batchId), function(e, t, n) {
			let r = e.Ba[e.currentUser.toKey()];
			r ||= new H(D), r = r.insert(t, n), e.Ba[e.currentUser.toKey()] = r;
		}(r, e.batchId, n), await Fc(r, e.changes), await Js(r.remoteStore);
	} catch (e) {
		let t = sc(e, "Failed to persist write");
		n.reject(t);
	}
}
async function Sc(e, t) {
	let n = E(e);
	try {
		let e = await ms(n.localStore, t);
		t.targetChanges.forEach(((e, t) => {
			let r = n.Na.get(t);
			r && (T(e.addedDocuments.size + e.modifiedDocuments.size + e.removedDocuments.size <= 1), e.addedDocuments.size > 0 ? r.va = !0 : e.modifiedDocuments.size > 0 ? T(r.va) : e.removedDocuments.size > 0 && (T(r.va), r.va = !1));
		})), await Fc(n, e, t);
	} catch (e) {
		await vr(e);
	}
}
function Cc(e, t, n) {
	let r = E(e);
	if (r.isPrimaryClient && n === 0 || !r.isPrimaryClient && n === 1) {
		let e = [];
		r.Fa.forEach(((n, r) => {
			let i = r.view.Z_(t);
			i.snapshot && e.push(i.snapshot);
		})), function(e, t) {
			let n = E(e);
			n.onlineState = t;
			let r = !1;
			n.queries.forEach(((e, n) => {
				for (let e of n.j_) e.Z_(t) && (r = !0);
			})), r && pc(n);
		}(r.eventManager, t), e.length && r.Ca.d_(e), r.onlineState = t, r.isPrimaryClient && r.sharedClientState.setOnlineState(t);
	}
}
async function wc(e, t, n) {
	let r = E(e);
	r.sharedClientState.updateQueryState(t, "rejected", n);
	let i = r.Na.get(t), a = i && i.key;
	if (a) {
		let e = new H(B.comparator);
		e = e.insert(a, If.newNoDocument(a, L.min()));
		let n = A().add(a);
		await Sc(r, new Cp(L.min(), /* @__PURE__ */ new Map(), new H(D), e, n)), r.Oa = r.Oa.remove(a), r.Na.delete(t), Pc(r);
	} else await vs(r.localStore, t, !1).then((() => Ac(r, t, n))).catch(vr);
}
async function Tc(e, t) {
	let n = E(e), r = t.batch.batchId;
	try {
		let e = await fs(n.localStore, t);
		kc(n, r, null), Oc(n, r), n.sharedClientState.updateMutationState(r, "acknowledged"), await Fc(n, e);
	} catch (e) {
		await vr(e);
	}
}
async function Ec(e, t, n) {
	let r = E(e);
	try {
		let e = await function(e, t) {
			let n = E(e);
			return n.persistence.runTransaction("Reject batch", "readwrite-primary", ((e) => {
				let r;
				return n.mutationQueue.lookupMutationBatch(e, t).next(((t) => (T(t !== null), r = t.keys(), n.mutationQueue.removeMutationBatch(e, t)))).next((() => n.mutationQueue.performConsistencyCheck(e))).next((() => n.documentOverlayCache.removeOverlaysForBatchId(e, r, t))).next((() => n.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(e, r))).next((() => n.localDocuments.getDocuments(e, r)));
			}));
		}(r.localStore, t);
		kc(r, t, n), Oc(r, t), r.sharedClientState.updateMutationState(t, "rejected", n), await Fc(r, e);
	} catch (e) {
		await vr(e);
	}
}
async function Dc(e, t) {
	let n = E(e);
	Bs(n.remoteStore) || S("SyncEngine", "The network is disabled. The task returned by 'awaitPendingWrites()' will not complete until the network is enabled.");
	try {
		let e = await function(e) {
			let t = E(e);
			return t.persistence.runTransaction("Get highest unacknowledged batch id", "readonly", ((e) => t.mutationQueue.getHighestUnacknowledgedBatchId(e)));
		}(n.localStore);
		if (e === -1) return void t.resolve();
		let r = n.ka.get(e) || [];
		r.push(t), n.ka.set(e, r);
	} catch (e) {
		let n = sc(e, "Initialization of waitForPendingWrites() operation failed");
		t.reject(n);
	}
}
function Oc(e, t) {
	(e.ka.get(t) || []).forEach(((e) => {
		e.resolve();
	})), e.ka.delete(t);
}
function kc(e, t, n) {
	let r = E(e), i = r.Ba[r.currentUser.toKey()];
	if (i) {
		let e = i.get(t);
		e && (n ? e.reject(n) : e.resolve(), i = i.remove(t)), r.Ba[r.currentUser.toKey()] = i;
	}
}
function Ac(e, t, n = null) {
	e.sharedClientState.removeLocalQueryTarget(t);
	for (let r of e.Ma.get(t)) e.Fa.delete(r), n && e.Ca.$a(r, n);
	e.Ma.delete(t), e.isPrimaryClient && e.La.gr(t).forEach(((t) => {
		e.La.containsKey(t) || jc(e, t);
	}));
}
function jc(e, t) {
	e.xa.delete(t.path.canonicalString());
	let n = e.Oa.get(t);
	n !== null && (Fs(e.remoteStore, n), e.Oa = e.Oa.remove(t), e.Na.delete(n), Pc(e));
}
function Mc(e, t, n) {
	for (let r of n) r instanceof lh ? (e.La.addReference(r.key, t), Nc(e, r)) : r instanceof uh ? (S("SyncEngine", "Document no longer in limbo: " + r.key), e.La.removeReference(r.key, t), e.La.containsKey(r.key) || jc(e, r.key)) : w();
}
function Nc(e, t) {
	let n = t.key, r = n.path.canonicalString();
	e.Oa.get(n) || e.xa.has(r) || (S("SyncEngine", "New document in limbo: " + n), e.xa.add(r), Pc(e));
}
function Pc(e) {
	for (; e.xa.size > 0 && e.Oa.size < e.maxConcurrentLimboResolutions;) {
		let t = e.xa.values().next().value;
		e.xa.delete(t);
		let n = new B(R.fromString(t)), r = e.qa.next();
		e.Na.set(r, new ph(n)), e.Oa = e.Oa.insert(n, r), Ps(e.remoteStore, new Pp(Ii(Mi(n.path)), r, "TargetPurposeLimboResolution", Qd.oe));
	}
}
async function Fc(e, t, n) {
	let r = E(e), i = [], a = [], o = [];
	r.Fa.isEmpty() || (r.Fa.forEach(((e, s) => {
		o.push(r.Ka(s, t, n).then(((e) => {
			if ((e || n) && r.isPrimaryClient) {
				let t = e ? !e.fromCache : n?.targetChanges.get(s.targetId)?.current;
				r.sharedClientState.updateQueryState(s.targetId, t ? "current" : "not-current");
			}
			if (e) {
				i.push(e);
				let t = Em.Wi(s.targetId, e);
				a.push(t);
			}
		})));
	})), await Promise.all(o), r.Ca.d_(i), await async function(e, t) {
		let n = E(e);
		try {
			await n.persistence.runTransaction("notifyLocalViewChanges", "readwrite", ((e) => V.forEach(t, ((t) => V.forEach(t.$i, ((r) => n.persistence.referenceDelegate.addReference(e, t.targetId, r))).next((() => V.forEach(t.Ui, ((r) => n.persistence.referenceDelegate.removeReference(e, t.targetId, r)))))))));
		} catch (e) {
			if (!br(e)) throw e;
			S("LocalStore", "Failed to update sequence numbers: " + e);
		}
		for (let e of t) {
			let t = e.targetId;
			if (!e.fromCache) {
				let e = n.os.get(t), r = e.snapshotVersion, i = e.withLastLimboFreeSnapshotVersion(r);
				n.os = n.os.insert(t, i);
			}
		}
	}(r.localStore, a));
}
async function Ic(e, t) {
	let n = E(e);
	if (!n.currentUser.isEqual(t)) {
		S("SyncEngine", "User change. New user:", t.toKey());
		let e = await ds(n.localStore, t);
		n.currentUser = t, function(e, t) {
			e.ka.forEach(((e) => {
				e.forEach(((e) => {
					e.reject(new F(P.CANCELLED, t));
				}));
			})), e.ka.clear();
		}(n, "'waitForPendingWrites' promise is rejected due to a user change."), n.sharedClientState.handleUserChange(t, e.removedBatchIds, e.addedBatchIds), await Fc(n, e.hs);
	}
}
function Lc(e, t) {
	let n = E(e), r = n.Na.get(t);
	if (r && r.va) return A().add(r.key);
	{
		let e = A(), r = n.Ma.get(t);
		if (!r) return e;
		for (let t of r) {
			let r = n.Fa.get(t);
			e = e.unionWith(r.view.Va);
		}
		return e;
	}
}
async function Rc(e, t) {
	let n = E(e), r = await ys(n.localStore, t.query, !0), i = t.view.ba(r);
	return n.isPrimaryClient && Mc(n, t.targetId, i.wa), i;
}
async function zc(e, t) {
	let n = E(e);
	return xs(n.localStore, t).then(((e) => Fc(n, e)));
}
async function Bc(e, t, n, r) {
	let i = E(e), a = await function(e, t) {
		let n = E(e), r = E(n.mutationQueue);
		return n.persistence.runTransaction("Lookup mutation documents", "readonly", ((e) => r.Mn(e, t).next(((t) => t ? n.localDocuments.getDocuments(e, t) : V.resolve(null)))));
	}(i.localStore, t);
	a === null ? S("SyncEngine", "Cannot apply mutation batch with id: " + t) : (n === "pending" ? await Js(i.remoteStore) : n === "acknowledged" || n === "rejected" ? (kc(i, t, r || null), Oc(i, t), function(e, t) {
		E(E(e).mutationQueue).On(t);
	}(i.localStore, t)) : w(), await Fc(i, a));
}
async function Vc(e, t) {
	let n = E(e);
	if (qc(n), Jc(n), !0 === t && !0 !== n.Qa) {
		let e = await Hc(n, n.sharedClientState.getAllActiveQueryTargets().toArray());
		n.Qa = !0, await ic(n.remoteStore, !0);
		for (let t of e) Ps(n.remoteStore, t);
	} else if (!1 === t && !1 !== n.Qa) {
		let e = [], t = Promise.resolve();
		n.Ma.forEach(((r, i) => {
			n.sharedClientState.isLocalQueryTarget(i) ? e.push(i) : t = t.then((() => (Ac(n, i), vs(n.localStore, i, !0)))), Fs(n.remoteStore, i);
		})), await t, await Hc(n, e), function(e) {
			let t = E(e);
			t.Na.forEach(((e, n) => {
				Fs(t.remoteStore, n);
			})), t.La.pr(), t.Na = /* @__PURE__ */ new Map(), t.Oa = new H(B.comparator);
		}(n), n.Qa = !1, await ic(n.remoteStore, !1);
	}
}
async function Hc(e, t, n) {
	let r = E(e), i = [], a = [];
	for (let e of t) {
		let t, n = r.Ma.get(e);
		if (n && n.length !== 0) {
			t = await _s(r.localStore, Ii(n[0]));
			for (let e of n) {
				let t = await Rc(r, r.Fa.get(e));
				t.snapshot && a.push(t.snapshot);
			}
		} else {
			let n = await bs(r.localStore, e);
			t = await _s(r.localStore, n), await vc(r, Uc(n), e, !1, t.resumeToken);
		}
		i.push(t);
	}
	return r.Ca.d_(a), i;
}
function Uc(e) {
	return ji(e.path, e.collectionGroup, e.orderBy, e.filters, e.limit, "F", e.startAt, e.endAt);
}
function Wc(e) {
	return function(e) {
		return E(E(e).persistence).Qi();
	}(E(e).localStore);
}
async function Gc(e, t, n, r) {
	let i = E(e);
	if (i.Qa) return void S("SyncEngine", "Ignoring unexpected query state notification.");
	let a = i.Ma.get(t);
	if (a && a.length > 0) switch (n) {
		case "current":
		case "not-current":
			await Fc(i, await xs(i.localStore, Gi(a[0])), Cp.createSynthesizedRemoteEventForCurrentChange(t, n === "current", W.EMPTY_BYTE_STRING));
			break;
		case "rejected":
			await vs(i.localStore, t, !0), Ac(i, t, r);
			break;
		default: w();
	}
}
async function Kc(e, t, n) {
	let r = qc(e);
	if (r.Qa) {
		for (let e of t) {
			if (r.Ma.has(e) && r.sharedClientState.isActiveQueryTarget(e)) {
				S("SyncEngine", "Adding an already active target " + e);
				continue;
			}
			let t = await bs(r.localStore, e), n = await _s(r.localStore, t);
			await vc(r, Uc(t), n.targetId, !1, n.resumeToken), Ps(r.remoteStore, n);
		}
		for (let e of n) r.Ma.has(e) && await vs(r.localStore, e, !1).then((() => {
			Fs(r.remoteStore, e), Ac(r, e);
		})).catch(vr);
	}
}
function qc(e) {
	let t = E(e);
	return t.remoteStore.remoteSyncer.applyRemoteEvent = Sc.bind(null, t), t.remoteStore.remoteSyncer.getRemoteKeysForTarget = Lc.bind(null, t), t.remoteStore.remoteSyncer.rejectListen = wc.bind(null, t), t.Ca.d_ = dc.bind(null, t.eventManager), t.Ca.$a = fc.bind(null, t.eventManager), t;
}
function Jc(e) {
	let t = E(e);
	return t.remoteStore.remoteSyncer.applySuccessfulWrite = Tc.bind(null, t), t.remoteStore.remoteSyncer.rejectFailedWrite = Ec.bind(null, t), t;
}
function Yc(e, t, n) {
	let r = E(e);
	(async function(e, t, n) {
		try {
			let r = await t.getMetadata();
			if (await function(e, t) {
				let n = E(e), r = j(t.createTime);
				return n.persistence.runTransaction("hasNewerBundle", "readonly", ((e) => n.Gr.getBundleMetadata(e, t.id))).then(((e) => !!e && e.createTime.compareTo(r) >= 0));
			}(e.localStore, r)) return await t.close(), n._completeWith(function(e) {
				return {
					taskState: "Success",
					documentsLoaded: e.totalDocuments,
					bytesLoaded: e.totalBytes,
					totalDocuments: e.totalDocuments,
					totalBytes: e.totalBytes
				};
			}(r)), Promise.resolve(/* @__PURE__ */ new Set());
			n._updateProgress(mc(r));
			let i = new ch(r, e.localStore, t.serializer), a = await t.Ua();
			for (; a;) {
				let e = await i.la(a);
				e && n._updateProgress(e), a = await t.Ua();
			}
			let o = await i.complete();
			return await Fc(e, o.Ia, void 0), await function(e, t) {
				let n = E(e);
				return n.persistence.runTransaction("Save bundle", "readwrite", ((e) => n.Gr.saveBundleMetadata(e, t)));
			}(e.localStore, r), n._completeWith(o.progress), Promise.resolve(o.Pa);
		} catch (e) {
			return ar("SyncEngine", `Loading bundle failed with ${e}`), n._failWith(e), Promise.resolve(/* @__PURE__ */ new Set());
		}
	})(r, t, n).then(((e) => {
		r.sharedClientState.notifyBundleLoaded(e);
	}));
}
function Xc(e, t = 10240) {
	let n = 0;
	return {
		async read() {
			if (n < e.byteLength) {
				let r = {
					value: e.slice(n, n + t),
					done: !1
				};
				return n += t, r;
			}
			return { done: !0 };
		},
		async cancel() {},
		releaseLock() {},
		closed: Promise.resolve()
	};
}
async function Zc(e, t) {
	e.asyncQueue.verifyOperationInProgress(), S("FirestoreClient", "Initializing OfflineComponentProvider");
	let n = e.configuration;
	await t.initialize(n);
	let r = n.initialUser;
	e.setCredentialChangeListener((async (e) => {
		r.isEqual(e) || (await ds(t.localStore, e), r = e);
	})), t.persistence.setDatabaseDeletedListener((() => e.terminate())), e._offlineComponents = t;
}
async function Qc(e, t) {
	e.asyncQueue.verifyOperationInProgress();
	let n = await $c(e);
	S("FirestoreClient", "Initializing OnlineComponentProvider"), await t.initialize(n, e.configuration), e.setCredentialChangeListener(((e) => rc(t.remoteStore, e))), e.setAppCheckTokenChangeListener(((e, n) => rc(t.remoteStore, n))), e._onlineComponents = t;
}
async function $c(e) {
	if (!e._offlineComponents) if (e._uninitializedComponentsProvider) {
		S("FirestoreClient", "Using user provided OfflineComponentProvider");
		try {
			await Zc(e, e._uninitializedComponentsProvider._offline);
		} catch (t) {
			let n = t;
			if (!function(e) {
				return e.name === "FirebaseError" ? e.code === P.FAILED_PRECONDITION || e.code === P.UNIMPLEMENTED : !(typeof DOMException < "u" && e instanceof DOMException) || e.code === 22 || e.code === 20 || e.code === 11;
			}(n)) throw n;
			ar("Error using user provided cache. Falling back to memory cache: " + n), await Zc(e, new hh());
		}
	} else S("FirestoreClient", "Using default OfflineComponentProvider"), await Zc(e, new hh());
	return e._offlineComponents;
}
async function el(e) {
	return e._onlineComponents || (e._uninitializedComponentsProvider ? (S("FirestoreClient", "Using user provided OnlineComponentProvider"), await Qc(e, e._uninitializedComponentsProvider._online)) : (S("FirestoreClient", "Using default OnlineComponentProvider"), await Qc(e, new yh()))), e._onlineComponents;
}
function tl(e) {
	return $c(e).then(((e) => e.persistence));
}
function nl(e) {
	return $c(e).then(((e) => e.localStore));
}
function rl(e) {
	return el(e).then(((e) => e.remoteStore));
}
function il(e) {
	return el(e).then(((e) => e.syncEngine));
}
function al(e) {
	return el(e).then(((e) => e.datastore));
}
async function ol(e) {
	let t = await el(e), n = t.eventManager;
	return n.onListen = hc.bind(null, t.syncEngine), n.onUnlisten = yc.bind(null, t.syncEngine), n.onFirstRemoteStoreListen = gc.bind(null, t.syncEngine), n.onLastRemoteStoreUnlisten = bc.bind(null, t.syncEngine), n;
}
function sl(e) {
	return e.asyncQueue.enqueue((async () => {
		let t = await tl(e), n = await rl(e);
		return t.setNetworkEnabled(!0), function(e) {
			let t = E(e);
			return t.L_.delete(0), Ms(t);
		}(n);
	}));
}
function cl(e) {
	return e.asyncQueue.enqueue((async () => {
		let t = await tl(e), n = await rl(e);
		return t.setNetworkEnabled(!1), async function(e) {
			let t = E(e);
			t.L_.add(0), await Ns(t), t.q_.set("Offline");
		}(n);
	}));
}
function ll(e, t) {
	let n = new Td();
	return e.asyncQueue.enqueueAndForget((async () => async function(e, t, n) {
		try {
			let r = await function(e, t) {
				let n = E(e);
				return n.persistence.runTransaction("read document", "readonly", ((e) => n.localDocuments.getDocument(e, t)));
			}(e, t);
			r.isFoundDocument() ? n.resolve(r) : r.isNoDocument() ? n.resolve(null) : n.reject(new F(P.UNAVAILABLE, "Failed to get document from cache. (However, this document may exist on the server. Run again without setting 'source' in the GetOptions to attempt to retrieve the document from the server.)"));
		} catch (e) {
			let r = sc(e, `Failed to get document '${t} from cache`);
			n.reject(r);
		}
	}(await nl(e), t, n))), n.promise;
}
function ul(e, t, n = {}) {
	let r = new Td();
	return e.asyncQueue.enqueueAndForget((async () => function(e, t, n, r, i) {
		let a = new bh({
			next: (s) => {
				a.Za(), t.enqueueAndForget((() => uc(e, o)));
				let c = s.docs.has(n);
				!c && s.fromCache ? i.reject(new F(P.UNAVAILABLE, "Failed to get document because the client is offline.")) : c && s.fromCache && r && r.source === "server" ? i.reject(new F(P.UNAVAILABLE, "Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to \"server\" to retrieve the cached document.)")) : i.resolve(s);
			},
			error: (e) => i.reject(e)
		}), o = new ah(Mi(n.path), a, {
			includeMetadataChanges: !0,
			_a: !0
		});
		return lc(e, o);
	}(await ol(e), e.asyncQueue, t, n, r))), r.promise;
}
function dl(e, t) {
	let n = new Td();
	return e.asyncQueue.enqueueAndForget((async () => async function(e, t, n) {
		try {
			let r = await ys(e, t, !0), i = new dh(t, r.Ts), a = i.ma(r.documents), o = i.applyChanges(a, !1);
			n.resolve(o.snapshot);
		} catch (e) {
			let r = sc(e, `Failed to execute query '${t} against cache`);
			n.reject(r);
		}
	}(await nl(e), t, n))), n.promise;
}
function fl(e, t, n = {}) {
	let r = new Td();
	return e.asyncQueue.enqueueAndForget((async () => function(e, t, n, r, i) {
		let a = new bh({
			next: (n) => {
				a.Za(), t.enqueueAndForget((() => uc(e, o))), n.fromCache && r.source === "server" ? i.reject(new F(P.UNAVAILABLE, "Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to \"server\" to retrieve the cached documents.)")) : i.resolve(n);
			},
			error: (e) => i.reject(e)
		}), o = new ah(n, a, {
			includeMetadataChanges: !0,
			_a: !0
		});
		return lc(e, o);
	}(await ol(e), e.asyncQueue, t, n, r))), r.promise;
}
function pl(e, t, n) {
	let r = new Td();
	return e.asyncQueue.enqueueAndForget((async () => {
		try {
			let i = await al(e);
			r.resolve(async function(e, t, n) {
				let r = E(e), { request: i, ut: a, parent: o } = Xa(r.serializer, Li(t), n);
				r.connection.Fo || delete i.parent;
				let s = (await r.Lo("RunAggregationQuery", r.serializer.databaseId, o, i, 1)).filter(((e) => !!e.result));
				T(s.length === 1);
				let c = s[0].result?.aggregateFields;
				return Object.keys(c).reduce(((e, t) => (e[a[t]] = c[t], e)), {});
			}(i, t, n));
		} catch (e) {
			r.reject(e);
		}
	})), r.promise;
}
function ml(e, t) {
	let n = new bh(t);
	return e.asyncQueue.enqueueAndForget((async () => function(e, t) {
		E(e).Y_.add(t), t.next();
	}(await ol(e), n))), () => {
		n.Za(), e.asyncQueue.enqueueAndForget((async () => function(e, t) {
			E(e).Y_.delete(t);
		}(await ol(e), n)));
	};
}
function hl(e, t, n, r) {
	let i = function(e, t) {
		let n;
		return n = typeof e == "string" ? Ca().encode(e) : e, function(e, t) {
			return new xh(e, t);
		}(function(e, t) {
			if (e instanceof Uint8Array) return Xc(e, t);
			if (e instanceof ArrayBuffer) return Xc(new Uint8Array(e), t);
			if (e instanceof ReadableStream) return e.getReader();
			throw Error("Source of `toByteStreamReader` has to be a ArrayBuffer or ReadableStream");
		}(n), t);
	}(n, js(t));
	e.asyncQueue.enqueueAndForget((async () => {
		Yc(await il(e), i, r);
	}));
}
function gl(e, t) {
	return e.asyncQueue.enqueue((async () => function(e, t) {
		let n = E(e);
		return n.persistence.runTransaction("Get named query", "readonly", ((e) => n.Gr.getNamedQuery(e, t)));
	}(await nl(e), t)));
}
function _l(e, t) {
	return e.asyncQueue.enqueue((async () => async function(e, t) {
		let n = E(e), r = n.indexManager, i = [];
		return n.persistence.runTransaction("Configure indexes", "readwrite", ((e) => r.getFieldIndexes(e).next(((n) => function(e, t, n, r, i) {
			e = [...e], t = [...t], e.sort(n), t.sort(n);
			let a = e.length, o = t.length, s = 0, c = 0;
			for (; s < o && c < a;) {
				let a = n(e[c], t[s]);
				a < 0 ? i(e[c++]) : a > 0 ? r(t[s++]) : (s++, c++);
			}
			for (; s < o;) r(t[s++]);
			for (; c < a;) i(e[c++]);
		}(n, t, pr, ((t) => {
			i.push(r.addFieldIndex(e, t));
		}), ((t) => {
			i.push(r.deleteFieldIndex(e, t));
		})))).next((() => V.waitFor(i)))));
	}(await nl(e), t)));
}
function vl(e, t) {
	return e.asyncQueue.enqueue((async () => function(e, t) {
		E(e).ss.zi = t;
	}(await nl(e), t)));
}
function yl(e) {
	return e.asyncQueue.enqueue((async () => function(e) {
		let t = E(e), n = t.indexManager;
		return t.persistence.runTransaction("Delete All Indexes", "readwrite", ((e) => n.deleteAllFieldIndexes(e)));
	}(await nl(e))));
}
function bl(e) {
	let t = {};
	return e.timeoutSeconds !== void 0 && (t.timeoutSeconds = e.timeoutSeconds), t;
}
function xl(e, t, n) {
	if (!n) throw new F(P.INVALID_ARGUMENT, `Function ${e}() cannot be called with an empty ${t}.`);
}
function Sl(e, t, n, r) {
	if (!0 === t && !0 === r) throw new F(P.INVALID_ARGUMENT, `${e} and ${n} cannot be used together.`);
}
function Cl(e) {
	if (!B.isDocumentKey(e)) throw new F(P.INVALID_ARGUMENT, `Invalid document reference. Document references must have an even number of segments, but ${e} has ${e.length}.`);
}
function wl(e) {
	if (B.isDocumentKey(e)) throw new F(P.INVALID_ARGUMENT, `Invalid collection reference. Collection references must have an odd number of segments, but ${e} has ${e.length}.`);
}
function Tl(e) {
	if (e === void 0) return "undefined";
	if (e === null) return "null";
	if (typeof e == "string") return e.length > 20 && (e = `${e.substring(0, 20)}...`), JSON.stringify(e);
	if (typeof e == "number" || typeof e == "boolean") return "" + e;
	if (typeof e == "object") {
		if (e instanceof Array) return "an array";
		{
			let t = function(e) {
				return e.constructor ? e.constructor.name : null;
			}(e);
			return t ? `a custom ${t} object` : "an object";
		}
	}
	return typeof e == "function" ? "a function" : w();
}
function M(e, t) {
	if ("_delegate" in e && (e = e._delegate), !(e instanceof t)) {
		if (t.name === e.constructor.name) throw new F(P.INVALID_ARGUMENT, "Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");
		{
			let n = Tl(e);
			throw new F(P.INVALID_ARGUMENT, `Expected type '${t.name}', but it was: ${n}`);
		}
	}
	return e;
}
function El(e, t) {
	if (t <= 0) throw new F(P.INVALID_ARGUMENT, `Function ${e}() requires a positive number, but it was: ${t}.`);
}
function Dl(e, t, n, r = {}) {
	let i = (e = M(e, Dh))._getSettings(), a = `${t}:${n}`;
	if (i.host !== "firestore.googleapis.com" && i.host !== a && ar("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used."), e._setSettings(Object.assign(Object.assign({}, i), {
		host: a,
		ssl: !1
	})), r.mockUserToken) {
		let t, n;
		if (typeof r.mockUserToken == "string") t = r.mockUserToken, n = Sd.MOCK_USER;
		else {
			t = on(r.mockUserToken, e._app?.options.projectId);
			let i = r.mockUserToken.sub || r.mockUserToken.user_id;
			if (!i) throw new F(P.INVALID_ARGUMENT, "mockUserToken must contain 'sub' or 'user_id' field!");
			n = new Sd(i);
		}
		e._authCredentials = new Od(new Ed(t, n));
	}
}
function Ol(e, t, ...n) {
	if (e = mn(e), xl("collection", "path", t), e instanceof Dh) {
		let r = R.fromString(t, ...n);
		return wl(r), new kh(e, null, r);
	}
	{
		if (!(e instanceof Y || e instanceof kh)) throw new F(P.INVALID_ARGUMENT, "Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");
		let r = e._path.child(R.fromString(t, ...n));
		return wl(r), new kh(e.firestore, null, r);
	}
}
function kl(e, t) {
	if (e = M(e, Dh), xl("collectionGroup", "collection id", t), t.indexOf("/") >= 0) throw new F(P.INVALID_ARGUMENT, `Invalid collection ID '${t}' passed to function collectionGroup(). Collection IDs must not contain '/'.`);
	return new Oh(e, null, function(e) {
		return new Jf(R.emptyPath(), e);
	}(t));
}
function Al(e, t, ...n) {
	if (e = mn(e), arguments.length === 1 && (t = Fd.newId()), xl("doc", "path", t), e instanceof Dh) {
		let r = R.fromString(t, ...n);
		return Cl(r), new Y(e, null, new B(r));
	}
	{
		if (!(e instanceof Y || e instanceof kh)) throw new F(P.INVALID_ARGUMENT, "Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");
		let r = e._path.child(R.fromString(t, ...n));
		return Cl(r), new Y(e.firestore, e instanceof kh ? e.converter : null, new B(r));
	}
}
function jl(e, t) {
	return e = mn(e), t = mn(t), (e instanceof Y || e instanceof kh) && (t instanceof Y || t instanceof kh) && e.firestore === t.firestore && e.path === t.path && e.converter === t.converter;
}
function Ml(e, t) {
	return e = mn(e), t = mn(t), e instanceof Oh && t instanceof Oh && e.firestore === t.firestore && Vi(e._query, t._query) && e.converter === t.converter;
}
function Nl(e) {
	return function(e, t) {
		if (typeof e != "object" || !e) return !1;
		let n = e;
		for (let e of t) if (e in n && typeof n[e] == "function") return !0;
		return !1;
	}(e, [
		"next",
		"error",
		"complete"
	]);
}
function Pl(e, t, n) {
	n ||= "(default)";
	let r = Qe(e, "firestore");
	if (r.isInitialized(n)) {
		let e = r.getImmediate({ identifier: n });
		if (fn(r.getOptions(n), t)) return e;
		throw new F(P.FAILED_PRECONDITION, "initializeFirestore() has already been called with different options. To avoid this error, call initializeFirestore() with the same options as when it was originally called, or call getFirestore() to return the already initialized instance.");
	}
	if (t.cacheSizeBytes !== void 0 && t.localCache !== void 0) throw new F(P.INVALID_ARGUMENT, "cache and cacheSizeBytes cannot be specified at the same time as cacheSizeBytes willbe deprecated. Instead, specify the cache size in the cache object");
	if (t.cacheSizeBytes !== void 0 && t.cacheSizeBytes !== -1 && t.cacheSizeBytes < 1048576) throw new F(P.INVALID_ARGUMENT, "cacheSizeBytes must be at least 1048576");
	return r.initialize({
		options: t,
		instanceIdentifier: n
	});
}
function Fl(e, t) {
	let n = typeof e == "object" ? e : nt(), r = typeof e == "string" ? e : t || "(default)", i = Qe(n, "firestore").getImmediate({ identifier: r });
	if (!i._initialized) {
		let e = Dn("firestore");
		e && Dl(i, ...e);
	}
	return i;
}
function N(e) {
	if (e._terminated) throw new F(P.FAILED_PRECONDITION, "The client has already been terminated.");
	return e._firestoreClient || Il(e), e._firestoreClient;
}
function Il(e) {
	var t, n;
	let r = e._freezeSettings(), i = function(e, t, n, r) {
		return new Af(e, t, n, r.host, r.ssl, r.experimentalForceLongPolling, r.experimentalAutoDetectLongPolling, bl(r.experimentalLongPollingOptions), r.useFetchStreams);
	}(e._databaseId, e._app?.options.appId || "", e._persistenceKey, r);
	e._componentsProvider || (t = r.localCache) != null && t._offlineComponentProvider && (n = r.localCache) != null && n._onlineComponentProvider && (e._componentsProvider = {
		_offline: r.localCache._offlineComponentProvider,
		_online: r.localCache._onlineComponentProvider
	}), e._firestoreClient = new wh(e._authCredentials, e._appCheckCredentials, e._queue, i, e._componentsProvider && function(e) {
		let t = e?._online.build();
		return {
			_offline: e?._offline.build(t),
			_online: t
		};
	}(e._componentsProvider));
}
function Ll(e, t) {
	ar("enableIndexedDbPersistence() will be deprecated in the future, you can use `FirestoreSettings.cache` instead.");
	let n = e._freezeSettings();
	return zl(e, yh.provider, { build: (e) => new _h(e, n.cacheSizeBytes, t?.forceOwnership) }), Promise.resolve();
}
async function Rl(e) {
	ar("enableMultiTabIndexedDbPersistence() will be deprecated in the future, you can use `FirestoreSettings.cache` instead.");
	let t = e._freezeSettings();
	zl(e, yh.provider, { build: (e) => new vh(e, t.cacheSizeBytes) });
}
function zl(e, t, n) {
	if ((e = M(e, X))._firestoreClient || e._terminated) throw new F(P.FAILED_PRECONDITION, "Firestore has already been started and persistence can no longer be enabled. You can only enable persistence before calling any other methods on a Firestore object.");
	if (e._componentsProvider || e._getSettings().localCache) throw new F(P.FAILED_PRECONDITION, "SDK cache is already specified.");
	e._componentsProvider = {
		_online: t,
		_offline: n
	}, Il(e);
}
function Bl(e) {
	if (e._initialized && !e._terminated) throw new F(P.FAILED_PRECONDITION, "Persistence can only be cleared before a Firestore instance is initialized or after it is terminated.");
	let t = new Td();
	return e._queue.enqueueAndForgetEvenWhileRestricted((async () => {
		try {
			await async function(e) {
				if (!Gd.D()) return Promise.resolve();
				let t = e + "main";
				await Gd.delete(t);
			}(ls(e._databaseId, e._persistenceKey)), t.resolve();
		} catch (e) {
			t.reject(e);
		}
	})), t.promise;
}
function Vl(e) {
	return function(e) {
		let t = new Td();
		return e.asyncQueue.enqueueAndForget((async () => Dc(await il(e), t))), t.promise;
	}(N(e = M(e, X)));
}
function Hl(e) {
	return sl(N(e = M(e, X)));
}
function Ul(e) {
	return cl(N(e = M(e, X)));
}
function Wl(e) {
	return $e(e.app, "firestore", e._databaseId.database), e._delete();
}
function Gl(e, t) {
	let n = N(e = M(e, X)), r = new jh();
	return hl(n, e._databaseId, t, r), r;
}
function Kl(e, t) {
	return gl(N(e = M(e, X)), t).then(((t) => t ? new Oh(e, null, t.query) : null));
}
function ql() {
	return new Fh("__name__");
}
function Jl(e) {
	switch (e) {
		case 0:
		case 2:
		case 1: return !0;
		case 3:
		case 4: return !1;
		default: throw w();
	}
}
function Yl(e) {
	let t = e._freezeSettings(), n = js(e._databaseId);
	return new Uh(e._databaseId, !!t.ignoreUndefinedProperties, n);
}
function Xl(e, t, n, r, i, a = {}) {
	let o = e.Qu(a.merge || a.mergeFields ? 2 : 0, t, n, i);
	iu("Data must be an object, but it was:", o, r);
	let s = nu(r, o), c, l;
	if (a.merge) c = new Df(o.fieldMask), l = o.fieldTransforms;
	else if (a.mergeFields) {
		let e = [];
		for (let r of a.mergeFields) {
			let i = au(t, r, n);
			if (!o.contains(i)) throw new F(P.INVALID_ARGUMENT, `Field '${i}' is specified in your field mask but missing from your input data.`);
			cu(e, i) || e.push(i);
		}
		c = new Df(e), l = o.fieldTransforms.filter(((e) => c.covers(e.field)));
	} else c = null, l = o.fieldTransforms;
	return new Bh(new Ff(s), c, l);
}
function Zl(e, t, n) {
	return new Hh({
		Cu: 3,
		qu: t.settings.qu,
		methodName: e._methodName,
		xu: n
	}, t.databaseId, t.serializer, t.ignoreUndefinedProperties);
}
function Ql(e, t, n, r) {
	let i = e.Qu(1, t, n);
	iu("Data must be an object, but it was:", i, r);
	let a = [], o = Ff.empty();
	Nr(r, ((e, r) => {
		let s = ou(t, e, n);
		r = mn(r);
		let c = i.Nu(s);
		if (r instanceof Wh) a.push(s);
		else {
			let e = tu(r, c);
			e != null && (a.push(s), o.set(s, e));
		}
	}));
	let s = new Df(a);
	return new Vh(o, s, i.fieldTransforms);
}
function $l(e, t, n, r, i, a) {
	let o = e.Qu(1, t, n), s = [au(t, r, n)], c = [i];
	if (a.length % 2 != 0) throw new F(P.INVALID_ARGUMENT, `Function ${t}() needs to be called with an even number of arguments that alternate between field names and values.`);
	for (let e = 0; e < a.length; e += 2) s.push(au(t, a[e])), c.push(a[e + 1]);
	let l = [], u = Ff.empty();
	for (let e = s.length - 1; e >= 0; --e) if (!cu(l, s[e])) {
		let t = s[e], n = c[e];
		n = mn(n);
		let r = o.Nu(t);
		if (n instanceof Wh) l.push(t);
		else {
			let e = tu(n, r);
			e != null && (l.push(t), u.set(t, e));
		}
	}
	let d = new Df(l);
	return new Vh(u, d, o.fieldTransforms);
}
function eu(e, t, n, r = !1) {
	return tu(n, e.Qu(r ? 4 : 3, t));
}
function tu(e, t) {
	if (ru(e = mn(e))) return iu("Unsupported field value:", t, e), nu(e, t);
	if (e instanceof Ih) return function(e, t) {
		if (!Jl(t.Cu)) throw t.Bu(`${e._methodName}() can only be used with update() and set()`);
		if (!t.path) throw t.Bu(`${e._methodName}() is not currently supported inside arrays`);
		let n = e._toFieldTransform(t);
		n && t.fieldTransforms.push(n);
	}(e, t), null;
	if (e === void 0 && t.ignoreUndefinedProperties) return null;
	if (t.path && t.fieldMask.push(t.path), e instanceof Array) {
		if (t.settings.xu && t.Cu !== 4) throw t.Bu("Nested arrays are not supported");
		return function(e, t) {
			let n = [], r = 0;
			for (let i of e) {
				let e = tu(i, t.Lu(r));
				e ??= { nullValue: "NULL_VALUE" }, n.push(e), r++;
			}
			return { arrayValue: { values: n } };
		}(e, t);
	}
	return function(e, t) {
		if ((e = mn(e)) === null) return { nullValue: "NULL_VALUE" };
		if (typeof e == "number") return ra(t.serializer, e);
		if (typeof e == "boolean") return { booleanValue: e };
		if (typeof e == "string") return { stringValue: e };
		if (e instanceof Date) {
			let n = I.fromDate(e);
			return { timestampValue: ka(t.serializer, n) };
		}
		if (e instanceof I) {
			let n = new I(e.seconds, 1e3 * Math.floor(e.nanoseconds / 1e3));
			return { timestampValue: ka(t.serializer, n) };
		}
		if (e instanceof Lh) return { geoPointValue: {
			latitude: e.latitude,
			longitude: e.longitude
		} };
		if (e instanceof Ph) return { bytesValue: Aa(t.serializer, e._byteString) };
		if (e instanceof Y) {
			let n = t.databaseId, r = e.firestore._databaseId;
			if (!r.isEqual(n)) throw t.Bu(`Document reference is for database ${r.projectId}/${r.database} but should be for database ${n.projectId}/${n.database}`);
			return { referenceValue: Ma(e.firestore._databaseId || t.databaseId, e._key.path) };
		}
		if (e instanceof Rh) return function(e, t) {
			return { mapValue: { fields: {
				__type__: { stringValue: "__vector__" },
				value: { arrayValue: { values: e.toArray().map(((e) => {
					if (typeof e != "number") throw t.Bu("VectorValues must only contain numeric values.");
					return ta(t.serializer, e);
				})) } }
			} } };
		}(e, t);
		throw t.Bu(`Unsupported field value: ${Tl(e)}`);
	}(e, t);
}
function nu(e, t) {
	let n = {};
	return Fr(e) ? t.path && t.path.length > 0 && t.fieldMask.push(t.path) : Nr(e, ((e, r) => {
		let i = tu(r, t.Mu(e));
		i != null && (n[e] = i);
	})), { mapValue: { fields: n } };
}
function ru(e) {
	return !(typeof e != "object" || !e || e instanceof Array || e instanceof Date || e instanceof I || e instanceof Lh || e instanceof Ph || e instanceof Y || e instanceof Ih || e instanceof Rh);
}
function iu(e, t, n) {
	if (!ru(n) || !function(e) {
		return typeof e == "object" && !!e && (Object.getPrototypeOf(e) === Object.prototype || Object.getPrototypeOf(e) === null);
	}(n)) {
		let r = Tl(n);
		throw r === "an object" ? t.Bu(e + " a custom object") : t.Bu(e + " " + r);
	}
}
function au(e, t, n) {
	if ((t = mn(t)) instanceof Fh) return t._internalPath;
	if (typeof t == "string") return ou(e, t);
	throw su("Field path arguments must be of type string or ", e, !1, void 0, n);
}
function ou(e, t, n) {
	if (t.search(Yh) >= 0) throw su(`Invalid field path (${t}). Paths must not contain '~', '*', '/', '[', or ']'`, e, !1, void 0, n);
	try {
		return new Fh(...t.split("."))._internalPath;
	} catch {
		throw su(`Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`, e, !1, void 0, n);
	}
}
function su(e, t, n, r, i) {
	let a = r && !r.isEmpty(), o = i !== void 0, s = `Function ${t}() called with invalid data`;
	n && (s += " (via `toFirestore()`)"), s += ". ";
	let c = "";
	return (a || o) && (c += " (found", a && (c += ` in field ${r}`), o && (c += ` in document ${i}`), c += ")"), new F(P.INVALID_ARGUMENT, s + e + c);
}
function cu(e, t) {
	return e.some(((e) => e.isEqual(t)));
}
function lu(e, t) {
	return typeof t == "string" ? ou(e, t) : t instanceof Fh ? t._internalPath : t._delegate._internalPath;
}
function uu(e) {
	if (e.limitType === "L" && e.explicitOrderBy.length === 0) throw new F(P.UNIMPLEMENTED, "limitToLast() queries require specifying at least one orderBy() clause");
}
function du(e, t, ...n) {
	let r = [];
	t instanceof Qh && r.push(t), r = r.concat(n), function(e) {
		let t = e.filter(((e) => e instanceof tg)).length, n = e.filter(((e) => e instanceof eg)).length;
		if (t > 1 || t > 0 && n > 0) throw new F(P.INVALID_ARGUMENT, "InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.");
	}(r);
	for (let t of r) e = t._apply(e);
	return e;
}
function fu(e, t, n) {
	let r = t, i = lu("where", e);
	return eg._create(i, r, n);
}
function pu(...e) {
	return e.forEach(((e) => Eu("or", e))), tg._create("or", e);
}
function mu(...e) {
	return e.forEach(((e) => Eu("and", e))), tg._create("and", e);
}
function hu(e, t = "asc") {
	let n = t, r = lu("orderBy", e);
	return ng._create(r, n);
}
function gu(e) {
	return El("limit", e), rg._create("limit", e, "F");
}
function _u(e) {
	return El("limitToLast", e), rg._create("limitToLast", e, "L");
}
function vu(...e) {
	return ig._create("startAt", e, !0);
}
function yu(...e) {
	return ig._create("startAfter", e, !1);
}
function bu(...e) {
	return ag._create("endBefore", e, !1);
}
function xu(...e) {
	return ag._create("endAt", e, !0);
}
function Su(e, t, n, r) {
	if (n[0] = mn(n[0]), n[0] instanceof Xh) return function(e, t, n, r, i) {
		if (!r) throw new F(P.NOT_FOUND, `Can't use a DocumentSnapshot that doesn't exist for ${n}().`);
		let a = [];
		for (let n of Fi(e)) if (n.field.isKeyField()) a.push(Qr(t, r.key));
		else {
			let e = r.data.field(n.field);
			if (Br(e)) throw new F(P.INVALID_ARGUMENT, "Invalid query. You are trying to start or end a query using a document for which the field \"" + n.field + "\" is an uncommitted server timestamp. (Since the value of this field is unknown, you cannot start/end a query with it.)");
			if (e === null) {
				let e = n.field.canonicalString();
				throw new F(P.INVALID_ARGUMENT, `Invalid query. You are trying to start or end a query using a document for which the field '${e}' (used as the orderBy) does not exist.`);
			}
			a.push(e);
		}
		return new Lf(a, i);
	}(e._query, e.firestore._databaseId, t, n[0]._document, r);
	{
		let i = Yl(e.firestore);
		return function(e, t, n, r, i, a) {
			let o = e.explicitOrderBy;
			if (i.length > o.length) throw new F(P.INVALID_ARGUMENT, `Too many arguments provided to ${r}(). The number of arguments must be less than or equal to the number of orderBy() clauses`);
			let s = [];
			for (let a = 0; a < i.length; a++) {
				let c = i[a];
				if (o[a].field.isKeyField()) {
					if (typeof c != "string") throw new F(P.INVALID_ARGUMENT, `Invalid query. Expected a string for document ID in ${r}(), but got a ${typeof c}`);
					if (!Pi(e) && c.indexOf("/") !== -1) throw new F(P.INVALID_ARGUMENT, `Invalid query. When querying a collection and ordering by documentId(), the value passed to ${r}() must be a plain document ID, but '${c}' contains a slash.`);
					let n = e.path.child(R.fromString(c));
					if (!B.isDocumentKey(n)) throw new F(P.INVALID_ARGUMENT, `Invalid query. When querying a collection group and ordering by documentId(), the value passed to ${r}() must result in a valid document path, but '${n}' is not because it contains an odd number of segments.`);
					let i = new B(n);
					s.push(Qr(t, i));
				} else {
					let e = eu(n, r, c);
					s.push(e);
				}
			}
			return new Lf(s, a);
		}(e._query, e.firestore._databaseId, i, t, n, r);
	}
}
function Cu(e, t, n) {
	if (typeof (n = mn(n)) == "string") {
		if (n === "") throw new F(P.INVALID_ARGUMENT, "Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");
		if (!Pi(t) && n.indexOf("/") !== -1) throw new F(P.INVALID_ARGUMENT, `Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '${n}' contains a '/' character.`);
		let r = t.path.child(R.fromString(n));
		if (!B.isDocumentKey(r)) throw new F(P.INVALID_ARGUMENT, `Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '${r}' is not because it has an odd number of segments (${r.length}).`);
		return Qr(e, new B(r));
	}
	if (n instanceof Y) return Qr(e, n._key);
	throw new F(P.INVALID_ARGUMENT, `Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ${Tl(n)}.`);
}
function wu(e, t) {
	if (!Array.isArray(e) || e.length === 0) throw new F(P.INVALID_ARGUMENT, `Invalid Query. A non-empty array is required for '${t.toString()}' filters.`);
}
function Tu(e, t) {
	let n = function(e, t) {
		for (let n of e) for (let e of n.getFlattenedFilters()) if (t.indexOf(e.op) >= 0) return e.op;
		return null;
	}(e.filters, function(e) {
		switch (e) {
			case "!=": return ["!=", "not-in"];
			case "array-contains-any":
			case "in": return ["not-in"];
			case "not-in": return [
				"array-contains-any",
				"in",
				"not-in",
				"!="
			];
			default: return [];
		}
	}(t.op));
	if (n !== null) throw n === t.op ? new F(P.INVALID_ARGUMENT, `Invalid query. You cannot use more than one '${t.op.toString()}' filter.`) : new F(P.INVALID_ARGUMENT, `Invalid query. You cannot use '${t.op.toString()}' filters with '${n.toString()}' filters.`);
}
function Eu(e, t) {
	if (!(t instanceof eg || t instanceof tg)) throw new F(P.INVALID_ARGUMENT, `Function ${e}() requires AppliableConstraints created with a call to 'where(...)', 'or(...)', or 'and(...)'.`);
}
function Du(e, t, n) {
	let r;
	return r = e ? n && (n.merge || n.mergeFields) ? e.toFirestore(t, n) : e.toFirestore(t) : t, r;
}
function Ou(e) {
	return new Mh("sum", au("sum", e));
}
function ku(e) {
	return new Mh("avg", au("average", e));
}
function Au() {
	return new Mh("count");
}
function ju(e, t) {
	return e instanceof Mh && t instanceof Mh && e.aggregateType === t.aggregateType && e._internalFieldPath?.canonicalString() === t._internalFieldPath?.canonicalString();
}
function Mu(e, t) {
	return Ml(e.query, t.query) && fn(e.data(), t.data());
}
function Nu(e) {
	switch (e) {
		case 0: return "added";
		case 2:
		case 3: return "modified";
		case 1: return "removed";
		default: return w();
	}
}
function Pu(e, t) {
	return e instanceof lg && t instanceof lg ? e._firestore === t._firestore && e._key.isEqual(t._key) && (e._document === null ? t._document === null : e._document.isEqual(t._document)) && e._converter === t._converter : e instanceof dg && t instanceof dg && e._firestore === t._firestore && Ml(e.query, t.query) && e.metadata.isEqual(t.metadata) && e._snapshot.isEqual(t._snapshot);
}
function Fu(e) {
	e = M(e, Y);
	let t = M(e.firestore, X);
	return ul(N(t), e._key).then(((n) => Ju(t, e, n)));
}
function Iu(e) {
	e = M(e, Y);
	let t = M(e.firestore, X), n = N(t), r = new fg(t);
	return ll(n, e._key).then(((n) => new lg(t, r, e._key, n, new cg(n !== null && n.hasLocalMutations, !0), e.converter)));
}
function Lu(e) {
	e = M(e, Y);
	let t = M(e.firestore, X);
	return ul(N(t), e._key, { source: "server" }).then(((n) => Ju(t, e, n)));
}
function Ru(e) {
	e = M(e, Oh);
	let t = M(e.firestore, X), n = N(t), r = new fg(t);
	return uu(e._query), fl(n, e._query).then(((n) => new dg(t, r, e, n)));
}
function zu(e) {
	e = M(e, Oh);
	let t = M(e.firestore, X), n = N(t), r = new fg(t);
	return dl(n, e._query).then(((n) => new dg(t, r, e, n)));
}
function Bu(e) {
	e = M(e, Oh);
	let t = M(e.firestore, X), n = N(t), r = new fg(t);
	return fl(n, e._query, { source: "server" }).then(((n) => new dg(t, r, e, n)));
}
function Vu(e, t, n) {
	e = M(e, Y);
	let r = M(e.firestore, X), i = Du(e.converter, t, n);
	return qu(r, [Xl(Yl(r), "setDoc", e._key, i, e.converter !== null, n).toMutation(e._key, q.none())]);
}
function Hu(e, t, n, ...r) {
	e = M(e, Y);
	let i = M(e.firestore, X), a = Yl(i), o;
	return o = typeof (t = mn(t)) == "string" || t instanceof Fh ? $l(a, "updateDoc", e._key, t, n, r) : Ql(a, "updateDoc", e._key, t), qu(i, [o.toMutation(e._key, q.exists(!0))]);
}
function Uu(e) {
	return qu(M(e.firestore, X), [new dp(e._key, q.none())]);
}
function Wu(e, t) {
	let n = M(e.firestore, X), r = Al(e), i = Du(e.converter, t);
	return qu(n, [Xl(Yl(e.firestore), "addDoc", r._key, i, e.converter !== null, {}).toMutation(r._key, q.exists(!1))]).then((() => r));
}
function Gu(e, ...t) {
	e = mn(e);
	let n = {
		includeMetadataChanges: !1,
		source: "default"
	}, r = 0;
	typeof t[r] != "object" || Nl(t[r]) || (n = t[r], r++);
	let i = {
		includeMetadataChanges: n.includeMetadataChanges,
		source: n.source
	};
	if (Nl(t[r])) {
		let e = t[r];
		t[r] = e.next?.bind(e), t[r + 1] = e.error?.bind(e), t[r + 2] = e.complete?.bind(e);
	}
	let a, o, s;
	if (e instanceof Y) o = M(e.firestore, X), s = Mi(e._key.path), a = {
		next: (n) => {
			t[r] && t[r](Ju(o, e, n));
		},
		error: t[r + 1],
		complete: t[r + 2]
	};
	else {
		let n = M(e, Oh);
		o = M(n.firestore, X), s = n._query;
		let i = new fg(o);
		a = {
			next: (e) => {
				t[r] && t[r](new dg(o, i, n, e));
			},
			error: t[r + 1],
			complete: t[r + 2]
		}, uu(e._query);
	}
	return function(e, t, n, r) {
		let i = new bh(r), a = new ah(t, i, n);
		return e.asyncQueue.enqueueAndForget((async () => lc(await ol(e), a))), () => {
			i.Za(), e.asyncQueue.enqueueAndForget((async () => uc(await ol(e), a)));
		};
	}(N(o), s, i, a);
}
function Ku(e, t) {
	return ml(N(e = M(e, X)), Nl(t) ? t : { next: t });
}
function qu(e, t) {
	return function(e, t) {
		let n = new Td();
		return e.asyncQueue.enqueueAndForget((async () => xc(await il(e), t, n))), n.promise;
	}(N(e), t);
}
function Ju(e, t, n) {
	let r = n.docs.get(t._key), i = new fg(e);
	return new lg(e, i, t._key, r, new cg(n.hasPendingWrites, n.fromCache), t.converter);
}
function Yu(e) {
	return Xu(e, { count: Au() });
}
function Xu(e, t) {
	let n = M(e.firestore, X), r = N(n), i = Pr(t, ((e, t) => new gp(t, e.aggregateType, e._internalFieldPath)));
	return pl(r, e._query, i).then(((t) => function(e, t, n) {
		let r = new fg(e);
		return new Nh(t, r, n);
	}(n, e, t)));
}
function Zu() {
	return new hg();
}
function Qu(e) {
	return new gg(e?.cacheSizeBytes);
}
function $u(e) {
	return new pg(e);
}
function ed(e) {
	return new mg(e);
}
function td(e) {
	return new _g(e?.forceOwnership);
}
function nd() {
	return new vg();
}
function rd(e, t) {
	if ((e = mn(e)).firestore !== t) throw new F(P.INVALID_ARGUMENT, "Provided document reference is from a different Firestore instance.");
	return e;
}
function id(e, t, n) {
	e = M(e, X);
	let r = Object.assign(Object.assign({}, yg), n);
	return (function(e) {
		if (e.maxAttempts < 1) throw new F(P.INVALID_ARGUMENT, "Max attempts must be at least 1");
	})(r), function(e, t, n) {
		let r = new Td();
		return e.asyncQueue.enqueueAndForget((async () => {
			let i = await al(e);
			new Ch(e.asyncQueue, i, n, t, r).au();
		})), r.promise;
	}(N(e), ((n) => t(new xg(e, n))), r);
}
function ad() {
	return new Wh("deleteField");
}
function od() {
	return new Gh("serverTimestamp");
}
function sd(...e) {
	return new Kh("arrayUnion", e);
}
function cd(...e) {
	return new qh("arrayRemove", e);
}
function ld(e) {
	return new Jh("increment", e);
}
function ud(e) {
	return new Rh(e);
}
function dd(e) {
	return N(e = M(e, X)), new bg(e, ((t) => qu(e, t)));
}
function fd(e, t) {
	let n = N(e = M(e, X));
	return !n._uninitializedComponentsProvider || n._uninitializedComponentsProvider._offline.kind === "memory" ? (ar("Cannot enable indexes when persistence is disabled"), Promise.resolve()) : _l(n, function(e) {
		let t = typeof e == "string" ? function(e) {
			try {
				return JSON.parse(e);
			} catch (e) {
				throw new F(P.INVALID_ARGUMENT, "Failed to parse JSON: " + e?.message);
			}
		}(e) : e, n = [];
		if (Array.isArray(t.indexes)) for (let e of t.indexes) {
			let t = pd(e, "collectionGroup"), r = [];
			if (Array.isArray(e.fields)) for (let t of e.fields) {
				let e = ou("setIndexConfiguration", pd(t, "fieldPath"));
				t.arrayConfig === "CONTAINS" ? r.push(new zd(e, 2)) : t.order === "ASCENDING" ? r.push(new zd(e, 0)) : t.order === "DESCENDING" && r.push(new zd(e, 1));
			}
			n.push(new Rd(Rd.UNKNOWN_ID, t, r, Bd.empty()));
		}
		return n;
	}(t));
}
function pd(e, t) {
	if (typeof e[t] != "string") throw new F(P.INVALID_ARGUMENT, "Missing string value for: " + t);
	return e[t];
}
function md(e) {
	e = M(e, X);
	let t = Cg.get(e);
	if (t) return t;
	if (N(e)._uninitializedComponentsProvider?._offline.kind !== "persistent") return null;
	let n = new Sg(e);
	return Cg.set(e, n), n;
}
function hd(e) {
	vd(e, !0);
}
function gd(e) {
	vd(e, !1);
}
function _d(e) {
	yl(N(e._firestore)).then(((e) => S("deleting all persistent cache indexes succeeded"))).catch(((e) => ar("deleting all persistent cache indexes failed", e)));
}
function vd(e, t) {
	vl(N(e._firestore), t).then(((e) => S(`setting persistent cache index auto creation isEnabled=${t} succeeded`))).catch(((e) => ar(`setting persistent cache index auto creation isEnabled=${t} failed`, e)));
}
function yd(e) {
	let t = N(M(e.firestore, X))._onlineComponents?.datastore.serializer;
	return t === void 0 ? null : Ya(t, Ii(e._query))._t;
}
function bd(e, t) {
	let n = Pr(t, ((e, t) => new gp(t, e.aggregateType, e._internalFieldPath))), r = N(M(e.firestore, X))._onlineComponents?.datastore.serializer;
	return r === void 0 ? null : Xa(r, Li(e._query), n, !0).request;
}
var xd, Sd, Cd, wd, P, F, Td, Ed, Dd, Od, kd, Ad, jd, Md, Nd, Pd, Fd, I, L, Id, R, Ld, z, B, Rd, zd, Bd, Vd, Hd, Ud, V, Wd, Gd, Kd, qd, Jd, Yd, Xd, Zd, Qd, $d, ef, tf, nf, rf, af, of, sf, cf, lf, uf, df, ff, pf, mf, hf, gf, _f, vf, yf, bf, xf, Sf, Cf, H, wf, Tf, U, Ef, Df, Of, W, kf, Af, jf, Mf, Nf, Pf, Ff, If, Lf, Rf, zf, G, K, Bf, Vf, Hf, Uf, Wf, Gf, Kf, qf, Jf, Yf, Xf, Zf, Qf, $f, ep, tp, np, rp, ip, ap, op, sp, q, cp, lp, up, dp, fp, pp, mp, hp, gp, _p, vp, J, yp, bp, xp, Sp, Cp, wp, Tp, Ep, Dp, Op, kp, Ap, jp, Mp, Np, Pp, Fp, Ip, Lp, Rp, zp, Bp, Vp, Hp, Up, Wp, Gp, Kp, qp, Jp, Yp, Xp, Zp, Qp, $p, em, tm, nm, rm, im, am, om, sm, cm, lm, um, dm, fm, pm, mm, hm, gm, _m, vm, ym, bm, xm, Sm, Cm, wm, Tm, Em, Dm, Om, km, Am, jm, Mm, Nm, Pm, Fm, Im, Lm, Rm, zm, Bm, Vm, Hm, Um, Wm, Gm, Km, qm, Jm, Ym, Xm, Zm, Qm, $m, eh, th, nh, rh, ih, ah, oh, sh, ch, lh, uh, dh, fh, ph, mh, hh, gh, _h, vh, yh, bh, xh, Sh, Ch, wh, Th, Eh, Dh, Oh, Y, kh, Ah, jh, X, Mh, Nh, Ph, Fh, Ih, Lh, Rh, zh, Bh, Vh, Hh, Uh, Wh, Gh, Kh, qh, Jh, Yh, Xh, Zh, Qh, $h, eg, tg, ng, rg, ig, ag, og, sg, cg, lg, ug, dg, fg, pg, mg, hg, gg, _g, vg, yg, bg, xg, Sg, Cg, wg, Tg, Eg, Dg = t((() => {
	an(), b(), Bn(), Mn(), Gn(), nr(), xd = "@firebase/firestore", Sd = class {
		constructor(e) {
			this.uid = e;
		}
		isAuthenticated() {
			return this.uid != null;
		}
		toKey() {
			return this.isAuthenticated() ? "uid:" + this.uid : "anonymous-user";
		}
		isEqual(e) {
			return e.uid === this.uid;
		}
	}, Sd.UNAUTHENTICATED = new Sd(null), Sd.GOOGLE_CREDENTIALS = new Sd("google-credentials-uid"), Sd.FIRST_PARTY = new Sd("first-party-uid"), Sd.MOCK_USER = new Sd("mock-user"), Cd = "10.14.0", wd = new zn("@firebase/firestore"), P = {
		OK: "ok",
		CANCELLED: "cancelled",
		UNKNOWN: "unknown",
		INVALID_ARGUMENT: "invalid-argument",
		DEADLINE_EXCEEDED: "deadline-exceeded",
		NOT_FOUND: "not-found",
		ALREADY_EXISTS: "already-exists",
		PERMISSION_DENIED: "permission-denied",
		UNAUTHENTICATED: "unauthenticated",
		RESOURCE_EXHAUSTED: "resource-exhausted",
		FAILED_PRECONDITION: "failed-precondition",
		ABORTED: "aborted",
		OUT_OF_RANGE: "out-of-range",
		UNIMPLEMENTED: "unimplemented",
		INTERNAL: "internal",
		UNAVAILABLE: "unavailable",
		DATA_LOSS: "data-loss"
	}, F = class extends kn {
		constructor(e, t) {
			super(e, t), this.code = e, this.message = t, this.toString = () => `${this.name}: [code=${this.code}]: ${this.message}`;
		}
	}, Td = class {
		constructor() {
			this.promise = new Promise(((e, t) => {
				this.resolve = e, this.reject = t;
			}));
		}
	}, Ed = class {
		constructor(e, t) {
			this.user = t, this.type = "OAuth", this.headers = /* @__PURE__ */ new Map(), this.headers.set("Authorization", `Bearer ${e}`);
		}
	}, Dd = class {
		getToken() {
			return Promise.resolve(null);
		}
		invalidateToken() {}
		start(e, t) {
			e.enqueueRetryable((() => t(Sd.UNAUTHENTICATED)));
		}
		shutdown() {}
	}, Od = class {
		constructor(e) {
			this.token = e, this.changeListener = null;
		}
		getToken() {
			return Promise.resolve(this.token);
		}
		invalidateToken() {}
		start(e, t) {
			this.changeListener = t, e.enqueueRetryable((() => t(this.token.user)));
		}
		shutdown() {
			this.changeListener = null;
		}
	}, kd = class {
		constructor(e) {
			this.t = e, this.currentUser = Sd.UNAUTHENTICATED, this.i = 0, this.forceRefresh = !1, this.auth = null;
		}
		start(e, t) {
			T(this.o === void 0);
			let n = this.i, r = (e) => this.i === n ? Promise.resolve() : (n = this.i, t(e)), i = new Td();
			this.o = () => {
				this.i++, this.currentUser = this.u(), i.resolve(), i = new Td(), e.enqueueRetryable((() => r(this.currentUser)));
			};
			let a = () => {
				let t = i;
				e.enqueueRetryable((async () => {
					await t.promise, await r(this.currentUser);
				}));
			}, o = (e) => {
				S("FirebaseAuthCredentialsProvider", "Auth detected"), this.auth = e, this.o && (this.auth.addAuthTokenListener(this.o), a());
			};
			this.t.onInit(((e) => o(e))), setTimeout((() => {
				if (!this.auth) {
					let e = this.t.getImmediate({ optional: !0 });
					e ? o(e) : (S("FirebaseAuthCredentialsProvider", "Auth not yet detected"), i.resolve(), i = new Td());
				}
			}), 0), a();
		}
		getToken() {
			let e = this.i, t = this.forceRefresh;
			return this.forceRefresh = !1, this.auth ? this.auth.getToken(t).then(((t) => this.i === e ? t ? (T(typeof t.accessToken == "string"), new Ed(t.accessToken, this.currentUser)) : null : (S("FirebaseAuthCredentialsProvider", "getToken aborted due to token change."), this.getToken()))) : Promise.resolve(null);
		}
		invalidateToken() {
			this.forceRefresh = !0;
		}
		shutdown() {
			this.auth && this.o && this.auth.removeAuthTokenListener(this.o), this.o = void 0;
		}
		u() {
			let e = this.auth && this.auth.getUid();
			return T(e === null || typeof e == "string"), new Sd(e);
		}
	}, Ad = class {
		constructor(e, t, n) {
			this.l = e, this.h = t, this.P = n, this.type = "FirstParty", this.user = Sd.FIRST_PARTY, this.I = /* @__PURE__ */ new Map();
		}
		T() {
			return this.P ? this.P() : null;
		}
		get headers() {
			this.I.set("X-Goog-AuthUser", this.l);
			let e = this.T();
			return e && this.I.set("Authorization", e), this.h && this.I.set("X-Goog-Iam-Authorization-Token", this.h), this.I;
		}
	}, jd = class {
		constructor(e, t, n) {
			this.l = e, this.h = t, this.P = n;
		}
		getToken() {
			return Promise.resolve(new Ad(this.l, this.h, this.P));
		}
		start(e, t) {
			e.enqueueRetryable((() => t(Sd.FIRST_PARTY)));
		}
		shutdown() {}
		invalidateToken() {}
	}, Md = class {
		constructor(e) {
			this.value = e, this.type = "AppCheck", this.headers = /* @__PURE__ */ new Map(), e && e.length > 0 && this.headers.set("x-firebase-appcheck", this.value);
		}
	}, Nd = class {
		constructor(e) {
			this.A = e, this.forceRefresh = !1, this.appCheck = null, this.R = null;
		}
		start(e, t) {
			T(this.o === void 0);
			let n = (e) => {
				e.error != null && S("FirebaseAppCheckTokenProvider", `Error getting App Check token; using placeholder token instead. Error: ${e.error.message}`);
				let n = e.token !== this.R;
				return this.R = e.token, S("FirebaseAppCheckTokenProvider", `Received ${n ? "new" : "existing"} token.`), n ? t(e.token) : Promise.resolve();
			};
			this.o = (t) => {
				e.enqueueRetryable((() => n(t)));
			};
			let r = (e) => {
				S("FirebaseAppCheckTokenProvider", "AppCheck detected"), this.appCheck = e, this.o && this.appCheck.addTokenListener(this.o);
			};
			this.A.onInit(((e) => r(e))), setTimeout((() => {
				if (!this.appCheck) {
					let e = this.A.getImmediate({ optional: !0 });
					e ? r(e) : S("FirebaseAppCheckTokenProvider", "AppCheck not yet detected");
				}
			}), 0);
		}
		getToken() {
			let e = this.forceRefresh;
			return this.forceRefresh = !1, this.appCheck ? this.appCheck.getToken(e).then(((e) => e ? (T(typeof e.token == "string"), this.R = e.token, new Md(e.token)) : null)) : Promise.resolve(null);
		}
		invalidateToken() {
			this.forceRefresh = !0;
		}
		shutdown() {
			this.appCheck && this.o && this.appCheck.removeTokenListener(this.o), this.o = void 0;
		}
	}, Pd = class {
		getToken() {
			return Promise.resolve(new Md(""));
		}
		invalidateToken() {}
		start(e, t) {}
		shutdown() {}
	}, Fd = class {
		static newId() {
			let e = "";
			for (; e.length < 20;) {
				let t = cr(40);
				for (let n = 0; n < t.length; ++n) e.length < 20 && t[n] < 248 && (e += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".charAt(t[n] % 62));
			}
			return e;
		}
	}, I = class e {
		constructor(e, t) {
			if (this.seconds = e, this.nanoseconds = t, t < 0 || t >= 1e9) throw new F(P.INVALID_ARGUMENT, "Timestamp nanoseconds out of range: " + t);
			if (e < -62135596800 || e >= 253402300800) throw new F(P.INVALID_ARGUMENT, "Timestamp seconds out of range: " + e);
		}
		static now() {
			return e.fromMillis(Date.now());
		}
		static fromDate(t) {
			return e.fromMillis(t.getTime());
		}
		static fromMillis(t) {
			let n = Math.floor(t / 1e3), r = Math.floor(1e6 * (t - 1e3 * n));
			return new e(n, r);
		}
		toDate() {
			return new Date(this.toMillis());
		}
		toMillis() {
			return 1e3 * this.seconds + this.nanoseconds / 1e6;
		}
		_compareTo(e) {
			return this.seconds === e.seconds ? D(this.nanoseconds, e.nanoseconds) : D(this.seconds, e.seconds);
		}
		isEqual(e) {
			return e.seconds === this.seconds && e.nanoseconds === this.nanoseconds;
		}
		toString() {
			return "Timestamp(seconds=" + this.seconds + ", nanoseconds=" + this.nanoseconds + ")";
		}
		toJSON() {
			return {
				seconds: this.seconds,
				nanoseconds: this.nanoseconds
			};
		}
		valueOf() {
			let e = this.seconds - -62135596800;
			return String(e).padStart(12, "0") + "." + String(this.nanoseconds).padStart(9, "0");
		}
	}, L = class e {
		constructor(e) {
			this.timestamp = e;
		}
		static fromTimestamp(t) {
			return new e(t);
		}
		static min() {
			return new e(new I(0, 0));
		}
		static max() {
			return new e(new I(253402300799, 999999999));
		}
		compareTo(e) {
			return this.timestamp._compareTo(e.timestamp);
		}
		isEqual(e) {
			return this.timestamp.isEqual(e.timestamp);
		}
		toMicroseconds() {
			return 1e6 * this.timestamp.seconds + this.timestamp.nanoseconds / 1e3;
		}
		toString() {
			return "SnapshotVersion(" + this.timestamp.toString() + ")";
		}
		toTimestamp() {
			return this.timestamp;
		}
	}, Id = class e {
		constructor(e, t, n) {
			t === void 0 ? t = 0 : t > e.length && w(), n === void 0 ? n = e.length - t : n > e.length - t && w(), this.segments = e, this.offset = t, this.len = n;
		}
		get length() {
			return this.len;
		}
		isEqual(t) {
			return e.comparator(this, t) === 0;
		}
		child(t) {
			let n = this.segments.slice(this.offset, this.limit());
			return t instanceof e ? t.forEach(((e) => {
				n.push(e);
			})) : n.push(t), this.construct(n);
		}
		limit() {
			return this.offset + this.length;
		}
		popFirst(e) {
			return e = e === void 0 ? 1 : e, this.construct(this.segments, this.offset + e, this.length - e);
		}
		popLast() {
			return this.construct(this.segments, this.offset, this.length - 1);
		}
		firstSegment() {
			return this.segments[this.offset];
		}
		lastSegment() {
			return this.get(this.length - 1);
		}
		get(e) {
			return this.segments[this.offset + e];
		}
		isEmpty() {
			return this.length === 0;
		}
		isPrefixOf(e) {
			if (e.length < this.length) return !1;
			for (let t = 0; t < this.length; t++) if (this.get(t) !== e.get(t)) return !1;
			return !0;
		}
		isImmediateParentOf(e) {
			if (this.length + 1 !== e.length) return !1;
			for (let t = 0; t < this.length; t++) if (this.get(t) !== e.get(t)) return !1;
			return !0;
		}
		forEach(e) {
			for (let t = this.offset, n = this.limit(); t < n; t++) e(this.segments[t]);
		}
		toArray() {
			return this.segments.slice(this.offset, this.limit());
		}
		static comparator(e, t) {
			let n = Math.min(e.length, t.length);
			for (let r = 0; r < n; r++) {
				let n = e.get(r), i = t.get(r);
				if (n < i) return -1;
				if (n > i) return 1;
			}
			return e.length < t.length ? -1 : +(e.length > t.length);
		}
	}, R = class e extends Id {
		construct(t, n, r) {
			return new e(t, n, r);
		}
		canonicalString() {
			return this.toArray().join("/");
		}
		toString() {
			return this.canonicalString();
		}
		toUriEncodedString() {
			return this.toArray().map(encodeURIComponent).join("/");
		}
		static fromString(...t) {
			let n = [];
			for (let e of t) {
				if (e.indexOf("//") >= 0) throw new F(P.INVALID_ARGUMENT, `Invalid segment (${e}). Paths must not contain // in them.`);
				n.push(...e.split("/").filter(((e) => e.length > 0)));
			}
			return new e(n);
		}
		static emptyPath() {
			return new e([]);
		}
	}, Ld = /^[_a-zA-Z][_a-zA-Z0-9]*$/, z = class e extends Id {
		construct(t, n, r) {
			return new e(t, n, r);
		}
		static isValidIdentifier(e) {
			return Ld.test(e);
		}
		canonicalString() {
			return this.toArray().map(((t) => (t = t.replace(/\\/g, "\\\\").replace(/`/g, "\\`"), e.isValidIdentifier(t) || (t = "`" + t + "`"), t))).join(".");
		}
		toString() {
			return this.canonicalString();
		}
		isKeyField() {
			return this.length === 1 && this.get(0) === "__name__";
		}
		static keyField() {
			return new e(["__name__"]);
		}
		static fromServerFormat(t) {
			let n = [], r = "", i = 0, a = () => {
				if (r.length === 0) throw new F(P.INVALID_ARGUMENT, `Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);
				n.push(r), r = "";
			}, o = !1;
			for (; i < t.length;) {
				let e = t[i];
				if (e === "\\") {
					if (i + 1 === t.length) throw new F(P.INVALID_ARGUMENT, "Path has trailing escape character: " + t);
					let e = t[i + 1];
					if (e !== "\\" && e !== "." && e !== "`") throw new F(P.INVALID_ARGUMENT, "Path has invalid escape sequence: " + t);
					r += e, i += 2;
				} else e === "`" ? (o = !o, i++) : e !== "." || o ? (r += e, i++) : (a(), i++);
			}
			if (a(), o) throw new F(P.INVALID_ARGUMENT, "Unterminated ` in path: " + t);
			return new e(n);
		}
		static emptyPath() {
			return new e([]);
		}
	}, B = class e {
		constructor(e) {
			this.path = e;
		}
		static fromPath(t) {
			return new e(R.fromString(t));
		}
		static fromName(t) {
			return new e(R.fromString(t).popFirst(5));
		}
		static empty() {
			return new e(R.emptyPath());
		}
		get collectionGroup() {
			return this.path.popLast().lastSegment();
		}
		hasCollectionId(e) {
			return this.path.length >= 2 && this.path.get(this.path.length - 2) === e;
		}
		getCollectionGroup() {
			return this.path.get(this.path.length - 2);
		}
		getCollectionPath() {
			return this.path.popLast();
		}
		isEqual(e) {
			return e !== null && R.comparator(this.path, e.path) === 0;
		}
		toString() {
			return this.path.toString();
		}
		static comparator(e, t) {
			return R.comparator(e.path, t.path);
		}
		static isDocumentKey(e) {
			return e.length % 2 == 0;
		}
		static fromSegments(t) {
			return new e(new R(t.slice()));
		}
	}, Rd = class {
		constructor(e, t, n, r) {
			this.indexId = e, this.collectionGroup = t, this.fields = n, this.indexState = r;
		}
	}, Rd.UNKNOWN_ID = -1, zd = class {
		constructor(e, t) {
			this.fieldPath = e, this.kind = t;
		}
	}, Bd = class e {
		constructor(e, t) {
			this.sequenceNumber = e, this.offset = t;
		}
		static empty() {
			return new e(0, Vd.min());
		}
	}, Vd = class e {
		constructor(e, t, n) {
			this.readTime = e, this.documentKey = t, this.largestBatchId = n;
		}
		static min() {
			return new e(L.min(), B.empty(), -1);
		}
		static max() {
			return new e(L.max(), B.empty(), -1);
		}
	}, Hd = "The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.", Ud = class {
		constructor() {
			this.onCommittedListeners = [];
		}
		addOnCommittedListener(e) {
			this.onCommittedListeners.push(e);
		}
		raiseOnCommittedEvent() {
			this.onCommittedListeners.forEach(((e) => e()));
		}
	}, V = class e {
		constructor(e) {
			this.nextCallback = null, this.catchCallback = null, this.result = void 0, this.error = void 0, this.isDone = !1, this.callbackAttached = !1, e(((e) => {
				this.isDone = !0, this.result = e, this.nextCallback && this.nextCallback(e);
			}), ((e) => {
				this.isDone = !0, this.error = e, this.catchCallback && this.catchCallback(e);
			}));
		}
		catch(e) {
			return this.next(void 0, e);
		}
		next(t, n) {
			return this.callbackAttached && w(), this.callbackAttached = !0, this.isDone ? this.error ? this.wrapFailure(n, this.error) : this.wrapSuccess(t, this.result) : new e(((e, r) => {
				this.nextCallback = (n) => {
					this.wrapSuccess(t, n).next(e, r);
				}, this.catchCallback = (t) => {
					this.wrapFailure(n, t).next(e, r);
				};
			}));
		}
		toPromise() {
			return new Promise(((e, t) => {
				this.next(e, t);
			}));
		}
		wrapUserFunction(t) {
			try {
				let n = t();
				return n instanceof e ? n : e.resolve(n);
			} catch (t) {
				return e.reject(t);
			}
		}
		wrapSuccess(t, n) {
			return t ? this.wrapUserFunction((() => t(n))) : e.resolve(n);
		}
		wrapFailure(t, n) {
			return t ? this.wrapUserFunction((() => t(n))) : e.reject(n);
		}
		static resolve(t) {
			return new e(((e, n) => {
				e(t);
			}));
		}
		static reject(t) {
			return new e(((e, n) => {
				n(t);
			}));
		}
		static waitFor(t) {
			return new e(((e, n) => {
				let r = 0, i = 0, a = !1;
				t.forEach(((t) => {
					++r, t.next((() => {
						++i, a && i === r && e();
					}), ((e) => n(e)));
				})), a = !0, i === r && e();
			}));
		}
		static or(t) {
			let n = e.resolve(!1);
			for (let r of t) n = n.next(((t) => t ? e.resolve(t) : r()));
			return n;
		}
		static forEach(e, t) {
			let n = [];
			return e.forEach(((e, r) => {
				n.push(t.call(this, e, r));
			})), this.waitFor(n);
		}
		static mapArray(t, n) {
			return new e(((e, r) => {
				let i = t.length, a = Array(i), o = 0;
				for (let s = 0; s < i; s++) {
					let c = s;
					n(t[c]).next(((t) => {
						a[c] = t, ++o, o === i && e(a);
					}), ((e) => r(e)));
				}
			}));
		}
		static doWhile(t, n) {
			return new e(((e, r) => {
				let i = () => {
					!0 === t() ? n().next((() => {
						i();
					}), r) : e();
				};
				i();
			}));
		}
	}, Wd = class e {
		constructor(e, t) {
			this.action = e, this.transaction = t, this.aborted = !1, this.V = new Td(), this.transaction.oncomplete = () => {
				this.V.resolve();
			}, this.transaction.onabort = () => {
				t.error ? this.V.reject(new qd(e, t.error)) : this.V.resolve();
			}, this.transaction.onerror = (t) => {
				let n = Sr(t.target.error);
				this.V.reject(new qd(e, n));
			};
		}
		static open(t, n, r, i) {
			try {
				return new e(n, t.transaction(i, r));
			} catch (e) {
				throw new qd(n, e);
			}
		}
		get m() {
			return this.V.promise;
		}
		abort(e) {
			e && this.V.reject(e), this.aborted || (S("SimpleDb", "Aborting transaction:", e ? e.message : "Client-initiated abort"), this.aborted = !0, this.transaction.abort());
		}
		g() {
			let e = this.transaction;
			this.aborted || typeof e.commit != "function" || e.commit();
		}
		store(e) {
			let t = this.transaction.objectStore(e);
			return new Jd(t);
		}
	}, Gd = class e {
		constructor(t, n, r) {
			this.name = t, this.version = n, this.p = r, e.S(sn()) === 12.2 && C("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.");
		}
		static delete(e) {
			return S("SimpleDb", "Removing database:", e), xr(window.indexedDB.deleteDatabase(e)).toPromise();
		}
		static D() {
			if (!un()) return !1;
			if (e.v()) return !0;
			let t = sn(), n = e.S(t), r = 0 < n && n < 10, i = yr(t), a = 0 < i && i < 4.5;
			return !(t.indexOf("MSIE ") > 0 || t.indexOf("Trident/") > 0 || t.indexOf("Edge/") > 0 || r || a);
		}
		static v() {
			return typeof process < "u" && process.__PRIVATE_env?.C === "YES";
		}
		static F(e, t) {
			return e.store(t);
		}
		static S(e) {
			let t = e.match(/i(?:phone|pad|pod) os ([\d_]+)/i), n = t ? t[1].split("_").slice(0, 2).join(".") : "-1";
			return Number(n);
		}
		async M(e) {
			return this.db ||= (S("SimpleDb", "Opening database:", this.name), await new Promise(((t, n) => {
				let r = indexedDB.open(this.name, this.version);
				r.onsuccess = (e) => {
					let n = e.target.result;
					t(n);
				}, r.onblocked = () => {
					n(new qd(e, "Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."));
				}, r.onerror = (t) => {
					let r = t.target.error;
					r.name === "VersionError" ? n(new F(P.FAILED_PRECONDITION, "A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")) : r.name === "InvalidStateError" ? n(new F(P.FAILED_PRECONDITION, "Unable to open an IndexedDB connection. This could be due to running in a private browsing session on a browser whose private browsing sessions do not support IndexedDB: " + r)) : n(new qd(e, r));
				}, r.onupgradeneeded = (e) => {
					S("SimpleDb", "Database \"" + this.name + "\" requires upgrade from version:", e.oldVersion);
					let t = e.target.result;
					this.p.O(t, r.transaction, e.oldVersion, this.version).next((() => {
						S("SimpleDb", "Database upgrade to version " + this.version + " complete");
					}));
				};
			}))), this.N && (this.db.onversionchange = (e) => this.N(e)), this.db;
		}
		L(e) {
			this.N = e, this.db && (this.db.onversionchange = (t) => e(t));
		}
		async runTransaction(e, t, n, r) {
			let i = t === "readonly", a = 0;
			for (;;) {
				++a;
				try {
					this.db = await this.M(e);
					let t = Wd.open(this.db, e, i ? "readonly" : "readwrite", n), a = r(t).next(((e) => (t.g(), e))).catch(((e) => (t.abort(e), V.reject(e)))).toPromise();
					return a.catch((() => {})), await t.m, a;
				} catch (e) {
					let t = e, n = t.name !== "FirebaseError" && a < 3;
					if (S("SimpleDb", "Transaction failed with error:", t.message, "Retrying:", n), this.close(), !n) return Promise.reject(t);
				}
			}
		}
		close() {
			this.db && this.db.close(), this.db = void 0;
		}
	}, Kd = class {
		constructor(e) {
			this.B = e, this.k = !1, this.q = null;
		}
		get isDone() {
			return this.k;
		}
		get K() {
			return this.q;
		}
		set cursor(e) {
			this.B = e;
		}
		done() {
			this.k = !0;
		}
		$(e) {
			this.q = e;
		}
		delete() {
			return xr(this.B.delete());
		}
	}, qd = class extends F {
		constructor(e, t) {
			super(P.UNAVAILABLE, `IndexedDB transaction '${e}' failed: ${t}`), this.name = "IndexedDbTransactionError";
		}
	}, Jd = class {
		constructor(e) {
			this.store = e;
		}
		put(e, t) {
			let n;
			return t === void 0 ? (S("SimpleDb", "PUT", this.store.name, "<auto-key>", e), n = this.store.put(e)) : (S("SimpleDb", "PUT", this.store.name, e, t), n = this.store.put(t, e)), xr(n);
		}
		add(e) {
			return S("SimpleDb", "ADD", this.store.name, e, e), xr(this.store.add(e));
		}
		get(e) {
			return xr(this.store.get(e)).next(((t) => (t === void 0 && (t = null), S("SimpleDb", "GET", this.store.name, e, t), t)));
		}
		delete(e) {
			return S("SimpleDb", "DELETE", this.store.name, e), xr(this.store.delete(e));
		}
		count() {
			return S("SimpleDb", "COUNT", this.store.name), xr(this.store.count());
		}
		U(e, t) {
			let n = this.options(e, t), r = n.index ? this.store.index(n.index) : this.store;
			if (typeof r.getAll == "function") {
				let e = r.getAll(n.range);
				return new V(((t, n) => {
					e.onerror = (e) => {
						n(e.target.error);
					}, e.onsuccess = (e) => {
						t(e.target.result);
					};
				}));
			}
			{
				let e = this.cursor(n), t = [];
				return this.W(e, ((e, n) => {
					t.push(n);
				})).next((() => t));
			}
		}
		G(e, t) {
			let n = this.store.getAll(e, t === null ? void 0 : t);
			return new V(((e, t) => {
				n.onerror = (e) => {
					t(e.target.error);
				}, n.onsuccess = (t) => {
					e(t.target.result);
				};
			}));
		}
		j(e, t) {
			S("SimpleDb", "DELETE ALL", this.store.name);
			let n = this.options(e, t);
			n.H = !1;
			let r = this.cursor(n);
			return this.W(r, ((e, t, n) => n.delete()));
		}
		J(e, t) {
			let n;
			t ? n = e : (n = {}, t = e);
			let r = this.cursor(n);
			return this.W(r, t);
		}
		Y(e) {
			let t = this.cursor({});
			return new V(((n, r) => {
				t.onerror = (e) => {
					r(Sr(e.target.error));
				}, t.onsuccess = (t) => {
					let r = t.target.result;
					r ? e(r.primaryKey, r.value).next(((e) => {
						e ? r.continue() : n();
					})) : n();
				};
			}));
		}
		W(e, t) {
			let n = [];
			return new V(((r, i) => {
				e.onerror = (e) => {
					i(e.target.error);
				}, e.onsuccess = (e) => {
					let i = e.target.result;
					if (!i) return void r();
					let a = new Kd(i), o = t(i.primaryKey, i.value, a);
					if (o instanceof V) {
						let e = o.catch(((e) => (a.done(), V.reject(e))));
						n.push(e);
					}
					a.isDone ? r() : a.K === null ? i.continue() : i.continue(a.K);
				};
			})).next((() => V.waitFor(n)));
		}
		options(e, t) {
			let n;
			return e !== void 0 && (typeof e == "string" ? n = e : t = e), {
				index: n,
				range: t
			};
		}
		cursor(e) {
			let t = "next";
			if (e.reverse && (t = "prev"), e.index) {
				let n = this.store.index(e.index);
				return e.H ? n.openKeyCursor(e.range, t) : n.openCursor(e.range, t);
			}
			return this.store.openCursor(e.range, t);
		}
	}, Yd = !1, Xd = class {
		constructor(e, t) {
			this.asyncQueue = e, this.Z = t, this.task = null;
		}
		start() {
			this.X(15e3);
		}
		stop() {
			this.task &&= (this.task.cancel(), null);
		}
		get started() {
			return this.task !== null;
		}
		X(e) {
			S("IndexBackfiller", `Scheduled in ${e}ms`), this.task = this.asyncQueue.enqueueAfterDelay("index_backfill", e, (async () => {
				this.task = null;
				try {
					S("IndexBackfiller", `Documents written: ${await this.Z.ee()}`);
				} catch (e) {
					br(e) ? S("IndexBackfiller", "Ignoring IndexedDB error during index backfill: ", e) : await vr(e);
				}
				await this.X(6e4);
			}));
		}
	}, Zd = class {
		constructor(e, t) {
			this.localStore = e, this.persistence = t;
		}
		async ee(e = 50) {
			return this.persistence.runTransaction("Backfill Indexes", "readwrite-primary", ((t) => this.te(t, e)));
		}
		te(e, t) {
			let n = /* @__PURE__ */ new Set(), r = t, i = !0;
			return V.doWhile((() => !0 === i && r > 0), (() => this.localStore.indexManager.getNextCollectionGroupToUpdate(e).next(((t) => {
				if (t !== null && !n.has(t)) return S("IndexBackfiller", `Processing collection: ${t}`), this.ne(e, t, r).next(((e) => {
					r -= e, n.add(t);
				}));
				i = !1;
			})))).next((() => t - r));
		}
		ne(e, t, n) {
			return this.localStore.indexManager.getMinOffsetFromCollectionGroup(e, t).next(((r) => this.localStore.localDocuments.getNextDocuments(e, t, r, n).next(((n) => {
				let i = n.changes;
				return this.localStore.indexManager.updateIndexEntries(e, i).next((() => this.re(r, n))).next(((n) => (S("IndexBackfiller", `Updating offset: ${n}`), this.localStore.indexManager.updateCollectionGroup(e, t, n)))).next((() => i.size));
			}))));
		}
		re(e, t) {
			let n = e;
			return t.changes.forEach(((e, t) => {
				let r = gr(t);
				_r(r, n) > 0 && (n = r);
			})), new Vd(n.readTime, n.documentKey, Math.max(t.batchId, e.largestBatchId));
		}
	}, Qd = class {
		constructor(e, t) {
			this.previousValue = e, t && (t.sequenceNumberHandler = (e) => this.ie(e), this.se = (e) => t.writeSequenceNumber(e));
		}
		ie(e) {
			return this.previousValue = Math.max(e, this.previousValue), this.previousValue;
		}
		next() {
			let e = ++this.previousValue;
			return this.se && this.se(e), e;
		}
	}, Qd.oe = -1, $d = ["userId", "batchId"], ef = {}, tf = [
		"prefixPath",
		"collectionGroup",
		"readTime",
		"documentId"
	], nf = [
		"prefixPath",
		"collectionGroup",
		"documentId"
	], rf = [
		"collectionGroup",
		"readTime",
		"prefixPath",
		"documentId"
	], af = ["canonicalId", "targetId"], of = ["targetId", "path"], sf = ["path", "targetId"], cf = ["collectionId", "parent"], lf = ["indexId", "uid"], uf = ["uid", "sequenceNumber"], df = [
		"indexId",
		"uid",
		"arrayValue",
		"directionalValue",
		"orderedDocumentKey",
		"documentKey"
	], ff = [
		"indexId",
		"uid",
		"orderedDocumentKey"
	], pf = [
		"userId",
		"collectionPath",
		"documentId"
	], mf = [
		"userId",
		"collectionPath",
		"largestBatchId"
	], hf = [
		"userId",
		"collectionGroup",
		"largestBatchId"
	], gf = [
		"mutationQueues",
		"mutations",
		"documentMutations",
		"remoteDocuments",
		"targets",
		"owner",
		"targetGlobal",
		"targetDocuments",
		"clientMetadata",
		"remoteDocumentGlobal",
		"collectionParents",
		"bundles",
		"namedQueries"
	], _f = [...gf, "documentOverlays"], vf = [
		"mutationQueues",
		"mutations",
		"documentMutations",
		"remoteDocumentsV14",
		"targets",
		"owner",
		"targetGlobal",
		"targetDocuments",
		"clientMetadata",
		"remoteDocumentGlobal",
		"collectionParents",
		"bundles",
		"namedQueries",
		"documentOverlays"
	], yf = vf, bf = [
		...yf,
		"indexConfiguration",
		"indexState",
		"indexEntries"
	], xf = bf, Sf = [...bf, "globals"], Cf = class extends Ud {
		constructor(e, t) {
			super(), this._e = e, this.currentSequenceNumber = t;
		}
	}, H = class e {
		constructor(e, t) {
			this.comparator = e, this.root = t || Tf.EMPTY;
		}
		insert(t, n) {
			return new e(this.comparator, this.root.insert(t, n, this.comparator).copy(null, null, Tf.BLACK, null, null));
		}
		remove(t) {
			return new e(this.comparator, this.root.remove(t, this.comparator).copy(null, null, Tf.BLACK, null, null));
		}
		get(e) {
			let t = this.root;
			for (; !t.isEmpty();) {
				let n = this.comparator(e, t.key);
				if (n === 0) return t.value;
				n < 0 ? t = t.left : n > 0 && (t = t.right);
			}
			return null;
		}
		indexOf(e) {
			let t = 0, n = this.root;
			for (; !n.isEmpty();) {
				let r = this.comparator(e, n.key);
				if (r === 0) return t + n.left.size;
				r < 0 ? n = n.left : (t += n.left.size + 1, n = n.right);
			}
			return -1;
		}
		isEmpty() {
			return this.root.isEmpty();
		}
		get size() {
			return this.root.size;
		}
		minKey() {
			return this.root.minKey();
		}
		maxKey() {
			return this.root.maxKey();
		}
		inorderTraversal(e) {
			return this.root.inorderTraversal(e);
		}
		forEach(e) {
			this.inorderTraversal(((t, n) => (e(t, n), !1)));
		}
		toString() {
			let e = [];
			return this.inorderTraversal(((t, n) => (e.push(`${t}:${n}`), !1))), `{${e.join(", ")}}`;
		}
		reverseTraversal(e) {
			return this.root.reverseTraversal(e);
		}
		getIterator() {
			return new wf(this.root, null, this.comparator, !1);
		}
		getIteratorFrom(e) {
			return new wf(this.root, e, this.comparator, !1);
		}
		getReverseIterator() {
			return new wf(this.root, null, this.comparator, !0);
		}
		getReverseIteratorFrom(e) {
			return new wf(this.root, e, this.comparator, !0);
		}
	}, wf = class {
		constructor(e, t, n, r) {
			this.isReverse = r, this.nodeStack = [];
			let i = 1;
			for (; !e.isEmpty();) if (i = t ? n(e.key, t) : 1, t && r && (i *= -1), i < 0) e = this.isReverse ? e.left : e.right;
			else {
				if (i === 0) {
					this.nodeStack.push(e);
					break;
				}
				this.nodeStack.push(e), e = this.isReverse ? e.right : e.left;
			}
		}
		getNext() {
			let e = this.nodeStack.pop(), t = {
				key: e.key,
				value: e.value
			};
			if (this.isReverse) for (e = e.left; !e.isEmpty();) this.nodeStack.push(e), e = e.right;
			else for (e = e.right; !e.isEmpty();) this.nodeStack.push(e), e = e.left;
			return t;
		}
		hasNext() {
			return this.nodeStack.length > 0;
		}
		peek() {
			if (this.nodeStack.length === 0) return null;
			let e = this.nodeStack[this.nodeStack.length - 1];
			return {
				key: e.key,
				value: e.value
			};
		}
	}, Tf = class e {
		constructor(t, n, r, i, a) {
			this.key = t, this.value = n, this.color = r ?? e.RED, this.left = i ?? e.EMPTY, this.right = a ?? e.EMPTY, this.size = this.left.size + 1 + this.right.size;
		}
		copy(t, n, r, i, a) {
			return new e(t ?? this.key, n ?? this.value, r ?? this.color, i ?? this.left, a ?? this.right);
		}
		isEmpty() {
			return !1;
		}
		inorderTraversal(e) {
			return this.left.inorderTraversal(e) || e(this.key, this.value) || this.right.inorderTraversal(e);
		}
		reverseTraversal(e) {
			return this.right.reverseTraversal(e) || e(this.key, this.value) || this.left.reverseTraversal(e);
		}
		min() {
			return this.left.isEmpty() ? this : this.left.min();
		}
		minKey() {
			return this.min().key;
		}
		maxKey() {
			return this.right.isEmpty() ? this.key : this.right.maxKey();
		}
		insert(e, t, n) {
			let r = this, i = n(e, r.key);
			return r = i < 0 ? r.copy(null, null, null, r.left.insert(e, t, n), null) : i === 0 ? r.copy(null, t, null, null, null) : r.copy(null, null, null, null, r.right.insert(e, t, n)), r.fixUp();
		}
		removeMin() {
			if (this.left.isEmpty()) return e.EMPTY;
			let t = this;
			return t.left.isRed() || t.left.left.isRed() || (t = t.moveRedLeft()), t = t.copy(null, null, null, t.left.removeMin(), null), t.fixUp();
		}
		remove(t, n) {
			let r, i = this;
			if (n(t, i.key) < 0) i.left.isEmpty() || i.left.isRed() || i.left.left.isRed() || (i = i.moveRedLeft()), i = i.copy(null, null, null, i.left.remove(t, n), null);
			else {
				if (i.left.isRed() && (i = i.rotateRight()), i.right.isEmpty() || i.right.isRed() || i.right.left.isRed() || (i = i.moveRedRight()), n(t, i.key) === 0) {
					if (i.right.isEmpty()) return e.EMPTY;
					r = i.right.min(), i = i.copy(r.key, r.value, null, null, i.right.removeMin());
				}
				i = i.copy(null, null, null, null, i.right.remove(t, n));
			}
			return i.fixUp();
		}
		isRed() {
			return this.color;
		}
		fixUp() {
			let e = this;
			return e.right.isRed() && !e.left.isRed() && (e = e.rotateLeft()), e.left.isRed() && e.left.left.isRed() && (e = e.rotateRight()), e.left.isRed() && e.right.isRed() && (e = e.colorFlip()), e;
		}
		moveRedLeft() {
			let e = this.colorFlip();
			return e.right.left.isRed() && (e = e.copy(null, null, null, null, e.right.rotateRight()), e = e.rotateLeft(), e = e.colorFlip()), e;
		}
		moveRedRight() {
			let e = this.colorFlip();
			return e.left.left.isRed() && (e = e.rotateRight(), e = e.colorFlip()), e;
		}
		rotateLeft() {
			let t = this.copy(null, null, e.RED, null, this.right.left);
			return this.right.copy(null, null, this.color, t, null);
		}
		rotateRight() {
			let t = this.copy(null, null, e.RED, this.left.right, null);
			return this.left.copy(null, null, this.color, null, t);
		}
		colorFlip() {
			let e = this.left.copy(null, null, !this.left.color, null, null), t = this.right.copy(null, null, !this.right.color, null, null);
			return this.copy(null, null, !this.color, e, t);
		}
		checkMaxDepth() {
			return 2 ** this.check() <= this.size + 1;
		}
		check() {
			if (this.isRed() && this.left.isRed() || this.right.isRed()) throw w();
			let e = this.left.check();
			if (e !== this.right.check()) throw w();
			return e + +!this.isRed();
		}
	}, Tf.EMPTY = null, Tf.RED = !0, Tf.BLACK = !1, Tf.EMPTY = new class {
		constructor() {
			this.size = 0;
		}
		get key() {
			throw w();
		}
		get value() {
			throw w();
		}
		get color() {
			throw w();
		}
		get left() {
			throw w();
		}
		get right() {
			throw w();
		}
		copy(e, t, n, r, i) {
			return this;
		}
		insert(e, t, n) {
			return new Tf(e, t);
		}
		remove(e, t) {
			return this;
		}
		isEmpty() {
			return !0;
		}
		inorderTraversal(e) {
			return !1;
		}
		reverseTraversal(e) {
			return !1;
		}
		minKey() {
			return null;
		}
		maxKey() {
			return null;
		}
		isRed() {
			return !1;
		}
		checkMaxDepth() {
			return !0;
		}
		check() {
			return 0;
		}
	}(), U = class e {
		constructor(e) {
			this.comparator = e, this.data = new H(this.comparator);
		}
		has(e) {
			return this.data.get(e) !== null;
		}
		first() {
			return this.data.minKey();
		}
		last() {
			return this.data.maxKey();
		}
		get size() {
			return this.data.size;
		}
		indexOf(e) {
			return this.data.indexOf(e);
		}
		forEach(e) {
			this.data.inorderTraversal(((t, n) => (e(t), !1)));
		}
		forEachInRange(e, t) {
			let n = this.data.getIteratorFrom(e[0]);
			for (; n.hasNext();) {
				let r = n.getNext();
				if (this.comparator(r.key, e[1]) >= 0) return;
				t(r.key);
			}
		}
		forEachWhile(e, t) {
			let n;
			for (n = t === void 0 ? this.data.getIterator() : this.data.getIteratorFrom(t); n.hasNext();) if (!e(n.getNext().key)) return;
		}
		firstAfterOrEqual(e) {
			let t = this.data.getIteratorFrom(e);
			return t.hasNext() ? t.getNext().key : null;
		}
		getIterator() {
			return new Ef(this.data.getIterator());
		}
		getIteratorFrom(e) {
			return new Ef(this.data.getIteratorFrom(e));
		}
		add(e) {
			return this.copy(this.data.remove(e).insert(e, !0));
		}
		delete(e) {
			return this.has(e) ? this.copy(this.data.remove(e)) : this;
		}
		isEmpty() {
			return this.data.isEmpty();
		}
		unionWith(e) {
			let t = this;
			return t.size < e.size && (t = e, e = this), e.forEach(((e) => {
				t = t.add(e);
			})), t;
		}
		isEqual(t) {
			if (!(t instanceof e) || this.size !== t.size) return !1;
			let n = this.data.getIterator(), r = t.data.getIterator();
			for (; n.hasNext();) {
				let e = n.getNext().key, t = r.getNext().key;
				if (this.comparator(e, t) !== 0) return !1;
			}
			return !0;
		}
		toArray() {
			let e = [];
			return this.forEach(((t) => {
				e.push(t);
			})), e;
		}
		toString() {
			let e = [];
			return this.forEach(((t) => e.push(t))), "SortedSet(" + e.toString() + ")";
		}
		copy(t) {
			let n = new e(this.comparator);
			return n.data = t, n;
		}
	}, Ef = class {
		constructor(e) {
			this.iter = e;
		}
		getNext() {
			return this.iter.getNext().key;
		}
		hasNext() {
			return this.iter.hasNext();
		}
	}, Df = class e {
		constructor(e) {
			this.fields = e, e.sort(z.comparator);
		}
		static empty() {
			return new e([]);
		}
		unionWith(t) {
			let n = new U(z.comparator);
			for (let e of this.fields) n = n.add(e);
			for (let e of t) n = n.add(e);
			return new e(n.toArray());
		}
		covers(e) {
			for (let t of this.fields) if (t.isPrefixOf(e)) return !0;
			return !1;
		}
		isEqual(e) {
			return lr(this.fields, e.fields, ((e, t) => e.isEqual(t)));
		}
	}, Of = class extends Error {
		constructor() {
			super(...arguments), this.name = "Base64DecodeError";
		}
	}, W = class e {
		constructor(e) {
			this.binaryString = e;
		}
		static fromBase64String(t) {
			let n = function(e) {
				try {
					return atob(e);
				} catch (e) {
					throw typeof DOMException < "u" && e instanceof DOMException ? new Of("Invalid base64 string: " + e) : e;
				}
			}(t);
			return new e(n);
		}
		static fromUint8Array(t) {
			let n = function(e) {
				let t = "";
				for (let n = 0; n < e.length; ++n) t += String.fromCharCode(e[n]);
				return t;
			}(t);
			return new e(n);
		}
		[Symbol.iterator]() {
			let e = 0;
			return { next: () => e < this.binaryString.length ? {
				value: this.binaryString.charCodeAt(e++),
				done: !1
			} : {
				value: void 0,
				done: !0
			} };
		}
		toBase64() {
			return function(e) {
				return btoa(e);
			}(this.binaryString);
		}
		toUint8Array() {
			return function(e) {
				let t = new Uint8Array(e.length);
				for (let n = 0; n < e.length; n++) t[n] = e.charCodeAt(n);
				return t;
			}(this.binaryString);
		}
		approximateByteSize() {
			return 2 * this.binaryString.length;
		}
		compareTo(e) {
			return D(this.binaryString, e.binaryString);
		}
		isEqual(e) {
			return this.binaryString === e.binaryString;
		}
	}, W.EMPTY_BYTE_STRING = new W(""), kf = /* @__PURE__ */ new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/), Af = class {
		constructor(e, t, n, r, i, a, o, s, c) {
			this.databaseId = e, this.appId = t, this.persistenceKey = n, this.host = r, this.ssl = i, this.forceLongPolling = a, this.autoDetectLongPolling = o, this.longPollingOptions = s, this.useFetchStreams = c;
		}
	}, jf = class e {
		constructor(e, t) {
			this.projectId = e, this.database = t || "(default)";
		}
		static empty() {
			return new e("", "");
		}
		get isDefaultDatabase() {
			return this.database === "(default)";
		}
		isEqual(t) {
			return t instanceof e && t.projectId === this.projectId && t.database === this.database;
		}
	}, Mf = { mapValue: { fields: { __type__: { stringValue: "__max__" } } } }, Nf = { nullValue: "NULL_VALUE" }, Pf = { mapValue: { fields: {
		__type__: { stringValue: "__vector__" },
		value: { arrayValue: {} }
	} } }, Ff = class e {
		constructor(e) {
			this.value = e;
		}
		static empty() {
			return new e({ mapValue: {} });
		}
		field(e) {
			if (e.isEmpty()) return this.value;
			{
				let t = this.value;
				for (let n = 0; n < e.length - 1; ++n) if (t = (t.mapValue.fields || {})[e.get(n)], !ri(t)) return null;
				return t = (t.mapValue.fields || {})[e.lastSegment()], t || null;
			}
		}
		set(e, t) {
			this.getFieldsMap(e.popLast())[e.lastSegment()] = ai(t);
		}
		setAll(e) {
			let t = z.emptyPath(), n = {}, r = [];
			e.forEach(((e, i) => {
				if (!t.isImmediateParentOf(i)) {
					let e = this.getFieldsMap(t);
					this.applyChanges(e, n, r), n = {}, r = [], t = i.popLast();
				}
				e ? n[i.lastSegment()] = ai(e) : r.push(i.lastSegment());
			}));
			let i = this.getFieldsMap(t);
			this.applyChanges(i, n, r);
		}
		delete(e) {
			let t = this.field(e.popLast());
			ri(t) && t.mapValue.fields && delete t.mapValue.fields[e.lastSegment()];
		}
		isEqual(e) {
			return Wr(this.value, e.value);
		}
		getFieldsMap(e) {
			let t = this.value;
			t.mapValue.fields || (t.mapValue = { fields: {} });
			for (let n = 0; n < e.length; ++n) {
				let r = t.mapValue.fields[e.get(n)];
				ri(r) && r.mapValue.fields || (r = { mapValue: { fields: {} } }, t.mapValue.fields[e.get(n)] = r), t = r;
			}
			return t.mapValue.fields;
		}
		applyChanges(e, t, n) {
			Nr(t, ((t, n) => e[t] = n));
			for (let t of n) delete e[t];
		}
		clone() {
			return new e(ai(this.value));
		}
	}, If = class e {
		constructor(e, t, n, r, i, a, o) {
			this.key = e, this.documentType = t, this.version = n, this.readTime = r, this.createTime = i, this.data = a, this.documentState = o;
		}
		static newInvalidDocument(t) {
			return new e(t, 0, L.min(), L.min(), L.min(), Ff.empty(), 0);
		}
		static newFoundDocument(t, n, r, i) {
			return new e(t, 1, n, L.min(), r, i, 0);
		}
		static newNoDocument(t, n) {
			return new e(t, 2, n, L.min(), L.min(), Ff.empty(), 0);
		}
		static newUnknownDocument(t, n) {
			return new e(t, 3, n, L.min(), L.min(), Ff.empty(), 2);
		}
		convertToFoundDocument(e, t) {
			return !this.createTime.isEqual(L.min()) || this.documentType !== 2 && this.documentType !== 0 || (this.createTime = e), this.version = e, this.documentType = 1, this.data = t, this.documentState = 0, this;
		}
		convertToNoDocument(e) {
			return this.version = e, this.documentType = 2, this.data = Ff.empty(), this.documentState = 0, this;
		}
		convertToUnknownDocument(e) {
			return this.version = e, this.documentType = 3, this.data = Ff.empty(), this.documentState = 2, this;
		}
		setHasCommittedMutations() {
			return this.documentState = 2, this;
		}
		setHasLocalMutations() {
			return this.documentState = 1, this.version = L.min(), this;
		}
		setReadTime(e) {
			return this.readTime = e, this;
		}
		get hasLocalMutations() {
			return this.documentState === 1;
		}
		get hasCommittedMutations() {
			return this.documentState === 2;
		}
		get hasPendingWrites() {
			return this.hasLocalMutations || this.hasCommittedMutations;
		}
		isValidDocument() {
			return this.documentType !== 0;
		}
		isFoundDocument() {
			return this.documentType === 1;
		}
		isNoDocument() {
			return this.documentType === 2;
		}
		isUnknownDocument() {
			return this.documentType === 3;
		}
		isEqual(t) {
			return t instanceof e && this.key.isEqual(t.key) && this.version.isEqual(t.version) && this.documentType === t.documentType && this.documentState === t.documentState && this.data.isEqual(t.data);
		}
		mutableCopy() {
			return new e(this.key, this.documentType, this.version, this.readTime, this.createTime, this.data.clone(), this.documentState);
		}
		toString() {
			return `Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`;
		}
	}, Lf = class {
		constructor(e, t) {
			this.position = e, this.inclusive = t;
		}
	}, Rf = class {
		constructor(e, t = "asc") {
			this.field = e, this.dir = t;
		}
	}, zf = class {}, G = class e extends zf {
		constructor(e, t, n) {
			super(), this.field = e, this.op = t, this.value = n;
		}
		static create(t, n, r) {
			return t.isKeyField() ? n === "in" || n === "not-in" ? this.createKeyFieldInFilter(t, n, r) : new Bf(t, n, r) : n === "array-contains" ? new Uf(t, r) : n === "in" ? new Wf(t, r) : n === "not-in" ? new Gf(t, r) : n === "array-contains-any" ? new Kf(t, r) : new e(t, n, r);
		}
		static createKeyFieldInFilter(e, t, n) {
			return t === "in" ? new Vf(e, n) : new Hf(e, n);
		}
		matches(e) {
			let t = e.data.field(this.field);
			return this.op === "!=" ? t !== null && this.matchesComparison(Kr(t, this.value)) : t !== null && Ur(this.value) === Ur(t) && this.matchesComparison(Kr(t, this.value));
		}
		matchesComparison(e) {
			switch (this.op) {
				case "<": return e < 0;
				case "<=": return e <= 0;
				case "==": return e === 0;
				case "!=": return e !== 0;
				case ">": return e > 0;
				case ">=": return e >= 0;
				default: return w();
			}
		}
		isInequality() {
			return [
				"<",
				"<=",
				">",
				">=",
				"!=",
				"not-in"
			].indexOf(this.op) >= 0;
		}
		getFlattenedFilters() {
			return [this];
		}
		getFilters() {
			return [this];
		}
	}, K = class e extends zf {
		constructor(e, t) {
			super(), this.filters = e, this.op = t, this.ae = null;
		}
		static create(t, n) {
			return new e(t, n);
		}
		matches(e) {
			return hi(this) ? this.filters.find(((t) => !t.matches(e))) === void 0 : this.filters.find(((t) => t.matches(e))) !== void 0;
		}
		getFlattenedFilters() {
			return this.ae !== null || (this.ae = this.filters.reduce(((e, t) => e.concat(t.getFlattenedFilters())), [])), this.ae;
		}
		getFilters() {
			return Object.assign([], this.filters);
		}
	}, Bf = class extends G {
		constructor(e, t, n) {
			super(e, t, n), this.key = B.fromName(n.referenceValue);
		}
		matches(e) {
			let t = B.comparator(e.key, this.key);
			return this.matchesComparison(t);
		}
	}, Vf = class extends G {
		constructor(e, t) {
			super(e, "in", t), this.keys = Ci("in", t);
		}
		matches(e) {
			return this.keys.some(((t) => t.isEqual(e.key)));
		}
	}, Hf = class extends G {
		constructor(e, t) {
			super(e, "not-in", t), this.keys = Ci("not-in", t);
		}
		matches(e) {
			return !this.keys.some(((t) => t.isEqual(e.key)));
		}
	}, Uf = class extends G {
		constructor(e, t) {
			super(e, "array-contains", t);
		}
		matches(e) {
			let t = e.data.field(this.field);
			return ei(t) && Gr(t.arrayValue, this.value);
		}
	}, Wf = class extends G {
		constructor(e, t) {
			super(e, "in", t);
		}
		matches(e) {
			let t = e.data.field(this.field);
			return t !== null && Gr(this.value.arrayValue, t);
		}
	}, Gf = class extends G {
		constructor(e, t) {
			super(e, "not-in", t);
		}
		matches(e) {
			if (Gr(this.value.arrayValue, { nullValue: "NULL_VALUE" })) return !1;
			let t = e.data.field(this.field);
			return t !== null && !Gr(this.value.arrayValue, t);
		}
	}, Kf = class extends G {
		constructor(e, t) {
			super(e, "array-contains-any", t);
		}
		matches(e) {
			let t = e.data.field(this.field);
			return !(!ei(t) || !t.arrayValue.values) && t.arrayValue.values.some(((e) => Gr(this.value.arrayValue, e)));
		}
	}, qf = class {
		constructor(e, t = null, n = [], r = [], i = null, a = null, o = null) {
			this.path = e, this.collectionGroup = t, this.orderBy = n, this.filters = r, this.limit = i, this.startAt = a, this.endAt = o, this.ue = null;
		}
	}, Jf = class {
		constructor(e, t = null, n = [], r = [], i = null, a = "F", o = null, s = null) {
			this.path = e, this.collectionGroup = t, this.explicitOrderBy = n, this.filters = r, this.limit = i, this.limitType = a, this.startAt = o, this.endAt = s, this.ce = null, this.le = null, this.he = null, this.startAt, this.endAt;
		}
	}, Yf = class {
		constructor(e, t) {
			this.mapKeyFn = e, this.equalsFn = t, this.inner = {}, this.innerSize = 0;
		}
		get(e) {
			let t = this.mapKeyFn(e), n = this.inner[t];
			if (n !== void 0) {
				for (let [t, r] of n) if (this.equalsFn(t, e)) return r;
			}
		}
		has(e) {
			return this.get(e) !== void 0;
		}
		set(e, t) {
			let n = this.mapKeyFn(e), r = this.inner[n];
			if (r === void 0) return this.inner[n] = [[e, t]], void this.innerSize++;
			for (let n = 0; n < r.length; n++) if (this.equalsFn(r[n][0], e)) return void (r[n] = [e, t]);
			r.push([e, t]), this.innerSize++;
		}
		delete(e) {
			let t = this.mapKeyFn(e), n = this.inner[t];
			if (n === void 0) return !1;
			for (let r = 0; r < n.length; r++) if (this.equalsFn(n[r][0], e)) return n.length === 1 ? delete this.inner[t] : n.splice(r, 1), this.innerSize--, !0;
			return !1;
		}
		forEach(e) {
			Nr(this.inner, ((t, n) => {
				for (let [t, r] of n) e(t, r);
			}));
		}
		isEmpty() {
			return Fr(this.inner);
		}
		size() {
			return this.innerSize;
		}
	}, Xf = new H(B.comparator), Zf = new H(B.comparator), Qf = new H(B.comparator), $f = new U(B.comparator), ep = new U(D), tp = class {
		constructor() {
			this._ = void 0;
		}
	}, np = class extends tp {}, rp = class extends tp {
		constructor(e) {
			super(), this.elements = e;
		}
	}, ip = class extends tp {
		constructor(e) {
			super(), this.elements = e;
		}
	}, ap = class extends tp {
		constructor(e, t) {
			super(), this.serializer = e, this.Pe = t;
		}
	}, op = class {
		constructor(e, t) {
			this.field = e, this.transform = t;
		}
	}, sp = class {
		constructor(e, t) {
			this.version = e, this.transformResults = t;
		}
	}, q = class e {
		constructor(e, t) {
			this.updateTime = e, this.exists = t;
		}
		static none() {
			return new e();
		}
		static exists(t) {
			return new e(void 0, t);
		}
		static updateTime(t) {
			return new e(t);
		}
		get isNone() {
			return this.updateTime === void 0 && this.exists === void 0;
		}
		isEqual(e) {
			return this.exists === e.exists && (this.updateTime ? !!e.updateTime && this.updateTime.isEqual(e.updateTime) : !e.updateTime);
		}
	}, cp = class {}, lp = class extends cp {
		constructor(e, t, n, r = []) {
			super(), this.key = e, this.value = t, this.precondition = n, this.fieldTransforms = r, this.type = 0;
		}
		getFieldMask() {
			return null;
		}
	}, up = class extends cp {
		constructor(e, t, n, r, i = []) {
			super(), this.key = e, this.data = t, this.fieldMask = n, this.precondition = r, this.fieldTransforms = i, this.type = 1;
		}
		getFieldMask() {
			return this.fieldMask;
		}
	}, dp = class extends cp {
		constructor(e, t) {
			super(), this.key = e, this.precondition = t, this.type = 2, this.fieldTransforms = [];
		}
		getFieldMask() {
			return null;
		}
	}, fp = class extends cp {
		constructor(e, t) {
			super(), this.key = e, this.precondition = t, this.type = 3, this.fieldTransforms = [];
		}
		getFieldMask() {
			return null;
		}
	}, pp = class {
		constructor(e, t, n, r) {
			this.batchId = e, this.localWriteTime = t, this.baseMutations = n, this.mutations = r;
		}
		applyToRemoteDocument(e, t) {
			let n = t.mutationResults;
			for (let t = 0; t < this.mutations.length; t++) {
				let r = this.mutations[t];
				r.key.isEqual(e.key) && ma(r, e, n[t]);
			}
		}
		applyToLocalView(e, t) {
			for (let n of this.baseMutations) n.key.isEqual(e.key) && (t = ha(n, e, t, this.localWriteTime));
			for (let n of this.mutations) n.key.isEqual(e.key) && (t = ha(n, e, t, this.localWriteTime));
			return t;
		}
		applyToLocalDocumentSet(e, t) {
			let n = Qi();
			return this.mutations.forEach(((r) => {
				let i = e.get(r.key), a = i.overlayedDocument, o = this.applyToLocalView(a, i.mutatedFields);
				o = t.has(r.key) ? null : o;
				let s = pa(a, o);
				s !== null && n.set(r.key, s), a.isValidDocument() || a.convertToNoDocument(L.min());
			})), n;
		}
		keys() {
			return this.mutations.reduce(((e, t) => e.add(t.key)), A());
		}
		isEqual(e) {
			return this.batchId === e.batchId && lr(this.mutations, e.mutations, ((e, t) => _a(e, t))) && lr(this.baseMutations, e.baseMutations, ((e, t) => _a(e, t)));
		}
	}, mp = class e {
		constructor(e, t, n, r) {
			this.batch = e, this.commitVersion = t, this.mutationResults = n, this.docVersions = r;
		}
		static from(t, n, r) {
			T(t.mutations.length === r.length);
			let i = function() {
				return Qf;
			}(), a = t.mutations;
			for (let e = 0; e < a.length; e++) i = i.insert(a[e].key, r[e].version);
			return new e(t, n, r, i);
		}
	}, hp = class {
		constructor(e, t) {
			this.largestBatchId = e, this.mutation = t;
		}
		getKey() {
			return this.mutation.key;
		}
		isEqual(e) {
			return e !== null && this.mutation === e.mutation;
		}
		toString() {
			return `Overlay{\n      largestBatchId: ${this.largestBatchId},\n      mutation: ${this.mutation.toString()}\n    }`;
		}
	}, gp = class {
		constructor(e, t, n) {
			this.alias = e, this.aggregateType = t, this.fieldPath = n;
		}
	}, _p = class {
		constructor(e, t) {
			this.count = e, this.unchangedNames = t;
		}
	}, (J = vp ||= {})[J.OK = 0] = "OK", J[J.CANCELLED = 1] = "CANCELLED", J[J.UNKNOWN = 2] = "UNKNOWN", J[J.INVALID_ARGUMENT = 3] = "INVALID_ARGUMENT", J[J.DEADLINE_EXCEEDED = 4] = "DEADLINE_EXCEEDED", J[J.NOT_FOUND = 5] = "NOT_FOUND", J[J.ALREADY_EXISTS = 6] = "ALREADY_EXISTS", J[J.PERMISSION_DENIED = 7] = "PERMISSION_DENIED", J[J.UNAUTHENTICATED = 16] = "UNAUTHENTICATED", J[J.RESOURCE_EXHAUSTED = 8] = "RESOURCE_EXHAUSTED", J[J.FAILED_PRECONDITION = 9] = "FAILED_PRECONDITION", J[J.ABORTED = 10] = "ABORTED", J[J.OUT_OF_RANGE = 11] = "OUT_OF_RANGE", J[J.UNIMPLEMENTED = 12] = "UNIMPLEMENTED", J[J.INTERNAL = 13] = "INTERNAL", J[J.UNAVAILABLE = 14] = "UNAVAILABLE", J[J.DATA_LOSS = 15] = "DATA_LOSS", yp = null, bp = new Un([4294967295, 4294967295], 0), xp = class e {
		constructor(e, t, n) {
			if (this.bitmap = e, this.padding = t, this.hashCount = n, t < 0 || t >= 8) throw new Sp(`Invalid padding: ${t}`);
			if (n < 0 || e.length > 0 && this.hashCount === 0) throw new Sp(`Invalid hash count: ${n}`);
			if (e.length === 0 && t !== 0) throw new Sp(`Invalid padding when bitmap length is 0: ${t}`);
			this.Ie = 8 * e.length - t, this.Te = Un.fromNumber(this.Ie);
		}
		Ee(e, t, n) {
			let r = e.add(t.multiply(Un.fromNumber(n)));
			return r.compare(bp) === 1 && (r = new Un([r.getBits(0), r.getBits(1)], 0)), r.modulo(this.Te).toNumber();
		}
		de(e) {
			return (this.bitmap[Math.floor(e / 8)] & 1 << e % 8) != 0;
		}
		mightContain(e) {
			if (this.Ie === 0) return !1;
			let [t, n] = Ta(wa(e));
			for (let e = 0; e < this.hashCount; e++) {
				let r = this.Ee(t, n, e);
				if (!this.de(r)) return !1;
			}
			return !0;
		}
		static create(t, n, r) {
			let i = t % 8 == 0 ? 0 : 8 - t % 8, a = new Uint8Array(Math.ceil(t / 8)), o = new e(a, i, n);
			return r.forEach(((e) => o.insert(e))), o;
		}
		insert(e) {
			if (this.Ie === 0) return;
			let [t, n] = Ta(wa(e));
			for (let e = 0; e < this.hashCount; e++) {
				let r = this.Ee(t, n, e);
				this.Ae(r);
			}
		}
		Ae(e) {
			let t = Math.floor(e / 8), n = e % 8;
			this.bitmap[t] |= 1 << n;
		}
	}, Sp = class extends Error {
		constructor() {
			super(...arguments), this.name = "BloomFilterError";
		}
	}, Cp = class e {
		constructor(e, t, n, r, i) {
			this.snapshotVersion = e, this.targetChanges = t, this.targetMismatches = n, this.documentUpdates = r, this.resolvedLimboDocuments = i;
		}
		static createSynthesizedRemoteEventForCurrentChange(t, n, r) {
			let i = /* @__PURE__ */ new Map();
			return i.set(t, wp.createSynthesizedTargetChangeForCurrentChange(t, n, r)), new e(L.min(), i, new H(D), Ji(), A());
		}
	}, wp = class e {
		constructor(e, t, n, r, i) {
			this.resumeToken = e, this.current = t, this.addedDocuments = n, this.modifiedDocuments = r, this.removedDocuments = i;
		}
		static createSynthesizedTargetChangeForCurrentChange(t, n, r) {
			return new e(r, n, A(), A(), A());
		}
	}, Tp = class {
		constructor(e, t, n, r) {
			this.Re = e, this.removedTargetIds = t, this.key = n, this.Ve = r;
		}
	}, Ep = class {
		constructor(e, t) {
			this.targetId = e, this.me = t;
		}
	}, Dp = class {
		constructor(e, t, n = W.EMPTY_BYTE_STRING, r = null) {
			this.state = e, this.targetIds = t, this.resumeToken = n, this.cause = r;
		}
	}, Op = class {
		constructor() {
			this.fe = 0, this.ge = Da(), this.pe = W.EMPTY_BYTE_STRING, this.ye = !1, this.we = !0;
		}
		get current() {
			return this.ye;
		}
		get resumeToken() {
			return this.pe;
		}
		get Se() {
			return this.fe !== 0;
		}
		get be() {
			return this.we;
		}
		De(e) {
			e.approximateByteSize() > 0 && (this.we = !0, this.pe = e);
		}
		ve() {
			let e = A(), t = A(), n = A();
			return this.ge.forEach(((r, i) => {
				switch (i) {
					case 0:
						e = e.add(r);
						break;
					case 2:
						t = t.add(r);
						break;
					case 1:
						n = n.add(r);
						break;
					default: w();
				}
			})), new wp(this.pe, this.ye, e, t, n);
		}
		Ce() {
			this.we = !1, this.ge = Da();
		}
		Fe(e, t) {
			this.we = !0, this.ge = this.ge.insert(e, t);
		}
		Me(e) {
			this.we = !0, this.ge = this.ge.remove(e);
		}
		xe() {
			this.fe += 1;
		}
		Oe() {
			--this.fe, T(this.fe >= 0);
		}
		Ne() {
			this.we = !0, this.ye = !0;
		}
	}, kp = class {
		constructor(e) {
			this.Le = e, this.Be = /* @__PURE__ */ new Map(), this.ke = Ji(), this.qe = Ea(), this.Qe = new H(D);
		}
		Ke(e) {
			for (let t of e.Re) e.Ve && e.Ve.isFoundDocument() ? this.$e(t, e.Ve) : this.Ue(t, e.key, e.Ve);
			for (let t of e.removedTargetIds) this.Ue(t, e.key, e.Ve);
		}
		We(e) {
			this.forEachTarget(e, ((t) => {
				let n = this.Ge(t);
				switch (e.state) {
					case 0:
						this.ze(t) && n.De(e.resumeToken);
						break;
					case 1:
						n.Oe(), n.Se || n.Ce(), n.De(e.resumeToken);
						break;
					case 2:
						n.Oe(), n.Se || this.removeTarget(t);
						break;
					case 3:
						this.ze(t) && (n.Ne(), n.De(e.resumeToken));
						break;
					case 4:
						this.ze(t) && (this.je(t), n.De(e.resumeToken));
						break;
					default: w();
				}
			}));
		}
		forEachTarget(e, t) {
			e.targetIds.length > 0 ? e.targetIds.forEach(t) : this.Be.forEach(((e, n) => {
				this.ze(n) && t(n);
			}));
		}
		He(e) {
			let t = e.targetId, n = e.me.count, r = this.Je(t);
			if (r) {
				let i = r.target;
				if (Di(i)) if (n === 0) {
					let e = new B(i.path);
					this.Ue(t, e, If.newNoDocument(e, L.min()));
				} else T(n === 1);
				else {
					let r = this.Ye(t);
					if (r !== n) {
						let n = this.Ze(e), i = n ? this.Xe(n, e, r) : 1;
						if (i !== 0) {
							this.je(t);
							let e = i === 2 ? "TargetPurposeExistenceFilterMismatchBloom" : "TargetPurposeExistenceFilterMismatch";
							this.Qe = this.Qe.insert(t, e);
						}
						yp?.et(function(e, t, n, r, i) {
							let a = {
								localCacheCount: e,
								existenceFilterCount: t.count,
								databaseId: n.database,
								projectId: n.projectId
							}, o = t.unchangedNames;
							return o && (a.bloomFilter = {
								applied: i === 0,
								hashCount: o?.hashCount ?? 0,
								bitmapLength: o?.bits?.bitmap?.length ?? 0,
								padding: o?.bits?.padding ?? 0,
								mightContain: (e) => {
									var t;
									return (t = r?.mightContain(e)) != null && t;
								}
							}), a;
						}(r, e.me, this.Le.tt(), n, i));
					}
				}
			}
		}
		Ze(e) {
			let t = e.me.unchangedNames;
			if (!t || !t.bits) return null;
			let { bits: { bitmap: n = "", padding: r = 0 }, hashCount: i = 0 } = t, a, o;
			try {
				a = zr(n).toUint8Array();
			} catch (e) {
				if (e instanceof Of) return ar("Decoding the base64 bloom filter in existence filter failed (" + e.message + "); ignoring the bloom filter and falling back to full re-query."), null;
				throw e;
			}
			try {
				o = new xp(a, r, i);
			} catch (e) {
				return ar(e instanceof Sp ? "BloomFilter error: " : "Applying bloom filter failed: ", e), null;
			}
			return o.Ie === 0 ? null : o;
		}
		Xe(e, t, n) {
			return t.me.count === n - this.nt(e, t.targetId) ? 0 : 2;
		}
		nt(e, t) {
			let n = this.Le.getRemoteKeysForTarget(t), r = 0;
			return n.forEach(((n) => {
				let i = this.Le.tt(), a = `projects/${i.projectId}/databases/${i.database}/documents/${n.path.canonicalString()}`;
				e.mightContain(a) || (this.Ue(t, n, null), r++);
			})), r;
		}
		rt(e) {
			let t = /* @__PURE__ */ new Map();
			this.Be.forEach(((n, r) => {
				let i = this.Je(r);
				if (i) {
					if (n.current && Di(i.target)) {
						let t = new B(i.target.path);
						this.ke.get(t) !== null || this.it(r, t) || this.Ue(r, t, If.newNoDocument(t, e));
					}
					n.be && (t.set(r, n.ve()), n.Ce());
				}
			}));
			let n = A();
			this.qe.forEach(((e, t) => {
				let r = !0;
				t.forEachWhile(((e) => {
					let t = this.Je(e);
					return !t || t.purpose === "TargetPurposeLimboResolution" || (r = !1, !1);
				})), r && (n = n.add(e));
			})), this.ke.forEach(((t, n) => n.setReadTime(e)));
			let r = new Cp(e, t, this.Qe, this.ke, n);
			return this.ke = Ji(), this.qe = Ea(), this.Qe = new H(D), r;
		}
		$e(e, t) {
			if (!this.ze(e)) return;
			let n = this.it(e, t.key) ? 2 : 0;
			this.Ge(e).Fe(t.key, n), this.ke = this.ke.insert(t.key, t), this.qe = this.qe.insert(t.key, this.st(t.key).add(e));
		}
		Ue(e, t, n) {
			if (!this.ze(e)) return;
			let r = this.Ge(e);
			this.it(e, t) ? r.Fe(t, 1) : r.Me(t), this.qe = this.qe.insert(t, this.st(t).delete(e)), n && (this.ke = this.ke.insert(t, n));
		}
		removeTarget(e) {
			this.Be.delete(e);
		}
		Ye(e) {
			let t = this.Ge(e).ve();
			return this.Le.getRemoteKeysForTarget(e).size + t.addedDocuments.size - t.removedDocuments.size;
		}
		xe(e) {
			this.Ge(e).xe();
		}
		Ge(e) {
			let t = this.Be.get(e);
			return t || (t = new Op(), this.Be.set(e, t)), t;
		}
		st(e) {
			let t = this.qe.get(e);
			return t || (t = new U(D), this.qe = this.qe.insert(e, t)), t;
		}
		ze(e) {
			let t = this.Je(e) !== null;
			return t || S("WatchChangeAggregator", "Detected inactive target", e), t;
		}
		Je(e) {
			let t = this.Be.get(e);
			return t && t.Se ? null : this.Le.ot(e);
		}
		je(e) {
			this.Be.set(e, new Op()), this.Le.getRemoteKeysForTarget(e).forEach(((t) => {
				this.Ue(e, t, null);
			}));
		}
		it(e, t) {
			return this.Le.getRemoteKeysForTarget(e).has(t);
		}
	}, Ap = {
		asc: "ASCENDING",
		desc: "DESCENDING"
	}, jp = {
		"<": "LESS_THAN",
		"<=": "LESS_THAN_OR_EQUAL",
		">": "GREATER_THAN",
		">=": "GREATER_THAN_OR_EQUAL",
		"==": "EQUAL",
		"!=": "NOT_EQUAL",
		"array-contains": "ARRAY_CONTAINS",
		in: "IN",
		"not-in": "NOT_IN",
		"array-contains-any": "ARRAY_CONTAINS_ANY"
	}, Mp = {
		and: "AND",
		or: "OR"
	}, Np = class {
		constructor(e, t) {
			this.databaseId = e, this.useProto3Json = t;
		}
	}, Pp = class e {
		constructor(e, t, n, r, i = L.min(), a = L.min(), o = W.EMPTY_BYTE_STRING, s = null) {
			this.target = e, this.targetId = t, this.purpose = n, this.sequenceNumber = r, this.snapshotVersion = i, this.lastLimboFreeSnapshotVersion = a, this.resumeToken = o, this.expectedCount = s;
		}
		withSequenceNumber(t) {
			return new e(this.target, this.targetId, this.purpose, t, this.snapshotVersion, this.lastLimboFreeSnapshotVersion, this.resumeToken, this.expectedCount);
		}
		withResumeToken(t, n) {
			return new e(this.target, this.targetId, this.purpose, this.sequenceNumber, n, this.lastLimboFreeSnapshotVersion, t, null);
		}
		withExpectedCount(t) {
			return new e(this.target, this.targetId, this.purpose, this.sequenceNumber, this.snapshotVersion, this.lastLimboFreeSnapshotVersion, this.resumeToken, t);
		}
		withLastLimboFreeSnapshotVersion(t) {
			return new e(this.target, this.targetId, this.purpose, this.sequenceNumber, this.snapshotVersion, t, this.resumeToken, this.expectedCount);
		}
	}, Fp = class {
		constructor(e) {
			this.ct = e;
		}
	}, Ip = class {
		getBundleMetadata(e, t) {
			return xo(e).get(t).next(((e) => {
				if (e) return function(e) {
					return {
						id: e.bundleId,
						createTime: po(e.createTime),
						version: e.version
					};
				}(e);
			}));
		}
		saveBundleMetadata(e, t) {
			return xo(e).put(function(e) {
				return {
					bundleId: e.id,
					createTime: fo(j(e.createTime)),
					version: e.version
				};
			}(t));
		}
		getNamedQuery(e, t) {
			return So(e).get(t).next(((e) => {
				if (e) return function(e) {
					return {
						name: e.name,
						query: _o(e.bundledQuery),
						readTime: po(e.readTime)
					};
				}(e);
			}));
		}
		saveNamedQuery(e, t) {
			return So(e).put(function(e) {
				return {
					name: e.name,
					readTime: fo(j(e.readTime)),
					bundledQuery: e.bundledQuery
				};
			}(t));
		}
	}, Lp = class e {
		constructor(e, t) {
			this.serializer = e, this.userId = t;
		}
		static lt(t, n) {
			let r = n.uid || "";
			return new e(t, r);
		}
		getOverlay(e, t) {
			return Co(e).get(yo(this.userId, t)).next(((e) => e ? vo(this.serializer, e) : null));
		}
		getOverlays(e, t) {
			let n = Zi();
			return V.forEach(t, ((t) => this.getOverlay(e, t).next(((e) => {
				e !== null && n.set(t, e);
			})))).next((() => n));
		}
		saveOverlays(e, t, n) {
			let r = [];
			return n.forEach(((n, i) => {
				let a = new hp(t, i);
				r.push(this.ht(e, a));
			})), V.waitFor(r);
		}
		removeOverlaysForBatchId(e, t, n) {
			let r = /* @__PURE__ */ new Set();
			t.forEach(((e) => r.add(Er(e.getCollectionPath()))));
			let i = [];
			return r.forEach(((t) => {
				let r = IDBKeyRange.bound([
					this.userId,
					t,
					n
				], [
					this.userId,
					t,
					n + 1
				], !1, !0);
				i.push(Co(e).j("collectionPathOverlayIndex", r));
			})), V.waitFor(i);
		}
		getOverlaysForCollection(e, t, n) {
			let r = Zi(), i = Er(t), a = IDBKeyRange.bound([
				this.userId,
				i,
				n
			], [
				this.userId,
				i,
				Infinity
			], !0);
			return Co(e).U("collectionPathOverlayIndex", a).next(((e) => {
				for (let t of e) {
					let e = vo(this.serializer, t);
					r.set(e.getKey(), e);
				}
				return r;
			}));
		}
		getOverlaysForCollectionGroup(e, t, n, r) {
			let i = Zi(), a, o = IDBKeyRange.bound([
				this.userId,
				t,
				n
			], [
				this.userId,
				t,
				Infinity
			], !0);
			return Co(e).J({
				index: "collectionGroupOverlayIndex",
				range: o
			}, ((e, t, n) => {
				let o = vo(this.serializer, t);
				i.size() < r || o.largestBatchId === a ? (i.set(o.getKey(), o), a = o.largestBatchId) : n.done();
			})).next((() => i));
		}
		ht(e, t) {
			return Co(e).put(function(e, t, n) {
				let [r, i, a] = yo(t, n.mutation.key);
				return {
					userId: t,
					collectionPath: i,
					documentId: a,
					collectionGroup: n.mutation.key.getCollectionGroup(),
					largestBatchId: n.largestBatchId,
					overlayMutation: Ga(e.ct, n.mutation)
				};
			}(this.serializer, this.userId, t));
		}
	}, Rp = class {
		Pt(e) {
			return O(e, "globals");
		}
		getSessionToken(e) {
			return this.Pt(e).get("sessionToken").next(((e) => {
				let t = e?.value;
				return t ? W.fromUint8Array(t) : W.EMPTY_BYTE_STRING;
			}));
		}
		setSessionToken(e, t) {
			return this.Pt(e).put({
				name: "sessionToken",
				value: t.toUint8Array()
			});
		}
	}, zp = class {
		constructor() {}
		It(e, t) {
			this.Tt(e, t), t.Et();
		}
		Tt(e, t) {
			if ("nullValue" in e) this.dt(t, 5);
			else if ("booleanValue" in e) this.dt(t, 10), t.At(+!!e.booleanValue);
			else if ("integerValue" in e) this.dt(t, 15), t.At(k(e.integerValue));
			else if ("doubleValue" in e) {
				let n = k(e.doubleValue);
				isNaN(n) ? this.dt(t, 13) : (this.dt(t, 15), wr(n) ? t.At(0) : t.At(n));
			} else if ("timestampValue" in e) {
				let n = e.timestampValue;
				this.dt(t, 20), typeof n == "string" && (n = Rr(n)), t.Rt(`${n.seconds || ""}`), t.At(n.nanos || 0);
			} else if ("stringValue" in e) this.Vt(e.stringValue, t), this.ft(t);
			else if ("bytesValue" in e) this.dt(t, 30), t.gt(zr(e.bytesValue)), this.ft(t);
			else if ("referenceValue" in e) this.yt(e.referenceValue, t);
			else if ("geoPointValue" in e) {
				let n = e.geoPointValue;
				this.dt(t, 45), t.At(n.latitude || 0), t.At(n.longitude || 0);
			} else "mapValue" in e ? oi(e) ? this.dt(t, 2 ** 53 - 1) : ii(e) ? this.wt(e.mapValue, t) : (this.St(e.mapValue, t), this.ft(t)) : "arrayValue" in e ? (this.bt(e.arrayValue, t), this.ft(t)) : w();
		}
		Vt(e, t) {
			this.dt(t, 25), this.Dt(e, t);
		}
		Dt(e, t) {
			t.Rt(e);
		}
		St(e, t) {
			let n = e.fields || {};
			this.dt(t, 55);
			for (let e of Object.keys(n)) this.Vt(e, t), this.Tt(n[e], t);
		}
		wt(e, t) {
			let n = e.fields || {};
			this.dt(t, 53);
			let r = "value", i = n[r].arrayValue?.values?.length || 0;
			this.dt(t, 15), t.At(k(i)), this.Vt(r, t), this.Tt(n[r], t);
		}
		bt(e, t) {
			let n = e.values || [];
			this.dt(t, 50);
			for (let e of n) this.Tt(e, t);
		}
		yt(e, t) {
			this.dt(t, 37), B.fromName(e).path.forEach(((e) => {
				this.dt(t, 60), this.Dt(e, t);
			}));
		}
		dt(e, t) {
			e.At(t);
		}
		ft(e) {
			e.At(2);
		}
	}, zp.vt = new zp(), Bp = class {
		constructor() {
			this.buffer = /* @__PURE__ */ new Uint8Array(1024), this.position = 0;
		}
		Ct(e) {
			let t = e[Symbol.iterator](), n = t.next();
			for (; !n.done;) this.Ft(n.value), n = t.next();
			this.Mt();
		}
		xt(e) {
			let t = e[Symbol.iterator](), n = t.next();
			for (; !n.done;) this.Ot(n.value), n = t.next();
			this.Nt();
		}
		Lt(e) {
			for (let t of e) {
				let e = t.charCodeAt(0);
				if (e < 128) this.Ft(e);
				else if (e < 2048) this.Ft(960 | e >>> 6), this.Ft(128 | 63 & e);
				else if (t < "\ud800" || "\udbff" < t) this.Ft(480 | e >>> 12), this.Ft(128 | 63 & e >>> 6), this.Ft(128 | 63 & e);
				else {
					let e = t.codePointAt(0);
					this.Ft(240 | e >>> 18), this.Ft(128 | 63 & e >>> 12), this.Ft(128 | 63 & e >>> 6), this.Ft(128 | 63 & e);
				}
			}
			this.Mt();
		}
		Bt(e) {
			for (let t of e) {
				let e = t.charCodeAt(0);
				if (e < 128) this.Ot(e);
				else if (e < 2048) this.Ot(960 | e >>> 6), this.Ot(128 | 63 & e);
				else if (t < "\ud800" || "\udbff" < t) this.Ot(480 | e >>> 12), this.Ot(128 | 63 & e >>> 6), this.Ot(128 | 63 & e);
				else {
					let e = t.codePointAt(0);
					this.Ot(240 | e >>> 18), this.Ot(128 | 63 & e >>> 12), this.Ot(128 | 63 & e >>> 6), this.Ot(128 | 63 & e);
				}
			}
			this.Nt();
		}
		kt(e) {
			let t = this.qt(e), n = To(t);
			this.Qt(1 + n), this.buffer[this.position++] = 255 & n;
			for (let e = t.length - n; e < t.length; ++e) this.buffer[this.position++] = 255 & t[e];
		}
		Kt(e) {
			let t = this.qt(e), n = To(t);
			this.Qt(1 + n), this.buffer[this.position++] = ~(255 & n);
			for (let e = t.length - n; e < t.length; ++e) this.buffer[this.position++] = ~(255 & t[e]);
		}
		$t() {
			this.Ut(255), this.Ut(255);
		}
		Wt() {
			this.Gt(255), this.Gt(255);
		}
		reset() {
			this.position = 0;
		}
		seed(e) {
			this.Qt(e.length), this.buffer.set(e, this.position), this.position += e.length;
		}
		zt() {
			return this.buffer.slice(0, this.position);
		}
		qt(e) {
			let t = function(e) {
				let t = /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(8));
				return t.setFloat64(0, e, !1), new Uint8Array(t.buffer);
			}(e), n = (128 & t[0]) != 0;
			t[0] ^= n ? 255 : 128;
			for (let e = 1; e < t.length; ++e) t[e] ^= n ? 255 : 0;
			return t;
		}
		Ft(e) {
			let t = 255 & e;
			t === 0 ? (this.Ut(0), this.Ut(255)) : t === 255 ? (this.Ut(255), this.Ut(0)) : this.Ut(t);
		}
		Ot(e) {
			let t = 255 & e;
			t === 0 ? (this.Gt(0), this.Gt(255)) : t === 255 ? (this.Gt(255), this.Gt(0)) : this.Gt(e);
		}
		Mt() {
			this.Ut(0), this.Ut(1);
		}
		Nt() {
			this.Gt(0), this.Gt(1);
		}
		Ut(e) {
			this.Qt(1), this.buffer[this.position++] = e;
		}
		Gt(e) {
			this.Qt(1), this.buffer[this.position++] = ~e;
		}
		Qt(e) {
			let t = e + this.position;
			if (t <= this.buffer.length) return;
			let n = 2 * this.buffer.length;
			n < t && (n = t);
			let r = new Uint8Array(n);
			r.set(this.buffer), this.buffer = r;
		}
	}, Vp = class {
		constructor(e) {
			this.jt = e;
		}
		gt(e) {
			this.jt.Ct(e);
		}
		Rt(e) {
			this.jt.Lt(e);
		}
		At(e) {
			this.jt.kt(e);
		}
		Et() {
			this.jt.$t();
		}
	}, Hp = class {
		constructor(e) {
			this.jt = e;
		}
		gt(e) {
			this.jt.xt(e);
		}
		Rt(e) {
			this.jt.Bt(e);
		}
		At(e) {
			this.jt.Kt(e);
		}
		Et() {
			this.jt.Wt();
		}
	}, Up = class {
		constructor() {
			this.jt = new Bp(), this.Ht = new Vp(this.jt), this.Jt = new Hp(this.jt);
		}
		seed(e) {
			this.jt.seed(e);
		}
		Yt(e) {
			return e === 0 ? this.Ht : this.Jt;
		}
		zt() {
			return this.jt.zt();
		}
		reset() {
			this.jt.reset();
		}
	}, Wp = class e {
		constructor(e, t, n, r) {
			this.indexId = e, this.documentKey = t, this.arrayValue = n, this.directionalValue = r;
		}
		Zt() {
			let t = this.directionalValue.length, n = t === 0 || this.directionalValue[t - 1] === 255 ? t + 1 : t, r = new Uint8Array(n);
			return r.set(this.directionalValue, 0), n === t ? ++r[r.length - 1] : r.set([0], this.directionalValue.length), new e(this.indexId, this.documentKey, this.arrayValue, r);
		}
	}, Gp = class {
		constructor(e) {
			this.Xt = new U(((e, t) => z.comparator(e.field, t.field))), this.collectionId = e.collectionGroup == null ? e.path.lastSegment() : e.collectionGroup, this.en = e.orderBy, this.tn = [];
			for (let t of e.filters) {
				let e = t;
				e.isInequality() ? this.Xt = this.Xt.add(e) : this.tn.push(e);
			}
		}
		get nn() {
			return this.Xt.size > 1;
		}
		rn(e) {
			if (T(e.collectionGroup === this.collectionId), this.nn) return !1;
			let t = dr(e);
			if (t !== void 0 && !this.sn(t)) return !1;
			let n = fr(e), r = /* @__PURE__ */ new Set(), i = 0, a = 0;
			for (; i < n.length && this.sn(n[i]); ++i) r = r.add(n[i].fieldPath.canonicalString());
			if (i === n.length) return !0;
			if (this.Xt.size > 0) {
				let e = this.Xt.getIterator().getNext();
				if (!r.has(e.field.canonicalString())) {
					let t = n[i];
					if (!this.on(e, t) || !this._n(this.en[a++], t)) return !1;
				}
				++i;
			}
			for (; i < n.length; ++i) {
				let e = n[i];
				if (a >= this.en.length || !this._n(this.en[a++], e)) return !1;
			}
			return !0;
		}
		an() {
			if (this.nn) return null;
			let e = new U(z.comparator), t = [];
			for (let n of this.tn) if (!n.field.isKeyField()) if (n.op === "array-contains" || n.op === "array-contains-any") t.push(new zd(n.field, 2));
			else {
				if (e.has(n.field)) continue;
				e = e.add(n.field), t.push(new zd(n.field, 0));
			}
			for (let n of this.en) n.field.isKeyField() || e.has(n.field) || (e = e.add(n.field), t.push(new zd(n.field, n.dir === "asc" ? 0 : 1)));
			return new Rd(Rd.UNKNOWN_ID, this.collectionId, t, Bd.empty());
		}
		sn(e) {
			for (let t of this.tn) if (this.on(t, e)) return !0;
			return !1;
		}
		on(e, t) {
			if (e === void 0 || !e.field.isEqual(t.fieldPath)) return !1;
			let n = e.op === "array-contains" || e.op === "array-contains-any";
			return t.kind === 2 === n;
		}
		_n(e, t) {
			return !!e.field.isEqual(t.fieldPath) && (t.kind === 0 && e.dir === "asc" || t.kind === 1 && e.dir === "desc");
		}
	}, Kp = class {
		constructor() {
			this.un = new qp();
		}
		addToCollectionParentIndex(e, t) {
			return this.un.add(t), V.resolve();
		}
		getCollectionParents(e, t) {
			return V.resolve(this.un.getEntries(t));
		}
		addFieldIndex(e, t) {
			return V.resolve();
		}
		deleteFieldIndex(e, t) {
			return V.resolve();
		}
		deleteAllFieldIndexes(e) {
			return V.resolve();
		}
		createTargetIndexes(e, t) {
			return V.resolve();
		}
		getDocumentsMatchingTarget(e, t) {
			return V.resolve(null);
		}
		getIndexType(e, t) {
			return V.resolve(0);
		}
		getFieldIndexes(e, t) {
			return V.resolve([]);
		}
		getNextCollectionGroupToUpdate(e) {
			return V.resolve(null);
		}
		getMinOffset(e, t) {
			return V.resolve(Vd.min());
		}
		getMinOffsetFromCollectionGroup(e, t) {
			return V.resolve(Vd.min());
		}
		updateCollectionGroup(e, t, n) {
			return V.resolve();
		}
		updateIndexEntries(e, t) {
			return V.resolve();
		}
	}, qp = class {
		constructor() {
			this.index = {};
		}
		add(e) {
			let t = e.lastSegment(), n = e.popLast(), r = this.index[t] || new U(R.comparator), i = !r.has(n);
			return this.index[t] = r.add(n), i;
		}
		has(e) {
			let t = e.lastSegment(), n = e.popLast(), r = this.index[t];
			return r && r.has(n);
		}
		getEntries(e) {
			return (this.index[e] || new U(R.comparator)).toArray();
		}
	}, Jp = /* @__PURE__ */ new Uint8Array(), Yp = class {
		constructor(e, t) {
			this.databaseId = t, this.cn = new qp(), this.ln = new Yf(((e) => Ti(e)), ((e, t) => Ei(e, t))), this.uid = e.uid || "";
		}
		addToCollectionParentIndex(e, t) {
			if (!this.cn.has(t)) {
				let n = t.lastSegment(), r = t.popLast();
				e.addOnCommittedListener((() => {
					this.cn.add(t);
				}));
				let i = {
					collectionId: n,
					parent: Er(r)
				};
				return Lo(e).put(i);
			}
			return V.resolve();
		}
		getCollectionParents(e, t) {
			let n = [], r = IDBKeyRange.bound([t, ""], [ur(t), ""], !1, !0);
			return Lo(e).U(r).next(((e) => {
				for (let r of e) {
					if (r.collectionId !== t) break;
					n.push(kr(r.parent));
				}
				return n;
			}));
		}
		addFieldIndex(e, t) {
			let n = zo(e), r = function(e) {
				return {
					indexId: e.indexId,
					collectionGroup: e.collectionGroup,
					fields: e.fields.map(((e) => [e.fieldPath.canonicalString(), e.kind]))
				};
			}(t);
			delete r.indexId;
			let i = n.add(r);
			if (t.indexState) {
				let n = Bo(e);
				return i.next(((e) => {
					n.put(bo(e, this.uid, t.indexState.sequenceNumber, t.indexState.offset));
				}));
			}
			return i.next();
		}
		deleteFieldIndex(e, t) {
			let n = zo(e), r = Bo(e), i = Ro(e);
			return n.delete(t.indexId).next((() => r.delete(IDBKeyRange.bound([t.indexId], [t.indexId + 1], !1, !0)))).next((() => i.delete(IDBKeyRange.bound([t.indexId], [t.indexId + 1], !1, !0))));
		}
		deleteAllFieldIndexes(e) {
			let t = zo(e), n = Ro(e), r = Bo(e);
			return t.j().next((() => n.j())).next((() => r.j()));
		}
		createTargetIndexes(e, t) {
			return V.forEach(this.hn(t), ((t) => this.getIndexType(e, t).next(((n) => {
				if (n === 0 || n === 1) {
					let n = new Gp(t).an();
					if (n != null) return this.addFieldIndex(e, n);
				}
			}))));
		}
		getDocumentsMatchingTarget(e, t) {
			let n = Ro(e), r = !0, i = /* @__PURE__ */ new Map();
			return V.forEach(this.hn(t), ((t) => this.Pn(e, t).next(((e) => {
				r &&= !!e, i.set(t, e);
			})))).next((() => {
				if (r) {
					let e = A(), r = [];
					return V.forEach(i, ((i, a) => {
						S("IndexedDbIndexManager", `Using index ${function(e) {
							return `id=${e.indexId}|cg=${e.collectionGroup}|f=${e.fields.map(((e) => `${e.fieldPath}:${e.kind}`)).join(",")}`;
						}(i)} to execute ${Ti(t)}`);
						let o = function(e, t) {
							let n = dr(t);
							if (n === void 0) return null;
							for (let t of Oi(e, n.fieldPath)) switch (t.op) {
								case "array-contains-any": return t.value.arrayValue.values || [];
								case "array-contains": return [t.value];
							}
							return null;
						}(a, i), s = function(e, t) {
							let n = /* @__PURE__ */ new Map();
							for (let r of fr(t)) for (let t of Oi(e, r.fieldPath)) switch (t.op) {
								case "==":
								case "in":
									n.set(r.fieldPath.canonicalString(), t.value);
									break;
								case "not-in":
								case "!=": return n.set(r.fieldPath.canonicalString(), t.value), Array.from(n.values());
							}
							return null;
						}(a, i), c = function(e, t) {
							let n = [], r = !0;
							for (let i of fr(t)) {
								let t = i.kind === 0 ? ki(e, i.fieldPath, e.startAt) : Ai(e, i.fieldPath, e.startAt);
								n.push(t.value), r &&= t.inclusive;
							}
							return new Lf(n, r);
						}(a, i), l = function(e, t) {
							let n = [], r = !0;
							for (let i of fr(t)) {
								let t = i.kind === 0 ? Ai(e, i.fieldPath, e.endAt) : ki(e, i.fieldPath, e.endAt);
								n.push(t.value), r &&= t.inclusive;
							}
							return new Lf(n, r);
						}(a, i), u = this.In(i, a, c), d = this.In(i, a, l), f = this.Tn(i, a, s), p = this.En(i.indexId, o, u, c.inclusive, d, l.inclusive, f);
						return V.forEach(p, ((i) => n.G(i, t.limit).next(((t) => {
							t.forEach(((t) => {
								let n = B.fromSegments(t.documentKey);
								e.has(n) || (e = e.add(n), r.push(n));
							}));
						}))));
					})).next((() => r));
				}
				return V.resolve(null);
			}));
		}
		hn(e) {
			let t = this.ln.get(e);
			return t || (t = e.filters.length === 0 ? [e] : ko(K.create(e.filters, "and")).map(((t) => wi(e.path, e.collectionGroup, e.orderBy, t.getFilters(), e.limit, e.startAt, e.endAt))), this.ln.set(e, t), t);
		}
		En(e, t, n, r, i, a, o) {
			let s = (t == null ? 1 : t.length) * Math.max(n.length, i.length), c = s / (t == null ? 1 : t.length), l = [];
			for (let u = 0; u < s; ++u) {
				let s = t ? this.dn(t[u / c]) : Jp, d = this.An(e, s, n[u % c], r), f = this.Rn(e, s, i[u % c], a), p = o.map(((t) => this.An(e, s, t, !0)));
				l.push(...this.createRange(d, f, p));
			}
			return l;
		}
		An(e, t, n, r) {
			let i = new Wp(e, B.empty(), t, n);
			return r ? i : i.Zt();
		}
		Rn(e, t, n, r) {
			let i = new Wp(e, B.empty(), t, n);
			return r ? i.Zt() : i;
		}
		Pn(e, t) {
			let n = new Gp(t), r = t.collectionGroup == null ? t.path.lastSegment() : t.collectionGroup;
			return this.getFieldIndexes(e, r).next(((e) => {
				let t = null;
				for (let r of e) n.rn(r) && (!t || r.fields.length > t.fields.length) && (t = r);
				return t;
			}));
		}
		getIndexType(e, t) {
			let n = 2, r = this.hn(t);
			return V.forEach(r, ((t) => this.Pn(e, t).next(((e) => {
				e ? n !== 0 && e.fields.length < function(e) {
					let t = new U(z.comparator), n = !1;
					for (let r of e.filters) for (let e of r.getFlattenedFilters()) e.field.isKeyField() || (e.op === "array-contains" || e.op === "array-contains-any" ? n = !0 : t = t.add(e.field));
					for (let n of e.orderBy) n.field.isKeyField() || (t = t.add(n.field));
					return t.size + +!!n;
				}(t) && (n = 1) : n = 0;
			})))).next((() => function(e) {
				return e.limit !== null;
			}(t) && r.length > 1 && n === 2 ? 1 : n));
		}
		Vn(e, t) {
			let n = new Up();
			for (let r of fr(e)) {
				let e = t.data.field(r.fieldPath);
				if (e == null) return null;
				let i = n.Yt(r.kind);
				zp.vt.It(e, i);
			}
			return n.zt();
		}
		dn(e) {
			let t = new Up();
			return zp.vt.It(e, t.Yt(0)), t.zt();
		}
		mn(e, t) {
			let n = new Up();
			return zp.vt.It(Qr(this.databaseId, t), n.Yt(function(e) {
				let t = fr(e);
				return t.length === 0 ? 0 : t[t.length - 1].kind;
			}(e))), n.zt();
		}
		Tn(e, t, n) {
			if (n === null) return [];
			let r = [];
			r.push(new Up());
			let i = 0;
			for (let a of fr(e)) {
				let e = n[i++];
				for (let n of r) if (this.fn(t, a.fieldPath) && ei(e)) r = this.gn(r, a, e);
				else {
					let t = n.Yt(a.kind);
					zp.vt.It(e, t);
				}
			}
			return this.pn(r);
		}
		In(e, t, n) {
			return this.Tn(e, t, n.position);
		}
		pn(e) {
			let t = [];
			for (let n = 0; n < e.length; ++n) t[n] = e[n].zt();
			return t;
		}
		gn(e, t, n) {
			let r = [...e], i = [];
			for (let e of n.arrayValue.values || []) for (let n of r) {
				let r = new Up();
				r.seed(n.zt()), zp.vt.It(e, r.Yt(t.kind)), i.push(r);
			}
			return i;
		}
		fn(e, t) {
			return !!e.filters.find(((e) => e instanceof G && e.field.isEqual(t) && (e.op === "in" || e.op === "not-in")));
		}
		getFieldIndexes(e, t) {
			let n = zo(e), r = Bo(e);
			return (t ? n.U("collectionGroupIndex", IDBKeyRange.bound(t, t)) : n.U()).next(((e) => {
				let t = [];
				return V.forEach(e, ((e) => r.get([e.indexId, this.uid]).next(((n) => {
					t.push(function(e, t) {
						let n = t ? new Bd(t.sequenceNumber, new Vd(po(t.readTime), new B(kr(t.documentKey)), t.largestBatchId)) : Bd.empty(), r = e.fields.map((([e, t]) => new zd(z.fromServerFormat(e), t)));
						return new Rd(e.indexId, e.collectionGroup, r, n);
					}(e, n));
				})))).next((() => t));
			}));
		}
		getNextCollectionGroupToUpdate(e) {
			return this.getFieldIndexes(e).next(((e) => e.length === 0 ? null : (e.sort(((e, t) => {
				let n = e.indexState.sequenceNumber - t.indexState.sequenceNumber;
				return n === 0 ? D(e.collectionGroup, t.collectionGroup) : n;
			})), e[0].collectionGroup)));
		}
		updateCollectionGroup(e, t, n) {
			let r = zo(e), i = Bo(e);
			return this.yn(e).next(((e) => r.U("collectionGroupIndex", IDBKeyRange.bound(t, t)).next(((t) => V.forEach(t, ((t) => i.put(bo(t.indexId, this.uid, e, n))))))));
		}
		updateIndexEntries(e, t) {
			let n = /* @__PURE__ */ new Map();
			return V.forEach(t, ((t, r) => {
				let i = n.get(t.collectionGroup);
				return (i ? V.resolve(i) : this.getFieldIndexes(e, t.collectionGroup)).next(((i) => (n.set(t.collectionGroup, i), V.forEach(i, ((n) => this.wn(e, t, n).next(((t) => {
					let i = this.Sn(r, n);
					return t.isEqual(i) ? V.resolve() : this.bn(e, r, n, t, i);
				})))))));
			}));
		}
		Dn(e, t, n, r) {
			return Ro(e).put({
				indexId: r.indexId,
				uid: this.uid,
				arrayValue: r.arrayValue,
				directionalValue: r.directionalValue,
				orderedDocumentKey: this.mn(n, t.key),
				documentKey: t.key.path.toArray()
			});
		}
		vn(e, t, n, r) {
			return Ro(e).delete([
				r.indexId,
				this.uid,
				r.arrayValue,
				r.directionalValue,
				this.mn(n, t.key),
				t.key.path.toArray()
			]);
		}
		wn(e, t, n) {
			let r = Ro(e), i = new U(Eo);
			return r.J({
				index: "documentKeyIndex",
				range: IDBKeyRange.only([
					n.indexId,
					this.uid,
					this.mn(n, t)
				])
			}, ((e, r) => {
				i = i.add(new Wp(n.indexId, t, r.arrayValue, r.directionalValue));
			})).next((() => i));
		}
		Sn(e, t) {
			let n = new U(Eo), r = this.Vn(t, e);
			if (r == null) return n;
			let i = dr(t);
			if (i != null) {
				let a = e.data.field(i.fieldPath);
				if (ei(a)) for (let i of a.arrayValue.values || []) n = n.add(new Wp(t.indexId, e.key, this.dn(i), r));
			} else n = n.add(new Wp(t.indexId, e.key, Jp, r));
			return n;
		}
		bn(e, t, n, r, i) {
			S("IndexedDbIndexManager", "Updating index entries for document '%s'", t.key);
			let a = [];
			return function(e, t, n, r, i) {
				let a = e.getIterator(), o = t.getIterator(), s = Ir(a), c = Ir(o);
				for (; s || c;) {
					let e = !1, t = !1;
					if (s && c) {
						let r = n(s, c);
						r < 0 ? t = !0 : r > 0 && (e = !0);
					} else s == null ? e = !0 : t = !0;
					e ? (r(c), c = Ir(o)) : t ? (i(s), s = Ir(a)) : (s = Ir(a), c = Ir(o));
				}
			}(r, i, Eo, ((r) => {
				a.push(this.Dn(e, t, n, r));
			}), ((r) => {
				a.push(this.vn(e, t, n, r));
			})), V.waitFor(a);
		}
		yn(e) {
			let t = 1;
			return Bo(e).J({
				index: "sequenceNumberIndex",
				reverse: !0,
				range: IDBKeyRange.upperBound([this.uid, 2 ** 53 - 1])
			}, ((e, n, r) => {
				r.done(), t = n.sequenceNumber + 1;
			})).next((() => t));
		}
		createRange(e, t, n) {
			n = n.sort(((e, t) => Eo(e, t))).filter(((e, t, n) => !t || Eo(e, n[t - 1]) !== 0));
			let r = [];
			r.push(e);
			for (let i of n) {
				let n = Eo(i, e), a = Eo(i, t);
				if (n === 0) r[0] = e.Zt();
				else if (n > 0 && a < 0) r.push(i), r.push(i.Zt());
				else if (a > 0) break;
			}
			r.push(t);
			let i = [];
			for (let e = 0; e < r.length; e += 2) {
				if (this.Cn(r[e], r[e + 1])) return [];
				let t = [
					r[e].indexId,
					this.uid,
					r[e].arrayValue,
					r[e].directionalValue,
					Jp,
					[]
				], n = [
					r[e + 1].indexId,
					this.uid,
					r[e + 1].arrayValue,
					r[e + 1].directionalValue,
					Jp,
					[]
				];
				i.push(IDBKeyRange.bound(t, n));
			}
			return i;
		}
		Cn(e, t) {
			return Eo(e, t) > 0;
		}
		getMinOffsetFromCollectionGroup(e, t) {
			return this.getFieldIndexes(e, t).next(Vo);
		}
		getMinOffset(e, t) {
			return V.mapArray(this.hn(t), ((t) => this.Pn(e, t).next(((e) => e || w())))).next(Vo);
		}
	}, Xp = {
		didRun: !1,
		sequenceNumbersCollected: 0,
		targetsRemoved: 0,
		documentsRemoved: 0
	}, Zp = class e {
		constructor(e, t, n) {
			this.cacheSizeCollectionThreshold = e, this.percentileToCollect = t, this.maximumSequenceNumbersToCollect = n;
		}
		static withCacheSize(t) {
			return new e(t, e.DEFAULT_COLLECTION_PERCENTILE, e.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT);
		}
	}, Zp.DEFAULT_COLLECTION_PERCENTILE = 10, Zp.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT = 1e3, Zp.DEFAULT = new Zp(41943040, Zp.DEFAULT_COLLECTION_PERCENTILE, Zp.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT), Zp.DISABLED = new Zp(-1, 0, 0), Qp = class e {
		constructor(e, t, n, r) {
			this.userId = e, this.serializer = t, this.indexManager = n, this.referenceDelegate = r, this.Fn = {};
		}
		static lt(t, n, r, i) {
			T(t.uid !== "");
			let a = t.isAuthenticated() ? t.uid : "";
			return new e(a, n, r, i);
		}
		checkEmpty(e) {
			let t = !0, n = IDBKeyRange.bound([this.userId, -Infinity], [this.userId, Infinity]);
			return Go(e).J({
				index: "userMutationsIndex",
				range: n
			}, ((e, n, r) => {
				t = !1, r.done();
			})).next((() => t));
		}
		addMutationBatch(e, t, n, r) {
			let i = Ko(e), a = Go(e);
			return a.add({}).next(((o) => {
				T(typeof o == "number");
				let s = new pp(o, t, n, r), c = function(e, t, n) {
					let r = n.baseMutations.map(((t) => Ga(e.ct, t))), i = n.mutations.map(((t) => Ga(e.ct, t)));
					return {
						userId: t,
						batchId: n.batchId,
						localWriteTimeMs: n.localWriteTime.toMillis(),
						baseMutations: r,
						mutations: i
					};
				}(this.serializer, this.userId, s), l = [], u = new U(((e, t) => D(e.canonicalString(), t.canonicalString())));
				for (let e of r) {
					let t = jr(this.userId, e.key.path, o);
					u = u.add(e.key.path.popLast()), l.push(a.put(c)), l.push(i.put(t, ef));
				}
				return u.forEach(((t) => {
					l.push(this.indexManager.addToCollectionParentIndex(e, t));
				})), e.addOnCommittedListener((() => {
					this.Fn[o] = s.keys();
				})), V.waitFor(l).next((() => s));
			}));
		}
		lookupMutationBatch(e, t) {
			return Go(e).get(t).next(((e) => e ? (T(e.userId === this.userId), mo(this.serializer, e)) : null));
		}
		Mn(e, t) {
			return this.Fn[t] ? V.resolve(this.Fn[t]) : this.lookupMutationBatch(e, t).next(((e) => {
				if (e) {
					let n = e.keys();
					return this.Fn[t] = n, n;
				}
				return null;
			}));
		}
		getNextMutationBatchAfterBatchId(e, t) {
			let n = t + 1, r = IDBKeyRange.lowerBound([this.userId, n]), i = null;
			return Go(e).J({
				index: "userMutationsIndex",
				range: r
			}, ((e, t, r) => {
				t.userId === this.userId && (T(t.batchId >= n), i = mo(this.serializer, t)), r.done();
			})).next((() => i));
		}
		getHighestUnacknowledgedBatchId(e) {
			let t = IDBKeyRange.upperBound([this.userId, Infinity]), n = -1;
			return Go(e).J({
				index: "userMutationsIndex",
				range: t,
				reverse: !0
			}, ((e, t, r) => {
				n = t.batchId, r.done();
			})).next((() => n));
		}
		getAllMutationBatches(e) {
			let t = IDBKeyRange.bound([this.userId, -1], [this.userId, Infinity]);
			return Go(e).U("userMutationsIndex", t).next(((e) => e.map(((e) => mo(this.serializer, e)))));
		}
		getAllMutationBatchesAffectingDocumentKey(e, t) {
			let n = Ar(this.userId, t.path), r = IDBKeyRange.lowerBound(n), i = [];
			return Ko(e).J({ range: r }, ((n, r, a) => {
				let [o, s, c] = n, l = kr(s);
				if (o === this.userId && t.path.isEqual(l)) return Go(e).get(c).next(((e) => {
					if (!e) throw w();
					T(e.userId === this.userId), i.push(mo(this.serializer, e));
				}));
				a.done();
			})).next((() => i));
		}
		getAllMutationBatchesAffectingDocumentKeys(e, t) {
			let n = new U(D), r = [];
			return t.forEach(((t) => {
				let i = Ar(this.userId, t.path), a = IDBKeyRange.lowerBound(i), o = Ko(e).J({ range: a }, ((e, r, i) => {
					let [a, o, s] = e, c = kr(o);
					a === this.userId && t.path.isEqual(c) ? n = n.add(s) : i.done();
				}));
				r.push(o);
			})), V.waitFor(r).next((() => this.xn(e, n)));
		}
		getAllMutationBatchesAffectingQuery(e, t) {
			let n = t.path, r = n.length + 1, i = Ar(this.userId, n), a = IDBKeyRange.lowerBound(i), o = new U(D);
			return Ko(e).J({ range: a }, ((e, t, i) => {
				let [a, s, c] = e, l = kr(s);
				a === this.userId && n.isPrefixOf(l) ? l.length === r && (o = o.add(c)) : i.done();
			})).next((() => this.xn(e, o)));
		}
		xn(e, t) {
			let n = [], r = [];
			return t.forEach(((t) => {
				r.push(Go(e).get(t).next(((e) => {
					if (e === null) throw w();
					T(e.userId === this.userId), n.push(mo(this.serializer, e));
				})));
			})), V.waitFor(r).next((() => n));
		}
		removeMutationBatch(e, t) {
			return Ho(e._e, this.userId, t).next(((n) => (e.addOnCommittedListener((() => {
				this.On(t.batchId);
			})), V.forEach(n, ((t) => this.referenceDelegate.markPotentiallyOrphaned(e, t))))));
		}
		On(e) {
			delete this.Fn[e];
		}
		performConsistencyCheck(e) {
			return this.checkEmpty(e).next(((t) => {
				if (!t) return V.resolve();
				let n = IDBKeyRange.lowerBound(function(e) {
					return [e];
				}(this.userId)), r = [];
				return Ko(e).J({ range: n }, ((e, t, n) => {
					if (e[0] === this.userId) {
						let t = kr(e[1]);
						r.push(t);
					} else n.done();
				})).next((() => {
					T(r.length === 0);
				}));
			}));
		}
		containsKey(e, t) {
			return Wo(e, this.userId, t);
		}
		Nn(e) {
			return qo(e).get(this.userId).next(((e) => e || {
				userId: this.userId,
				lastAcknowledgedBatchId: -1,
				lastStreamToken: ""
			}));
		}
	}, $p = class e {
		constructor(e) {
			this.Ln = e;
		}
		next() {
			return this.Ln += 2, this.Ln;
		}
		static Bn() {
			return new e(0);
		}
		static kn() {
			return new e(-1);
		}
	}, em = class {
		constructor(e, t) {
			this.referenceDelegate = e, this.serializer = t;
		}
		allocateTargetId(e) {
			return this.qn(e).next(((t) => (t.highestTargetId = new $p(t.highestTargetId).next(), this.Qn(e, t).next((() => t.highestTargetId)))));
		}
		getLastRemoteSnapshotVersion(e) {
			return this.qn(e).next(((e) => L.fromTimestamp(new I(e.lastRemoteSnapshotVersion.seconds, e.lastRemoteSnapshotVersion.nanoseconds))));
		}
		getHighestSequenceNumber(e) {
			return this.qn(e).next(((e) => e.highestListenSequenceNumber));
		}
		setTargetsMetadata(e, t, n) {
			return this.qn(e).next(((r) => (r.highestListenSequenceNumber = t, n && (r.lastRemoteSnapshotVersion = n.toTimestamp()), t > r.highestListenSequenceNumber && (r.highestListenSequenceNumber = t), this.Qn(e, r))));
		}
		addTargetData(e, t) {
			return this.Kn(e, t).next((() => this.qn(e).next(((n) => (n.targetCount += 1, this.$n(t, n), this.Qn(e, n))))));
		}
		updateTargetData(e, t) {
			return this.Kn(e, t);
		}
		removeTargetData(e, t) {
			return this.removeMatchingKeysForTargetId(e, t.targetId).next((() => Jo(e).delete(t.targetId))).next((() => this.qn(e))).next(((t) => (T(t.targetCount > 0), --t.targetCount, this.Qn(e, t))));
		}
		removeTargets(e, t, n) {
			let r = 0, i = [];
			return Jo(e).J(((a, o) => {
				let s = ho(o);
				s.sequenceNumber <= t && n.get(s.targetId) === null && (r++, i.push(this.removeTargetData(e, s)));
			})).next((() => V.waitFor(i))).next((() => r));
		}
		forEachTarget(e, t) {
			return Jo(e).J(((e, n) => {
				t(ho(n));
			}));
		}
		qn(e) {
			return Yo(e).get("targetGlobalKey").next(((e) => (T(e !== null), e)));
		}
		Qn(e, t) {
			return Yo(e).put("targetGlobalKey", t);
		}
		Kn(e, t) {
			return Jo(e).put(go(this.serializer, t));
		}
		$n(e, t) {
			let n = !1;
			return e.targetId > t.highestTargetId && (t.highestTargetId = e.targetId, n = !0), e.sequenceNumber > t.highestListenSequenceNumber && (t.highestListenSequenceNumber = e.sequenceNumber, n = !0), n;
		}
		getTargetCount(e) {
			return this.qn(e).next(((e) => e.targetCount));
		}
		getTargetData(e, t) {
			let n = Ti(t), r = IDBKeyRange.bound([n, -Infinity], [n, Infinity]), i = null;
			return Jo(e).J({
				range: r,
				index: "queryTargetsIndex"
			}, ((e, n, r) => {
				let a = ho(n);
				Ei(t, a.target) && (i = a, r.done());
			})).next((() => i));
		}
		addMatchingKeys(e, t, n) {
			let r = [], i = Xo(e);
			return t.forEach(((t) => {
				let a = Er(t.path);
				r.push(i.put({
					targetId: n,
					path: a
				})), r.push(this.referenceDelegate.addReference(e, n, t));
			})), V.waitFor(r);
		}
		removeMatchingKeys(e, t, n) {
			let r = Xo(e);
			return V.forEach(t, ((t) => {
				let i = Er(t.path);
				return V.waitFor([r.delete([n, i]), this.referenceDelegate.removeReference(e, n, t)]);
			}));
		}
		removeMatchingKeysForTargetId(e, t) {
			let n = Xo(e), r = IDBKeyRange.bound([t], [t + 1], !1, !0);
			return n.delete(r);
		}
		getMatchingKeysForTargetId(e, t) {
			let n = IDBKeyRange.bound([t], [t + 1], !1, !0), r = Xo(e), i = A();
			return r.J({
				range: n,
				H: !0
			}, ((e, t, n) => {
				let r = kr(e[1]), a = new B(r);
				i = i.add(a);
			})).next((() => i));
		}
		containsKey(e, t) {
			let n = Er(t.path), r = IDBKeyRange.bound([n], [ur(n)], !1, !0), i = 0;
			return Xo(e).J({
				index: "documentTargetsIndex",
				H: !0,
				range: r
			}, (([e, t], n, r) => {
				e !== 0 && (i++, r.done());
			})).next((() => i > 0));
		}
		ot(e, t) {
			return Jo(e).get(t).next(((e) => e ? ho(e) : null));
		}
	}, tm = class {
		constructor(e) {
			this.Un = e, this.buffer = new U(Zo), this.Wn = 0;
		}
		Gn() {
			return ++this.Wn;
		}
		zn(e) {
			let t = [e, this.Gn()];
			if (this.buffer.size < this.Un) this.buffer = this.buffer.add(t);
			else {
				let e = this.buffer.last();
				Zo(t, e) < 0 && (this.buffer = this.buffer.delete(e).add(t));
			}
		}
		get maxValue() {
			return this.buffer.last()[0];
		}
	}, nm = class {
		constructor(e, t, n) {
			this.garbageCollector = e, this.asyncQueue = t, this.localStore = n, this.jn = null;
		}
		start() {
			this.garbageCollector.params.cacheSizeCollectionThreshold !== -1 && this.Hn(6e4);
		}
		stop() {
			this.jn &&= (this.jn.cancel(), null);
		}
		get started() {
			return this.jn !== null;
		}
		Hn(e) {
			S("LruGarbageCollector", `Garbage collection scheduled in ${e}ms`), this.jn = this.asyncQueue.enqueueAfterDelay("lru_garbage_collection", e, (async () => {
				this.jn = null;
				try {
					await this.localStore.collectGarbage(this.garbageCollector);
				} catch (e) {
					br(e) ? S("LruGarbageCollector", "Ignoring IndexedDB error during garbage collection: ", e) : await vr(e);
				}
				await this.Hn(3e5);
			}));
		}
	}, rm = class {
		constructor(e, t) {
			this.Jn = e, this.params = t;
		}
		calculateTargetCount(e, t) {
			return this.Jn.Yn(e).next(((e) => Math.floor(t / 100 * e)));
		}
		nthSequenceNumber(e, t) {
			if (t === 0) return V.resolve(Qd.oe);
			let n = new tm(t);
			return this.Jn.forEachTarget(e, ((e) => n.zn(e.sequenceNumber))).next((() => this.Jn.Zn(e, ((e) => n.zn(e))))).next((() => n.maxValue));
		}
		removeTargets(e, t, n) {
			return this.Jn.removeTargets(e, t, n);
		}
		removeOrphanedDocuments(e, t) {
			return this.Jn.removeOrphanedDocuments(e, t);
		}
		collect(e, t) {
			return this.params.cacheSizeCollectionThreshold === -1 ? (S("LruGarbageCollector", "Garbage collection skipped; disabled"), V.resolve(Xp)) : this.getCacheSize(e).next(((n) => n < this.params.cacheSizeCollectionThreshold ? (S("LruGarbageCollector", `Garbage collection skipped; Cache size ${n} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`), Xp) : this.Xn(e, t)));
		}
		getCacheSize(e) {
			return this.Jn.getCacheSize(e);
		}
		Xn(e, t) {
			let n, r, i, a, o, s, c, l = Date.now();
			return this.calculateTargetCount(e, this.params.percentileToCollect).next(((t) => (t > this.params.maximumSequenceNumbersToCollect ? (S("LruGarbageCollector", `Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${t}`), r = this.params.maximumSequenceNumbersToCollect) : r = t, a = Date.now(), this.nthSequenceNumber(e, r)))).next(((r) => (n = r, o = Date.now(), this.removeTargets(e, n, t)))).next(((t) => (i = t, s = Date.now(), this.removeOrphanedDocuments(e, n)))).next(((e) => (c = Date.now(), rr() <= x.DEBUG && S("LruGarbageCollector", `LRU Garbage Collection\n\tCounted targets in ${a - l}ms\n\tDetermined least recently used ${r} in ` + (o - a) + `ms
\tRemoved ${i} targets in ` + (s - o) + `ms
\tRemoved ${e} documents in ` + (c - s) + `ms
Total Duration: ${c - l}ms`), V.resolve({
				didRun: !0,
				sequenceNumbersCollected: r,
				targetsRemoved: i,
				documentsRemoved: e
			}))));
		}
	}, im = class {
		constructor(e, t) {
			this.db = e, this.garbageCollector = Qo(this, t);
		}
		Yn(e) {
			let t = this.er(e);
			return this.db.getTargetCache().getTargetCount(e).next(((e) => t.next(((t) => e + t))));
		}
		er(e) {
			let t = 0;
			return this.Zn(e, ((e) => {
				t++;
			})).next((() => t));
		}
		forEachTarget(e, t) {
			return this.db.getTargetCache().forEachTarget(e, t);
		}
		Zn(e, t) {
			return this.tr(e, ((e, n) => t(n)));
		}
		addReference(e, t, n) {
			return $o(e, n);
		}
		removeReference(e, t, n) {
			return $o(e, n);
		}
		removeTargets(e, t, n) {
			return this.db.getTargetCache().removeTargets(e, t, n);
		}
		markPotentiallyOrphaned(e, t) {
			return $o(e, t);
		}
		nr(e, t) {
			return function(e, t) {
				let n = !1;
				return qo(e).Y(((r) => Wo(e, r, t).next(((e) => (e && (n = !0), V.resolve(!e)))))).next((() => n));
			}(e, t);
		}
		removeOrphanedDocuments(e, t) {
			let n = this.db.getRemoteDocumentCache().newChangeBuffer(), r = [], i = 0;
			return this.tr(e, ((a, o) => {
				if (o <= t) {
					let t = this.nr(e, a).next(((t) => {
						if (!t) return i++, n.getEntry(e, a).next((() => (n.removeEntry(a, L.min()), Xo(e).delete(function(e) {
							return [0, Er(e.path)];
						}(a)))));
					}));
					r.push(t);
				}
			})).next((() => V.waitFor(r))).next((() => n.apply(e))).next((() => i));
		}
		removeTarget(e, t) {
			let n = t.withSequenceNumber(e.currentSequenceNumber);
			return this.db.getTargetCache().updateTargetData(e, n);
		}
		updateLimboDocument(e, t) {
			return $o(e, t);
		}
		tr(e, t) {
			let n = Xo(e), r, i = Qd.oe;
			return n.J({ index: "documentTargetsIndex" }, (([e, n], { path: a, sequenceNumber: o }) => {
				e === 0 ? (i !== Qd.oe && t(new B(kr(r)), i), i = o, r = a) : i = Qd.oe;
			})).next((() => {
				i !== Qd.oe && t(new B(kr(r)), i);
			}));
		}
		getCacheSize(e) {
			return this.db.getRemoteDocumentCache().getSize(e);
		}
	}, am = class {
		constructor() {
			this.changes = new Yf(((e) => e.toString()), ((e, t) => e.isEqual(t))), this.changesApplied = !1;
		}
		addEntry(e) {
			this.assertNotApplied(), this.changes.set(e.key, e);
		}
		removeEntry(e, t) {
			this.assertNotApplied(), this.changes.set(e, If.newInvalidDocument(e).setReadTime(t));
		}
		getEntry(e, t) {
			this.assertNotApplied();
			let n = this.changes.get(t);
			return n === void 0 ? this.getFromCache(e, t) : V.resolve(n);
		}
		getEntries(e, t) {
			return this.getAllFromCache(e, t);
		}
		apply(e) {
			return this.assertNotApplied(), this.changesApplied = !0, this.applyChanges(e);
		}
		assertNotApplied() {}
	}, om = class {
		constructor(e) {
			this.serializer = e;
		}
		setIndexManager(e) {
			this.indexManager = e;
		}
		addEntry(e, t, n) {
			return ns(e).put(n);
		}
		removeEntry(e, t, n) {
			return ns(e).delete(function(e, t) {
				let n = e.path.toArray();
				return [
					n.slice(0, n.length - 2),
					n[n.length - 2],
					uo(t),
					n[n.length - 1]
				];
			}(t, n));
		}
		updateMetadata(e, t) {
			return this.getMetadata(e).next(((n) => (n.byteSize += t, this.rr(e, n))));
		}
		getEntry(e, t) {
			let n = If.newInvalidDocument(t);
			return ns(e).J({
				index: "documentKeyIndex",
				range: IDBKeyRange.only(rs(t))
			}, ((e, r) => {
				n = this.ir(t, r);
			})).next((() => n));
		}
		sr(e, t) {
			let n = {
				size: 0,
				document: If.newInvalidDocument(t)
			};
			return ns(e).J({
				index: "documentKeyIndex",
				range: IDBKeyRange.only(rs(t))
			}, ((e, r) => {
				n = {
					document: this.ir(t, r),
					size: Uo(r)
				};
			})).next((() => n));
		}
		getEntries(e, t) {
			let n = Ji();
			return this._r(e, t, ((e, t) => {
				let r = this.ir(e, t);
				n = n.insert(e, r);
			})).next((() => n));
		}
		ar(e, t) {
			let n = Ji(), r = new H(B.comparator);
			return this._r(e, t, ((e, t) => {
				let i = this.ir(e, t);
				n = n.insert(e, i), r = r.insert(e, Uo(t));
			})).next((() => ({
				documents: n,
				ur: r
			})));
		}
		_r(e, t, n) {
			if (t.isEmpty()) return V.resolve();
			let r = new U(as);
			t.forEach(((e) => r = r.add(e)));
			let i = IDBKeyRange.bound(rs(r.first()), rs(r.last())), a = r.getIterator(), o = a.getNext();
			return ns(e).J({
				index: "documentKeyIndex",
				range: i
			}, ((e, t, r) => {
				let i = B.fromSegments([
					...t.prefixPath,
					t.collectionGroup,
					t.documentId
				]);
				for (; o && as(o, i) < 0;) n(o, null), o = a.getNext();
				o && o.isEqual(i) && (n(o, t), o = a.hasNext() ? a.getNext() : null), o ? r.$(rs(o)) : r.done();
			})).next((() => {
				for (; o;) n(o, null), o = a.hasNext() ? a.getNext() : null;
			}));
		}
		getDocumentsMatchingQuery(e, t, n, r, i) {
			let a = t.path, o = [
				a.popLast().toArray(),
				a.lastSegment(),
				uo(n.readTime),
				n.documentKey.path.isEmpty() ? "" : n.documentKey.path.lastSegment()
			], s = [
				a.popLast().toArray(),
				a.lastSegment(),
				[2 ** 53 - 1, 2 ** 53 - 1],
				""
			];
			return ns(e).U(IDBKeyRange.bound(o, s, !0)).next(((e) => {
				i?.incrementDocumentReadCount(e.length);
				let n = Ji();
				for (let i of e) {
					let e = this.ir(B.fromSegments(i.prefixPath.concat(i.collectionGroup, i.documentId)), i);
					e.isFoundDocument() && (Wi(t, e) || r.has(e.key)) && (n = n.insert(e.key, e));
				}
				return n;
			}));
		}
		getAllFromCollectionGroup(e, t, n, r) {
			let i = Ji(), a = is(t, n), o = is(t, Vd.max());
			return ns(e).J({
				index: "collectionGroupIndex",
				range: IDBKeyRange.bound(a, o, !0)
			}, ((e, t, n) => {
				let a = this.ir(B.fromSegments(t.prefixPath.concat(t.collectionGroup, t.documentId)), t);
				i = i.insert(a.key, a), i.size === r && n.done();
			})).next((() => i));
		}
		newChangeBuffer(e) {
			return new sm(this, !!e && e.trackRemovals);
		}
		getSize(e) {
			return this.getMetadata(e).next(((e) => e.byteSize));
		}
		getMetadata(e) {
			return ts(e).get("remoteDocumentGlobalKey").next(((e) => (T(!!e), e)));
		}
		rr(e, t) {
			return ts(e).put("remoteDocumentGlobalKey", t);
		}
		ir(e, t) {
			if (t) {
				let e = co(this.serializer, t);
				if (!(e.isNoDocument() && e.version.isEqual(L.min()))) return e;
			}
			return If.newInvalidDocument(e);
		}
	}, sm = class extends am {
		constructor(e, t) {
			super(), this.cr = e, this.trackRemovals = t, this.lr = new Yf(((e) => e.toString()), ((e, t) => e.isEqual(t)));
		}
		applyChanges(e) {
			let t = [], n = 0, r = new U(((e, t) => D(e.canonicalString(), t.canonicalString())));
			return this.changes.forEach(((i, a) => {
				let o = this.lr.get(i);
				if (t.push(this.cr.removeEntry(e, i, o.readTime)), a.isValidDocument()) {
					let s = lo(this.cr.serializer, a);
					r = r.add(i.path.popLast());
					let c = Uo(s);
					n += c - o.size, t.push(this.cr.addEntry(e, i, s));
				} else if (n -= o.size, this.trackRemovals) {
					let n = lo(this.cr.serializer, a.convertToNoDocument(L.min()));
					t.push(this.cr.addEntry(e, i, n));
				}
			})), r.forEach(((n) => {
				t.push(this.cr.indexManager.addToCollectionParentIndex(e, n));
			})), t.push(this.cr.updateMetadata(e, n)), V.waitFor(t);
		}
		getFromCache(e, t) {
			return this.cr.sr(e, t).next(((e) => (this.lr.set(t, {
				size: e.size,
				readTime: e.document.readTime
			}), e.document)));
		}
		getAllFromCache(e, t) {
			return this.cr.ar(e, t).next((({ documents: e, ur: t }) => (t.forEach(((t, n) => {
				this.lr.set(t, {
					size: n,
					readTime: e.get(t).readTime
				});
			})), e)));
		}
	}, cm = class {
		constructor(e, t) {
			this.overlayedDocument = e, this.mutatedFields = t;
		}
	}, lm = class {
		constructor(e, t, n, r) {
			this.remoteDocumentCache = e, this.mutationQueue = t, this.documentOverlayCache = n, this.indexManager = r;
		}
		getDocument(e, t) {
			let n = null;
			return this.documentOverlayCache.getOverlay(e, t).next(((r) => (n = r, this.remoteDocumentCache.getEntry(e, t)))).next(((e) => (n !== null && ha(n.mutation, e, Df.empty(), I.now()), e)));
		}
		getDocuments(e, t) {
			return this.remoteDocumentCache.getEntries(e, t).next(((t) => this.getLocalViewOfDocuments(e, t, A()).next((() => t))));
		}
		getLocalViewOfDocuments(e, t, n = A()) {
			let r = Zi();
			return this.populateOverlays(e, r, t).next((() => this.computeViews(e, t, r, n).next(((e) => {
				let t = Yi();
				return e.forEach(((e, n) => {
					t = t.insert(e, n.overlayedDocument);
				})), t;
			}))));
		}
		getOverlayedDocuments(e, t) {
			let n = Zi();
			return this.populateOverlays(e, n, t).next((() => this.computeViews(e, t, n, A())));
		}
		populateOverlays(e, t, n) {
			let r = [];
			return n.forEach(((e) => {
				t.has(e) || r.push(e);
			})), this.documentOverlayCache.getOverlays(e, r).next(((e) => {
				e.forEach(((e, n) => {
					t.set(e, n);
				}));
			}));
		}
		computeViews(e, t, n, r) {
			let i = Ji(), a = $i(), o = function() {
				return $i();
			}();
			return t.forEach(((e, t) => {
				let o = n.get(t.key);
				r.has(t.key) && (o === void 0 || o.mutation instanceof up) ? i = i.insert(t.key, t) : o === void 0 ? a.set(t.key, Df.empty()) : (a.set(t.key, o.mutation.getFieldMask()), ha(o.mutation, t, o.mutation.getFieldMask(), I.now()));
			})), this.recalculateAndSaveOverlays(e, i).next(((e) => (e.forEach(((e, t) => a.set(e, t))), t.forEach(((e, t) => o.set(e, new cm(t, a.get(e) ?? null)))), o)));
		}
		recalculateAndSaveOverlays(e, t) {
			let n = $i(), r = new H(((e, t) => e - t)), i = A();
			return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e, t).next(((e) => {
				for (let i of e) i.keys().forEach(((e) => {
					let a = t.get(e);
					if (a === null) return;
					let o = n.get(e) || Df.empty();
					o = i.applyToLocalView(a, o), n.set(e, o);
					let s = (r.get(i.batchId) || A()).add(e);
					r = r.insert(i.batchId, s);
				}));
			})).next((() => {
				let a = [], o = r.getReverseIterator();
				for (; o.hasNext();) {
					let r = o.getNext(), s = r.key, c = r.value, l = Qi();
					c.forEach(((e) => {
						if (!i.has(e)) {
							let r = pa(t.get(e), n.get(e));
							r !== null && l.set(e, r), i = i.add(e);
						}
					})), a.push(this.documentOverlayCache.saveOverlays(e, s, l));
				}
				return V.waitFor(a);
			})).next((() => n));
		}
		recalculateAndSaveOverlaysForDocumentKeys(e, t) {
			return this.remoteDocumentCache.getEntries(e, t).next(((t) => this.recalculateAndSaveOverlays(e, t)));
		}
		getDocumentsMatchingQuery(e, t, n, r) {
			return function(e) {
				return B.isDocumentKey(e.path) && e.collectionGroup === null && e.filters.length === 0;
			}(t) ? this.getDocumentsMatchingDocumentQuery(e, t.path) : Pi(t) ? this.getDocumentsMatchingCollectionGroupQuery(e, t, n, r) : this.getDocumentsMatchingCollectionQuery(e, t, n, r);
		}
		getNextDocuments(e, t, n, r) {
			return this.remoteDocumentCache.getAllFromCollectionGroup(e, t, n, r).next(((i) => {
				let a = r - i.size > 0 ? this.documentOverlayCache.getOverlaysForCollectionGroup(e, t, n.largestBatchId, r - i.size) : V.resolve(Zi()), o = -1, s = i;
				return a.next(((t) => V.forEach(t, ((t, n) => (o < n.largestBatchId && (o = n.largestBatchId), i.get(t) ? V.resolve() : this.remoteDocumentCache.getEntry(e, t).next(((e) => {
					s = s.insert(t, e);
				}))))).next((() => this.populateOverlays(e, t, i))).next((() => this.computeViews(e, s, t, A()))).next(((e) => ({
					batchId: o,
					changes: Xi(e)
				})))));
			}));
		}
		getDocumentsMatchingDocumentQuery(e, t) {
			return this.getDocument(e, new B(t)).next(((e) => {
				let t = Yi();
				return e.isFoundDocument() && (t = t.insert(e.key, e)), t;
			}));
		}
		getDocumentsMatchingCollectionGroupQuery(e, t, n, r) {
			let i = t.collectionGroup, a = Yi();
			return this.indexManager.getCollectionParents(e, i).next(((o) => V.forEach(o, ((o) => {
				let s = function(e, t) {
					return new Jf(t, null, e.explicitOrderBy.slice(), e.filters.slice(), e.limit, e.limitType, e.startAt, e.endAt);
				}(t, o.child(i));
				return this.getDocumentsMatchingCollectionQuery(e, s, n, r).next(((e) => {
					e.forEach(((e, t) => {
						a = a.insert(e, t);
					}));
				}));
			})).next((() => a))));
		}
		getDocumentsMatchingCollectionQuery(e, t, n, r) {
			let i;
			return this.documentOverlayCache.getOverlaysForCollection(e, t.path, n.largestBatchId).next(((a) => (i = a, this.remoteDocumentCache.getDocumentsMatchingQuery(e, t, n, i, r)))).next(((e) => {
				i.forEach(((t, n) => {
					let r = n.getKey();
					e.get(r) === null && (e = e.insert(r, If.newInvalidDocument(r)));
				}));
				let n = Yi();
				return e.forEach(((e, r) => {
					let a = i.get(e);
					a !== void 0 && ha(a.mutation, r, Df.empty(), I.now()), Wi(t, r) && (n = n.insert(e, r));
				})), n;
			}));
		}
	}, um = class {
		constructor(e) {
			this.serializer = e, this.hr = /* @__PURE__ */ new Map(), this.Pr = /* @__PURE__ */ new Map();
		}
		getBundleMetadata(e, t) {
			return V.resolve(this.hr.get(t));
		}
		saveBundleMetadata(e, t) {
			return this.hr.set(t.id, function(e) {
				return {
					id: e.id,
					version: e.version,
					createTime: j(e.createTime)
				};
			}(t)), V.resolve();
		}
		getNamedQuery(e, t) {
			return V.resolve(this.Pr.get(t));
		}
		saveNamedQuery(e, t) {
			return this.Pr.set(t.name, function(e) {
				return {
					name: e.name,
					query: _o(e.bundledQuery),
					readTime: j(e.readTime)
				};
			}(t)), V.resolve();
		}
	}, dm = class {
		constructor() {
			this.overlays = new H(B.comparator), this.Ir = /* @__PURE__ */ new Map();
		}
		getOverlay(e, t) {
			return V.resolve(this.overlays.get(t));
		}
		getOverlays(e, t) {
			let n = Zi();
			return V.forEach(t, ((t) => this.getOverlay(e, t).next(((e) => {
				e !== null && n.set(t, e);
			})))).next((() => n));
		}
		saveOverlays(e, t, n) {
			return n.forEach(((n, r) => {
				this.ht(e, t, r);
			})), V.resolve();
		}
		removeOverlaysForBatchId(e, t, n) {
			let r = this.Ir.get(n);
			return r !== void 0 && (r.forEach(((e) => this.overlays = this.overlays.remove(e))), this.Ir.delete(n)), V.resolve();
		}
		getOverlaysForCollection(e, t, n) {
			let r = Zi(), i = t.length + 1, a = new B(t.child("")), o = this.overlays.getIteratorFrom(a);
			for (; o.hasNext();) {
				let e = o.getNext().value, a = e.getKey();
				if (!t.isPrefixOf(a.path)) break;
				a.path.length === i && e.largestBatchId > n && r.set(e.getKey(), e);
			}
			return V.resolve(r);
		}
		getOverlaysForCollectionGroup(e, t, n, r) {
			let i = new H(((e, t) => e - t)), a = this.overlays.getIterator();
			for (; a.hasNext();) {
				let e = a.getNext().value;
				if (e.getKey().getCollectionGroup() === t && e.largestBatchId > n) {
					let t = i.get(e.largestBatchId);
					t === null && (t = Zi(), i = i.insert(e.largestBatchId, t)), t.set(e.getKey(), e);
				}
			}
			let o = Zi(), s = i.getIterator();
			for (; s.hasNext() && (s.getNext().value.forEach(((e, t) => o.set(e, t))), !(o.size() >= r)););
			return V.resolve(o);
		}
		ht(e, t, n) {
			let r = this.overlays.get(n.key);
			if (r !== null) {
				let e = this.Ir.get(r.largestBatchId).delete(n.key);
				this.Ir.set(r.largestBatchId, e);
			}
			this.overlays = this.overlays.insert(n.key, new hp(t, n));
			let i = this.Ir.get(t);
			i === void 0 && (i = A(), this.Ir.set(t, i)), this.Ir.set(t, i.add(n.key));
		}
	}, fm = class {
		constructor() {
			this.sessionToken = W.EMPTY_BYTE_STRING;
		}
		getSessionToken(e) {
			return V.resolve(this.sessionToken);
		}
		setSessionToken(e, t) {
			return this.sessionToken = t, V.resolve();
		}
	}, pm = class {
		constructor() {
			this.Tr = new U(mm.Er), this.dr = new U(mm.Ar);
		}
		isEmpty() {
			return this.Tr.isEmpty();
		}
		addReference(e, t) {
			let n = new mm(e, t);
			this.Tr = this.Tr.add(n), this.dr = this.dr.add(n);
		}
		Rr(e, t) {
			e.forEach(((e) => this.addReference(e, t)));
		}
		removeReference(e, t) {
			this.Vr(new mm(e, t));
		}
		mr(e, t) {
			e.forEach(((e) => this.removeReference(e, t)));
		}
		gr(e) {
			let t = new B(new R([])), n = new mm(t, e), r = new mm(t, e + 1), i = [];
			return this.dr.forEachInRange([n, r], ((e) => {
				this.Vr(e), i.push(e.key);
			})), i;
		}
		pr() {
			this.Tr.forEach(((e) => this.Vr(e)));
		}
		Vr(e) {
			this.Tr = this.Tr.delete(e), this.dr = this.dr.delete(e);
		}
		yr(e) {
			let t = new B(new R([])), n = new mm(t, e), r = new mm(t, e + 1), i = A();
			return this.dr.forEachInRange([n, r], ((e) => {
				i = i.add(e.key);
			})), i;
		}
		containsKey(e) {
			let t = new mm(e, 0), n = this.Tr.firstAfterOrEqual(t);
			return n !== null && e.isEqual(n.key);
		}
	}, mm = class {
		constructor(e, t) {
			this.key = e, this.wr = t;
		}
		static Er(e, t) {
			return B.comparator(e.key, t.key) || D(e.wr, t.wr);
		}
		static Ar(e, t) {
			return D(e.wr, t.wr) || B.comparator(e.key, t.key);
		}
	}, hm = class {
		constructor(e, t) {
			this.indexManager = e, this.referenceDelegate = t, this.mutationQueue = [], this.Sr = 1, this.br = new U(mm.Er);
		}
		checkEmpty(e) {
			return V.resolve(this.mutationQueue.length === 0);
		}
		addMutationBatch(e, t, n, r) {
			let i = this.Sr;
			this.Sr++, this.mutationQueue.length > 0 && this.mutationQueue[this.mutationQueue.length - 1];
			let a = new pp(i, t, n, r);
			this.mutationQueue.push(a);
			for (let t of r) this.br = this.br.add(new mm(t.key, i)), this.indexManager.addToCollectionParentIndex(e, t.key.path.popLast());
			return V.resolve(a);
		}
		lookupMutationBatch(e, t) {
			return V.resolve(this.Dr(t));
		}
		getNextMutationBatchAfterBatchId(e, t) {
			let n = t + 1, r = this.vr(n), i = r < 0 ? 0 : r;
			return V.resolve(this.mutationQueue.length > i ? this.mutationQueue[i] : null);
		}
		getHighestUnacknowledgedBatchId() {
			return V.resolve(this.mutationQueue.length === 0 ? -1 : this.Sr - 1);
		}
		getAllMutationBatches(e) {
			return V.resolve(this.mutationQueue.slice());
		}
		getAllMutationBatchesAffectingDocumentKey(e, t) {
			let n = new mm(t, 0), r = new mm(t, Infinity), i = [];
			return this.br.forEachInRange([n, r], ((e) => {
				let t = this.Dr(e.wr);
				i.push(t);
			})), V.resolve(i);
		}
		getAllMutationBatchesAffectingDocumentKeys(e, t) {
			let n = new U(D);
			return t.forEach(((e) => {
				let t = new mm(e, 0), r = new mm(e, Infinity);
				this.br.forEachInRange([t, r], ((e) => {
					n = n.add(e.wr);
				}));
			})), V.resolve(this.Cr(n));
		}
		getAllMutationBatchesAffectingQuery(e, t) {
			let n = t.path, r = n.length + 1, i = n;
			B.isDocumentKey(i) || (i = i.child(""));
			let a = new mm(new B(i), 0), o = new U(D);
			return this.br.forEachWhile(((e) => {
				let t = e.key.path;
				return !!n.isPrefixOf(t) && (t.length === r && (o = o.add(e.wr)), !0);
			}), a), V.resolve(this.Cr(o));
		}
		Cr(e) {
			let t = [];
			return e.forEach(((e) => {
				let n = this.Dr(e);
				n !== null && t.push(n);
			})), t;
		}
		removeMutationBatch(e, t) {
			T(this.Fr(t.batchId, "removed") === 0), this.mutationQueue.shift();
			let n = this.br;
			return V.forEach(t.mutations, ((r) => {
				let i = new mm(r.key, t.batchId);
				return n = n.delete(i), this.referenceDelegate.markPotentiallyOrphaned(e, r.key);
			})).next((() => {
				this.br = n;
			}));
		}
		On(e) {}
		containsKey(e, t) {
			let n = new mm(t, 0), r = this.br.firstAfterOrEqual(n);
			return V.resolve(t.isEqual(r && r.key));
		}
		performConsistencyCheck(e) {
			return this.mutationQueue.length, V.resolve();
		}
		Fr(e, t) {
			return this.vr(e);
		}
		vr(e) {
			return this.mutationQueue.length === 0 ? 0 : e - this.mutationQueue[0].batchId;
		}
		Dr(e) {
			let t = this.vr(e);
			return t < 0 || t >= this.mutationQueue.length ? null : this.mutationQueue[t];
		}
	}, gm = class {
		constructor(e) {
			this.Mr = e, this.docs = function() {
				return new H(B.comparator);
			}(), this.size = 0;
		}
		setIndexManager(e) {
			this.indexManager = e;
		}
		addEntry(e, t) {
			let n = t.key, r = this.docs.get(n), i = r ? r.size : 0, a = this.Mr(t);
			return this.docs = this.docs.insert(n, {
				document: t.mutableCopy(),
				size: a
			}), this.size += a - i, this.indexManager.addToCollectionParentIndex(e, n.path.popLast());
		}
		removeEntry(e) {
			let t = this.docs.get(e);
			t && (this.docs = this.docs.remove(e), this.size -= t.size);
		}
		getEntry(e, t) {
			let n = this.docs.get(t);
			return V.resolve(n ? n.document.mutableCopy() : If.newInvalidDocument(t));
		}
		getEntries(e, t) {
			let n = Ji();
			return t.forEach(((e) => {
				let t = this.docs.get(e);
				n = n.insert(e, t ? t.document.mutableCopy() : If.newInvalidDocument(e));
			})), V.resolve(n);
		}
		getDocumentsMatchingQuery(e, t, n, r) {
			let i = Ji(), a = t.path, o = new B(a.child("")), s = this.docs.getIteratorFrom(o);
			for (; s.hasNext();) {
				let { key: e, value: { document: o } } = s.getNext();
				if (!a.isPrefixOf(e.path)) break;
				e.path.length > a.length + 1 || _r(gr(o), n) <= 0 || (r.has(o.key) || Wi(t, o)) && (i = i.insert(o.key, o.mutableCopy()));
			}
			return V.resolve(i);
		}
		getAllFromCollectionGroup(e, t, n, r) {
			w();
		}
		Or(e, t) {
			return V.forEach(this.docs, ((e) => t(e)));
		}
		newChangeBuffer(e) {
			return new _m(this);
		}
		getSize(e) {
			return V.resolve(this.size);
		}
	}, _m = class extends am {
		constructor(e) {
			super(), this.cr = e;
		}
		applyChanges(e) {
			let t = [];
			return this.changes.forEach(((n, r) => {
				r.isValidDocument() ? t.push(this.cr.addEntry(e, r)) : this.cr.removeEntry(n);
			})), V.waitFor(t);
		}
		getFromCache(e, t) {
			return this.cr.getEntry(e, t);
		}
		getAllFromCache(e, t) {
			return this.cr.getEntries(e, t);
		}
	}, vm = class {
		constructor(e) {
			this.persistence = e, this.Nr = new Yf(((e) => Ti(e)), Ei), this.lastRemoteSnapshotVersion = L.min(), this.highestTargetId = 0, this.Lr = 0, this.Br = new pm(), this.targetCount = 0, this.kr = $p.Bn();
		}
		forEachTarget(e, t) {
			return this.Nr.forEach(((e, n) => t(n))), V.resolve();
		}
		getLastRemoteSnapshotVersion(e) {
			return V.resolve(this.lastRemoteSnapshotVersion);
		}
		getHighestSequenceNumber(e) {
			return V.resolve(this.Lr);
		}
		allocateTargetId(e) {
			return this.highestTargetId = this.kr.next(), V.resolve(this.highestTargetId);
		}
		setTargetsMetadata(e, t, n) {
			return n && (this.lastRemoteSnapshotVersion = n), t > this.Lr && (this.Lr = t), V.resolve();
		}
		Kn(e) {
			this.Nr.set(e.target, e);
			let t = e.targetId;
			t > this.highestTargetId && (this.kr = new $p(t), this.highestTargetId = t), e.sequenceNumber > this.Lr && (this.Lr = e.sequenceNumber);
		}
		addTargetData(e, t) {
			return this.Kn(t), this.targetCount += 1, V.resolve();
		}
		updateTargetData(e, t) {
			return this.Kn(t), V.resolve();
		}
		removeTargetData(e, t) {
			return this.Nr.delete(t.target), this.Br.gr(t.targetId), --this.targetCount, V.resolve();
		}
		removeTargets(e, t, n) {
			let r = 0, i = [];
			return this.Nr.forEach(((a, o) => {
				o.sequenceNumber <= t && n.get(o.targetId) === null && (this.Nr.delete(a), i.push(this.removeMatchingKeysForTargetId(e, o.targetId)), r++);
			})), V.waitFor(i).next((() => r));
		}
		getTargetCount(e) {
			return V.resolve(this.targetCount);
		}
		getTargetData(e, t) {
			let n = this.Nr.get(t) || null;
			return V.resolve(n);
		}
		addMatchingKeys(e, t, n) {
			return this.Br.Rr(t, n), V.resolve();
		}
		removeMatchingKeys(e, t, n) {
			this.Br.mr(t, n);
			let r = this.persistence.referenceDelegate, i = [];
			return r && t.forEach(((t) => {
				i.push(r.markPotentiallyOrphaned(e, t));
			})), V.waitFor(i);
		}
		removeMatchingKeysForTargetId(e, t) {
			return this.Br.gr(t), V.resolve();
		}
		getMatchingKeysForTargetId(e, t) {
			let n = this.Br.yr(t);
			return V.resolve(n);
		}
		containsKey(e, t) {
			return V.resolve(this.Br.containsKey(t));
		}
	}, ym = class {
		constructor(e, t) {
			this.qr = {}, this.overlays = {}, this.Qr = new Qd(0), this.Kr = !1, this.Kr = !0, this.$r = new fm(), this.referenceDelegate = e(this), this.Ur = new vm(this), this.indexManager = new Kp(), this.remoteDocumentCache = function(e) {
				return new gm(e);
			}(((e) => this.referenceDelegate.Wr(e))), this.serializer = new Fp(t), this.Gr = new um(this.serializer);
		}
		start() {
			return Promise.resolve();
		}
		shutdown() {
			return this.Kr = !1, Promise.resolve();
		}
		get started() {
			return this.Kr;
		}
		setDatabaseDeletedListener() {}
		setNetworkEnabled() {}
		getIndexManager(e) {
			return this.indexManager;
		}
		getDocumentOverlayCache(e) {
			let t = this.overlays[e.toKey()];
			return t || (t = new dm(), this.overlays[e.toKey()] = t), t;
		}
		getMutationQueue(e, t) {
			let n = this.qr[e.toKey()];
			return n || (n = new hm(t, this.referenceDelegate), this.qr[e.toKey()] = n), n;
		}
		getGlobalsCache() {
			return this.$r;
		}
		getTargetCache() {
			return this.Ur;
		}
		getRemoteDocumentCache() {
			return this.remoteDocumentCache;
		}
		getBundleCache() {
			return this.Gr;
		}
		runTransaction(e, t, n) {
			S("MemoryPersistence", "Starting transaction:", e);
			let r = new bm(this.Qr.next());
			return this.referenceDelegate.zr(), n(r).next(((e) => this.referenceDelegate.jr(r).next((() => e)))).toPromise().then(((e) => (r.raiseOnCommittedEvent(), e)));
		}
		Hr(e, t) {
			return V.or(Object.values(this.qr).map(((n) => () => n.containsKey(e, t))));
		}
	}, bm = class extends Ud {
		constructor(e) {
			super(), this.currentSequenceNumber = e;
		}
	}, xm = class e {
		constructor(e) {
			this.persistence = e, this.Jr = new pm(), this.Yr = null;
		}
		static Zr(t) {
			return new e(t);
		}
		get Xr() {
			if (this.Yr) return this.Yr;
			throw w();
		}
		addReference(e, t, n) {
			return this.Jr.addReference(n, t), this.Xr.delete(n.toString()), V.resolve();
		}
		removeReference(e, t, n) {
			return this.Jr.removeReference(n, t), this.Xr.add(n.toString()), V.resolve();
		}
		markPotentiallyOrphaned(e, t) {
			return this.Xr.add(t.toString()), V.resolve();
		}
		removeTarget(e, t) {
			this.Jr.gr(t.targetId).forEach(((e) => this.Xr.add(e.toString())));
			let n = this.persistence.getTargetCache();
			return n.getMatchingKeysForTargetId(e, t.targetId).next(((e) => {
				e.forEach(((e) => this.Xr.add(e.toString())));
			})).next((() => n.removeTargetData(e, t)));
		}
		zr() {
			this.Yr = /* @__PURE__ */ new Set();
		}
		jr(e) {
			let t = this.persistence.getRemoteDocumentCache().newChangeBuffer();
			return V.forEach(this.Xr, ((n) => {
				let r = B.fromPath(n);
				return this.ei(e, r).next(((e) => {
					e || t.removeEntry(r, L.min());
				}));
			})).next((() => (this.Yr = null, t.apply(e))));
		}
		updateLimboDocument(e, t) {
			return this.ei(e, t).next(((e) => {
				e ? this.Xr.delete(t.toString()) : this.Xr.add(t.toString());
			}));
		}
		Wr(e) {
			return 0;
		}
		ei(e, t) {
			return V.or([
				() => V.resolve(this.Jr.containsKey(t)),
				() => this.persistence.getTargetCache().containsKey(e, t),
				() => this.persistence.Hr(e, t)
			]);
		}
	}, Sm = class e {
		constructor(e, t) {
			this.persistence = e, this.ti = new Yf(((e) => Er(e.path)), ((e, t) => e.isEqual(t))), this.garbageCollector = Qo(this, t);
		}
		static Zr(t, n) {
			return new e(t, n);
		}
		zr() {}
		jr(e) {
			return V.resolve();
		}
		forEachTarget(e, t) {
			return this.persistence.getTargetCache().forEachTarget(e, t);
		}
		Yn(e) {
			let t = this.er(e);
			return this.persistence.getTargetCache().getTargetCount(e).next(((e) => t.next(((t) => e + t))));
		}
		er(e) {
			let t = 0;
			return this.Zn(e, ((e) => {
				t++;
			})).next((() => t));
		}
		Zn(e, t) {
			return V.forEach(this.ti, ((n, r) => this.nr(e, n, r).next(((e) => e ? V.resolve() : t(r)))));
		}
		removeTargets(e, t, n) {
			return this.persistence.getTargetCache().removeTargets(e, t, n);
		}
		removeOrphanedDocuments(e, t) {
			let n = 0, r = this.persistence.getRemoteDocumentCache(), i = r.newChangeBuffer();
			return r.Or(e, ((r) => this.nr(e, r, t).next(((e) => {
				e || (n++, i.removeEntry(r, L.min()));
			})))).next((() => i.apply(e))).next((() => n));
		}
		markPotentiallyOrphaned(e, t) {
			return this.ti.set(t, e.currentSequenceNumber), V.resolve();
		}
		removeTarget(e, t) {
			let n = t.withSequenceNumber(e.currentSequenceNumber);
			return this.persistence.getTargetCache().updateTargetData(e, n);
		}
		addReference(e, t, n) {
			return this.ti.set(n, e.currentSequenceNumber), V.resolve();
		}
		removeReference(e, t, n) {
			return this.ti.set(n, e.currentSequenceNumber), V.resolve();
		}
		updateLimboDocument(e, t) {
			return this.ti.set(t, e.currentSequenceNumber), V.resolve();
		}
		Wr(e) {
			let t = e.key.toString().length;
			return e.isFoundDocument() && (t += Zr(e.data.value)), t;
		}
		nr(e, t, n) {
			return V.or([
				() => this.persistence.Hr(e, t),
				() => this.persistence.getTargetCache().containsKey(e, t),
				() => {
					let e = this.ti.get(t);
					return V.resolve(e !== void 0 && e > n);
				}
			]);
		}
		getCacheSize(e) {
			return this.persistence.getRemoteDocumentCache().getSize(e);
		}
	}, Cm = class {
		constructor(e) {
			this.serializer = e;
		}
		O(e, t, n, r) {
			let i = new Wd("createOrUpgrade", t);
			n < 1 && r >= 1 && (function(e) {
				e.createObjectStore("owner");
			}(e), function(e) {
				e.createObjectStore("mutationQueues", { keyPath: "userId" }), e.createObjectStore("mutations", {
					keyPath: "batchId",
					autoIncrement: !0
				}).createIndex("userMutationsIndex", $d, { unique: !0 }), e.createObjectStore("documentMutations");
			}(e), os(e), function(e) {
				e.createObjectStore("remoteDocuments");
			}(e));
			let a = V.resolve();
			return n < 3 && r >= 3 && (n !== 0 && (function(e) {
				e.deleteObjectStore("targetDocuments"), e.deleteObjectStore("targets"), e.deleteObjectStore("targetGlobal");
			}(e), os(e)), a = a.next((() => function(e) {
				let t = e.store("targetGlobal"), n = {
					highestTargetId: 0,
					highestListenSequenceNumber: 0,
					lastRemoteSnapshotVersion: L.min().toTimestamp(),
					targetCount: 0
				};
				return t.put("targetGlobalKey", n);
			}(i)))), n < 4 && r >= 4 && (n !== 0 && (a = a.next((() => function(e, t) {
				return t.store("mutations").U().next(((n) => {
					e.deleteObjectStore("mutations"), e.createObjectStore("mutations", {
						keyPath: "batchId",
						autoIncrement: !0
					}).createIndex("userMutationsIndex", $d, { unique: !0 });
					let r = t.store("mutations"), i = n.map(((e) => r.put(e)));
					return V.waitFor(i);
				}));
			}(e, i)))), a = a.next((() => {
				(function(e) {
					e.createObjectStore("clientMetadata", { keyPath: "clientId" });
				})(e);
			}))), n < 5 && r >= 5 && (a = a.next((() => this.ni(i)))), n < 6 && r >= 6 && (a = a.next((() => (function(e) {
				e.createObjectStore("remoteDocumentGlobal");
			}(e), this.ri(i))))), n < 7 && r >= 7 && (a = a.next((() => this.ii(i)))), n < 8 && r >= 8 && (a = a.next((() => this.si(e, i)))), n < 9 && r >= 9 && (a = a.next((() => {
				(function(e) {
					e.objectStoreNames.contains("remoteDocumentChanges") && e.deleteObjectStore("remoteDocumentChanges");
				})(e);
			}))), n < 10 && r >= 10 && (a = a.next((() => this.oi(i)))), n < 11 && r >= 11 && (a = a.next((() => {
				(function(e) {
					e.createObjectStore("bundles", { keyPath: "bundleId" });
				})(e), function(e) {
					e.createObjectStore("namedQueries", { keyPath: "name" });
				}(e);
			}))), n < 12 && r >= 12 && (a = a.next((() => {
				(function(e) {
					let t = e.createObjectStore("documentOverlays", { keyPath: pf });
					t.createIndex("collectionPathOverlayIndex", mf, { unique: !1 }), t.createIndex("collectionGroupOverlayIndex", hf, { unique: !1 });
				})(e);
			}))), n < 13 && r >= 13 && (a = a.next((() => function(e) {
				let t = e.createObjectStore("remoteDocumentsV14", { keyPath: tf });
				t.createIndex("documentKeyIndex", nf), t.createIndex("collectionGroupIndex", rf);
			}(e))).next((() => this._i(e, i))).next((() => e.deleteObjectStore("remoteDocuments")))), n < 14 && r >= 14 && (a = a.next((() => this.ai(e, i)))), n < 15 && r >= 15 && (a = a.next((() => function(e) {
				e.createObjectStore("indexConfiguration", {
					keyPath: "indexId",
					autoIncrement: !0
				}).createIndex("collectionGroupIndex", "collectionGroup", { unique: !1 }), e.createObjectStore("indexState", { keyPath: lf }).createIndex("sequenceNumberIndex", uf, { unique: !1 }), e.createObjectStore("indexEntries", { keyPath: df }).createIndex("documentKeyIndex", ff, { unique: !1 });
			}(e)))), n < 16 && r >= 16 && (a = a.next((() => {
				t.objectStore("indexState").clear();
			})).next((() => {
				t.objectStore("indexEntries").clear();
			}))), n < 17 && r >= 17 && (a = a.next((() => {
				(function(e) {
					e.createObjectStore("globals", { keyPath: "name" });
				})(e);
			}))), a;
		}
		ri(e) {
			let t = 0;
			return e.store("remoteDocuments").J(((e, n) => {
				t += Uo(n);
			})).next((() => {
				let n = { byteSize: t };
				return e.store("remoteDocumentGlobal").put("remoteDocumentGlobalKey", n);
			}));
		}
		ni(e) {
			let t = e.store("mutationQueues"), n = e.store("mutations");
			return t.U().next(((t) => V.forEach(t, ((t) => {
				let r = IDBKeyRange.bound([t.userId, -1], [t.userId, t.lastAcknowledgedBatchId]);
				return n.U("userMutationsIndex", r).next(((n) => V.forEach(n, ((n) => {
					T(n.userId === t.userId);
					let r = mo(this.serializer, n);
					return Ho(e, t.userId, r).next((() => {}));
				}))));
			}))));
		}
		ii(e) {
			let t = e.store("targetDocuments"), n = e.store("remoteDocuments");
			return e.store("targetGlobal").get("targetGlobalKey").next(((e) => {
				let r = [];
				return n.J(((n, i) => {
					let a = new R(n), o = function(e) {
						return [0, Er(e)];
					}(a);
					r.push(t.get(o).next(((n) => n ? V.resolve() : ((n) => t.put({
						targetId: 0,
						path: Er(n),
						sequenceNumber: e.highestListenSequenceNumber
					}))(a))));
				})).next((() => V.waitFor(r)));
			}));
		}
		si(e, t) {
			e.createObjectStore("collectionParents", { keyPath: cf });
			let n = t.store("collectionParents"), r = new qp(), i = (e) => {
				if (r.add(e)) {
					let t = e.lastSegment(), r = e.popLast();
					return n.put({
						collectionId: t,
						parent: Er(r)
					});
				}
			};
			return t.store("remoteDocuments").J({ H: !0 }, ((e, t) => {
				let n = new R(e);
				return i(n.popLast());
			})).next((() => t.store("documentMutations").J({ H: !0 }, (([e, t, n], r) => {
				let a = kr(t);
				return i(a.popLast());
			}))));
		}
		oi(e) {
			let t = e.store("targets");
			return t.J(((e, n) => {
				let r = ho(n), i = go(this.serializer, r);
				return t.put(i);
			}));
		}
		_i(e, t) {
			let n = t.store("remoteDocuments"), r = [];
			return n.J(((e, n) => {
				let i = t.store("remoteDocumentsV14"), a = function(e) {
					return e.document ? new B(R.fromString(e.document.name).popFirst(5)) : e.noDocument ? B.fromSegments(e.noDocument.path) : e.unknownDocument ? B.fromSegments(e.unknownDocument.path) : w();
				}(n).path.toArray(), o = {
					prefixPath: a.slice(0, a.length - 2),
					collectionGroup: a[a.length - 2],
					documentId: a[a.length - 1],
					readTime: n.readTime || [0, 0],
					unknownDocument: n.unknownDocument,
					noDocument: n.noDocument,
					document: n.document,
					hasCommittedMutations: !!n.hasCommittedMutations
				};
				r.push(i.put(o));
			})).next((() => V.waitFor(r)));
		}
		ai(e, t) {
			let n = t.store("mutations"), r = es(this.serializer), i = new ym(xm.Zr, this.serializer.ct);
			return n.U().next(((e) => {
				let n = /* @__PURE__ */ new Map();
				return e.forEach(((e) => {
					let t = n.get(e.userId) ?? A();
					mo(this.serializer, e).keys().forEach(((e) => t = t.add(e))), n.set(e.userId, t);
				})), V.forEach(n, ((e, n) => {
					let a = new Sd(n), o = Lp.lt(this.serializer, a), s = i.getIndexManager(a), c = Qp.lt(a, this.serializer, s, i.referenceDelegate);
					return new lm(r, c, o, s).recalculateAndSaveOverlaysForDocumentKeys(new Cf(t, Qd.oe), e).next();
				}));
			}));
		}
	}, wm = "Failed to obtain exclusive access to the persistence layer. To allow shared access, multi-tab synchronization has to be enabled in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.", Tm = class e {
		constructor(t, n, r, i, a, o, s, c, l, u, d = 17) {
			if (this.allowTabSynchronization = t, this.persistenceKey = n, this.clientId = r, this.ui = a, this.window = o, this.document = s, this.ci = l, this.li = u, this.hi = d, this.Qr = null, this.Kr = !1, this.isPrimary = !1, this.networkEnabled = !0, this.Pi = null, this.inForeground = !1, this.Ii = null, this.Ti = null, this.Ei = -Infinity, this.di = (e) => Promise.resolve(), !e.D()) throw new F(P.UNIMPLEMENTED, "This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");
			this.referenceDelegate = new im(this, i), this.Ai = n + "main", this.serializer = new Fp(c), this.Ri = new Gd(this.Ai, this.hi, new Cm(this.serializer)), this.$r = new Rp(), this.Ur = new em(this.referenceDelegate, this.serializer), this.remoteDocumentCache = es(this.serializer), this.Gr = new Ip(), this.window && this.window.localStorage ? this.Vi = this.window.localStorage : (this.Vi = null, !1 === u && C("IndexedDbPersistence", "LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."));
		}
		start() {
			return this.mi().then((() => {
				if (!this.isPrimary && !this.allowTabSynchronization) throw new F(P.FAILED_PRECONDITION, wm);
				return this.fi(), this.gi(), this.pi(), this.runTransaction("getHighestListenSequenceNumber", "readonly", ((e) => this.Ur.getHighestSequenceNumber(e)));
			})).then(((e) => {
				this.Qr = new Qd(e, this.ci);
			})).then((() => {
				this.Kr = !0;
			})).catch(((e) => (this.Ri && this.Ri.close(), Promise.reject(e))));
		}
		yi(e) {
			return this.di = async (t) => {
				if (this.started) return e(t);
			}, e(this.isPrimary);
		}
		setDatabaseDeletedListener(e) {
			this.Ri.L((async (t) => {
				t.newVersion === null && await e();
			}));
		}
		setNetworkEnabled(e) {
			this.networkEnabled !== e && (this.networkEnabled = e, this.ui.enqueueAndForget((async () => {
				this.started && await this.mi();
			})));
		}
		mi() {
			return this.runTransaction("updateClientMetadataAndTryBecomePrimary", "readwrite", ((e) => cs(e).put({
				clientId: this.clientId,
				updateTimeMs: Date.now(),
				networkEnabled: this.networkEnabled,
				inForeground: this.inForeground
			}).next((() => {
				if (this.isPrimary) return this.wi(e).next(((e) => {
					e || (this.isPrimary = !1, this.ui.enqueueRetryable((() => this.di(!1))));
				}));
			})).next((() => this.Si(e))).next(((t) => this.isPrimary && !t ? this.bi(e).next((() => !1)) : !!t && this.Di(e).next((() => !0)))))).catch(((e) => {
				if (br(e)) return S("IndexedDbPersistence", "Failed to extend owner lease: ", e), this.isPrimary;
				if (!this.allowTabSynchronization) throw e;
				return S("IndexedDbPersistence", "Releasing owner lease after error during lease refresh", e), !1;
			})).then(((e) => {
				this.isPrimary !== e && this.ui.enqueueRetryable((() => this.di(e))), this.isPrimary = e;
			}));
		}
		wi(e) {
			return ss(e).get("owner").next(((e) => V.resolve(this.vi(e))));
		}
		Ci(e) {
			return cs(e).delete(this.clientId);
		}
		async Fi() {
			if (this.isPrimary && !this.Mi(this.Ei, 18e5)) {
				this.Ei = Date.now();
				let e = await this.runTransaction("maybeGarbageCollectMultiClientState", "readwrite-primary", ((e) => {
					let t = O(e, "clientMetadata");
					return t.U().next(((e) => {
						let n = this.xi(e, 18e5), r = e.filter(((e) => n.indexOf(e) === -1));
						return V.forEach(r, ((e) => t.delete(e.clientId))).next((() => r));
					}));
				})).catch((() => []));
				if (this.Vi) for (let t of e) this.Vi.removeItem(this.Oi(t.clientId));
			}
		}
		pi() {
			this.Ti = this.ui.enqueueAfterDelay("client_metadata_refresh", 4e3, (() => this.mi().then((() => this.Fi())).then((() => this.pi()))));
		}
		vi(e) {
			return !!e && e.ownerId === this.clientId;
		}
		Si(e) {
			return this.li ? V.resolve(!0) : ss(e).get("owner").next(((t) => {
				if (t !== null && this.Mi(t.leaseTimestampMs, 5e3) && !this.Ni(t.ownerId)) {
					if (this.vi(t) && this.networkEnabled) return !0;
					if (!this.vi(t)) {
						if (!t.allowTabSynchronization) throw new F(P.FAILED_PRECONDITION, wm);
						return !1;
					}
				}
				return !(!this.networkEnabled || !this.inForeground) || cs(e).U().next(((e) => this.xi(e, 5e3).find(((e) => {
					if (this.clientId !== e.clientId) {
						let t = !this.networkEnabled && e.networkEnabled, n = !this.inForeground && e.inForeground, r = this.networkEnabled === e.networkEnabled;
						if (t || n && r) return !0;
					}
					return !1;
				})) === void 0));
			})).next(((e) => (this.isPrimary !== e && S("IndexedDbPersistence", `Client ${e ? "is" : "is not"} eligible for a primary lease.`), e)));
		}
		async shutdown() {
			this.Kr = !1, this.Li(), this.Ti &&= (this.Ti.cancel(), null), this.Bi(), this.ki(), await this.Ri.runTransaction("shutdown", "readwrite", ["owner", "clientMetadata"], ((e) => {
				let t = new Cf(e, Qd.oe);
				return this.bi(t).next((() => this.Ci(t)));
			})), this.Ri.close(), this.qi();
		}
		xi(e, t) {
			return e.filter(((e) => this.Mi(e.updateTimeMs, t) && !this.Ni(e.clientId)));
		}
		Qi() {
			return this.runTransaction("getActiveClients", "readonly", ((e) => cs(e).U().next(((e) => this.xi(e, 18e5).map(((e) => e.clientId))))));
		}
		get started() {
			return this.Kr;
		}
		getGlobalsCache() {
			return this.$r;
		}
		getMutationQueue(e, t) {
			return Qp.lt(e, this.serializer, t, this.referenceDelegate);
		}
		getTargetCache() {
			return this.Ur;
		}
		getRemoteDocumentCache() {
			return this.remoteDocumentCache;
		}
		getIndexManager(e) {
			return new Yp(e, this.serializer.ct.databaseId);
		}
		getDocumentOverlayCache(e) {
			return Lp.lt(this.serializer, e);
		}
		getBundleCache() {
			return this.Gr;
		}
		runTransaction(e, t, n) {
			S("IndexedDbPersistence", "Starting transaction:", e);
			let r = t === "readonly" ? "readonly" : "readwrite", i = function(e) {
				return e === 17 ? Sf : e === 16 ? xf : e === 15 ? bf : e === 14 ? yf : e === 13 ? vf : e === 12 ? _f : e === 11 ? gf : void w();
			}(this.hi), a;
			return this.Ri.runTransaction(e, r, i, ((r) => (a = new Cf(r, this.Qr ? this.Qr.next() : Qd.oe), t === "readwrite-primary" ? this.wi(a).next(((e) => !!e || this.Si(a))).next(((t) => {
				if (!t) throw C(`Failed to obtain primary lease for action '${e}'.`), this.isPrimary = !1, this.ui.enqueueRetryable((() => this.di(!1))), new F(P.FAILED_PRECONDITION, Hd);
				return n(a);
			})).next(((e) => this.Di(a).next((() => e)))) : this.Ki(a).next((() => n(a)))))).then(((e) => (a.raiseOnCommittedEvent(), e)));
		}
		Ki(e) {
			return ss(e).get("owner").next(((e) => {
				if (e !== null && this.Mi(e.leaseTimestampMs, 5e3) && !this.Ni(e.ownerId) && !this.vi(e) && !(this.li || this.allowTabSynchronization && e.allowTabSynchronization)) throw new F(P.FAILED_PRECONDITION, wm);
			}));
		}
		Di(e) {
			let t = {
				ownerId: this.clientId,
				allowTabSynchronization: this.allowTabSynchronization,
				leaseTimestampMs: Date.now()
			};
			return ss(e).put("owner", t);
		}
		static D() {
			return Gd.D();
		}
		bi(e) {
			let t = ss(e);
			return t.get("owner").next(((e) => this.vi(e) ? (S("IndexedDbPersistence", "Releasing primary lease."), t.delete("owner")) : V.resolve()));
		}
		Mi(e, t) {
			let n = Date.now();
			return !(e < n - t) && (!(e > n) || (C(`Detected an update time that is in the future: ${e} > ${n}`), !1));
		}
		fi() {
			this.document !== null && typeof this.document.addEventListener == "function" && (this.Ii = () => {
				this.ui.enqueueAndForget((() => (this.inForeground = this.document.visibilityState === "visible", this.mi())));
			}, this.document.addEventListener("visibilitychange", this.Ii), this.inForeground = this.document.visibilityState === "visible");
		}
		Bi() {
			this.Ii &&= (this.document.removeEventListener("visibilitychange", this.Ii), null);
		}
		gi() {
			typeof this.window?.addEventListener == "function" && (this.Pi = () => {
				this.Li();
				let e = /(?:Version|Mobile)\/1[456]/;
				ln() && (navigator.appVersion.match(e) || navigator.userAgent.match(e)) && this.ui.enterRestrictedMode(!0), this.ui.enqueueAndForget((() => this.shutdown()));
			}, this.window.addEventListener("pagehide", this.Pi));
		}
		ki() {
			this.Pi &&= (this.window.removeEventListener("pagehide", this.Pi), null);
		}
		Ni(e) {
			try {
				let t = this.Vi?.getItem(this.Oi(e)) !== null;
				return S("IndexedDbPersistence", `Client '${e}' ${t ? "is" : "is not"} zombied in LocalStorage`), t;
			} catch (e) {
				return C("IndexedDbPersistence", "Failed to get zombied client id.", e), !1;
			}
		}
		Li() {
			if (this.Vi) try {
				this.Vi.setItem(this.Oi(this.clientId), String(Date.now()));
			} catch (e) {
				C("Failed to set zombie client id.", e);
			}
		}
		qi() {
			if (this.Vi) try {
				this.Vi.removeItem(this.Oi(this.clientId));
			} catch {}
		}
		Oi(e) {
			return `firestore_zombie_${this.persistenceKey}_${e}`;
		}
	}, Em = class e {
		constructor(e, t, n, r) {
			this.targetId = e, this.fromCache = t, this.$i = n, this.Ui = r;
		}
		static Wi(t, n) {
			let r = A(), i = A();
			for (let e of n.docChanges) switch (e.type) {
				case 0:
					r = r.add(e.doc.key);
					break;
				case 1: i = i.add(e.doc.key);
			}
			return new e(t, n.fromCache, r, i);
		}
	}, Dm = class {
		constructor() {
			this._documentReadCount = 0;
		}
		get documentReadCount() {
			return this._documentReadCount;
		}
		incrementDocumentReadCount(e) {
			this._documentReadCount += e;
		}
	}, Om = class {
		constructor() {
			this.Gi = !1, this.zi = !1, this.ji = 100, this.Hi = function() {
				return ln() ? 8 : yr(sn()) > 0 ? 6 : 4;
			}();
		}
		initialize(e, t) {
			this.Ji = e, this.indexManager = t, this.Gi = !0;
		}
		getDocumentsMatchingQuery(e, t, n, r) {
			let i = { result: null };
			return this.Yi(e, t).next(((e) => {
				i.result = e;
			})).next((() => {
				if (!i.result) return this.Zi(e, t, r, n).next(((e) => {
					i.result = e;
				}));
			})).next((() => {
				if (i.result) return;
				let n = new Dm();
				return this.Xi(e, t, n).next(((r) => {
					if (i.result = r, this.zi) return this.es(e, t, n, r.size);
				}));
			})).next((() => i.result));
		}
		es(e, t, n, r) {
			return n.documentReadCount < this.ji ? (rr() <= x.DEBUG && S("QueryEngine", "SDK will not create cache indexes for query:", Ui(t), "since it only creates cache indexes for collection contains", "more than or equal to", this.ji, "documents"), V.resolve()) : (rr() <= x.DEBUG && S("QueryEngine", "Query:", Ui(t), "scans", n.documentReadCount, "local documents and returns", r, "documents as results."), n.documentReadCount > this.Hi * r ? (rr() <= x.DEBUG && S("QueryEngine", "The SDK decides to create cache indexes for query:", Ui(t), "as using cache indexes may help improve performance."), this.indexManager.createTargetIndexes(e, Ii(t))) : V.resolve());
		}
		Yi(e, t) {
			if (Ni(t)) return V.resolve(null);
			let n = Ii(t);
			return this.indexManager.getIndexType(e, n).next(((r) => r === 0 ? null : (t.limit !== null && r === 1 && (t = Bi(t, null, "F"), n = Ii(t)), this.indexManager.getDocumentsMatchingTarget(e, n).next(((r) => {
				let i = A(...r);
				return this.Ji.getDocuments(e, i).next(((r) => this.indexManager.getMinOffset(e, n).next(((n) => {
					let a = this.ts(t, r);
					return this.ns(t, a, i, n.readTime) ? this.Yi(e, Bi(t, null, "F")) : this.rs(e, a, t, n);
				}))));
			})))));
		}
		Zi(e, t, n, r) {
			return Ni(t) || r.isEqual(L.min()) ? V.resolve(null) : this.Ji.getDocuments(e, n).next(((i) => {
				let a = this.ts(t, i);
				return this.ns(t, a, n, r) ? V.resolve(null) : (rr() <= x.DEBUG && S("QueryEngine", "Re-using previous result from %s to execute query: %s", r.toString(), Ui(t)), this.rs(e, a, t, hr(r, -1)).next(((e) => e)));
			}));
		}
		ts(e, t) {
			let n = new U(Ki(e));
			return t.forEach(((t, r) => {
				Wi(e, r) && (n = n.add(r));
			})), n;
		}
		ns(e, t, n, r) {
			if (e.limit === null) return !1;
			if (n.size !== t.size) return !0;
			let i = e.limitType === "F" ? t.last() : t.first();
			return !!i && (i.hasPendingWrites || i.version.compareTo(r) > 0);
		}
		Xi(e, t, n) {
			return rr() <= x.DEBUG && S("QueryEngine", "Using full collection scan to execute query:", Ui(t)), this.Ji.getDocumentsMatchingQuery(e, t, Vd.min(), n);
		}
		rs(e, t, n, r) {
			return this.Ji.getDocumentsMatchingQuery(e, n, r).next(((e) => (t.forEach(((t) => {
				e = e.insert(t.key, t);
			})), e)));
		}
	}, km = class {
		constructor(e, t, n, r) {
			this.persistence = e, this.ss = t, this.serializer = r, this.os = new H(D), this._s = new Yf(((e) => Ti(e)), Ei), this.us = /* @__PURE__ */ new Map(), this.cs = e.getRemoteDocumentCache(), this.Ur = e.getTargetCache(), this.Gr = e.getBundleCache(), this.ls(n);
		}
		ls(e) {
			this.documentOverlayCache = this.persistence.getDocumentOverlayCache(e), this.indexManager = this.persistence.getIndexManager(e), this.mutationQueue = this.persistence.getMutationQueue(e, this.indexManager), this.localDocuments = new lm(this.cs, this.mutationQueue, this.documentOverlayCache, this.indexManager), this.cs.setIndexManager(this.indexManager), this.ss.initialize(this.localDocuments, this.indexManager);
		}
		collectGarbage(e) {
			return this.persistence.runTransaction("Collect garbage", "readwrite-primary", ((t) => e.collect(t, this.os)));
		}
	}, Am = class e {
		constructor(e, t, n, r) {
			this.user = e, this.batchId = t, this.state = n, this.error = r;
		}
		static Rs(t, n, r) {
			let i = JSON.parse(r), a, o = typeof i == "object" && [
				"pending",
				"acknowledged",
				"rejected"
			].indexOf(i.state) !== -1 && (i.error === void 0 || typeof i.error == "object");
			return o && i.error && (o = typeof i.error.message == "string" && typeof i.error.code == "string", o && (a = new F(i.error.code, i.error.message))), o ? new e(t, n, i.state, a) : (C("SharedClientState", `Failed to parse mutation state for ID '${n}': ${r}`), null);
		}
		Vs() {
			let e = {
				state: this.state,
				updateTimeMs: Date.now()
			};
			return this.error && (e.error = {
				code: this.error.code,
				message: this.error.message
			}), JSON.stringify(e);
		}
	}, jm = class e {
		constructor(e, t, n) {
			this.targetId = e, this.state = t, this.error = n;
		}
		static Rs(t, n) {
			let r = JSON.parse(n), i, a = typeof r == "object" && [
				"not-current",
				"current",
				"rejected"
			].indexOf(r.state) !== -1 && (r.error === void 0 || typeof r.error == "object");
			return a && r.error && (a = typeof r.error.message == "string" && typeof r.error.code == "string", a && (i = new F(r.error.code, r.error.message))), a ? new e(t, r.state, i) : (C("SharedClientState", `Failed to parse target state for ID '${t}': ${n}`), null);
		}
		Vs() {
			let e = {
				state: this.state,
				updateTimeMs: Date.now()
			};
			return this.error && (e.error = {
				code: this.error.code,
				message: this.error.message
			}), JSON.stringify(e);
		}
	}, Mm = class e {
		constructor(e, t) {
			this.clientId = e, this.activeTargetIds = t;
		}
		static Rs(t, n) {
			let r = JSON.parse(n), i = typeof r == "object" && r.activeTargetIds instanceof Array, a = ea();
			for (let e = 0; i && e < r.activeTargetIds.length; ++e) i = Tr(r.activeTargetIds[e]), a = a.add(r.activeTargetIds[e]);
			return i ? new e(t, a) : (C("SharedClientState", `Failed to parse client data for instance '${t}': ${n}`), null);
		}
	}, Nm = class e {
		constructor(e, t) {
			this.clientId = e, this.onlineState = t;
		}
		static Rs(t) {
			let n = JSON.parse(t);
			return typeof n == "object" && [
				"Unknown",
				"Online",
				"Offline"
			].indexOf(n.onlineState) !== -1 && typeof n.clientId == "string" ? new e(n.clientId, n.onlineState) : (C("SharedClientState", `Failed to parse online state: ${t}`), null);
		}
	}, Pm = class {
		constructor() {
			this.activeTargetIds = ea();
		}
		fs(e) {
			this.activeTargetIds = this.activeTargetIds.add(e);
		}
		gs(e) {
			this.activeTargetIds = this.activeTargetIds.delete(e);
		}
		Vs() {
			let e = {
				activeTargetIds: this.activeTargetIds.toArray(),
				updateTimeMs: Date.now()
			};
			return JSON.stringify(e);
		}
	}, Fm = class {
		constructor(e, t, n, r, i) {
			this.window = e, this.ui = t, this.persistenceKey = n, this.ps = r, this.syncEngine = null, this.onlineStateHandler = null, this.sequenceNumberHandler = null, this.ys = this.ws.bind(this), this.Ss = new H(D), this.started = !1, this.bs = [];
			let a = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			this.storage = this.window.localStorage, this.currentUser = i, this.Ds = Ts(this.persistenceKey, this.ps), this.vs = function(e) {
				return `firestore_sequence_number_${e}`;
			}(this.persistenceKey), this.Ss = this.Ss.insert(this.ps, new Pm()), this.Cs = RegExp(`^firestore_clients_${a}_([^_]*)$`), this.Fs = RegExp(`^firestore_mutations_${a}_(\\d+)(?:_(.*))?$`), this.Ms = RegExp(`^firestore_targets_${a}_(\\d+)$`), this.xs = function(e) {
				return `firestore_online_state_${e}`;
			}(this.persistenceKey), this.Os = function(e) {
				return `firestore_bundle_loaded_v2_${e}`;
			}(this.persistenceKey), this.window.addEventListener("storage", this.ys);
		}
		static D(e) {
			return !(!e || !e.localStorage);
		}
		async start() {
			let e = await this.syncEngine.Qi();
			for (let t of e) {
				if (t === this.ps) continue;
				let e = this.getItem(Ts(this.persistenceKey, t));
				if (e) {
					let n = Mm.Rs(t, e);
					n && (this.Ss = this.Ss.insert(n.clientId, n));
				}
			}
			this.Ns();
			let t = this.storage.getItem(this.xs);
			if (t) {
				let e = this.Ls(t);
				e && this.Bs(e);
			}
			for (let e of this.bs) this.ws(e);
			this.bs = [], this.window.addEventListener("pagehide", (() => this.shutdown())), this.started = !0;
		}
		writeSequenceNumber(e) {
			this.setItem(this.vs, JSON.stringify(e));
		}
		getAllActiveQueryTargets() {
			return this.ks(this.Ss);
		}
		isActiveQueryTarget(e) {
			let t = !1;
			return this.Ss.forEach(((n, r) => {
				r.activeTargetIds.has(e) && (t = !0);
			})), t;
		}
		addPendingMutation(e) {
			this.qs(e, "pending");
		}
		updateMutationState(e, t, n) {
			this.qs(e, t, n), this.Qs(e);
		}
		addLocalQueryTarget(e, t = !0) {
			let n = "not-current";
			if (this.isActiveQueryTarget(e)) {
				let t = this.storage.getItem(Ds(this.persistenceKey, e));
				if (t) {
					let r = jm.Rs(e, t);
					r && (n = r.state);
				}
			}
			return t && this.Ks.fs(e), this.Ns(), n;
		}
		removeLocalQueryTarget(e) {
			this.Ks.gs(e), this.Ns();
		}
		isLocalQueryTarget(e) {
			return this.Ks.activeTargetIds.has(e);
		}
		clearQueryState(e) {
			this.removeItem(Ds(this.persistenceKey, e));
		}
		updateQueryState(e, t, n) {
			this.$s(e, t, n);
		}
		handleUserChange(e, t, n) {
			t.forEach(((e) => {
				this.Qs(e);
			})), this.currentUser = e, n.forEach(((e) => {
				this.addPendingMutation(e);
			}));
		}
		setOnlineState(e) {
			this.Us(e);
		}
		notifyBundleLoaded(e) {
			this.Ws(e);
		}
		shutdown() {
			this.started &&= (this.window.removeEventListener("storage", this.ys), this.removeItem(this.Ds), !1);
		}
		getItem(e) {
			let t = this.storage.getItem(e);
			return S("SharedClientState", "READ", e, t), t;
		}
		setItem(e, t) {
			S("SharedClientState", "SET", e, t), this.storage.setItem(e, t);
		}
		removeItem(e) {
			S("SharedClientState", "REMOVE", e), this.storage.removeItem(e);
		}
		ws(e) {
			let t = e;
			if (t.storageArea === this.storage) {
				if (S("SharedClientState", "EVENT", t.key, t.newValue), t.key === this.Ds) return void C("Received WebStorage notification for local change. Another client might have garbage-collected our state");
				this.ui.enqueueRetryable((async () => {
					if (this.started) {
						if (t.key !== null) {
							if (this.Cs.test(t.key)) {
								if (t.newValue == null) {
									let e = this.Gs(t.key);
									return this.zs(e, null);
								}
								{
									let e = this.js(t.key, t.newValue);
									if (e) return this.zs(e.clientId, e);
								}
							} else if (this.Fs.test(t.key)) {
								if (t.newValue !== null) {
									let e = this.Hs(t.key, t.newValue);
									if (e) return this.Js(e);
								}
							} else if (this.Ms.test(t.key)) {
								if (t.newValue !== null) {
									let e = this.Ys(t.key, t.newValue);
									if (e) return this.Zs(e);
								}
							} else if (t.key === this.xs) {
								if (t.newValue !== null) {
									let e = this.Ls(t.newValue);
									if (e) return this.Bs(e);
								}
							} else if (t.key === this.vs) {
								let e = function(e) {
									let t = Qd.oe;
									if (e != null) try {
										let n = JSON.parse(e);
										T(typeof n == "number"), t = n;
									} catch (e) {
										C("SharedClientState", "Failed to read sequence number from WebStorage", e);
									}
									return t;
								}(t.newValue);
								e !== Qd.oe && this.sequenceNumberHandler(e);
							} else if (t.key === this.Os) {
								let e = this.Xs(t.newValue);
								await Promise.all(e.map(((e) => this.syncEngine.eo(e))));
							}
						}
					} else this.bs.push(t);
				}));
			}
		}
		get Ks() {
			return this.Ss.get(this.ps);
		}
		Ns() {
			this.setItem(this.Ds, this.Ks.Vs());
		}
		qs(e, t, n) {
			let r = new Am(this.currentUser, e, t, n), i = Es(this.persistenceKey, this.currentUser, e);
			this.setItem(i, r.Vs());
		}
		Qs(e) {
			let t = Es(this.persistenceKey, this.currentUser, e);
			this.removeItem(t);
		}
		Us(e) {
			let t = {
				clientId: this.ps,
				onlineState: e
			};
			this.storage.setItem(this.xs, JSON.stringify(t));
		}
		$s(e, t, n) {
			let r = Ds(this.persistenceKey, e), i = new jm(e, t, n);
			this.setItem(r, i.Vs());
		}
		Ws(e) {
			let t = JSON.stringify(Array.from(e));
			this.setItem(this.Os, t);
		}
		Gs(e) {
			let t = this.Cs.exec(e);
			return t ? t[1] : null;
		}
		js(e, t) {
			let n = this.Gs(e);
			return Mm.Rs(n, t);
		}
		Hs(e, t) {
			let n = this.Fs.exec(e), r = Number(n[1]), i = n[2] === void 0 ? null : n[2];
			return Am.Rs(new Sd(i), r, t);
		}
		Ys(e, t) {
			let n = this.Ms.exec(e), r = Number(n[1]);
			return jm.Rs(r, t);
		}
		Ls(e) {
			return Nm.Rs(e);
		}
		Xs(e) {
			return JSON.parse(e);
		}
		async Js(e) {
			if (e.user.uid === this.currentUser.uid) return this.syncEngine.no(e.batchId, e.state, e.error);
			S("SharedClientState", `Ignoring mutation for non-active user ${e.user.uid}`);
		}
		Zs(e) {
			return this.syncEngine.ro(e.targetId, e.state, e.error);
		}
		zs(e, t) {
			let n = t ? this.Ss.insert(e, t) : this.Ss.remove(e), r = this.ks(this.Ss), i = this.ks(n), a = [], o = [];
			return i.forEach(((e) => {
				r.has(e) || a.push(e);
			})), r.forEach(((e) => {
				i.has(e) || o.push(e);
			})), this.syncEngine.io(a, o).then((() => {
				this.Ss = n;
			}));
		}
		Bs(e) {
			this.Ss.get(e.clientId) && this.onlineStateHandler(e.onlineState);
		}
		ks(e) {
			let t = ea();
			return e.forEach(((e, n) => {
				t = t.unionWith(n.activeTargetIds);
			})), t;
		}
	}, Im = class {
		constructor() {
			this.so = new Pm(), this.oo = {}, this.onlineStateHandler = null, this.sequenceNumberHandler = null;
		}
		addPendingMutation(e) {}
		updateMutationState(e, t, n) {}
		addLocalQueryTarget(e, t = !0) {
			return t && this.so.fs(e), this.oo[e] || "not-current";
		}
		updateQueryState(e, t, n) {
			this.oo[e] = t;
		}
		removeLocalQueryTarget(e) {
			this.so.gs(e);
		}
		isLocalQueryTarget(e) {
			return this.so.activeTargetIds.has(e);
		}
		clearQueryState(e) {
			delete this.oo[e];
		}
		getAllActiveQueryTargets() {
			return this.so.activeTargetIds;
		}
		isActiveQueryTarget(e) {
			return this.so.activeTargetIds.has(e);
		}
		start() {
			return this.so = new Pm(), Promise.resolve();
		}
		handleUserChange(e, t, n) {}
		setOnlineState(e) {}
		shutdown() {}
		writeSequenceNumber(e) {}
		notifyBundleLoaded(e) {}
	}, Lm = class {
		_o(e) {}
		shutdown() {}
	}, Rm = class {
		constructor() {
			this.ao = () => this.uo(), this.co = () => this.lo(), this.ho = [], this.Po();
		}
		_o(e) {
			this.ho.push(e);
		}
		shutdown() {
			window.removeEventListener("online", this.ao), window.removeEventListener("offline", this.co);
		}
		Po() {
			window.addEventListener("online", this.ao), window.addEventListener("offline", this.co);
		}
		uo() {
			S("ConnectivityMonitor", "Network connectivity changed: AVAILABLE");
			for (let e of this.ho) e(0);
		}
		lo() {
			S("ConnectivityMonitor", "Network connectivity changed: UNAVAILABLE");
			for (let e of this.ho) e(1);
		}
		static D() {
			return typeof window < "u" && window.addEventListener !== void 0 && window.removeEventListener !== void 0;
		}
	}, zm = null, Bm = {
		BatchGetDocuments: "batchGet",
		Commit: "commit",
		RunQuery: "runQuery",
		RunAggregationQuery: "runAggregationQuery"
	}, Vm = class {
		constructor(e) {
			this.Io = e.Io, this.To = e.To;
		}
		Eo(e) {
			this.Ao = e;
		}
		Ro(e) {
			this.Vo = e;
		}
		mo(e) {
			this.fo = e;
		}
		onMessage(e) {
			this.po = e;
		}
		close() {
			this.To();
		}
		send(e) {
			this.Io(e);
		}
		yo() {
			this.Ao();
		}
		wo() {
			this.Vo();
		}
		So(e) {
			this.fo(e);
		}
		bo(e) {
			this.po(e);
		}
	}, Hm = "WebChannelConnection", Um = class extends class {
		constructor(e) {
			this.databaseInfo = e, this.databaseId = e.databaseId;
			let t = e.ssl ? "https" : "http", n = encodeURIComponent(this.databaseId.projectId), r = encodeURIComponent(this.databaseId.database);
			this.Do = t + "://" + e.host, this.vo = `projects/${n}/databases/${r}`, this.Co = this.databaseId.database === "(default)" ? `project_id=${n}` : `project_id=${n}&database_id=${r}`;
		}
		get Fo() {
			return !1;
		}
		Mo(e, t, n, r, i) {
			let a = Os(), o = this.xo(e, t.toUriEncodedString());
			S("RestConnection", `Sending RPC '${e}' ${a}:`, o, n);
			let s = {
				"google-cloud-resource-prefix": this.vo,
				"x-goog-request-params": this.Co
			};
			return this.Oo(s, r, i), this.No(e, o, s, n).then(((t) => (S("RestConnection", `Received RPC '${e}' ${a}: `, t), t)), ((t) => {
				throw ar("RestConnection", `RPC '${e}' ${a} failed with error: `, t, "url: ", o, "request:", n), t;
			}));
		}
		Lo(e, t, n, r, i, a) {
			return this.Mo(e, t, n, r, i);
		}
		Oo(e, t, n) {
			e["X-Goog-Api-Client"] = function() {
				return "gl-js/ fire/" + Cd;
			}(), e["Content-Type"] = "text/plain", this.databaseInfo.appId && (e["X-Firebase-GMPID"] = this.databaseInfo.appId), t && t.headers.forEach(((t, n) => e[n] = t)), n && n.headers.forEach(((t, n) => e[n] = t));
		}
		xo(e, t) {
			let n = Bm[e];
			return `${this.Do}/v1/${t}:${n}`;
		}
		terminate() {}
	} {
		constructor(e) {
			super(e), this.forceLongPolling = e.forceLongPolling, this.autoDetectLongPolling = e.autoDetectLongPolling, this.useFetchStreams = e.useFetchStreams, this.longPollingOptions = e.longPollingOptions;
		}
		No(e, t, n, r) {
			let i = Os();
			return new Promise(((a, o) => {
				let s = new Jn();
				s.setWithCredentials(!0), s.listenOnce(Xn.COMPLETE, (() => {
					try {
						switch (s.getLastErrorCode()) {
							case Zn.NO_ERROR:
								let t = s.getResponseJson();
								S(Hm, `XHR for RPC '${e}' ${i} received:`, JSON.stringify(t)), a(t);
								break;
							case Zn.TIMEOUT:
								S(Hm, `RPC '${e}' ${i} timed out`), o(new F(P.DEADLINE_EXCEEDED, "Request time out"));
								break;
							case Zn.HTTP_ERROR:
								let n = s.getStatus();
								if (S(Hm, `RPC '${e}' ${i} failed with status:`, n, "response text:", s.getResponseText()), n > 0) {
									let e = s.getResponseJson();
									Array.isArray(e) && (e = e[0]);
									let t = e?.error;
									if (t && t.status && t.message) {
										let e = function(e) {
											let t = e.toLowerCase().replace(/_/g, "-");
											return Object.values(P).indexOf(t) >= 0 ? t : P.UNKNOWN;
										}(t.status);
										o(new F(e, t.message));
									} else o(new F(P.UNKNOWN, "Server responded with status " + s.getStatus()));
								} else o(new F(P.UNAVAILABLE, "Connection failed."));
								break;
							default: w();
						}
					} finally {
						S(Hm, `RPC '${e}' ${i} completed.`);
					}
				}));
				let c = JSON.stringify(r);
				S(Hm, `RPC '${e}' ${i} sending request:`, r), s.send(t, "POST", c, n, 15);
			}));
		}
		Bo(e, t, n) {
			let r = Os(), i = [
				this.Do,
				"/",
				"google.firestore.v1.Firestore",
				"/",
				e,
				"/channel"
			], a = tr(), o = er(), s = {
				httpSessionIdParam: "gsessionid",
				initMessageHeaders: {},
				messageUrlParams: { database: `projects/${this.databaseId.projectId}/databases/${this.databaseId.database}` },
				sendRawJson: !0,
				supportsCrossDomainXhr: !0,
				internalChannelParams: { forwardChannelRequestTimeoutMs: 6e5 },
				forceLongPolling: this.forceLongPolling,
				detectBufferingProxy: this.autoDetectLongPolling
			}, c = this.longPollingOptions.timeoutSeconds;
			c !== void 0 && (s.longPollingTimeout = Math.round(1e3 * c)), this.useFetchStreams && (s.useFetchStreams = !0), this.Oo(s.initMessageHeaders, t, n), s.encodeInitMessageHeaders = !0;
			let l = i.join("");
			S(Hm, `Creating RPC '${e}' stream ${r}: ${l}`, s);
			let u = a.createWebChannel(l, s), d = !1, f = !1, p = new Vm({
				Io: (t) => {
					f ? S(Hm, `Not sending because RPC '${e}' stream ${r} is closed:`, t) : (d ||= (S(Hm, `Opening RPC '${e}' stream ${r} transport.`), u.open(), !0), S(Hm, `RPC '${e}' stream ${r} sending:`, t), u.send(t));
				},
				To: () => u.close()
			}), m = (e, t, n) => {
				e.listen(t, ((e) => {
					try {
						n(e);
					} catch (e) {
						setTimeout((() => {
							throw e;
						}), 0);
					}
				}));
			};
			return m(u, Yn.EventType.OPEN, (() => {
				f || (S(Hm, `RPC '${e}' stream ${r} transport opened.`), p.yo());
			})), m(u, Yn.EventType.CLOSE, (() => {
				f || (f = !0, S(Hm, `RPC '${e}' stream ${r} transport closed`), p.So());
			})), m(u, Yn.EventType.ERROR, ((t) => {
				f || (f = !0, ar(Hm, `RPC '${e}' stream ${r} transport errored:`, t), p.So(new F(P.UNAVAILABLE, "The operation could not be completed")));
			})), m(u, Yn.EventType.MESSAGE, ((t) => {
				if (!f) {
					let n = t.data[0];
					T(!!n);
					let i = n, a = i.error || i[0]?.error;
					if (a) {
						S(Hm, `RPC '${e}' stream ${r} received error:`, a);
						let t = a.status, n = function(e) {
							let t = vp[e];
							if (t !== void 0) return Sa(t);
						}(t), i = a.message;
						n === void 0 && (n = P.INTERNAL, i = "Unknown error status: " + t + " with message " + a.message), f = !0, p.So(new F(n, i)), u.close();
					} else S(Hm, `RPC '${e}' stream ${r} received:`, n), p.bo(n);
				}
			})), m(o, $n.STAT_EVENT, ((t) => {
				t.stat === Qn.PROXY ? S(Hm, `RPC '${e}' stream ${r} detected buffering proxy`) : t.stat === Qn.NOPROXY && S(Hm, `RPC '${e}' stream ${r} detected no buffering proxy`);
			})), setTimeout((() => {
				p.wo();
			}), 0), p;
		}
	}, Wm = class {
		constructor(e, t, n = 1e3, r = 1.5, i = 6e4) {
			this.ui = e, this.timerId = t, this.ko = n, this.qo = r, this.Qo = i, this.Ko = 0, this.$o = null, this.Uo = Date.now(), this.reset();
		}
		reset() {
			this.Ko = 0;
		}
		Wo() {
			this.Ko = this.Qo;
		}
		Go(e) {
			this.cancel();
			let t = Math.floor(this.Ko + this.zo()), n = Math.max(0, Date.now() - this.Uo), r = Math.max(0, t - n);
			r > 0 && S("ExponentialBackoff", `Backing off for ${r} ms (base delay: ${this.Ko} ms, delay with jitter: ${t} ms, last attempt: ${n} ms ago)`), this.$o = this.ui.enqueueAfterDelay(this.timerId, r, (() => (this.Uo = Date.now(), e()))), this.Ko *= this.qo, this.Ko < this.ko && (this.Ko = this.ko), this.Ko > this.Qo && (this.Ko = this.Qo);
		}
		jo() {
			this.$o !== null && (this.$o.skipDelay(), this.$o = null);
		}
		cancel() {
			this.$o !== null && (this.$o.cancel(), this.$o = null);
		}
		zo() {
			return (Math.random() - .5) * this.Ko;
		}
	}, Gm = class {
		constructor(e, t, n, r, i, a, o, s) {
			this.ui = e, this.Ho = n, this.Jo = r, this.connection = i, this.authCredentialsProvider = a, this.appCheckCredentialsProvider = o, this.listener = s, this.state = 0, this.Yo = 0, this.Zo = null, this.Xo = null, this.stream = null, this.e_ = 0, this.t_ = new Wm(e, t);
		}
		n_() {
			return this.state === 1 || this.state === 5 || this.r_();
		}
		r_() {
			return this.state === 2 || this.state === 3;
		}
		start() {
			this.e_ = 0, this.state === 4 ? this.i_() : this.auth();
		}
		async stop() {
			this.n_() && await this.close(0);
		}
		s_() {
			this.state = 0, this.t_.reset();
		}
		o_() {
			this.r_() && this.Zo === null && (this.Zo = this.ui.enqueueAfterDelay(this.Ho, 6e4, (() => this.__())));
		}
		a_(e) {
			this.u_(), this.stream.send(e);
		}
		async __() {
			if (this.r_()) return this.close(0);
		}
		u_() {
			this.Zo &&= (this.Zo.cancel(), null);
		}
		c_() {
			this.Xo &&= (this.Xo.cancel(), null);
		}
		async close(e, t) {
			this.u_(), this.c_(), this.t_.cancel(), this.Yo++, e === 4 ? t && t.code === P.RESOURCE_EXHAUSTED ? (C(t.toString()), C("Using maximum backoff delay to prevent overloading the backend."), this.t_.Wo()) : t && t.code === P.UNAUTHENTICATED && this.state !== 3 && (this.authCredentialsProvider.invalidateToken(), this.appCheckCredentialsProvider.invalidateToken()) : this.t_.reset(), this.stream !== null && (this.l_(), this.stream.close(), this.stream = null), this.state = e, await this.listener.mo(t);
		}
		l_() {}
		auth() {
			this.state = 1;
			let e = this.h_(this.Yo), t = this.Yo;
			Promise.all([this.authCredentialsProvider.getToken(), this.appCheckCredentialsProvider.getToken()]).then((([e, n]) => {
				this.Yo === t && this.P_(e, n);
			}), ((t) => {
				e((() => {
					let e = new F(P.UNKNOWN, "Fetching auth token failed: " + t.message);
					return this.I_(e);
				}));
			}));
		}
		P_(e, t) {
			let n = this.h_(this.Yo);
			this.stream = this.T_(e, t), this.stream.Eo((() => {
				n((() => this.listener.Eo()));
			})), this.stream.Ro((() => {
				n((() => (this.state = 2, this.Xo = this.ui.enqueueAfterDelay(this.Jo, 1e4, (() => (this.r_() && (this.state = 3), Promise.resolve()))), this.listener.Ro())));
			})), this.stream.mo(((e) => {
				n((() => this.I_(e)));
			})), this.stream.onMessage(((e) => {
				n((() => ++this.e_ == 1 ? this.E_(e) : this.onNext(e)));
			}));
		}
		i_() {
			this.state = 5, this.t_.Go((async () => {
				this.state = 0, this.start();
			}));
		}
		I_(e) {
			return S("PersistentStream", `close with error: ${e}`), this.stream = null, this.close(4, e);
		}
		h_(e) {
			return (t) => {
				this.ui.enqueueAndForget((() => this.Yo === e ? t() : (S("PersistentStream", "stream callback skipped by getCloseGuardedDispatcher."), Promise.resolve())));
			};
		}
	}, Km = class extends Gm {
		constructor(e, t, n, r, i, a) {
			super(e, "listen_stream_connection_backoff", "listen_stream_idle", "health_check_timeout", t, n, r, a), this.serializer = i;
		}
		T_(e, t) {
			return this.connection.Bo("Listen", e, t);
		}
		E_(e) {
			return this.onNext(e);
		}
		onNext(e) {
			this.t_.reset();
			let t = Wa(this.serializer, e), n = function(e) {
				if (!("targetChange" in e)) return L.min();
				let t = e.targetChange;
				return t.targetIds && t.targetIds.length ? L.min() : t.readTime ? j(t.readTime) : L.min();
			}(e);
			return this.listener.d_(t, n);
		}
		A_(e) {
			let t = {};
			t.database = za(this.serializer), t.addTarget = function(e, t) {
				let n, r = t.target;
				if (n = Di(r) ? { documents: Ja(e, r) } : { query: Ya(e, r)._t }, n.targetId = t.targetId, t.resumeToken.approximateByteSize() > 0) {
					n.resumeToken = Aa(e, t.resumeToken);
					let r = Oa(e, t.expectedCount);
					r !== null && (n.expectedCount = r);
				} else if (t.snapshotVersion.compareTo(L.min()) > 0) {
					n.readTime = ka(e, t.snapshotVersion.toTimestamp());
					let r = Oa(e, t.expectedCount);
					r !== null && (n.expectedCount = r);
				}
				return n;
			}(this.serializer, e);
			let n = Qa(this.serializer, e);
			n && (t.labels = n), this.a_(t);
		}
		R_(e) {
			let t = {};
			t.database = za(this.serializer), t.removeTarget = e, this.a_(t);
		}
	}, qm = class extends Gm {
		constructor(e, t, n, r, i, a) {
			super(e, "write_stream_connection_backoff", "write_stream_idle", "health_check_timeout", t, n, r, a), this.serializer = i;
		}
		get V_() {
			return this.e_ > 0;
		}
		start() {
			this.lastStreamToken = void 0, super.start();
		}
		l_() {
			this.V_ && this.m_([]);
		}
		T_(e, t) {
			return this.connection.Bo("Write", e, t);
		}
		E_(e) {
			return T(!!e.streamToken), this.lastStreamToken = e.streamToken, T(!e.writeResults || e.writeResults.length === 0), this.listener.f_();
		}
		onNext(e) {
			T(!!e.streamToken), this.lastStreamToken = e.streamToken, this.t_.reset();
			let t = qa(e.writeResults, e.commitTime), n = j(e.commitTime);
			return this.listener.g_(n, t);
		}
		p_() {
			let e = {};
			e.database = za(this.serializer), this.a_(e);
		}
		m_(e) {
			let t = {
				streamToken: this.lastStreamToken,
				writes: e.map(((e) => Ga(this.serializer, e)))
			};
			this.a_(t);
		}
	}, Jm = class extends class {} {
		constructor(e, t, n, r) {
			super(), this.authCredentials = e, this.appCheckCredentials = t, this.connection = n, this.serializer = r, this.y_ = !1;
		}
		w_() {
			if (this.y_) throw new F(P.FAILED_PRECONDITION, "The client has already been terminated.");
		}
		Mo(e, t, n, r) {
			return this.w_(), Promise.all([this.authCredentials.getToken(), this.appCheckCredentials.getToken()]).then((([i, a]) => this.connection.Mo(e, Na(t, n), r, i, a))).catch(((e) => {
				throw e.name === "FirebaseError" ? (e.code === P.UNAUTHENTICATED && (this.authCredentials.invalidateToken(), this.appCheckCredentials.invalidateToken()), e) : new F(P.UNKNOWN, e.toString());
			}));
		}
		Lo(e, t, n, r, i) {
			return this.w_(), Promise.all([this.authCredentials.getToken(), this.appCheckCredentials.getToken()]).then((([a, o]) => this.connection.Lo(e, Na(t, n), r, a, o, i))).catch(((e) => {
				throw e.name === "FirebaseError" ? (e.code === P.UNAUTHENTICATED && (this.authCredentials.invalidateToken(), this.appCheckCredentials.invalidateToken()), e) : new F(P.UNKNOWN, e.toString());
			}));
		}
		terminate() {
			this.y_ = !0, this.connection.terminate();
		}
	}, Ym = class {
		constructor(e, t) {
			this.asyncQueue = e, this.onlineStateHandler = t, this.state = "Unknown", this.S_ = 0, this.b_ = null, this.D_ = !0;
		}
		v_() {
			this.S_ === 0 && (this.C_("Unknown"), this.b_ = this.asyncQueue.enqueueAfterDelay("online_state_timeout", 1e4, (() => (this.b_ = null, this.F_("Backend didn't respond within 10 seconds."), this.C_("Offline"), Promise.resolve()))));
		}
		M_(e) {
			this.state === "Online" ? this.C_("Unknown") : (this.S_++, this.S_ >= 1 && (this.x_(), this.F_(`Connection failed 1 times. Most recent error: ${e.toString()}`), this.C_("Offline")));
		}
		set(e) {
			this.x_(), this.S_ = 0, e === "Online" && (this.D_ = !1), this.C_(e);
		}
		C_(e) {
			e !== this.state && (this.state = e, this.onlineStateHandler(e));
		}
		F_(e) {
			let t = `Could not reach Cloud Firestore backend. ${e}\nThis typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;
			this.D_ ? (C(t), this.D_ = !1) : S("OnlineStateTracker", t);
		}
		x_() {
			this.b_ !== null && (this.b_.cancel(), this.b_ = null);
		}
	}, Xm = class {
		constructor(e, t, n, r, i) {
			this.localStore = e, this.datastore = t, this.asyncQueue = n, this.remoteSyncer = {}, this.O_ = [], this.N_ = /* @__PURE__ */ new Map(), this.L_ = /* @__PURE__ */ new Set(), this.B_ = [], this.k_ = i, this.k_._o(((e) => {
				n.enqueueAndForget((async () => {
					Bs(this) && (S("RemoteStore", "Restarting streams for network reachability change."), await async function(e) {
						let t = E(e);
						t.L_.add(4), await Ns(t), t.q_.set("Unknown"), t.L_.delete(4), await Ms(t);
					}(this));
				}));
			})), this.q_ = new Ym(n, r);
		}
	}, Zm = class e {
		constructor(e, t, n, r, i) {
			this.asyncQueue = e, this.timerId = t, this.targetTimeMs = n, this.op = r, this.removalCallback = i, this.deferred = new Td(), this.then = this.deferred.promise.then.bind(this.deferred.promise), this.deferred.promise.catch(((e) => {}));
		}
		get promise() {
			return this.deferred.promise;
		}
		static createAndSchedule(t, n, r, i, a) {
			let o = Date.now() + r, s = new e(t, n, o, i, a);
			return s.start(r), s;
		}
		start(e) {
			this.timerHandle = setTimeout((() => this.handleDelayElapsed()), e);
		}
		skipDelay() {
			return this.handleDelayElapsed();
		}
		cancel(e) {
			this.timerHandle !== null && (this.clearTimeout(), this.deferred.reject(new F(P.CANCELLED, "Operation cancelled" + (e ? ": " + e : ""))));
		}
		handleDelayElapsed() {
			this.asyncQueue.enqueueAndForget((() => this.timerHandle === null ? Promise.resolve() : (this.clearTimeout(), this.op().then(((e) => this.deferred.resolve(e))))));
		}
		clearTimeout() {
			this.timerHandle !== null && (this.removalCallback(this), clearTimeout(this.timerHandle), this.timerHandle = null);
		}
	}, Qm = class e {
		constructor(e) {
			this.comparator = e ? (t, n) => e(t, n) || B.comparator(t.key, n.key) : (e, t) => B.comparator(e.key, t.key), this.keyedMap = Yi(), this.sortedSet = new H(this.comparator);
		}
		static emptySet(t) {
			return new e(t.comparator);
		}
		has(e) {
			return this.keyedMap.get(e) != null;
		}
		get(e) {
			return this.keyedMap.get(e);
		}
		first() {
			return this.sortedSet.minKey();
		}
		last() {
			return this.sortedSet.maxKey();
		}
		isEmpty() {
			return this.sortedSet.isEmpty();
		}
		indexOf(e) {
			let t = this.keyedMap.get(e);
			return t ? this.sortedSet.indexOf(t) : -1;
		}
		get size() {
			return this.sortedSet.size;
		}
		forEach(e) {
			this.sortedSet.inorderTraversal(((t, n) => (e(t), !1)));
		}
		add(e) {
			let t = this.delete(e.key);
			return t.copy(t.keyedMap.insert(e.key, e), t.sortedSet.insert(e, null));
		}
		delete(e) {
			let t = this.get(e);
			return t ? this.copy(this.keyedMap.remove(e), this.sortedSet.remove(t)) : this;
		}
		isEqual(t) {
			if (!(t instanceof e) || this.size !== t.size) return !1;
			let n = this.sortedSet.getIterator(), r = t.sortedSet.getIterator();
			for (; n.hasNext();) {
				let e = n.getNext().key, t = r.getNext().key;
				if (!e.isEqual(t)) return !1;
			}
			return !0;
		}
		toString() {
			let e = [];
			return this.forEach(((t) => {
				e.push(t.toString());
			})), e.length === 0 ? "DocumentSet ()" : "DocumentSet (\n  " + e.join("  \n") + "\n)";
		}
		copy(t, n) {
			let r = new e();
			return r.comparator = this.comparator, r.keyedMap = t, r.sortedSet = n, r;
		}
	}, $m = class {
		constructor() {
			this.W_ = new H(B.comparator);
		}
		track(e) {
			let t = e.doc.key, n = this.W_.get(t);
			n ? e.type !== 0 && n.type === 3 ? this.W_ = this.W_.insert(t, e) : e.type === 3 && n.type !== 1 ? this.W_ = this.W_.insert(t, {
				type: n.type,
				doc: e.doc
			}) : e.type === 2 && n.type === 2 ? this.W_ = this.W_.insert(t, {
				type: 2,
				doc: e.doc
			}) : e.type === 2 && n.type === 0 ? this.W_ = this.W_.insert(t, {
				type: 0,
				doc: e.doc
			}) : e.type === 1 && n.type === 0 ? this.W_ = this.W_.remove(t) : e.type === 1 && n.type === 2 ? this.W_ = this.W_.insert(t, {
				type: 1,
				doc: n.doc
			}) : e.type === 0 && n.type === 1 ? this.W_ = this.W_.insert(t, {
				type: 2,
				doc: e.doc
			}) : w() : this.W_ = this.W_.insert(t, e);
		}
		G_() {
			let e = [];
			return this.W_.inorderTraversal(((t, n) => {
				e.push(n);
			})), e;
		}
	}, eh = class e {
		constructor(e, t, n, r, i, a, o, s, c) {
			this.query = e, this.docs = t, this.oldDocs = n, this.docChanges = r, this.mutatedKeys = i, this.fromCache = a, this.syncStateChanged = o, this.excludesMetadataChanges = s, this.hasCachedResults = c;
		}
		static fromInitialDocuments(t, n, r, i, a) {
			let o = [];
			return n.forEach(((e) => {
				o.push({
					type: 0,
					doc: e
				});
			})), new e(t, n, Qm.emptySet(n), o, r, i, !0, !1, a);
		}
		get hasPendingWrites() {
			return !this.mutatedKeys.isEmpty();
		}
		isEqual(e) {
			if (!(this.fromCache === e.fromCache && this.hasCachedResults === e.hasCachedResults && this.syncStateChanged === e.syncStateChanged && this.mutatedKeys.isEqual(e.mutatedKeys) && Vi(this.query, e.query) && this.docs.isEqual(e.docs) && this.oldDocs.isEqual(e.oldDocs))) return !1;
			let t = this.docChanges, n = e.docChanges;
			if (t.length !== n.length) return !1;
			for (let e = 0; e < t.length; e++) if (t[e].type !== n[e].type || !t[e].doc.isEqual(n[e].doc)) return !1;
			return !0;
		}
	}, th = class {
		constructor() {
			this.z_ = void 0, this.j_ = [];
		}
		H_() {
			return this.j_.some(((e) => e.J_()));
		}
	}, nh = class {
		constructor() {
			this.queries = cc(), this.onlineState = "Unknown", this.Y_ = /* @__PURE__ */ new Set();
		}
		terminate() {
			(function(e, t) {
				let n = E(e), r = n.queries;
				n.queries = cc(), r.forEach(((e, n) => {
					for (let e of n.j_) e.onError(t);
				}));
			})(this, new F(P.ABORTED, "Firestore shutting down"));
		}
	}, (ih = rh ||= {}).ea = "default", ih.Cache = "cache", ah = class {
		constructor(e, t, n) {
			this.query = e, this.ta = t, this.na = !1, this.ra = null, this.onlineState = "Unknown", this.options = n || {};
		}
		X_(e) {
			if (!this.options.includeMetadataChanges) {
				let t = [];
				for (let n of e.docChanges) n.type !== 3 && t.push(n);
				e = new eh(e.query, e.docs, e.oldDocs, t, e.mutatedKeys, e.fromCache, e.syncStateChanged, !0, e.hasCachedResults);
			}
			let t = !1;
			return this.na ? this.ia(e) && (this.ta.next(e), t = !0) : this.sa(e, this.onlineState) && (this.oa(e), t = !0), this.ra = e, t;
		}
		onError(e) {
			this.ta.error(e);
		}
		Z_(e) {
			this.onlineState = e;
			let t = !1;
			return this.ra && !this.na && this.sa(this.ra, e) && (this.oa(this.ra), t = !0), t;
		}
		sa(e, t) {
			if (!e.fromCache || !this.J_()) return !0;
			let n = t !== "Offline";
			return (!this.options._a || !n) && (!e.docs.isEmpty() || e.hasCachedResults || t === "Offline");
		}
		ia(e) {
			if (e.docChanges.length > 0) return !0;
			let t = this.ra && this.ra.hasPendingWrites !== e.hasPendingWrites;
			return !(!e.syncStateChanged && !t) && !0 === this.options.includeMetadataChanges;
		}
		oa(e) {
			e = eh.fromInitialDocuments(e.query, e.docs, e.mutatedKeys, e.fromCache, e.hasCachedResults), this.na = !0, this.ta.next(e);
		}
		J_() {
			return this.options.source !== rh.Cache;
		}
	}, oh = class {
		constructor(e, t) {
			this.aa = e, this.byteLength = t;
		}
		ua() {
			return "metadata" in this.aa;
		}
	}, sh = class {
		constructor(e) {
			this.serializer = e;
		}
		Es(e) {
			return Ia(this.serializer, e);
		}
		ds(e) {
			return e.metadata.exists ? Ha(this.serializer, e.document, !1) : If.newNoDocument(this.Es(e.metadata.name), this.As(e.metadata.readTime));
		}
		As(e) {
			return j(e);
		}
	}, ch = class {
		constructor(e, t, n) {
			this.ca = e, this.localStore = t, this.serializer = n, this.queries = [], this.documents = [], this.collectionGroups = /* @__PURE__ */ new Set(), this.progress = mc(e);
		}
		la(e) {
			this.progress.bytesLoaded += e.byteLength;
			let t = this.progress.documentsLoaded;
			if (e.aa.namedQuery) this.queries.push(e.aa.namedQuery);
			else if (e.aa.documentMetadata) {
				this.documents.push({ metadata: e.aa.documentMetadata }), e.aa.documentMetadata.exists || ++t;
				let n = R.fromString(e.aa.documentMetadata.name);
				this.collectionGroups.add(n.get(n.length - 2));
			} else e.aa.document && (this.documents[this.documents.length - 1].document = e.aa.document, ++t);
			return t === this.progress.documentsLoaded ? null : (this.progress.documentsLoaded = t, Object.assign({}, this.progress));
		}
		ha(e) {
			let t = /* @__PURE__ */ new Map(), n = new sh(this.serializer);
			for (let r of e) if (r.metadata.queries) {
				let e = n.Es(r.metadata.name);
				for (let n of r.metadata.queries) {
					let r = (t.get(n) || A()).add(e);
					t.set(n, r);
				}
			}
			return t;
		}
		async complete() {
			let e = await Cs(this.localStore, new sh(this.serializer), this.documents, this.ca.id), t = this.ha(this.documents);
			for (let e of this.queries) await ws(this.localStore, e, t.get(e.name));
			return this.progress.taskState = "Success", {
				progress: this.progress,
				Pa: this.collectionGroups,
				Ia: e
			};
		}
	}, lh = class {
		constructor(e) {
			this.key = e;
		}
	}, uh = class {
		constructor(e) {
			this.key = e;
		}
	}, dh = class {
		constructor(e, t) {
			this.query = e, this.Ta = t, this.Ea = null, this.hasCachedResults = !1, this.current = !1, this.da = A(), this.mutatedKeys = A(), this.Aa = Ki(e), this.Ra = new Qm(this.Aa);
		}
		get Va() {
			return this.Ta;
		}
		ma(e, t) {
			let n = t ? t.fa : new $m(), r = t ? t.Ra : this.Ra, i = t ? t.mutatedKeys : this.mutatedKeys, a = r, o = !1, s = this.query.limitType === "F" && r.size === this.query.limit ? r.last() : null, c = this.query.limitType === "L" && r.size === this.query.limit ? r.first() : null;
			if (e.inorderTraversal(((e, t) => {
				let l = r.get(e), u = Wi(this.query, t) ? t : null, d = !!l && this.mutatedKeys.has(l.key), f = !!u && (u.hasLocalMutations || this.mutatedKeys.has(u.key) && u.hasCommittedMutations), p = !1;
				l && u ? l.data.isEqual(u.data) ? d !== f && (n.track({
					type: 3,
					doc: u
				}), p = !0) : this.ga(l, u) || (n.track({
					type: 2,
					doc: u
				}), p = !0, (s && this.Aa(u, s) > 0 || c && this.Aa(u, c) < 0) && (o = !0)) : !l && u ? (n.track({
					type: 0,
					doc: u
				}), p = !0) : l && !u && (n.track({
					type: 1,
					doc: l
				}), p = !0, (s || c) && (o = !0)), p && (u ? (a = a.add(u), i = f ? i.add(e) : i.delete(e)) : (a = a.delete(e), i = i.delete(e)));
			})), this.query.limit !== null) for (; a.size > this.query.limit;) {
				let e = this.query.limitType === "F" ? a.last() : a.first();
				a = a.delete(e.key), i = i.delete(e.key), n.track({
					type: 1,
					doc: e
				});
			}
			return {
				Ra: a,
				fa: n,
				ns: o,
				mutatedKeys: i
			};
		}
		ga(e, t) {
			return e.hasLocalMutations && t.hasCommittedMutations && !t.hasLocalMutations;
		}
		applyChanges(e, t, n, r) {
			let i = this.Ra;
			this.Ra = e.Ra, this.mutatedKeys = e.mutatedKeys;
			let a = e.fa.G_();
			a.sort(((e, t) => function(e, t) {
				let n = (e) => {
					switch (e) {
						case 0: return 1;
						case 2:
						case 3: return 2;
						case 1: return 0;
						default: return w();
					}
				};
				return n(e) - n(t);
			}(e.type, t.type) || this.Aa(e.doc, t.doc))), this.pa(n), r = r != null && r;
			let o = t && !r ? this.ya() : [], s = this.da.size === 0 && this.current && !r ? 1 : 0, c = s !== this.Ea;
			return this.Ea = s, a.length !== 0 || c ? {
				snapshot: new eh(this.query, e.Ra, i, a, e.mutatedKeys, s === 0, c, !1, !!n && n.resumeToken.approximateByteSize() > 0),
				wa: o
			} : { wa: o };
		}
		Z_(e) {
			return this.current && e === "Offline" ? (this.current = !1, this.applyChanges({
				Ra: this.Ra,
				fa: new $m(),
				mutatedKeys: this.mutatedKeys,
				ns: !1
			}, !1)) : { wa: [] };
		}
		Sa(e) {
			return !this.Ta.has(e) && !!this.Ra.has(e) && !this.Ra.get(e).hasLocalMutations;
		}
		pa(e) {
			e && (e.addedDocuments.forEach(((e) => this.Ta = this.Ta.add(e))), e.modifiedDocuments.forEach(((e) => {})), e.removedDocuments.forEach(((e) => this.Ta = this.Ta.delete(e))), this.current = e.current);
		}
		ya() {
			if (!this.current) return [];
			let e = this.da;
			this.da = A(), this.Ra.forEach(((e) => {
				this.Sa(e.key) && (this.da = this.da.add(e.key));
			}));
			let t = [];
			return e.forEach(((e) => {
				this.da.has(e) || t.push(new uh(e));
			})), this.da.forEach(((n) => {
				e.has(n) || t.push(new lh(n));
			})), t;
		}
		ba(e) {
			this.Ta = e.Ts, this.da = A();
			let t = this.ma(e.documents);
			return this.applyChanges(t, !0);
		}
		Da() {
			return eh.fromInitialDocuments(this.query, this.Ra, this.mutatedKeys, this.Ea === 0, this.hasCachedResults);
		}
	}, fh = class {
		constructor(e, t, n) {
			this.query = e, this.targetId = t, this.view = n;
		}
	}, ph = class {
		constructor(e) {
			this.key = e, this.va = !1;
		}
	}, mh = class {
		constructor(e, t, n, r, i, a) {
			this.localStore = e, this.remoteStore = t, this.eventManager = n, this.sharedClientState = r, this.currentUser = i, this.maxConcurrentLimboResolutions = a, this.Ca = {}, this.Fa = new Yf(((e) => Hi(e)), Vi), this.Ma = /* @__PURE__ */ new Map(), this.xa = /* @__PURE__ */ new Set(), this.Oa = new H(B.comparator), this.Na = /* @__PURE__ */ new Map(), this.La = new pm(), this.Ba = {}, this.ka = /* @__PURE__ */ new Map(), this.qa = $p.kn(), this.onlineState = "Unknown", this.Qa = void 0;
		}
		get isPrimaryClient() {
			return !0 === this.Qa;
		}
	}, hh = class {
		constructor() {
			this.kind = "memory", this.synchronizeTabs = !1;
		}
		async initialize(e) {
			this.serializer = js(e.databaseInfo.databaseId), this.sharedClientState = this.Wa(e), this.persistence = this.Ga(e), await this.persistence.start(), this.localStore = this.za(e), this.gcScheduler = this.ja(e, this.localStore), this.indexBackfillerScheduler = this.Ha(e, this.localStore);
		}
		ja(e, t) {
			return null;
		}
		Ha(e, t) {
			return null;
		}
		za(e) {
			return us(this.persistence, new Om(), e.initialUser, this.serializer);
		}
		Ga(e) {
			return new ym(xm.Zr, this.serializer);
		}
		Wa(e) {
			return new Im();
		}
		async terminate() {
			var e, t;
			(e = this.gcScheduler) == null || e.stop(), (t = this.indexBackfillerScheduler) == null || t.stop(), this.sharedClientState.shutdown(), await this.persistence.shutdown();
		}
	}, hh.provider = { build: () => new hh() }, gh = class extends hh {
		constructor(e) {
			super(), this.cacheSizeBytes = e;
		}
		ja(e, t) {
			T(this.persistence.referenceDelegate instanceof Sm);
			let n = this.persistence.referenceDelegate.garbageCollector;
			return new nm(n, e.asyncQueue, t);
		}
		Ga(e) {
			let t = this.cacheSizeBytes === void 0 ? Zp.DEFAULT : Zp.withCacheSize(this.cacheSizeBytes);
			return new ym(((e) => Sm.Zr(e, t)), this.serializer);
		}
	}, _h = class extends hh {
		constructor(e, t, n) {
			super(), this.Ja = e, this.cacheSizeBytes = t, this.forceOwnership = n, this.kind = "persistent", this.synchronizeTabs = !1;
		}
		async initialize(e) {
			await super.initialize(e), await this.Ja.initialize(this, e), await Jc(this.Ja.syncEngine), await Js(this.Ja.remoteStore), await this.persistence.yi((() => (this.gcScheduler && !this.gcScheduler.started && this.gcScheduler.start(), this.indexBackfillerScheduler && !this.indexBackfillerScheduler.started && this.indexBackfillerScheduler.start(), Promise.resolve())));
		}
		za(e) {
			return us(this.persistence, new Om(), e.initialUser, this.serializer);
		}
		ja(e, t) {
			let n = this.persistence.referenceDelegate.garbageCollector;
			return new nm(n, e.asyncQueue, t);
		}
		Ha(e, t) {
			let n = new Zd(t, this.persistence);
			return new Xd(e.asyncQueue, n);
		}
		Ga(e) {
			let t = ls(e.databaseInfo.databaseId, e.databaseInfo.persistenceKey), n = this.cacheSizeBytes === void 0 ? Zp.DEFAULT : Zp.withCacheSize(this.cacheSizeBytes);
			return new Tm(this.synchronizeTabs, t, e.clientId, n, e.asyncQueue, ks(), As(), this.serializer, this.sharedClientState, !!this.forceOwnership);
		}
		Wa(e) {
			return new Im();
		}
	}, vh = class extends _h {
		constructor(e, t) {
			super(e, t, !1), this.Ja = e, this.cacheSizeBytes = t, this.synchronizeTabs = !0;
		}
		async initialize(e) {
			await super.initialize(e);
			let t = this.Ja.syncEngine;
			this.sharedClientState instanceof Fm && (this.sharedClientState.syncEngine = {
				no: Bc.bind(null, t),
				ro: Gc.bind(null, t),
				io: Kc.bind(null, t),
				Qi: Wc.bind(null, t),
				eo: zc.bind(null, t)
			}, await this.sharedClientState.start()), await this.persistence.yi((async (e) => {
				await Vc(this.Ja.syncEngine, e), this.gcScheduler && (e && !this.gcScheduler.started ? this.gcScheduler.start() : e || this.gcScheduler.stop()), this.indexBackfillerScheduler && (e && !this.indexBackfillerScheduler.started ? this.indexBackfillerScheduler.start() : e || this.indexBackfillerScheduler.stop());
			}));
		}
		Wa(e) {
			let t = ks();
			if (!Fm.D(t)) throw new F(P.UNIMPLEMENTED, "IndexedDB persistence is only available on platforms that support LocalStorage.");
			let n = ls(e.databaseInfo.databaseId, e.databaseInfo.persistenceKey);
			return new Fm(t, e.asyncQueue, n, e.clientId, e.initialUser);
		}
	}, yh = class {
		async initialize(e, t) {
			this.localStore || (this.localStore = e.localStore, this.sharedClientState = e.sharedClientState, this.datastore = this.createDatastore(t), this.remoteStore = this.createRemoteStore(t), this.eventManager = this.createEventManager(t), this.syncEngine = this.createSyncEngine(t, !e.synchronizeTabs), this.sharedClientState.onlineStateHandler = (e) => Cc(this.syncEngine, e, 1), this.remoteStore.remoteSyncer.handleCredentialChange = Ic.bind(null, this.syncEngine), await ic(this.remoteStore, this.syncEngine.isPrimaryClient));
		}
		createEventManager(e) {
			return function() {
				return new nh();
			}();
		}
		createDatastore(e) {
			let t = js(e.databaseInfo.databaseId), n = function(e) {
				return new Um(e);
			}(e.databaseInfo);
			return function(e, t, n, r) {
				return new Jm(e, t, n, r);
			}(e.authCredentials, e.appCheckCredentials, n, t);
		}
		createRemoteStore(e) {
			return function(e, t, n, r, i) {
				return new Xm(e, t, n, r, i);
			}(this.localStore, this.datastore, e.asyncQueue, ((e) => Cc(this.syncEngine, e, 0)), function() {
				return Rm.D() ? new Rm() : new Lm();
			}());
		}
		createSyncEngine(e, t) {
			return function(e, t, n, r, i, a, o) {
				let s = new mh(e, t, n, r, i, a);
				return o && (s.Qa = !0), s;
			}(this.localStore, this.remoteStore, this.eventManager, this.sharedClientState, e.initialUser, e.maxConcurrentLimboResolutions, t);
		}
		async terminate() {
			var e, t;
			await async function(e) {
				let t = E(e);
				S("RemoteStore", "RemoteStore shutting down."), t.L_.add(5), await Ns(t), t.k_.shutdown(), t.q_.set("Unknown");
			}(this.remoteStore), (e = this.datastore) == null || e.terminate(), (t = this.eventManager) == null || t.terminate();
		}
	}, yh.provider = { build: () => new yh() }, bh = class {
		constructor(e) {
			this.observer = e, this.muted = !1;
		}
		next(e) {
			this.muted || this.observer.next && this.Ya(this.observer.next, e);
		}
		error(e) {
			this.muted || (this.observer.error ? this.Ya(this.observer.error, e) : C("Uncaught Error in snapshot listener:", e.toString()));
		}
		Za() {
			this.muted = !0;
		}
		Ya(e, t) {
			setTimeout((() => {
				this.muted || e(t);
			}), 0);
		}
	}, xh = class {
		constructor(e, t) {
			this.Xa = e, this.serializer = t, this.metadata = new Td(), this.buffer = /* @__PURE__ */ new Uint8Array(), this.eu = function() {
				return new TextDecoder("utf-8");
			}(), this.tu().then(((e) => {
				e && e.ua() ? this.metadata.resolve(e.aa.metadata) : this.metadata.reject(/* @__PURE__ */ Error(`The first element of the bundle is not a metadata, it is\n             ${JSON.stringify(e?.aa)}`));
			}), ((e) => this.metadata.reject(e)));
		}
		close() {
			return this.Xa.cancel();
		}
		async getMetadata() {
			return this.metadata.promise;
		}
		async Ua() {
			return await this.getMetadata(), this.tu();
		}
		async tu() {
			let e = await this.nu();
			if (e === null) return null;
			let t = this.eu.decode(e), n = Number(t);
			isNaN(n) && this.ru(`length string (${t}) is not valid number`);
			let r = await this.iu(n);
			return new oh(JSON.parse(r), e.length + n);
		}
		su() {
			return this.buffer.findIndex(((e) => e === 123));
		}
		async nu() {
			for (; this.su() < 0 && !await this.ou(););
			if (this.buffer.length === 0) return null;
			let e = this.su();
			e < 0 && this.ru("Reached the end of bundle when a length string is expected.");
			let t = this.buffer.slice(0, e);
			return this.buffer = this.buffer.slice(e), t;
		}
		async iu(e) {
			for (; this.buffer.length < e;) await this.ou() && this.ru("Reached the end of bundle when more is expected.");
			let t = this.eu.decode(this.buffer.slice(0, e));
			return this.buffer = this.buffer.slice(e), t;
		}
		ru(e) {
			throw this.Xa.cancel(), /* @__PURE__ */ Error(`Invalid bundle format: ${e}`);
		}
		async ou() {
			let e = await this.Xa.read();
			if (!e.done) {
				let t = new Uint8Array(this.buffer.length + e.value.length);
				t.set(this.buffer), t.set(e.value, this.buffer.length), this.buffer = t;
			}
			return e.done;
		}
	}, Sh = class {
		constructor(e) {
			this.datastore = e, this.readVersions = /* @__PURE__ */ new Map(), this.mutations = [], this.committed = !1, this.lastTransactionError = null, this.writtenDocs = /* @__PURE__ */ new Set();
		}
		async lookup(e) {
			if (this.ensureCommitNotCalled(), this.mutations.length > 0) throw this.lastTransactionError = new F(P.INVALID_ARGUMENT, "Firestore transactions require all reads to be executed before all writes."), this.lastTransactionError;
			let t = await async function(e, t) {
				let n = E(e), r = { documents: t.map(((e) => Fa(n.serializer, e))) }, i = await n.Lo("BatchGetDocuments", n.serializer.databaseId, R.emptyPath(), r, t.length), a = /* @__PURE__ */ new Map();
				i.forEach(((e) => {
					let t = Ua(n.serializer, e);
					a.set(t.key.toString(), t);
				}));
				let o = [];
				return t.forEach(((e) => {
					let t = a.get(e.toString());
					T(!!t), o.push(t);
				})), o;
			}(this.datastore, e);
			return t.forEach(((e) => this.recordVersion(e))), t;
		}
		set(e, t) {
			this.write(t.toMutation(e, this.precondition(e))), this.writtenDocs.add(e.toString());
		}
		update(e, t) {
			try {
				this.write(t.toMutation(e, this.preconditionForUpdate(e)));
			} catch (e) {
				this.lastTransactionError = e;
			}
			this.writtenDocs.add(e.toString());
		}
		delete(e) {
			this.write(new dp(e, this.precondition(e))), this.writtenDocs.add(e.toString());
		}
		async commit() {
			if (this.ensureCommitNotCalled(), this.lastTransactionError) throw this.lastTransactionError;
			let e = this.readVersions;
			this.mutations.forEach(((t) => {
				e.delete(t.key.toString());
			})), e.forEach(((e, t) => {
				let n = B.fromPath(t);
				this.mutations.push(new fp(n, this.precondition(n)));
			})), await async function(e, t) {
				let n = E(e), r = { writes: t.map(((e) => Ga(n.serializer, e))) };
				await n.Mo("Commit", n.serializer.databaseId, R.emptyPath(), r);
			}(this.datastore, this.mutations), this.committed = !0;
		}
		recordVersion(e) {
			let t;
			if (e.isFoundDocument()) t = e.version;
			else {
				if (!e.isNoDocument()) throw w();
				t = L.min();
			}
			let n = this.readVersions.get(e.key.toString());
			if (n) {
				if (!t.isEqual(n)) throw new F(P.ABORTED, "Document version changed between two reads.");
			} else this.readVersions.set(e.key.toString(), t);
		}
		precondition(e) {
			let t = this.readVersions.get(e.toString());
			return !this.writtenDocs.has(e.toString()) && t ? t.isEqual(L.min()) ? q.exists(!1) : q.updateTime(t) : q.none();
		}
		preconditionForUpdate(e) {
			let t = this.readVersions.get(e.toString());
			if (!this.writtenDocs.has(e.toString()) && t) {
				if (t.isEqual(L.min())) throw new F(P.INVALID_ARGUMENT, "Can't update a document that doesn't exist.");
				return q.updateTime(t);
			}
			return q.exists(!0);
		}
		write(e) {
			this.ensureCommitNotCalled(), this.mutations.push(e);
		}
		ensureCommitNotCalled() {}
	}, Ch = class {
		constructor(e, t, n, r, i) {
			this.asyncQueue = e, this.datastore = t, this.options = n, this.updateFunction = r, this.deferred = i, this._u = n.maxAttempts, this.t_ = new Wm(this.asyncQueue, "transaction_retry");
		}
		au() {
			--this._u, this.uu();
		}
		uu() {
			this.t_.Go((async () => {
				let e = new Sh(this.datastore), t = this.cu(e);
				t && t.then(((t) => {
					this.asyncQueue.enqueueAndForget((() => e.commit().then((() => {
						this.deferred.resolve(t);
					})).catch(((e) => {
						this.lu(e);
					}))));
				})).catch(((e) => {
					this.lu(e);
				}));
			}));
		}
		cu(e) {
			try {
				let t = this.updateFunction(e);
				return !Cr(t) && t.catch && t.then ? t : (this.deferred.reject(Error("Transaction callback must return a Promise")), null);
			} catch (e) {
				return this.deferred.reject(e), null;
			}
		}
		lu(e) {
			this._u > 0 && this.hu(e) ? (--this._u, this.asyncQueue.enqueueAndForget((() => (this.uu(), Promise.resolve())))) : this.deferred.reject(e);
		}
		hu(e) {
			if (e.name === "FirebaseError") {
				let t = e.code;
				return t === "aborted" || t === "failed-precondition" || t === "already-exists" || !xa(t);
			}
			return !1;
		}
	}, wh = class {
		constructor(e, t, n, r, i) {
			this.authCredentials = e, this.appCheckCredentials = t, this.asyncQueue = n, this.databaseInfo = r, this.user = Sd.UNAUTHENTICATED, this.clientId = Fd.newId(), this.authCredentialListener = () => Promise.resolve(), this.appCheckCredentialListener = () => Promise.resolve(), this._uninitializedComponentsProvider = i, this.authCredentials.start(n, (async (e) => {
				S("FirestoreClient", "Received user=", e.uid), await this.authCredentialListener(e), this.user = e;
			})), this.appCheckCredentials.start(n, ((e) => (S("FirestoreClient", "Received new app check token=", e), this.appCheckCredentialListener(e, this.user))));
		}
		get configuration() {
			return {
				asyncQueue: this.asyncQueue,
				databaseInfo: this.databaseInfo,
				clientId: this.clientId,
				authCredentials: this.authCredentials,
				appCheckCredentials: this.appCheckCredentials,
				initialUser: this.user,
				maxConcurrentLimboResolutions: 100
			};
		}
		setCredentialChangeListener(e) {
			this.authCredentialListener = e;
		}
		setAppCheckTokenChangeListener(e) {
			this.appCheckCredentialListener = e;
		}
		terminate() {
			this.asyncQueue.enterRestrictedMode();
			let e = new Td();
			return this.asyncQueue.enqueueAndForgetEvenWhileRestricted((async () => {
				try {
					this._onlineComponents && await this._onlineComponents.terminate(), this._offlineComponents && await this._offlineComponents.terminate(), this.authCredentials.shutdown(), this.appCheckCredentials.shutdown(), e.resolve();
				} catch (t) {
					let n = sc(t, "Failed to shutdown persistence");
					e.reject(n);
				}
			})), e.promise;
		}
	}, Th = /* @__PURE__ */ new Map(), Eh = class {
		constructor(e) {
			var t;
			if (e.host === void 0) {
				if (e.ssl !== void 0) throw new F(P.INVALID_ARGUMENT, "Can't provide ssl option if host option is not set");
				this.host = "firestore.googleapis.com", this.ssl = !0;
			} else this.host = e.host, this.ssl = (t = e.ssl) == null || t;
			if (this.credentials = e.credentials, this.ignoreUndefinedProperties = !!e.ignoreUndefinedProperties, this.localCache = e.localCache, e.cacheSizeBytes === void 0) this.cacheSizeBytes = 41943040;
			else {
				if (e.cacheSizeBytes !== -1 && e.cacheSizeBytes < 1048576) throw new F(P.INVALID_ARGUMENT, "cacheSizeBytes must be at least 1048576");
				this.cacheSizeBytes = e.cacheSizeBytes;
			}
			Sl("experimentalForceLongPolling", e.experimentalForceLongPolling, "experimentalAutoDetectLongPolling", e.experimentalAutoDetectLongPolling), this.experimentalForceLongPolling = !!e.experimentalForceLongPolling, this.experimentalForceLongPolling ? this.experimentalAutoDetectLongPolling = !1 : e.experimentalAutoDetectLongPolling === void 0 ? this.experimentalAutoDetectLongPolling = !0 : this.experimentalAutoDetectLongPolling = !!e.experimentalAutoDetectLongPolling, this.experimentalLongPollingOptions = bl(e.experimentalLongPollingOptions ?? {}), function(e) {
				if (e.timeoutSeconds !== void 0) {
					if (isNaN(e.timeoutSeconds)) throw new F(P.INVALID_ARGUMENT, `invalid long polling timeout: ${e.timeoutSeconds} (must not be NaN)`);
					if (e.timeoutSeconds < 5) throw new F(P.INVALID_ARGUMENT, `invalid long polling timeout: ${e.timeoutSeconds} (minimum allowed value is 5)`);
					if (e.timeoutSeconds > 30) throw new F(P.INVALID_ARGUMENT, `invalid long polling timeout: ${e.timeoutSeconds} (maximum allowed value is 30)`);
				}
			}(this.experimentalLongPollingOptions), this.useFetchStreams = !!e.useFetchStreams;
		}
		isEqual(e) {
			return this.host === e.host && this.ssl === e.ssl && this.credentials === e.credentials && this.cacheSizeBytes === e.cacheSizeBytes && this.experimentalForceLongPolling === e.experimentalForceLongPolling && this.experimentalAutoDetectLongPolling === e.experimentalAutoDetectLongPolling && function(e, t) {
				return e.timeoutSeconds === t.timeoutSeconds;
			}(this.experimentalLongPollingOptions, e.experimentalLongPollingOptions) && this.ignoreUndefinedProperties === e.ignoreUndefinedProperties && this.useFetchStreams === e.useFetchStreams;
		}
	}, Dh = class {
		constructor(e, t, n, r) {
			this._authCredentials = e, this._appCheckCredentials = t, this._databaseId = n, this._app = r, this.type = "firestore-lite", this._persistenceKey = "(lite)", this._settings = new Eh({}), this._settingsFrozen = !1, this._terminateTask = "notTerminated";
		}
		get app() {
			if (!this._app) throw new F(P.FAILED_PRECONDITION, "Firestore was not initialized using the Firebase SDK. 'app' is not available");
			return this._app;
		}
		get _initialized() {
			return this._settingsFrozen;
		}
		get _terminated() {
			return this._terminateTask !== "notTerminated";
		}
		_setSettings(e) {
			if (this._settingsFrozen) throw new F(P.FAILED_PRECONDITION, "Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");
			this._settings = new Eh(e), e.credentials !== void 0 && (this._authCredentials = function(e) {
				if (!e) return new Dd();
				switch (e.type) {
					case "firstParty": return new jd(e.sessionIndex || "0", e.iamToken || null, e.authTokenFactory || null);
					case "provider": return e.client;
					default: throw new F(P.INVALID_ARGUMENT, "makeAuthCredentialsProvider failed due to invalid credential type");
				}
			}(e.credentials));
		}
		_getSettings() {
			return this._settings;
		}
		_freezeSettings() {
			return this._settingsFrozen = !0, this._settings;
		}
		_delete() {
			return this._terminateTask === "notTerminated" && (this._terminateTask = this._terminate()), this._terminateTask;
		}
		async _restart() {
			this._terminateTask === "notTerminated" ? await this._terminate() : this._terminateTask = "notTerminated";
		}
		toJSON() {
			return {
				app: this._app,
				databaseId: this._databaseId,
				settings: this._settings
			};
		}
		_terminate() {
			return function(e) {
				let t = Th.get(e);
				t && (S("ComponentProvider", "Removing Datastore"), Th.delete(e), t.terminate());
			}(this), Promise.resolve();
		}
	}, Oh = class e {
		constructor(e, t, n) {
			this.converter = t, this._query = n, this.type = "query", this.firestore = e;
		}
		withConverter(t) {
			return new e(this.firestore, t, this._query);
		}
	}, Y = class e {
		constructor(e, t, n) {
			this.converter = t, this._key = n, this.type = "document", this.firestore = e;
		}
		get _path() {
			return this._key.path;
		}
		get id() {
			return this._key.path.lastSegment();
		}
		get path() {
			return this._key.path.canonicalString();
		}
		get parent() {
			return new kh(this.firestore, this.converter, this._key.path.popLast());
		}
		withConverter(t) {
			return new e(this.firestore, t, this._key);
		}
	}, kh = class e extends Oh {
		constructor(e, t, n) {
			super(e, t, Mi(n)), this._path = n, this.type = "collection";
		}
		get id() {
			return this._query.path.lastSegment();
		}
		get path() {
			return this._query.path.canonicalString();
		}
		get parent() {
			let e = this._path.popLast();
			return e.isEmpty() ? null : new Y(this.firestore, null, new B(e));
		}
		withConverter(t) {
			return new e(this.firestore, t, this._path);
		}
	}, Ah = class {
		constructor(e = Promise.resolve()) {
			this.Pu = [], this.Iu = !1, this.Tu = [], this.Eu = null, this.du = !1, this.Au = !1, this.Ru = [], this.t_ = new Wm(this, "async_queue_retry"), this.Vu = () => {
				let e = As();
				e && S("AsyncQueue", "Visibility state changed to " + e.visibilityState), this.t_.jo();
			}, this.mu = e;
			let t = As();
			t && typeof t.addEventListener == "function" && t.addEventListener("visibilitychange", this.Vu);
		}
		get isShuttingDown() {
			return this.Iu;
		}
		enqueueAndForget(e) {
			this.enqueue(e);
		}
		enqueueAndForgetEvenWhileRestricted(e) {
			this.fu(), this.gu(e);
		}
		enterRestrictedMode(e) {
			if (!this.Iu) {
				this.Iu = !0, this.Au = e || !1;
				let t = As();
				t && typeof t.removeEventListener == "function" && t.removeEventListener("visibilitychange", this.Vu);
			}
		}
		enqueue(e) {
			if (this.fu(), this.Iu) return new Promise((() => {}));
			let t = new Td();
			return this.gu((() => this.Iu && this.Au ? Promise.resolve() : (e().then(t.resolve, t.reject), t.promise))).then((() => t.promise));
		}
		enqueueRetryable(e) {
			this.enqueueAndForget((() => (this.Pu.push(e), this.pu())));
		}
		async pu() {
			if (this.Pu.length !== 0) {
				try {
					await this.Pu[0](), this.Pu.shift(), this.t_.reset();
				} catch (e) {
					if (!br(e)) throw e;
					S("AsyncQueue", "Operation failed with retryable error: " + e);
				}
				this.Pu.length > 0 && this.t_.Go((() => this.pu()));
			}
		}
		gu(e) {
			let t = this.mu.then((() => (this.du = !0, e().catch(((e) => {
				throw this.Eu = e, this.du = !1, C("INTERNAL UNHANDLED ERROR: ", function(e) {
					let t = e.message || "";
					return e.stack && (t = e.stack.includes(e.message) ? e.stack : e.message + "\n" + e.stack), t;
				}(e)), e;
			})).then(((e) => (this.du = !1, e))))));
			return this.mu = t, t;
		}
		enqueueAfterDelay(e, t, n) {
			this.fu(), this.Ru.indexOf(e) > -1 && (t = 0);
			let r = Zm.createAndSchedule(this, e, t, n, ((e) => this.yu(e)));
			return this.Tu.push(r), r;
		}
		fu() {
			this.Eu && w();
		}
		verifyOperationInProgress() {}
		async wu() {
			let e;
			do
				e = this.mu, await e;
			while (e !== this.mu);
		}
		Su(e) {
			for (let t of this.Tu) if (t.timerId === e) return !0;
			return !1;
		}
		bu(e) {
			return this.wu().then((() => {
				this.Tu.sort(((e, t) => e.targetTimeMs - t.targetTimeMs));
				for (let t of this.Tu) if (t.skipDelay(), e !== "all" && t.timerId === e) break;
				return this.wu();
			}));
		}
		Du(e) {
			this.Ru.push(e);
		}
		yu(e) {
			let t = this.Tu.indexOf(e);
			this.Tu.splice(t, 1);
		}
	}, jh = class {
		constructor() {
			this._progressObserver = {}, this._taskCompletionResolver = new Td(), this._lastProgress = {
				taskState: "Running",
				totalBytes: 0,
				totalDocuments: 0,
				bytesLoaded: 0,
				documentsLoaded: 0
			};
		}
		onProgress(e, t, n) {
			this._progressObserver = {
				next: e,
				error: t,
				complete: n
			};
		}
		catch(e) {
			return this._taskCompletionResolver.promise.catch(e);
		}
		then(e, t) {
			return this._taskCompletionResolver.promise.then(e, t);
		}
		_completeWith(e) {
			this._updateProgress(e), this._progressObserver.complete && this._progressObserver.complete(), this._taskCompletionResolver.resolve(e);
		}
		_failWith(e) {
			this._lastProgress.taskState = "Error", this._progressObserver.next && this._progressObserver.next(this._lastProgress), this._progressObserver.error && this._progressObserver.error(e), this._taskCompletionResolver.reject(e);
		}
		_updateProgress(e) {
			this._lastProgress = e, this._progressObserver.next && this._progressObserver.next(e);
		}
	}, X = class extends Dh {
		constructor(e, t, n, r) {
			super(e, t, n, r), this.type = "firestore", this._queue = new Ah(), this._persistenceKey = r?.name || "[DEFAULT]";
		}
		async _terminate() {
			if (this._firestoreClient) {
				let e = this._firestoreClient.terminate();
				this._queue = new Ah(e), this._firestoreClient = void 0, await e;
			}
		}
	}, Mh = class {
		constructor(e = "count", t) {
			this._internalFieldPath = t, this.type = "AggregateField", this.aggregateType = e;
		}
	}, Nh = class {
		constructor(e, t, n) {
			this._userDataWriter = t, this._data = n, this.type = "AggregateQuerySnapshot", this.query = e;
		}
		data() {
			return this._userDataWriter.convertObjectMap(this._data);
		}
	}, Ph = class e {
		constructor(e) {
			this._byteString = e;
		}
		static fromBase64String(t) {
			try {
				return new e(W.fromBase64String(t));
			} catch (e) {
				throw new F(P.INVALID_ARGUMENT, "Failed to construct data from Base64 string: " + e);
			}
		}
		static fromUint8Array(t) {
			return new e(W.fromUint8Array(t));
		}
		toBase64() {
			return this._byteString.toBase64();
		}
		toUint8Array() {
			return this._byteString.toUint8Array();
		}
		toString() {
			return "Bytes(base64: " + this.toBase64() + ")";
		}
		isEqual(e) {
			return this._byteString.isEqual(e._byteString);
		}
	}, Fh = class {
		constructor(...e) {
			for (let t = 0; t < e.length; ++t) if (e[t].length === 0) throw new F(P.INVALID_ARGUMENT, "Invalid field name at argument $(i + 1). Field names must not be empty.");
			this._internalPath = new z(e);
		}
		isEqual(e) {
			return this._internalPath.isEqual(e._internalPath);
		}
	}, Ih = class {
		constructor(e) {
			this._methodName = e;
		}
	}, Lh = class {
		constructor(e, t) {
			if (!isFinite(e) || e < -90 || e > 90) throw new F(P.INVALID_ARGUMENT, "Latitude must be a number between -90 and 90, but was: " + e);
			if (!isFinite(t) || t < -180 || t > 180) throw new F(P.INVALID_ARGUMENT, "Longitude must be a number between -180 and 180, but was: " + t);
			this._lat = e, this._long = t;
		}
		get latitude() {
			return this._lat;
		}
		get longitude() {
			return this._long;
		}
		isEqual(e) {
			return this._lat === e._lat && this._long === e._long;
		}
		toJSON() {
			return {
				latitude: this._lat,
				longitude: this._long
			};
		}
		_compareTo(e) {
			return D(this._lat, e._lat) || D(this._long, e._long);
		}
	}, Rh = class {
		constructor(e) {
			this._values = (e || []).map(((e) => e));
		}
		toArray() {
			return this._values.map(((e) => e));
		}
		isEqual(e) {
			return function(e, t) {
				if (e.length !== t.length) return !1;
				for (let n = 0; n < e.length; ++n) if (e[n] !== t[n]) return !1;
				return !0;
			}(this._values, e._values);
		}
	}, zh = /^__.*__$/, Bh = class {
		constructor(e, t, n) {
			this.data = e, this.fieldMask = t, this.fieldTransforms = n;
		}
		toMutation(e, t) {
			return this.fieldMask === null ? new lp(e, this.data, t, this.fieldTransforms) : new up(e, this.data, this.fieldMask, t, this.fieldTransforms);
		}
	}, Vh = class {
		constructor(e, t, n) {
			this.data = e, this.fieldMask = t, this.fieldTransforms = n;
		}
		toMutation(e, t) {
			return new up(e, this.data, this.fieldMask, t, this.fieldTransforms);
		}
	}, Hh = class e {
		constructor(e, t, n, r, i, a) {
			this.settings = e, this.databaseId = t, this.serializer = n, this.ignoreUndefinedProperties = r, i === void 0 && this.vu(), this.fieldTransforms = i || [], this.fieldMask = a || [];
		}
		get path() {
			return this.settings.path;
		}
		get Cu() {
			return this.settings.Cu;
		}
		Fu(t) {
			return new e(Object.assign(Object.assign({}, this.settings), t), this.databaseId, this.serializer, this.ignoreUndefinedProperties, this.fieldTransforms, this.fieldMask);
		}
		Mu(e) {
			let t = this.path?.child(e), n = this.Fu({
				path: t,
				xu: !1
			});
			return n.Ou(e), n;
		}
		Nu(e) {
			let t = this.path?.child(e), n = this.Fu({
				path: t,
				xu: !1
			});
			return n.vu(), n;
		}
		Lu(e) {
			return this.Fu({
				path: void 0,
				xu: !0
			});
		}
		Bu(e) {
			return su(e, this.settings.methodName, this.settings.ku || !1, this.path, this.settings.qu);
		}
		contains(e) {
			return this.fieldMask.find(((t) => e.isPrefixOf(t))) !== void 0 || this.fieldTransforms.find(((t) => e.isPrefixOf(t.field))) !== void 0;
		}
		vu() {
			if (this.path) for (let e = 0; e < this.path.length; e++) this.Ou(this.path.get(e));
		}
		Ou(e) {
			if (e.length === 0) throw this.Bu("Document fields must not be empty");
			if (Jl(this.Cu) && zh.test(e)) throw this.Bu("Document fields cannot begin and end with \"__\"");
		}
	}, Uh = class {
		constructor(e, t, n) {
			this.databaseId = e, this.ignoreUndefinedProperties = t, this.serializer = n || js(e);
		}
		Qu(e, t, n, r = !1) {
			return new Hh({
				Cu: e,
				methodName: t,
				qu: n,
				path: z.emptyPath(),
				xu: !1,
				ku: r
			}, this.databaseId, this.serializer, this.ignoreUndefinedProperties);
		}
	}, Wh = class e extends Ih {
		_toFieldTransform(e) {
			if (e.Cu !== 2) throw e.Cu === 1 ? e.Bu(`${this._methodName}() can only appear at the top level of your update data`) : e.Bu(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);
			return e.fieldMask.push(e.path), null;
		}
		isEqual(t) {
			return t instanceof e;
		}
	}, Gh = class e extends Ih {
		_toFieldTransform(e) {
			return new op(e.path, new np());
		}
		isEqual(t) {
			return t instanceof e;
		}
	}, Kh = class e extends Ih {
		constructor(e, t) {
			super(e), this.Ku = t;
		}
		_toFieldTransform(e) {
			let t = Zl(this, e, !0), n = this.Ku.map(((e) => tu(e, t))), r = new rp(n);
			return new op(e.path, r);
		}
		isEqual(t) {
			return t instanceof e && fn(this.Ku, t.Ku);
		}
	}, qh = class e extends Ih {
		constructor(e, t) {
			super(e), this.Ku = t;
		}
		_toFieldTransform(e) {
			let t = Zl(this, e, !0), n = this.Ku.map(((e) => tu(e, t))), r = new ip(n);
			return new op(e.path, r);
		}
		isEqual(t) {
			return t instanceof e && fn(this.Ku, t.Ku);
		}
	}, Jh = class e extends Ih {
		constructor(e, t) {
			super(e), this.$u = t;
		}
		_toFieldTransform(e) {
			let t = new ap(e.serializer, ra(e.serializer, this.$u));
			return new op(e.path, t);
		}
		isEqual(t) {
			return t instanceof e && this.$u === t.$u;
		}
	}, Yh = /* @__PURE__ */ RegExp("[~\\*/\\[\\]]"), Xh = class {
		constructor(e, t, n, r, i) {
			this._firestore = e, this._userDataWriter = t, this._key = n, this._document = r, this._converter = i;
		}
		get id() {
			return this._key.path.lastSegment();
		}
		get ref() {
			return new Y(this._firestore, this._converter, this._key);
		}
		exists() {
			return this._document !== null;
		}
		data() {
			if (this._document) {
				if (this._converter) {
					let e = new Zh(this._firestore, this._userDataWriter, this._key, this._document, null);
					return this._converter.fromFirestore(e);
				}
				return this._userDataWriter.convertValue(this._document.data.value);
			}
		}
		get(e) {
			if (this._document) {
				let t = this._document.data.field(lu("DocumentSnapshot.get", e));
				if (t !== null) return this._userDataWriter.convertValue(t);
			}
		}
	}, Zh = class extends Xh {
		data() {
			return super.data();
		}
	}, Qh = class {}, $h = class extends Qh {}, eg = class e extends $h {
		constructor(e, t, n) {
			super(), this._field = e, this._op = t, this._value = n, this.type = "where";
		}
		static _create(t, n, r) {
			return new e(t, n, r);
		}
		_apply(e) {
			let t = this._parse(e);
			return Tu(e._query, t), new Oh(e.firestore, e.converter, zi(e._query, t));
		}
		_parse(e) {
			let t = Yl(e.firestore);
			return function(e, t, n, r, i, a, o) {
				let s;
				if (i.isKeyField()) {
					if (a === "array-contains" || a === "array-contains-any") throw new F(P.INVALID_ARGUMENT, `Invalid Query. You can't perform '${a}' queries on documentId().`);
					if (a === "in" || a === "not-in") {
						wu(o, a);
						let t = [];
						for (let n of o) t.push(Cu(r, e, n));
						s = { arrayValue: { values: t } };
					} else s = Cu(r, e, o);
				} else a !== "in" && a !== "not-in" && a !== "array-contains-any" || wu(o, a), s = eu(n, t, o, a === "in" || a === "not-in");
				return G.create(i, a, s);
			}(e._query, "where", t, e.firestore._databaseId, this._field, this._op, this._value);
		}
	}, tg = class e extends Qh {
		constructor(e, t) {
			super(), this.type = e, this._queryConstraints = t;
		}
		static _create(t, n) {
			return new e(t, n);
		}
		_parse(e) {
			let t = this._queryConstraints.map(((t) => t._parse(e))).filter(((e) => e.getFilters().length > 0));
			return t.length === 1 ? t[0] : K.create(t, this._getOperator());
		}
		_apply(e) {
			let t = this._parse(e);
			return t.getFilters().length === 0 ? e : (function(e, t) {
				let n = e, r = t.getFlattenedFilters();
				for (let e of r) Tu(n, e), n = zi(n, e);
			}(e._query, t), new Oh(e.firestore, e.converter, zi(e._query, t)));
		}
		_getQueryConstraints() {
			return this._queryConstraints;
		}
		_getOperator() {
			return this.type === "and" ? "and" : "or";
		}
	}, ng = class e extends $h {
		constructor(e, t) {
			super(), this._field = e, this._direction = t, this.type = "orderBy";
		}
		static _create(t, n) {
			return new e(t, n);
		}
		_apply(e) {
			let t = function(e, t, n) {
				if (e.startAt !== null) throw new F(P.INVALID_ARGUMENT, "Invalid query. You must not call startAt() or startAfter() before calling orderBy().");
				if (e.endAt !== null) throw new F(P.INVALID_ARGUMENT, "Invalid query. You must not call endAt() or endBefore() before calling orderBy().");
				return new Rf(t, n);
			}(e._query, this._field, this._direction);
			return new Oh(e.firestore, e.converter, function(e, t) {
				let n = e.explicitOrderBy.concat([t]);
				return new Jf(e.path, e.collectionGroup, n, e.filters.slice(), e.limit, e.limitType, e.startAt, e.endAt);
			}(e._query, t));
		}
	}, rg = class e extends $h {
		constructor(e, t, n) {
			super(), this.type = e, this._limit = t, this._limitType = n;
		}
		static _create(t, n, r) {
			return new e(t, n, r);
		}
		_apply(e) {
			return new Oh(e.firestore, e.converter, Bi(e._query, this._limit, this._limitType));
		}
	}, ig = class e extends $h {
		constructor(e, t, n) {
			super(), this.type = e, this._docOrFields = t, this._inclusive = n;
		}
		static _create(t, n, r) {
			return new e(t, n, r);
		}
		_apply(e) {
			let t = Su(e, this.type, this._docOrFields, this._inclusive);
			return new Oh(e.firestore, e.converter, function(e, t) {
				return new Jf(e.path, e.collectionGroup, e.explicitOrderBy.slice(), e.filters.slice(), e.limit, e.limitType, t, e.endAt);
			}(e._query, t));
		}
	}, ag = class e extends $h {
		constructor(e, t, n) {
			super(), this.type = e, this._docOrFields = t, this._inclusive = n;
		}
		static _create(t, n, r) {
			return new e(t, n, r);
		}
		_apply(e) {
			let t = Su(e, this.type, this._docOrFields, this._inclusive);
			return new Oh(e.firestore, e.converter, function(e, t) {
				return new Jf(e.path, e.collectionGroup, e.explicitOrderBy.slice(), e.filters.slice(), e.limit, e.limitType, e.startAt, t);
			}(e._query, t));
		}
	}, og = class {
		convertValue(e, t = "none") {
			switch (Ur(e)) {
				case 0: return null;
				case 1: return e.booleanValue;
				case 2: return k(e.integerValue || e.doubleValue);
				case 3: return this.convertTimestamp(e.timestampValue);
				case 4: return this.convertServerTimestamp(e, t);
				case 5: return e.stringValue;
				case 6: return this.convertBytes(zr(e.bytesValue));
				case 7: return this.convertReference(e.referenceValue);
				case 8: return this.convertGeoPoint(e.geoPointValue);
				case 9: return this.convertArray(e.arrayValue, t);
				case 11: return this.convertObject(e.mapValue, t);
				case 10: return this.convertVectorValue(e.mapValue);
				default: throw w();
			}
		}
		convertObject(e, t) {
			return this.convertObjectMap(e.fields, t);
		}
		convertObjectMap(e, t = "none") {
			let n = {};
			return Nr(e, ((e, r) => {
				n[e] = this.convertValue(r, t);
			})), n;
		}
		convertVectorValue(e) {
			let t = (e.fields?.value.arrayValue?.values)?.map(((e) => k(e.doubleValue)));
			return new Rh(t);
		}
		convertGeoPoint(e) {
			return new Lh(k(e.latitude), k(e.longitude));
		}
		convertArray(e, t) {
			return (e.values || []).map(((e) => this.convertValue(e, t)));
		}
		convertServerTimestamp(e, t) {
			switch (t) {
				case "previous":
					let n = Vr(e);
					return n == null ? null : this.convertValue(n, t);
				case "estimate": return this.convertTimestamp(Hr(e));
				default: return null;
			}
		}
		convertTimestamp(e) {
			let t = Rr(e);
			return new I(t.seconds, t.nanos);
		}
		convertDocumentKey(e, t) {
			let n = R.fromString(e);
			T(so(n));
			let r = new jf(n.get(1), n.get(3)), i = new B(n.popFirst(5));
			return r.isEqual(t) || C(`Document ${i} contains a document reference within a different database (${r.projectId}/${r.database}) which is not supported. It will be treated as a reference in the current database (${t.projectId}/${t.database}) instead.`), i;
		}
	}, sg = class extends og {
		constructor(e) {
			super(), this.firestore = e;
		}
		convertBytes(e) {
			return new Ph(e);
		}
		convertReference(e) {
			let t = this.convertDocumentKey(e, this.firestore._databaseId);
			return new Y(this.firestore, null, t);
		}
	}, cg = class {
		constructor(e, t) {
			this.hasPendingWrites = e, this.fromCache = t;
		}
		isEqual(e) {
			return this.hasPendingWrites === e.hasPendingWrites && this.fromCache === e.fromCache;
		}
	}, lg = class extends Xh {
		constructor(e, t, n, r, i, a) {
			super(e, t, n, r, a), this._firestore = e, this._firestoreImpl = e, this.metadata = i;
		}
		exists() {
			return super.exists();
		}
		data(e = {}) {
			if (this._document) {
				if (this._converter) {
					let t = new ug(this._firestore, this._userDataWriter, this._key, this._document, this.metadata, null);
					return this._converter.fromFirestore(t, e);
				}
				return this._userDataWriter.convertValue(this._document.data.value, e.serverTimestamps);
			}
		}
		get(e, t = {}) {
			if (this._document) {
				let n = this._document.data.field(lu("DocumentSnapshot.get", e));
				if (n !== null) return this._userDataWriter.convertValue(n, t.serverTimestamps);
			}
		}
	}, ug = class extends lg {
		data(e = {}) {
			return super.data(e);
		}
	}, dg = class {
		constructor(e, t, n, r) {
			this._firestore = e, this._userDataWriter = t, this._snapshot = r, this.metadata = new cg(r.hasPendingWrites, r.fromCache), this.query = n;
		}
		get docs() {
			let e = [];
			return this.forEach(((t) => e.push(t))), e;
		}
		get size() {
			return this._snapshot.docs.size;
		}
		get empty() {
			return this.size === 0;
		}
		forEach(e, t) {
			this._snapshot.docs.forEach(((n) => {
				e.call(t, new ug(this._firestore, this._userDataWriter, n.key, n, new cg(this._snapshot.mutatedKeys.has(n.key), this._snapshot.fromCache), this.query.converter));
			}));
		}
		docChanges(e = {}) {
			let t = !!e.includeMetadataChanges;
			if (t && this._snapshot.excludesMetadataChanges) throw new F(P.INVALID_ARGUMENT, "To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");
			return this._cachedChanges && this._cachedChangesIncludeMetadataChanges === t || (this._cachedChanges = function(e, t) {
				if (e._snapshot.oldDocs.isEmpty()) {
					let t = 0;
					return e._snapshot.docChanges.map(((n) => {
						let r = new ug(e._firestore, e._userDataWriter, n.doc.key, n.doc, new cg(e._snapshot.mutatedKeys.has(n.doc.key), e._snapshot.fromCache), e.query.converter);
						return n.doc, {
							type: "added",
							doc: r,
							oldIndex: -1,
							newIndex: t++
						};
					}));
				}
				{
					let n = e._snapshot.oldDocs;
					return e._snapshot.docChanges.filter(((e) => t || e.type !== 3)).map(((t) => {
						let r = new ug(e._firestore, e._userDataWriter, t.doc.key, t.doc, new cg(e._snapshot.mutatedKeys.has(t.doc.key), e._snapshot.fromCache), e.query.converter), i = -1, a = -1;
						return t.type !== 0 && (i = n.indexOf(t.doc.key), n = n.delete(t.doc.key)), t.type !== 1 && (n = n.add(t.doc), a = n.indexOf(t.doc.key)), {
							type: Nu(t.type),
							doc: r,
							oldIndex: i,
							newIndex: a
						};
					}));
				}
			}(this, t), this._cachedChangesIncludeMetadataChanges = t), this._cachedChanges;
		}
	}, fg = class extends og {
		constructor(e) {
			super(), this.firestore = e;
		}
		convertBytes(e) {
			return new Ph(e);
		}
		convertReference(e) {
			let t = this.convertDocumentKey(e, this.firestore._databaseId);
			return new Y(this.firestore, null, t);
		}
	}, pg = class {
		constructor(e) {
			this.kind = "memory", this._onlineComponentProvider = yh.provider, e?.garbageCollector ? this._offlineComponentProvider = e.garbageCollector._offlineComponentProvider : this._offlineComponentProvider = hh.provider;
		}
		toJSON() {
			return { kind: this.kind };
		}
	}, mg = class {
		constructor(e) {
			let t;
			this.kind = "persistent", e?.tabManager ? (e.tabManager._initialize(e), t = e.tabManager) : (t = td(void 0), t._initialize(e)), this._onlineComponentProvider = t._onlineComponentProvider, this._offlineComponentProvider = t._offlineComponentProvider;
		}
		toJSON() {
			return { kind: this.kind };
		}
	}, hg = class {
		constructor() {
			this.kind = "memoryEager", this._offlineComponentProvider = hh.provider;
		}
		toJSON() {
			return { kind: this.kind };
		}
	}, gg = class {
		constructor(e) {
			this.kind = "memoryLru", this._offlineComponentProvider = { build: () => new gh(e) };
		}
		toJSON() {
			return { kind: this.kind };
		}
	}, _g = class {
		constructor(e) {
			this.forceOwnership = e, this.kind = "persistentSingleTab";
		}
		toJSON() {
			return { kind: this.kind };
		}
		_initialize(e) {
			this._onlineComponentProvider = yh.provider, this._offlineComponentProvider = { build: (t) => new _h(t, e?.cacheSizeBytes, this.forceOwnership) };
		}
	}, vg = class {
		constructor() {
			this.kind = "PersistentMultipleTab";
		}
		toJSON() {
			return { kind: this.kind };
		}
		_initialize(e) {
			this._onlineComponentProvider = yh.provider, this._offlineComponentProvider = { build: (t) => new vh(t, e?.cacheSizeBytes) };
		}
	}, yg = { maxAttempts: 5 }, bg = class {
		constructor(e, t) {
			this._firestore = e, this._commitHandler = t, this._mutations = [], this._committed = !1, this._dataReader = Yl(e);
		}
		set(e, t, n) {
			this._verifyNotCommitted();
			let r = rd(e, this._firestore), i = Du(r.converter, t, n), a = Xl(this._dataReader, "WriteBatch.set", r._key, i, r.converter !== null, n);
			return this._mutations.push(a.toMutation(r._key, q.none())), this;
		}
		update(e, t, n, ...r) {
			this._verifyNotCommitted();
			let i = rd(e, this._firestore), a;
			return a = typeof (t = mn(t)) == "string" || t instanceof Fh ? $l(this._dataReader, "WriteBatch.update", i._key, t, n, r) : Ql(this._dataReader, "WriteBatch.update", i._key, t), this._mutations.push(a.toMutation(i._key, q.exists(!0))), this;
		}
		delete(e) {
			this._verifyNotCommitted();
			let t = rd(e, this._firestore);
			return this._mutations = this._mutations.concat(new dp(t._key, q.none())), this;
		}
		commit() {
			return this._verifyNotCommitted(), this._committed = !0, this._mutations.length > 0 ? this._commitHandler(this._mutations) : Promise.resolve();
		}
		_verifyNotCommitted() {
			if (this._committed) throw new F(P.FAILED_PRECONDITION, "A write batch can no longer be used after commit() has been called.");
		}
	}, xg = class extends class {
		constructor(e, t) {
			this._firestore = e, this._transaction = t, this._dataReader = Yl(e);
		}
		get(e) {
			let t = rd(e, this._firestore), n = new sg(this._firestore);
			return this._transaction.lookup([t._key]).then(((e) => {
				if (!e || e.length !== 1) return w();
				let r = e[0];
				if (r.isFoundDocument()) return new Xh(this._firestore, n, r.key, r, t.converter);
				if (r.isNoDocument()) return new Xh(this._firestore, n, t._key, null, t.converter);
				throw w();
			}));
		}
		set(e, t, n) {
			let r = rd(e, this._firestore), i = Du(r.converter, t, n), a = Xl(this._dataReader, "Transaction.set", r._key, i, r.converter !== null, n);
			return this._transaction.set(r._key, a), this;
		}
		update(e, t, n, ...r) {
			let i = rd(e, this._firestore), a;
			return a = typeof (t = mn(t)) == "string" || t instanceof Fh ? $l(this._dataReader, "Transaction.update", i._key, t, n, r) : Ql(this._dataReader, "Transaction.update", i._key, t), this._transaction.update(i._key, a), this;
		}
		delete(e) {
			let t = rd(e, this._firestore);
			return this._transaction.delete(t._key), this;
		}
	} {
		constructor(e, t) {
			super(e, t), this._firestore = e;
		}
		get(e) {
			let t = rd(e, this._firestore), n = new fg(this._firestore);
			return super.get(e).then(((e) => new lg(this._firestore, n, t._key, e._document, new cg(!1, !1), t.converter)));
		}
	}, Sg = class {
		constructor(e) {
			this._firestore = e, this.type = "PersistentCacheIndexManager";
		}
	}, Cg = /* @__PURE__ */ new WeakMap(), wg = class {
		constructor() {
			throw Error("instances of this class should not be created");
		}
		static onExistenceFilterMismatch(e) {
			return Tg.instance.onExistenceFilterMismatch(e);
		}
	}, Tg = class e {
		constructor() {
			this.Uu = /* @__PURE__ */ new Map();
		}
		static get instance() {
			return Eg || (Eg = new e(), function(e) {
				if (yp) throw Error("a TestingHooksSpi instance is already set");
				yp = e;
			}(Eg)), Eg;
		}
		et(e) {
			this.Uu.forEach(((t) => t(e)));
		}
		onExistenceFilterMismatch(e) {
			let t = Symbol(), n = this.Uu;
			return n.set(t, e), () => n.delete(t);
		}
	}, Eg = null, (function(e, t = !0) {
		(function(e) {
			Cd = e;
		})(Yt), Ze(new Nn("firestore", ((e, { instanceIdentifier: n, options: r }) => {
			let i = e.getProvider("app").getImmediate(), a = new X(new kd(e.getProvider("auth-internal")), new Nd(e.getProvider("app-check-internal")), function(e, t) {
				if (!Object.prototype.hasOwnProperty.apply(e.options, ["projectId"])) throw new F(P.INVALID_ARGUMENT, "\"projectId\" not provided in firebase.initializeApp.");
				return new jf(e.options.projectId, t);
			}(i, n), i);
			return r = Object.assign({ useFetchStreams: t }, r), a._setSettings(r), a;
		}), "PUBLIC").setMultipleInstances(!0)), rt(xd, "4.7.3", e), rt(xd, "4.7.3", "esm2017");
	})();
})), Og = /* @__PURE__ */ n({
	AbstractUserDataWriter: () => og,
	AggregateField: () => Mh,
	AggregateQuerySnapshot: () => Nh,
	Bytes: () => Ph,
	CACHE_SIZE_UNLIMITED: () => -1,
	CollectionReference: () => kh,
	DocumentReference: () => Y,
	DocumentSnapshot: () => lg,
	FieldPath: () => Fh,
	FieldValue: () => Ih,
	Firestore: () => X,
	FirestoreError: () => F,
	GeoPoint: () => Lh,
	LoadBundleTask: () => jh,
	PersistentCacheIndexManager: () => Sg,
	Query: () => Oh,
	QueryCompositeFilterConstraint: () => tg,
	QueryConstraint: () => $h,
	QueryDocumentSnapshot: () => ug,
	QueryEndAtConstraint: () => ag,
	QueryFieldFilterConstraint: () => eg,
	QueryLimitConstraint: () => rg,
	QueryOrderByConstraint: () => ng,
	QuerySnapshot: () => dg,
	QueryStartAtConstraint: () => ig,
	SnapshotMetadata: () => cg,
	Timestamp: () => I,
	Transaction: () => xg,
	VectorValue: () => Rh,
	WriteBatch: () => bg,
	_AutoId: () => Fd,
	_ByteString: () => W,
	_DatabaseId: () => jf,
	_DocumentKey: () => B,
	_EmptyAppCheckTokenProvider: () => Pd,
	_EmptyAuthCredentialsProvider: () => Dd,
	_FieldPath: () => z,
	_TestingHooks: () => wg,
	_cast: () => M,
	_debugAssert: () => sr,
	_internalAggregationQueryToProtoRunAggregationQueryRequest: () => bd,
	_internalQueryToProtoQueryTarget: () => yd,
	_isBase64Available: () => Lr,
	_logWarn: () => ar,
	_validateIsNotUsedTogether: () => Sl,
	addDoc: () => Wu,
	aggregateFieldEqual: () => ju,
	aggregateQuerySnapshotEqual: () => Mu,
	and: () => mu,
	arrayRemove: () => cd,
	arrayUnion: () => sd,
	average: () => ku,
	clearIndexedDbPersistence: () => Bl,
	collection: () => Ol,
	collectionGroup: () => kl,
	connectFirestoreEmulator: () => Dl,
	count: () => Au,
	deleteAllPersistentCacheIndexes: () => _d,
	deleteDoc: () => Uu,
	deleteField: () => ad,
	disableNetwork: () => Ul,
	disablePersistentCacheIndexAutoCreation: () => gd,
	doc: () => Al,
	documentId: () => ql,
	enableIndexedDbPersistence: () => Ll,
	enableMultiTabIndexedDbPersistence: () => Rl,
	enableNetwork: () => Hl,
	enablePersistentCacheIndexAutoCreation: () => hd,
	endAt: () => xu,
	endBefore: () => bu,
	ensureFirestoreConfigured: () => N,
	executeWrite: () => qu,
	getAggregateFromServer: () => Xu,
	getCountFromServer: () => Yu,
	getDoc: () => Fu,
	getDocFromCache: () => Iu,
	getDocFromServer: () => Lu,
	getDocs: () => Ru,
	getDocsFromCache: () => zu,
	getDocsFromServer: () => Bu,
	getFirestore: () => Fl,
	getPersistentCacheIndexManager: () => md,
	increment: () => ld,
	initializeFirestore: () => Pl,
	limit: () => gu,
	limitToLast: () => _u,
	loadBundle: () => Gl,
	memoryEagerGarbageCollector: () => Zu,
	memoryLocalCache: () => $u,
	memoryLruGarbageCollector: () => Qu,
	namedQuery: () => Kl,
	onSnapshot: () => Gu,
	onSnapshotsInSync: () => Ku,
	or: () => pu,
	orderBy: () => hu,
	persistentLocalCache: () => ed,
	persistentMultipleTabManager: () => nd,
	persistentSingleTabManager: () => td,
	query: () => du,
	queryEqual: () => Ml,
	refEqual: () => jl,
	runTransaction: () => id,
	serverTimestamp: () => od,
	setDoc: () => Vu,
	setIndexConfiguration: () => fd,
	setLogLevel: () => ir,
	snapshotEqual: () => Pu,
	startAfter: () => yu,
	startAt: () => vu,
	sum: () => Ou,
	terminate: () => Wl,
	updateDoc: () => Hu,
	vector: () => ud,
	waitForPendingWrites: () => Vl,
	where: () => fu,
	writeBatch: () => dd
}), kg = t((() => {
	Dg();
}));
//#endregion
//#region shared/partyBanners.js
kg();
var Ag = [
	{
		id: "whatsapp",
		kind: "whatsapp",
		link: "https://chat.whatsapp.com/LHo4Spoy73b38mDI5XEcF7",
		alt: "קבוצת פרסומי המסיבות בוואטסאפ",
		enabled: !0
	},
	{
		id: "instagram",
		kind: "image",
		image: "/assets/design/instagram-banner-v2.jpg",
		link: "https://www.instagram.com/liberl_party/",
		alt: "הצטרפו אלינו באינסטגרם",
		enabled: !0
	},
	{
		id: "facebook",
		kind: "image",
		image: "/assets/design/facebook-banner.jpg",
		link: "https://www.facebook.com/share/g/1D7ng47o28/",
		alt: "הצטרפו לקבוצת הפייסבוק שלנו",
		enabled: !0
	},
	{
		id: "app",
		kind: "image",
		image: "/assets/design/app-banner.jpg",
		link: "/downloads/libral-party.apk",
		alt: "האפליקציה של LIBRAL-PARTY לאנדרואיד",
		enabled: !0
	}
], jg = (e) => {
	let t = String(e || "").trim();
	return /^(https:\/\/|\/)/.test(t) ? t : "";
};
function Mg(e) {
	return Array.isArray(e) ? e.filter((e) => e && typeof e == "object").map((e, t) => ({
		id: String(e.id || `b${t}`),
		kind: e.kind === "whatsapp" ? "whatsapp" : "image",
		image: jg(e.image),
		link: jg(e.link),
		alt: String(e.alt || "").slice(0, 200),
		enabled: e.enabled !== !1
	})).filter((e) => e.kind === "whatsapp" || e.image) : Ag.map((e) => ({ ...e }));
}
//#endregion
//#region node_modules/firebase/app/dist/esm/index.esm.js
var Ng = t((() => {
	an(), an(), rt("firebase", "10.14.1", "app");
}));
//#endregion
//#region node_modules/@firebase/auth/node_modules/@firebase/util/dist/index.esm2017.js
function Pg() {
	if (typeof self < "u") return self;
	if (typeof window < "u") return window;
	if (typeof global < "u") return global;
	throw Error("Unable to locate global object.");
}
function Fg() {
	return typeof navigator < "u" && typeof navigator.userAgent == "string" ? navigator.userAgent : "";
}
function Ig() {
	return typeof window < "u" && !!(window.cordova || window.phonegap || window.PhoneGap) && /ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(Fg());
}
function Lg() {
	return typeof navigator < "u" && navigator.userAgent === "Cloudflare-Workers";
}
function Rg() {
	let e = typeof chrome == "object" ? chrome.runtime : typeof browser == "object" ? browser.runtime : void 0;
	return typeof e == "object" && e.id !== void 0;
}
function zg() {
	return typeof navigator == "object" && navigator.product === "ReactNative";
}
function Bg() {
	let e = Fg();
	return e.indexOf("MSIE ") >= 0 || e.indexOf("Trident/") >= 0;
}
function Vg(e, t) {
	return e.replace(f_, (e, n) => {
		let r = t[n];
		return r == null ? `<${n}?>` : String(r);
	});
}
function Hg(e) {
	for (let t in e) if (Object.prototype.hasOwnProperty.call(e, t)) return !1;
	return !0;
}
function Ug(e, t) {
	if (e === t) return !0;
	let n = Object.keys(e), r = Object.keys(t);
	for (let i of n) {
		if (!r.includes(i)) return !1;
		let n = e[i], a = t[i];
		if (Wg(n) && Wg(a)) {
			if (!Ug(n, a)) return !1;
		} else if (n !== a) return !1;
	}
	for (let e of r) if (!n.includes(e)) return !1;
	return !0;
}
function Wg(e) {
	return typeof e == "object" && !!e;
}
function Gg(e) {
	let t = [];
	for (let [n, r] of Object.entries(e)) Array.isArray(r) ? r.forEach((e) => {
		t.push(encodeURIComponent(n) + "=" + encodeURIComponent(e));
	}) : t.push(encodeURIComponent(n) + "=" + encodeURIComponent(r));
	return t.length ? "&" + t.join("&") : "";
}
function Kg(e) {
	let t = {};
	return e.replace(/^\?/, "").split("&").forEach((e) => {
		if (e) {
			let [n, r] = e.split("=");
			t[decodeURIComponent(n)] = decodeURIComponent(r);
		}
	}), t;
}
function qg(e) {
	let t = e.indexOf("?");
	if (!t) return "";
	let n = e.indexOf("#", t);
	return e.substring(t, n > 0 ? n : void 0);
}
function Jg(e, t) {
	let n = new p_(e, t);
	return n.subscribe.bind(n);
}
function Yg(e, t) {
	if (typeof e != "object" || !e) return !1;
	for (let n of t) if (n in e && typeof e[n] == "function") return !0;
	return !1;
}
function Xg() {}
function Zg(e) {
	return e && e._delegate ? e._delegate : e;
}
var Qg, $g, e_, t_, n_, r_, i_, a_, o_, s_, c_, l_, u_, d_, f_, p_, m_ = t((() => {
	Qg = function(e) {
		let t = [], n = 0;
		for (let r = 0; r < e.length; r++) {
			let i = e.charCodeAt(r);
			i < 128 ? t[n++] = i : i < 2048 ? (t[n++] = i >> 6 | 192, t[n++] = i & 63 | 128) : (i & 64512) == 55296 && r + 1 < e.length && (e.charCodeAt(r + 1) & 64512) == 56320 ? (i = 65536 + ((i & 1023) << 10) + (e.charCodeAt(++r) & 1023), t[n++] = i >> 18 | 240, t[n++] = i >> 12 & 63 | 128, t[n++] = i >> 6 & 63 | 128, t[n++] = i & 63 | 128) : (t[n++] = i >> 12 | 224, t[n++] = i >> 6 & 63 | 128, t[n++] = i & 63 | 128);
		}
		return t;
	}, $g = function(e) {
		let t = [], n = 0, r = 0;
		for (; n < e.length;) {
			let i = e[n++];
			if (i < 128) t[r++] = String.fromCharCode(i);
			else if (i > 191 && i < 224) {
				let a = e[n++];
				t[r++] = String.fromCharCode((i & 31) << 6 | a & 63);
			} else if (i > 239 && i < 365) {
				let a = e[n++], o = e[n++], s = e[n++], c = ((i & 7) << 18 | (a & 63) << 12 | (o & 63) << 6 | s & 63) - 65536;
				t[r++] = String.fromCharCode(55296 + (c >> 10)), t[r++] = String.fromCharCode(56320 + (c & 1023));
			} else {
				let a = e[n++], o = e[n++];
				t[r++] = String.fromCharCode((i & 15) << 12 | (a & 63) << 6 | o & 63);
			}
		}
		return t.join("");
	}, e_ = {
		byteToCharMap_: null,
		charToByteMap_: null,
		byteToCharMapWebSafe_: null,
		charToByteMapWebSafe_: null,
		ENCODED_VALS_BASE: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
		get ENCODED_VALS() {
			return this.ENCODED_VALS_BASE + "+/=";
		},
		get ENCODED_VALS_WEBSAFE() {
			return this.ENCODED_VALS_BASE + "-_.";
		},
		HAS_NATIVE_SUPPORT: typeof atob == "function",
		encodeByteArray(e, t) {
			if (!Array.isArray(e)) throw Error("encodeByteArray takes an array as a parameter");
			this.init_();
			let n = t ? this.byteToCharMapWebSafe_ : this.byteToCharMap_, r = [];
			for (let t = 0; t < e.length; t += 3) {
				let i = e[t], a = t + 1 < e.length, o = a ? e[t + 1] : 0, s = t + 2 < e.length, c = s ? e[t + 2] : 0, l = i >> 2, u = (i & 3) << 4 | o >> 4, d = (o & 15) << 2 | c >> 6, f = c & 63;
				s || (f = 64, a || (d = 64)), r.push(n[l], n[u], n[d], n[f]);
			}
			return r.join("");
		},
		encodeString(e, t) {
			return this.HAS_NATIVE_SUPPORT && !t ? btoa(e) : this.encodeByteArray(Qg(e), t);
		},
		decodeString(e, t) {
			return this.HAS_NATIVE_SUPPORT && !t ? atob(e) : $g(this.decodeStringToByteArray(e, t));
		},
		decodeStringToByteArray(e, t) {
			this.init_();
			let n = t ? this.charToByteMapWebSafe_ : this.charToByteMap_, r = [];
			for (let t = 0; t < e.length;) {
				let i = n[e.charAt(t++)], a = t < e.length ? n[e.charAt(t)] : 0;
				++t;
				let o = t < e.length ? n[e.charAt(t)] : 64;
				++t;
				let s = t < e.length ? n[e.charAt(t)] : 64;
				if (++t, i == null || a == null || o == null || s == null) throw new t_();
				let c = i << 2 | a >> 4;
				if (r.push(c), o !== 64) {
					let e = a << 4 & 240 | o >> 2;
					if (r.push(e), s !== 64) {
						let e = o << 6 & 192 | s;
						r.push(e);
					}
				}
			}
			return r;
		},
		init_() {
			if (!this.byteToCharMap_) {
				this.byteToCharMap_ = {}, this.charToByteMap_ = {}, this.byteToCharMapWebSafe_ = {}, this.charToByteMapWebSafe_ = {};
				for (let e = 0; e < this.ENCODED_VALS.length; e++) this.byteToCharMap_[e] = this.ENCODED_VALS.charAt(e), this.charToByteMap_[this.byteToCharMap_[e]] = e, this.byteToCharMapWebSafe_[e] = this.ENCODED_VALS_WEBSAFE.charAt(e), this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[e]] = e, e >= this.ENCODED_VALS_BASE.length && (this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(e)] = e, this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(e)] = e);
			}
		}
	}, t_ = class extends Error {
		constructor() {
			super(...arguments), this.name = "DecodeBase64StringError";
		}
	}, n_ = function(e) {
		try {
			return e_.decodeString(e, !0);
		} catch (e) {
			console.error("base64Decode failed: ", e);
		}
		return null;
	}, r_ = () => Pg().__FIREBASE_DEFAULTS__, i_ = () => {
		if (typeof process > "u" || process.env === void 0) return;
		let e = process.env.__FIREBASE_DEFAULTS__;
		if (e) return JSON.parse(e);
	}, a_ = () => {
		if (typeof document > "u") return;
		let e;
		try {
			e = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
		} catch {
			return;
		}
		let t = e && n_(e[1]);
		return t && JSON.parse(t);
	}, o_ = () => {
		try {
			return r_() || i_() || a_();
		} catch (e) {
			console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);
			return;
		}
	}, s_ = (e) => o_()?.emulatorHosts?.[e], c_ = (e) => o_()?.[`_${e}`], l_ = "FirebaseError", u_ = class e extends Error {
		constructor(t, n, r) {
			super(n), this.code = t, this.customData = r, this.name = l_, Object.setPrototypeOf(this, e.prototype), Error.captureStackTrace && Error.captureStackTrace(this, d_.prototype.create);
		}
	}, d_ = class {
		constructor(e, t, n) {
			this.service = e, this.serviceName = t, this.errors = n;
		}
		create(e, ...t) {
			let n = t[0] || {}, r = `${this.service}/${e}`, i = this.errors[e], a = i ? Vg(i, n) : "Error", o = `${this.serviceName}: ${a} (${r}).`;
			return new u_(r, o, n);
		}
	}, f_ = /\{\$([^}]+)}/g, p_ = class {
		constructor(e, t) {
			this.observers = [], this.unsubscribes = [], this.observerCount = 0, this.task = Promise.resolve(), this.finalized = !1, this.onNoObservers = t, this.task.then(() => {
				e(this);
			}).catch((e) => {
				this.error(e);
			});
		}
		next(e) {
			this.forEachObserver((t) => {
				t.next(e);
			});
		}
		error(e) {
			this.forEachObserver((t) => {
				t.error(e);
			}), this.close(e);
		}
		complete() {
			this.forEachObserver((e) => {
				e.complete();
			}), this.close();
		}
		subscribe(e, t, n) {
			let r;
			if (e === void 0 && t === void 0 && n === void 0) throw Error("Missing Observer.");
			r = Yg(e, [
				"next",
				"error",
				"complete"
			]) ? e : {
				next: e,
				error: t,
				complete: n
			}, r.next === void 0 && (r.next = Xg), r.error === void 0 && (r.error = Xg), r.complete === void 0 && (r.complete = Xg);
			let i = this.unsubscribeOne.bind(this, this.observers.length);
			return this.finalized && this.task.then(() => {
				try {
					this.finalError ? r.error(this.finalError) : r.complete();
				} catch {}
			}), this.observers.push(r), i;
		}
		unsubscribeOne(e) {
			this.observers === void 0 || this.observers[e] === void 0 || (delete this.observers[e], --this.observerCount, this.observerCount === 0 && this.onNoObservers !== void 0 && this.onNoObservers(this));
		}
		forEachObserver(e) {
			if (!this.finalized) for (let t = 0; t < this.observers.length; t++) this.sendOne(t, e);
		}
		sendOne(e, t) {
			this.task.then(() => {
				if (this.observers !== void 0 && this.observers[e] !== void 0) try {
					t(this.observers[e]);
				} catch (e) {
					typeof console < "u" && console.error && console.error(e);
				}
			});
		}
		close(e) {
			this.finalized || (this.finalized = !0, e !== void 0 && (this.finalError = e), this.task.then(() => {
				this.observers = void 0, this.onNoObservers = void 0;
			}));
		}
	};
})), h_, Z, g_, __, v_, y_, b_, x_ = t((() => {
	h_ = [], (function(e) {
		e[e.DEBUG = 0] = "DEBUG", e[e.VERBOSE = 1] = "VERBOSE", e[e.INFO = 2] = "INFO", e[e.WARN = 3] = "WARN", e[e.ERROR = 4] = "ERROR", e[e.SILENT = 5] = "SILENT";
	})(Z ||= {}), g_ = {
		debug: Z.DEBUG,
		verbose: Z.VERBOSE,
		info: Z.INFO,
		warn: Z.WARN,
		error: Z.ERROR,
		silent: Z.SILENT
	}, __ = Z.INFO, v_ = {
		[Z.DEBUG]: "log",
		[Z.VERBOSE]: "log",
		[Z.INFO]: "info",
		[Z.WARN]: "warn",
		[Z.ERROR]: "error"
	}, y_ = (e, t, ...n) => {
		if (t < e.logLevel) return;
		let r = (/* @__PURE__ */ new Date()).toISOString(), i = v_[t];
		if (i) console[i](`[${r}]  ${e.name}:`, ...n);
		else throw Error(`Attempted to log a message with an invalid logType (value: ${t})`);
	}, b_ = class {
		constructor(e) {
			this.name = e, this._logLevel = __, this._logHandler = y_, this._userLogHandler = null, h_.push(this);
		}
		get logLevel() {
			return this._logLevel;
		}
		set logLevel(e) {
			if (!(e in Z)) throw TypeError(`Invalid value "${e}" assigned to \`logLevel\``);
			this._logLevel = e;
		}
		setLogLevel(e) {
			this._logLevel = typeof e == "string" ? g_[e] : e;
		}
		get logHandler() {
			return this._logHandler;
		}
		set logHandler(e) {
			if (typeof e != "function") throw TypeError("Value assigned to `logHandler` must be a function");
			this._logHandler = e;
		}
		get userLogHandler() {
			return this._userLogHandler;
		}
		set userLogHandler(e) {
			this._userLogHandler = e;
		}
		debug(...e) {
			this._userLogHandler && this._userLogHandler(this, Z.DEBUG, ...e), this._logHandler(this, Z.DEBUG, ...e);
		}
		log(...e) {
			this._userLogHandler && this._userLogHandler(this, Z.VERBOSE, ...e), this._logHandler(this, Z.VERBOSE, ...e);
		}
		info(...e) {
			this._userLogHandler && this._userLogHandler(this, Z.INFO, ...e), this._logHandler(this, Z.INFO, ...e);
		}
		warn(...e) {
			this._userLogHandler && this._userLogHandler(this, Z.WARN, ...e), this._logHandler(this, Z.WARN, ...e);
		}
		error(...e) {
			this._userLogHandler && this._userLogHandler(this, Z.ERROR, ...e), this._logHandler(this, Z.ERROR, ...e);
		}
	};
}));
//#endregion
//#region node_modules/tslib/tslib.es6.mjs
function S_(e, t) {
	var n = {};
	for (var r in e) Object.prototype.hasOwnProperty.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r]);
	if (e != null && typeof Object.getOwnPropertySymbols == "function") for (var i = 0, r = Object.getOwnPropertySymbols(e); i < r.length; i++) t.indexOf(r[i]) < 0 && Object.prototype.propertyIsEnumerable.call(e, r[i]) && (n[r[i]] = e[r[i]]);
	return n;
}
var C_ = t((() => {})), w_, T_ = t((() => {
	w_ = class {
		constructor(e, t, n) {
			this.name = e, this.instanceFactory = t, this.type = n, this.multipleInstances = !1, this.serviceProps = {}, this.instantiationMode = "LAZY", this.onInstanceCreated = null;
		}
		setInstantiationMode(e) {
			return this.instantiationMode = e, this;
		}
		setMultipleInstances(e) {
			return this.multipleInstances = e, this;
		}
		setServiceProps(e) {
			return this.serviceProps = e, this;
		}
		setInstanceCreatedCallback(e) {
			return this.onInstanceCreated = e, this;
		}
	};
}));
//#endregion
//#region node_modules/@firebase/auth/dist/esm2017/index-68602d24.js
function E_() {
	return { "dependent-sdk-initialized-before-auth": "Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK." };
}
function D_(e, ...t) {
	sb.logLevel <= Z.WARN && sb.warn(`Auth (${Yt}): ${e}`, ...t);
}
function O_(e, ...t) {
	sb.logLevel <= Z.ERROR && sb.error(`Auth (${Yt}): ${e}`, ...t);
}
function k_(e, ...t) {
	throw N_(e, ...t);
}
function A_(e, ...t) {
	return N_(e, ...t);
}
function j_(e, t, n) {
	return new d_("auth", "Firebase", Object.assign(Object.assign({}, ab()), { [t]: n })).create(t, { appName: e.name });
}
function M_(e) {
	return j_(e, "operation-not-supported-in-this-environment", "Operations that alter the current user are not supported in conjunction with FirebaseServerApp");
}
function N_(e, ...t) {
	if (typeof e != "string") {
		let n = t[0], r = [...t.slice(1)];
		return r[0] && (r[0].appName = e.name), e._errorFactory.create(n, ...r);
	}
	return ob.create(e, ...t);
}
function Q(e, t, ...n) {
	if (!e) throw N_(t, ...n);
}
function P_(e) {
	let t = "INTERNAL ASSERTION FAILED: " + e;
	throw O_(t), Error(t);
}
function F_(e, t) {
	e || P_(t);
}
function I_() {
	return typeof self < "u" && self.location?.href || "";
}
function L_() {
	return R_() === "http:" || R_() === "https:";
}
function R_() {
	return typeof self < "u" && self.location?.protocol || null;
}
function z_() {
	return typeof navigator < "u" && navigator && "onLine" in navigator && typeof navigator.onLine == "boolean" && (L_() || Rg() || "connection" in navigator) ? navigator.onLine : !0;
}
function B_() {
	if (typeof navigator > "u") return null;
	let e = navigator;
	return e.languages && e.languages[0] || e.language || null;
}
function V_(e, t) {
	F_(e.emulator, "Emulator should always be set here");
	let { url: n } = e.emulator;
	return t ? `${n}${t.startsWith("/") ? t.slice(1) : t}` : n;
}
function H_(e, t) {
	return e.tenantId && !t.tenantId ? Object.assign(Object.assign({}, t), { tenantId: e.tenantId }) : t;
}
async function U_(e, t, n, r, i = {}) {
	return W_(e, i, async () => {
		let i = {}, a = {};
		r && (t === "GET" ? a = r : i = { body: JSON.stringify(r) });
		let o = Gg(Object.assign({ key: e.config.apiKey }, a)).slice(1), s = await e._getAdditionalHeaders();
		s["Content-Type"] = "application/json", e.languageCode && (s["X-Firebase-Locale"] = e.languageCode);
		let c = Object.assign({
			method: t,
			headers: s
		}, i);
		return Lg() || (c.referrerPolicy = "no-referrer"), lb.fetch()(K_(e, e.config.apiHost, n, o), c);
	});
}
async function W_(e, t, n) {
	e._canInitEmulator = !1;
	let r = Object.assign(Object.assign({}, ub), t);
	try {
		let t = new fb(e), i = await Promise.race([n(), t.promise]);
		t.clearNetworkTimeout();
		let a = await i.json();
		if ("needConfirmation" in a) throw J_(e, "account-exists-with-different-credential", a);
		if (i.ok && !("errorMessage" in a)) return a;
		{
			let [t, n] = (i.ok ? a.errorMessage : a.error.message).split(" : ");
			if (t === "FEDERATED_USER_ID_ALREADY_LINKED") throw J_(e, "credential-already-in-use", a);
			if (t === "EMAIL_EXISTS") throw J_(e, "email-already-in-use", a);
			if (t === "USER_DISABLED") throw J_(e, "user-disabled", a);
			let o = r[t] || t.toLowerCase().replace(/[_\s]+/g, "-");
			if (n) throw j_(e, o, n);
			k_(e, o);
		}
	} catch (t) {
		if (t instanceof u_) throw t;
		k_(e, "network-request-failed", { message: String(t) });
	}
}
async function G_(e, t, n, r, i = {}) {
	let a = await U_(e, t, n, r, i);
	return "mfaPendingCredential" in a && k_(e, "multi-factor-auth-required", { _serverResponse: a }), a;
}
function K_(e, t, n, r) {
	let i = `${t}${n}?${r}`;
	return e.config.emulator ? V_(e.config, i) : `${e.config.apiScheme}://${i}`;
}
function q_(e) {
	switch (e) {
		case "ENFORCE": return "ENFORCE";
		case "AUDIT": return "AUDIT";
		case "OFF": return "OFF";
		default: return "ENFORCEMENT_STATE_UNSPECIFIED";
	}
}
function J_(e, t, n) {
	let r = { appName: e.name };
	n.email && (r.email = n.email), n.phoneNumber && (r.phoneNumber = n.phoneNumber);
	let i = A_(e, t, r);
	return i.customData._tokenResponse = n, i;
}
function Y_(e) {
	return e !== void 0 && e.enterprise !== void 0;
}
async function X_(e, t) {
	return U_(e, "GET", "/v2/recaptchaConfig", H_(e, t));
}
async function Z_(e, t) {
	return U_(e, "POST", "/v1/accounts:delete", t);
}
async function Q_(e, t) {
	return U_(e, "POST", "/v1/accounts:lookup", t);
}
function $_(e) {
	if (e) try {
		let t = new Date(Number(e));
		if (!isNaN(t.getTime())) return t.toUTCString();
	} catch {}
}
async function ev(e, t = !1) {
	let n = Zg(e), r = await n.getIdToken(t), i = nv(r);
	Q(i && i.exp && i.auth_time && i.iat, n.auth, "internal-error");
	let a = typeof i.firebase == "object" ? i.firebase : void 0, o = a?.sign_in_provider;
	return {
		claims: i,
		token: r,
		authTime: $_(tv(i.auth_time)),
		issuedAtTime: $_(tv(i.iat)),
		expirationTime: $_(tv(i.exp)),
		signInProvider: o || null,
		signInSecondFactor: a?.sign_in_second_factor || null
	};
}
function tv(e) {
	return Number(e) * 1e3;
}
function nv(e) {
	let [t, n, r] = e.split(".");
	if (t === void 0 || n === void 0 || r === void 0) return O_("JWT malformed, contained fewer than 3 sections"), null;
	try {
		let e = n_(n);
		return e ? JSON.parse(e) : (O_("Failed to decode base64 JWT payload"), null);
	} catch (e) {
		return O_("Caught error parsing JWT payload as JSON", e?.toString()), null;
	}
}
function rv(e) {
	let t = nv(e);
	return Q(t, "internal-error"), Q(t.exp !== void 0, "internal-error"), Q(t.iat !== void 0, "internal-error"), Number(t.exp) - Number(t.iat);
}
async function iv(e, t, n = !1) {
	if (n) return t;
	try {
		return await t;
	} catch (t) {
		throw t instanceof u_ && av(t) && e.auth.currentUser === e && await e.auth.signOut(), t;
	}
}
function av({ code: e }) {
	return e === "auth/user-disabled" || e === "auth/user-token-expired";
}
async function ov(e) {
	let t = e.auth, n = await iv(e, Q_(t, { idToken: await e.getIdToken() }));
	Q(n?.users.length, t, "internal-error");
	let r = n.users[0];
	e._notifyReloadListener(r);
	let i = r.providerUserInfo?.length ? lv(r.providerUserInfo) : [], a = cv(e.providerData, i), o = e.isAnonymous, s = !(e.email && r.passwordHash) && !a?.length, c = o ? s : !1, l = {
		uid: r.localId,
		displayName: r.displayName || null,
		photoURL: r.photoUrl || null,
		email: r.email || null,
		emailVerified: r.emailVerified || !1,
		phoneNumber: r.phoneNumber || null,
		tenantId: r.tenantId || null,
		providerData: a,
		metadata: new hb(r.createdAt, r.lastLoginAt),
		isAnonymous: c
	};
	Object.assign(e, l);
}
async function sv(e) {
	let t = Zg(e);
	await ov(t), await t.auth._persistUserIfCurrent(t), t.auth._notifyListenersIfCurrent(t);
}
function cv(e, t) {
	return [...e.filter((e) => !t.some((t) => t.providerId === e.providerId)), ...t];
}
function lv(e) {
	return e.map((e) => {
		var { providerId: t } = e, n = S_(e, ["providerId"]);
		return {
			providerId: t,
			uid: n.rawId || "",
			displayName: n.displayName || null,
			email: n.email || null,
			phoneNumber: n.phoneNumber || null,
			photoURL: n.photoUrl || null
		};
	});
}
async function uv(e, t) {
	let n = await W_(e, {}, async () => {
		let n = Gg({
			grant_type: "refresh_token",
			refresh_token: t
		}).slice(1), { tokenApiHost: r, apiKey: i } = e.config, a = K_(e, r, "/v1/token", `key=${i}`), o = await e._getAdditionalHeaders();
		return o["Content-Type"] = "application/x-www-form-urlencoded", lb.fetch()(a, {
			method: "POST",
			headers: o,
			body: n
		});
	});
	return {
		accessToken: n.access_token,
		expiresIn: n.expires_in,
		refreshToken: n.refresh_token
	};
}
async function dv(e, t) {
	return U_(e, "POST", "/v2/accounts:revokeToken", H_(e, t));
}
function fv(e, t) {
	Q(typeof e == "string" || e === void 0, "internal-error", { appName: t });
}
function pv(e) {
	F_(e instanceof Function, "Expected a class definition");
	let t = vb.get(e);
	return t ? (F_(t instanceof e, "Instance stored in cache mismatched with class"), t) : (t = new e(), vb.set(e, t), t);
}
function mv(e, t, n) {
	return `firebase:${e}:${t}:${n}`;
}
function hv(e) {
	let t = e.toLowerCase();
	if (t.includes("opera/") || t.includes("opr/") || t.includes("opios/")) return "Opera";
	if (yv(t)) return "IEMobile";
	if (t.includes("msie") || t.includes("trident/")) return "IE";
	if (t.includes("edge/")) return "Edge";
	if (gv(t)) return "Firefox";
	if (t.includes("silk/")) return "Silk";
	if (xv(t)) return "Blackberry";
	if (Sv(t)) return "Webos";
	if (_v(t)) return "Safari";
	if ((t.includes("chrome/") || vv(t)) && !t.includes("edge/")) return "Chrome";
	if (bv(t)) return "Android";
	{
		let t = e.match(/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/);
		if (t?.length === 2) return t[1];
	}
	return "Other";
}
function gv(e = Fg()) {
	return /firefox\//i.test(e);
}
function _v(e = Fg()) {
	let t = e.toLowerCase();
	return t.includes("safari/") && !t.includes("chrome/") && !t.includes("crios/") && !t.includes("android");
}
function vv(e = Fg()) {
	return /crios\//i.test(e);
}
function yv(e = Fg()) {
	return /iemobile/i.test(e);
}
function bv(e = Fg()) {
	return /android/i.test(e);
}
function xv(e = Fg()) {
	return /blackberry/i.test(e);
}
function Sv(e = Fg()) {
	return /webos/i.test(e);
}
function Cv(e = Fg()) {
	return /iphone|ipad|ipod/i.test(e) || /macintosh/i.test(e) && /mobile/i.test(e);
}
function wv(e = Fg()) {
	return Cv(e) && !!window.navigator?.standalone;
}
function Tv() {
	return Bg() && document.documentMode === 10;
}
function Ev(e = Fg()) {
	return Cv(e) || bv(e) || Sv(e) || xv(e) || /windows phone/i.test(e) || yv(e);
}
function Dv(e, t = []) {
	let n;
	switch (e) {
		case "Browser":
			n = hv(Fg());
			break;
		case "Worker":
			n = `${hv(Fg())}-${e}`;
			break;
		default: n = e;
	}
	let r = t.length ? t.join(",") : "FirebaseCore-web";
	return `${n}/JsCore/${Yt}/${r}`;
}
async function Ov(e, t = {}) {
	return U_(e, "GET", "/v2/passwordPolicy", H_(e, t));
}
function kv(e) {
	return Zg(e);
}
function Av(e) {
	Db = e;
}
function jv(e) {
	return Db.loadJS(e);
}
function Mv() {
	return Db.recaptchaEnterpriseScript;
}
function Nv() {
	return Db.gapiScript;
}
function Pv(e) {
	return `__${e}${Math.floor(Math.random() * 1e6)}`;
}
async function Fv(e, t, n, r = !1) {
	let i = new Ab(e), a;
	try {
		a = await i.verify(n);
	} catch {
		a = await i.verify(n, !0);
	}
	let o = Object.assign({}, t);
	return r ? Object.assign(o, { captchaResp: a }) : Object.assign(o, { captchaResponse: a }), Object.assign(o, { clientType: "CLIENT_TYPE_WEB" }), Object.assign(o, { recaptchaVersion: "RECAPTCHA_ENTERPRISE" }), o;
}
async function Iv(e, t, n, r) {
	return e._getRecaptchaConfig()?.isProviderEnabled("EMAIL_PASSWORD_PROVIDER") ? r(e, await Fv(e, t, n, n === "getOobCode")) : r(e, t).catch(async (i) => i.code === "auth/missing-recaptcha-token" ? (console.log(`${n} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`), r(e, await Fv(e, t, n, n === "getOobCode"))) : Promise.reject(i));
}
function Lv(e, t) {
	let n = Qe(e, "auth");
	if (n.isInitialized()) {
		let e = n.getImmediate();
		if (Ug(n.getOptions(), t ?? {})) return e;
		k_(e, "already-initialized");
	}
	return n.initialize({ options: t });
}
function Rv(e, t) {
	let n = t?.persistence || [], r = (Array.isArray(n) ? n : [n]).map(pv);
	t?.errorMap && e._updateErrorMap(t.errorMap), e._initializeWithPersistence(r, t?.popupRedirectResolver);
}
function zv(e, t, n) {
	let r = kv(e);
	Q(r._canInitEmulator, r, "emulator-config-failed"), Q(/^https?:\/\//.test(t), r, "invalid-emulator-scheme");
	let i = !!n?.disableWarnings, a = Bv(t), { host: o, port: s } = Vv(t), c = s === null ? "" : `:${s}`;
	r.config.emulator = { url: `${a}//${o}${c}/` }, r.settings.appVerificationDisabledForTesting = !0, r.emulatorConfig = Object.freeze({
		host: o,
		port: s,
		protocol: a.replace(":", ""),
		options: Object.freeze({ disableWarnings: i })
	}), i || Uv();
}
function Bv(e) {
	let t = e.indexOf(":");
	return t < 0 ? "" : e.substr(0, t + 1);
}
function Vv(e) {
	let t = Bv(e), n = /(\/\/)?([^?#/]+)/.exec(e.substr(t.length));
	if (!n) return {
		host: "",
		port: null
	};
	let r = n[2].split("@").pop() || "", i = /^(\[[^\]]+\])(:|$)/.exec(r);
	if (i) {
		let e = i[1];
		return {
			host: e,
			port: Hv(r.substr(e.length + 1))
		};
	} else {
		let [e, t] = r.split(":");
		return {
			host: e,
			port: Hv(t)
		};
	}
}
function Hv(e) {
	if (!e) return null;
	let t = Number(e);
	return isNaN(t) ? null : t;
}
function Uv() {
	function e() {
		let e = document.createElement("p"), t = e.style;
		e.innerText = "Running in emulator mode. Do not use with production credentials.", t.position = "fixed", t.width = "100%", t.backgroundColor = "#ffffff", t.border = ".1em solid #000000", t.color = "#b50000", t.bottom = "0px", t.left = "0px", t.margin = "0px", t.zIndex = "10000", t.textAlign = "center", e.classList.add("firebase-emulator-warning"), document.body.appendChild(e);
	}
	typeof console < "u" && typeof console.info == "function" && console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."), typeof window < "u" && typeof document < "u" && (document.readyState === "loading" ? window.addEventListener("DOMContentLoaded", e) : e());
}
async function Wv(e, t) {
	return U_(e, "POST", "/v1/accounts:signUp", t);
}
async function Gv(e, t) {
	return G_(e, "POST", "/v1/accounts:signInWithPassword", H_(e, t));
}
async function Kv(e, t) {
	return G_(e, "POST", "/v1/accounts:signInWithEmailLink", H_(e, t));
}
async function qv(e, t) {
	return G_(e, "POST", "/v1/accounts:signInWithEmailLink", H_(e, t));
}
async function Jv(e, t) {
	return G_(e, "POST", "/v1/accounts:signInWithIdp", H_(e, t));
}
async function Yv(e, t) {
	return U_(e, "POST", "/v1/accounts:sendVerificationCode", H_(e, t));
}
async function Xv(e, t) {
	return G_(e, "POST", "/v1/accounts:signInWithPhoneNumber", H_(e, t));
}
async function Zv(e, t) {
	let n = await G_(e, "POST", "/v1/accounts:signInWithPhoneNumber", H_(e, t));
	if (n.temporaryProof) throw J_(e, "account-exists-with-different-credential", n);
	return n;
}
async function Qv(e, t) {
	return G_(e, "POST", "/v1/accounts:signInWithPhoneNumber", H_(e, Object.assign(Object.assign({}, t), { operation: "REAUTH" })), Fb);
}
function $v(e) {
	switch (e) {
		case "recoverEmail": return "RECOVER_EMAIL";
		case "resetPassword": return "PASSWORD_RESET";
		case "signIn": return "EMAIL_SIGNIN";
		case "verifyEmail": return "VERIFY_EMAIL";
		case "verifyAndChangeEmail": return "VERIFY_AND_CHANGE_EMAIL";
		case "revertSecondFactorAddition": return "REVERT_SECOND_FACTOR_ADDITION";
		default: return null;
	}
}
function ey(e) {
	let t = Kg(qg(e)).link, n = t ? Kg(qg(t)).deep_link_id : null, r = Kg(qg(e)).deep_link_id;
	return (r ? Kg(qg(r)).link : null) || r || n || t || e;
}
function ty(e) {
	return e.providerId ? e.providerId : "phoneNumber" in e ? "phone" : null;
}
function ny(e, t, n, r) {
	return (t === "reauthenticate" ? n._getReauthenticationResolver(e) : n._getIdTokenResponse(e)).catch((n) => {
		throw n.code === "auth/multi-factor-auth-required" ? Kb._fromErrorAndOperation(e, n, t, r) : n;
	});
}
async function ry(e, t, n = !1) {
	let r = await iv(e, t._linkToIdToken(e.auth, await e.getIdToken()), n);
	return Gb._forOperation(e, "link", r);
}
async function iy(e, t, n = !1) {
	let { auth: r } = e;
	if (et(r.app)) return Promise.reject(M_(r));
	let i = "reauthenticate";
	try {
		let a = await iv(e, ny(r, i, t, e), n);
		Q(a.idToken, r, "internal-error");
		let o = nv(a.idToken);
		Q(o, r, "internal-error");
		let { sub: s } = o;
		return Q(e.uid === s, r, "user-mismatch"), Gb._forOperation(e, i, a);
	} catch (e) {
		throw e?.code === "auth/user-not-found" && k_(r, "user-mismatch"), e;
	}
}
async function ay(e, t, n = !1) {
	if (et(e.app)) return Promise.reject(M_(e));
	let r = "signIn", i = await ny(e, r, t), a = await Gb._fromIdTokenResponse(e, r, i);
	return n || await e._updateCurrentUser(a.user), a;
}
function oy(e, t, n, r) {
	return Zg(e).onIdTokenChanged(t, n, r);
}
function sy(e, t, n) {
	return Zg(e).beforeAuthStateChanged(t, n);
}
function cy(e, t) {
	return U_(e, "POST", "/v2/accounts/mfaEnrollment:start", H_(e, t));
}
function ly(e, t) {
	return U_(e, "POST", "/v2/accounts/mfaEnrollment:finalize", H_(e, t));
}
function uy(e, t) {
	return U_(e, "POST", "/v2/accounts/mfaEnrollment:start", H_(e, t));
}
function dy(e, t) {
	return U_(e, "POST", "/v2/accounts/mfaEnrollment:finalize", H_(e, t));
}
function fy(e) {
	return Promise.all(e.map(async (e) => {
		try {
			return {
				fulfilled: !0,
				value: await e
			};
		} catch (e) {
			return {
				fulfilled: !1,
				reason: e
			};
		}
	}));
}
function py(e = "", t = 10) {
	let n = "";
	for (let e = 0; e < t; e++) n += Math.floor(Math.random() * 10);
	return e + n;
}
function my() {
	return window;
}
function hy(e) {
	my().location.href = e;
}
function gy() {
	return my().WorkerGlobalScope !== void 0 && typeof my().importScripts == "function";
}
async function _y() {
	if (!(navigator != null && navigator.serviceWorker)) return null;
	try {
		return (await navigator.serviceWorker.ready).active;
	} catch {
		return null;
	}
}
function vy() {
	return (navigator == null ? void 0 : navigator.serviceWorker)?.controller || null;
}
function yy() {
	return gy() ? self : null;
}
function by(e, t) {
	return e.transaction([ax], t ? "readwrite" : "readonly").objectStore(ax);
}
function xy() {
	let e = indexedDB.deleteDatabase(rx);
	return new sx(e).toPromise();
}
function Sy() {
	let e = indexedDB.open(rx, ix);
	return new Promise((t, n) => {
		e.addEventListener("error", () => {
			n(e.error);
		}), e.addEventListener("upgradeneeded", () => {
			let t = e.result;
			try {
				t.createObjectStore(ax, { keyPath: ox });
			} catch (e) {
				n(e);
			}
		}), e.addEventListener("success", async () => {
			let n = e.result;
			n.objectStoreNames.contains(ax) ? t(n) : (n.close(), await xy(), t(await Sy()));
		});
	});
}
async function Cy(e, t, n) {
	let r = by(e, !0).put({
		[ox]: t,
		value: n
	});
	return new sx(r).toPromise();
}
async function wy(e, t) {
	let n = by(e, !1).get(t), r = await new sx(n).toPromise();
	return r === void 0 ? null : r.value;
}
function Ty(e, t) {
	let n = by(e, !0).delete(t);
	return new sx(n).toPromise();
}
function Ey(e, t) {
	return U_(e, "POST", "/v2/accounts/mfaSignIn:start", H_(e, t));
}
function Dy(e, t) {
	return U_(e, "POST", "/v2/accounts/mfaSignIn:finalize", H_(e, t));
}
function Oy(e, t) {
	return U_(e, "POST", "/v2/accounts/mfaSignIn:finalize", H_(e, t));
}
async function ky(e, t, n) {
	let r = await n.verify();
	try {
		Q(typeof r == "string", e, "argument-error"), Q(n.type === fx, e, "argument-error");
		let i;
		if (i = typeof t == "string" ? { phoneNumber: t } : t, "session" in i) {
			let t = i.session;
			if ("phoneNumber" in i) return Q(t.type === "enroll", e, "internal-error"), (await cy(e, {
				idToken: t.credential,
				phoneEnrollmentInfo: {
					phoneNumber: i.phoneNumber,
					recaptchaToken: r
				}
			})).phoneSessionInfo.sessionInfo;
			{
				Q(t.type === "signin", e, "internal-error");
				let n = i.multiFactorHint?.uid || i.multiFactorUid;
				return Q(n, e, "missing-multi-factor-info"), (await Ey(e, {
					mfaPendingCredential: t.credential,
					mfaEnrollmentId: n,
					phoneSignInInfo: { recaptchaToken: r }
				})).phoneResponseInfo.sessionInfo;
			}
		} else {
			let { sessionInfo: t } = await Yv(e, {
				phoneNumber: i.phoneNumber,
				recaptchaToken: r
			});
			return t;
		}
	} finally {
		n._reset();
	}
}
function Ay(e, t) {
	return t ? pv(t) : (Q(e._popupRedirectResolver, e, "argument-error"), e._popupRedirectResolver);
}
function jy(e) {
	return ay(e.auth, new mx(e), e.bypassAuthState);
}
function My(e) {
	let { auth: t, user: n } = e;
	return Q(n, t, "internal-error"), iy(n, new mx(e), e.bypassAuthState);
}
async function Ny(e) {
	let { auth: t, user: n } = e;
	return Q(n, t, "internal-error"), ry(n, new mx(e), e.bypassAuthState);
}
async function Py(e, t) {
	let n = Ly(t), r = Iy(e);
	if (!await r._isAvailable()) return !1;
	let i = await r._get(n) === "true";
	return await r._remove(n), i;
}
function Fy(e, t) {
	yx.set(e._key(), t);
}
function Iy(e) {
	return pv(e._redirectPersistence);
}
function Ly(e) {
	return mv(vx, e.config.apiKey, e.name);
}
async function Ry(e, t, n = !1) {
	if (et(e.app)) return Promise.reject(M_(e));
	let r = kv(e), i = Ay(r, t), a = await new bx(r, i, n).execute();
	return a && !n && (delete a.user._redirectEventId, await r._persistUserIfCurrent(a.user), await r._setRedirectUser(null, t)), a;
}
function zy(e) {
	return [
		e.type,
		e.eventId,
		e.sessionId,
		e.tenantId
	].filter((e) => e).join("-");
}
function By({ type: e, error: t }) {
	return e === "unknown" && t?.code === "auth/no-auth-event";
}
function Vy(e) {
	switch (e.type) {
		case "signInViaRedirect":
		case "linkViaRedirect":
		case "reauthViaRedirect": return !0;
		case "unknown": return By(e);
		default: return !1;
	}
}
async function Hy(e, t = {}) {
	return U_(e, "GET", "/v1/projects", t);
}
async function Uy(e) {
	if (e.config.emulator) return;
	let { authorizedDomains: t } = await Hy(e);
	for (let e of t) try {
		if (Wy(e)) return;
	} catch {}
	k_(e, "unauthorized-domain");
}
function Wy(e) {
	let t = I_(), { protocol: n, hostname: r } = new URL(t);
	if (e.startsWith("chrome-extension://")) {
		let i = new URL(e);
		return i.hostname === "" && r === "" ? n === "chrome-extension:" && e.replace("chrome-extension://", "") === t.replace("chrome-extension://", "") : n === "chrome-extension:" && i.hostname === r;
	}
	if (!wx.test(n)) return !1;
	if (Cx.test(e)) return r === e;
	let i = e.replace(/\./g, "\\.");
	return RegExp("^(.+\\." + i + "|" + i + ")$", "i").test(r);
}
function Gy() {
	let e = my().___jsl;
	if (e?.H) {
		for (let t of Object.keys(e.H)) if (e.H[t].r = e.H[t].r || [], e.H[t].L = e.H[t].L || [], e.H[t].r = [...e.H[t].L], e.CP) for (let t = 0; t < e.CP.length; t++) e.CP[t] = null;
	}
}
function Ky(e) {
	return new Promise((t, n) => {
		function r() {
			Gy(), gapi.load("gapi.iframes", {
				callback: () => {
					t(gapi.iframes.getContext());
				},
				ontimeout: () => {
					Gy(), n(A_(e, "network-request-failed"));
				},
				timeout: Tx.get()
			});
		}
		if (my().gapi?.iframes?.Iframe) t(gapi.iframes.getContext());
		else if (my().gapi?.load) r();
		else {
			let t = Pv("iframefcb");
			return my()[t] = () => {
				gapi.load ? r() : n(A_(e, "network-request-failed"));
			}, jv(`${Nv()}?onload=${t}`).catch((e) => n(e));
		}
	}).catch((e) => {
		throw Ex = null, e;
	});
}
function qy(e) {
	return Ex ||= Ky(e), Ex;
}
function Jy(e) {
	let t = e.config;
	Q(t.authDomain, e, "auth-domain-config-required");
	let n = t.emulator ? V_(t, kx) : `https://${e.config.authDomain}/${Ox}`, r = {
		apiKey: t.apiKey,
		appName: e.name,
		v: Yt
	}, i = jx.get(e.config.apiHost);
	i && (r.eid = i);
	let a = e._getFrameworks();
	return a.length && (r.fw = a.join(",")), `${n}?${Gg(r).slice(1)}`;
}
async function Yy(e) {
	let t = await qy(e), n = my().gapi;
	return Q(n, e, "internal-error"), t.open({
		where: document.body,
		url: Jy(e),
		messageHandlersFilter: n.iframes.CROSS_ORIGIN_IFRAMES_FILTER,
		attributes: Ax,
		dontclear: !0
	}, (t) => new Promise(async (n, r) => {
		await t.restyle({ setHideOnLeave: !1 });
		let i = A_(e, "network-request-failed"), a = my().setTimeout(() => {
			r(i);
		}, Dx.get());
		function o() {
			my().clearTimeout(a), n(t);
		}
		t.ping(o).then(o, () => {
			r(i);
		});
	}));
}
function Xy(e, t, n, r = Nx, i = Px) {
	let a = Math.max((window.screen.availHeight - i) / 2, 0).toString(), o = Math.max((window.screen.availWidth - r) / 2, 0).toString(), s = "", c = Object.assign(Object.assign({}, Mx), {
		width: r.toString(),
		height: i.toString(),
		top: a,
		left: o
	}), l = Fg().toLowerCase();
	n && (s = vv(l) ? Fx : n), gv(l) && (t ||= Ix, c.scrollbars = "yes");
	let u = Object.entries(c).reduce((e, [t, n]) => `${e}${t}=${n},`, "");
	if (wv(l) && s !== "_self") return Zy(t || "", s), new Lx(null);
	let d = window.open(t || "", s, u);
	Q(d, e, "popup-blocked");
	try {
		d.focus();
	} catch {}
	return new Lx(d);
}
function Zy(e, t) {
	let n = document.createElement("a");
	n.href = e, n.target = t;
	let r = document.createEvent("MouseEvent");
	r.initMouseEvent("click", !0, !0, window, 1, 0, 0, 0, 0, !1, !1, !1, !1, 1, null), n.dispatchEvent(r);
}
async function Qy(e, t, n, r, i, a) {
	Q(e.config.authDomain, e, "auth-domain-config-required"), Q(e.config.apiKey, e, "invalid-api-key");
	let o = {
		apiKey: e.config.apiKey,
		appName: e.name,
		authType: n,
		redirectUrl: r,
		v: Yt,
		eventId: i
	};
	if (t instanceof zb) {
		t.setDefaultLanguage(e.languageCode), o.providerId = t.providerId || "", Hg(t.getCustomParameters()) || (o.customParameters = JSON.stringify(t.getCustomParameters()));
		for (let [e, t] of Object.entries(a || {})) o[e] = t;
	}
	if (t instanceof Bb) {
		let e = t.getScopes().filter((e) => e !== "");
		e.length > 0 && (o.scopes = e.join(","));
	}
	e.tenantId && (o.tid = e.tenantId);
	let s = o;
	for (let e of Object.keys(s)) s[e] === void 0 && delete s[e];
	let c = await e._getAppCheckToken(), l = c ? `#${Bx}=${encodeURIComponent(c)}` : "";
	return `${$y(e)}?${Gg(s).slice(1)}${l}`;
}
function $y({ config: e }) {
	return e.emulator ? V_(e, zx) : `https://${e.authDomain}/${Rx}`;
}
function eb(e) {
	return e === void 0 || e?.length === 0;
}
function tb(e) {
	switch (e) {
		case "Node": return "node";
		case "ReactNative": return "rn";
		case "Worker": return "webworker";
		case "Cordova": return "cordova";
		case "WebExtension": return "web-extension";
		default: return;
	}
}
function nb(e) {
	Ze(new w_("auth", (t, { options: n }) => {
		let r = t.getProvider("app").getImmediate(), i = t.getProvider("heartbeat"), a = t.getProvider("app-check-internal"), { apiKey: o, authDomain: s } = r.options;
		Q(o && !o.includes(":"), "invalid-api-key", { appName: r.name });
		let c = {
			apiKey: o,
			authDomain: s,
			clientPlatform: e,
			apiHost: "identitytoolkit.googleapis.com",
			tokenApiHost: "securetoken.googleapis.com",
			apiScheme: "https",
			sdkClientVersion: Dv(e)
		}, l = new Tb(r, i, a, c);
		return Rv(l, n), l;
	}, "PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e, t, n) => {
		e.getProvider("auth-internal").initialize();
	})), Ze(new w_("auth-internal", (e) => ((e) => new Qx(e))(kv(e.getProvider("auth").getImmediate())), "PRIVATE").setInstantiationMode("EXPLICIT")), rt(Xx, Zx, tb(e)), rt(Xx, Zx, "esm2017");
}
function rb(e = nt()) {
	let t = Qe(e, "auth");
	if (t.isInitialized()) return t.getImmediate();
	let n = Lv(e, {
		popupRedirectResolver: Ux,
		persistence: [
			dx,
			Qb,
			ex
		]
	}), r = c_("authTokenSyncURL");
	if (r && typeof isSecureContext == "boolean" && isSecureContext) {
		let e = new URL(r, location.origin);
		if (location.origin === e.origin) {
			let t = tS(e.toString());
			sy(n, t, () => t(n.currentUser)), oy(n, (e) => t(e));
		}
	}
	let i = s_("auth");
	return i && zv(n, `http://${i}`), n;
}
function ib() {
	return document.getElementsByTagName("head")?.[0] ?? document;
}
var ab, ob, sb, cb, lb, ub, db, fb, pb, mb, hb, gb, _b, vb, yb, bb, xb, Sb, Cb, wb, Tb, Eb, Db, Ob, kb, Ab, jb, Mb, Nb, Pb, Fb, Ib, Lb, Rb, zb, Bb, Vb, Hb, Ub, Wb, Gb, Kb, qb, Jb, Yb, Xb, Zb, Qb, $b, ex, tx, nx, rx, ix, ax, ox, sx, cx, lx, ux, dx, fx, px, mx, hx, gx, _x, vx, yx, bx, xx, Sx, Cx, wx, Tx, Ex, Dx, Ox, kx, Ax, jx, Mx, Nx, Px, Fx, Ix, Lx, Rx, zx, Bx, Vx, Hx, Ux, Wx, Gx, Kx, qx, Jx, Yx, Xx, Zx, Qx, $x, eS, tS, nS = t((() => {
	an(), m_(), x_(), C_(), T_(), ab = E_, ob = new d_("auth", "Firebase", E_()), sb = new b_("@firebase/auth"), cb = class {
		constructor(e, t) {
			this.shortDelay = e, this.longDelay = t, F_(t > e, "Short delay should be less than long delay!"), this.isMobile = Ig() || zg();
		}
		get() {
			return z_() ? this.isMobile ? this.longDelay : this.shortDelay : Math.min(5e3, this.shortDelay);
		}
	}, lb = class {
		static initialize(e, t, n) {
			this.fetchImpl = e, t && (this.headersImpl = t), n && (this.responseImpl = n);
		}
		static fetch() {
			if (this.fetchImpl) return this.fetchImpl;
			if (typeof self < "u" && "fetch" in self) return self.fetch;
			if (typeof globalThis < "u" && globalThis.fetch) return globalThis.fetch;
			if (typeof fetch < "u") return fetch;
			P_("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill");
		}
		static headers() {
			if (this.headersImpl) return this.headersImpl;
			if (typeof self < "u" && "Headers" in self) return self.Headers;
			if (typeof globalThis < "u" && globalThis.Headers) return globalThis.Headers;
			if (typeof Headers < "u") return Headers;
			P_("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill");
		}
		static response() {
			if (this.responseImpl) return this.responseImpl;
			if (typeof self < "u" && "Response" in self) return self.Response;
			if (typeof globalThis < "u" && globalThis.Response) return globalThis.Response;
			if (typeof Response < "u") return Response;
			P_("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill");
		}
	}, ub = {
		CREDENTIAL_MISMATCH: "custom-token-mismatch",
		MISSING_CUSTOM_TOKEN: "internal-error",
		INVALID_IDENTIFIER: "invalid-email",
		MISSING_CONTINUE_URI: "internal-error",
		INVALID_PASSWORD: "wrong-password",
		MISSING_PASSWORD: "missing-password",
		INVALID_LOGIN_CREDENTIALS: "invalid-credential",
		EMAIL_EXISTS: "email-already-in-use",
		PASSWORD_LOGIN_DISABLED: "operation-not-allowed",
		INVALID_IDP_RESPONSE: "invalid-credential",
		INVALID_PENDING_TOKEN: "invalid-credential",
		FEDERATED_USER_ID_ALREADY_LINKED: "credential-already-in-use",
		MISSING_REQ_TYPE: "internal-error",
		EMAIL_NOT_FOUND: "user-not-found",
		RESET_PASSWORD_EXCEED_LIMIT: "too-many-requests",
		EXPIRED_OOB_CODE: "expired-action-code",
		INVALID_OOB_CODE: "invalid-action-code",
		MISSING_OOB_CODE: "internal-error",
		CREDENTIAL_TOO_OLD_LOGIN_AGAIN: "requires-recent-login",
		INVALID_ID_TOKEN: "invalid-user-token",
		TOKEN_EXPIRED: "user-token-expired",
		USER_NOT_FOUND: "user-token-expired",
		TOO_MANY_ATTEMPTS_TRY_LATER: "too-many-requests",
		PASSWORD_DOES_NOT_MEET_REQUIREMENTS: "password-does-not-meet-requirements",
		INVALID_CODE: "invalid-verification-code",
		INVALID_SESSION_INFO: "invalid-verification-id",
		INVALID_TEMPORARY_PROOF: "invalid-credential",
		MISSING_SESSION_INFO: "missing-verification-id",
		SESSION_EXPIRED: "code-expired",
		MISSING_ANDROID_PACKAGE_NAME: "missing-android-pkg-name",
		UNAUTHORIZED_DOMAIN: "unauthorized-continue-uri",
		INVALID_OAUTH_CLIENT_ID: "invalid-oauth-client-id",
		ADMIN_ONLY_OPERATION: "admin-restricted-operation",
		INVALID_MFA_PENDING_CREDENTIAL: "invalid-multi-factor-session",
		MFA_ENROLLMENT_NOT_FOUND: "multi-factor-info-not-found",
		MISSING_MFA_ENROLLMENT_ID: "missing-multi-factor-info",
		MISSING_MFA_PENDING_CREDENTIAL: "missing-multi-factor-session",
		SECOND_FACTOR_EXISTS: "second-factor-already-in-use",
		SECOND_FACTOR_LIMIT_EXCEEDED: "maximum-second-factor-count-exceeded",
		BLOCKING_FUNCTION_ERROR_RESPONSE: "internal-error",
		RECAPTCHA_NOT_ENABLED: "recaptcha-not-enabled",
		MISSING_RECAPTCHA_TOKEN: "missing-recaptcha-token",
		INVALID_RECAPTCHA_TOKEN: "invalid-recaptcha-token",
		INVALID_RECAPTCHA_ACTION: "invalid-recaptcha-action",
		MISSING_CLIENT_TYPE: "missing-client-type",
		MISSING_RECAPTCHA_VERSION: "missing-recaptcha-version",
		INVALID_RECAPTCHA_VERSION: "invalid-recaptcha-version",
		INVALID_REQ_TYPE: "invalid-req-type"
	}, db = new cb(3e4, 6e4), fb = class {
		constructor(e) {
			this.auth = e, this.timer = null, this.promise = new Promise((e, t) => {
				this.timer = setTimeout(() => t(A_(this.auth, "network-request-failed")), db.get());
			});
		}
		clearNetworkTimeout() {
			clearTimeout(this.timer);
		}
	}, pb = class {
		constructor(e) {
			if (this.siteKey = "", this.recaptchaEnforcementState = [], e.recaptchaKey === void 0) throw Error("recaptchaKey undefined");
			this.siteKey = e.recaptchaKey.split("/")[3], this.recaptchaEnforcementState = e.recaptchaEnforcementState;
		}
		getProviderEnforcementState(e) {
			if (!this.recaptchaEnforcementState || this.recaptchaEnforcementState.length === 0) return null;
			for (let t of this.recaptchaEnforcementState) if (t.provider && t.provider === e) return q_(t.enforcementState);
			return null;
		}
		isProviderEnabled(e) {
			return this.getProviderEnforcementState(e) === "ENFORCE" || this.getProviderEnforcementState(e) === "AUDIT";
		}
	}, mb = class {
		constructor(e) {
			this.user = e, this.isRunning = !1, this.timerId = null, this.errorBackoff = 3e4;
		}
		_start() {
			this.isRunning || (this.isRunning = !0, this.schedule());
		}
		_stop() {
			this.isRunning && (this.isRunning = !1, this.timerId !== null && clearTimeout(this.timerId));
		}
		getInterval(e) {
			if (e) {
				let e = this.errorBackoff;
				return this.errorBackoff = Math.min(this.errorBackoff * 2, 96e4), e;
			} else {
				this.errorBackoff = 3e4;
				let e = (this.user.stsTokenManager.expirationTime ?? 0) - Date.now() - 3e5;
				return Math.max(0, e);
			}
		}
		schedule(e = !1) {
			if (!this.isRunning) return;
			let t = this.getInterval(e);
			this.timerId = setTimeout(async () => {
				await this.iteration();
			}, t);
		}
		async iteration() {
			try {
				await this.user.getIdToken(!0);
			} catch (e) {
				e?.code === "auth/network-request-failed" && this.schedule(!0);
				return;
			}
			this.schedule();
		}
	}, hb = class {
		constructor(e, t) {
			this.createdAt = e, this.lastLoginAt = t, this._initializeTime();
		}
		_initializeTime() {
			this.lastSignInTime = $_(this.lastLoginAt), this.creationTime = $_(this.createdAt);
		}
		_copy(e) {
			this.createdAt = e.createdAt, this.lastLoginAt = e.lastLoginAt, this._initializeTime();
		}
		toJSON() {
			return {
				createdAt: this.createdAt,
				lastLoginAt: this.lastLoginAt
			};
		}
	}, gb = class e {
		constructor() {
			this.refreshToken = null, this.accessToken = null, this.expirationTime = null;
		}
		get isExpired() {
			return !this.expirationTime || Date.now() > this.expirationTime - 3e4;
		}
		updateFromServerResponse(e) {
			Q(e.idToken, "internal-error"), Q(e.idToken !== void 0, "internal-error"), Q(e.refreshToken !== void 0, "internal-error");
			let t = "expiresIn" in e && e.expiresIn !== void 0 ? Number(e.expiresIn) : rv(e.idToken);
			this.updateTokensAndExpiration(e.idToken, e.refreshToken, t);
		}
		updateFromIdToken(e) {
			Q(e.length !== 0, "internal-error");
			let t = rv(e);
			this.updateTokensAndExpiration(e, null, t);
		}
		async getToken(e, t = !1) {
			return !t && this.accessToken && !this.isExpired ? this.accessToken : (Q(this.refreshToken, e, "user-token-expired"), this.refreshToken ? (await this.refresh(e, this.refreshToken), this.accessToken) : null);
		}
		clearRefreshToken() {
			this.refreshToken = null;
		}
		async refresh(e, t) {
			let { accessToken: n, refreshToken: r, expiresIn: i } = await uv(e, t);
			this.updateTokensAndExpiration(n, r, Number(i));
		}
		updateTokensAndExpiration(e, t, n) {
			this.refreshToken = t || null, this.accessToken = e || null, this.expirationTime = Date.now() + n * 1e3;
		}
		static fromJSON(t, n) {
			let { refreshToken: r, accessToken: i, expirationTime: a } = n, o = new e();
			return r && (Q(typeof r == "string", "internal-error", { appName: t }), o.refreshToken = r), i && (Q(typeof i == "string", "internal-error", { appName: t }), o.accessToken = i), a && (Q(typeof a == "number", "internal-error", { appName: t }), o.expirationTime = a), o;
		}
		toJSON() {
			return {
				refreshToken: this.refreshToken,
				accessToken: this.accessToken,
				expirationTime: this.expirationTime
			};
		}
		_assign(e) {
			this.accessToken = e.accessToken, this.refreshToken = e.refreshToken, this.expirationTime = e.expirationTime;
		}
		_clone() {
			return Object.assign(new e(), this.toJSON());
		}
		_performRefresh() {
			return P_("not implemented");
		}
	}, _b = class e {
		constructor(e) {
			var { uid: t, auth: n, stsTokenManager: r } = e, i = S_(e, [
				"uid",
				"auth",
				"stsTokenManager"
			]);
			this.providerId = "firebase", this.proactiveRefresh = new mb(this), this.reloadUserInfo = null, this.reloadListener = null, this.uid = t, this.auth = n, this.stsTokenManager = r, this.accessToken = r.accessToken, this.displayName = i.displayName || null, this.email = i.email || null, this.emailVerified = i.emailVerified || !1, this.phoneNumber = i.phoneNumber || null, this.photoURL = i.photoURL || null, this.isAnonymous = i.isAnonymous || !1, this.tenantId = i.tenantId || null, this.providerData = i.providerData ? [...i.providerData] : [], this.metadata = new hb(i.createdAt || void 0, i.lastLoginAt || void 0);
		}
		async getIdToken(e) {
			let t = await iv(this, this.stsTokenManager.getToken(this.auth, e));
			return Q(t, this.auth, "internal-error"), this.accessToken !== t && (this.accessToken = t, await this.auth._persistUserIfCurrent(this), this.auth._notifyListenersIfCurrent(this)), t;
		}
		getIdTokenResult(e) {
			return ev(this, e);
		}
		reload() {
			return sv(this);
		}
		_assign(e) {
			this !== e && (Q(this.uid === e.uid, this.auth, "internal-error"), this.displayName = e.displayName, this.photoURL = e.photoURL, this.email = e.email, this.emailVerified = e.emailVerified, this.phoneNumber = e.phoneNumber, this.isAnonymous = e.isAnonymous, this.tenantId = e.tenantId, this.providerData = e.providerData.map((e) => Object.assign({}, e)), this.metadata._copy(e.metadata), this.stsTokenManager._assign(e.stsTokenManager));
		}
		_clone(t) {
			let n = new e(Object.assign(Object.assign({}, this), {
				auth: t,
				stsTokenManager: this.stsTokenManager._clone()
			}));
			return n.metadata._copy(this.metadata), n;
		}
		_onReload(e) {
			Q(!this.reloadListener, this.auth, "internal-error"), this.reloadListener = e, this.reloadUserInfo &&= (this._notifyReloadListener(this.reloadUserInfo), null);
		}
		_notifyReloadListener(e) {
			this.reloadListener ? this.reloadListener(e) : this.reloadUserInfo = e;
		}
		_startProactiveRefresh() {
			this.proactiveRefresh._start();
		}
		_stopProactiveRefresh() {
			this.proactiveRefresh._stop();
		}
		async _updateTokensIfNecessary(e, t = !1) {
			let n = !1;
			e.idToken && e.idToken !== this.stsTokenManager.accessToken && (this.stsTokenManager.updateFromServerResponse(e), n = !0), t && await ov(this), await this.auth._persistUserIfCurrent(this), n && this.auth._notifyListenersIfCurrent(this);
		}
		async delete() {
			if (et(this.auth.app)) return Promise.reject(M_(this.auth));
			let e = await this.getIdToken();
			return await iv(this, Z_(this.auth, { idToken: e })), this.stsTokenManager.clearRefreshToken(), this.auth.signOut();
		}
		toJSON() {
			return Object.assign(Object.assign({
				uid: this.uid,
				email: this.email || void 0,
				emailVerified: this.emailVerified,
				displayName: this.displayName || void 0,
				isAnonymous: this.isAnonymous,
				photoURL: this.photoURL || void 0,
				phoneNumber: this.phoneNumber || void 0,
				tenantId: this.tenantId || void 0,
				providerData: this.providerData.map((e) => Object.assign({}, e)),
				stsTokenManager: this.stsTokenManager.toJSON(),
				_redirectEventId: this._redirectEventId
			}, this.metadata.toJSON()), {
				apiKey: this.auth.config.apiKey,
				appName: this.auth.name
			});
		}
		get refreshToken() {
			return this.stsTokenManager.refreshToken || "";
		}
		static _fromJSON(t, n) {
			let r = n.displayName ?? void 0, i = n.email ?? void 0, a = n.phoneNumber ?? void 0, o = n.photoURL ?? void 0, s = n.tenantId ?? void 0, c = n._redirectEventId ?? void 0, l = n.createdAt ?? void 0, u = n.lastLoginAt ?? void 0, { uid: d, emailVerified: f, isAnonymous: p, providerData: m, stsTokenManager: h } = n;
			Q(d && h, t, "internal-error");
			let g = gb.fromJSON(this.name, h);
			Q(typeof d == "string", t, "internal-error"), fv(r, t.name), fv(i, t.name), Q(typeof f == "boolean", t, "internal-error"), Q(typeof p == "boolean", t, "internal-error"), fv(a, t.name), fv(o, t.name), fv(s, t.name), fv(c, t.name), fv(l, t.name), fv(u, t.name);
			let ee = new e({
				uid: d,
				auth: t,
				email: i,
				emailVerified: f,
				displayName: r,
				isAnonymous: p,
				photoURL: o,
				phoneNumber: a,
				tenantId: s,
				stsTokenManager: g,
				createdAt: l,
				lastLoginAt: u
			});
			return m && Array.isArray(m) && (ee.providerData = m.map((e) => Object.assign({}, e))), c && (ee._redirectEventId = c), ee;
		}
		static async _fromIdTokenResponse(t, n, r = !1) {
			let i = new gb();
			i.updateFromServerResponse(n);
			let a = new e({
				uid: n.localId,
				auth: t,
				stsTokenManager: i,
				isAnonymous: r
			});
			return await ov(a), a;
		}
		static async _fromGetAccountInfoResponse(t, n, r) {
			let i = n.users[0];
			Q(i.localId !== void 0, "internal-error");
			let a = i.providerUserInfo === void 0 ? [] : lv(i.providerUserInfo), o = !(i.email && i.passwordHash) && !a?.length, s = new gb();
			s.updateFromIdToken(r);
			let c = new e({
				uid: i.localId,
				auth: t,
				stsTokenManager: s,
				isAnonymous: o
			}), l = {
				uid: i.localId,
				displayName: i.displayName || null,
				photoURL: i.photoUrl || null,
				email: i.email || null,
				emailVerified: i.emailVerified || !1,
				phoneNumber: i.phoneNumber || null,
				tenantId: i.tenantId || null,
				providerData: a,
				metadata: new hb(i.createdAt, i.lastLoginAt),
				isAnonymous: !(i.email && i.passwordHash) && !a?.length
			};
			return Object.assign(c, l), c;
		}
	}, vb = /* @__PURE__ */ new Map(), yb = class {
		constructor() {
			this.type = "NONE", this.storage = {};
		}
		async _isAvailable() {
			return !0;
		}
		async _set(e, t) {
			this.storage[e] = t;
		}
		async _get(e) {
			let t = this.storage[e];
			return t === void 0 ? null : t;
		}
		async _remove(e) {
			delete this.storage[e];
		}
		_addListener(e, t) {}
		_removeListener(e, t) {}
	}, yb.type = "NONE", bb = yb, xb = class e {
		constructor(e, t, n) {
			this.persistence = e, this.auth = t, this.userKey = n;
			let { config: r, name: i } = this.auth;
			this.fullUserKey = mv(this.userKey, r.apiKey, i), this.fullPersistenceKey = mv("persistence", r.apiKey, i), this.boundEventHandler = t._onStorageEvent.bind(t), this.persistence._addListener(this.fullUserKey, this.boundEventHandler);
		}
		setCurrentUser(e) {
			return this.persistence._set(this.fullUserKey, e.toJSON());
		}
		async getCurrentUser() {
			let e = await this.persistence._get(this.fullUserKey);
			return e ? _b._fromJSON(this.auth, e) : null;
		}
		removeCurrentUser() {
			return this.persistence._remove(this.fullUserKey);
		}
		savePersistenceForRedirect() {
			return this.persistence._set(this.fullPersistenceKey, this.persistence.type);
		}
		async setPersistence(e) {
			if (this.persistence === e) return;
			let t = await this.getCurrentUser();
			if (await this.removeCurrentUser(), this.persistence = e, t) return this.setCurrentUser(t);
		}
		delete() {
			this.persistence._removeListener(this.fullUserKey, this.boundEventHandler);
		}
		static async create(t, n, r = "authUser") {
			if (!n.length) return new e(pv(bb), t, r);
			let i = (await Promise.all(n.map(async (e) => {
				if (await e._isAvailable()) return e;
			}))).filter((e) => e), a = i[0] || pv(bb), o = mv(r, t.config.apiKey, t.name), s = null;
			for (let e of n) try {
				let n = await e._get(o);
				if (n) {
					let r = _b._fromJSON(t, n);
					e !== a && (s = r), a = e;
					break;
				}
			} catch {}
			let c = i.filter((e) => e._shouldAllowMigration);
			return !a._shouldAllowMigration || !c.length ? new e(a, t, r) : (a = c[0], s && await a._set(o, s.toJSON()), await Promise.all(n.map(async (e) => {
				if (e !== a) try {
					await e._remove(o);
				} catch {}
			})), new e(a, t, r));
		}
	}, Sb = class {
		constructor(e) {
			this.auth = e, this.queue = [];
		}
		pushCallback(e, t) {
			let n = (t) => new Promise((n, r) => {
				try {
					n(e(t));
				} catch (e) {
					r(e);
				}
			});
			n.onAbort = t, this.queue.push(n);
			let r = this.queue.length - 1;
			return () => {
				this.queue[r] = () => Promise.resolve();
			};
		}
		async runMiddleware(e) {
			if (this.auth.currentUser === e) return;
			let t = [];
			try {
				for (let n of this.queue) await n(e), n.onAbort && t.push(n.onAbort);
			} catch (e) {
				t.reverse();
				for (let e of t) try {
					e();
				} catch {}
				throw this.auth._errorFactory.create("login-blocked", { originalMessage: e?.message });
			}
		}
	}, Cb = 6, wb = class {
		constructor(e) {
			let t = e.customStrengthOptions;
			this.customStrengthOptions = {}, this.customStrengthOptions.minPasswordLength = t.minPasswordLength ?? Cb, t.maxPasswordLength && (this.customStrengthOptions.maxPasswordLength = t.maxPasswordLength), t.containsLowercaseCharacter !== void 0 && (this.customStrengthOptions.containsLowercaseLetter = t.containsLowercaseCharacter), t.containsUppercaseCharacter !== void 0 && (this.customStrengthOptions.containsUppercaseLetter = t.containsUppercaseCharacter), t.containsNumericCharacter !== void 0 && (this.customStrengthOptions.containsNumericCharacter = t.containsNumericCharacter), t.containsNonAlphanumericCharacter !== void 0 && (this.customStrengthOptions.containsNonAlphanumericCharacter = t.containsNonAlphanumericCharacter), this.enforcementState = e.enforcementState, this.enforcementState === "ENFORCEMENT_STATE_UNSPECIFIED" && (this.enforcementState = "OFF"), this.allowedNonAlphanumericCharacters = e.allowedNonAlphanumericCharacters?.join("") ?? "", this.forceUpgradeOnSignin = e.forceUpgradeOnSignin ?? !1, this.schemaVersion = e.schemaVersion;
		}
		validatePassword(e) {
			let t = {
				isValid: !0,
				passwordPolicy: this
			};
			return this.validatePasswordLengthOptions(e, t), this.validatePasswordCharacterOptions(e, t), t.isValid &&= t.meetsMinPasswordLength ?? !0, t.isValid &&= t.meetsMaxPasswordLength ?? !0, t.isValid &&= t.containsLowercaseLetter ?? !0, t.isValid &&= t.containsUppercaseLetter ?? !0, t.isValid &&= t.containsNumericCharacter ?? !0, t.isValid &&= t.containsNonAlphanumericCharacter ?? !0, t;
		}
		validatePasswordLengthOptions(e, t) {
			let n = this.customStrengthOptions.minPasswordLength, r = this.customStrengthOptions.maxPasswordLength;
			n && (t.meetsMinPasswordLength = e.length >= n), r && (t.meetsMaxPasswordLength = e.length <= r);
		}
		validatePasswordCharacterOptions(e, t) {
			this.updatePasswordCharacterOptionsStatuses(t, !1, !1, !1, !1);
			let n;
			for (let r = 0; r < e.length; r++) n = e.charAt(r), this.updatePasswordCharacterOptionsStatuses(t, n >= "a" && n <= "z", n >= "A" && n <= "Z", n >= "0" && n <= "9", this.allowedNonAlphanumericCharacters.includes(n));
		}
		updatePasswordCharacterOptionsStatuses(e, t, n, r, i) {
			this.customStrengthOptions.containsLowercaseLetter && (e.containsLowercaseLetter ||= t), this.customStrengthOptions.containsUppercaseLetter && (e.containsUppercaseLetter ||= n), this.customStrengthOptions.containsNumericCharacter && (e.containsNumericCharacter ||= r), this.customStrengthOptions.containsNonAlphanumericCharacter && (e.containsNonAlphanumericCharacter ||= i);
		}
	}, Tb = class {
		constructor(e, t, n, r) {
			this.app = e, this.heartbeatServiceProvider = t, this.appCheckServiceProvider = n, this.config = r, this.currentUser = null, this.emulatorConfig = null, this.operations = Promise.resolve(), this.authStateSubscription = new Eb(this), this.idTokenSubscription = new Eb(this), this.beforeStateQueue = new Sb(this), this.redirectUser = null, this.isProactiveRefreshEnabled = !1, this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION = 1, this._canInitEmulator = !0, this._isInitialized = !1, this._deleted = !1, this._initializationPromise = null, this._popupRedirectResolver = null, this._errorFactory = ob, this._agentRecaptchaConfig = null, this._tenantRecaptchaConfigs = {}, this._projectPasswordPolicy = null, this._tenantPasswordPolicies = {}, this.lastNotifiedUid = void 0, this.languageCode = null, this.tenantId = null, this.settings = { appVerificationDisabledForTesting: !1 }, this.frameworks = [], this.name = e.name, this.clientVersion = r.sdkClientVersion;
		}
		_initializeWithPersistence(e, t) {
			return t && (this._popupRedirectResolver = pv(t)), this._initializationPromise = this.queue(async () => {
				if (!this._deleted && (this.persistenceManager = await xb.create(this, e), !this._deleted)) {
					if (this._popupRedirectResolver?._shouldInitProactively) try {
						await this._popupRedirectResolver._initialize(this);
					} catch {}
					await this.initializeCurrentUser(t), this.lastNotifiedUid = this.currentUser?.uid || null, !this._deleted && (this._isInitialized = !0);
				}
			}), this._initializationPromise;
		}
		async _onStorageEvent() {
			if (this._deleted) return;
			let e = await this.assertedPersistence.getCurrentUser();
			if (!(!this.currentUser && !e)) {
				if (this.currentUser && e && this.currentUser.uid === e.uid) {
					this._currentUser._assign(e), await this.currentUser.getIdToken();
					return;
				}
				await this._updateCurrentUser(e, !0);
			}
		}
		async initializeCurrentUserFromIdToken(e) {
			try {
				let t = await Q_(this, { idToken: e }), n = await _b._fromGetAccountInfoResponse(this, t, e);
				await this.directlySetCurrentUser(n);
			} catch (e) {
				console.warn("FirebaseServerApp could not login user with provided authIdToken: ", e), await this.directlySetCurrentUser(null);
			}
		}
		async initializeCurrentUser(e) {
			if (et(this.app)) {
				let e = this.app.settings.authIdToken;
				return e ? new Promise((t) => {
					setTimeout(() => this.initializeCurrentUserFromIdToken(e).then(t, t));
				}) : this.directlySetCurrentUser(null);
			}
			let t = await this.assertedPersistence.getCurrentUser(), n = t, r = !1;
			if (e && this.config.authDomain) {
				await this.getOrInitRedirectPersistenceManager();
				let t = this.redirectUser?._redirectEventId, i = n?._redirectEventId, a = await this.tryRedirectSignIn(e);
				(!t || t === i) && a?.user && (n = a.user, r = !0);
			}
			if (!n) return this.directlySetCurrentUser(null);
			if (!n._redirectEventId) {
				if (r) try {
					await this.beforeStateQueue.runMiddleware(n);
				} catch (e) {
					n = t, this._popupRedirectResolver._overrideRedirectResult(this, () => Promise.reject(e));
				}
				return n ? this.reloadAndSetCurrentUserOrClear(n) : this.directlySetCurrentUser(null);
			}
			return Q(this._popupRedirectResolver, this, "argument-error"), await this.getOrInitRedirectPersistenceManager(), this.redirectUser && this.redirectUser._redirectEventId === n._redirectEventId ? this.directlySetCurrentUser(n) : this.reloadAndSetCurrentUserOrClear(n);
		}
		async tryRedirectSignIn(e) {
			let t = null;
			try {
				t = await this._popupRedirectResolver._completeRedirectFn(this, e, !0);
			} catch {
				await this._setRedirectUser(null);
			}
			return t;
		}
		async reloadAndSetCurrentUserOrClear(e) {
			try {
				await ov(e);
			} catch (e) {
				if (e?.code !== "auth/network-request-failed") return this.directlySetCurrentUser(null);
			}
			return this.directlySetCurrentUser(e);
		}
		useDeviceLanguage() {
			this.languageCode = B_();
		}
		async _delete() {
			this._deleted = !0;
		}
		async updateCurrentUser(e) {
			if (et(this.app)) return Promise.reject(M_(this));
			let t = e ? Zg(e) : null;
			return t && Q(t.auth.config.apiKey === this.config.apiKey, this, "invalid-user-token"), this._updateCurrentUser(t && t._clone(this));
		}
		async _updateCurrentUser(e, t = !1) {
			if (!this._deleted) return e && Q(this.tenantId === e.tenantId, this, "tenant-id-mismatch"), t || await this.beforeStateQueue.runMiddleware(e), this.queue(async () => {
				await this.directlySetCurrentUser(e), this.notifyAuthListeners();
			});
		}
		async signOut() {
			return et(this.app) ? Promise.reject(M_(this)) : (await this.beforeStateQueue.runMiddleware(null), (this.redirectPersistenceManager || this._popupRedirectResolver) && await this._setRedirectUser(null), this._updateCurrentUser(null, !0));
		}
		setPersistence(e) {
			return et(this.app) ? Promise.reject(M_(this)) : this.queue(async () => {
				await this.assertedPersistence.setPersistence(pv(e));
			});
		}
		_getRecaptchaConfig() {
			return this.tenantId == null ? this._agentRecaptchaConfig : this._tenantRecaptchaConfigs[this.tenantId];
		}
		async validatePassword(e) {
			this._getPasswordPolicyInternal() || await this._updatePasswordPolicy();
			let t = this._getPasswordPolicyInternal();
			return t.schemaVersion === this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION ? t.validatePassword(e) : Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version", {}));
		}
		_getPasswordPolicyInternal() {
			return this.tenantId === null ? this._projectPasswordPolicy : this._tenantPasswordPolicies[this.tenantId];
		}
		async _updatePasswordPolicy() {
			let e = await Ov(this), t = new wb(e);
			this.tenantId === null ? this._projectPasswordPolicy = t : this._tenantPasswordPolicies[this.tenantId] = t;
		}
		_getPersistence() {
			return this.assertedPersistence.persistence.type;
		}
		_updateErrorMap(e) {
			this._errorFactory = new d_("auth", "Firebase", e());
		}
		onAuthStateChanged(e, t, n) {
			return this.registerStateListener(this.authStateSubscription, e, t, n);
		}
		beforeAuthStateChanged(e, t) {
			return this.beforeStateQueue.pushCallback(e, t);
		}
		onIdTokenChanged(e, t, n) {
			return this.registerStateListener(this.idTokenSubscription, e, t, n);
		}
		authStateReady() {
			return new Promise((e, t) => {
				if (this.currentUser) e();
				else {
					let n = this.onAuthStateChanged(() => {
						n(), e();
					}, t);
				}
			});
		}
		async revokeAccessToken(e) {
			if (this.currentUser) {
				let t = {
					providerId: "apple.com",
					tokenType: "ACCESS_TOKEN",
					token: e,
					idToken: await this.currentUser.getIdToken()
				};
				this.tenantId != null && (t.tenantId = this.tenantId), await dv(this, t);
			}
		}
		toJSON() {
			return {
				apiKey: this.config.apiKey,
				authDomain: this.config.authDomain,
				appName: this.name,
				currentUser: this._currentUser?.toJSON()
			};
		}
		async _setRedirectUser(e, t) {
			let n = await this.getOrInitRedirectPersistenceManager(t);
			return e === null ? n.removeCurrentUser() : n.setCurrentUser(e);
		}
		async getOrInitRedirectPersistenceManager(e) {
			if (!this.redirectPersistenceManager) {
				let t = e && pv(e) || this._popupRedirectResolver;
				Q(t, this, "argument-error"), this.redirectPersistenceManager = await xb.create(this, [pv(t._redirectPersistence)], "redirectUser"), this.redirectUser = await this.redirectPersistenceManager.getCurrentUser();
			}
			return this.redirectPersistenceManager;
		}
		async _redirectUserForId(e) {
			return this._isInitialized && await this.queue(async () => {}), this._currentUser?._redirectEventId === e ? this._currentUser : this.redirectUser?._redirectEventId === e ? this.redirectUser : null;
		}
		async _persistUserIfCurrent(e) {
			if (e === this.currentUser) return this.queue(async () => this.directlySetCurrentUser(e));
		}
		_notifyListenersIfCurrent(e) {
			e === this.currentUser && this.notifyAuthListeners();
		}
		_key() {
			return `${this.config.authDomain}:${this.config.apiKey}:${this.name}`;
		}
		_startProactiveRefresh() {
			this.isProactiveRefreshEnabled = !0, this.currentUser && this._currentUser._startProactiveRefresh();
		}
		_stopProactiveRefresh() {
			this.isProactiveRefreshEnabled = !1, this.currentUser && this._currentUser._stopProactiveRefresh();
		}
		get _currentUser() {
			return this.currentUser;
		}
		notifyAuthListeners() {
			if (!this._isInitialized) return;
			this.idTokenSubscription.next(this.currentUser);
			let e = this.currentUser?.uid ?? null;
			this.lastNotifiedUid !== e && (this.lastNotifiedUid = e, this.authStateSubscription.next(this.currentUser));
		}
		registerStateListener(e, t, n, r) {
			if (this._deleted) return () => {};
			let i = typeof t == "function" ? t : t.next.bind(t), a = !1, o = this._isInitialized ? Promise.resolve() : this._initializationPromise;
			if (Q(o, this, "internal-error"), o.then(() => {
				a || i(this.currentUser);
			}), typeof t == "function") {
				let i = e.addObserver(t, n, r);
				return () => {
					a = !0, i();
				};
			} else {
				let n = e.addObserver(t);
				return () => {
					a = !0, n();
				};
			}
		}
		async directlySetCurrentUser(e) {
			this.currentUser && this.currentUser !== e && this._currentUser._stopProactiveRefresh(), e && this.isProactiveRefreshEnabled && e._startProactiveRefresh(), this.currentUser = e, e ? await this.assertedPersistence.setCurrentUser(e) : await this.assertedPersistence.removeCurrentUser();
		}
		queue(e) {
			return this.operations = this.operations.then(e, e), this.operations;
		}
		get assertedPersistence() {
			return Q(this.persistenceManager, this, "internal-error"), this.persistenceManager;
		}
		_logFramework(e) {
			!e || this.frameworks.includes(e) || (this.frameworks.push(e), this.frameworks.sort(), this.clientVersion = Dv(this.config.clientPlatform, this._getFrameworks()));
		}
		_getFrameworks() {
			return this.frameworks;
		}
		async _getAdditionalHeaders() {
			let e = { "X-Client-Version": this.clientVersion };
			this.app.options.appId && (e["X-Firebase-gmpid"] = this.app.options.appId);
			let t = await this.heartbeatServiceProvider.getImmediate({ optional: !0 })?.getHeartbeatsHeader();
			t && (e["X-Firebase-Client"] = t);
			let n = await this._getAppCheckToken();
			return n && (e["X-Firebase-AppCheck"] = n), e;
		}
		async _getAppCheckToken() {
			let e = await this.appCheckServiceProvider.getImmediate({ optional: !0 })?.getToken();
			return e?.error && D_(`Error while retrieving App Check token: ${e.error}`), e?.token;
		}
	}, Eb = class {
		constructor(e) {
			this.auth = e, this.observer = null, this.addObserver = Jg((e) => this.observer = e);
		}
		get next() {
			return Q(this.observer, this.auth, "internal-error"), this.observer.next.bind(this.observer);
		}
	}, Db = {
		async loadJS() {
			throw Error("Unable to load external scripts");
		},
		recaptchaV2Script: "",
		recaptchaEnterpriseScript: "",
		gapiScript: ""
	}, Ob = "recaptcha-enterprise", kb = "NO_RECAPTCHA", Ab = class {
		constructor(e) {
			this.type = Ob, this.auth = kv(e);
		}
		async verify(e = "verify", t = !1) {
			async function n(e) {
				if (!t) {
					if (e.tenantId == null && e._agentRecaptchaConfig != null) return e._agentRecaptchaConfig.siteKey;
					if (e.tenantId != null && e._tenantRecaptchaConfigs[e.tenantId] !== void 0) return e._tenantRecaptchaConfigs[e.tenantId].siteKey;
				}
				return new Promise(async (t, n) => {
					X_(e, {
						clientType: "CLIENT_TYPE_WEB",
						version: "RECAPTCHA_ENTERPRISE"
					}).then((r) => {
						if (r.recaptchaKey === void 0) n(/* @__PURE__ */ Error("recaptcha Enterprise site key undefined"));
						else {
							let n = new pb(r);
							return e.tenantId == null ? e._agentRecaptchaConfig = n : e._tenantRecaptchaConfigs[e.tenantId] = n, t(n.siteKey);
						}
					}).catch((e) => {
						n(e);
					});
				});
			}
			function r(t, n, r) {
				let i = window.grecaptcha;
				Y_(i) ? i.enterprise.ready(() => {
					i.enterprise.execute(t, { action: e }).then((e) => {
						n(e);
					}).catch(() => {
						n(kb);
					});
				}) : r(Error("No reCAPTCHA enterprise script loaded."));
			}
			return new Promise((e, i) => {
				n(this.auth).then((n) => {
					if (!t && Y_(window.grecaptcha)) r(n, e, i);
					else {
						if (typeof window > "u") {
							i(/* @__PURE__ */ Error("RecaptchaVerifier is only supported in browser"));
							return;
						}
						let t = Mv();
						t.length !== 0 && (t += n), jv(t).then(() => {
							r(n, e, i);
						}).catch((e) => {
							i(e);
						});
					}
				}).catch((e) => {
					i(e);
				});
			});
		}
	}, jb = class {
		constructor(e, t) {
			this.providerId = e, this.signInMethod = t;
		}
		toJSON() {
			return P_("not implemented");
		}
		_getIdTokenResponse(e) {
			return P_("not implemented");
		}
		_linkToIdToken(e, t) {
			return P_("not implemented");
		}
		_getReauthenticationResolver(e) {
			return P_("not implemented");
		}
	}, Mb = class e extends jb {
		constructor(e, t, n, r = null) {
			super("password", n), this._email = e, this._password = t, this._tenantId = r;
		}
		static _fromEmailAndPassword(t, n) {
			return new e(t, n, "password");
		}
		static _fromEmailAndCode(t, n, r = null) {
			return new e(t, n, "emailLink", r);
		}
		toJSON() {
			return {
				email: this._email,
				password: this._password,
				signInMethod: this.signInMethod,
				tenantId: this._tenantId
			};
		}
		static fromJSON(e) {
			let t = typeof e == "string" ? JSON.parse(e) : e;
			if (t?.email && t?.password) {
				if (t.signInMethod === "password") return this._fromEmailAndPassword(t.email, t.password);
				if (t.signInMethod === "emailLink") return this._fromEmailAndCode(t.email, t.password, t.tenantId);
			}
			return null;
		}
		async _getIdTokenResponse(e) {
			switch (this.signInMethod) {
				case "password": return Iv(e, {
					returnSecureToken: !0,
					email: this._email,
					password: this._password,
					clientType: "CLIENT_TYPE_WEB"
				}, "signInWithPassword", Gv);
				case "emailLink": return Kv(e, {
					email: this._email,
					oobCode: this._password
				});
				default: k_(e, "internal-error");
			}
		}
		async _linkToIdToken(e, t) {
			switch (this.signInMethod) {
				case "password": return Iv(e, {
					idToken: t,
					returnSecureToken: !0,
					email: this._email,
					password: this._password,
					clientType: "CLIENT_TYPE_WEB"
				}, "signUpPassword", Wv);
				case "emailLink": return qv(e, {
					idToken: t,
					email: this._email,
					oobCode: this._password
				});
				default: k_(e, "internal-error");
			}
		}
		_getReauthenticationResolver(e) {
			return this._getIdTokenResponse(e);
		}
	}, Nb = "http://localhost", Pb = class e extends jb {
		constructor() {
			super(...arguments), this.pendingToken = null;
		}
		static _fromParams(t) {
			let n = new e(t.providerId, t.signInMethod);
			return t.idToken || t.accessToken ? (t.idToken && (n.idToken = t.idToken), t.accessToken && (n.accessToken = t.accessToken), t.nonce && !t.pendingToken && (n.nonce = t.nonce), t.pendingToken && (n.pendingToken = t.pendingToken)) : t.oauthToken && t.oauthTokenSecret ? (n.accessToken = t.oauthToken, n.secret = t.oauthTokenSecret) : k_("argument-error"), n;
		}
		toJSON() {
			return {
				idToken: this.idToken,
				accessToken: this.accessToken,
				secret: this.secret,
				nonce: this.nonce,
				pendingToken: this.pendingToken,
				providerId: this.providerId,
				signInMethod: this.signInMethod
			};
		}
		static fromJSON(t) {
			let n = typeof t == "string" ? JSON.parse(t) : t, { providerId: r, signInMethod: i } = n, a = S_(n, ["providerId", "signInMethod"]);
			if (!r || !i) return null;
			let o = new e(r, i);
			return o.idToken = a.idToken || void 0, o.accessToken = a.accessToken || void 0, o.secret = a.secret, o.nonce = a.nonce, o.pendingToken = a.pendingToken || null, o;
		}
		_getIdTokenResponse(e) {
			return Jv(e, this.buildRequest());
		}
		_linkToIdToken(e, t) {
			let n = this.buildRequest();
			return n.idToken = t, Jv(e, n);
		}
		_getReauthenticationResolver(e) {
			let t = this.buildRequest();
			return t.autoCreate = !1, Jv(e, t);
		}
		buildRequest() {
			let e = {
				requestUri: Nb,
				returnSecureToken: !0
			};
			if (this.pendingToken) e.pendingToken = this.pendingToken;
			else {
				let t = {};
				this.idToken && (t.id_token = this.idToken), this.accessToken && (t.access_token = this.accessToken), this.secret && (t.oauth_token_secret = this.secret), t.providerId = this.providerId, this.nonce && !this.pendingToken && (t.nonce = this.nonce), e.postBody = Gg(t);
			}
			return e;
		}
	}, Fb = { USER_NOT_FOUND: "user-not-found" }, Ib = class e extends jb {
		constructor(e) {
			super("phone", "phone"), this.params = e;
		}
		static _fromVerification(t, n) {
			return new e({
				verificationId: t,
				verificationCode: n
			});
		}
		static _fromTokenResponse(t, n) {
			return new e({
				phoneNumber: t,
				temporaryProof: n
			});
		}
		_getIdTokenResponse(e) {
			return Xv(e, this._makeVerificationRequest());
		}
		_linkToIdToken(e, t) {
			return Zv(e, Object.assign({ idToken: t }, this._makeVerificationRequest()));
		}
		_getReauthenticationResolver(e) {
			return Qv(e, this._makeVerificationRequest());
		}
		_makeVerificationRequest() {
			let { temporaryProof: e, phoneNumber: t, verificationId: n, verificationCode: r } = this.params;
			return e && t ? {
				temporaryProof: e,
				phoneNumber: t
			} : {
				sessionInfo: n,
				code: r
			};
		}
		toJSON() {
			let e = { providerId: this.providerId };
			return this.params.phoneNumber && (e.phoneNumber = this.params.phoneNumber), this.params.temporaryProof && (e.temporaryProof = this.params.temporaryProof), this.params.verificationCode && (e.verificationCode = this.params.verificationCode), this.params.verificationId && (e.verificationId = this.params.verificationId), e;
		}
		static fromJSON(t) {
			typeof t == "string" && (t = JSON.parse(t));
			let { verificationId: n, verificationCode: r, phoneNumber: i, temporaryProof: a } = t;
			return !r && !n && !i && !a ? null : new e({
				verificationId: n,
				verificationCode: r,
				phoneNumber: i,
				temporaryProof: a
			});
		}
	}, Lb = class e {
		constructor(e) {
			let t = Kg(qg(e)), n = t.apiKey ?? null, r = t.oobCode ?? null, i = $v(t.mode ?? null);
			Q(n && r && i, "argument-error"), this.apiKey = n, this.operation = i, this.code = r, this.continueUrl = t.continueUrl ?? null, this.languageCode = t.languageCode ?? null, this.tenantId = t.tenantId ?? null;
		}
		static parseLink(t) {
			let n = ey(t);
			try {
				return new e(n);
			} catch {
				return null;
			}
		}
	}, Rb = class e {
		constructor() {
			this.providerId = e.PROVIDER_ID;
		}
		static credential(e, t) {
			return Mb._fromEmailAndPassword(e, t);
		}
		static credentialWithLink(e, t) {
			let n = Lb.parseLink(t);
			return Q(n, "argument-error"), Mb._fromEmailAndCode(e, n.code, n.tenantId);
		}
	}, Rb.PROVIDER_ID = "password", Rb.EMAIL_PASSWORD_SIGN_IN_METHOD = "password", Rb.EMAIL_LINK_SIGN_IN_METHOD = "emailLink", zb = class {
		constructor(e) {
			this.providerId = e, this.defaultLanguageCode = null, this.customParameters = {};
		}
		setDefaultLanguage(e) {
			this.defaultLanguageCode = e;
		}
		setCustomParameters(e) {
			return this.customParameters = e, this;
		}
		getCustomParameters() {
			return this.customParameters;
		}
	}, Bb = class extends zb {
		constructor() {
			super(...arguments), this.scopes = [];
		}
		addScope(e) {
			return this.scopes.includes(e) || this.scopes.push(e), this;
		}
		getScopes() {
			return [...this.scopes];
		}
	}, Vb = class e extends Bb {
		constructor() {
			super("facebook.com");
		}
		static credential(t) {
			return Pb._fromParams({
				providerId: e.PROVIDER_ID,
				signInMethod: e.FACEBOOK_SIGN_IN_METHOD,
				accessToken: t
			});
		}
		static credentialFromResult(t) {
			return e.credentialFromTaggedObject(t);
		}
		static credentialFromError(t) {
			return e.credentialFromTaggedObject(t.customData || {});
		}
		static credentialFromTaggedObject({ _tokenResponse: t }) {
			if (!t || !("oauthAccessToken" in t) || !t.oauthAccessToken) return null;
			try {
				return e.credential(t.oauthAccessToken);
			} catch {
				return null;
			}
		}
	}, Vb.FACEBOOK_SIGN_IN_METHOD = "facebook.com", Vb.PROVIDER_ID = "facebook.com", Hb = class e extends Bb {
		constructor() {
			super("google.com"), this.addScope("profile");
		}
		static credential(t, n) {
			return Pb._fromParams({
				providerId: e.PROVIDER_ID,
				signInMethod: e.GOOGLE_SIGN_IN_METHOD,
				idToken: t,
				accessToken: n
			});
		}
		static credentialFromResult(t) {
			return e.credentialFromTaggedObject(t);
		}
		static credentialFromError(t) {
			return e.credentialFromTaggedObject(t.customData || {});
		}
		static credentialFromTaggedObject({ _tokenResponse: t }) {
			if (!t) return null;
			let { oauthIdToken: n, oauthAccessToken: r } = t;
			if (!n && !r) return null;
			try {
				return e.credential(n, r);
			} catch {
				return null;
			}
		}
	}, Hb.GOOGLE_SIGN_IN_METHOD = "google.com", Hb.PROVIDER_ID = "google.com", Ub = class e extends Bb {
		constructor() {
			super("github.com");
		}
		static credential(t) {
			return Pb._fromParams({
				providerId: e.PROVIDER_ID,
				signInMethod: e.GITHUB_SIGN_IN_METHOD,
				accessToken: t
			});
		}
		static credentialFromResult(t) {
			return e.credentialFromTaggedObject(t);
		}
		static credentialFromError(t) {
			return e.credentialFromTaggedObject(t.customData || {});
		}
		static credentialFromTaggedObject({ _tokenResponse: t }) {
			if (!t || !("oauthAccessToken" in t) || !t.oauthAccessToken) return null;
			try {
				return e.credential(t.oauthAccessToken);
			} catch {
				return null;
			}
		}
	}, Ub.GITHUB_SIGN_IN_METHOD = "github.com", Ub.PROVIDER_ID = "github.com", Wb = class e extends Bb {
		constructor() {
			super("twitter.com");
		}
		static credential(t, n) {
			return Pb._fromParams({
				providerId: e.PROVIDER_ID,
				signInMethod: e.TWITTER_SIGN_IN_METHOD,
				oauthToken: t,
				oauthTokenSecret: n
			});
		}
		static credentialFromResult(t) {
			return e.credentialFromTaggedObject(t);
		}
		static credentialFromError(t) {
			return e.credentialFromTaggedObject(t.customData || {});
		}
		static credentialFromTaggedObject({ _tokenResponse: t }) {
			if (!t) return null;
			let { oauthAccessToken: n, oauthTokenSecret: r } = t;
			if (!n || !r) return null;
			try {
				return e.credential(n, r);
			} catch {
				return null;
			}
		}
	}, Wb.TWITTER_SIGN_IN_METHOD = "twitter.com", Wb.PROVIDER_ID = "twitter.com", Gb = class e {
		constructor(e) {
			this.user = e.user, this.providerId = e.providerId, this._tokenResponse = e._tokenResponse, this.operationType = e.operationType;
		}
		static async _fromIdTokenResponse(t, n, r, i = !1) {
			let a = await _b._fromIdTokenResponse(t, r, i), o = ty(r);
			return new e({
				user: a,
				providerId: o,
				_tokenResponse: r,
				operationType: n
			});
		}
		static async _forOperation(t, n, r) {
			await t._updateTokensIfNecessary(r, !0);
			let i = ty(r);
			return new e({
				user: t,
				providerId: i,
				_tokenResponse: r,
				operationType: n
			});
		}
	}, Kb = class e extends u_ {
		constructor(t, n, r, i) {
			super(n.code, n.message), this.operationType = r, this.user = i, Object.setPrototypeOf(this, e.prototype), this.customData = {
				appName: t.name,
				tenantId: t.tenantId ?? void 0,
				_serverResponse: n.customData._serverResponse,
				operationType: r
			};
		}
		static _fromErrorAndOperation(t, n, r, i) {
			return new e(t, n, r, i);
		}
	}, qb = "__sak", Jb = class {
		constructor(e, t) {
			this.storageRetriever = e, this.type = t;
		}
		_isAvailable() {
			try {
				return this.storage ? (this.storage.setItem(qb, "1"), this.storage.removeItem(qb), Promise.resolve(!0)) : Promise.resolve(!1);
			} catch {
				return Promise.resolve(!1);
			}
		}
		_set(e, t) {
			return this.storage.setItem(e, JSON.stringify(t)), Promise.resolve();
		}
		_get(e) {
			let t = this.storage.getItem(e);
			return Promise.resolve(t ? JSON.parse(t) : null);
		}
		_remove(e) {
			return this.storage.removeItem(e), Promise.resolve();
		}
		get storage() {
			return this.storageRetriever();
		}
	}, Yb = 1e3, Xb = 10, Zb = class extends Jb {
		constructor() {
			super(() => window.localStorage, "LOCAL"), this.boundEventHandler = (e, t) => this.onStorageEvent(e, t), this.listeners = {}, this.localCache = {}, this.pollTimer = null, this.fallbackToPolling = Ev(), this._shouldAllowMigration = !0;
		}
		forAllChangedKeys(e) {
			for (let t of Object.keys(this.listeners)) {
				let n = this.storage.getItem(t), r = this.localCache[t];
				n !== r && e(t, r, n);
			}
		}
		onStorageEvent(e, t = !1) {
			if (!e.key) {
				this.forAllChangedKeys((e, t, n) => {
					this.notifyListeners(e, n);
				});
				return;
			}
			let n = e.key;
			t ? this.detachListener() : this.stopPolling();
			let r = () => {
				let e = this.storage.getItem(n);
				!t && this.localCache[n] === e || this.notifyListeners(n, e);
			}, i = this.storage.getItem(n);
			Tv() && i !== e.newValue && e.newValue !== e.oldValue ? setTimeout(r, Xb) : r();
		}
		notifyListeners(e, t) {
			this.localCache[e] = t;
			let n = this.listeners[e];
			if (n) for (let e of Array.from(n)) e(t && JSON.parse(t));
		}
		startPolling() {
			this.stopPolling(), this.pollTimer = setInterval(() => {
				this.forAllChangedKeys((e, t, n) => {
					this.onStorageEvent(new StorageEvent("storage", {
						key: e,
						oldValue: t,
						newValue: n
					}), !0);
				});
			}, Yb);
		}
		stopPolling() {
			this.pollTimer &&= (clearInterval(this.pollTimer), null);
		}
		attachListener() {
			window.addEventListener("storage", this.boundEventHandler);
		}
		detachListener() {
			window.removeEventListener("storage", this.boundEventHandler);
		}
		_addListener(e, t) {
			Object.keys(this.listeners).length === 0 && (this.fallbackToPolling ? this.startPolling() : this.attachListener()), this.listeners[e] || (this.listeners[e] = /* @__PURE__ */ new Set(), this.localCache[e] = this.storage.getItem(e)), this.listeners[e].add(t);
		}
		_removeListener(e, t) {
			this.listeners[e] && (this.listeners[e].delete(t), this.listeners[e].size === 0 && delete this.listeners[e]), Object.keys(this.listeners).length === 0 && (this.detachListener(), this.stopPolling());
		}
		async _set(e, t) {
			await super._set(e, t), this.localCache[e] = JSON.stringify(t);
		}
		async _get(e) {
			let t = await super._get(e);
			return this.localCache[e] = JSON.stringify(t), t;
		}
		async _remove(e) {
			await super._remove(e), delete this.localCache[e];
		}
	}, Zb.type = "LOCAL", Qb = Zb, $b = class extends Jb {
		constructor() {
			super(() => window.sessionStorage, "SESSION");
		}
		_addListener(e, t) {}
		_removeListener(e, t) {}
	}, $b.type = "SESSION", ex = $b, tx = class e {
		constructor(e) {
			this.eventTarget = e, this.handlersMap = {}, this.boundEventHandler = this.handleEvent.bind(this);
		}
		static _getInstance(t) {
			let n = this.receivers.find((e) => e.isListeningto(t));
			if (n) return n;
			let r = new e(t);
			return this.receivers.push(r), r;
		}
		isListeningto(e) {
			return this.eventTarget === e;
		}
		async handleEvent(e) {
			let t = e, { eventId: n, eventType: r, data: i } = t.data, a = this.handlersMap[r];
			if (!a?.size) return;
			t.ports[0].postMessage({
				status: "ack",
				eventId: n,
				eventType: r
			});
			let o = await fy(Array.from(a).map(async (e) => e(t.origin, i)));
			t.ports[0].postMessage({
				status: "done",
				eventId: n,
				eventType: r,
				response: o
			});
		}
		_subscribe(e, t) {
			Object.keys(this.handlersMap).length === 0 && this.eventTarget.addEventListener("message", this.boundEventHandler), this.handlersMap[e] || (this.handlersMap[e] = /* @__PURE__ */ new Set()), this.handlersMap[e].add(t);
		}
		_unsubscribe(e, t) {
			this.handlersMap[e] && t && this.handlersMap[e].delete(t), (!t || this.handlersMap[e].size === 0) && delete this.handlersMap[e], Object.keys(this.handlersMap).length === 0 && this.eventTarget.removeEventListener("message", this.boundEventHandler);
		}
	}, tx.receivers = [], nx = class {
		constructor(e) {
			this.target = e, this.handlers = /* @__PURE__ */ new Set();
		}
		removeMessageHandler(e) {
			e.messageChannel && (e.messageChannel.port1.removeEventListener("message", e.onMessage), e.messageChannel.port1.close()), this.handlers.delete(e);
		}
		async _send(e, t, n = 50) {
			let r = typeof MessageChannel < "u" ? new MessageChannel() : null;
			if (!r) throw Error("connection_unavailable");
			let i, a;
			return new Promise((o, s) => {
				let c = py("", 20);
				r.port1.start();
				let l = setTimeout(() => {
					s(/* @__PURE__ */ Error("unsupported_event"));
				}, n);
				a = {
					messageChannel: r,
					onMessage(e) {
						let t = e;
						if (t.data.eventId === c) switch (t.data.status) {
							case "ack":
								clearTimeout(l), i = setTimeout(() => {
									s(/* @__PURE__ */ Error("timeout"));
								}, 3e3);
								break;
							case "done":
								clearTimeout(i), o(t.data.response);
								break;
							default:
								clearTimeout(l), clearTimeout(i), s(/* @__PURE__ */ Error("invalid_response"));
								break;
						}
					}
				}, this.handlers.add(a), r.port1.addEventListener("message", a.onMessage), this.target.postMessage({
					eventType: e,
					eventId: c,
					data: t
				}, [r.port2]);
			}).finally(() => {
				a && this.removeMessageHandler(a);
			});
		}
	}, rx = "firebaseLocalStorageDb", ix = 1, ax = "firebaseLocalStorage", ox = "fbase_key", sx = class {
		constructor(e) {
			this.request = e;
		}
		toPromise() {
			return new Promise((e, t) => {
				this.request.addEventListener("success", () => {
					e(this.request.result);
				}), this.request.addEventListener("error", () => {
					t(this.request.error);
				});
			});
		}
	}, cx = 800, lx = 3, ux = class {
		constructor() {
			this.type = "LOCAL", this._shouldAllowMigration = !0, this.listeners = {}, this.localCache = {}, this.pollTimer = null, this.pendingWrites = 0, this.receiver = null, this.sender = null, this.serviceWorkerReceiverAvailable = !1, this.activeServiceWorker = null, this._workerInitializationPromise = this.initializeServiceWorkerMessaging().then(() => {}, () => {});
		}
		async _openDb() {
			return this.db ||= await Sy(), this.db;
		}
		async _withRetries(e) {
			let t = 0;
			for (;;) try {
				return await e(await this._openDb());
			} catch (e) {
				if (t++ > lx) throw e;
				this.db &&= (this.db.close(), void 0);
			}
		}
		async initializeServiceWorkerMessaging() {
			return gy() ? this.initializeReceiver() : this.initializeSender();
		}
		async initializeReceiver() {
			this.receiver = tx._getInstance(yy()), this.receiver._subscribe("keyChanged", async (e, t) => ({ keyProcessed: (await this._poll()).includes(t.key) })), this.receiver._subscribe("ping", async (e, t) => ["keyChanged"]);
		}
		async initializeSender() {
			if (this.activeServiceWorker = await _y(), !this.activeServiceWorker) return;
			this.sender = new nx(this.activeServiceWorker);
			let e = await this.sender._send("ping", {}, 800);
			e && e[0]?.fulfilled && e[0]?.value.includes("keyChanged") && (this.serviceWorkerReceiverAvailable = !0);
		}
		async notifyServiceWorker(e) {
			if (!(!this.sender || !this.activeServiceWorker || vy() !== this.activeServiceWorker)) try {
				await this.sender._send("keyChanged", { key: e }, this.serviceWorkerReceiverAvailable ? 800 : 50);
			} catch {}
		}
		async _isAvailable() {
			try {
				if (!indexedDB) return !1;
				let e = await Sy();
				return await Cy(e, qb, "1"), await Ty(e, qb), !0;
			} catch {}
			return !1;
		}
		async _withPendingWrite(e) {
			this.pendingWrites++;
			try {
				await e();
			} finally {
				this.pendingWrites--;
			}
		}
		async _set(e, t) {
			return this._withPendingWrite(async () => (await this._withRetries((n) => Cy(n, e, t)), this.localCache[e] = t, this.notifyServiceWorker(e)));
		}
		async _get(e) {
			let t = await this._withRetries((t) => wy(t, e));
			return this.localCache[e] = t, t;
		}
		async _remove(e) {
			return this._withPendingWrite(async () => (await this._withRetries((t) => Ty(t, e)), delete this.localCache[e], this.notifyServiceWorker(e)));
		}
		async _poll() {
			let e = await this._withRetries((e) => {
				let t = by(e, !1).getAll();
				return new sx(t).toPromise();
			});
			if (!e || this.pendingWrites !== 0) return [];
			let t = [], n = /* @__PURE__ */ new Set();
			if (e.length !== 0) for (let { fbase_key: r, value: i } of e) n.add(r), JSON.stringify(this.localCache[r]) !== JSON.stringify(i) && (this.notifyListeners(r, i), t.push(r));
			for (let e of Object.keys(this.localCache)) this.localCache[e] && !n.has(e) && (this.notifyListeners(e, null), t.push(e));
			return t;
		}
		notifyListeners(e, t) {
			this.localCache[e] = t;
			let n = this.listeners[e];
			if (n) for (let e of Array.from(n)) e(t);
		}
		startPolling() {
			this.stopPolling(), this.pollTimer = setInterval(async () => this._poll(), cx);
		}
		stopPolling() {
			this.pollTimer &&= (clearInterval(this.pollTimer), null);
		}
		_addListener(e, t) {
			Object.keys(this.listeners).length === 0 && this.startPolling(), this.listeners[e] || (this.listeners[e] = /* @__PURE__ */ new Set(), this._get(e)), this.listeners[e].add(t);
		}
		_removeListener(e, t) {
			this.listeners[e] && (this.listeners[e].delete(t), this.listeners[e].size === 0 && delete this.listeners[e]), Object.keys(this.listeners).length === 0 && this.stopPolling();
		}
	}, ux.type = "LOCAL", dx = ux, Pv("rcb"), new cb(3e4, 6e4), fx = "recaptcha", px = class e {
		constructor(t) {
			this.providerId = e.PROVIDER_ID, this.auth = kv(t);
		}
		verifyPhoneNumber(e, t) {
			return ky(this.auth, e, Zg(t));
		}
		static credential(e, t) {
			return Ib._fromVerification(e, t);
		}
		static credentialFromResult(t) {
			let n = t;
			return e.credentialFromTaggedObject(n);
		}
		static credentialFromError(t) {
			return e.credentialFromTaggedObject(t.customData || {});
		}
		static credentialFromTaggedObject({ _tokenResponse: e }) {
			if (!e) return null;
			let { phoneNumber: t, temporaryProof: n } = e;
			return t && n ? Ib._fromTokenResponse(t, n) : null;
		}
	}, px.PROVIDER_ID = "phone", px.PHONE_SIGN_IN_METHOD = "phone", mx = class extends jb {
		constructor(e) {
			super("custom", "custom"), this.params = e;
		}
		_getIdTokenResponse(e) {
			return Jv(e, this._buildIdpRequest());
		}
		_linkToIdToken(e, t) {
			return Jv(e, this._buildIdpRequest(t));
		}
		_getReauthenticationResolver(e) {
			return Jv(e, this._buildIdpRequest());
		}
		_buildIdpRequest(e) {
			let t = {
				requestUri: this.params.requestUri,
				sessionId: this.params.sessionId,
				postBody: this.params.postBody,
				tenantId: this.params.tenantId,
				pendingToken: this.params.pendingToken,
				returnSecureToken: !0,
				returnIdpCredential: !0
			};
			return e && (t.idToken = e), t;
		}
	}, hx = class {
		constructor(e, t, n, r, i = !1) {
			this.auth = e, this.resolver = n, this.user = r, this.bypassAuthState = i, this.pendingPromise = null, this.eventManager = null, this.filter = Array.isArray(t) ? t : [t];
		}
		execute() {
			return new Promise(async (e, t) => {
				this.pendingPromise = {
					resolve: e,
					reject: t
				};
				try {
					this.eventManager = await this.resolver._initialize(this.auth), await this.onExecution(), this.eventManager.registerConsumer(this);
				} catch (e) {
					this.reject(e);
				}
			});
		}
		async onAuthEvent(e) {
			let { urlResponse: t, sessionId: n, postBody: r, tenantId: i, error: a, type: o } = e;
			if (a) {
				this.reject(a);
				return;
			}
			let s = {
				auth: this.auth,
				requestUri: t,
				sessionId: n,
				tenantId: i || void 0,
				postBody: r || void 0,
				user: this.user,
				bypassAuthState: this.bypassAuthState
			};
			try {
				this.resolve(await this.getIdpTask(o)(s));
			} catch (e) {
				this.reject(e);
			}
		}
		onError(e) {
			this.reject(e);
		}
		getIdpTask(e) {
			switch (e) {
				case "signInViaPopup":
				case "signInViaRedirect": return jy;
				case "linkViaPopup":
				case "linkViaRedirect": return Ny;
				case "reauthViaPopup":
				case "reauthViaRedirect": return My;
				default: k_(this.auth, "internal-error");
			}
		}
		resolve(e) {
			F_(this.pendingPromise, "Pending promise was never set"), this.pendingPromise.resolve(e), this.unregisterAndCleanUp();
		}
		reject(e) {
			F_(this.pendingPromise, "Pending promise was never set"), this.pendingPromise.reject(e), this.unregisterAndCleanUp();
		}
		unregisterAndCleanUp() {
			this.eventManager && this.eventManager.unregisterConsumer(this), this.pendingPromise = null, this.cleanUp();
		}
	}, gx = new cb(2e3, 1e4), _x = class e extends hx {
		constructor(t, n, r, i, a) {
			super(t, n, i, a), this.provider = r, this.authWindow = null, this.pollId = null, e.currentPopupAction && e.currentPopupAction.cancel(), e.currentPopupAction = this;
		}
		async executeNotNull() {
			let e = await this.execute();
			return Q(e, this.auth, "internal-error"), e;
		}
		async onExecution() {
			F_(this.filter.length === 1, "Popup operations only handle one event");
			let e = py();
			this.authWindow = await this.resolver._openPopup(this.auth, this.provider, this.filter[0], e), this.authWindow.associatedEvent = e, this.resolver._originValidation(this.auth).catch((e) => {
				this.reject(e);
			}), this.resolver._isIframeWebStorageSupported(this.auth, (e) => {
				e || this.reject(A_(this.auth, "web-storage-unsupported"));
			}), this.pollUserCancellation();
		}
		get eventId() {
			return this.authWindow?.associatedEvent || null;
		}
		cancel() {
			this.reject(A_(this.auth, "cancelled-popup-request"));
		}
		cleanUp() {
			this.authWindow && this.authWindow.close(), this.pollId && window.clearTimeout(this.pollId), this.authWindow = null, this.pollId = null, e.currentPopupAction = null;
		}
		pollUserCancellation() {
			let e = () => {
				if (this.authWindow?.window?.closed) {
					this.pollId = window.setTimeout(() => {
						this.pollId = null, this.reject(A_(this.auth, "popup-closed-by-user"));
					}, 8e3);
					return;
				}
				this.pollId = window.setTimeout(e, gx.get());
			};
			e();
		}
	}, _x.currentPopupAction = null, vx = "pendingRedirect", yx = /* @__PURE__ */ new Map(), bx = class extends hx {
		constructor(e, t, n = !1) {
			super(e, [
				"signInViaRedirect",
				"linkViaRedirect",
				"reauthViaRedirect",
				"unknown"
			], t, void 0, n), this.eventId = null;
		}
		async execute() {
			let e = yx.get(this.auth._key());
			if (!e) {
				try {
					let t = await Py(this.resolver, this.auth) ? await super.execute() : null;
					e = () => Promise.resolve(t);
				} catch (t) {
					e = () => Promise.reject(t);
				}
				yx.set(this.auth._key(), e);
			}
			return this.bypassAuthState || yx.set(this.auth._key(), () => Promise.resolve(null)), e();
		}
		async onAuthEvent(e) {
			if (e.type === "signInViaRedirect") return super.onAuthEvent(e);
			if (e.type === "unknown") {
				this.resolve(null);
				return;
			}
			if (e.eventId) {
				let t = await this.auth._redirectUserForId(e.eventId);
				if (t) return this.user = t, super.onAuthEvent(e);
				this.resolve(null);
			}
		}
		async onExecution() {}
		cleanUp() {}
	}, xx = 600 * 1e3, Sx = class {
		constructor(e) {
			this.auth = e, this.cachedEventUids = /* @__PURE__ */ new Set(), this.consumers = /* @__PURE__ */ new Set(), this.queuedRedirectEvent = null, this.hasHandledPotentialRedirect = !1, this.lastProcessedEventTime = Date.now();
		}
		registerConsumer(e) {
			this.consumers.add(e), this.queuedRedirectEvent && this.isEventForConsumer(this.queuedRedirectEvent, e) && (this.sendToConsumer(this.queuedRedirectEvent, e), this.saveEventToCache(this.queuedRedirectEvent), this.queuedRedirectEvent = null);
		}
		unregisterConsumer(e) {
			this.consumers.delete(e);
		}
		onEvent(e) {
			if (this.hasEventBeenHandled(e)) return !1;
			let t = !1;
			return this.consumers.forEach((n) => {
				this.isEventForConsumer(e, n) && (t = !0, this.sendToConsumer(e, n), this.saveEventToCache(e));
			}), this.hasHandledPotentialRedirect || !Vy(e) ? t : (this.hasHandledPotentialRedirect = !0, t ||= (this.queuedRedirectEvent = e, !0), t);
		}
		sendToConsumer(e, t) {
			if (e.error && !By(e)) {
				let n = e.error.code?.split("auth/")[1] || "internal-error";
				t.onError(A_(this.auth, n));
			} else t.onAuthEvent(e);
		}
		isEventForConsumer(e, t) {
			let n = t.eventId === null || !!e.eventId && e.eventId === t.eventId;
			return t.filter.includes(e.type) && n;
		}
		hasEventBeenHandled(e) {
			return Date.now() - this.lastProcessedEventTime >= xx && this.cachedEventUids.clear(), this.cachedEventUids.has(zy(e));
		}
		saveEventToCache(e) {
			this.cachedEventUids.add(zy(e)), this.lastProcessedEventTime = Date.now();
		}
	}, Cx = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, wx = /^https?/, Tx = new cb(3e4, 6e4), Ex = null, Dx = new cb(5e3, 15e3), Ox = "__/auth/iframe", kx = "emulator/auth/iframe", Ax = {
		style: {
			position: "absolute",
			top: "-100px",
			width: "1px",
			height: "1px"
		},
		"aria-hidden": "true",
		tabindex: "-1"
	}, jx = /* @__PURE__ */ new Map([
		["identitytoolkit.googleapis.com", "p"],
		["staging-identitytoolkit.sandbox.googleapis.com", "s"],
		["test-identitytoolkit.sandbox.googleapis.com", "t"]
	]), Mx = {
		location: "yes",
		resizable: "yes",
		statusbar: "yes",
		toolbar: "no"
	}, Nx = 500, Px = 600, Fx = "_blank", Ix = "http://localhost", Lx = class {
		constructor(e) {
			this.window = e, this.associatedEvent = null;
		}
		close() {
			if (this.window) try {
				this.window.close();
			} catch {}
		}
	}, Rx = "__/auth/handler", zx = "emulator/auth/handler", Bx = "fac", Vx = "webStorageSupport", Hx = class {
		constructor() {
			this.eventManagers = {}, this.iframes = {}, this.originValidationPromises = {}, this._redirectPersistence = ex, this._completeRedirectFn = Ry, this._overrideRedirectResult = Fy;
		}
		async _openPopup(e, t, n, r) {
			return F_(this.eventManagers[e._key()]?.manager, "_initialize() not called before _openPopup()"), Xy(e, await Qy(e, t, n, I_(), r), py());
		}
		async _openRedirect(e, t, n, r) {
			return await this._originValidation(e), hy(await Qy(e, t, n, I_(), r)), new Promise(() => {});
		}
		_initialize(e) {
			let t = e._key();
			if (this.eventManagers[t]) {
				let { manager: e, promise: n } = this.eventManagers[t];
				return e ? Promise.resolve(e) : (F_(n, "If manager is not set, promise should be"), n);
			}
			let n = this.initAndGetManager(e);
			return this.eventManagers[t] = { promise: n }, n.catch(() => {
				delete this.eventManagers[t];
			}), n;
		}
		async initAndGetManager(e) {
			let t = await Yy(e), n = new Sx(e);
			return t.register("authEvent", (t) => (Q(t?.authEvent, e, "invalid-auth-event"), { status: n.onEvent(t.authEvent) ? "ACK" : "ERROR" }), gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER), this.eventManagers[e._key()] = { manager: n }, this.iframes[e._key()] = t, n;
		}
		_isIframeWebStorageSupported(e, t) {
			this.iframes[e._key()].send(Vx, { type: Vx }, (n) => {
				let r = n?.[0]?.[Vx];
				r !== void 0 && t(!!r), k_(e, "internal-error");
			}, gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER);
		}
		_originValidation(e) {
			let t = e._key();
			return this.originValidationPromises[t] || (this.originValidationPromises[t] = Uy(e)), this.originValidationPromises[t];
		}
		get _shouldInitProactively() {
			return Ev() || _v() || Cv();
		}
	}, Ux = Hx, Wx = class {
		constructor(e) {
			this.factorId = e;
		}
		_process(e, t, n) {
			switch (t.type) {
				case "enroll": return this._finalizeEnroll(e, t.credential, n);
				case "signin": return this._finalizeSignIn(e, t.credential);
				default: return P_("unexpected MultiFactorSessionType");
			}
		}
	}, Gx = class e extends Wx {
		constructor(e) {
			super("phone"), this.credential = e;
		}
		static _fromCredential(t) {
			return new e(t);
		}
		_finalizeEnroll(e, t, n) {
			return ly(e, {
				idToken: t,
				displayName: n,
				phoneVerificationInfo: this.credential._makeVerificationRequest()
			});
		}
		_finalizeSignIn(e, t) {
			return Dy(e, {
				mfaPendingCredential: t,
				phoneVerificationInfo: this.credential._makeVerificationRequest()
			});
		}
	}, Kx = class {
		constructor() {}
		static assertion(e) {
			return Gx._fromCredential(e);
		}
	}, Kx.FACTOR_ID = "phone", qx = class {
		static assertionForEnrollment(e, t) {
			return Jx._fromSecret(e, t);
		}
		static assertionForSignIn(e, t) {
			return Jx._fromEnrollmentId(e, t);
		}
		static async generateSecret(e) {
			let t = e;
			Q(t.user?.auth !== void 0, "internal-error");
			let n = await uy(t.user.auth, {
				idToken: t.credential,
				totpEnrollmentInfo: {}
			});
			return Yx._fromStartTotpMfaEnrollmentResponse(n, t.user.auth);
		}
	}, qx.FACTOR_ID = "totp", Jx = class e extends Wx {
		constructor(e, t, n) {
			super("totp"), this.otp = e, this.enrollmentId = t, this.secret = n;
		}
		static _fromSecret(t, n) {
			return new e(n, void 0, t);
		}
		static _fromEnrollmentId(t, n) {
			return new e(n, t);
		}
		async _finalizeEnroll(e, t, n) {
			return Q(this.secret !== void 0, e, "argument-error"), dy(e, {
				idToken: t,
				displayName: n,
				totpVerificationInfo: this.secret._makeTotpVerificationInfo(this.otp)
			});
		}
		async _finalizeSignIn(e, t) {
			Q(this.enrollmentId !== void 0 && this.otp !== void 0, e, "argument-error");
			let n = { verificationCode: this.otp };
			return Oy(e, {
				mfaPendingCredential: t,
				mfaEnrollmentId: this.enrollmentId,
				totpVerificationInfo: n
			});
		}
	}, Yx = class e {
		constructor(e, t, n, r, i, a, o) {
			this.sessionInfo = a, this.auth = o, this.secretKey = e, this.hashingAlgorithm = t, this.codeLength = n, this.codeIntervalSeconds = r, this.enrollmentCompletionDeadline = i;
		}
		static _fromStartTotpMfaEnrollmentResponse(t, n) {
			return new e(t.totpSessionInfo.sharedSecretKey, t.totpSessionInfo.hashingAlgorithm, t.totpSessionInfo.verificationCodeLength, t.totpSessionInfo.periodSec, new Date(t.totpSessionInfo.finalizeEnrollmentTime).toUTCString(), t.totpSessionInfo.sessionInfo, n);
		}
		_makeTotpVerificationInfo(e) {
			return {
				sessionInfo: this.sessionInfo,
				verificationCode: e
			};
		}
		generateQrCodeUrl(e, t) {
			let n = !1;
			return (eb(e) || eb(t)) && (n = !0), n && (eb(e) && (e = this.auth.currentUser?.email || "unknownuser"), eb(t) && (t = this.auth.name)), `otpauth://totp/${t}:${e}?secret=${this.secretKey}&issuer=${t}&algorithm=${this.hashingAlgorithm}&digits=${this.codeLength}`;
		}
	}, Xx = "@firebase/auth", Zx = "1.7.9", Qx = class {
		constructor(e) {
			this.auth = e, this.internalListeners = /* @__PURE__ */ new Map();
		}
		getUid() {
			return this.assertAuthConfigured(), this.auth.currentUser?.uid || null;
		}
		async getToken(e) {
			return this.assertAuthConfigured(), await this.auth._initializationPromise, this.auth.currentUser ? { accessToken: await this.auth.currentUser.getIdToken(e) } : null;
		}
		addAuthTokenListener(e) {
			if (this.assertAuthConfigured(), this.internalListeners.has(e)) return;
			let t = this.auth.onIdTokenChanged((t) => {
				e(t?.stsTokenManager.accessToken || null);
			});
			this.internalListeners.set(e, t), this.updateProactiveRefresh();
		}
		removeAuthTokenListener(e) {
			this.assertAuthConfigured();
			let t = this.internalListeners.get(e);
			t && (this.internalListeners.delete(e), t(), this.updateProactiveRefresh());
		}
		assertAuthConfigured() {
			Q(this.auth._initializationPromise, "dependent-sdk-initialized-before-auth");
		}
		updateProactiveRefresh() {
			this.internalListeners.size > 0 ? this.auth._startProactiveRefresh() : this.auth._stopProactiveRefresh();
		}
	}, $x = c_("authIdTokenMaxAge") || 300, eS = null, tS = (e) => async (t) => {
		let n = t && await t.getIdTokenResult(), r = n && ((/* @__PURE__ */ new Date()).getTime() - Date.parse(n.issuedAtTime)) / 1e3;
		if (r && r > $x) return;
		let i = n?.token;
		eS !== i && (eS = i, await fetch(e, {
			method: i ? "POST" : "DELETE",
			headers: i ? { Authorization: `Bearer ${i}` } : {}
		}));
	}, Av({
		loadJS(e) {
			return new Promise((t, n) => {
				let r = document.createElement("script");
				r.setAttribute("src", e), r.onload = t, r.onerror = (e) => {
					let t = A_("internal-error");
					t.customData = e, n(t);
				}, r.type = "text/javascript", r.charset = "UTF-8", ib().appendChild(r);
			});
		},
		gapiScript: "https://apis.google.com/js/api.js",
		recaptchaV2Script: "https://www.google.com/recaptcha/api.js",
		recaptchaEnterpriseScript: "https://www.google.com/recaptcha/enterprise.js?render="
	}), nb("Browser");
})), rS = t((() => {
	nS(), an(), x_();
})), iS = t((() => {
	rS();
}));
//#endregion
//#region node_modules/@firebase/storage/node_modules/@firebase/util/dist/index.esm2017.js
function aS() {
	if (typeof self < "u") return self;
	if (typeof window < "u") return window;
	if (typeof global < "u") return global;
	throw Error("Unable to locate global object.");
}
function oS(e, t) {
	if (e.uid) throw Error("The \"uid\" field is no longer supported by mockUserToken. Please use \"sub\" instead for Firebase Auth User ID.");
	let n = {
		alg: "none",
		type: "JWT"
	}, r = t || "demo-project", i = e.iat || 0, a = e.sub || e.user_id;
	if (!a) throw Error("mockUserToken must contain 'sub' or 'user_id' field!");
	let o = Object.assign({
		iss: `https://securetoken.google.com/${r}`,
		aud: r,
		iat: i,
		exp: i + 3600,
		auth_time: i,
		sub: a,
		user_id: a,
		firebase: {
			sign_in_provider: "custom",
			identities: {}
		}
	}, e);
	return [
		mS(JSON.stringify(n)),
		mS(JSON.stringify(o)),
		""
	].join(".");
}
function sS(e, t) {
	return e.replace(TS, (e, n) => {
		let r = t[n];
		return r == null ? `<${n}?>` : String(r);
	});
}
function cS(e) {
	return e && e._delegate ? e._delegate : e;
}
var lS, uS, dS, fS, pS, mS, hS, gS, _S, vS, yS, bS, xS, SS, CS, wS, TS, ES = t((() => {
	lS = function(e) {
		let t = [], n = 0;
		for (let r = 0; r < e.length; r++) {
			let i = e.charCodeAt(r);
			i < 128 ? t[n++] = i : i < 2048 ? (t[n++] = i >> 6 | 192, t[n++] = i & 63 | 128) : (i & 64512) == 55296 && r + 1 < e.length && (e.charCodeAt(r + 1) & 64512) == 56320 ? (i = 65536 + ((i & 1023) << 10) + (e.charCodeAt(++r) & 1023), t[n++] = i >> 18 | 240, t[n++] = i >> 12 & 63 | 128, t[n++] = i >> 6 & 63 | 128, t[n++] = i & 63 | 128) : (t[n++] = i >> 12 | 224, t[n++] = i >> 6 & 63 | 128, t[n++] = i & 63 | 128);
		}
		return t;
	}, uS = function(e) {
		let t = [], n = 0, r = 0;
		for (; n < e.length;) {
			let i = e[n++];
			if (i < 128) t[r++] = String.fromCharCode(i);
			else if (i > 191 && i < 224) {
				let a = e[n++];
				t[r++] = String.fromCharCode((i & 31) << 6 | a & 63);
			} else if (i > 239 && i < 365) {
				let a = e[n++], o = e[n++], s = e[n++], c = ((i & 7) << 18 | (a & 63) << 12 | (o & 63) << 6 | s & 63) - 65536;
				t[r++] = String.fromCharCode(55296 + (c >> 10)), t[r++] = String.fromCharCode(56320 + (c & 1023));
			} else {
				let a = e[n++], o = e[n++];
				t[r++] = String.fromCharCode((i & 15) << 12 | (a & 63) << 6 | o & 63);
			}
		}
		return t.join("");
	}, dS = {
		byteToCharMap_: null,
		charToByteMap_: null,
		byteToCharMapWebSafe_: null,
		charToByteMapWebSafe_: null,
		ENCODED_VALS_BASE: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
		get ENCODED_VALS() {
			return this.ENCODED_VALS_BASE + "+/=";
		},
		get ENCODED_VALS_WEBSAFE() {
			return this.ENCODED_VALS_BASE + "-_.";
		},
		HAS_NATIVE_SUPPORT: typeof atob == "function",
		encodeByteArray(e, t) {
			if (!Array.isArray(e)) throw Error("encodeByteArray takes an array as a parameter");
			this.init_();
			let n = t ? this.byteToCharMapWebSafe_ : this.byteToCharMap_, r = [];
			for (let t = 0; t < e.length; t += 3) {
				let i = e[t], a = t + 1 < e.length, o = a ? e[t + 1] : 0, s = t + 2 < e.length, c = s ? e[t + 2] : 0, l = i >> 2, u = (i & 3) << 4 | o >> 4, d = (o & 15) << 2 | c >> 6, f = c & 63;
				s || (f = 64, a || (d = 64)), r.push(n[l], n[u], n[d], n[f]);
			}
			return r.join("");
		},
		encodeString(e, t) {
			return this.HAS_NATIVE_SUPPORT && !t ? btoa(e) : this.encodeByteArray(lS(e), t);
		},
		decodeString(e, t) {
			return this.HAS_NATIVE_SUPPORT && !t ? atob(e) : uS(this.decodeStringToByteArray(e, t));
		},
		decodeStringToByteArray(e, t) {
			this.init_();
			let n = t ? this.charToByteMapWebSafe_ : this.charToByteMap_, r = [];
			for (let t = 0; t < e.length;) {
				let i = n[e.charAt(t++)], a = t < e.length ? n[e.charAt(t)] : 0;
				++t;
				let o = t < e.length ? n[e.charAt(t)] : 64;
				++t;
				let s = t < e.length ? n[e.charAt(t)] : 64;
				if (++t, i == null || a == null || o == null || s == null) throw new fS();
				let c = i << 2 | a >> 4;
				if (r.push(c), o !== 64) {
					let e = a << 4 & 240 | o >> 2;
					if (r.push(e), s !== 64) {
						let e = o << 6 & 192 | s;
						r.push(e);
					}
				}
			}
			return r;
		},
		init_() {
			if (!this.byteToCharMap_) {
				this.byteToCharMap_ = {}, this.charToByteMap_ = {}, this.byteToCharMapWebSafe_ = {}, this.charToByteMapWebSafe_ = {};
				for (let e = 0; e < this.ENCODED_VALS.length; e++) this.byteToCharMap_[e] = this.ENCODED_VALS.charAt(e), this.charToByteMap_[this.byteToCharMap_[e]] = e, this.byteToCharMapWebSafe_[e] = this.ENCODED_VALS_WEBSAFE.charAt(e), this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[e]] = e, e >= this.ENCODED_VALS_BASE.length && (this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(e)] = e, this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(e)] = e);
			}
		}
	}, fS = class extends Error {
		constructor() {
			super(...arguments), this.name = "DecodeBase64StringError";
		}
	}, pS = function(e) {
		let t = lS(e);
		return dS.encodeByteArray(t, !0);
	}, mS = function(e) {
		return pS(e).replace(/\./g, "");
	}, hS = function(e) {
		try {
			return dS.decodeString(e, !0);
		} catch (e) {
			console.error("base64Decode failed: ", e);
		}
		return null;
	}, gS = () => aS().__FIREBASE_DEFAULTS__, _S = () => {
		if (typeof process > "u" || process.env === void 0) return;
		let e = process.env.__FIREBASE_DEFAULTS__;
		if (e) return JSON.parse(e);
	}, vS = () => {
		if (typeof document > "u") return;
		let e;
		try {
			e = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
		} catch {
			return;
		}
		let t = e && hS(e[1]);
		return t && JSON.parse(t);
	}, yS = () => {
		try {
			return gS() || _S() || vS();
		} catch (e) {
			console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);
			return;
		}
	}, bS = (e) => yS()?.emulatorHosts?.[e], xS = (e) => {
		let t = bS(e);
		if (!t) return;
		let n = t.lastIndexOf(":");
		if (n <= 0 || n + 1 === t.length) throw Error(`Invalid host ${t} with no separate hostname and port!`);
		let r = parseInt(t.substring(n + 1), 10);
		return t[0] === "[" ? [t.substring(1, n - 1), r] : [t.substring(0, n), r];
	}, SS = "FirebaseError", CS = class e extends Error {
		constructor(t, n, r) {
			super(n), this.code = t, this.customData = r, this.name = SS, Object.setPrototypeOf(this, e.prototype), Error.captureStackTrace && Error.captureStackTrace(this, wS.prototype.create);
		}
	}, wS = class {
		constructor(e, t, n) {
			this.service = e, this.serviceName = t, this.errors = n;
		}
		create(e, ...t) {
			let n = t[0] || {}, r = `${this.service}/${e}`, i = this.errors[e], a = i ? sS(i, n) : "Error", o = `${this.serviceName}: ${a} (${r}).`;
			return new CS(r, o, n);
		}
	}, TS = /\{\$([^}]+)}/g;
})), DS, OS = t((() => {
	DS = class {
		constructor(e, t, n) {
			this.name = e, this.instanceFactory = t, this.type = n, this.multipleInstances = !1, this.serviceProps = {}, this.instantiationMode = "LAZY", this.onInstanceCreated = null;
		}
		setInstantiationMode(e) {
			return this.instantiationMode = e, this;
		}
		setMultipleInstances(e) {
			return this.multipleInstances = e, this;
		}
		setServiceProps(e) {
			return this.serviceProps = e, this;
		}
		setInstanceCreatedCallback(e) {
			return this.onInstanceCreated = e, this;
		}
	};
}));
//#endregion
//#region node_modules/@firebase/storage/dist/index.esm2017.js
function kS(e) {
	return "storage/" + e;
}
function AS() {
	return new sC(cC.UNKNOWN, "An unknown error occurred, please check the error payload for server response.");
}
function jS() {
	return new sC(cC.RETRY_LIMIT_EXCEEDED, "Max retry time for operation exceeded, please try again.");
}
function MS() {
	return new sC(cC.CANCELED, "User canceled the upload/download.");
}
function NS(e) {
	return new sC(cC.INVALID_URL, "Invalid URL '" + e + "'.");
}
function PS(e) {
	return new sC(cC.INVALID_DEFAULT_BUCKET, "Invalid default bucket '" + e + "'.");
}
function FS(e) {
	return new sC(cC.INVALID_ARGUMENT, e);
}
function IS() {
	return new sC(cC.APP_DELETED, "The Firebase app was deleted.");
}
function LS(e) {
	return new sC(cC.INVALID_ROOT_OPERATION, "The operation '" + e + "' cannot be performed on a root reference, create a non-root reference using child, such as .child('file.png').");
}
function RS(e, t, n) {
	let r = 1, i = null, a = null, o = !1, s = 0;
	function c() {
		return s === 2;
	}
	let l = !1;
	function u(...e) {
		l || (l = !0, t.apply(null, e));
	}
	function d(t) {
		i = setTimeout(() => {
			i = null, e(p, c());
		}, t);
	}
	function f() {
		a && clearTimeout(a);
	}
	function p(e, ...t) {
		if (l) {
			f();
			return;
		}
		if (e) {
			f(), u.call(null, e, ...t);
			return;
		}
		if (c() || o) {
			f(), u.call(null, e, ...t);
			return;
		}
		r < 64 && (r *= 2);
		let n;
		s === 1 ? (s = 2, n = 0) : n = (r + Math.random()) * 1e3, d(n);
	}
	let m = !1;
	function h(e) {
		m || (m = !0, f(), !l && (i === null ? e || (s = 1) : (e || (s = 2), clearTimeout(i), d(0))));
	}
	return d(0), a = setTimeout(() => {
		o = !0, h(!0);
	}, n), h;
}
function zS(e) {
	e(!1);
}
function BS(e) {
	return e !== void 0;
}
function VS(e, t, n, r) {
	if (r < t) throw FS(`Invalid value for '${e}'. Expected ${t} or greater.`);
	if (r > n) throw FS(`Invalid value for '${e}'. Expected ${n} or less.`);
}
function HS(e) {
	let t = encodeURIComponent, n = "?";
	for (let r in e) if (e.hasOwnProperty(r)) {
		let i = t(r) + "=" + t(e[r]);
		n = n + i + "&";
	}
	return n = n.slice(0, -1), n;
}
function US(e, t) {
	let n = e >= 500 && e < 600, r = [408, 429].indexOf(e) !== -1, i = t.indexOf(e) !== -1;
	return n || r || i;
}
function WS(e, t) {
	t !== null && t.length > 0 && (e.Authorization = "Firebase " + t);
}
function GS(e, t) {
	e["X-Firebase-Storage-Version"] = "webjs/" + (t ?? "AppManager");
}
function KS(e, t) {
	t && (e["X-Firebase-GMPID"] = t);
}
function qS(e, t) {
	t !== null && (e["X-Firebase-AppCheck"] = t);
}
function JS(e, t, n, r, i, a, o = !0) {
	let s = HS(e.urlParams), c = e.url + s, l = Object.assign({}, e.headers);
	return KS(l, t), WS(l, n), GS(l, a), qS(l, r), new fC(c, e.method, l, e.body, e.successCodes, e.additionalRetryCodes, e.handler, e.errorHandler, e.timeout, e.progressCallback, i, o);
}
function YS(e) {
	if (e.length === 0) return null;
	let t = e.lastIndexOf("/");
	return t === -1 ? "" : e.slice(0, t);
}
function XS(e) {
	let t = e.lastIndexOf("/", e.length - 2);
	return t === -1 ? e : e.slice(t + 1);
}
function ZS(e, t) {
	let n = t?.[iC];
	return n == null ? null : lC.makeFromBucketSpec(n, e);
}
function QS(e, t, n, r = {}) {
	e.host = `${t}:${n}`, e._protocol = "http";
	let { mockUserToken: i } = r;
	i && (e._overrideAuthToken = typeof i == "string" ? i : oS(i, e.app.options.projectId));
}
function $S(e = nt(), t) {
	e = cS(e);
	let n = Qe(e, vC).getImmediate({ identifier: t }), r = xS("storage");
	return r && eC(n, ...r), n;
}
function eC(e, t, n, r = {}) {
	QS(e, t, n, r);
}
function tC(e, { instanceIdentifier: t }) {
	let n = e.getProvider("app").getImmediate(), r = e.getProvider("auth-internal"), i = e.getProvider("app-check-internal");
	return new hC(n, r, i, t, Yt);
}
function nC() {
	Ze(new DS(vC, tC, "PUBLIC").setMultipleInstances(!0)), rt(gC, _C, ""), rt(gC, _C, "esm2017");
}
var rC, iC, aC, oC, sC, cC, lC, uC, dC, fC, pC, mC, hC, gC, _C, vC, yC = t((() => {
	an(), ES(), OS(), rC = "firebasestorage.googleapis.com", iC = "storageBucket", aC = 120 * 1e3, oC = 600 * 1e3, sC = class e extends CS {
		constructor(t, n, r = 0) {
			super(kS(t), `Firebase Storage: ${n} (${kS(t)})`), this.status_ = r, this.customData = { serverResponse: null }, this._baseMessage = this.message, Object.setPrototypeOf(this, e.prototype);
		}
		get status() {
			return this.status_;
		}
		set status(e) {
			this.status_ = e;
		}
		_codeEquals(e) {
			return kS(e) === this.code;
		}
		get serverResponse() {
			return this.customData.serverResponse;
		}
		set serverResponse(e) {
			this.customData.serverResponse = e, this.customData.serverResponse ? this.message = `${this._baseMessage}\n${this.customData.serverResponse}` : this.message = this._baseMessage;
		}
	}, (function(e) {
		e.UNKNOWN = "unknown", e.OBJECT_NOT_FOUND = "object-not-found", e.BUCKET_NOT_FOUND = "bucket-not-found", e.PROJECT_NOT_FOUND = "project-not-found", e.QUOTA_EXCEEDED = "quota-exceeded", e.UNAUTHENTICATED = "unauthenticated", e.UNAUTHORIZED = "unauthorized", e.UNAUTHORIZED_APP = "unauthorized-app", e.RETRY_LIMIT_EXCEEDED = "retry-limit-exceeded", e.INVALID_CHECKSUM = "invalid-checksum", e.CANCELED = "canceled", e.INVALID_EVENT_NAME = "invalid-event-name", e.INVALID_URL = "invalid-url", e.INVALID_DEFAULT_BUCKET = "invalid-default-bucket", e.NO_DEFAULT_BUCKET = "no-default-bucket", e.CANNOT_SLICE_BLOB = "cannot-slice-blob", e.SERVER_FILE_WRONG_SIZE = "server-file-wrong-size", e.NO_DOWNLOAD_URL = "no-download-url", e.INVALID_ARGUMENT = "invalid-argument", e.INVALID_ARGUMENT_COUNT = "invalid-argument-count", e.APP_DELETED = "app-deleted", e.INVALID_ROOT_OPERATION = "invalid-root-operation", e.INVALID_FORMAT = "invalid-format", e.INTERNAL_ERROR = "internal-error", e.UNSUPPORTED_ENVIRONMENT = "unsupported-environment";
	})(cC ||= {}), lC = class e {
		constructor(e, t) {
			this.bucket = e, this.path_ = t;
		}
		get path() {
			return this.path_;
		}
		get isRoot() {
			return this.path.length === 0;
		}
		fullServerUrl() {
			let e = encodeURIComponent;
			return "/b/" + e(this.bucket) + "/o/" + e(this.path);
		}
		bucketOnlyServerUrl() {
			return "/b/" + encodeURIComponent(this.bucket) + "/o";
		}
		static makeFromBucketSpec(t, n) {
			let r;
			try {
				r = e.makeFromUrl(t, n);
			} catch {
				return new e(t, "");
			}
			if (r.path === "") return r;
			throw PS(t);
		}
		static makeFromUrl(t, n) {
			let r = null, i = "([A-Za-z0-9.\\-_]+)";
			function a(e) {
				e.path.charAt(e.path.length - 1) === "/" && (e.path_ = e.path_.slice(0, -1));
			}
			let o = /* @__PURE__ */ RegExp("^gs://([A-Za-z0-9.\\-_]+)(/(.*))?$", "i"), s = {
				bucket: 1,
				path: 3
			};
			function c(e) {
				e.path_ = decodeURIComponent(e.path);
			}
			let l = n.replace(/[.]/g, "\\."), u = RegExp(`^https?://${l}/v[A-Za-z0-9_]+/b/${i}/o(/([^?#]*).*)?\$`, "i"), d = {
				bucket: 1,
				path: 3
			}, f = RegExp(`^https?://${n === rC ? "(?:storage.googleapis.com|storage.cloud.google.com)" : n}/${i}/([^?#]*)`, "i"), p = [
				{
					regex: o,
					indices: s,
					postModify: a
				},
				{
					regex: u,
					indices: d,
					postModify: c
				},
				{
					regex: f,
					indices: {
						bucket: 1,
						path: 2
					},
					postModify: c
				}
			];
			for (let n = 0; n < p.length; n++) {
				let i = p[n], a = i.regex.exec(t);
				if (a) {
					let t = a[i.indices.bucket], n = a[i.indices.path];
					n ||= "", r = new e(t, n), i.postModify(r);
					break;
				}
			}
			if (r == null) throw NS(t);
			return r;
		}
	}, uC = class {
		constructor(e) {
			this.promise_ = Promise.reject(e);
		}
		getPromise() {
			return this.promise_;
		}
		cancel(e = !1) {}
	}, (function(e) {
		e[e.NO_ERROR = 0] = "NO_ERROR", e[e.NETWORK_ERROR = 1] = "NETWORK_ERROR", e[e.ABORT = 2] = "ABORT";
	})(dC ||= {}), fC = class {
		constructor(e, t, n, r, i, a, o, s, c, l, u, d = !0) {
			this.url_ = e, this.method_ = t, this.headers_ = n, this.body_ = r, this.successCodes_ = i, this.additionalRetryCodes_ = a, this.callback_ = o, this.errorCallback_ = s, this.timeout_ = c, this.progressCallback_ = l, this.connectionFactory_ = u, this.retry = d, this.pendingConnection_ = null, this.backoffId_ = null, this.canceled_ = !1, this.appDelete_ = !1, this.promise_ = new Promise((e, t) => {
				this.resolve_ = e, this.reject_ = t, this.start_();
			});
		}
		start_() {
			let e = (e, t) => {
				if (t) {
					e(!1, new pC(!1, null, !0));
					return;
				}
				let n = this.connectionFactory_();
				this.pendingConnection_ = n;
				let r = (e) => {
					let t = e.loaded, n = e.lengthComputable ? e.total : -1;
					this.progressCallback_ !== null && this.progressCallback_(t, n);
				};
				this.progressCallback_ !== null && n.addUploadProgressListener(r), n.send(this.url_, this.method_, this.body_, this.headers_).then(() => {
					this.progressCallback_ !== null && n.removeUploadProgressListener(r), this.pendingConnection_ = null;
					let t = n.getErrorCode() === dC.NO_ERROR, i = n.getStatus();
					if (!t || US(i, this.additionalRetryCodes_) && this.retry) {
						let t = n.getErrorCode() === dC.ABORT;
						e(!1, new pC(!1, null, t));
						return;
					}
					let a = this.successCodes_.indexOf(i) !== -1;
					e(!0, new pC(a, n));
				});
			}, t = (e, t) => {
				let n = this.resolve_, r = this.reject_, i = t.connection;
				if (t.wasSuccessCode) try {
					let e = this.callback_(i, i.getResponse());
					BS(e) ? n(e) : n();
				} catch (e) {
					r(e);
				}
				else if (i !== null) {
					let e = AS();
					e.serverResponse = i.getErrorText(), this.errorCallback_ ? r(this.errorCallback_(i, e)) : r(e);
				} else t.canceled ? r(this.appDelete_ ? IS() : MS()) : r(jS());
			};
			this.canceled_ ? t(!1, new pC(!1, null, !0)) : this.backoffId_ = RS(e, t, this.timeout_);
		}
		getPromise() {
			return this.promise_;
		}
		cancel(e) {
			this.canceled_ = !0, this.appDelete_ = e || !1, this.backoffId_ !== null && zS(this.backoffId_), this.pendingConnection_ !== null && this.pendingConnection_.abort();
		}
	}, pC = class {
		constructor(e, t, n) {
			this.wasSuccessCode = e, this.connection = t, this.canceled = !!n;
		}
	}, mC = class e {
		constructor(e, t) {
			this._service = e, t instanceof lC ? this._location = t : this._location = lC.makeFromUrl(t, e.host);
		}
		toString() {
			return "gs://" + this._location.bucket + "/" + this._location.path;
		}
		_newRef(t, n) {
			return new e(t, n);
		}
		get root() {
			let e = new lC(this._location.bucket, "");
			return this._newRef(this._service, e);
		}
		get bucket() {
			return this._location.bucket;
		}
		get fullPath() {
			return this._location.path;
		}
		get name() {
			return XS(this._location.path);
		}
		get storage() {
			return this._service;
		}
		get parent() {
			let t = YS(this._location.path);
			if (t === null) return null;
			let n = new lC(this._location.bucket, t);
			return new e(this._service, n);
		}
		_throwIfRoot(e) {
			if (this._location.path === "") throw LS(e);
		}
	}, hC = class {
		constructor(e, t, n, r, i) {
			this.app = e, this._authProvider = t, this._appCheckProvider = n, this._url = r, this._firebaseVersion = i, this._bucket = null, this._host = rC, this._protocol = "https", this._appId = null, this._deleted = !1, this._maxOperationRetryTime = aC, this._maxUploadRetryTime = oC, this._requests = /* @__PURE__ */ new Set(), r == null ? this._bucket = ZS(this._host, this.app.options) : this._bucket = lC.makeFromBucketSpec(r, this._host);
		}
		get host() {
			return this._host;
		}
		set host(e) {
			this._host = e, this._url == null ? this._bucket = ZS(e, this.app.options) : this._bucket = lC.makeFromBucketSpec(this._url, e);
		}
		get maxUploadRetryTime() {
			return this._maxUploadRetryTime;
		}
		set maxUploadRetryTime(e) {
			VS("time", 0, Infinity, e), this._maxUploadRetryTime = e;
		}
		get maxOperationRetryTime() {
			return this._maxOperationRetryTime;
		}
		set maxOperationRetryTime(e) {
			VS("time", 0, Infinity, e), this._maxOperationRetryTime = e;
		}
		async _getAuthToken() {
			if (this._overrideAuthToken) return this._overrideAuthToken;
			let e = this._authProvider.getImmediate({ optional: !0 });
			if (e) {
				let t = await e.getToken();
				if (t !== null) return t.accessToken;
			}
			return null;
		}
		async _getAppCheckToken() {
			let e = this._appCheckProvider.getImmediate({ optional: !0 });
			return e ? (await e.getToken()).token : null;
		}
		_delete() {
			return this._deleted || (this._deleted = !0, this._requests.forEach((e) => e.cancel()), this._requests.clear()), Promise.resolve();
		}
		_makeStorageReference(e) {
			return new mC(this, e);
		}
		_makeRequest(e, t, n, r, i = !0) {
			if (this._deleted) return new uC(IS());
			{
				let a = JS(e, this._appId, n, r, t, this._firebaseVersion, i);
				return this._requests.add(a), a.getPromise().then(() => this._requests.delete(a), () => this._requests.delete(a)), a;
			}
		}
		async makeRequestWithTokens(e, t) {
			let [n, r] = await Promise.all([this._getAuthToken(), this._getAppCheckToken()]);
			return this._makeRequest(e, t, n, r).getPromise();
		}
	}, gC = "@firebase/storage", _C = "0.13.2", vC = "storage", nC();
})), bC = t((() => {
	yC();
})), xC, $, SC, CC, wC, TC, EC, DC = t((() => {
	xC = [], (function(e) {
		e[e.DEBUG = 0] = "DEBUG", e[e.VERBOSE = 1] = "VERBOSE", e[e.INFO = 2] = "INFO", e[e.WARN = 3] = "WARN", e[e.ERROR = 4] = "ERROR", e[e.SILENT = 5] = "SILENT";
	})($ ||= {}), SC = {
		debug: $.DEBUG,
		verbose: $.VERBOSE,
		info: $.INFO,
		warn: $.WARN,
		error: $.ERROR,
		silent: $.SILENT
	}, CC = $.INFO, wC = {
		[$.DEBUG]: "log",
		[$.VERBOSE]: "log",
		[$.INFO]: "info",
		[$.WARN]: "warn",
		[$.ERROR]: "error"
	}, TC = (e, t, ...n) => {
		if (t < e.logLevel) return;
		let r = (/* @__PURE__ */ new Date()).toISOString(), i = wC[t];
		if (i) console[i](`[${r}]  ${e.name}:`, ...n);
		else throw Error(`Attempted to log a message with an invalid logType (value: ${t})`);
	}, EC = class {
		constructor(e) {
			this.name = e, this._logLevel = CC, this._logHandler = TC, this._userLogHandler = null, xC.push(this);
		}
		get logLevel() {
			return this._logLevel;
		}
		set logLevel(e) {
			if (!(e in $)) throw TypeError(`Invalid value "${e}" assigned to \`logLevel\``);
			this._logLevel = e;
		}
		setLogLevel(e) {
			this._logLevel = typeof e == "string" ? SC[e] : e;
		}
		get logHandler() {
			return this._logHandler;
		}
		set logHandler(e) {
			if (typeof e != "function") throw TypeError("Value assigned to `logHandler` must be a function");
			this._logHandler = e;
		}
		get userLogHandler() {
			return this._userLogHandler;
		}
		set userLogHandler(e) {
			this._userLogHandler = e;
		}
		debug(...e) {
			this._userLogHandler && this._userLogHandler(this, $.DEBUG, ...e), this._logHandler(this, $.DEBUG, ...e);
		}
		log(...e) {
			this._userLogHandler && this._userLogHandler(this, $.VERBOSE, ...e), this._logHandler(this, $.VERBOSE, ...e);
		}
		info(...e) {
			this._userLogHandler && this._userLogHandler(this, $.INFO, ...e), this._logHandler(this, $.INFO, ...e);
		}
		warn(...e) {
			this._userLogHandler && this._userLogHandler(this, $.WARN, ...e), this._logHandler(this, $.WARN, ...e);
		}
		error(...e) {
			this._userLogHandler && this._userLogHandler(this, $.ERROR, ...e), this._logHandler(this, $.ERROR, ...e);
		}
	};
}));
//#endregion
//#region node_modules/@firebase/analytics/node_modules/@firebase/util/dist/index.esm2017.js
function OC() {
	let e = typeof chrome == "object" ? chrome.runtime : typeof browser == "object" ? browser.runtime : void 0;
	return typeof e == "object" && e.id !== void 0;
}
function kC() {
	try {
		return typeof indexedDB == "object";
	} catch {
		return !1;
	}
}
function AC() {
	return new Promise((e, t) => {
		try {
			let n = !0, r = "validate-browser-context-for-indexeddb-analytics-module", i = self.indexedDB.open(r);
			i.onsuccess = () => {
				i.result.close(), n || self.indexedDB.deleteDatabase(r), e(!0);
			}, i.onupgradeneeded = () => {
				n = !1;
			}, i.onerror = () => {
				t(i.error?.message || "");
			};
		} catch (e) {
			t(e);
		}
	});
}
function jC() {
	return !(typeof navigator > "u" || !navigator.cookieEnabled);
}
function MC(e, t) {
	return e.replace(BC, (e, n) => {
		let r = t[n];
		return r == null ? `<${n}?>` : String(r);
	});
}
function NC(e, t) {
	if (e === t) return !0;
	let n = Object.keys(e), r = Object.keys(t);
	for (let i of n) {
		if (!r.includes(i)) return !1;
		let n = e[i], a = t[i];
		if (PC(n) && PC(a)) {
			if (!NC(n, a)) return !1;
		} else if (n !== a) return !1;
	}
	for (let e of r) if (!n.includes(e)) return !1;
	return !0;
}
function PC(e) {
	return typeof e == "object" && !!e;
}
function FC(e, t = VC, n = HC) {
	let r = t * n ** +e, i = Math.round(WC * r * (Math.random() - .5) * 2);
	return Math.min(UC, r + i);
}
function IC(e) {
	return e && e._delegate ? e._delegate : e;
}
var LC, RC, zC, BC, VC, HC, UC, WC, GC = t((() => {
	LC = "FirebaseError", RC = class e extends Error {
		constructor(t, n, r) {
			super(n), this.code = t, this.customData = r, this.name = LC, Object.setPrototypeOf(this, e.prototype), Error.captureStackTrace && Error.captureStackTrace(this, zC.prototype.create);
		}
	}, zC = class {
		constructor(e, t, n) {
			this.service = e, this.serviceName = t, this.errors = n;
		}
		create(e, ...t) {
			let n = t[0] || {}, r = `${this.service}/${e}`, i = this.errors[e], a = i ? MC(i, n) : "Error", o = `${this.serviceName}: ${a} (${r}).`;
			return new RC(r, o, n);
		}
	}, BC = /\{\$([^}]+)}/g, VC = 1e3, HC = 2, UC = 14400 * 1e3, WC = .5;
})), KC, qC = t((() => {
	KC = class {
		constructor(e, t, n) {
			this.name = e, this.instanceFactory = t, this.type = n, this.multipleInstances = !1, this.serviceProps = {}, this.instantiationMode = "LAZY", this.onInstanceCreated = null;
		}
		setInstantiationMode(e) {
			return this.instantiationMode = e, this;
		}
		setMultipleInstances(e) {
			return this.multipleInstances = e, this;
		}
		setServiceProps(e) {
			return this.serviceProps = e, this;
		}
		setInstanceCreatedCallback(e) {
			return this.onInstanceCreated = e, this;
		}
	};
}));
//#endregion
//#region node_modules/@firebase/installations/node_modules/@firebase/util/dist/index.esm2017.js
function JC(e, t) {
	return e.replace(QC, (e, n) => {
		let r = t[n];
		return r == null ? `<${n}?>` : String(r);
	});
}
var YC, XC, ZC, QC, $C = t((() => {
	YC = "FirebaseError", XC = class e extends Error {
		constructor(t, n, r) {
			super(n), this.code = t, this.customData = r, this.name = YC, Object.setPrototypeOf(this, e.prototype), Error.captureStackTrace && Error.captureStackTrace(this, ZC.prototype.create);
		}
	}, ZC = class {
		constructor(e, t, n) {
			this.service = e, this.serviceName = t, this.errors = n;
		}
		create(e, ...t) {
			let n = t[0] || {}, r = `${this.service}/${e}`, i = this.errors[e], a = i ? JC(i, n) : "Error", o = `${this.serviceName}: ${a} (${r}).`;
			return new XC(r, o, n);
		}
	}, QC = /\{\$([^}]+)}/g;
})), ew, tw = t((() => {
	ew = class {
		constructor(e, t, n) {
			this.name = e, this.instanceFactory = t, this.type = n, this.multipleInstances = !1, this.serviceProps = {}, this.instantiationMode = "LAZY", this.onInstanceCreated = null;
		}
		setInstantiationMode(e) {
			return this.instantiationMode = e, this;
		}
		setMultipleInstances(e) {
			return this.multipleInstances = e, this;
		}
		setServiceProps(e) {
			return this.serviceProps = e, this;
		}
		setInstanceCreatedCallback(e) {
			return this.onInstanceCreated = e, this;
		}
	};
}));
//#endregion
//#region node_modules/@firebase/installations/dist/esm/index.esm2017.js
function nw(e) {
	return e instanceof XC && e.code.includes("request-failed");
}
function rw({ projectId: e }) {
	return `${nT}/projects/${e}/installations`;
}
function iw(e) {
	return {
		token: e.token,
		requestStatus: 2,
		expiresIn: lw(e.expiresIn),
		creationTime: Date.now()
	};
}
async function aw(e, t) {
	let n = (await t.json()).error;
	return iT.create("request-failed", {
		requestName: e,
		serverCode: n.code,
		serverMessage: n.message,
		serverStatus: n.status
	});
}
function ow({ apiKey: e }) {
	return new Headers({
		"Content-Type": "application/json",
		Accept: "application/json",
		"x-goog-api-key": e
	});
}
function sw(e, { refreshToken: t }) {
	let n = ow(e);
	return n.append("Authorization", uw(t)), n;
}
async function cw(e) {
	let t = await e();
	return t.status >= 500 && t.status < 600 ? e() : t;
}
function lw(e) {
	return Number(e.replace("s", "000"));
}
function uw(e) {
	return `${tT} ${e}`;
}
async function dw({ appConfig: e, heartbeatServiceProvider: t }, { fid: n }) {
	let r = rw(e), i = ow(e), a = t.getImmediate({ optional: !0 });
	if (a) {
		let e = await a.getHeartbeatsHeader();
		e && i.append("x-firebase-client", e);
	}
	let o = {
		fid: n,
		authVersion: tT,
		appId: e.appId,
		sdkVersion: eT
	}, s = {
		method: "POST",
		headers: i,
		body: JSON.stringify(o)
	}, c = await cw(() => fetch(r, s));
	if (c.ok) {
		let e = await c.json();
		return {
			fid: e.fid || n,
			registrationStatus: 2,
			refreshToken: e.refreshToken,
			authToken: iw(e.authToken)
		};
	} else throw await aw("Create Installation", c);
}
function fw(e) {
	return new Promise((t) => {
		setTimeout(t, e);
	});
}
function pw(e) {
	return btoa(String.fromCharCode(...e)).replace(/\+/g, "-").replace(/\//g, "_");
}
function mw() {
	try {
		let e = /* @__PURE__ */ new Uint8Array(17);
		(self.crypto || self.msCrypto).getRandomValues(e), e[0] = 112 + e[0] % 16;
		let t = hw(e);
		return aT.test(t) ? t : oT;
	} catch {
		return oT;
	}
}
function hw(e) {
	return pw(e).substr(0, 22);
}
function gw(e) {
	return `${e.appName}!${e.appId}`;
}
function _w(e, t) {
	let n = gw(e);
	vw(n, t), yw(n, t);
}
function vw(e, t) {
	let n = sT.get(e);
	if (n) for (let e of n) e(t);
}
function yw(e, t) {
	let n = bw();
	n && n.postMessage({
		key: e,
		fid: t
	}), xw();
}
function bw() {
	return !cT && "BroadcastChannel" in self && (cT = new BroadcastChannel("[Firebase] FID Change"), cT.onmessage = (e) => {
		vw(e.data.key, e.data.fid);
	}), cT;
}
function xw() {
	sT.size === 0 && cT && (cT.close(), cT = null);
}
function Sw() {
	return fT ||= Ue(lT, uT, { upgrade: (e, t) => {
		switch (t) {
			case 0: e.createObjectStore(dT);
		}
	} }), fT;
}
async function Cw(e, t) {
	let n = gw(e), r = (await Sw()).transaction(dT, "readwrite"), i = r.objectStore(dT), a = await i.get(n);
	return await i.put(t, n), await r.done, (!a || a.fid !== t.fid) && _w(e, t.fid), t;
}
async function ww(e) {
	let t = gw(e), n = (await Sw()).transaction(dT, "readwrite");
	await n.objectStore(dT).delete(t), await n.done;
}
async function Tw(e, t) {
	let n = gw(e), r = (await Sw()).transaction(dT, "readwrite"), i = r.objectStore(dT), a = await i.get(n), o = t(a);
	return o === void 0 ? await i.delete(n) : await i.put(o, n), await r.done, o && (!a || a.fid !== o.fid) && _w(e, o.fid), o;
}
async function Ew(e) {
	let t, n = await Tw(e.appConfig, (n) => {
		let r = Ow(e, Dw(n));
		return t = r.registrationPromise, r.installationEntry;
	});
	return n.fid === oT ? { installationEntry: await t } : {
		installationEntry: n,
		registrationPromise: t
	};
}
function Dw(e) {
	return Mw(e || {
		fid: mw(),
		registrationStatus: 0
	});
}
function Ow(e, t) {
	if (t.registrationStatus === 0) {
		if (!navigator.onLine) return {
			installationEntry: t,
			registrationPromise: Promise.reject(iT.create("app-offline"))
		};
		let n = {
			fid: t.fid,
			registrationStatus: 1,
			registrationTime: Date.now()
		};
		return {
			installationEntry: n,
			registrationPromise: kw(e, n)
		};
	} else if (t.registrationStatus === 1) return {
		installationEntry: t,
		registrationPromise: Aw(e)
	};
	else return { installationEntry: t };
}
async function kw(e, t) {
	try {
		let n = await dw(e, t);
		return Cw(e.appConfig, n);
	} catch (n) {
		throw nw(n) && n.customData.serverCode === 409 ? await ww(e.appConfig) : await Cw(e.appConfig, {
			fid: t.fid,
			registrationStatus: 0
		}), n;
	}
}
async function Aw(e) {
	let t = await jw(e.appConfig);
	for (; t.registrationStatus === 1;) await fw(100), t = await jw(e.appConfig);
	if (t.registrationStatus === 0) {
		let { installationEntry: t, registrationPromise: n } = await Ew(e);
		return n || t;
	}
	return t;
}
function jw(e) {
	return Tw(e, (e) => {
		if (!e) throw iT.create("installation-not-found");
		return Mw(e);
	});
}
function Mw(e) {
	return Nw(e) ? {
		fid: e.fid,
		registrationStatus: 0
	} : e;
}
function Nw(e) {
	return e.registrationStatus === 1 && e.registrationTime + $w < Date.now();
}
async function Pw({ appConfig: e, heartbeatServiceProvider: t }, n) {
	let r = Fw(e, n), i = sw(e, n), a = t.getImmediate({ optional: !0 });
	if (a) {
		let e = await a.getHeartbeatsHeader();
		e && i.append("x-firebase-client", e);
	}
	let o = { installation: {
		sdkVersion: eT,
		appId: e.appId
	} }, s = {
		method: "POST",
		headers: i,
		body: JSON.stringify(o)
	}, c = await cw(() => fetch(r, s));
	if (c.ok) return iw(await c.json());
	throw await aw("Generate Auth Token", c);
}
function Fw(e, { fid: t }) {
	return `${rw(e)}/${t}/authTokens:generate`;
}
async function Iw(e, t = !1) {
	let n, r = await Tw(e.appConfig, (r) => {
		if (!Bw(r)) throw iT.create("not-registered");
		let i = r.authToken;
		if (!t && Vw(i)) return r;
		if (i.requestStatus === 1) return n = Lw(e, t), r;
		{
			if (!navigator.onLine) throw iT.create("app-offline");
			let t = Uw(r);
			return n = zw(e, t), t;
		}
	});
	return n ? await n : r.authToken;
}
async function Lw(e, t) {
	let n = await Rw(e.appConfig);
	for (; n.authToken.requestStatus === 1;) await fw(100), n = await Rw(e.appConfig);
	let r = n.authToken;
	return r.requestStatus === 0 ? Iw(e, t) : r;
}
function Rw(e) {
	return Tw(e, (e) => {
		if (!Bw(e)) throw iT.create("not-registered");
		let t = e.authToken;
		return Ww(t) ? Object.assign(Object.assign({}, e), { authToken: { requestStatus: 0 } }) : e;
	});
}
async function zw(e, t) {
	try {
		let n = await Pw(e, t), r = Object.assign(Object.assign({}, t), { authToken: n });
		return await Cw(e.appConfig, r), n;
	} catch (n) {
		if (nw(n) && (n.customData.serverCode === 401 || n.customData.serverCode === 404)) await ww(e.appConfig);
		else {
			let n = Object.assign(Object.assign({}, t), { authToken: { requestStatus: 0 } });
			await Cw(e.appConfig, n);
		}
		throw n;
	}
}
function Bw(e) {
	return e !== void 0 && e.registrationStatus === 2;
}
function Vw(e) {
	return e.requestStatus === 2 && !Hw(e);
}
function Hw(e) {
	let t = Date.now();
	return t < e.creationTime || e.creationTime + e.expiresIn < t + rT;
}
function Uw(e) {
	let t = {
		requestStatus: 1,
		requestTime: Date.now()
	};
	return Object.assign(Object.assign({}, e), { authToken: t });
}
function Ww(e) {
	return e.requestStatus === 1 && e.requestTime + $w < Date.now();
}
async function Gw(e) {
	let t = e, { installationEntry: n, registrationPromise: r } = await Ew(t);
	return r ? r.catch(console.error) : Iw(t).catch(console.error), n.fid;
}
async function Kw(e, t = !1) {
	let n = e;
	return await qw(n), (await Iw(n, t)).token;
}
async function qw(e) {
	let { registrationPromise: t } = await Ew(e);
	t && await t;
}
function Jw(e) {
	if (!e || !e.options) throw Yw("App Configuration");
	if (!e.name) throw Yw("App Name");
	for (let t of [
		"projectId",
		"apiKey",
		"appId"
	]) if (!e.options[t]) throw Yw(t);
	return {
		appName: e.name,
		projectId: e.options.projectId,
		apiKey: e.options.apiKey,
		appId: e.options.appId
	};
}
function Yw(e) {
	return iT.create("missing-app-config-values", { valueName: e });
}
function Xw() {
	Ze(new ew(pT, hT, "PUBLIC")), Ze(new ew(mT, gT, "PRIVATE"));
}
var Zw, Qw, $w, eT, tT, nT, rT, iT, aT, oT, sT, cT, lT, uT, dT, fT, pT, mT, hT, gT, _T = t((() => {
	an(), tw(), $C(), Je(), Zw = "@firebase/installations", Qw = "0.6.9", $w = 1e4, eT = `w:${Qw}`, tT = "FIS_v2", nT = "https://firebaseinstallations.googleapis.com/v1", rT = 3600 * 1e3, iT = new ZC("installations", "Installations", {
		"missing-app-config-values": "Missing App configuration value: \"{$valueName}\"",
		"not-registered": "Firebase Installation is not registered.",
		"installation-not-found": "Firebase Installation not found.",
		"request-failed": "{$requestName} request failed with error \"{$serverCode} {$serverStatus}: {$serverMessage}\"",
		"app-offline": "Could not process request. Application offline.",
		"delete-pending-registration": "Can't delete installation while there is a pending registration request."
	}), aT = /^[cdef][\w-]{21}$/, oT = "", sT = /* @__PURE__ */ new Map(), cT = null, lT = "firebase-installations-database", uT = 1, dT = "firebase-installations-store", fT = null, pT = "installations", mT = "installations-internal", hT = (e) => {
		let t = e.getProvider("app").getImmediate();
		return {
			app: t,
			appConfig: Jw(t),
			heartbeatServiceProvider: Qe(t, "heartbeat"),
			_delete: () => Promise.resolve()
		};
	}, gT = (e) => {
		let t = Qe(e.getProvider("app").getImmediate(), pT).getImmediate();
		return {
			getId: () => Gw(t),
			getToken: (e) => Kw(t, e)
		};
	}, Xw(), rt(Zw, Qw), rt(Zw, Qw, "esm2017");
}));
//#endregion
//#region node_modules/@firebase/analytics/dist/esm/index.esm2017.js
function vT(e) {
	if (!e.startsWith(XT)) {
		let t = QT.create("invalid-gtag-resource", { gtagURL: e });
		return ZT.warn(t.message), "";
	}
	return e;
}
function yT(e) {
	return Promise.all(e.map((e) => e.catch((e) => e)));
}
function bT(e, t) {
	let n;
	return window.trustedTypes && (n = window.trustedTypes.createPolicy(e, t)), n;
}
function xT(e, t) {
	let n = bT("firebase-js-sdk-policy", { createScriptURL: vT }), r = document.createElement("script"), i = `${XT}?l=${e}&id=${t}`;
	r.src = n ? n?.createScriptURL(i) : i, r.async = !0, document.head.appendChild(r);
}
function ST(e) {
	let t = [];
	return Array.isArray(window[e]) ? t = window[e] : window[e] = t, t;
}
async function CT(e, t, n, r, i, a) {
	let o = r[i];
	try {
		if (o) await t[o];
		else {
			let e = (await yT(n)).find((e) => e.measurementId === i);
			e && await t[e.appId];
		}
	} catch (e) {
		ZT.error(e);
	}
	e("config", i, a);
}
async function wT(e, t, n, r, i) {
	try {
		let a = [];
		if (i && i.send_to) {
			let e = i.send_to;
			Array.isArray(e) || (e = [e]);
			let r = await yT(n);
			for (let n of e) {
				let e = r.find((e) => e.measurementId === n), i = e && t[e.appId];
				if (i) a.push(i);
				else {
					a = [];
					break;
				}
			}
		}
		a.length === 0 && (a = Object.values(t)), await Promise.all(a), e("event", r, i || {});
	} catch (e) {
		ZT.error(e);
	}
}
function TT(e, t, n, r) {
	async function i(i, ...a) {
		try {
			if (i === "event") {
				let [r, i] = a;
				await wT(e, t, n, r, i);
			} else if (i === "config") {
				let [i, o] = a;
				await CT(e, t, n, r, i, o);
			} else if (i === "consent") {
				let [t, n] = a;
				e("consent", t, n);
			} else if (i === "get") {
				let [t, n, r] = a;
				e("get", t, n, r);
			} else if (i === "set") {
				let [t] = a;
				e("set", t);
			} else e(i, ...a);
		} catch (e) {
			ZT.error(e);
		}
	}
	return i;
}
function ET(e, t, n, r, i) {
	let a = function(...e) {
		window[r].push(arguments);
	};
	return window[i] && typeof window[i] == "function" && (a = window[i]), window[i] = TT(a, e, t, n), {
		gtagCore: a,
		wrappedGtag: window[i]
	};
}
function DT(e) {
	let t = window.document.getElementsByTagName("script");
	for (let n of Object.values(t)) if (n.src && n.src.includes(XT) && n.src.includes(e)) return n;
	return null;
}
function OT(e) {
	return new Headers({
		Accept: "application/json",
		"x-goog-api-key": e
	});
}
async function kT(e) {
	let { appId: t, apiKey: n } = e, r = {
		method: "GET",
		headers: OT(n)
	}, i = YT.replace("{app-id}", t), a = await fetch(i, r);
	if (a.status !== 200 && a.status !== 304) {
		let e = "";
		try {
			let t = await a.json();
			t.error?.message && (e = t.error.message);
		} catch {}
		throw QT.create("config-fetch-failed", {
			httpStatus: a.status,
			responseMessage: e
		});
	}
	return a.json();
}
async function AT(e, t = nE, n) {
	let { appId: r, apiKey: i, measurementId: a } = e.options;
	if (!r) throw QT.create("no-app-id");
	if (!i) {
		if (a) return {
			measurementId: a,
			appId: r
		};
		throw QT.create("no-api-key");
	}
	let o = t.getThrottleMetadata(r) || {
		backoffCount: 0,
		throttleEndTimeMillis: Date.now()
	}, s = new rE();
	return setTimeout(async () => {
		s.abort();
	}, n === void 0 ? JT : n), jT({
		appId: r,
		apiKey: i,
		measurementId: a
	}, o, s, t);
}
async function jT(e, { throttleEndTimeMillis: t, backoffCount: n }, r, i = nE) {
	let { appId: a, measurementId: o } = e;
	try {
		await MT(r, t);
	} catch (e) {
		if (o) return ZT.warn(`Timed out fetching this Firebase app's measurement ID from the server. Falling back to the measurement ID ${o} provided in the "measurementId" field in the local Firebase config. [${e?.message}]`), {
			appId: a,
			measurementId: o
		};
		throw e;
	}
	try {
		let t = await kT(e);
		return i.deleteThrottleMetadata(a), t;
	} catch (t) {
		let s = t;
		if (!NT(s)) {
			if (i.deleteThrottleMetadata(a), o) return ZT.warn(`Failed to fetch this Firebase app's measurement ID from the server. Falling back to the measurement ID ${o} provided in the "measurementId" field in the local Firebase config. [${s?.message}]`), {
				appId: a,
				measurementId: o
			};
			throw t;
		}
		let c = Number(s?.customData?.httpStatus) === 503 ? FC(n, i.intervalMillis, $T) : FC(n, i.intervalMillis), l = {
			throttleEndTimeMillis: Date.now() + c,
			backoffCount: n + 1
		};
		return i.setThrottleMetadata(a, l), ZT.debug(`Calling attemptFetch again in ${c} millis`), jT(e, l, r, i);
	}
}
function MT(e, t) {
	return new Promise((n, r) => {
		let i = Math.max(t - Date.now(), 0), a = setTimeout(n, i);
		e.addEventListener(() => {
			clearTimeout(a), r(QT.create("fetch-throttle", { throttleEndTimeMillis: t }));
		});
	});
}
function NT(e) {
	if (!(e instanceof RC) || !e.customData) return !1;
	let t = Number(e.customData.httpStatus);
	return t === 429 || t === 500 || t === 503 || t === 504;
}
async function PT(e, t, n, r, i) {
	if (i && i.global) {
		e("event", n, r);
		return;
	} else {
		let i = await t;
		e("event", n, Object.assign(Object.assign({}, r), { send_to: i }));
	}
}
function FT(e) {
	aE = e;
}
function IT(e) {
	iE = e;
}
async function LT() {
	if (kC()) try {
		await AC();
	} catch (e) {
		return ZT.warn(QT.create("indexeddb-unavailable", { errorInfo: e?.toString() }).message), !1;
	}
	else return ZT.warn(QT.create("indexeddb-unavailable", { errorInfo: "IndexedDB is not available in this environment." }).message), !1;
	return !0;
}
async function RT(e, t, n, r, i, a, o) {
	let s = AT(e);
	s.then((t) => {
		n[t.measurementId] = t.appId, e.options.measurementId && t.measurementId !== e.options.measurementId && ZT.warn(`The measurement ID in the local Firebase config (${e.options.measurementId}) does not match the measurement ID fetched from the server (${t.measurementId}). To ensure analytics events are always sent to the correct Analytics property, update the measurement ID field in the local config or remove it from the local config.`);
	}).catch((e) => ZT.error(e)), t.push(s);
	let c = LT().then((e) => {
		if (e) return r.getId();
	}), [l, u] = await Promise.all([s, c]);
	DT(a) || xT(a, l.measurementId), aE && (i("consent", "default", aE), FT(void 0)), i("js", /* @__PURE__ */ new Date());
	let d = o?.config ?? {};
	return d[qT] = "firebase", d.update = !0, u != null && (d[KT] = u), i("config", l.measurementId, d), iE && (i("set", iE), IT(void 0)), l.measurementId;
}
function zT() {
	let e = [];
	if (OC() && e.push("This is a browser extension environment."), jC() || e.push("Cookies are not available."), e.length > 0) {
		let t = e.map((e, t) => `(${t + 1}) ${e}`).join(" "), n = QT.create("invalid-analytics-context", { errorInfo: t });
		ZT.warn(n.message);
	}
}
function BT(e, t, n) {
	zT();
	let r = e.options.appId;
	if (!r) throw QT.create("no-app-id");
	if (!e.options.apiKey) if (e.options.measurementId) ZT.warn(`The "apiKey" field is empty in the local Firebase config. This is needed to fetch the latest measurement ID for this Firebase app. Falling back to the measurement ID ${e.options.measurementId} provided in the "measurementId" field in the local Firebase config.`);
	else throw QT.create("no-api-key");
	if (sE[r] != null) throw QT.create("already-exists", { id: r });
	if (!mE) {
		ST(uE);
		let { wrappedGtag: e, gtagCore: t } = ET(sE, cE, lE, uE, dE);
		pE = e, fE = t, mE = !0;
	}
	return sE[r] = RT(e, cE, lE, t, fE, uE, n), new oE(e);
}
function VT(e = nt()) {
	e = IC(e);
	let t = Qe(e, GT);
	return t.isInitialized() ? t.getImmediate() : HT(e);
}
function HT(e, t = {}) {
	let n = Qe(e, GT);
	if (n.isInitialized()) {
		let e = n.getImmediate();
		if (NC(t, n.getOptions())) return e;
		throw QT.create("already-initialized");
	}
	return n.initialize({ options: t });
}
function UT(e, t, n, r) {
	e = IC(e), PT(pE, sE[e.app.options.appId], t, n, r).catch((e) => ZT.error(e));
}
function WT() {
	Ze(new KC(GT, (e, { options: t }) => BT(e.getProvider("app").getImmediate(), e.getProvider("installations-internal").getImmediate(), t), "PUBLIC")), Ze(new KC("analytics-internal", e, "PRIVATE")), rt(hE, gE), rt(hE, gE, "esm2017");
	function e(e) {
		try {
			let t = e.getProvider(GT).getImmediate();
			return { logEvent: (e, n, r) => UT(t, e, n, r) };
		} catch (e) {
			throw QT.create("interop-component-reg-failed", { reason: e });
		}
	}
}
var GT, KT, qT, JT, YT, XT, ZT, QT, $T, eE, tE, nE, rE, iE, aE, oE, sE, cE, lE, uE, dE, fE, pE, mE, hE, gE, _E = t((() => {
	an(), DC(), GC(), qC(), _T(), GT = "analytics", KT = "firebase_id", qT = "origin", JT = 60 * 1e3, YT = "https://firebase.googleapis.com/v1alpha/projects/-/apps/{app-id}/webConfig", XT = "https://www.googletagmanager.com/gtag/js", ZT = new EC("@firebase/analytics"), QT = new zC("analytics", "Analytics", {
		"already-exists": "A Firebase Analytics instance with the appId {$id}  already exists. Only one Firebase Analytics instance can be created for each appId.",
		"already-initialized": "initializeAnalytics() cannot be called again with different options than those it was initially called with. It can be called again with the same options to return the existing instance, or getAnalytics() can be used to get a reference to the already-initialized instance.",
		"already-initialized-settings": "Firebase Analytics has already been initialized.settings() must be called before initializing any Analytics instanceor it will have no effect.",
		"interop-component-reg-failed": "Firebase Analytics Interop Component failed to instantiate: {$reason}",
		"invalid-analytics-context": "Firebase Analytics is not supported in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}",
		"indexeddb-unavailable": "IndexedDB unavailable or restricted in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}",
		"fetch-throttle": "The config fetch request timed out while in an exponential backoff state. Unix timestamp in milliseconds when fetch request throttling ends: {$throttleEndTimeMillis}.",
		"config-fetch-failed": "Dynamic config fetch failed: [{$httpStatus}] {$responseMessage}",
		"no-api-key": "The \"apiKey\" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid API key.",
		"no-app-id": "The \"appId\" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid app ID.",
		"no-client-id": "The \"client_id\" field is empty.",
		"invalid-gtag-resource": "Trusted Types detected an invalid gtag resource: {$gtagURL}."
	}), $T = 30, eE = 1e3, tE = class {
		constructor(e = {}, t = eE) {
			this.throttleMetadata = e, this.intervalMillis = t;
		}
		getThrottleMetadata(e) {
			return this.throttleMetadata[e];
		}
		setThrottleMetadata(e, t) {
			this.throttleMetadata[e] = t;
		}
		deleteThrottleMetadata(e) {
			delete this.throttleMetadata[e];
		}
	}, nE = new tE(), rE = class {
		constructor() {
			this.listeners = [];
		}
		addEventListener(e) {
			this.listeners.push(e);
		}
		abort() {
			this.listeners.forEach((e) => e());
		}
	}, oE = class {
		constructor(e) {
			this.app = e;
		}
		_delete() {
			return delete sE[this.app.options.appId], Promise.resolve();
		}
	}, sE = {}, cE = [], lE = {}, uE = "dataLayer", dE = "gtag", mE = !1, hE = "@firebase/analytics", gE = "0.10.8", WT();
})), vE = t((() => {
	_E();
})), yE = /* @__PURE__ */ n({
	FUNCTIONS_REGION: () => AE,
	analytics: () => ME,
	auth: () => DE,
	db: () => EE,
	dbChat: () => kE,
	default: () => TE,
	getChatAuth: () => CE,
	storage: () => OE,
	usesDedicatedChatFirebase: () => SE
});
function bE() {
	if (typeof window > "u") return Fl(TE);
	try {
		return Pl(TE, {
			experimentalAutoDetectLongPolling: !0,
			localCache: ed({ tabManager: nd() })
		});
	} catch {
		return Fl(TE);
	}
}
function xE() {
	let e = wE.VITE_FIREBASE_CHAT_API_KEY, t = wE.VITE_FIREBASE_CHAT_PROJECT_ID, n = wE.VITE_FIREBASE_CHAT_APP_ID, r = wE.VITE_FIREBASE_CHAT_MESSAGING_SENDER_ID;
	if (!e || !t || !n || !r) return EE;
	let i = {
		apiKey: e,
		authDomain: wE.VITE_FIREBASE_CHAT_AUTH_DOMAIN || `${t}.firebaseapp.com`,
		projectId: t,
		storageBucket: wE.VITE_FIREBASE_CHAT_STORAGE_BUCKET || `${t}.firebasestorage.app`,
		messagingSenderId: r,
		appId: n,
		measurementId: wE.VITE_FIREBASE_CHAT_MEASUREMENT_ID
	}, a;
	try {
		a = nt("chat");
	} catch {
		a = tt(i, "chat");
	}
	if (typeof window > "u") return Fl(a);
	try {
		return Pl(a, { localCache: ed({ tabManager: nd() }) });
	} catch {
		return Fl(a);
	}
}
function SE() {
	return !!(wE.VITE_FIREBASE_CHAT_API_KEY && wE.VITE_FIREBASE_CHAT_PROJECT_ID);
}
function CE() {
	return jE || (jE = SE() ? rb(nt("chat")) : DE, jE);
}
var wE, TE, EE, DE, OE, kE, AE, jE, ME, NE = t((() => {
	if (Ng(), iS(), bC(), vE(), wE = {
		BASE_URL: "/",
		DEV: !1,
		MODE: "production",
		PROD: !0,
		SSR: !1
	}, TE = tt({
		apiKey: wE.VITE_FIREBASE_API_KEY || "AIzaSyAJv0APn-Qmv59H2Behu3PhskObCaPHW_A",
		authDomain: wE.VITE_FIREBASE_AUTH_DOMAIN || "tbdsm-5acca.firebaseapp.com",
		projectId: wE.VITE_FIREBASE_PROJECT_ID || "tbdsm-5acca",
		storageBucket: wE.VITE_FIREBASE_STORAGE_BUCKET || "tbdsm-5acca.firebasestorage.app",
		messagingSenderId: wE.VITE_FIREBASE_MESSAGING_SENDER_ID || "905865425928",
		appId: wE.VITE_FIREBASE_APP_ID || "1:905865425928:web:1898ebb5b8de87ecf3cdbd",
		measurementId: wE.VITE_FIREBASE_MEASUREMENT_ID || "G-FRE3N3T6JH"
	}), EE = bE(), DE = rb(TE), OE = $S(TE), kE = xE(), AE = wE.VITE_FIREBASE_FUNCTIONS_REGION || "europe-west1", jE = null, ME = null, typeof window < "u") try {
		ME = VT(TE);
	} catch {}
})), PE = /* @__PURE__ */ n({
	clearCache: () => WE,
	getCached: () => VE,
	setCached: () => HE,
	withDeduplication: () => UE
}), FE, IE, LE, RE, zE, BE, VE, HE, UE, WE, GE = t((() => {
	FE = /* @__PURE__ */ new Map(), IE = /* @__PURE__ */ new Map(), LE = 6e5, RE = 3e4, zE = ["activeParties"], BE = (e) => zE.some((t) => e.startsWith(t)) ? RE : LE, VE = (e) => {
		let t = FE.get(e);
		return t ? Date.now() - t.timestamp > BE(e) ? (FE.delete(e), null) : t.data : null;
	}, HE = (e, t) => {
		FE.set(e, {
			data: t,
			timestamp: Date.now()
		});
	}, UE = async (e, t) => {
		let n = VE(e);
		if (n !== null) return n;
		if (IE.has(e)) return IE.get(e);
		let r = t().then((t) => (HE(e, t), IE.delete(e), t)).catch((t) => {
			throw IE.delete(e), t;
		});
		return IE.set(e, r), r;
	}, WE = (e = null) => {
		if (!e) {
			FE.clear(), IE.clear();
			return;
		}
		for (let t of FE.keys()) t.includes(e) && FE.delete(t);
		for (let t of IE.keys()) t.includes(e) && IE.delete(t);
	};
})), KE = /* @__PURE__ */ n({
	clearAllDBReadLogs: () => rD,
	getDBReadLogs: () => tD,
	getDBReadLogsStats: () => nD,
	saveDBReadLog: () => QE
}), qE, JE, YE, XE, ZE, QE, $E, eD, tD, nD, rD, iD = t((() => {
	kg(), NE(), qE = "dbReadLogs", JE = 5e3, YE = 10, XE = [], ZE = null, QE = async (e) => {
		try {
			if (XE.push({
				...e,
				timestamp: I.now(),
				createdAt: (/* @__PURE__ */ new Date()).toISOString(),
				userAgent: typeof navigator < "u" ? navigator.userAgent : "unknown",
				url: typeof window < "u" ? window.location.href : "unknown"
			}), XE.length >= YE) {
				await $E();
				return;
			}
			ZE ||= setTimeout(async () => {
				await $E(), ZE = null;
			}, 2e3);
		} catch (e) {
			console.error("Failed to queue log:", e);
		}
	}, $E = async () => {
		if (XE.length !== 0) try {
			let e = dd(EE), t = [...XE];
			XE = [], t.forEach((t) => {
				let n = Al(Ol(EE, qE));
				e.set(n, t);
			}), await e.commit(), eD().catch(() => {});
		} catch (e) {
			console.error("Failed to flush log queue:", e), XE.length < YE * 2 && (XE = [...XE, ...logsToWrite]);
		}
	}, eD = async () => {
		try {
			let e = Ol(EE, qE), t = await Ru(e);
			if (t.size <= JE) return;
			let n = await Ru(du(e, hu("timestamp", "asc"), gu(t.size - JE))), r = dd(EE);
			n.docs.forEach((e) => {
				r.delete(e.ref);
			}), await r.commit();
		} catch {}
	}, tD = async (e = 100, t = null) => {
		try {
			let n = Ol(EE, qE), r = du(n, hu("timestamp", "desc"), gu(e));
			return t && (r = du(n, hu("timestamp", "desc"), t(t), gu(e))), (await Ru(r)).docs.map((e) => ({
				id: e.id,
				...e.data(),
				timestamp: e.data().timestamp?.toDate?.()?.toISOString() || e.data().timestamp
			}));
		} catch (e) {
			throw e;
		}
	}, nD = async (e = null, t = null) => {
		try {
			let n = Ol(EE, qE), r;
			if (e || t) {
				let i = [hu("timestamp", "desc")];
				e && i.unshift(fu("timestamp", ">=", I.fromDate(e))), t && i.unshift(fu("timestamp", "<=", I.fromDate(t))), r = du(n, ...i);
			} else r = du(n, hu("timestamp", "desc"));
			let i = (await Ru(r)).docs.map((e) => e.data()), a = {
				totalReads: 0,
				totalCalls: i.length,
				byFunction: {},
				byDate: {},
				errors: 0,
				cacheHits: 0
			};
			return i.forEach((e) => {
				a.totalReads += e.readCount || 0, a.byFunction[e.function] = (a.byFunction[e.function] || 0) + (e.readCount || 0);
				let t = (e.timestamp?.toDate ? e.timestamp.toDate() : new Date(e.timestamp || e.createdAt)).toISOString().split("T")[0];
				a.byDate[t] = (a.byDate[t] || 0) + (e.readCount || 0), e.success || a.errors++, e.readCount === 0 && a.cacheHits++;
			}), a;
		} catch (e) {
			throw e;
		}
	}, rD = async () => {
		try {
			XE = [], ZE &&= (clearTimeout(ZE), null);
			let e = await Ru(Ol(EE, qE));
			if (e.empty) return !0;
			let t = e.docs;
			for (let e = 0; e < t.length; e += 500) {
				let n = dd(EE);
				t.slice(e, e + 500).forEach((e) => {
					n.delete(e.ref);
				}), await n.commit();
			}
			return !0;
		} catch (e) {
			throw e;
		}
	}, typeof window < "u" && window.addEventListener("beforeunload", () => {
		ZE && clearTimeout(ZE), $E();
	});
})), aD = /* @__PURE__ */ n({ dbLogger: () => lD }), oD, sD, cD, lD, uD = t((() => {
	oD = "db_reads_log", sD = 1e3, cD = class {
		constructor() {
			this.enabled = this.loadEnabledState(), this.dbLoggingEnabled = this.loadDBLoggingState(), this.logs = this.loadLogs();
		}
		loadEnabledState() {
			try {
				let e = localStorage.getItem("db_logger_enabled");
				return e !== null && e === "true";
			} catch {
				return !1;
			}
		}
		saveEnabledState() {
			try {
				localStorage.setItem("db_logger_enabled", this.enabled.toString());
			} catch (e) {
				console.error("Failed to save logger state:", e);
			}
		}
		loadDBLoggingState() {
			try {
				let e = localStorage.getItem("db_logger_db_enabled");
				return e !== null && e === "true";
			} catch {
				return !1;
			}
		}
		saveDBLoggingState() {
			try {
				localStorage.setItem("db_logger_db_enabled", this.dbLoggingEnabled.toString());
			} catch (e) {
				console.error("Failed to save DB logger state:", e);
			}
		}
		loadLogs() {
			try {
				let e = localStorage.getItem(oD);
				return e ? JSON.parse(e) : [];
			} catch (e) {
				return console.error("Failed to load logs:", e), [];
			}
		}
		saveLogs() {
			try {
				this.logs.length > sD && (this.logs = this.logs.slice(-1e3)), localStorage.setItem(oD, JSON.stringify(this.logs));
			} catch (e) {
				console.error("Failed to save logs:", e);
			}
		}
		async log(e, t = {}, n = null, r = null, i = null) {
			if (!this.enabled) return;
			let a = null, o = null;
			if (i && typeof i == "object" ? (a = i.caller || i.file || null, o = i.reason || null) : i && typeof i == "string" && (a = i), !a) try {
				let e = (/* @__PURE__ */ Error()).stack;
				if (e) {
					let t = e.split("\n");
					if (t.length > 3) {
						let e = t[3] || t[2] || "", n = e.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/) || e.match(/at\s+(.+?):(\d+):(\d+)/);
						if (n) {
							let e = n[2] || n[1], t = n[3] || n[2];
							a = `${(e.split("/").pop() || e.split("\\").pop() || e).split("?")[0].split("#")[0]}:${t}`;
						} else a = e.trim().substring(0, 100);
					}
				}
			} catch {
				a = "unknown";
			}
			o ||= a ? a.includes("useEffect") || a.includes("loadActiveParties") || a.includes("loadData") ? "Component mount/update" : a.includes("handle") || a.includes("onClick") || a.includes("onSubmit") ? "User action" : a.includes("save") || a.includes("create") || a.includes("update") || a.includes("delete") ? "Data mutation" : a.includes("refresh") || a.includes("load") || a.includes("fetch") ? "Data refresh" : a.includes("check") || a.includes("validate") || a.includes("isUser") || a.includes("isClient") ? "Validation/Check" : a.includes("filter") || a.includes("map") || a.includes("forEach") ? "Data processing" : a.includes("BalanceTables") || a.includes("RegistrationItem") ? "UI rendering" : "Other" : "Unknown";
			let s = n ? Array.isArray(n) ? n.length : typeof n == "object" ? Object.keys(n).length : 1 : 0, c = e.includes("(cached)"), l = c ? 0 : this.estimateReadCount(e, t, n), u = "null", d = null;
			n !== null && (Array.isArray(n) ? (u = "array", d = {
				length: n.length,
				sample: n.length > 0 ? typeof n[0] == "object" ? Object.keys(n[0]).join(", ") : typeof n[0] : null
			}) : typeof n == "object" ? (u = "object", d = {
				keys: Object.keys(n).slice(0, 10),
				keyCount: Object.keys(n).length
			}) : (u = typeof n, d = String(n).substring(0, 50)));
			let f = {
				timestamp: (/* @__PURE__ */ new Date()).toISOString(),
				function: e,
				params: this.sanitizeParams(t),
				success: r === null,
				error: r ? r.message : null,
				resultSize: s,
				readCount: l,
				isCached: c,
				resultType: u,
				resultDetails: d,
				caller: a || "unknown",
				reason: o || "unknown",
				duration: null
			};
			if (this.enabled && (this.logs.push(f), this.saveLogs(), this.dbLoggingEnabled)) try {
				let { saveDBReadLog: e } = await Promise.resolve().then(() => (iD(), KE));
				e(f).catch(() => {});
			} catch {}
			process.env.NODE_ENV === "development" && console.log(`[DB Read] ${e}`, {
				params: f.params,
				reads: f.readCount,
				success: f.success
			});
		}
		sanitizeParams(e) {
			let t = { ...e };
			return t.password &&= "***", t.token &&= "***", t.registrations && Array.isArray(t.registrations) && (t.registrations = `[${t.registrations.length} items]`), t;
		}
		estimateReadCount(e, t, n) {
			return e.includes("getAll") || e.includes("getActiveParties") ? Array.isArray(n) ? n.length : 1 : e.includes("getBalanceMatches") || e.includes("getPartyById") || e.includes("getUserByPhone") ? 1 : e.includes("getDocs") ? Array.isArray(n) ? n.length : 1 : (e.includes("getDoc"), 1);
		}
		getStats() {
			let e = /* @__PURE__ */ new Date(), t = new Date(e.getFullYear(), e.getMonth(), e.getDate()), n = this.logs.filter((e) => new Date(e.timestamp) >= t), r = n.reduce((e, t) => e + t.readCount, 0), i = n.length, a = {};
			return n.forEach((e) => {
				a[e.function] = (a[e.function] || 0) + e.readCount;
			}), {
				today: {
					totalReads: r,
					totalCalls: i,
					byFunction: Object.entries(a).sort((e, t) => t[1] - e[1]).map(([e, t]) => ({
						function: e,
						reads: t
					}))
				},
				allTime: {
					totalReads: this.logs.reduce((e, t) => e + t.readCount, 0),
					totalCalls: this.logs.length
				}
			};
		}
		getLogs(e = 100) {
			return this.logs.slice(-e).reverse();
		}
		clearLogs() {
			this.logs = [], this.saveLogs();
		}
		exportLogs() {
			return {
				stats: this.getStats(),
				logs: this.logs,
				exportedAt: (/* @__PURE__ */ new Date()).toISOString()
			};
		}
		enable() {
			this.enabled = !0, this.saveEnabledState();
		}
		disable() {
			this.enabled = !1, this.saveEnabledState();
		}
		toggle() {
			return this.enabled = !this.enabled, this.saveEnabledState(), this.enabled;
		}
		isEnabled() {
			return this.enabled;
		}
		enableDBLogging() {
			this.dbLoggingEnabled = !0, this.saveDBLoggingState();
		}
		disableDBLogging() {
			this.dbLoggingEnabled = !1, this.saveDBLoggingState();
		}
		toggleDBLogging() {
			return this.dbLoggingEnabled = !this.dbLoggingEnabled, this.saveDBLoggingState(), this.dbLoggingEnabled;
		}
		isDBLoggingEnabled() {
			return this.dbLoggingEnabled;
		}
	}, lD = new cD();
}));
//#endregion
//#region src/firebase/dataAccess.js
kg();
var dD = async () => {
	try {
		let e = "contentSettings", { getCached: t, withDeduplication: n, setCached: r } = await Promise.resolve().then(() => (GE(), PE)), i = t(e);
		if (i) {
			let { dbLogger: e } = await Promise.resolve().then(() => (uD(), aD));
			return e.log("getContentSettings (cached)", {}, i, null, {
				caller: "dataAccess.getContentSettings",
				reason: "Cache hit"
			}), i;
		}
		return await n(e, async () => {
			let { doc: t, getDoc: n } = await Promise.resolve().then(() => (kg(), Og)), { db: i } = await Promise.resolve().then(() => (NE(), yE)), a = await n(t(i, "settings", "content")), o = a.exists() ? a.data() : {};
			r(e, o);
			let { dbLogger: s } = await Promise.resolve().then(() => (uD(), aD));
			return s.log("getContentSettings", {}, o, null, {
				caller: "dataAccess.getContentSettings",
				reason: "Fetching content settings from DB"
			}), o;
		});
	} catch (e) {
		let { dbLogger: t } = await Promise.resolve().then(() => (uD(), aD));
		return t.log("getContentSettings", {}, null, e, {
			caller: "dataAccess.getContentSettings",
			reason: "Error fetching content settings"
		}), {};
	}
}, fD = async () => {
	try {
		let e = "socialLinks", { getCached: t, withDeduplication: n, setCached: r } = await Promise.resolve().then(() => (GE(), PE)), i = t(e);
		if (i) {
			let { dbLogger: e } = await Promise.resolve().then(() => (uD(), aD));
			return e.log("getSocialLinks (cached)", {}, i, null, {
				caller: "dataAccess.getSocialLinks",
				reason: "Cache hit"
			}), i;
		}
		return await n(e, async () => {
			let { doc: t, getDoc: n } = await Promise.resolve().then(() => (kg(), Og)), { db: i } = await Promise.resolve().then(() => (NE(), yE)), a = await n(t(i, "settings", "socialLinks")), o;
			if (a.exists()) {
				let e = a.data();
				o = {
					instagram: e.instagram || "",
					telegramChannel: e.telegramChannel || "",
					telegramGroup: e.telegramGroup || "",
					whatsapp: e.whatsapp || "",
					facebook: e.facebook || ""
				};
			} else o = {
				instagram: "",
				telegramChannel: "",
				telegramGroup: "",
				whatsapp: "",
				facebook: ""
			};
			r(e, o);
			let { dbLogger: s } = await Promise.resolve().then(() => (uD(), aD));
			return s.log("getSocialLinks", {}, o, null, {
				caller: "dataAccess.getSocialLinks",
				reason: "Fetching social links from DB"
			}), o;
		});
	} catch (e) {
		let { dbLogger: t } = await Promise.resolve().then(() => (uD(), aD));
		return t.log("getSocialLinks", {}, null, e, {
			caller: "dataAccess.getSocialLinks",
			reason: "Error fetching social links"
		}), {
			instagram: "",
			telegramChannel: "",
			telegramGroup: "",
			whatsapp: "",
			facebook: ""
		};
	}
}, pD = async () => {
	try {
		let e = "rssFeeds", { getCached: t, withDeduplication: n, setCached: r } = await Promise.resolve().then(() => (GE(), PE)), i = t(e);
		if (i) {
			let { dbLogger: e } = await Promise.resolve().then(() => (uD(), aD));
			return e.log("getRssFeeds (cached)", {}, i, null, {
				caller: "dataAccess.getRssFeeds",
				reason: "Cache hit"
			}), i;
		}
		return await n(e, async () => {
			let { collection: t, getDocs: n } = await Promise.resolve().then(() => (kg(), Og)), { db: i } = await Promise.resolve().then(() => (NE(), yE)), a = (await n(t(i, "rssFeeds"))).docs.map((e) => ({
				id: e.id,
				...e.data()
			})).sort((e, t) => e.order !== void 0 && t.order !== void 0 ? e.order - t.order : 0);
			r(e, a);
			let { dbLogger: o } = await Promise.resolve().then(() => (uD(), aD));
			return o.log("getRssFeeds", {}, a, null, {
				caller: "dataAccess.getRssFeeds",
				reason: "Fetching RSS feeds from DB"
			}), a;
		});
	} catch (e) {
		let { dbLogger: t } = await Promise.resolve().then(() => (uD(), aD));
		return t.log("getRssFeeds", {}, null, e, {
			caller: "dataAccess.getRssFeeds",
			reason: "Error fetching RSS feeds"
		}), [];
	}
};
//#endregion
//#region src/firebase/settings.js
kg();
var mD = fD, hD = dD, gD = pD;
kg(), NE();
var _D = "supportChat", vD = () => {
	if (typeof window > "u") return null;
	let e = localStorage.getItem("support_chat_session");
	return e || (e = `sc_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`, localStorage.setItem("support_chat_session", e)), e;
}, yD = vD, bD = async (e, t = vD()) => !e || !e.trim() ? null : (await Wu(Ol(EE, _D, t, "messages"), {
	role: "user",
	text: e.trim(),
	createdAt: od()
})).id, xD = async (e, t = vD()) => !e || !e.trim() ? null : (await Wu(Ol(EE, _D, t, "messages"), {
	role: "bot",
	text: e.trim(),
	createdAt: od()
})).id, SD = async (e, t, n = null) => {
	if (!e || !t?.trim()) return null;
	let r = `${"/".replace(/\/+$/, "") || ""}/api/support-chat-send`, i = await fetch(r, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			sessionId: e,
			text: t.trim(),
			displayName: n?.trim() || null
		})
	}), a = await i.json().catch(() => ({}));
	if (!i.ok) throw Error(a.error || i.statusText || "Telegram relay failed");
	return a.telegramMessageId ?? null;
}, CD = (e, t) => Gu(du(Ol(EE, _D, e, "messages"), hu("createdAt", "asc"), gu(100)), (e) => {
	t(e.docs.map((e) => ({
		id: e.id,
		...e.data(),
		createdAt: e.data().createdAt?.toDate?.() || e.data().createdAt
	})));
}, (e) => console.error("supportChat onSnapshot error:", e)), wD = async (e) => (await Ru(du(Ol(EE, _D, e, "messages"), hu("createdAt", "asc"), gu(100)))).docs.map((e) => ({
	id: e.id,
	...e.data(),
	createdAt: e.data().createdAt?.toDate?.() || e.data().createdAt
}));
//#endregion
//#region src/utils/phone.js
function TD(e) {
	return String(e || "").replace(/\D/g, "");
}
function ED(e) {
	let t = TD(e);
	if (t.startsWith("00972") && (t = t.slice(2)), t.startsWith("972")) {
		let e = t.slice(3);
		if (e.startsWith("0") && (e = e.slice(1)), e.length === 9) return "0" + e;
	}
	return t;
}
kg(), NE();
var DD = "pushSubscriptions", OD = (e) => btoa(unescape(encodeURIComponent(e))).replace(/[^a-zA-Z0-9]/g, "").slice(0, 300), kD = async (e, t) => {
	let n = ED(e) || e;
	if (!n || !t?.endpoint) throw Error("נתונים חסרים לרישום התראות");
	let r = OD(t.endpoint);
	return await Vu(Al(EE, DD, r), {
		phone: n,
		endpoint: t.endpoint,
		keys: t.keys || null,
		updatedAt: (/* @__PURE__ */ new Date()).toISOString()
	}), { id: r };
};
kg(), NE();
function AD(e) {
	if (e instanceof Date) return e;
	if (e?.toDate) return e.toDate();
	if (typeof e == "string") {
		let t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e);
		if (t) return new Date(+t[1], t[2] - 1, +t[3]);
	}
	return new Date(e);
}
function jD(e) {
	let t = AD(e);
	return !t || Number.isNaN(t.getTime()) ? "" : t.toLocaleDateString("he-IL", { weekday: "long" });
}
function MD(e) {
	let t = AD(e);
	return !t || Number.isNaN(t.getTime()) ? "" : `${String(t.getDate()).padStart(2, "0")}.${String(t.getMonth() + 1).padStart(2, "0")}.${t.getFullYear()}`;
}
function ND(e) {
	let t = AD(e);
	return !t || Number.isNaN(t.getTime()) ? "" : `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}
var PD = [
	{
		category: "בדסמ",
		words: [
			"בדסמ",
			"בדס\"מ",
			"בדס״מ",
			"פמדום",
			"דאנג'ון",
			"דאנגאון",
			"פטיש",
			"fetish",
			"bdsm",
			"שליטה"
		]
	},
	{
		category: "חילופי זוגות",
		words: [
			"חילופי זוגות",
			"סווינגר",
			"swinger",
			"חילופי-זוגות",
			"no limit",
			"בוטיק",
			"פנתאון",
			"ליברל",
			"liberal",
			"זוגות"
		]
	},
	{
		category: "מאנץ'",
		words: ["מאנץ", "munch"]
	},
	{
		category: "פסטיבל",
		words: ["פסטיבל", "festival"]
	}
];
function FD(e, t) {
	let n = `${e} ${t}`.toLowerCase();
	for (let { category: e, words: t } of PD) if (t.some((e) => n.includes(e.toLowerCase()))) return e;
	return "";
}
function ID(e) {
	let t = e.title || "", n = e.description || "";
	return {
		id: e.id,
		title: t,
		day: e.day || jD(e.date),
		date: MD(e.date),
		dateISO: ND(e.date),
		time: e.time || "",
		dj: e.dj || "",
		category: e.category || FD(t, n),
		badge: e.badge || "",
		img: e.imageURL || "",
		desc: n,
		whatsappNumber: e.whatsappNumber || ""
	};
}
function LD(e) {
	let t = (e?.date instanceof Date ? e.date : e?.date?.toDate ? e.date.toDate() : new Date(e?.date))?.getTime?.();
	return Number.isFinite(t) ? t : Infinity;
}
async function RD() {
	let e = null, t = du(Ol(EE, "parties"), fu("status", "==", "active")), n = (e) => {
		let t = e.data();
		return {
			id: e.id,
			...t,
			date: t.date?.toDate?.() || new Date(t.date)
		};
	};
	try {
		e = (await Bu(t)).docs.map(n);
	} catch {
		e = await Ru(t).then((e) => e.docs.map(n)).catch(() => []);
	}
	let r = Date.now(), i = (e || []).filter((e) => {
		let t = e.expiration?.toDate?.() || (e.expiration ? new Date(e.expiration) : null);
		return t ? t.getTime() >= r : LD(e) >= r - 1440 * 60 * 1e3;
	});
	return e && e.length !== i.length && fetch("/api/telegram-webhook?job=cleanup-parties").catch(() => {}), i.sort((e, t) => LD(e) - LD(t)).map(ID);
}
async function zD() {
	let e;
	try {
		e = (await Fu(Al(EE, "settings", "siteConfig"))).data()?.partyBanners;
	} catch {
		e = void 0;
	}
	return Mg(e).filter((e) => e.enabled);
}
async function BD() {
	return (await hD().catch(() => ({})))?.about || {};
}
async function VD() {
	return (await hD().catch(() => ({})))?.contact || {};
}
function HD() {
	return {
		sessionId: yD(),
		send: (e, t) => bD(e, yD()),
		notifyTelegram: (e, t) => SD(yD(), e, t || null).catch(() => null),
		subscribe: (e) => CD(yD(), e),
		fetchOnce: () => wD(yD())
	};
}
async function UD() {
	let e = await mD().catch(() => ({})), t = [];
	return Object.entries({
		instagram: "אינסטגרם",
		facebook: "פייסבוק",
		telegramChannel: "ערוץ טלגרם",
		telegramGroup: "קבוצת טלגרם",
		whatsapp: "וואטסאפ"
	}).forEach(([n, r]) => {
		let i = e?.[n];
		i && t.push({
			type: n,
			label: r,
			url: i
		});
	}), t;
}
async function WD(e, t) {
	return kD(e, t);
}
async function GD() {
	return (await gD().catch(() => []) || []).filter((e) => e?.enabled !== !1 && e?.text).map((e) => e.text);
}
window.LPData = {
	loadEvents: RD,
	loadPartyBanners: zD,
	loadSocialLinks: UD,
	loadNewsFeed: GD,
	loadAbout: BD,
	loadContact: VD,
	supportChat: HD,
	registerPushSubscription: WD
};
var KD = [
	{
		keywords: [
			"נרשם",
			"נרשמים",
			"נרשמת",
			"להירשם",
			"הרשמה",
			"להצטרף",
			"הצטרפות",
			"מנוי"
		],
		answer: "ההרשמה למסיבות בוואטסאפ בלבד: לוחצים על 'הרשמה בוואטסאפ' ליד המסיבה ושולחים הודעה. אבי חוזר אליכם עם כל הפרטים."
	},
	{
		keywords: [
			"תשלום",
			"לשלם",
			"אשראי",
			"סליקה",
			"עולה",
			"מחיר"
		],
		answer: "התשלום מתואם ישירות מול אבי. באתר עצמו אין סליקה או חיוב בכרטיס אשראי."
	},
	{
		keywords: [
			"Liberal Suite",
			"סוויטה",
			"להשכיר מקום",
			"חדר פרטי",
			"פליירום"
		],
		answer: "Liberal Suite היא סוויטה פרטית להשכרה למפגשים ומסיבות, לזוג אחד ועד 10 זוגות — כוללת Playroom, מתחם אבזור וחדר רחצה מרהיב. כל הפרטים וההזמנה בעמוד 'Liberal Suite' באתר."
	},
	{
		keywords: [
			"לוח אירועים",
			"מתי המסיבה הבאה",
			"אילו מסיבות יש",
			"מה יש בקרוב"
		],
		answer: "את כל המסיבות הקרובות אפשר לראות בעמוד 'לוח האירועים' או ברשימת 'כל המסיבות' באתר."
	},
	{
		keywords: [
			"קוד אתי",
			"כללי התנהגות",
			"בטיחות באירוע",
			"כללי הקהילה"
		],
		answer: "כללי ההתנהגות והבטיחות של הקהילה מפורטים בעמוד 'הקהילה שלנו'. הכלל המרכזי: כל מפגש מתחיל בכבוד הדדי, ולכל אחד ואחת הזכות לבחור ולהציב גבולות."
	},
	{
		keywords: [
			"תמונות מהמסיבות",
			"גלריה",
			"איך זה נראה שם"
		],
		answer: "אפשר לראות רגעים מהאווירה בעמוד 'גלריה' באתר."
	},
	{
		keywords: [
			"איך פונים",
			"מספר טלפון של הצוות",
			"ליצור קשר"
		],
		answer: "אפשר לפנות לצוות דרך עמוד 'יצירת קשר' באתר, או ישירות כאן בצ'אט."
	}
];
function qD(e) {
	let t = (e || "").trim();
	if (!t) return null;
	let n = null;
	for (let e of KD) {
		let r = e.keywords.reduce((e, n) => t.includes(n) ? e + 1 : e, 0);
		r > 0 && (!n || r > n.score) && (n = {
			answer: e.answer,
			score: r
		});
	}
	return n?.answer || null;
}
function JD() {
	if (document.getElementById("lpSupportChat")) return;
	let e = document.createElement("div");
	e.id = "lpSupportChat", e.innerHTML = "\n    <button id=\"lpSupportChatToggle\" aria-label=\"תמיכה\" style=\"position:fixed;left:16px;bottom:86px;z-index:300;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#e11d48,#be0037);border:0;color:#fff;box-shadow:0 10px 30px rgba(225,29,72,.45);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .2s\" onmouseover=\"this.style.transform='scale(1.06)'\" onmouseout=\"this.style.transform='scale(1)'\">\n      <svg viewBox='0 0 24 24' width='26' height='26' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' style='flex-shrink:0;'><path d='M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 20.5l1.7-5.4A8.4 8.4 0 1 1 21 11.5Z'/></svg>\n    </button>\n    <div id=\"lpSupportChatPanel\" style=\"display:none;position:fixed;left:16px;bottom:150px;z-index:300;width:min(360px,calc(100vw - 32px));max-height:65vh;background:rgba(19,19,23,.96);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.08);border-radius:22px;box-shadow:0 20px 60px rgba(0,0,0,.55);overflow:hidden;flex-direction:column;font-family:'Inter',Arial,sans-serif\">\n      <div style=\"padding:14px 16px;background:linear-gradient(135deg,#e11d48,#be0037);display:flex;justify-content:space-between;align-items:center\">\n        <div style=\"display:flex;gap:10px;align-items:center\">\n          <div style=\"width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center\">\n            <svg viewBox='0 0 24 24' width='19' height='19' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' style='flex-shrink:0;color:#fff'><path d='M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v4H4zM17 14h3v4h-3zM20 18c0 2-2 3-5 3'/></svg>\n          </div>\n          <div>\n            <b style=\"font-size:15px;display:block;color:#fff\">צ'אט תמיכה</b>\n            <small style=\"font-size:11px;color:rgba(255,255,255,.85);display:flex;align-items:center;gap:4px\"><span style=\"width:6px;height:6px;border-radius:50%;background:#35c76f;display:inline-block\"></span>מגיב בהקדם</small>\n          </div>\n        </div>\n        <div style=\"display:flex;gap:6px;align-items:center\">\n          <button id=\"lpSupportChatMin\" title=\"מזעור\" style=\"background:rgba(255,255,255,.16);border:0;color:#fff;width:28px;height:28px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center\"><svg viewBox='0 0 24 24' width='17' height='17' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' style='flex-shrink:0;'><path d='M5 12h14'/></svg></button>\n          <button id=\"lpSupportChatClose\" title=\"סגירה\" style=\"background:rgba(255,255,255,.16);border:0;color:#fff;width:28px;height:28px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center\"><svg viewBox='0 0 24 24' width='17' height='17' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' style='flex-shrink:0;'><path d='M6 6l12 12M18 6 6 18'/></svg></button>\n        </div>\n      </div>\n\n      <div id=\"lpSupportChatGate\" style=\"padding:26px 20px;text-align:center\">\n        <div style=\"width:48px;height:48px;border-radius:50%;background:rgba(225,29,72,.15);display:flex;align-items:center;justify-content:center;margin:0 auto 14px\">\n          <svg viewBox='0 0 24 24' width='24' height='24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' style='flex-shrink:0;color:#e11d48'><path d='M7 11V6a1.5 1.5 0 0 1 3 0v4M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12l1.5-1.5a1.6 1.6 0 0 1 2.3 2.2L16 18a6 6 0 0 1-9-1l-2-3.5a1.5 1.5 0 0 1 2.6-1.5L7 13'/></svg>\n        </div>\n        <p style=\"margin:0 0 14px;font-size:14px;color:#e4e1e7\">הזן את שמך כדי להתחיל את הצ'אט</p>\n        <input id=\"lpSupportChatName\" placeholder=\"שם\" style=\"width:100%;box-sizing:border-box;text-align:center;margin-bottom:14px;background:#1f1f23;border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#fff;padding:12px;font-size:14px;outline:none\">\n        <button id=\"lpSupportChatStart\" style=\"width:100%;border:0;border-radius:12px;background:linear-gradient(135deg,#e11d48,#be0037);color:#fff;font-weight:700;padding:12px;cursor:pointer;font-size:14px\">התחל צ'אט</button>\n      </div>\n\n      <div id=\"lpSupportChatBody\" style=\"display:none;flex-direction:column;flex:1;min-height:0\">\n        <div id=\"lpSupportChatMsgs\" class=\"chat-window\" style=\"flex:1;overflow-y:auto;padding:12px;min-height:160px\"></div>\n        <div style=\"display:flex;gap:8px;padding:10px 12px;align-items:center\">\n          <input id=\"lpSupportChatInput\" placeholder=\"כתבו הודעה...\" style=\"flex:1;background:#1f1f23;border:1px solid rgba(255,255,255,.1);border-radius:999px;color:#fff;padding:10px 16px;font-size:14px;outline:none\">\n          <button id=\"lpSupportChatSend\" aria-label=\"שליחה\" style=\"flex-shrink:0;width:40px;height:40px;border-radius:50%;border:0;background:linear-gradient(135deg,#e11d48,#be0037);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center\">\n            <svg viewBox='0 0 24 24' width='19' height='19' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' style='flex-shrink:0;transform:scaleX(-1)'><path d='M3 11.5 21 3l-5 18-4.5-7zM11.5 14 21 3'/></svg>\n          </button>\n        </div>\n      </div>\n    </div>\n  ", document.body.appendChild(e);
	let t = e.querySelector("#lpSupportChatPanel"), n = e.querySelector("#lpSupportChatToggle"), r = e.querySelector("#lpSupportChatClose"), i = e.querySelector("#lpSupportChatMin"), a = e.querySelector("#lpSupportChatGate"), o = e.querySelector("#lpSupportChatName"), s = e.querySelector("#lpSupportChatStart"), c = e.querySelector("#lpSupportChatBody"), l = e.querySelector("#lpSupportChatMsgs"), u = e.querySelector("#lpSupportChatInput"), d = e.querySelector("#lpSupportChatSend"), f = HD(), p = !1, m = () => localStorage.getItem("lp_support_chat_name") || "", h = (e) => localStorage.setItem("lp_support_chat_name", e), g = () => m() || "אורח/ת", ee = (e) => {
		l.innerHTML = e.map((e) => {
			let t = e.role === "user", n = t ? "את/ה" : e.role === "bot" ? "התמיכה <span class=\"bot-tag\">תשובה אוטומטית</span>" : "התמיכה", r = e.createdAt instanceof Date ? e.createdAt.toLocaleTimeString("he-IL", {
				hour: "2-digit",
				minute: "2-digit"
			}) : "";
			return `<div class="chat-msg${t ? " own" : ""}"><span class="chat-sender">${n}</span><div class="chat-bubble"></div><span class="chat-time">${r}</span></div>`;
		}).join(""), [...l.querySelectorAll(".chat-bubble")].forEach((t, n) => {
			t.textContent = e[n].text || "";
		}), l.scrollTop = l.scrollHeight;
	}, te = () => {
		a.style.display = "none", c.style.display = "flex", p || (p = !0, f.fetchOnce().then(ee).catch(() => {}), f.subscribe(ee));
	}, ne = () => {
		t.style.display = "flex", m() ? te() : a.style.display = "block";
	};
	n.addEventListener("click", () => {
		t.style.display === "flex" ? t.style.display = "none" : ne();
	}), r.addEventListener("click", () => {
		t.style.display = "none";
	}), i.addEventListener("click", () => {
		t.style.display = "none";
	}), s.addEventListener("click", () => {
		let e = o.value.trim();
		if (!e) {
			o.focus();
			return;
		}
		h(e), te();
	}), o.addEventListener("keydown", (e) => {
		e.key === "Enter" && s.click();
	});
	let re = async () => {
		let e = u.value.trim();
		if (e) {
			u.value = "";
			try {
				await f.send(e), f.notifyTelegram(e, g());
				let t = qD(e);
				t && xD(t, f.sessionId).catch(() => {});
			} catch {}
		}
	};
	d.addEventListener("click", re), u.addEventListener("keydown", (e) => {
		e.key === "Enter" && re();
	});
}
typeof document < "u" && (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", JD) : JD());
//#endregion
