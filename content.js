let lawMap = {};
fetch(chrome.runtime.getURL("lawlist.json"))
  .then(res => res.json())
  .then(list => {
    lawMap = Object.fromEntries(list.map(l => [l.lawName, { num: l.lawNum, id: l.lawId }]));
    walkAndWrapMatches(document.body);
    attachPopupEvents();
  });

const colors = ["#ffeeee", "#e0ffff", "#ffffe0", "#e0ffe0", "#f0e0ff"];
let colorIndex = 0;

function walkAndWrapMatches(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  const regex = /([一-龥ぁ-んァ-ンーa-zA-Z0-9々]+)(第?[0-9０-９一二三四五六七八九十百千万]+条)/g;
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    const matches = [...node.textContent.matchAll(regex)];
    if (matches.length === 0) continue;

    const span = document.createElement("span");
    let lastIndex = 0;
    for (const match of matches) {
      let [full, rawLaw, rawNum] = match;
      let cleanLaw = rawLaw.replace(/^[がにとでやはもへを]+/, "").replace(/[（(「『〈【《].*$/, "");
      const lawKey = Object.keys(lawMap).find(key => cleanLaw.startsWith(key));
      if (!lawKey) continue;

      const lawRef = lawMap[lawKey];
      const rawNumWithDai = rawNum.startsWith("第") ? rawNum : "第" + rawNum;
      const num = normalizeNum(rawNumWithDai);

      span.appendChild(document.createTextNode(node.textContent.slice(lastIndex, match.index)));
      const mark = document.createElement("span");
      mark.className = "law-article";
      mark.dataset.law = lawKey;
      mark.dataset.num = num;
      mark.dataset.lawNum = lawRef.num;
      mark.dataset.lawId = lawRef.id;
      mark.textContent = full;
      mark.style.backgroundColor = colors[colorIndex++ % colors.length];
      span.appendChild(mark);
      lastIndex = match.index + full.length;
    }
    span.appendChild(document.createTextNode(node.textContent.slice(lastIndex)));
    node.replaceWith(span);
  }
}

function normalizeNum(str) {
  return str.replace(/[第条]/g, "").replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 65248)).trim();
}

function attachPopupEvents() {
  document.querySelectorAll(".law-article").forEach(el => {
    el.addEventListener("mouseenter", async e => {
      const law = el.dataset.law;
      const lawId = el.dataset.lawId;
      const rawNum = el.textContent.match(/第?[0-9０-９一二三四五六七八九十百千万]+条/)[0];
      const article = normalizeNum(rawNum);
      const num = article;

      if (!lawId || isNaN(parseInt(num))) return;

      const url = `https://elaws.e-gov.go.jp/api/1/articles?lawId=${lawId}&article=${encodeURIComponent(article)}`;
      console.log("📄 API Request:", url);
      let sentences = "";
      try {
        const res = await fetch(url);
        if (res.ok) {
          const xml = await res.text();
          const doc = new DOMParser().parseFromString(xml, "text/xml");
          sentences = [...doc.querySelectorAll("ParagraphSentence")].map(e => e.textContent.trim()).join("\n");
        } else {
          const fallbackUrl = `https://elaws.e-gov.go.jp/api/1/lawdata/${lawId}`;
          const fallbackRes = await fetch(fallbackUrl);
          const xml = await fallbackRes.text();
          const doc = new DOMParser().parseFromString(xml, "text/xml");
          const articleNode = [...doc.querySelectorAll("Article")].find(a => a.getAttribute("Num") === article);
          if (articleNode) {
            sentences = [...articleNode.querySelectorAll("ParagraphSentence")].map(e => e.textContent.trim()).join("\n");
          }
        }
      } catch (e) {
        console.warn("❌ fetch error:", e);
      }

      document.querySelectorAll(".popup").forEach(p => p.remove());

      const popup = document.createElement("div");
      popup.className = "popup";
      popup.innerHTML = "<strong>" + law + "第" + num + "条</strong><br><pre>" + (sentences || "（本文なし）") + "</pre>" + `<br><a href="https://laws.e-gov.go.jp/document?lawid=${lawId}" target="_blank">📄 e-Govで全文を見る</a>`;
      popup.innerHTML += '<div class="version-tag">インターネット六法 v13.4.6</div>';
      popup.innerHTML += '<div class="popup-close">× 閉じる</div>';
      document.body.appendChild(popup);

      requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const popupWidth = popup.offsetWidth || 300;
        const maxLeft = window.innerWidth - popupWidth - 12;
        const leftAdjust = Math.min(window.scrollX + rect.left, maxLeft);
        const top = window.scrollY + rect.bottom + 8;
        popup.style.left = `${Math.max(12, leftAdjust)}px`;
        popup.style.top = `${top}px`;
      });

      popup.querySelector(".popup-close").addEventListener("click", () => popup.remove());
    });
  });
}