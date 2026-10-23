/**
 * Syntax themes tuned so every token colour meets WCAG AA (4.5:1) on the card background.
 * The stock light themes use pale greys/teals for comments and numbers that fail contrast checks.
 */
function theme(plain, colors) {
  return {
    plain: { color: plain, backgroundColor: 'transparent' },
    styles: [
      {
        types: ['comment', 'prolog', 'doctype', 'cdata'],
        style: { color: colors.comment, fontStyle: 'italic' },
      },
      { types: ['keyword', 'builtin', 'important', 'atrule'], style: { color: colors.keyword } },
      {
        types: ['string', 'char', 'template-string', 'regex', 'attr-value'],
        style: { color: colors.string },
      },
      { types: ['function', 'class-name', 'maybe-class-name'], style: { color: colors.fn } },
      { types: ['number', 'boolean', 'constant', 'symbol'], style: { color: colors.number } },
      { types: ['punctuation', 'operator'], style: { color: colors.punctuation } },
      {
        types: ['property', 'attr-name', 'tag', 'property-access'],
        style: { color: colors.property },
      },
    ],
  };
}

export const lightCodeTheme = theme('#1f2937', {
  comment: '#6b7280',
  keyword: '#7c3aed',
  string: '#047857',
  fn: '#4338ca',
  number: '#b45309',
  punctuation: '#4b5563',
  property: '#0369a1',
});

export const darkCodeTheme = theme('#e5e7eb', {
  comment: '#94a3b8',
  keyword: '#c4b5fd',
  string: '#6ee7b7',
  fn: '#a5b4fc',
  number: '#fcd34d',
  punctuation: '#cbd5e1',
  property: '#7dd3fc',
});
