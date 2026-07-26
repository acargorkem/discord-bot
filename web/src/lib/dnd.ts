/**
 * Tek bir öğe sürüklenip bırakıldığında (from, to) konumlarını hesaplar.
 * `order[i]`, yeni konumdaki öğenin orijinal indeksidir; orijinal sıra 0..n-1.
 */
export function detectMove(order: number[]): { from: number; to: number } | null {
  let a = -1;
  let b = -1;
  for (let i = 0; i < order.length; i++) {
    if (order[i] !== i) {
      if (a === -1) a = i;
      b = i;
    }
  }
  if (a === -1) return null;
  return order[a] === b ? { from: b, to: a } : { from: a, to: b };
}
