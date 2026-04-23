const languageMap = {
  eng: 'English',
  cmn: 'Simplified Chinese', // Mandarin
  yue: 'Traditional Chinese', // Cantonese
  
  // Asian Regional (High accuracy)
  tha: 'Thai',
  jpn: 'Japanese',
  kor: 'Korean',
  vie: 'Vietnamese',
  ind: 'Indonesian',
  msa: 'Malay',
  hin: 'Hindi',

  // Major European / Global
  spa: 'Spanish',
  fra: 'French',
  deu: 'German',
  por: 'Portuguese',
  ita: 'Italian',
  rus: 'Russian',
  nld: 'Dutch',
  tur: 'Turkish',
  arb: 'Arabic', 

  // Fallback (franc returns 'und' for undetermined)
  und: 'English' 
};

export default languageMap;