
document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const domain = new URL(tab.url).hostname;
  const toggle = document.getElementById("toggleEnabled");

  chrome.storage.local.get(["disabledSites"], (result) => {
    const disabled = result.disabledSites || [];
    toggle.checked = !disabled.includes(domain);
  });

  toggle.addEventListener("change", () => {
    chrome.storage.local.get(["disabledSites"], (result) => {
      let disabled = result.disabledSites || [];
      if (!toggle.checked) {
        if (!disabled.includes(domain)) disabled.push(domain);
      } else {
        disabled = disabled.filter(site => site !== domain);
      }
      chrome.storage.local.set({ disabledSites: disabled });
    });
  });

  fetch(chrome.runtime.getURL("lawlist.json"))
    .then(res => res.json())
    .then(data => {
      document.getElementById("lawCount").textContent = data.length;
      const lawListDiv = document.getElementById("lawList");
      data.forEach(entry => {
        const div = document.createElement("div");
        div.className = "law-entry";
        div.textContent = entry.lawName;
        lawListDiv.appendChild(div);
      });
    });
});
