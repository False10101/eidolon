const fs = require('fs');
const path = require('path');

const locales = {
  en: { leaving: "Leaving…", kicking: "Kicking…" },
  es: { leaving: "Saliendo…", kicking: "Expulsando…" },
  zh: { leaving: "正在离开…", kicking: "正在踢出…" },
  th: { leaving: "กำลังออก…", kicking: "กำลังเตะ…" },
  hi: { leaving: "छोड़ रहा है…", kicking: "निकाल रहा है…" },
  id: { leaving: "Keluar…", kicking: "Mengeluarkan…" },
  pt: { leaving: "Saindo…", kicking: "Expulsando…" },
  fr: { leaving: "Départ…", kicking: "Expulsion…" }
};

for (const [lang, translations] of Object.entries(locales)) {
  const file = path.join(__dirname, '../messages', `${lang}.json`);
  if (!fs.existsSync(file)) continue;
  
  const content = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!content.groups) content.groups = {};
  
  content.groups.leaving = translations.leaving;
  content.groups.kicking = translations.kicking;
  
  fs.writeFileSync(file, JSON.stringify(content, null, 2) + '\n');
  console.log(`[+] Patched groups leaving/kicking keys for ${lang}.json`);
}
