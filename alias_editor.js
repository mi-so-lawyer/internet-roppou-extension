document.addEventListener("DOMContentLoaded", async () => {
  const lawSelector = document.getElementById("lawSelector");
  const newAliasInput = document.getElementById("newAlias");
  const addAliasBtn = document.getElementById("addAliasBtn");
  const aliasListDiv = document.getElementById("aliasList");

  let lawList = [];
  let userAliases = {};

  const res = await fetch(chrome.runtime.getURL("lawlist.json"));
  lawList = await res.json();
  lawList.forEach(entry => {
    const option = document.createElement("option");
    option.value = entry.lawName;
    option.textContent = entry.lawName;
    lawSelector.appendChild(option);
  });

  chrome.storage.local.get(["aliases"], (result) => {
    userAliases = result.aliases || {};
    renderAliasList();
  });

  addAliasBtn.addEventListener("click", () => {
    const law = lawSelector.value;
    const alias = newAliasInput.value.trim();
    if (!alias) return;

    if (!userAliases[law]) userAliases[law] = [];
    if (!userAliases[law].includes(alias)) {
      userAliases[law].push(alias);
      chrome.storage.local.set({ aliases: userAliases }, renderAliasList);
      newAliasInput.value = "";
    }
  });

  function renderAliasList() {
    aliasListDiv.innerHTML = "";
    const law = lawSelector.value;
    const aliases = userAliases[law] || [];
    aliases.forEach((alias, idx) => {
      const div = document.createElement("div");
      div.className = "alias-entry";
      const span = document.createElement("span");
      span.textContent = alias;
      const delBtn = document.createElement("button");
      delBtn.textContent = "削除";
      delBtn.addEventListener("click", () => {
        aliases.splice(idx, 1);
        chrome.storage.local.set({ aliases: userAliases }, renderAliasList);
      });
      div.appendChild(span);
      div.appendChild(delBtn);
      aliasListDiv.appendChild(div);
    });
  }

  lawSelector.addEventListener("change", renderAliasList);

  document.getElementById("downloadMerged").addEventListener("click", () => {
    const merged = lawList.map(l => {
      const aliases = Array.from(new Set([...(l.aliases || []), ...(userAliases[l.lawName] || [])]));
      return { ...l, aliases };
    });
    const blob = new Blob([JSON.stringify(merged, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lawlist.json";
    a.click();
    URL.revokeObjectURL(url);
  });
});