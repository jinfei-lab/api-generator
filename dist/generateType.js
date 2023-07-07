import prettier from "prettier";
import { prettierConfig } from "./prettierConfig.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dataType } from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 生成swagger全部类型
 * @param {*} data swagger数据components
 */
export const generateType = (data) => {
  let schemaKeys = Object.keys(data);
  let interfaceTemplateStr = "";
  schemaKeys.forEach((schemaKey) => {
    let schema = data[schemaKey];
    let typeKeys = Object.keys(schema);
    typeKeys.forEach((typeKey) => {
      //   console.log(schema[typeKey]);
      if (schema[typeKey].properties) {
        interfaceTemplateStr += `${interfaceTemplate(
          typeKey,
          schema[typeKey]
        )}\n\n`;
      }
    });
  });
  fs.writeFileSync(
    `${API_PATH}/typings.ts`,
    prettier.format(interfaceTemplateStr, prettierConfig)
  );
};

/**
 * @Description 生成单个类型模板
 * @param {*} interfaceName 类型名称
 * @param {*} interfaceParams 类型参数
 * @return {*} 类型模板
 */
const interfaceTemplate = (interfaceName, interfaceParams) => {
  // 基础类型模板
  let baseTemplate = `export type ${interfaceName} = `;
  // 注释模板
  let parametersTemplate = ``;
  // 如果有参数就遍历参数
  if (interfaceParams.properties) {
    let propertyKeys = Object.keys(interfaceParams.properties);
    propertyKeys.forEach((propertyKey) => {
      let property = interfaceParams.properties[propertyKey];
      // 如果有注释就加上注释
      if (property.description) {
        parametersTemplate += `// ${
          property.description
        }\n${propertyKey}: ${dataType(property.type)}\n`;
      } else {
        parametersTemplate += `${propertyKey}: ${dataType(property.type)}\n`;
      }
    });
    parametersTemplate = `{\n${parametersTemplate}}`;
    baseTemplate += parametersTemplate;
    return baseTemplate;
  }
};

// 生成的接口文件存放目录，默认存放在src/api目录下
const API_PATH = path.resolve(
  __dirname,
  `${process.cwd()}${
    process.env.npm_package_config_apiPath
      ? process.env.npm_package_config_apiPath
      : "/src/api"
  }`
);
