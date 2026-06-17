(function() {
  'use strict';
  const ctx = window.__AI_SUMMARY__ = window.__AI_SUMMARY__ || {};
  const BASE_URL = "https://page-ag-testing-ohftxirgbn.cn-shanghai.fcapp.run";
  const MAX_ROUNDS = 20;
  const AVAILABLE_MODELS = ["qwen3.5-flash", "qwen3.5-plus"];

  const SP = 'G/3qNAQCvVvzkbApkuZZHh7cAaYaqq94zb7tBqXShLPVoaStbO2CqQ0qxncM5L2dxLjc6JWG6stBtP2DidNF1SX+qxMUi8pLEB9g+SYzd8EAKQCwJQlfhsSoZ8FiWM4+fCA4O81NlMsWa6fW77fGdT4uZFi3gGIZ6UVS7Wff24VO98GUhLVIbFTpxwq0binpJ7ZMp28WV2WzjBfiYvPbI2Ce3KhRe+sZOkx4paw3uou8ihyYqESjpnVjwWXMUKeCF3ZXkwHYl6FjU8n+v8UmJpRFH+VSAOvjeSO4aZ5YFzSQmq4NxG68zxTROThW2j/dxo4jAyUoiWrq3YQUa7s2tys2MyGsNbaKa4kkBqwcmNvj3Mi3z84iCAYxVJQYG6E8S5f2POcM6N3iVw2Y65ko2qWsYnQ/1sLAXLcJbVHPyTQF3iWOv2lQ8c7dPcOh4uf36NQ+GPK5d4xiKdQv1T1Nr48dKTsZGmrePXgluAf5e9q0O5FqAp34zcx2xAAzM7h0Tg6tuXc70T1Nz02OZ5BgIaUOa26fYR1mFANlua9lfE3WPyHUhbqxGVMphmz2eB5sGIb+FKkDHMBtDgdM6oE8lMMMAjwquoYeZuBVhD9JuQYSqWfYZuxA9nZDWwddRSt7mJ9jHSuxvc8eRoDuuEqcULjp/YEDbIaNsq5RkJWEvAmHagbZKnpgCbSOSluFVCTfewbTsiIOY6wp587+7AcNTAtyvkx4Ib3cPT/QXIq2KOR45cKwyGh0I+B+A9vXxi0nAEtRRUn1ata3lp3eVZR0mpYWGNI9M4H9JJPiCo65y72666JqMuztQLPMh8s4TIdoTHiB2BqfE0B+sJpC1UUXVd5BpqRkHeOeXsotPaW+IVP0zdqDso76dUpMncFfIDhOv+MBqegbaXIah19t2KRjGsDoSK4oW+Uk5gOmix3LjIsLg2iopIi1giKRipvQUDayvz6hcmfF7pm/6QkAmiBj9GQ6CMZjYF+XJbU5ITwyrZ6J9Gd9G/yxGHFPbT1awI3I75aJIA38yt0yoBGPoQe3grBNdmdI3FQDzDQzqnTM0jFE4QRfh/MsYcaDIz3h5QRy7L3ifaG+Z6/JOzjbbMNhvrJ76RpOqdrh9bGXjnu5q6EB+wt8aVVOFQEhqdKka1u9b2tjLpfZM1Lgcu+afhz80cgmrB310xx/BHSV4JY/Y/wgrznbRV9muwjLcjlAdlTy59KnfBhiNqnSdcaEkwiB/3nPmZqrzpKSV39l3eOWcbqGn0KDVZ0lC4BkeJ5ImIkWbNUvchjKstLI4S4/pf9gEhVoEt4YnsFmqeKBtkeqhoUnERFkd4WDWB7j7p7MNe5zEYyaTtJAdrTu5TxyhIqIutjRxnbc2J1zio0THC3eQXmW5x6Zm5nptroTYUnAu/A8elceUtPM4XcalIbLld9f9BQD12ZDKxnZTz9XNxL7y0IYCabEeo5nmYmGjg/55sSAtjZCy5Vv8rrdtyfu9T7RqNyDBJxesG6tJgpNkgbuqWcmIw2Zw0/DYZ7D5twabBrJJD7dwU0/dd6u3dJjjJj9uylZtwkfbq/gTlcd51YQBOoIeOUSxezNfnvvnRU2deL/KhABoTo/9IdtaQyI8z4t/eVaYLwtnO8Ov9lpGsmFe3rt0jB99CuxWzLJJdhF7t35R/6qhwhzLI2kTu714Q7MuRxRQyONX06ZNrkUu88KHvvU01W921QfxB/QzNPidcPJ2ClULKVWWSBhezksOQBUAfzxMOjo6UFTa1NvJbb1VyRj3EptJugN2GQzDCvRi+0jkph63TlLdM8rZl8Tx62CvieUTuHRS40aEGRfEtqrZd6zO3GzAVLEqYYMdKAeziiGPEyXuk/b5V59wa44TH42gwc+z6xaK/lGP0zGi2qwhrc6Ja0jjvxeomYey6hj6Cqpc6DAoHJrKkto76kCdQPiCar7GpmUZjcTqpStrmKO3bGhKi/85Iv8KHadTvtjektBSOejIjLboD6R80I+a+ukbLVShCe0zL16W6xxs6PLnz3/YqTCc0IZGSpkN6z+yH637vRfk75rsToWe1vTFt29AlP6wxt9vXrycApZV5dbp173SQE6PQqylFAV0yB8Stt4Rk2EVziwiX97LMLX+tBZtMp1xRnL7XdlPN9GUtXwTDxN7brOAWAfJyQ3P8VIu/ypiX44ebx5qolKxTvZZgQXN3g+nerVWxupHaGVQV2nGbiIhFn3HJ748Wf4wqU2VDnMu4xlTJjogxJK3ZZNiVbJHxd4ETcBKGnqH8OsB6YAo27IGWhbn58JruZcbclNVuKURLj3ckAfp6M46dVJBtxnIHGyu6dbO2EBZf9ef21OxIlfpzbsxQA6cudxcGFQYtgI/UGTCOdKBIL5dibbEj2JK1B+/Q1XANZ7hZuvWDwtYEW0/vtW9WDGxRc7QClK4452cc/aamJgx4flJ2+/Wsf/Cd5hrvUxeG7NEmSpuyO96rHf9+VDhwBDTbhIy2KVA/KseSJU+dqEHK/tBa/JjwWoT96leyd3eEvVw0bm44KrCj7HzXxN2ByPeuXaS9goDj+WLqEpNyEJkQsW3WGH/wZKTDiU2+Aj7vKmBU2ruhdZXQNOvUXakq2ejUq0pjUEpoABY37DiLod+onFl4OKSlnltU26WgQhsAKopFoN2aEb7SOAw/43lC59KLrk7aWijjFacZctO3I5bZvlOTyRk5bvplwfsXErdnbNIesp/e8edj0TIp+nATp0fvS+/AftQeVzj6fq3ag5bS/BIepMdKq6eA8qetvymlXeIdeX5x3Ml0dDdocwt/ypM++5H4lvO2Dt9Ytk6F6oDzsYQ6J5Vr37iujSpv9KcxtfIkYnGOPhd3blzKjnfQfh/dBAr3g+NTJdbDrjPwWEr2Rss9ODKWx5vrsVWEpcYWCrpDgaT2RHbfGl8lE34fcsghTJfNo+p+QIKsTd04YDMsUoANWykB9XpMAtflsKdapBEzibbQRxx2PJvj1RaTwitPcNifHJknnoSwmo/XaJ96VfxwfZ50IEX4qM3BBTMUXhpw5Sn5qKFw71HlnWCusRQieC7lLOOLvvZ8f4Ym0PfRj5E+rdlu07Knc/59rYF4NL+AGDS/UCx988ooO8j1t+ol8kQcCNeSmqxfhF9rHsEuWQIJiL0WYUAnXjZxfL/HQDXq8OxP9EkWNeL0QmieIZZgVKhXkUF6zjyOVA537y2Wx2vf3LXgRK6YVsWiCExMqidobytjUTciBnuwf237tlonQ+XRj1GHXqkFJgK8jNLAFJYGYXG4UB8IXUstAPsYEzQVDKGgS2H9BUEYmVEi2lpXmF+Y64BcfrLoT59Wkk/x0kBhJR2qCu4w9dRQasG8ILD/dhsLy1McZDfsIKWWlst4JjXzT81kMp/oUzOIF/1iuq1gZKQYdopsneekue8NQmx8J1t3tnOXEJbZky1Px7xbFdG/zORbEudTVoqMuPWIvWdQMcafByLRJxvOW7YimV8CPNIUUozGBXAOoLE1dmhYYDImm1chKxeZyN+Nirr9D2vktvXujjV3D4xMXDnQC6oMzKkXzqE3yYEURtyQPAB5fqhunhmXvKb0msOj2fqMg/UrCaUD8EebudB+LXhv2WwETPqBsvgQmwfiZlW4IiPJ2wXAo6Z1XMk2+foSgH4KzigbdoDCYKnZGFqbLijl2+MtGSb1aMHpIWEhaSgNoEpw5bC/jxaGweIlT4WhsAycdKOnxgfPm5UcTS1yexPDmS2zk1Y9W9rkmD5kzURNsu82sRZv4zYVRF5+FS0Ge4lHLHr+13/AS6eEetDvNL61M3a5dfpVZ+vO6Vkgby+HnCJyDkNSz5aLhFfY+IOsKNI6HtLYbgxwV9871GyAo9vDVY/Ro8xr9wT0kWO0mSL5k6C0RsJVuhujyVuUHwYRACG5qAtKq+zR6JjUAjJUeLn4oF9QrvLbMW5ONxvnd2UjHW7xytOpraw0hwai3mKxX6v7o0472RpajNjHHecl6r96jv+00jkRnddL5wmo7TPDs8SkobHpqhAmW9uhDMuMzg8fjotYjTqOcel955TDimMHqlkrVihUxGSVVkfYttGmrTUyUAs5GaRNH+B9F/OGZYwwr0aXJVx+qtDVsYlWav14wAthzYm8nh0rUAruq27PyxBoCgfLZUwe0oPEvVjfq3KGisKW8QMCccspRtUZ93ufMrkIYGIW/wUbmPs//maJFZaf4uH+1eRK0J6q5S26syT1P4iiHuWheZpFnCWY7zJwuy63LxdVV84GxFK10tuNgYLLJnq6dT6MPPnjPVId2OI2SbjtDcwkyYiBZmXgjy3QY8GCkM5DJvnnq9n5W2OZb3S1IJq/Y+fy5/oCmJ5ebhY/zvJ2h+yyXPmDSHGG09RQKza+jEHsz63yyomNvbKiIA6+w5yEZkGXeOuWATF9DwVO/CZUCgBqMmkvPOD5MzKp2cwkR53Qfqn+0v8BrIdh3xxBy8gKdX0fQlOky4YZIOd4ZHafnMB8UuYBVEz2qrHj0K+u9AohSXquSjKEqALAVPJSZ0rRbFgMGNhxkEg5HkUPOBpKFxMlC9TCJcplTzX04kwzqC+9s0tXYm7wsrnCVzXHr6/0cs/MkFR4Hf9XZTW9dGQtV9249EV45UkuCRWm6cE4BAZqxHMp1TuJqlyoOEHhjMS+BZyuOloRBLTNLWyOsGtws48nVPxqhw+7Edm/ZfHhPoMqigZKgkUc8LdHB3+3bTy4z+7wVIigihgVHay+SFFVyFb0Vo8PBcmuNNKe+srpIX1jaOq1ael5i8/EWuh85MHnWJvyx38CJ3euXZxuG+oGj9vy/eV15oEnJCymUewMVJhM1PoClXNO48SxtSwrIU0+7VhqicEpchPdoHPUr6FPA8uEVGqiraoMnGXknoRR75dK408dbB5YYDQiBTvu1fQz4QiOaUf6+nqu79oZqzE0B0wWx1dgIkNbzVVDYbXQQfZHYj0fGd5L/v2lVlFkmEQBNxP13PwG3Xo9B1avubxNmavmKFBR0fvlCKxHM84Klr340/0HnwNhvYOzoT4sWR+HGnyM0gp+WIlcWPIpLFH11C2HhHKWqAh5kqnxQknB+EF+ZhTP/aUPZmRY+HHdfRtDvhISXi6rrXRcViXP/9m46ciLVSR1FkBvQ8d2PnV068cY852BheiMq8H5DQ4mBxhl/2Af+og3wXJ+pNiPu1BMGcmhX+N4ETEsoUTNAWzmhQoQm4DS6mhfr3lUhsXStv4X42T7U94rMyqjLY2t5SohLLUxm4YXgziPWa0tTPb4qW6iyHULqDm6kQhimwW0ecmD2ZVy9iPlPcvaBfFAx3svXIXkozCvi/7a/1gFP5ll8FAUNG6MEl1M6wCtCf8EI6VHwblXJdg+yO';

  class AIService {
    static _prompt = null;

    static async init() {
      if (this._prompt) return;
      this._prompt = await this._decodePrompt();
    }

    static getSystemPrompt() {
      return this._prompt;
    }

    static async _decodePrompt() {
      const encoded = SP;
      const binary = atob(encoded);
      const xored = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) xored[i] = binary.charCodeAt(i);
      const kb = new TextEncoder().encode('caonima');
      const compressed = new Uint8Array(xored.length);
      for (let i = 0; i < xored.length; i++) compressed[i] = xored[i] ^ kb[i % kb.length];
      const stream = new Blob([compressed]).stream()
        .pipeThrough(new DecompressionStream('deflate'));
      const reader = stream.getReader();
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const total = chunks.reduce((s, c) => s + c.length, 0);
      const result = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) { result.set(c, offset); offset += c.length; }
      return new TextDecoder().decode(result);
    }

    constructor(model = "qwen3.5-flash") {
      this.setModel(model);
      this.messages = [{ role: "system", content: AIService.getSystemPrompt() }];
    }

    get model() { return this._model; }

    setModel(model) {
      if (!AVAILABLE_MODELS.includes(model)) {
        throw new Error(`不支持的模型: ${model}，可用: ${AVAILABLE_MODELS.join(", ")}`);
      }
      this._model = model;
    }

    static get availableModels() { return [...AVAILABLE_MODELS]; }

    /** 发送用户消息，返回 AI 回复（非流式） */
    async chat(userContent, userSystemPrompt = '') {
      let message = '';
      if (userSystemPrompt) {
        message += `<final_system_prompt>${userSystemPrompt}</final_system_prompt>`;
      }
      message += `<target_content>${userContent}</target_content>`
      this.messages.push({ role: "user", content: message });

      this._trimHistory();

      const response = await new Promise((resolve, reject) => {
        GM.xmlHttpRequest({
          method: "POST",
          url: `${BASE_URL}/v1/chat/completions`,
          headers: { "Content-Type": "application/json", "Origin": window.location.origin },
          data: JSON.stringify({
            model: this._model,
            messages: this.messages,
            temperature: 0.7
          }),
          onload: (r) => resolve(r),
          onerror: (e) => reject(new Error('网络请求错误')),
          ontimeout: () => reject(new Error('请求超时'))
        });
      });

      const raw = response.responseText;
      let data;
      try { data = JSON.parse(raw); } catch { throw new Error(raw); }

      if (response.status < 200 || response.status >= 300) throw new Error(JSON.stringify(data, null, 2));

      const reply = data?.choices?.[0]?.message?.content
        || JSON.stringify(data, null, 2);

      this.messages.push({ role: "assistant", content: reply });
      return reply;
    }

    /** 清空对话历史，保留 system prompt */
    clearHistory() {
      this.messages = [{ role: "system", content: AIService.getSystemPrompt() }];
    }

    /** 裁剪历史到最多 MAX_ROUNDS 轮 */
    _trimHistory() {
      const maxMsgs = 1 + MAX_ROUNDS * 2; // system + N轮(用户+助手)
      if (this.messages.length > maxMsgs) {
        this.messages = [
          this.messages[0],
          ...this.messages.slice(this.messages.length - (maxMsgs - 1))
        ];
      }
    }
  }
  ctx.AIService = AIService;
})();