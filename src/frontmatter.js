// ==UserScript==
// @name         AI网页内容总结
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  使用AI总结网页内容，提升浏览效率
// @author       3plus10i
// @icon         https://gh-proxy.org/https://github.com/3plus10i/autosummary/main/public/as.png
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM.xmlHttpRequest
// @connect      *
// @require      https://cdnjs.cloudflare.com/ajax/libs/markdown-it/13.0.1/markdown-it.min.js
// @license      Apache-2.0
// ==/UserScript==

// Original work Copyright 2024 Jinfeng
// Modified work Copyright 2026 3plus10i
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
