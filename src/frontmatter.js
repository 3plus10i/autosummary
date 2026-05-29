// ==UserScript==
// @name         AI网页内容总结(增强版)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  使用AI总结网页内容的油猴脚本，采用Shadow DOM隔离样式
// @author       Jinfeng
// @icon         data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAAAXNSR0IArs4c6QAABMBJREFUeF7tnU2LHGUQx/81wTXBBGRmtqfHCF7Vi+hBjYecA7mbHBTUi3fxBQ+iURERxLugJwPJFzAfIERQQchFIUchTk9Pd1bQkGB2t2TAwdlhd55+3rq6e2qvXS/9/H9PdXdNzfYQ9E9UARLNrsmhAIQ3gQJQAMIKCKfXClAAwgoIp9cKUADCCgin1wpQAMIKCKfXCmg7gGlZnuFdvMaEp8B4mggD4TVZpWfGpfFo8JGVU0Bj5wpg5q28KD9hprcB9AKeU+2hJCE4A8im5Y8gPF+7WpESSkFwAjCZlh8T4YNIWoiFlYBgDWA2+/O5Pd77ue2XnaMo1w3BGkCWl98AeENsm9aQuE4I9gCm5Q0QXlrVgUBg8Fp52mRTFwR7AHnxF0Ana9iI4inqgOAAoFy7zdNkYB2zTqWzfP35r55LbAjWYpkW0DUAcyAxISiAiuUXC4ICqAggViUoAAsAMSAoAEsAoSEoAAcAISEEA7Bostr0FOTbGIa4MQcDsNhIVQAURXH6wT59DcYLcz8C3+jR8TeT5GTmuCEru5keoysH+s/QF0LtAGazu+Pd/Xs3iWj7wGKZ8x4dfyY2hNAAfC9HtQPI8vIqgJcP3WnMl9PR8BXbXWhjHwOADwQJADsAHj1CtNtpMnjcRlBb21gAXCEIACgmAKWHC8d/pMnwtK2oNvYxAczPo8o9cPl8BUCUVwBcOOIS9F06Gr5qI6it7cYDyPO/033c/wWg8Yp4t/nE1rPjU6dmtqLa2G88gLlYWcaPMN15F8QXwbTb6+Eq7/W/TFO6ayOmi21nAbSlEXOBtuxzGMDlhq7x9wBfAaT9TRWkACITUgCRBTaFVwAmhSIfVwCRBTaFVwAmhSIfVwCRBTaF7wQAyXmASWDT8cYCqNqISc8DTAKbjre+EZOeB5gENh1vbAUsTtzUCWZ5KToPMAlsOt5+ANMiA9Ho8IXyJE2Gj5lEkDzefgC57DzAF17rAUjPAzYegPQ8QAH4KiDs3/pLkLB+3ukbC6BqI+atgHCA1jdiwvp5p29sBVRtxLwVEA6gABRAu/9L0pefVoCvgp7+nQCg84D/d0Ht3w3t4jxguahMnwavFmDtAHQecBBBMABVG7EuzgNa9dXETOcBB0ogWAVUbcQynQfIAtB5QKR7QNUK0HlAAwB49kKi7p1oxEQV9EyuADwF9HVXAL4Kevo3FkDVRsxz/eLuOhETRtDYCrB5DBXW0Cu9AvCSz9+5AQDWvevBf4HtjsBZmgxX3wCwdknWnwVN8vIaAefaLVScs2fg+3EyOG8T3RpAlhefAfS+TZINsv00TQZWr/W3BrCzs/PE/X/2bxFha4OENS6Vme89/FDvyX6//7vReMnAGsDcd5LfeY/An9sk6rwt4a10e/CV7TqdAMyTZNPyBxDOLBL6voGw5XGuj5L+WVvx5/bOAOY/4jOdlZcAegfAMZfkHfDZA/iL0fbgQyJ64LIeZwCLZFlZvohdvN7Wn7GyFY0ZBQi/EuM3PsbfjofDn2xjLNt7A/BJrr4elyAVL4wCWgFhdHSOogCcpQvjqADC6OgcRQE4SxfGUQGE0dE5igJwli6MowIIo6NzFAXgLF0YRwUQRkfnKArAWbowjv8CcMJrjudowOkAAAAASUVORK5CYII=
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM.xmlHttpRequest
// @connect      *
// @require      https://cdnjs.cloudflare.com/ajax/libs/markdown-it/13.0.1/markdown-it.min.js
// @license      Apache-2.0
// ==/UserScript==

// Copyright 2024 Jinfeng
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
