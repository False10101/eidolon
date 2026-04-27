const fs = require('fs');
const path = require('path');

const locales = {
  en: { fxNotice: "Local amounts are approximate and updated daily. Charges are always processed in USD.", min: "Min", max: "Max", creditsLabel: "credits", noteGenerations: "note generations", bonus: "bonus" },
  es: { fxNotice: "Las cantidades locales son aproximadas y se actualizan diariamente. Los cargos siempre se procesan en USD.", min: "Mín", max: "Máx", creditsLabel: "créditos", noteGenerations: "generaciones de apuntes", bonus: "bonus" },
  zh: { fxNotice: "当地金额为估算值并每日更新。所有费用均以美元 (USD) 结算。", min: "最低", max: "最高", creditsLabel: "积分", noteGenerations: "次笔记生成", bonus: "奖励" },
  th: { fxNotice: "จำนวนเงินท้องถิ่นเป็นค่าโดยประมาณและอัปเดตทุกวัน ค่าบริการจะถูกเรียกเก็บเป็นดอลลาร์สหรัฐ (USD) เสมอ", min: "ต่ำสุด", max: "สูงสุด", creditsLabel: "เครดิต", noteGenerations: "ครั้งในการสร้างบันทึก", bonus: "โบนัส" },
  hi: { fxNotice: "स्थानीय राशियां अनुमानित हैं और प्रतिदिन अपडेट की जाती हैं। शुल्क हमेशा USD में संसाधित किए जाते हैं।", min: "न्यूनतम", max: "अधिकतम", creditsLabel: "क्रेडिट", noteGenerations: "नोट जनरेशन", bonus: "बोनस" },
  id: { fxNotice: "Jumlah lokal merupakan perkiraan dan diperbarui setiap hari. Tagihan selalu diproses dalam USD.", min: "Min", max: "Maks", creditsLabel: "kredit", noteGenerations: "generasi catatan", bonus: "bonus" },
  pt: { fxNotice: "Os valores locais são aproximados e atualizados diariamente. As cobranças são sempre processadas em USD.", min: "Mín", max: "Máx", creditsLabel: "créditos", noteGenerations: "gerações de notas", bonus: "bônus" },
  fr: { fxNotice: "Les montants locaux sont approximatifs et mis à jour quotidiennement. Les frais sont toujours traités en USD.", min: "Min", max: "Max", creditsLabel: "crédits", noteGenerations: "générations de notes", bonus: "bonus" }
};

for (const [lang, translations] of Object.entries(locales)) {
  const file = path.join(__dirname, '../messages', `${lang}.json`);
  if (!fs.existsSync(file)) continue;
  
  const content = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!content.topup) content.topup = {};
  
  content.topup.fxNotice = translations.fxNotice;
  content.topup.min = translations.min;
  content.topup.max = translations.max;
  content.topup.creditsLabel = translations.creditsLabel;
  content.topup.noteGenerations = translations.noteGenerations;
  content.topup.bonus = translations.bonus;
  
  fs.writeFileSync(file, JSON.stringify(content, null, 2) + '\n');
  console.log(`[+] Patched topup remaining keys for ${lang}.json`);
}
