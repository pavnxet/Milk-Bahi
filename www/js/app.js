var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/@capacitor/core/dist/index.js
var createCapacitorPlatforms, initPlatforms, CapacitorPlatforms, addPlatform, setPlatform, ExceptionCode, CapacitorException, getPlatformId, createCapacitor, initCapacitorGlobal, Capacitor, registerPlugin, Plugins, WebPlugin, encode, decode, CapacitorCookiesPluginWeb, CapacitorCookies, readBlobAsBase64, normalizeHttpHeaders, buildUrlParams, buildRequestInit, CapacitorHttpPluginWeb, CapacitorHttp;
var init_dist = __esm({
  "node_modules/@capacitor/core/dist/index.js"() {
    createCapacitorPlatforms = (win) => {
      const defaultPlatformMap = /* @__PURE__ */ new Map();
      defaultPlatformMap.set("web", { name: "web" });
      const capPlatforms = win.CapacitorPlatforms || {
        currentPlatform: { name: "web" },
        platforms: defaultPlatformMap
      };
      const addPlatform2 = (name, platform) => {
        capPlatforms.platforms.set(name, platform);
      };
      const setPlatform2 = (name) => {
        if (capPlatforms.platforms.has(name)) {
          capPlatforms.currentPlatform = capPlatforms.platforms.get(name);
        }
      };
      capPlatforms.addPlatform = addPlatform2;
      capPlatforms.setPlatform = setPlatform2;
      return capPlatforms;
    };
    initPlatforms = (win) => win.CapacitorPlatforms = createCapacitorPlatforms(win);
    CapacitorPlatforms = /* @__PURE__ */ initPlatforms(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
    addPlatform = CapacitorPlatforms.addPlatform;
    setPlatform = CapacitorPlatforms.setPlatform;
    (function(ExceptionCode2) {
      ExceptionCode2["Unimplemented"] = "UNIMPLEMENTED";
      ExceptionCode2["Unavailable"] = "UNAVAILABLE";
    })(ExceptionCode || (ExceptionCode = {}));
    CapacitorException = class extends Error {
      constructor(message, code, data) {
        super(message);
        this.message = message;
        this.code = code;
        this.data = data;
      }
    };
    getPlatformId = (win) => {
      var _a, _b;
      if (win === null || win === void 0 ? void 0 : win.androidBridge) {
        return "android";
      } else if ((_b = (_a = win === null || win === void 0 ? void 0 : win.webkit) === null || _a === void 0 ? void 0 : _a.messageHandlers) === null || _b === void 0 ? void 0 : _b.bridge) {
        return "ios";
      } else {
        return "web";
      }
    };
    createCapacitor = (win) => {
      var _a, _b, _c, _d, _e;
      const capCustomPlatform = win.CapacitorCustomPlatform || null;
      const cap = win.Capacitor || {};
      const Plugins2 = cap.Plugins = cap.Plugins || {};
      const capPlatforms = win.CapacitorPlatforms;
      const defaultGetPlatform = () => {
        return capCustomPlatform !== null ? capCustomPlatform.name : getPlatformId(win);
      };
      const getPlatform = ((_a = capPlatforms === null || capPlatforms === void 0 ? void 0 : capPlatforms.currentPlatform) === null || _a === void 0 ? void 0 : _a.getPlatform) || defaultGetPlatform;
      const defaultIsNativePlatform = () => getPlatform() !== "web";
      const isNativePlatform = ((_b = capPlatforms === null || capPlatforms === void 0 ? void 0 : capPlatforms.currentPlatform) === null || _b === void 0 ? void 0 : _b.isNativePlatform) || defaultIsNativePlatform;
      const defaultIsPluginAvailable = (pluginName) => {
        const plugin = registeredPlugins.get(pluginName);
        if (plugin === null || plugin === void 0 ? void 0 : plugin.platforms.has(getPlatform())) {
          return true;
        }
        if (getPluginHeader(pluginName)) {
          return true;
        }
        return false;
      };
      const isPluginAvailable = ((_c = capPlatforms === null || capPlatforms === void 0 ? void 0 : capPlatforms.currentPlatform) === null || _c === void 0 ? void 0 : _c.isPluginAvailable) || defaultIsPluginAvailable;
      const defaultGetPluginHeader = (pluginName) => {
        var _a2;
        return (_a2 = cap.PluginHeaders) === null || _a2 === void 0 ? void 0 : _a2.find((h) => h.name === pluginName);
      };
      const getPluginHeader = ((_d = capPlatforms === null || capPlatforms === void 0 ? void 0 : capPlatforms.currentPlatform) === null || _d === void 0 ? void 0 : _d.getPluginHeader) || defaultGetPluginHeader;
      const handleError = (err) => win.console.error(err);
      const pluginMethodNoop = (_target, prop, pluginName) => {
        return Promise.reject(`${pluginName} does not have an implementation of "${prop}".`);
      };
      const registeredPlugins = /* @__PURE__ */ new Map();
      const defaultRegisterPlugin = (pluginName, jsImplementations = {}) => {
        const registeredPlugin = registeredPlugins.get(pluginName);
        if (registeredPlugin) {
          console.warn(`Capacitor plugin "${pluginName}" already registered. Cannot register plugins twice.`);
          return registeredPlugin.proxy;
        }
        const platform = getPlatform();
        const pluginHeader = getPluginHeader(pluginName);
        let jsImplementation;
        const loadPluginImplementation = async () => {
          if (!jsImplementation && platform in jsImplementations) {
            jsImplementation = typeof jsImplementations[platform] === "function" ? jsImplementation = await jsImplementations[platform]() : jsImplementation = jsImplementations[platform];
          } else if (capCustomPlatform !== null && !jsImplementation && "web" in jsImplementations) {
            jsImplementation = typeof jsImplementations["web"] === "function" ? jsImplementation = await jsImplementations["web"]() : jsImplementation = jsImplementations["web"];
          }
          return jsImplementation;
        };
        const createPluginMethod = (impl, prop) => {
          var _a2, _b2;
          if (pluginHeader) {
            const methodHeader = pluginHeader === null || pluginHeader === void 0 ? void 0 : pluginHeader.methods.find((m) => prop === m.name);
            if (methodHeader) {
              if (methodHeader.rtype === "promise") {
                return (options) => cap.nativePromise(pluginName, prop.toString(), options);
              } else {
                return (options, callback) => cap.nativeCallback(pluginName, prop.toString(), options, callback);
              }
            } else if (impl) {
              return (_a2 = impl[prop]) === null || _a2 === void 0 ? void 0 : _a2.bind(impl);
            }
          } else if (impl) {
            return (_b2 = impl[prop]) === null || _b2 === void 0 ? void 0 : _b2.bind(impl);
          } else {
            throw new CapacitorException(`"${pluginName}" plugin is not implemented on ${platform}`, ExceptionCode.Unimplemented);
          }
        };
        const createPluginMethodWrapper = (prop) => {
          let remove;
          const wrapper = (...args) => {
            const p = loadPluginImplementation().then((impl) => {
              const fn = createPluginMethod(impl, prop);
              if (fn) {
                const p2 = fn(...args);
                remove = p2 === null || p2 === void 0 ? void 0 : p2.remove;
                return p2;
              } else {
                throw new CapacitorException(`"${pluginName}.${prop}()" is not implemented on ${platform}`, ExceptionCode.Unimplemented);
              }
            });
            if (prop === "addListener") {
              p.remove = async () => remove();
            }
            return p;
          };
          wrapper.toString = () => `${prop.toString()}() { [capacitor code] }`;
          Object.defineProperty(wrapper, "name", {
            value: prop,
            writable: false,
            configurable: false
          });
          return wrapper;
        };
        const addListener = createPluginMethodWrapper("addListener");
        const removeListener = createPluginMethodWrapper("removeListener");
        const addListenerNative = (eventName, callback) => {
          const call = addListener({ eventName }, callback);
          const remove = async () => {
            const callbackId = await call;
            removeListener({
              eventName,
              callbackId
            }, callback);
          };
          const p = new Promise((resolve2) => call.then(() => resolve2({ remove })));
          p.remove = async () => {
            console.warn(`Using addListener() without 'await' is deprecated.`);
            await remove();
          };
          return p;
        };
        const proxy = new Proxy({}, {
          get(_, prop) {
            switch (prop) {
              // https://github.com/facebook/react/issues/20030
              case "$$typeof":
                return void 0;
              case "toJSON":
                return () => ({});
              case "addListener":
                return pluginHeader ? addListenerNative : addListener;
              case "removeListener":
                return removeListener;
              default:
                return createPluginMethodWrapper(prop);
            }
          }
        });
        Plugins2[pluginName] = proxy;
        registeredPlugins.set(pluginName, {
          name: pluginName,
          proxy,
          platforms: /* @__PURE__ */ new Set([
            ...Object.keys(jsImplementations),
            ...pluginHeader ? [platform] : []
          ])
        });
        return proxy;
      };
      const registerPlugin2 = ((_e = capPlatforms === null || capPlatforms === void 0 ? void 0 : capPlatforms.currentPlatform) === null || _e === void 0 ? void 0 : _e.registerPlugin) || defaultRegisterPlugin;
      if (!cap.convertFileSrc) {
        cap.convertFileSrc = (filePath) => filePath;
      }
      cap.getPlatform = getPlatform;
      cap.handleError = handleError;
      cap.isNativePlatform = isNativePlatform;
      cap.isPluginAvailable = isPluginAvailable;
      cap.pluginMethodNoop = pluginMethodNoop;
      cap.registerPlugin = registerPlugin2;
      cap.Exception = CapacitorException;
      cap.DEBUG = !!cap.DEBUG;
      cap.isLoggingEnabled = !!cap.isLoggingEnabled;
      cap.platform = cap.getPlatform();
      cap.isNative = cap.isNativePlatform();
      return cap;
    };
    initCapacitorGlobal = (win) => win.Capacitor = createCapacitor(win);
    Capacitor = /* @__PURE__ */ initCapacitorGlobal(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
    registerPlugin = Capacitor.registerPlugin;
    Plugins = Capacitor.Plugins;
    WebPlugin = class {
      constructor(config) {
        this.listeners = {};
        this.windowListeners = {};
        if (config) {
          console.warn(`Capacitor WebPlugin "${config.name}" config object was deprecated in v3 and will be removed in v4.`);
          this.config = config;
        }
      }
      addListener(eventName, listenerFunc) {
        const listeners = this.listeners[eventName];
        if (!listeners) {
          this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(listenerFunc);
        const windowListener = this.windowListeners[eventName];
        if (windowListener && !windowListener.registered) {
          this.addWindowListener(windowListener);
        }
        const remove = async () => this.removeListener(eventName, listenerFunc);
        const p = Promise.resolve({ remove });
        Object.defineProperty(p, "remove", {
          value: async () => {
            console.warn(`Using addListener() without 'await' is deprecated.`);
            await remove();
          }
        });
        return p;
      }
      async removeAllListeners() {
        this.listeners = {};
        for (const listener in this.windowListeners) {
          this.removeWindowListener(this.windowListeners[listener]);
        }
        this.windowListeners = {};
      }
      notifyListeners(eventName, data) {
        const listeners = this.listeners[eventName];
        if (listeners) {
          listeners.forEach((listener) => listener(data));
        }
      }
      hasListeners(eventName) {
        return !!this.listeners[eventName].length;
      }
      registerWindowListener(windowEventName, pluginEventName) {
        this.windowListeners[pluginEventName] = {
          registered: false,
          windowEventName,
          pluginEventName,
          handler: (event) => {
            this.notifyListeners(pluginEventName, event);
          }
        };
      }
      unimplemented(msg = "not implemented") {
        return new Capacitor.Exception(msg, ExceptionCode.Unimplemented);
      }
      unavailable(msg = "not available") {
        return new Capacitor.Exception(msg, ExceptionCode.Unavailable);
      }
      async removeListener(eventName, listenerFunc) {
        const listeners = this.listeners[eventName];
        if (!listeners) {
          return;
        }
        const index = listeners.indexOf(listenerFunc);
        this.listeners[eventName].splice(index, 1);
        if (!this.listeners[eventName].length) {
          this.removeWindowListener(this.windowListeners[eventName]);
        }
      }
      addWindowListener(handle) {
        window.addEventListener(handle.windowEventName, handle.handler);
        handle.registered = true;
      }
      removeWindowListener(handle) {
        if (!handle) {
          return;
        }
        window.removeEventListener(handle.windowEventName, handle.handler);
        handle.registered = false;
      }
    };
    encode = (str) => encodeURIComponent(str).replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent).replace(/[()]/g, escape);
    decode = (str) => str.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
    CapacitorCookiesPluginWeb = class extends WebPlugin {
      async getCookies() {
        const cookies = document.cookie;
        const cookieMap = {};
        cookies.split(";").forEach((cookie) => {
          if (cookie.length <= 0)
            return;
          let [key, value] = cookie.replace(/=/, "CAP_COOKIE").split("CAP_COOKIE");
          key = decode(key).trim();
          value = decode(value).trim();
          cookieMap[key] = value;
        });
        return cookieMap;
      }
      async setCookie(options) {
        try {
          const encodedKey = encode(options.key);
          const encodedValue = encode(options.value);
          const expires = `; expires=${(options.expires || "").replace("expires=", "")}`;
          const path = (options.path || "/").replace("path=", "");
          const domain = options.url != null && options.url.length > 0 ? `domain=${options.url}` : "";
          document.cookie = `${encodedKey}=${encodedValue || ""}${expires}; path=${path}; ${domain};`;
        } catch (error) {
          return Promise.reject(error);
        }
      }
      async deleteCookie(options) {
        try {
          document.cookie = `${options.key}=; Max-Age=0`;
        } catch (error) {
          return Promise.reject(error);
        }
      }
      async clearCookies() {
        try {
          const cookies = document.cookie.split(";") || [];
          for (const cookie of cookies) {
            document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, `=;expires=${(/* @__PURE__ */ new Date()).toUTCString()};path=/`);
          }
        } catch (error) {
          return Promise.reject(error);
        }
      }
      async clearAllCookies() {
        try {
          await this.clearCookies();
        } catch (error) {
          return Promise.reject(error);
        }
      }
    };
    CapacitorCookies = registerPlugin("CapacitorCookies", {
      web: () => new CapacitorCookiesPluginWeb()
    });
    readBlobAsBase64 = async (blob) => new Promise((resolve2, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result;
        resolve2(base64String.indexOf(",") >= 0 ? base64String.split(",")[1] : base64String);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(blob);
    });
    normalizeHttpHeaders = (headers = {}) => {
      const originalKeys = Object.keys(headers);
      const loweredKeys = Object.keys(headers).map((k) => k.toLocaleLowerCase());
      const normalized = loweredKeys.reduce((acc, key, index) => {
        acc[key] = headers[originalKeys[index]];
        return acc;
      }, {});
      return normalized;
    };
    buildUrlParams = (params, shouldEncode = true) => {
      if (!params)
        return null;
      const output = Object.entries(params).reduce((accumulator, entry) => {
        const [key, value] = entry;
        let encodedValue;
        let item;
        if (Array.isArray(value)) {
          item = "";
          value.forEach((str) => {
            encodedValue = shouldEncode ? encodeURIComponent(str) : str;
            item += `${key}=${encodedValue}&`;
          });
          item.slice(0, -1);
        } else {
          encodedValue = shouldEncode ? encodeURIComponent(value) : value;
          item = `${key}=${encodedValue}`;
        }
        return `${accumulator}&${item}`;
      }, "");
      return output.substr(1);
    };
    buildRequestInit = (options, extra = {}) => {
      const output = Object.assign({ method: options.method || "GET", headers: options.headers }, extra);
      const headers = normalizeHttpHeaders(options.headers);
      const type = headers["content-type"] || "";
      if (typeof options.data === "string") {
        output.body = options.data;
      } else if (type.includes("application/x-www-form-urlencoded")) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(options.data || {})) {
          params.set(key, value);
        }
        output.body = params.toString();
      } else if (type.includes("multipart/form-data") || options.data instanceof FormData) {
        const form = new FormData();
        if (options.data instanceof FormData) {
          options.data.forEach((value, key) => {
            form.append(key, value);
          });
        } else {
          for (const key of Object.keys(options.data)) {
            form.append(key, options.data[key]);
          }
        }
        output.body = form;
        const headers2 = new Headers(output.headers);
        headers2.delete("content-type");
        output.headers = headers2;
      } else if (type.includes("application/json") || typeof options.data === "object") {
        output.body = JSON.stringify(options.data);
      }
      return output;
    };
    CapacitorHttpPluginWeb = class extends WebPlugin {
      /**
       * Perform an Http request given a set of options
       * @param options Options to build the HTTP request
       */
      async request(options) {
        const requestInit = buildRequestInit(options, options.webFetchExtra);
        const urlParams = buildUrlParams(options.params, options.shouldEncodeUrlParams);
        const url = urlParams ? `${options.url}?${urlParams}` : options.url;
        const response = await fetch(url, requestInit);
        const contentType = response.headers.get("content-type") || "";
        let { responseType = "text" } = response.ok ? options : {};
        if (contentType.includes("application/json")) {
          responseType = "json";
        }
        let data;
        let blob;
        switch (responseType) {
          case "arraybuffer":
          case "blob":
            blob = await response.blob();
            data = await readBlobAsBase64(blob);
            break;
          case "json":
            data = await response.json();
            break;
          case "document":
          case "text":
          default:
            data = await response.text();
        }
        const headers = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        return {
          data,
          headers,
          status: response.status,
          url: response.url
        };
      }
      /**
       * Perform an Http GET request given a set of options
       * @param options Options to build the HTTP request
       */
      async get(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "GET" }));
      }
      /**
       * Perform an Http POST request given a set of options
       * @param options Options to build the HTTP request
       */
      async post(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "POST" }));
      }
      /**
       * Perform an Http PUT request given a set of options
       * @param options Options to build the HTTP request
       */
      async put(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "PUT" }));
      }
      /**
       * Perform an Http PATCH request given a set of options
       * @param options Options to build the HTTP request
       */
      async patch(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "PATCH" }));
      }
      /**
       * Perform an Http DELETE request given a set of options
       * @param options Options to build the HTTP request
       */
      async delete(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "DELETE" }));
      }
    };
    CapacitorHttp = registerPlugin("CapacitorHttp", {
      web: () => new CapacitorHttpPluginWeb()
    });
  }
});

// node_modules/@capacitor/filesystem/dist/esm/definitions.js
var Directory, Encoding;
var init_definitions = __esm({
  "node_modules/@capacitor/filesystem/dist/esm/definitions.js"() {
    (function(Directory2) {
      Directory2["Documents"] = "DOCUMENTS";
      Directory2["Data"] = "DATA";
      Directory2["Library"] = "LIBRARY";
      Directory2["Cache"] = "CACHE";
      Directory2["External"] = "EXTERNAL";
      Directory2["ExternalStorage"] = "EXTERNAL_STORAGE";
    })(Directory || (Directory = {}));
    (function(Encoding2) {
      Encoding2["UTF8"] = "utf8";
      Encoding2["ASCII"] = "ascii";
      Encoding2["UTF16"] = "utf16";
    })(Encoding || (Encoding = {}));
  }
});

// node_modules/@capacitor/filesystem/dist/esm/web.js
var web_exports = {};
__export(web_exports, {
  FilesystemWeb: () => FilesystemWeb
});
function resolve(path) {
  const posix = path.split("/").filter((item) => item !== ".");
  const newPosix = [];
  posix.forEach((item) => {
    if (item === ".." && newPosix.length > 0 && newPosix[newPosix.length - 1] !== "..") {
      newPosix.pop();
    } else {
      newPosix.push(item);
    }
  });
  return newPosix.join("/");
}
function isPathParent(parent, children) {
  parent = resolve(parent);
  children = resolve(children);
  const pathsA = parent.split("/");
  const pathsB = children.split("/");
  return parent !== children && pathsA.every((value, index) => value === pathsB[index]);
}
var FilesystemWeb;
var init_web = __esm({
  "node_modules/@capacitor/filesystem/dist/esm/web.js"() {
    init_dist();
    init_definitions();
    FilesystemWeb = class _FilesystemWeb extends WebPlugin {
      constructor() {
        super(...arguments);
        this.DB_VERSION = 1;
        this.DB_NAME = "Disc";
        this._writeCmds = ["add", "put", "delete"];
        this.downloadFile = async (options) => {
          var _a, _b;
          const requestInit = buildRequestInit(options, options.webFetchExtra);
          const response = await fetch(options.url, requestInit);
          let blob;
          if (!options.progress)
            blob = await response.blob();
          else if (!(response === null || response === void 0 ? void 0 : response.body))
            blob = new Blob();
          else {
            const reader = response.body.getReader();
            let bytes = 0;
            const chunks = [];
            const contentType = response.headers.get("content-type");
            const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
            while (true) {
              const { done, value } = await reader.read();
              if (done)
                break;
              chunks.push(value);
              bytes += (value === null || value === void 0 ? void 0 : value.length) || 0;
              const status = {
                url: options.url,
                bytes,
                contentLength
              };
              this.notifyListeners("progress", status);
            }
            const allChunks = new Uint8Array(bytes);
            let position = 0;
            for (const chunk of chunks) {
              if (typeof chunk === "undefined")
                continue;
              allChunks.set(chunk, position);
              position += chunk.length;
            }
            blob = new Blob([allChunks.buffer], { type: contentType || void 0 });
          }
          const result = await this.writeFile({
            path: options.path,
            directory: (_a = options.directory) !== null && _a !== void 0 ? _a : void 0,
            recursive: (_b = options.recursive) !== null && _b !== void 0 ? _b : false,
            data: blob
          });
          return { path: result.uri, blob };
        };
      }
      async initDb() {
        if (this._db !== void 0) {
          return this._db;
        }
        if (!("indexedDB" in window)) {
          throw this.unavailable("This browser doesn't support IndexedDB");
        }
        return new Promise((resolve2, reject) => {
          const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
          request.onupgradeneeded = _FilesystemWeb.doUpgrade;
          request.onsuccess = () => {
            this._db = request.result;
            resolve2(request.result);
          };
          request.onerror = () => reject(request.error);
          request.onblocked = () => {
            console.warn("db blocked");
          };
        });
      }
      static doUpgrade(event) {
        const eventTarget = event.target;
        const db = eventTarget.result;
        switch (event.oldVersion) {
          case 0:
          case 1:
          default: {
            if (db.objectStoreNames.contains("FileStorage")) {
              db.deleteObjectStore("FileStorage");
            }
            const store = db.createObjectStore("FileStorage", { keyPath: "path" });
            store.createIndex("by_folder", "folder");
          }
        }
      }
      async dbRequest(cmd, args) {
        const readFlag = this._writeCmds.indexOf(cmd) !== -1 ? "readwrite" : "readonly";
        return this.initDb().then((conn) => {
          return new Promise((resolve2, reject) => {
            const tx = conn.transaction(["FileStorage"], readFlag);
            const store = tx.objectStore("FileStorage");
            const req = store[cmd](...args);
            req.onsuccess = () => resolve2(req.result);
            req.onerror = () => reject(req.error);
          });
        });
      }
      async dbIndexRequest(indexName, cmd, args) {
        const readFlag = this._writeCmds.indexOf(cmd) !== -1 ? "readwrite" : "readonly";
        return this.initDb().then((conn) => {
          return new Promise((resolve2, reject) => {
            const tx = conn.transaction(["FileStorage"], readFlag);
            const store = tx.objectStore("FileStorage");
            const index = store.index(indexName);
            const req = index[cmd](...args);
            req.onsuccess = () => resolve2(req.result);
            req.onerror = () => reject(req.error);
          });
        });
      }
      getPath(directory, uriPath) {
        const cleanedUriPath = uriPath !== void 0 ? uriPath.replace(/^[/]+|[/]+$/g, "") : "";
        let fsPath = "";
        if (directory !== void 0)
          fsPath += "/" + directory;
        if (uriPath !== "")
          fsPath += "/" + cleanedUriPath;
        return fsPath;
      }
      async clear() {
        const conn = await this.initDb();
        const tx = conn.transaction(["FileStorage"], "readwrite");
        const store = tx.objectStore("FileStorage");
        store.clear();
      }
      /**
       * Read a file from disk
       * @param options options for the file read
       * @return a promise that resolves with the read file data result
       */
      async readFile(options) {
        const path = this.getPath(options.directory, options.path);
        const entry = await this.dbRequest("get", [path]);
        if (entry === void 0)
          throw Error("File does not exist.");
        return { data: entry.content ? entry.content : "" };
      }
      /**
       * Write a file to disk in the specified location on device
       * @param options options for the file write
       * @return a promise that resolves with the file write result
       */
      async writeFile(options) {
        const path = this.getPath(options.directory, options.path);
        let data = options.data;
        const encoding = options.encoding;
        const doRecursive = options.recursive;
        const occupiedEntry = await this.dbRequest("get", [path]);
        if (occupiedEntry && occupiedEntry.type === "directory")
          throw Error("The supplied path is a directory.");
        const parentPath = path.substr(0, path.lastIndexOf("/"));
        const parentEntry = await this.dbRequest("get", [parentPath]);
        if (parentEntry === void 0) {
          const subDirIndex = parentPath.indexOf("/", 1);
          if (subDirIndex !== -1) {
            const parentArgPath = parentPath.substr(subDirIndex);
            await this.mkdir({
              path: parentArgPath,
              directory: options.directory,
              recursive: doRecursive
            });
          }
        }
        if (!encoding && !(data instanceof Blob)) {
          data = data.indexOf(",") >= 0 ? data.split(",")[1] : data;
          if (!this.isBase64String(data))
            throw Error("The supplied data is not valid base64 content.");
        }
        const now = Date.now();
        const pathObj = {
          path,
          folder: parentPath,
          type: "file",
          size: data instanceof Blob ? data.size : data.length,
          ctime: now,
          mtime: now,
          content: data
        };
        await this.dbRequest("put", [pathObj]);
        return {
          uri: pathObj.path
        };
      }
      /**
       * Append to a file on disk in the specified location on device
       * @param options options for the file append
       * @return a promise that resolves with the file write result
       */
      async appendFile(options) {
        const path = this.getPath(options.directory, options.path);
        let data = options.data;
        const encoding = options.encoding;
        const parentPath = path.substr(0, path.lastIndexOf("/"));
        const now = Date.now();
        let ctime = now;
        const occupiedEntry = await this.dbRequest("get", [path]);
        if (occupiedEntry && occupiedEntry.type === "directory")
          throw Error("The supplied path is a directory.");
        const parentEntry = await this.dbRequest("get", [parentPath]);
        if (parentEntry === void 0) {
          const subDirIndex = parentPath.indexOf("/", 1);
          if (subDirIndex !== -1) {
            const parentArgPath = parentPath.substr(subDirIndex);
            await this.mkdir({
              path: parentArgPath,
              directory: options.directory,
              recursive: true
            });
          }
        }
        if (!encoding && !this.isBase64String(data))
          throw Error("The supplied data is not valid base64 content.");
        if (occupiedEntry !== void 0) {
          if (occupiedEntry.content instanceof Blob) {
            throw Error("The occupied entry contains a Blob object which cannot be appended to.");
          }
          if (occupiedEntry.content !== void 0 && !encoding) {
            data = btoa(atob(occupiedEntry.content) + atob(data));
          } else {
            data = occupiedEntry.content + data;
          }
          ctime = occupiedEntry.ctime;
        }
        const pathObj = {
          path,
          folder: parentPath,
          type: "file",
          size: data.length,
          ctime,
          mtime: now,
          content: data
        };
        await this.dbRequest("put", [pathObj]);
      }
      /**
       * Delete a file from disk
       * @param options options for the file delete
       * @return a promise that resolves with the deleted file data result
       */
      async deleteFile(options) {
        const path = this.getPath(options.directory, options.path);
        const entry = await this.dbRequest("get", [path]);
        if (entry === void 0)
          throw Error("File does not exist.");
        const entries = await this.dbIndexRequest("by_folder", "getAllKeys", [
          IDBKeyRange.only(path)
        ]);
        if (entries.length !== 0)
          throw Error("Folder is not empty.");
        await this.dbRequest("delete", [path]);
      }
      /**
       * Create a directory.
       * @param options options for the mkdir
       * @return a promise that resolves with the mkdir result
       */
      async mkdir(options) {
        const path = this.getPath(options.directory, options.path);
        const doRecursive = options.recursive;
        const parentPath = path.substr(0, path.lastIndexOf("/"));
        const depth = (path.match(/\//g) || []).length;
        const parentEntry = await this.dbRequest("get", [parentPath]);
        const occupiedEntry = await this.dbRequest("get", [path]);
        if (depth === 1)
          throw Error("Cannot create Root directory");
        if (occupiedEntry !== void 0)
          throw Error("Current directory does already exist.");
        if (!doRecursive && depth !== 2 && parentEntry === void 0)
          throw Error("Parent directory must exist");
        if (doRecursive && depth !== 2 && parentEntry === void 0) {
          const parentArgPath = parentPath.substr(parentPath.indexOf("/", 1));
          await this.mkdir({
            path: parentArgPath,
            directory: options.directory,
            recursive: doRecursive
          });
        }
        const now = Date.now();
        const pathObj = {
          path,
          folder: parentPath,
          type: "directory",
          size: 0,
          ctime: now,
          mtime: now
        };
        await this.dbRequest("put", [pathObj]);
      }
      /**
       * Remove a directory
       * @param options the options for the directory remove
       */
      async rmdir(options) {
        const { path, directory, recursive } = options;
        const fullPath = this.getPath(directory, path);
        const entry = await this.dbRequest("get", [fullPath]);
        if (entry === void 0)
          throw Error("Folder does not exist.");
        if (entry.type !== "directory")
          throw Error("Requested path is not a directory");
        const readDirResult = await this.readdir({ path, directory });
        if (readDirResult.files.length !== 0 && !recursive)
          throw Error("Folder is not empty");
        for (const entry2 of readDirResult.files) {
          const entryPath = `${path}/${entry2.name}`;
          const entryObj = await this.stat({ path: entryPath, directory });
          if (entryObj.type === "file") {
            await this.deleteFile({ path: entryPath, directory });
          } else {
            await this.rmdir({ path: entryPath, directory, recursive });
          }
        }
        await this.dbRequest("delete", [fullPath]);
      }
      /**
       * Return a list of files from the directory (not recursive)
       * @param options the options for the readdir operation
       * @return a promise that resolves with the readdir directory listing result
       */
      async readdir(options) {
        const path = this.getPath(options.directory, options.path);
        const entry = await this.dbRequest("get", [path]);
        if (options.path !== "" && entry === void 0)
          throw Error("Folder does not exist.");
        const entries = await this.dbIndexRequest("by_folder", "getAllKeys", [IDBKeyRange.only(path)]);
        const files = await Promise.all(entries.map(async (e) => {
          let subEntry = await this.dbRequest("get", [e]);
          if (subEntry === void 0) {
            subEntry = await this.dbRequest("get", [e + "/"]);
          }
          return {
            name: e.substring(path.length + 1),
            type: subEntry.type,
            size: subEntry.size,
            ctime: subEntry.ctime,
            mtime: subEntry.mtime,
            uri: subEntry.path
          };
        }));
        return { files };
      }
      /**
       * Return full File URI for a path and directory
       * @param options the options for the stat operation
       * @return a promise that resolves with the file stat result
       */
      async getUri(options) {
        const path = this.getPath(options.directory, options.path);
        let entry = await this.dbRequest("get", [path]);
        if (entry === void 0) {
          entry = await this.dbRequest("get", [path + "/"]);
        }
        return {
          uri: (entry === null || entry === void 0 ? void 0 : entry.path) || path
        };
      }
      /**
       * Return data about a file
       * @param options the options for the stat operation
       * @return a promise that resolves with the file stat result
       */
      async stat(options) {
        const path = this.getPath(options.directory, options.path);
        let entry = await this.dbRequest("get", [path]);
        if (entry === void 0) {
          entry = await this.dbRequest("get", [path + "/"]);
        }
        if (entry === void 0)
          throw Error("Entry does not exist.");
        return {
          type: entry.type,
          size: entry.size,
          ctime: entry.ctime,
          mtime: entry.mtime,
          uri: entry.path
        };
      }
      /**
       * Rename a file or directory
       * @param options the options for the rename operation
       * @return a promise that resolves with the rename result
       */
      async rename(options) {
        await this._copy(options, true);
        return;
      }
      /**
       * Copy a file or directory
       * @param options the options for the copy operation
       * @return a promise that resolves with the copy result
       */
      async copy(options) {
        return this._copy(options, false);
      }
      async requestPermissions() {
        return { publicStorage: "granted" };
      }
      async checkPermissions() {
        return { publicStorage: "granted" };
      }
      /**
       * Function that can perform a copy or a rename
       * @param options the options for the rename operation
       * @param doRename whether to perform a rename or copy operation
       * @return a promise that resolves with the result
       */
      async _copy(options, doRename = false) {
        let { toDirectory } = options;
        const { to, from, directory: fromDirectory } = options;
        if (!to || !from) {
          throw Error("Both to and from must be provided");
        }
        if (!toDirectory) {
          toDirectory = fromDirectory;
        }
        const fromPath = this.getPath(fromDirectory, from);
        const toPath = this.getPath(toDirectory, to);
        if (fromPath === toPath) {
          return {
            uri: toPath
          };
        }
        if (isPathParent(fromPath, toPath)) {
          throw Error("To path cannot contain the from path");
        }
        let toObj;
        try {
          toObj = await this.stat({
            path: to,
            directory: toDirectory
          });
        } catch (e) {
          const toPathComponents = to.split("/");
          toPathComponents.pop();
          const toPath2 = toPathComponents.join("/");
          if (toPathComponents.length > 0) {
            const toParentDirectory = await this.stat({
              path: toPath2,
              directory: toDirectory
            });
            if (toParentDirectory.type !== "directory") {
              throw new Error("Parent directory of the to path is a file");
            }
          }
        }
        if (toObj && toObj.type === "directory") {
          throw new Error("Cannot overwrite a directory with a file");
        }
        const fromObj = await this.stat({
          path: from,
          directory: fromDirectory
        });
        const updateTime = async (path, ctime2, mtime) => {
          const fullPath = this.getPath(toDirectory, path);
          const entry = await this.dbRequest("get", [fullPath]);
          entry.ctime = ctime2;
          entry.mtime = mtime;
          await this.dbRequest("put", [entry]);
        };
        const ctime = fromObj.ctime ? fromObj.ctime : Date.now();
        switch (fromObj.type) {
          // The "from" object is a file
          case "file": {
            const file = await this.readFile({
              path: from,
              directory: fromDirectory
            });
            if (doRename) {
              await this.deleteFile({
                path: from,
                directory: fromDirectory
              });
            }
            let encoding;
            if (!(file.data instanceof Blob) && !this.isBase64String(file.data)) {
              encoding = Encoding.UTF8;
            }
            const writeResult = await this.writeFile({
              path: to,
              directory: toDirectory,
              data: file.data,
              encoding
            });
            if (doRename) {
              await updateTime(to, ctime, fromObj.mtime);
            }
            return writeResult;
          }
          case "directory": {
            if (toObj) {
              throw Error("Cannot move a directory over an existing object");
            }
            try {
              await this.mkdir({
                path: to,
                directory: toDirectory,
                recursive: false
              });
              if (doRename) {
                await updateTime(to, ctime, fromObj.mtime);
              }
            } catch (e) {
            }
            const contents = (await this.readdir({
              path: from,
              directory: fromDirectory
            })).files;
            for (const filename of contents) {
              await this._copy({
                from: `${from}/${filename.name}`,
                to: `${to}/${filename.name}`,
                directory: fromDirectory,
                toDirectory
              }, doRename);
            }
            if (doRename) {
              await this.rmdir({
                path: from,
                directory: fromDirectory
              });
            }
          }
        }
        return {
          uri: toPath
        };
      }
      isBase64String(str) {
        try {
          return btoa(atob(str)) == str;
        } catch (err) {
          return false;
        }
      }
    };
    FilesystemWeb._debug = true;
  }
});

// node_modules/@capacitor/share/dist/esm/web.js
var web_exports2 = {};
__export(web_exports2, {
  ShareWeb: () => ShareWeb
});
var ShareWeb;
var init_web2 = __esm({
  "node_modules/@capacitor/share/dist/esm/web.js"() {
    init_dist();
    ShareWeb = class extends WebPlugin {
      async canShare() {
        if (typeof navigator === "undefined" || !navigator.share) {
          return { value: false };
        } else {
          return { value: true };
        }
      }
      async share(options) {
        if (typeof navigator === "undefined" || !navigator.share) {
          throw this.unavailable("Share API not available in this browser");
        }
        await navigator.share({
          title: options.title,
          text: options.text,
          url: options.url
        });
        return {};
      }
    };
  }
});

// node_modules/@capacitor/local-notifications/dist/esm/web.js
var web_exports3 = {};
__export(web_exports3, {
  LocalNotificationsWeb: () => LocalNotificationsWeb
});
var LocalNotificationsWeb;
var init_web3 = __esm({
  "node_modules/@capacitor/local-notifications/dist/esm/web.js"() {
    init_dist();
    LocalNotificationsWeb = class extends WebPlugin {
      constructor() {
        super(...arguments);
        this.pending = [];
        this.deliveredNotifications = [];
        this.hasNotificationSupport = () => {
          if (!("Notification" in window) || !Notification.requestPermission) {
            return false;
          }
          if (Notification.permission !== "granted") {
            try {
              new Notification("");
            } catch (e) {
              if (e.name == "TypeError") {
                return false;
              }
            }
          }
          return true;
        };
      }
      async getDeliveredNotifications() {
        const deliveredSchemas = [];
        for (const notification of this.deliveredNotifications) {
          const deliveredSchema = {
            title: notification.title,
            id: parseInt(notification.tag),
            body: notification.body
          };
          deliveredSchemas.push(deliveredSchema);
        }
        return {
          notifications: deliveredSchemas
        };
      }
      async removeDeliveredNotifications(delivered) {
        for (const toRemove of delivered.notifications) {
          const found = this.deliveredNotifications.find((n) => n.tag === String(toRemove.id));
          found === null || found === void 0 ? void 0 : found.close();
          this.deliveredNotifications = this.deliveredNotifications.filter(() => !found);
        }
      }
      async removeAllDeliveredNotifications() {
        for (const notification of this.deliveredNotifications) {
          notification.close();
        }
        this.deliveredNotifications = [];
      }
      async createChannel() {
        throw this.unimplemented("Not implemented on web.");
      }
      async deleteChannel() {
        throw this.unimplemented("Not implemented on web.");
      }
      async listChannels() {
        throw this.unimplemented("Not implemented on web.");
      }
      async schedule(options) {
        if (!this.hasNotificationSupport()) {
          throw this.unavailable("Notifications not supported in this browser.");
        }
        for (const notification of options.notifications) {
          this.sendNotification(notification);
        }
        return {
          notifications: options.notifications.map((notification) => ({
            id: notification.id
          }))
        };
      }
      async getPending() {
        return {
          notifications: this.pending
        };
      }
      async registerActionTypes() {
        throw this.unimplemented("Not implemented on web.");
      }
      async cancel(pending) {
        this.pending = this.pending.filter((notification) => !pending.notifications.find((n) => n.id === notification.id));
      }
      async areEnabled() {
        const { display } = await this.checkPermissions();
        return {
          value: display === "granted"
        };
      }
      async requestPermissions() {
        if (!this.hasNotificationSupport()) {
          throw this.unavailable("Notifications not supported in this browser.");
        }
        const display = this.transformNotificationPermission(await Notification.requestPermission());
        return { display };
      }
      async checkPermissions() {
        if (!this.hasNotificationSupport()) {
          throw this.unavailable("Notifications not supported in this browser.");
        }
        const display = this.transformNotificationPermission(Notification.permission);
        return { display };
      }
      transformNotificationPermission(permission) {
        switch (permission) {
          case "granted":
            return "granted";
          case "denied":
            return "denied";
          default:
            return "prompt";
        }
      }
      sendPending() {
        var _a;
        const toRemove = [];
        const now = (/* @__PURE__ */ new Date()).getTime();
        for (const notification of this.pending) {
          if (((_a = notification.schedule) === null || _a === void 0 ? void 0 : _a.at) && notification.schedule.at.getTime() <= now) {
            this.buildNotification(notification);
            toRemove.push(notification);
          }
        }
        this.pending = this.pending.filter((notification) => !toRemove.find((n) => n === notification));
      }
      sendNotification(notification) {
        var _a;
        if ((_a = notification.schedule) === null || _a === void 0 ? void 0 : _a.at) {
          const diff = notification.schedule.at.getTime() - (/* @__PURE__ */ new Date()).getTime();
          this.pending.push(notification);
          setTimeout(() => {
            this.sendPending();
          }, diff);
          return;
        }
        this.buildNotification(notification);
      }
      buildNotification(notification) {
        const localNotification = new Notification(notification.title, {
          body: notification.body,
          tag: String(notification.id)
        });
        localNotification.addEventListener("click", this.onClick.bind(this, notification), false);
        localNotification.addEventListener("show", this.onShow.bind(this, notification), false);
        localNotification.addEventListener("close", () => {
          this.deliveredNotifications = this.deliveredNotifications.filter(() => !this);
        }, false);
        this.deliveredNotifications.push(localNotification);
        return localNotification;
      }
      onClick(notification) {
        const data = {
          actionId: "tap",
          notification
        };
        this.notifyListeners("localNotificationActionPerformed", data);
      }
      onShow(notification) {
        this.notifyListeners("localNotificationReceived", notification);
      }
    };
  }
});

// node_modules/@capacitor/filesystem/dist/esm/index.js
init_dist();
init_definitions();
var Filesystem = registerPlugin("Filesystem", {
  web: () => Promise.resolve().then(() => (init_web(), web_exports)).then((m) => new m.FilesystemWeb())
});

// node_modules/@capacitor/share/dist/esm/index.js
init_dist();
var Share = registerPlugin("Share", {
  web: () => Promise.resolve().then(() => (init_web2(), web_exports2)).then((m) => new m.ShareWeb())
});

// node_modules/@capacitor/local-notifications/dist/esm/index.js
init_dist();

// node_modules/@capacitor/local-notifications/dist/esm/definitions.js
var Weekday;
(function(Weekday2) {
  Weekday2[Weekday2["Sunday"] = 1] = "Sunday";
  Weekday2[Weekday2["Monday"] = 2] = "Monday";
  Weekday2[Weekday2["Tuesday"] = 3] = "Tuesday";
  Weekday2[Weekday2["Wednesday"] = 4] = "Wednesday";
  Weekday2[Weekday2["Thursday"] = 5] = "Thursday";
  Weekday2[Weekday2["Friday"] = 6] = "Friday";
  Weekday2[Weekday2["Saturday"] = 7] = "Saturday";
})(Weekday || (Weekday = {}));

// node_modules/@capacitor/local-notifications/dist/esm/index.js
var LocalNotifications = registerPlugin("LocalNotifications", {
  web: () => Promise.resolve().then(() => (init_web3(), web_exports3)).then((m) => new m.LocalNotificationsWeb())
});

// src/app.js
var STORAGE_KEY = "milk_tracker_data";
var PRICE_COW_KEY = "milk_tracker_price_cow";
var PRICE_BUFFALO_KEY = "milk_tracker_price_buffalo";
var THEME_KEY = "milk_tracker_theme";
var REMINDER_ENABLED_KEY = "milk_tracker_reminder_enabled";
var REMINDER_TIME_KEY = "milk_tracker_reminder_time";
var DATA_FOLDER = "MilkTracker";
var DATA_FILE = "data.json";
var state = {
  data: {},
  // { "YYYY-MM-DD": { cow: float, buffalo: float } }
  cowPrice: 60,
  buffaloPrice: 70,
  // Default buffalo price
  currentDate: (() => {
    const d = /* @__PURE__ */ new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })(),
  isDark: false,
  reminderEnabled: false,
  reminderTime: "08:00"
};
var loginScreen = document.getElementById("login-screen");
var dashboard = document.getElementById("dashboard");
var secretCodeInput = document.getElementById("secret-code-input");
var loginBtn = document.getElementById("login-btn");
var loginError = document.getElementById("login-error");
var dateInput = document.getElementById("entry-date");
var decCowBtn = document.getElementById("dec-cow");
var incCowBtn = document.getElementById("inc-cow");
var qtyCowDisplay = document.getElementById("qty-cow");
var decBuffBtn = document.getElementById("dec-buff");
var incBuffBtn = document.getElementById("inc-buff");
var qtyBuffDisplay = document.getElementById("qty-buff");
var saveBtn = document.getElementById("save-entry-btn");
var copyYesterdayBtn = document.getElementById("copy-yesterday-btn");
var totalCowEl = document.getElementById("total-cow");
var totalBuffaloEl = document.getElementById("total-buffalo");
var totalCostEl = document.getElementById("total-cost");
var historyListEl = document.getElementById("history-list");
var currentMonthDisplay = document.getElementById("current-month-display");
var settingsBtn = document.getElementById("settings-btn");
var settingsModal = document.getElementById("settings-modal");
var closeSettingsBtn = document.getElementById("close-settings");
var priceCowInput = document.getElementById("price-cow-setting");
var priceBuffaloInput = document.getElementById("price-buffalo-setting");
var themeToggle = document.getElementById("theme-toggle");
var reminderToggle = document.getElementById("reminder-toggle");
var reminderTimeInput = document.getElementById("reminder-time");
var whatsappFab = document.getElementById("whatsapp-fab");
var backupBtn = document.getElementById("backup-btn");
var restoreBtn = document.getElementById("restore-btn");
var restoreInput = document.getElementById("restore-input");
async function init() {
  const savedCowPrice = localStorage.getItem(PRICE_COW_KEY);
  if (savedCowPrice) state.cowPrice = parseFloat(savedCowPrice);
  const savedBuffaloPrice = localStorage.getItem(PRICE_BUFFALO_KEY);
  if (savedBuffaloPrice) state.buffaloPrice = parseFloat(savedBuffaloPrice);
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === "dark") {
    state.isDark = true;
    document.body.setAttribute("data-theme", "dark");
    themeToggle.checked = true;
  }
  const savedReminder = localStorage.getItem(REMINDER_ENABLED_KEY);
  if (savedReminder === "true") {
    state.reminderEnabled = true;
    reminderToggle.checked = true;
    reminderTimeInput.style.display = "block";
  }
  const savedTime = localStorage.getItem(REMINDER_TIME_KEY);
  if (savedTime) {
    state.reminderTime = savedTime;
    reminderTimeInput.value = savedTime;
  }
  dateInput.value = state.currentDate;
  priceCowInput.value = state.cowPrice;
  priceBuffaloInput.value = state.buffaloPrice;
  showDashboard();
  await loadData();
}
function showDashboard() {
  if (loginScreen) loginScreen.style.display = "none";
  dashboard.classList.remove("hidden");
  renderSummary();
  renderFullHistory();
}
async function loadData() {
  try {
    try {
      await Filesystem.mkdir({
        path: DATA_FOLDER,
        directory: Directory.Documents,
        recursive: true
      });
    } catch (e) {
    }
    const result = await Filesystem.readFile({
      path: `${DATA_FOLDER}/${DATA_FILE}`,
      directory: Directory.Documents,
      encoding: Encoding.UTF8
    });
    state.data = JSON.parse(result.data);
  } catch (e) {
    console.log("FS Load failed, trying LS", e);
    const localData = localStorage.getItem(STORAGE_KEY);
    if (localData) {
      state.data = JSON.parse(localData);
      saveDataToDisk();
    }
  }
  for (const [date, val] of Object.entries(state.data)) {
    if (typeof val === "number") {
      state.data[date] = { cow: val, buffalo: 0 };
    }
  }
  const today = dateInput.value;
  if (state.data[today]) {
    currentCow = state.data[today].cow || 0;
    currentBuff = state.data[today].buffalo || 0;
    updateDisplay();
  }
  renderSummary();
  renderFullHistory();
}
async function saveDataToDisk() {
  try {
    await Filesystem.writeFile({
      path: `${DATA_FOLDER}/${DATA_FILE}`,
      data: JSON.stringify(state.data),
      directory: Directory.Documents,
      encoding: Encoding.UTF8
    });
  } catch (e) {
    console.error("FS Save failed", e);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  }
}
async function saveData(date, qty) {
  state.data[date] = qty;
  await saveDataToDisk();
  renderSummary();
  renderFullHistory();
}
async function deleteEntry(date) {
  if (confirm(`Delete entry for ${date}?`)) {
    delete state.data[date];
    await saveDataToDisk();
    renderSummary();
    renderFullHistory();
  }
}
var currentCow = 0;
var currentBuff = 0;
function updateDisplay() {
  qtyCowDisplay.innerText = currentCow.toFixed(1);
  qtyBuffDisplay.innerText = currentBuff.toFixed(1);
}
decCowBtn.addEventListener("click", () => {
  if (currentCow > 0) currentCow -= 0.5;
  updateDisplay();
});
incCowBtn.addEventListener("click", () => {
  currentCow += 0.5;
  updateDisplay();
});
decBuffBtn.addEventListener("click", () => {
  if (currentBuff > 0) currentBuff -= 0.5;
  updateDisplay();
});
incBuffBtn.addEventListener("click", () => {
  currentBuff += 0.5;
  updateDisplay();
});
saveBtn.addEventListener("click", async () => {
  const date = dateInput.value;
  if (!date) return alert("Please select a date");
  if (currentCow === 0 && currentBuff === 0) return alert("Please add some milk!");
  await saveData(date, { cow: currentCow, buffalo: currentBuff });
  alert("Saved!");
});
function renderDate(date) {
  const options = { month: "long", year: "numeric" };
  currentMonthDisplay.innerText = date.toLocaleDateString("en-US", options);
}
function getMonthData() {
  const selectedDate = new Date(dateInput.value);
  const [year, month] = dateInput.value.split("-");
  const prefix = `${year}-${month}`;
  const entries = Object.entries(state.data).filter(([k, v]) => k.startsWith(prefix));
  return entries.sort((a, b) => b[0].localeCompare(a[0]));
}
function renderSummary() {
  const entries = getMonthData();
  let totalCow = 0;
  let totalBuff = 0;
  let totalCost = 0;
  entries.forEach(([date, val]) => {
    totalCow += val.cow || 0;
    totalBuff += val.buffalo || 0;
    totalCost += (val.cow || 0) * state.cowPrice;
    totalCost += (val.buffalo || 0) * state.buffaloPrice;
  });
  totalCowEl.innerText = `${totalCow}L`;
  totalBuffaloEl.innerText = `${totalBuff}L`;
  totalCostEl.innerText = `\u20B9${totalCost.toFixed(0)}`;
}
function renderFullHistory() {
  const entries = Object.entries(state.data).sort((a, b) => b[0].localeCompare(a[0]));
  historyListEl.innerHTML = "";
  entries.forEach(([date, qty]) => {
    const item = document.createElement("div");
    item.className = "history-item";
    item.style.alignItems = "center";
    const dateSpan = document.createElement("span");
    dateSpan.className = "history-date";
    dateSpan.textContent = (/* @__PURE__ */ new Date(date + "T00:00:00")).toLocaleDateString();
    const rightDiv = document.createElement("div");
    rightDiv.style.display = "flex";
    rightDiv.style.alignItems = "center";
    rightDiv.style.gap = "10px";
    const amountSpan = document.createElement("span");
    amountSpan.className = "history-amount";
    const cowQty = qty.cow || 0;
    const buffQty = qty.buffalo || 0;
    let text = "";
    if (cowQty > 0) text += `\u{1F404}${cowQty}L `;
    if (buffQty > 0) text += `\u{1F403}${buffQty}L`;
    if (text === "") text = "0L";
    amountSpan.textContent = text;
    amountSpan.style.fontSize = "12px";
    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = "\u{1F5D1}\uFE0F";
    deleteBtn.className = "icon-btn";
    deleteBtn.style.padding = "4px";
    deleteBtn.style.fontSize = "16px";
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteEntry(date);
    };
    rightDiv.appendChild(amountSpan);
    rightDiv.appendChild(deleteBtn);
    item.appendChild(dateSpan);
    item.appendChild(rightDiv);
    historyListEl.appendChild(item);
  });
}
dateInput.addEventListener("change", () => {
  const date = dateInput.value;
  renderDate(/* @__PURE__ */ new Date(date + "T00:00:00"));
  if (state.data[date]) {
    const entry = state.data[date];
    currentCow = entry.cow || 0;
    currentBuff = entry.buffalo || 0;
    copyYesterdayBtn.style.display = "none";
  } else {
    currentCow = 0;
    currentBuff = 0;
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    const yStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (state.data[yStr]) {
      copyYesterdayBtn.style.display = "block";
      copyYesterdayBtn.onclick = () => {
        const yEntry = state.data[yStr];
        currentCow = yEntry.cow || 0;
        currentBuff = yEntry.buffalo || 0;
        updateDisplay();
        copyYesterdayBtn.style.display = "none";
      };
    } else {
      copyYesterdayBtn.style.display = "none";
    }
  }
  updateDisplay();
  renderSummary();
});
settingsBtn.addEventListener("click", () => settingsModal.classList.add("active"));
closeSettingsBtn.addEventListener("click", () => settingsModal.classList.remove("active"));
priceCowInput.addEventListener("change", (e) => {
  state.cowPrice = parseFloat(e.target.value);
  localStorage.setItem(PRICE_COW_KEY, state.cowPrice);
  renderSummary();
});
priceBuffaloInput.addEventListener("change", (e) => {
  state.buffaloPrice = parseFloat(e.target.value);
  localStorage.setItem(PRICE_BUFFALO_KEY, state.buffaloPrice);
  renderSummary();
});
themeToggle.addEventListener("change", (e) => {
  state.isDark = e.target.checked;
  document.body.setAttribute("data-theme", state.isDark ? "dark" : "light");
  localStorage.setItem(THEME_KEY, state.isDark ? "dark" : "light");
});
async function scheduleNotification() {
  if (!state.reminderEnabled) return;
  try {
    await LocalNotifications.createChannel({
      id: "daily_reminder",
      name: "Daily Reminder",
      description: "Reminds you to enter milk data",
      importance: 5,
      // High
      visibility: 1,
      // Public
      vibration: true
    });
    const result = await LocalNotifications.requestPermissions();
    if (result.display !== "granted") {
      alert("Notification permission required for reminders.");
      state.reminderEnabled = false;
      reminderToggle.checked = false;
      localStorage.setItem(REMINDER_ENABLED_KEY, "false");
      return;
    }
    const [hours, minutes] = state.reminderTime.split(":").map(Number);
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
    await LocalNotifications.schedule({
      notifications: [{
        title: "Milk Bahi",
        body: "Don't forget to add today's milk entry! \u{1F95B}",
        id: 1,
        channelId: "daily_reminder",
        schedule: {
          on: {
            hour: hours,
            minute: minutes
          },
          allowWhileIdle: true,
          repeats: true
        }
      }]
    });
  } catch (e) {
    console.error("Error scheduling notification", e);
  }
}
reminderToggle.addEventListener("change", async (e) => {
  state.reminderEnabled = e.target.checked;
  localStorage.setItem(REMINDER_ENABLED_KEY, state.reminderEnabled);
  if (state.reminderEnabled) {
    reminderTimeInput.style.display = "block";
    await scheduleNotification();
  } else {
    reminderTimeInput.style.display = "none";
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
  }
});
reminderTimeInput.addEventListener("change", async (e) => {
  state.reminderTime = e.target.value;
  localStorage.setItem(REMINDER_TIME_KEY, state.reminderTime);
  if (state.reminderEnabled) {
    await scheduleNotification();
  }
});
backupBtn.addEventListener("click", async () => {
  try {
    const backupObject = {
      version: 1,
      timestamp: Date.now(),
      settings: {
        cowPrice: state.cowPrice,
        buffaloPrice: state.buffaloPrice,
        isDark: state.isDark,
        reminderEnabled: state.reminderEnabled,
        reminderTime: state.reminderTime
      },
      data: state.data
    };
    const dataStr = JSON.stringify(backupObject, null, 2);
    const fileName = `milk-tracker-backup-${state.currentDate}.json`;
    const result = await Filesystem.writeFile({
      path: fileName,
      data: dataStr,
      directory: Directory.Cache,
      // Use Cache for temporary sharing
      encoding: Encoding.UTF8
    });
    await Share.share({
      title: "Backup Milk Data",
      text: "Here is your milk tracker backup.",
      url: result.uri,
      dialogTitle: "Save Backup"
    });
  } catch (e) {
    console.error("Backup failed", e);
    const backupObject = {
      version: 1,
      timestamp: Date.now(),
      settings: {
        cowPrice: state.cowPrice,
        buffaloPrice: state.buffaloPrice,
        isDark: state.isDark,
        reminderEnabled: state.reminderEnabled,
        reminderTime: state.reminderTime
      },
      data: state.data
    };
    const dataStr = JSON.stringify(backupObject, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `milk-tracker-backup-${state.currentDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
});
restoreBtn.addEventListener("click", () => {
  restoreInput.click();
});
restoreInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (!imported || typeof imported !== "object") throw new Error("Invalid JSON");
      if (confirm("This will overwrite your current local data. Are you sure?")) {
        let newData = {};
        if (imported.data && imported.settings) {
          if (typeof imported.data !== "object") throw new Error("Invalid Data format");
          const sanitizedData = {};
          for (const [key, val] of Object.entries(imported.data)) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
            if (typeof val !== "object") continue;
            sanitizedData[key] = {
              cow: typeof val.cow === "number" ? val.cow : 0,
              buffalo: typeof val.buffalo === "number" ? val.buffalo : 0
            };
          }
          newData = sanitizedData;
          if (typeof imported.settings.cowPrice === "number") {
            state.cowPrice = imported.settings.cowPrice;
            localStorage.setItem(PRICE_COW_KEY, state.cowPrice);
            priceCowInput.value = state.cowPrice;
          }
          if (typeof imported.settings.buffaloPrice === "number") {
            state.buffaloPrice = imported.settings.buffaloPrice;
            localStorage.setItem(PRICE_BUFFALO_KEY, state.buffaloPrice);
            priceBuffaloInput.value = state.buffaloPrice;
          }
          if (typeof imported.settings.isDark === "boolean") {
            state.isDark = imported.settings.isDark;
            document.body.setAttribute("data-theme", state.isDark ? "dark" : "light");
            localStorage.setItem(THEME_KEY, state.isDark ? "dark" : "light");
            themeToggle.checked = state.isDark;
          }
          if (typeof imported.settings.reminderEnabled === "boolean") {
            state.reminderEnabled = imported.settings.reminderEnabled;
            localStorage.setItem(REMINDER_ENABLED_KEY, state.reminderEnabled);
            reminderToggle.checked = state.reminderEnabled;
            reminderTimeInput.style.display = state.reminderEnabled ? "block" : "none";
          }
          if (typeof imported.settings.reminderTime === "string") {
            state.reminderTime = imported.settings.reminderTime;
            localStorage.setItem(REMINDER_TIME_KEY, state.reminderTime);
            reminderTimeInput.value = state.reminderTime;
          }
          if (state.reminderEnabled) await scheduleNotification();
          else await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
        } else {
          const sanitizedData = {};
          for (const [key, val] of Object.entries(imported)) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
            if (typeof val === "number") {
              sanitizedData[key] = { cow: val, buffalo: 0 };
            } else if (typeof val === "object") {
              sanitizedData[key] = {
                cow: typeof val.cow === "number" ? val.cow : 0,
                buffalo: typeof val.buffalo === "number" ? val.buffalo : 0
              };
            }
          }
          newData = sanitizedData;
        }
        state.data = newData;
        await saveDataToDisk();
        alert("Data and settings restored successfully!");
        renderSummary();
        renderFullHistory();
      }
    } catch (err) {
      alert("Error reading file. Is it a valid backup?");
      console.error(err);
    }
  };
  reader.readAsText(file);
});
whatsappFab.addEventListener("click", () => {
  const entries = getMonthData();
  let totalCow = 0;
  let totalBuff = 0;
  let totalCost = 0;
  entries.forEach(([date, val]) => {
    totalCow += val.cow || 0;
    totalBuff += val.buffalo || 0;
    totalCost += (val.cow || 0) * state.cowPrice;
    totalCost += (val.buffalo || 0) * state.buffaloPrice;
  });
  const [year, month] = dateInput.value.split("-");
  const monthName = new Date(dateInput.value).toLocaleString("default", { month: "long" });
  const text = `*Milk Report for ${monthName} ${year}* \u{1F95B}%0A---------------------------%0ACow Milk: ${totalCow.toFixed(1)} L%0ABuffalo Milk: ${totalBuff.toFixed(1)} L%0ATotal Cost: \u20B9${totalCost.toFixed(0)}%0A---------------------------%0AShared from Milk Bahi%0AMade with \u2764\uFE0F by Pavneet`;
  window.open(`https://wa.me/?text=${text}`, "_blank");
});
var navItems = document.querySelectorAll(".nav-item");
var tabContents = document.querySelectorAll(".tab-content");
navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const targetId = item.getAttribute("data-target");
    navItems.forEach((nav) => nav.classList.remove("active"));
    item.classList.add("active");
    tabContents.forEach((tab) => {
      if (tab.id === targetId) {
        tab.classList.add("active");
      } else {
        tab.classList.remove("active");
      }
    });
    if (targetId === "tab-analytics") renderAnalytics();
  });
});
function renderAnalytics() {
  const entries = getMonthData();
  const sortedEntries = [...entries].sort((a, b) => a[0].localeCompare(b[0]));
  const milkContainer = document.getElementById("graph-milk");
  const costContainer = document.getElementById("graph-cost");
  const avgDailyEl = document.getElementById("ana-avg-daily");
  const projCostEl = document.getElementById("ana-proj-cost");
  milkContainer.innerHTML = "";
  costContainer.innerHTML = "";
  if (sortedEntries.length === 0) {
    milkContainer.innerHTML = '<p style="font-size: 12px; margin: auto; color: var(--secondary-text);">No data for this month</p>';
    costContainer.innerHTML = '<p style="font-size: 12px; margin: auto; color: var(--secondary-text);">No data for this month</p>';
    avgDailyEl.innerText = "0L";
    projCostEl.innerText = "\u20B90";
    return;
  }
  let totalMilk = 0;
  let totalCost = 0;
  let maxDailyMilk = 0;
  let maxDailyCost = 0;
  sortedEntries.forEach(([date, val]) => {
    const c = val.cow || 0;
    const b = val.buffalo || 0;
    const dayTotal = c + b;
    const dayCost = c * state.cowPrice + b * state.buffaloPrice;
    totalMilk += dayTotal;
    totalCost += dayCost;
    if (dayTotal > maxDailyMilk) maxDailyMilk = dayTotal;
    if (dayCost > maxDailyCost) maxDailyCost = dayCost;
  });
  if (maxDailyMilk === 0) maxDailyMilk = 1;
  if (maxDailyCost === 0) maxDailyCost = 1;
  const daysRecorded = sortedEntries.length;
  const avgDaily = totalMilk / daysRecorded;
  const dateObj = new Date(dateInput.value);
  const daysInMonth = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).getDate();
  const avgDailyCost = totalCost / daysRecorded;
  const projectedCost = avgDailyCost * daysInMonth;
  avgDailyEl.innerText = `${avgDaily.toFixed(1)}L`;
  projCostEl.innerText = `\u20B9${projectedCost.toFixed(0)}`;
  const GRAPH_HEIGHT = 140;
  sortedEntries.forEach(([date, val]) => {
    const day = new Date(date).getDate();
    const c = val.cow || 0;
    const b = val.buffalo || 0;
    const dayCost = c * state.cowPrice + b * state.buffaloPrice;
    const milkWrapper = document.createElement("div");
    milkWrapper.style.display = "flex";
    milkWrapper.style.flexDirection = "column";
    milkWrapper.style.alignItems = "center";
    milkWrapper.style.justifyContent = "flex-end";
    milkWrapper.style.height = "100%";
    milkWrapper.style.minWidth = "20px";
    const barContainer = document.createElement("div");
    barContainer.style.display = "flex";
    barContainer.style.flexDirection = "column-reverse";
    barContainer.style.width = "12px";
    barContainer.style.background = "rgba(0,0,0,0.05)";
    barContainer.style.borderRadius = "4px 4px 0 0";
    barContainer.style.overflow = "hidden";
    const cowH = c / maxDailyMilk * GRAPH_HEIGHT;
    const buffH = b / maxDailyMilk * GRAPH_HEIGHT;
    const cowBar = document.createElement("div");
    cowBar.style.height = `${cowH}px`;
    cowBar.style.width = "100%";
    cowBar.style.background = "var(--accent-color)";
    const buffBar = document.createElement("div");
    buffBar.style.height = `${buffH}px`;
    buffBar.style.width = "100%";
    buffBar.style.background = "#FF9500";
    barContainer.appendChild(cowBar);
    barContainer.appendChild(buffBar);
    const milkLabel = document.createElement("div");
    milkLabel.innerText = day;
    milkLabel.style.fontSize = "9px";
    milkLabel.style.color = "var(--secondary-text)";
    milkLabel.style.marginTop = "4px";
    milkWrapper.appendChild(barContainer);
    milkWrapper.appendChild(milkLabel);
    milkContainer.appendChild(milkWrapper);
    const costWrapper = document.createElement("div");
    costWrapper.style.display = "flex";
    costWrapper.style.flexDirection = "column";
    costWrapper.style.alignItems = "center";
    costWrapper.style.justifyContent = "flex-end";
    costWrapper.style.height = "100%";
    costWrapper.style.minWidth = "20px";
    const costBar = document.createElement("div");
    const costH = dayCost / maxDailyCost * GRAPH_HEIGHT;
    costBar.style.height = `${costH}px`;
    costBar.style.width = "12px";
    costBar.style.background = "var(--success-color)";
    costBar.style.borderRadius = "4px 4px 0 0";
    const costLabel = document.createElement("div");
    costLabel.innerText = day;
    costLabel.style.fontSize = "9px";
    costLabel.style.color = "var(--secondary-text)";
    costLabel.style.marginTop = "4px";
    costWrapper.appendChild(costBar);
    costWrapper.appendChild(costLabel);
    costContainer.appendChild(costWrapper);
  });
}
init();
var menuBtn = document.getElementById("menu-btn");
var sidebar = document.getElementById("sidebar");
var sidebarOverlay = document.getElementById("sidebar-overlay");
var checkUpdateBtn = document.getElementById("check-update-btn");
var closeSidebar = () => {
  sidebar.classList.remove("active");
  sidebarOverlay.classList.remove("active");
};
if (menuBtn) {
  menuBtn.addEventListener("click", () => {
    sidebar.classList.add("active");
    sidebarOverlay.classList.add("active");
  });
}
if (sidebarOverlay) {
  sidebarOverlay.addEventListener("click", closeSidebar);
}
if (checkUpdateBtn) {
  checkUpdateBtn.addEventListener("click", () => {
    window.open("https://github.com/pavnxet/Milk-Bahi/releases", "_blank");
  });
}
/*! Bundled license information:

@capacitor/core/dist/index.js:
  (*! Capacitor: https://capacitorjs.com/ - MIT License *)
*/
