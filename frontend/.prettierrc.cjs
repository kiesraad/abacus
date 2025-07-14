module.exports = {
  printWidth: 120,
  plugins: ["@trivago/prettier-plugin-sort-imports"],
  importOrder: [
    "^react.*$", // anything react
    "<THIRD_PARTY_MODULES>", // node_modules
    "^@/.*$", // app
    "^@kiesraad/.*$", // lib
    "^(\\.||\\.\\.)/.*$", // local imports
  ],
  importOrderSeparation: true, // ensures new line separation between sorted import declarations group
  importOrderSortSpecifiers: true, // sorts the specifiers in an import declarations
  importOrderGroupNamespaceSpecifiers: true, // sorts the namespace specifiers to the top of the import group
  importOrderCaseInsensitive: true, // enable case-insensitivity (because CamelCase)
};
