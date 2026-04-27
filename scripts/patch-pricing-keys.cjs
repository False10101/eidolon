const fs = require('fs');
const path = require('path');

const messagesDir = path.join(__dirname, '..', 'messages');

const translations = {
  hi: {
    title: "केवल उसी के लिए भुगतान करें जो आप", titleAccent: "उपयोग करते हैं",
    subtitle: "क्रेडिट-आधारित — एक बार टॉप-अप करें, जितना चाहें उपयोग करें।", noSub: "कोई सदस्यता नहीं। कोई समाप्ति नहीं।",
    sectionIndividual: "व्यक्तिगत स्तर", sectionGroup: "समूह योजनाएँ — केवल कक्षा के नोट्स",
    sectionCalc: "मूल्य निर्धारण कैलकुलेटर", sectionTopup: "अपना बैलेंस टॉप-अप करें", sectionFaq: "सामान्य प्रश्न (FAQ)",
    inclassNotes: "कक्षा के नोट्स", transcription: "प्रतिलेखन", perGeneration: "प्रति पीढी",
    tier1: "स्तर 1", tier2: "स्तर 2", tier3: "स्तर 3", tier4: "स्तर 4",
    under25k: "25k टोकन से कम", "25kTo50k": "25k – 50k टोकन", "50kTo75k": "50k – 75k टोकन", "75kTo100k": "75k – 100k टोकन", cap100k: "100k टोकन पर हार्ड कैप्ड",
    under1hr: "1 घंटे से कम", "1To2hr": "1 – 2 घंटे", "2To3hr": "2 – 3 घंटे", over3hr: "3 घंटे से अधिक", cap10hr: "10 घंटे पर हार्ड कैप्ड",
    turbo: "टर्बो (Turbo)", premium: "प्रीमियम",
    small: "छोटा", study: "अध्ययन", class: "कक्षा", faculty: "संकाय", members: "सदस्य", offMember: "छूट/सदस्य",
    t2SplitExample: "T2 स्प्लिट उदाहरण", generatorPays: "जनरेटर भुगतान करता है:", othersPay: "अन्य ({count}) भुगतान करते हैं:",
    combined: "संयुक्त", combinedRange: "प्रतिलेखन + नोट्स",
    groupGenSubtext: "समूह जनरेशन की लागत सभी सदस्यों के बैलेंस में अपने आप विभाजित हो जाती है। जो सदस्य जनरेट करता है उसे छूट मिलती है:", groupGenSubtextHighlight: "50% कम", groupGenSubtextEnd: "संगठन को प्रोत्साहित करने के लिए।",
    estimateCost: "अपनी लागत का अनुमान लगाएं", notesTab: "नोट्स", transcriptionTab: "प्रतिलेखन", pipelineTab: "पूरी पाइपलाइन",
    estTokenCount: "अनुमानित टोकन गिनती", typicalLecture: "सामान्य 3-घंटे का व्याख्यान \u2248", typicalTokens: "20k–28k टोकन", tokens: "टोकन", yourBalance: "आपका बैलेंस", model: "मॉडल", recDuration: "रिकॉर्डिंग की अवधि", exactDuration: "सटीक अवधि (घंटे)",
    hrs: "घंटे", expNoteTokens: "अपेक्षित नोट टोकन", perHr: "/घंटा", costPerGen: "लागत प्रति जनरेशन", genWith: "के साथ जनरेशन", pipelines: "पाइपलाइन", gens: "जेन्स",
    balanceAfter: "इसके बाद बैलेंस", txPlusNotes: "प्रतिलेखन + नोट्स",
    creditPackages: "क्रेडिट पैकेज", topupDesc1: "किसी भी प्रमुख डेबिट/क्रेडिट कार्ड से तुरंत टॉप-अप करें। आपके खाते में क्रेडिट जुड़ जाएंगे", topupDesc2: "भुगतान के तुरंत बाद",
    popular: "लोकप्रिय", topupBtn: "{credits} क्रेडिट टॉप-अप करें",
    footerNote1: "जनरेशन के समय क्रेडिट काट लिए जाते हैं।", footerNote2: "हर जनरेशन से पहले बैलेंस जांच चलती है", footerNote3: "— यदि अपर्याप्त हैं,", footerNote4: "अनुरोध आगे नहीं बढ़ेगा।",
    footerNote5: "टोकन गिनती में इनपुट और आउटपुट दोनों शामिल हैं।",
    q1: "मेरे बैलेंस से कब कटौती होती है?", a1p1: "आपके क्रेडिट बैलेंस की जांच और कटौती की जाती है", a1h1: "उसी क्षण जब आप जनरेट करते हैं", a1p2: "अगर क्रेडिट कम हैं,", a1h2: "जनरेशन शुरू नहीं होगा", a1p3: "— त्रुटि आएगी।",
    q2: "क्या क्रेडिट समाप्त हो जाते हैं?", a2p1: "नहीं। क्रेडिट", a2h1: "कभी समाप्त नहीं होते", a2p2: "और हमेशा रहते हैं।",
    q3: "समूह बिलिंग कैसे काम करती है?", a3p1: "लागत सभी सदस्यों में अपने आप बंट जाती है। जनरेट करने वाले सदस्य को मिलता है", a3h1: "50% की छूट", a3p2: "बाकी सदस्यों द्वारा।",
    q4: "नोट्स की लागत क्यों भिन्न होती है?", a4p1: "नोट्स का शुल्क होता है", a4h1: "कुल टोकन के आधार पर", a4p2: "लंबे व्याख्यान में अधिक टोकन होते हैं। आमतौर पर", a4h2: "स्तर 2 (17 क्रेडिट)",
    q5: "प्रतिलेखन की कीमत अलग क्यों है?", a5p1: "प्रतिलेखन व्हिस्पर का उपयोग करता है। यदि आपके पास प्रतिलेखन है, तो", a5h1: "लागत छोड़ दी जाती है",
    q6: "मैं टॉप अप कैसे करूं?", a6p1: "स्ट्राइप के माध्यम से। भुगतान के", a6h1: "तुरंत", a6p2: "क्रेडिट जुड़ जाते हैं।",
    under1hr_short: "< 1घं.", "1To2hr_short": "1–2घं.", "2To3hr_short": "2–3घं.", "3hrPlus_short": "3घं.+",
    preset_120Label: "$1.50", preset_120Hint: "~13 नोट्स", preset_450Label: "$5", preset_450Hint: "~50 नोट्स", preset_1200Label: "$10", preset_1200Hint: "~133 नोट्स", preset_2800Label: "$25", preset_2800Hint: "~311 नोट्स"
  },
  id: {
    title: "Bayar hanya untuk apa yang Anda", titleAccent: "gunakan",
    subtitle: "Berbasis kredit \u2014 isi ulang sekali, belanjakan sesuai pemakaian.", noSub: "Tanpa langganan. Tanpa kedaluwarsa.",
    sectionIndividual: "Tingkat individu", sectionGroup: "Paket grup \u2014 Khusus Catatan Kelas",
    sectionCalc: "Kalkulator harga", sectionTopup: "Isi ulang saldo Anda", sectionFaq: "FAQ",
    inclassNotes: "Catatan Kelas", transcription: "Transkripsi", perGeneration: "per ketukan",
    tier1: "Tingkat 1", tier2: "Tingkat 2", tier3: "Tingkat 3", tier4: "Tingkat 4",
    under25k: "Di bawah 25k token", "25kTo50k": "25k \u2013 50k token", "50kTo75k": "50k \u2013 75k token", "75kTo100k": "75k \u2013 100k token", cap100k: "Batas keras pada 100k token",
    under1hr: "Di bawah 1 jam", "1To2hr": "1 \u2013 2 jam", "2To3hr": "2 \u2013 3 jam", over3hr: "Di atas 3 jam", cap10hr: "Batas keras pada 10 jam",
    turbo: "Turbo", premium: "Premium",
    small: "Kecil", study: "Belajar", class: "Kelas", faculty: "Fakultas", members: "anggota", offMember: "diskon/anggota",
    t2SplitExample: "Contoh Pemisahan T2", generatorPays: "Pembuat:", othersPay: "Lainnya ({count}):",
    combined: "Gabungan", combinedRange: "Transkripsi + Catatan",
    groupGenSubtext: "Biaya grup otomatis dibagi dari saldo semua anggota. Pembuat membayar", groupGenSubtextHighlight: "50% lebih murah", groupGenSubtextEnd: "sebagai insentif.",
    estimateCost: "Perkirakan biaya", notesTab: "Catatan", transcriptionTab: "Transkripsi", pipelineTab: "Proses lengkap",
    estTokenCount: "Token", typicalLecture: "Kuliah khas 3 jam \u2248", typicalTokens: "20k\u201328k token", tokens: "token", yourBalance: "Saldo Anda", model: "Model", recDuration: "Durasi rekaman", exactDuration: "Durasi tepat (jam)",
    hrs: "jam", expNoteTokens: "Perkiraan token", perHr: "/jam", costPerGen: "Biaya per generasi", genWith: "Bisa buat:", pipelines: "proses", gens: "gens",
    balanceAfter: "Sisa", txPlusNotes: "Transkripsi + Catatan",
    creditPackages: "Paket kredit", topupDesc1: "Isi instan dengan kartu debit atau kredit utama. Saldo langsung masuk akun Anda", topupDesc2: "setelah pembayaran",
    popular: "Populer", topupBtn: "Isi ulang {credits} kredit",
    footerNote1: "Kredit dipotong. Cek saldo", footerNote2: "sebelum proses", footerNote3: "\u2014 jika tidak mencukupi,", footerNote4: "ditolak.",
    footerNote5: "Token mencakup input dan output. Isi instan via kartu.",
    q1: "Kapan saldo saya dipotong?", a1p1: "Saldo Anda diperiksa dan dipotong", a1h1: "saat Anda menghasilkan", a1p2: "catatan. Jika kosong,", a1h2: "tidak dimulai", a1p3: "error.",
    q2: "Apakah kedaluwarsa?", a2p1: "Tidak. Kredit", a2h1: "tidak pernah expired", a2p2: "dan terbawa.",
    q3: "Bagaimana tagihan grup?", a3p1: "Biaya dibagi. Jika tak cukup, tak jalan. Pembuat mendapat", a3h1: "diskon 50%", a3p2: "dari anggota.",
    q4: "Mengapa biaya bervariasi?", a4p1: "Catatan berdasar", a4h1: "total token", a4p2: "Kuliah panjang mahal.", a4h2: "Tingkat 2 (17 k)",
    q5: "Mengapa transkripsi dipisah?", a5p1: "Beda model. Jika sudah ada", a5h1: "gratis transkripsi",
    q6: "Cara isi?", a6p1: "Stripe kredit. Masuk", a6h1: "instan", a6p2: "!",
    under1hr_short: "< 1jam", "1To2hr_short": "1\u20132j", "2To3hr_short": "2\u20133j", "3hrPlus_short": "> 3jam",
    preset_120Label: "$1.50", preset_120Hint: "~13", preset_450Label: "$5", preset_450Hint: "~50", preset_1200Label: "$10", preset_1200Hint: "~133", preset_2800Label: "$25", preset_2800Hint: "~311"
  },
  fr: {
    title: "Ne payez que ce que vous", titleAccent: "utilisez",
    subtitle: "Basé sur les crédits \u2014 rechargez une fois, dépensez au fur et à mesure.", noSub: "Pas d'abonnement. Pas d'expiration.",
    sectionIndividual: "Niveaux individuels", sectionGroup: "Plans de groupe \u2014 Seulement Notes de Cours",
    sectionCalc: "Calculateur de prix", sectionTopup: "Recharger votre solde", sectionFaq: "FAQ",
    inclassNotes: "Notes de Cours", transcription: "Transcription", perGeneration: "par génération",
    tier1: "Niveau 1", tier2: "Niveau 2", tier3: "Niveau 3", tier4: "Niveau 4",
    under25k: "Moins de 25k jetons", "25kTo50k": "25k \u2013 50k jetons", "50kTo75k": "50k \u2013 75k jetons", "75kTo100k": "75k \u2013 100k jetons", cap100k: "Limité à 100k jetons",
    under1hr: "Moins de 1h", "1To2hr": "1 \u2013 2 heures", "2To3hr": "2 \u2013 3 heures", over3hr: "Plus de 3 heures", cap10hr: "Limité à 10 heures",
    turbo: "Turbo", premium: "Premium",
    small: "Petit", study: "Étude", class: "Classe", faculty: "Faculté", members: "membres", offMember: "réduc/membre",
    t2SplitExample: "Exemple de séparation T2", generatorPays: "Le générateur paie :", othersPay: "Les autres ({count}) paient :",
    combined: "Combiné", combinedRange: "Transc. + Notes",
    groupGenSubtext: "Les coûts sont répartis. Le membre qui génère paie", groupGenSubtextHighlight: "50 % de moins", groupGenSubtextEnd: "pour encourager l'organisation.",
    estimateCost: "Estimer le coût", notesTab: "Notes", transcriptionTab: "Transcription", pipelineTab: "Complet",
    estTokenCount: "Nombre de jetons estimé", typicalLecture: "Conférence de 3h \u2248", typicalTokens: "20k\u201328k jetons", tokens: "jetons", yourBalance: "Votre solde", model: "Modèle", recDuration: "Durée", exactDuration: "Durée (heures)",
    hrs: "h", expNoteTokens: "Jetons attendus", perHr: "/h", costPerGen: "Coût par génération", genWith: "Générations avec", pipelines: "pipelines", gens: "gens", balanceAfter: "Solde après", txPlusNotes: "Transc. + Notes",
    creditPackages: "Lots de crédits", topupDesc1: "Rechargez instantanément avec une carte.", topupDesc2: "immédiatement après paiement", popular: "Populaire", topupBtn: "Recharger {credits} crédits",
    footerNote1: "Les crédits sont déduits. Une", footerNote2: "vérification de solde s'effectue", footerNote3: "\u2014 si solde insuffisant,", footerNote4: "la requête échouera.", footerNote5: "Jetons = C'est global",
    q1: "Quand mon solde est-il débité ?", a1p1: "Votre solde est déduit", a1h1: "au moment où vous générez", a1p2: ". Si pas assez,", a1h2: "elle ne commencera pas", a1p3: "!!",
    q2: "Les crédits expirent ?", a2p1: "Non.", a2h1: "Jamais", a2p2: "!",
    q3: "Facturation de groupe ?", a3p1: "Automatiquement divisée. Le générateur obtient une", a3h1: "réduction de 50%", a3p2: ".",
    q4: "Pourquoi les coûts varient ?", a4p1: "Basé sur le", a4h1: "nombre de jetons", a4p2: "Normalement", a4h2: "Niveau 2 (17)",
    q5: "Pourquoi séparer la transcription ?", a5p1: "Modèle audio. Si vous en avez l'avez,", a5h1: "gratuit",
    q6: "Comment recharger ?", a6p1: "Stripe.", a6h1: "Instantanément", a6p2: "",
    under1hr_short: "< 1h", "1To2hr_short": "1\u20132h", "2To3hr_short": "2\u20133h", "3hrPlus_short": "3h+",
    preset_120Label: "$1.50", preset_120Hint: "13 notes", preset_450Label: "$5", preset_450Hint: "50 notes", preset_1200Label: "$10", preset_1200Hint: "133 notes", preset_2800Label: "$25", preset_2800Hint: "311 notes"
  },
  pt: {
    title: "Pague só pelo que", titleAccent: "usa",
    subtitle: "Baseado em créditos \u2014 carregue uma vez, gaste conforme usa.", noSub: "Sem subscrição. Sem caducidade.",
    sectionIndividual: "Níveis individuais", sectionGroup: "Planos grupo \u2014 Apenas Notas de Aula",
    sectionCalc: "Calculadora", sectionTopup: "Carregar saldo", sectionFaq: "FAQ",
    inclassNotes: "Notas de Aula", transcription: "Transcrição", perGeneration: "por geração",
    tier1: "Nível 1", tier2: "Nível 2", tier3: "Nível 3", tier4: "Nível 4",
    under25k: "Menos de 25k tokens", "25kTo50k": "25k \u2013 50k tokens", "50kTo75k": "50k \u2013 75k tokens", "75kTo100k": "75k \u2013 100k tokens", cap100k: "Limite firme de 100k",
    under1hr: "Menos de 1 hora", "1To2hr": "1 \u2013 2 horas", "2To3hr": "2 \u2013 3 horas", over3hr: "Acima de 3 horas", cap10hr: "Limite de 10 horas",
    turbo: "Rápido (Turbo)", premium: "Premium",
    small: "Pequeno", study: "Estudo", class: "Classe", faculty: "Turma", members: "membros", offMember: "desc/membro",
    t2SplitExample: "Exemplo Divisão T2", generatorPays: "Abona o criador:", othersPay: "Outros ({count}) pagam:",
    combined: "Combinado", combinedRange: "Transcrição + Notas",
    groupGenSubtext: "Os custos de grupo são divididos entre os membros. O membro que clica paga um", groupGenSubtextHighlight: "50% menos", groupGenSubtextEnd: "para incentivar.",
    estimateCost: "Estime seu custo", notesTab: "Notas", transcriptionTab: "Transcr.", pipelineTab: "Completo",
    estTokenCount: "Tokens estimados", typicalLecture: "Aula de 3h \u2248", typicalTokens: "20k\u201328k", tokens: "tokens", yourBalance: "Saldo", model: "Mod.", recDuration: "Duração", exactDuration: "Exato (hrs)",
    hrs: "h", expNoteTokens: "Tokens esperados", perHr: "/hr", costPerGen: "Custo gr.", genWith: "Gera com", pipelines: "tub", gens: "gen", balanceAfter: "Saldo após", txPlusNotes: "Transc. + Notas",
    creditPackages: "Pacotes", topupDesc1: "Carregue já com cartão. Chega", topupDesc2: "imediato após pago", popular: "Pop", topupBtn: "Carregar {credits} cr",
    footerNote1: "Créditos saem ao criar. Um", footerNote2: "check da bala antes", footerNote3: "\u2014 caso falhe,", footerNote4: "nada vai.", footerNote5: "Os tokens incluem in e out.",
    q1: "Quando cobram?", a1p1: "O saldo é", a1h1: "checado na hora", a1p2: "Se baixo,", a1h2: "vai falhar.", a1p3: "!",
    q2: "Pazos?", a2p1: "Não.", a2h1: "Nunca.", a2p2: "Sempre valem.",
    q3: "Grupo?", a3p1: "Dividido automático. O criador tem", a3h1: "50% menos", a3p2: ".",
    q4: "Custos?", a4p1: "Cobrado via", a4h1: "tokens totais", a4p2: "Maior é o Nível 2", a4h2: "Nível 2 (17)",
    q5: "Separado?", a5p1: "Sistemas diferents. Já tem transcrição,", a5h1: "poupou muito",
    q6: "Pagar?", a6p1: "Stripe", a6h1: "Instante", a6p2: ".",
    under1hr_short: "< 1h", "1To2hr_short": "1\u20132h", "2To3hr_short": "2\u20133h", "3hrPlus_short": "3h+", preset_120Label: "$1.5", preset_120Hint: "13 nts", preset_450Label: "$5", preset_450Hint: "50 nts", preset_1200Label: "$10", preset_1200Hint: "133 nts", preset_2800Label: "$25", preset_2800Hint: "311 nts"
  }
};

for (const [lang, keys] of Object.entries(translations)) {
  const filePath = path.join(messagesDir, `${lang}.json`);
  if (fs.existsSync(filePath)) {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // Since we overwrote with english strings earlier via .cjs script, we override here
    content.pricingPage = Object.assign(content.pricingPage || {}, keys);
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
    console.log(`Pushed real translated keys for ${lang}.json`);
  }
}
