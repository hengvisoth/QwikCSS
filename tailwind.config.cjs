module.exports = {
  content: ['./src/**/*.{vue,ts,tsx,html}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', '"Manrope"', '"Avenir Next"', 'system-ui', 'sans-serif'],
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
  prefix: 'qc-',
}
