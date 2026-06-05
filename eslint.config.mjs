import nextCoreWebVitals from "eslint-config-next/core-web-vitals"

export default [
  ...nextCoreWebVitals,
  {
    rules: {
      // React Compiler rules — relax until the codebase is migrated incrementally.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
]
