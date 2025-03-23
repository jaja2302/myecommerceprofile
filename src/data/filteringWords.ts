// Konfigurasi untuk filter konten pada fitur Curhat Anonim
// File ini berisi kata-kata, pola, dan regex yang digunakan untuk memfilter konten tidak pantas

// Daftar kata-kata kasar yang akan difilter
export const KATA_KASAR = [
  // Kata kasar umum yang jelas tidak pantas (keeping only the most obvious ones)
  'goblok', 'tolol',
  
  // Vulgar terms (explicit ones only)
  'sex', 'ngentot', 'kontol', 'memek', 'jancok', 'asu', 'bajingan', 
  'brengsek', 'keparat', 'bejat', 'tai', 'tahi', 'titit', 'toket', 'ngewe', 
  'pussy', 'dick', 'penis', 'vagina', 'fuck', 'fucking', 
  'ngentod', 'bokep', 'bispak', 'gigolo', 'pelacur', 'lonte', 
  'jablay', 'jablai', 'jalang',
  
  // Common number substitutions
  'm3m3k', 'm3mek', 'mem3k', 'k0nt0l', 'p3n1s', 'v4g1n4', 'j4bl4y', '4nj1ng',
  
  // Other explicit terms
  'itil', 'tempik', 'bacot', 'coli', 'colmek'
]; 

// Regex untuk mendeteksi link - making it much more selective
export const LINK_REGEX = /(https?:\/\/[^\s]+)|(www\.[a-z0-9-]+\.[a-z]{2,})|((?:\s|^)[a-z0-9][a-z0-9-]*\.(com|net|org|io|co|id|xyz|me)(?:\s|$|\.|,))/i;

// Regex untuk mendeteksi koordinat GPS
export const KOORDINAT_REGEX = /(-?\d+\.\d+,\s*-?\d+\.\d+)/;

// Regex untuk potensi alamat - making it much more specific to reduce false positives
export const ALAMAT_REGEX = /\b(jl\.\s+[a-z]|jalan\s+[a-z]|perumahan\s+[a-z]|komplek\s+[a-z]|blok\s+[a-z0-9]|rt\s*[0-9]+\s*\/?\s*rw|rw\s*[0-9]+\s*\/?\s*rt|kelurahan\s+[a-z]|kecamatan\s+[a-z]|kabupaten\s+[a-z]|kota\s+[a-z]|provinsi\s+[a-z])/i;

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
  
  // Split into words to avoid partial matches inside legitimate words
  const words = normalizedText.split(/\s+/);
  
  for (const kata of KATA_KASAR) {
    // Only check word boundaries to avoid false positives
    const wordBoundaryRegex = new RegExp(`\\b${kata}\\b`, 'i');
    if (wordBoundaryRegex.test(normalizedText)) {
      return true;
    }
    
    // Check if any word contains the exact bad word
    // This eliminates false positives like "asu" in "suasana"
    for (const word of words) {
      if (word.toLowerCase() === kata.toLowerCase()) {
        return true;
      }
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

// Debug function to help identify why text is filtered
export const debugTextFilter = (text: string): { 
  isFiltered: boolean, 
  reason: string, 
  match?: string 
} => {
  // Check for link
  if (LINK_REGEX.test(text)) {
    const match = LINK_REGEX.exec(text);
    return { 
      isFiltered: true, 
      reason: "Contains link", 
      match: match ? match[0] : undefined 
    };
  }
  
  // Check for address
  if (ALAMAT_REGEX.test(text)) {
    const match = ALAMAT_REGEX.exec(text);
    return { 
      isFiltered: true, 
      reason: "Contains address pattern", 
      match: match ? match[0] : undefined 
    };
  }
  
  // Check for coordinates
  if (KOORDINAT_REGEX.test(text)) {
    const match = KOORDINAT_REGEX.exec(text);
    return { 
      isFiltered: true, 
      reason: "Contains coordinates", 
      match: match ? match[0] : undefined 
    };
  }
  
  // Check for inappropriate words
  const normalizedText = normalizeText(text);
  const words = normalizedText.split(/\s+/);
  
  for (const kata of KATA_KASAR) {
    // Word boundary check
    const wordBoundaryRegex = new RegExp(`\\b${kata}\\b`, 'i');
    if (wordBoundaryRegex.test(normalizedText)) {
      return { 
        isFiltered: true, 
        reason: "Contains inappropriate word (word boundary)", 
        match: kata 
      };
    }
    
    // Check if any word contains the exact bad word
    for (const word of words) {
      if (word.toLowerCase() === kata.toLowerCase()) {
        return {
          isFiltered: true,
          reason: "Contains inappropriate word (exact match)",
          match: kata
        };
      }
    }
  }
  
  // Check for leetspeak
  for (const pattern of LEETSPEAK_PATTERNS) {
    if (pattern.test(text)) {
      const match = pattern.exec(text);
      return { 
        isFiltered: true, 
        reason: "Contains inappropriate word (leetspeak)", 
        match: match ? match[0] : undefined 
      };
    }
  }
  
  return { isFiltered: false, reason: "Text is clean" };
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
  containsAlamat,
  debugTextFilter
};

export default FilteringWords; 