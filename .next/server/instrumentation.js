"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "instrumentation";
exports.ids = ["instrumentation"];
exports.modules = {

/***/ "child_process":
/*!********************************!*\
  !*** external "child_process" ***!
  \********************************/
/***/ ((module) => {

module.exports = require("child_process");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("fs");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

/***/ }),

/***/ "(instrument)/./src/instrumentation.ts":
/*!********************************!*\
  !*** ./src/instrumentation.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   register: () => (/* binding */ register)\n/* harmony export */ });\n/**\n * Next.js instrumentation - runs once when the server starts.\n * Starts the scheduled .bat runner so reports run without opening the app.\n */ async function register() {\n    if (true) {\n        const { startBatScheduler } = await __webpack_require__.e(/*! import() */ \"_instrument_src_lib_bat-scheduler_ts\").then(__webpack_require__.bind(__webpack_require__, /*! ./lib/bat-scheduler */ \"(instrument)/./src/lib/bat-scheduler.ts\"));\n        startBatScheduler();\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGluc3RydW1lbnQpLy4vc3JjL2luc3RydW1lbnRhdGlvbi50cyIsIm1hcHBpbmdzIjoiOzs7O0FBQUE7OztDQUdDLEdBRU0sZUFBZUE7SUFDcEIsSUFBSUMsSUFBcUMsRUFBRTtRQUN6QyxNQUFNLEVBQUVHLGlCQUFpQixFQUFFLEdBQUcsTUFBTSx1TUFBNkI7UUFDakVBO0lBQ0Y7QUFDRiIsInNvdXJjZXMiOlsid2VicGFjazovL3JlcXVlc3QtbWFuYWdlci8uL3NyYy9pbnN0cnVtZW50YXRpb24udHM/NGZhYiJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIE5leHQuanMgaW5zdHJ1bWVudGF0aW9uIC0gcnVucyBvbmNlIHdoZW4gdGhlIHNlcnZlciBzdGFydHMuXG4gKiBTdGFydHMgdGhlIHNjaGVkdWxlZCAuYmF0IHJ1bm5lciBzbyByZXBvcnRzIHJ1biB3aXRob3V0IG9wZW5pbmcgdGhlIGFwcC5cbiAqL1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVnaXN0ZXIoKSB7XG4gIGlmIChwcm9jZXNzLmVudi5ORVhUX1JVTlRJTUUgPT09IFwibm9kZWpzXCIpIHtcbiAgICBjb25zdCB7IHN0YXJ0QmF0U2NoZWR1bGVyIH0gPSBhd2FpdCBpbXBvcnQoXCIuL2xpYi9iYXQtc2NoZWR1bGVyXCIpO1xuICAgIHN0YXJ0QmF0U2NoZWR1bGVyKCk7XG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJyZWdpc3RlciIsInByb2Nlc3MiLCJlbnYiLCJORVhUX1JVTlRJTUUiLCJzdGFydEJhdFNjaGVkdWxlciJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(instrument)/./src/instrumentation.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("./webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__("(instrument)/./src/instrumentation.ts"));
module.exports = __webpack_exports__;

})();