// Maps a free-text vehicle color name (English or French) to a representative hex swatch.
export const getTailwindColorForName = (name: string) => {
  const l = name.toLowerCase();
  if (l.includes('black') || l.includes('noir')) return '#000000';
  if (l.includes('silver') || l.includes('argent') || l.includes('gray') || l.includes('gris')) return '#9CA3AF';
  if (l.includes('yellow') || l.includes('jaune')) return '#EAB308';
  if (l.includes('red') || l.includes('rouge')) return '#EF4444';
  if (l.includes('white') || l.includes('blanc')) return '#FFFFFF';
  if (l.includes('blue') || l.includes('bleu')) return '#3B82F6';
  if (l.includes('green') || l.includes('vert')) return '#10B981';
  return '#EAB308'; // fallback gold
};
