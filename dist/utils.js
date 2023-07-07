/**
 * 转化为驼峰式命名
 * @param {*} str
 * @returns
 */
export const getCamelCaseString = (str) => {
  // 使用正则表达式将非字母数字字符替换为空格
  let words = str.replace(/[^a-zA-Z0-9]/g, " ").split(/\s+/);
  // 使用Set数据结构删除重复项
  let uniqueWords = [...new Set(words)];
  let camelCaseString =
    uniqueWords[0].toLowerCase() +
    uniqueWords
      .slice(1)
      .map(function (word) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join("");
  camelCaseString =
    camelCaseString.charAt(0).toLowerCase() + camelCaseString.slice(1);
  return camelCaseString;
};

/**
 * 检测是否为保留字
 * @param {*} identifier - 要检查的标识符。
 * @returns
 */
export const isReservedWord = (identifier) => {
  var reservedWords = [
    // 关键字
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "debugger",
    "default",
    "delete",
    "do",
    "else",
    "enum",
    "export",
    "extends",
    "false",
    "finally",
    "for",
    "function",
    "if",
    "implements",
    "import",
    "in",
    "instanceof",
    "interface",
    "let",
    "new",
    "null",
    "package",
    "private",
    "protected",
    "public",
    "return",
    "super",
    "switch",
    "static",
    "this",
    "throw",
    "try",
    "true",
    "typeof",
    "var",
    "void",
    "while",
    "with",
    "yield",
    // 保留的未来关键字
    "await",
    "enum",
    "implements",
    "interface",
    "package",
    "private",
    "protected",
    "public",
    "static",
    "let",
    "yield",
  ];

  return reservedWords.includes(identifier);
};

/**
 * 根据给定的键返回数据类型。
 * @param {string} key - 要获取数据类型的键。
 * @returns {string} - 给定键的数据类型。
 */
export const dataType = (key) => {
  const type = {
    string: "string",
    integer: "number",
    int: "number",
    long: "string",
    array: "Array",
    file: "Blob",
    boolean: "boolean",
  };
  return type[key] ? type[key] : "any";
};
