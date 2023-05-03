const {
  getConfiguration,
  getTypescriptOverride,
} = require("@eng-automation/js-style/src/eslint/configuration");

const tsConfParams = { rootDir: __dirname };

const conf = getConfiguration({ typescript: tsConfParams });

const tsConfOverride = getTypescriptOverride(tsConfParams);

module.exports = {
  ...conf,
  overrides: [
    ...conf.overrides,
    {
      ...tsConfOverride,
      rules: {
        ...tsConfOverride.rules,
        "@typescript-eslint/no-floating-promises": "off",
        "@typescript-eslint/strict-boolean-expressions": "off",
      },
    },
  ],
};
