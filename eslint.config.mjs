// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt({
  rules: {
    // Existing code relies on assignments this newer ESLint rule reports.
    // Keep the pre-upgrade lint baseline; cleanup belongs in its own issue.
    'no-useless-assignment': 'off',
    // Prettier 3 consistently emits self-closing Vue void elements. Keep the
    // formatter and lint output compatible without changing rendered markup.
    'vue/html-self-closing': 'off',
  },
});
// Your custom configs here
