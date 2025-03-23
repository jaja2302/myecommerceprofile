// Konfigurasi untuk filter konten pada fitur Curhat Anonim
// File ini berisi kata-kata, pola, dan regex yang digunakan untuk memfilter konten tidak pantas

// Daftar kata-kata kasar yang akan difilter
export const KATA_KASAR = [
  // Kata kasar umum
  'jelek', 'bodoh', 'tolol', 'goblok',
  
  // Vulgar terms 
  'sex', 'ngetod', 
  
  // Vulgar terms in Indonesian
  'anjing', 'bangsat', 'kontol', 'memek', 'ngentot', 'jancok', 'asu', 'bajingan', 
  'brengsek', 'keparat', 'bejat', 'tai', 'tahi', 'titit', 'toket', 'ngewe', 
  'pantat', 'perek', 'pussy', 'dick', 'penis', 'vagina', 'fuck', 'fucking', 
  'ngentod', 'seks', 'bokep', 'bispak', 'gigolo', 'pelacur', 'lonte', 
  'jablay', 'jablai', 'jalang',
  
  // Short forms/abbreviations
  'awa', 'masa', 'tol',
  
  // Common number substitutions (also handled by normalization function)
  'm3m3k', 'm3mek', 'mem3k', 'k0nt0l', 'p3n1s', 'v4g1n4', 'j4bl4y', '4nj1ng',
  
  // Other terms that may bypass filter
  'itil', 'tempik', 'bacot', 'coli', 'colmek', 'gatal', 'nyaaa',
  
  // Potential words seen in screenshot
  'lapar', 'nyaaaa'
]; 

// Regex untuk mendeteksi link
export const LINK_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.([a-zA-Z]{2,}))/;

// Regex untuk mendeteksi koordinat GPS
export const KOORDINAT_REGEX = /(-?\d+\.\d+,\s*-?\d+\.\d+)/;

// Regex untuk potensi alamat
export const ALAMAT_REGEX = /(jl\.|jalan|perumahan|komplek|blok|rt|rw|kelurahan|kecamatan|kabupaten|kota|provinsi)/i;

// Pola leetspeak untuk deteksi kata yang dimodifikasi dengan angka atau karakter khusus
export const LEETSPEAK_PATTERNS = [
  /m[3e]m[e3]k/i,      // memek variations with 3/e
  /ng[e3]t[o0]d/i,     // ngetod variations with 3/e and 0/o
  /l[a4]p[a4]r/i,      // lapar variations with 4/a
  /k[o0]nt[o0]l/i,     // kontol variations with 0/o
  /[a4]nj[i1]ng/i,     // anjing variations with 4/a and 1/i
  /j[a4]bl[a4][i1]/i,  // jablai variations with 4/a and 1/i
  /p[e3]l[a4]c[u]r/i,  // pelacur variations with 3/e and 4/a
];

// Pemetaan karakter-angka untuk normalisasi teks
export const NUMBER_TO_LETTER_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's', 
  '6': 'g',
  '7': 't',
  '8': 'b',
  '9': 'g'
};

// Fungsi untuk normalisasi teks (mengubah angka menjadi huruf)
export const normalizeText = (text: string): string => {
  let normalizedText = text.toLowerCase();
  
  Object.keys(NUMBER_TO_LETTER_MAP).forEach(num => {
    normalizedText = normalizedText.replace(
      new RegExp(num, 'g'), 
      NUMBER_TO_LETTER_MAP[num]
    );
  });
  
  return normalizedText;
};

// Fungsi untuk filter kata kasar
export const containsKataKasar = (text: string): boolean => {
  // Normalize input by converting common number substitutions to letters
  const normalizedText = normalizeText(text);
  
  // Check for exact matches and partial matches
  for (const kata of KATA_KASAR) {
    // Cek kata penuh (dengan batas kata)
    const wordBoundaryRegex = new RegExp(`\\b${kata}\\b`, 'i');
    if (wordBoundaryRegex.test(normalizedText)) {
      return true;
    }
    
    // Cek kata yang ditulis dengan spasi atau karakter lain
    const separatedRegex = new RegExp(kata.split('').join('[^a-zA-Z0-9]*'), 'i');
    if (separatedRegex.test(normalizedText)) {
      return true;
    }
    
    // Cek juga kasus klasik (substring)
    if (normalizedText.includes(kata.toLowerCase())) {
      return true;
    }
  }
  
  // Also check for specific leetspeak patterns
  for (const pattern of LEETSPEAK_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }
  
  return false;
};

// Fungsi untuk mendeteksi link
export const containsLink = (text: string): boolean => {
  return LINK_REGEX.test(text);
};

// Fungsi untuk mendeteksi koordinat
export const containsKoordinat = (text: string): boolean => {
  return KOORDINAT_REGEX.test(text);
};

// Fungsi untuk mendeteksi alamat
export const containsAlamat = (text: string): boolean => {
  return ALAMAT_REGEX.test(text);
};

// Eksport semua fungsi dan konstanta untuk digunakan di file lain
const FilteringWords = {
  KATA_KASAR,
  LINK_REGEX,
  KOORDINAT_REGEX,
  ALAMAT_REGEX,
  LEETSPEAK_PATTERNS,
  NUMBER_TO_LETTER_MAP,
  normalizeText,
  containsKataKasar,
  containsLink,
  containsKoordinat,
  containsAlamat
};

export default FilteringWords; 