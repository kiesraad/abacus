import path from "path";

export default {
  css: {
    modules: {
      // Only dashes in class names will be converted to camelCase,
      // the original class name will not to be removed from the locals
      localsConvention: "dashes",
    },
  },
  publicDir: path.join(__dirname, ".."),
};
