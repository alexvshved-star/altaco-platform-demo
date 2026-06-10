// Базовий шлях розгортання. GitHub Pages project-site віддає сайт за префіксом
// /altaco-platform-demo/, тож усі ВНУТРІШНІ абсолютні шляхи й шляхи до ассетів
// мусять його враховувати. import.meta.env.BASE_URL походить з astro.config `base`
// (env BASE_PATH у CI); локально/при preview — "/", тож функція стає тотожною.
// BASE_URL може приходити з кінцевим слешем або без — нормалізуємо до «без».
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Префіксує внутрішній абсолютний шлях («/katalog/x») базою розгортання. */
export function withBase(path: string): string {
  const rel = path.startsWith("/") ? path : `/${path}`;
  return `${BASE}${rel}`;
}
