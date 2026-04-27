const fs = require('fs');
const path = require('path');

const locales = {
  en: { redirect_msg: "You'll be redirected to Stripe's secure checkout to complete payment." },
  es: { redirect_msg: "Serás redirigido a la página de pago seguro de Stripe para finalizar tu pago." },
  zh: { redirect_msg: "您将被重定向到 Stripe 安全支付页面以完成付款。" },
  th: { redirect_msg: "คุณจะถูกเปลี่ยนเส้นทางไปยังหน้าชำระเงินที่ปลอดภัยของ Stripe เพื่อชำระเงินให้เสร็จสมบูรณ์" },
  hi: { redirect_msg: "भुगतान पूरा करने के लिए आपको धारी (Stripe) के सुरक्षित चेकआउट पर भेजा जाएगा।" },
  id: { redirect_msg: "Anda akan dialihkan ke sistem pembayaran aman Stripe untuk menyelesaikan pembayaran." },
  pt: { redirect_msg: "Você será redirecionado para o checkout seguro da Stripe para concluir o pagamento." },
  fr: { redirect_msg: "Vous serez redirigé vers la page de paiement sécurisé de Stripe pour finaliser votre transaction." }
};

for (const [lang, translations] of Object.entries(locales)) {
  const file = path.join(__dirname, '../messages', `${lang}.json`);
  if (!fs.existsSync(file)) continue;
  
  const content = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!content.topup) content.topup = {};
  content.topup.redirect_msg = translations.redirect_msg;
  
  fs.writeFileSync(file, JSON.stringify(content, null, 2) + '\n');
}
