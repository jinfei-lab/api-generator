import { topConfig, apiConfig, fileDoc } from "./conf.js";
import fs from "fs";
import fetch from "node-fetch";
import path from "path";
import chalk from "chalk";
import prettier from "prettier";
import { fileURLToPath } from "url";
import { prettierConfig } from "./prettierConfig.js";
import { generateType } from "./generateType.js";
import { getCamelCaseString, isReservedWord, dataType } from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(
  chalk.yellow(
    [
      "                   _ooOoo_",
      "                  o8888888o",
      '                  88" . "88',
      "                  (| -_- |)",
      "                  O\\  =  /O",
      "               ____/`---'\\____",
      "             .'  \\\\|     |//  `.",
      "            /  \\\\|||  :  |||//  \\",
      "           /  _||||| -:- |||||-  \\",
      "           |   | \\\\\\  -  /// |   |",
      "           | \\_|  ''\\---/''  |   |",
      "           \\  .-\\__  `-`  ___/-. /",
      "         ___`. .'  /--.--\\  `. . __",
      '      ."" \'<  `.___\\_<|>_/___.\'  >\'"".',
      "     | | :  `- \\`.;`\\ _ /`;.`/ - ` : | |",
      "     \\  \\ `-.   \\_ __\\ /__ _/   .-` /  /",
      "======`-.____`-.___\\_____/___.-`____.-'======",
      "                   `=---='",
      "            佛祖保佑       永无BUG",
      "🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏🙏\n",
    ].join("\n")
  )
);
// 生成的接口文件存放目录，默认存放在src/api目录下
const API_PATH = path.resolve(
  __dirname,
  `${process.cwd()}${
    process.env.npm_package_config_apiPath
      ? process.env.npm_package_config_apiPath
      : "/src/api"
  }`
);

// 判断目录是否存在
const isDirExist = (lastPath = "") => {
  const privatePath = `${lastPath ? API_PATH + "/" + lastPath : API_PATH}`;
  const stat = fs.existsSync(privatePath);
  // 如果不存在则重新创建一个文件夹
  if (!stat) {
    fs.mkdirSync(privatePath);
  }
};

// 清空文件夹
const removeDir = (dir) => {
  // 判断此文件夹是否存在
  if (fs.existsSync(dir)) {
    // 读取文件夹下所有文件
    const files = fs.readdirSync(dir);
    // 判断是否有文件
    if (files.length > 0) {
      // 再删除文件夹
      fs.rmSync(dir, { recursive: true });
    }
  }
};

/**
 * 此函数将API路径按其标签分组，并返回一个对象，其中标签为键，包含路径、方法、标签、摘要和操作ID的对象数组为值。
 * @param {Object} paths - 包含API路径的对象。
 * @returns {Object} - 具有标签作为键和包含路径、方法、标签、摘要和操作ID的对象数组为值的对象。
 */
const groupedData = (paths) =>
  Object.entries(paths).reduce((result, [path, methodObj]) => {
    const method = Object.keys(methodObj)[0];
    const { tags, summary, operationId, parameters, requestBody, responses } =
      methodObj[method];

    tags.forEach((tag) => {
      if (!result[tag]) {
        result[tag] = [];
      }
      result[tag].push({
        path,
        method,
        tags,
        summary,
        operationId,
        parameters,
        requestBody,
        responses,
      });
    });

    return result;
  }, {});

/**
 * 此函数将分组数据转换为具有公共路径将其转换为驼峰式的新对象。
 * @param {Object} groupedData - 具有标签作为键和包含路径、方法、标签、摘要和操作ID的对象数组为值的对象。
 * @returns {Object} - 具有公共路径作为键和包含路径、方法、标签、摘要和操作ID的对象数组为值的对象。
 */
const transformGroupedData = (groupedData) => {
  // 创建一个新对象来存储更新后的分组数据
  const updatedGroupedData = {};
  // 遍历每个标签
  for (const section in groupedData) {
    // 获取标签下的所有接口数据
    const sectionData = groupedData[section];
    // 获取标签下所有接口的路径
    const paths = sectionData.map((item) => item.path);
    // 初始化公共路径为空字符串
    let commonPath = "";
    // 如果路径数组不为空
    if (paths.length > 0) {
      // 获取第一个路径
      const firstPath = paths[0];
      // 遍历第一个路径的每个字符
      for (let i = 0; i < firstPath.length; i++) {
        // 获取当前字符
        const char = firstPath.charAt(i);
        // 如果所有路径的当前字符都相同，则将其添加到公共路径中
        if (paths.every((path) => path.charAt(i) === char)) {
          commonPath += char;
        } else {
          // 如果当前字符不同，则退出循环
          break;
        }
      }
    }
    // 获取公共路径中最后一个斜杠的索引
    const lastSlashIndex = commonPath.lastIndexOf("/");
    // 如果存在斜杠，则将其截断
    if (lastSlashIndex >= 0) {
      commonPath = commonPath.substring(0, lastSlashIndex + 1);
    }
    // 将公共路径转换为驼峰式字符串
    let commonPathAry = commonPath.split("/").filter((item) => item !== "");
    if (commonPathAry.length > 1) {
      commonPathAry.splice(0, 1);
    }
    commonPath = getCamelCaseString(commonPathAry.join("/"));
    // 将更新后的分组数据添加到新对象中
    updatedGroupedData[commonPath] = sectionData;
  }
  // 返回更新后的分组数据
  return updatedGroupedData;
};

/**
 * 生成所有接口文件的函数
 * @param {Object} apiData - 包含API路径的对象。
 * @param {Object} components - 包含Swagger组件的对象。
 */
const generateFiles = (apiData, components) => {
  // 遍历每个接口文件
  Object.keys(apiData).forEach((fileName) => {
    // 获取接口数据
    const interfaceData = apiData[fileName];
    // 生成单个接口文件和类型文件的模板
    const { apiFileTemplete, typeFileTemplate } = generateSingleFile(
      interfaceData,
      components
    );
    // 设置接口文件存放目录
    let fileDir = `${API_PATH}/${fileName}`;
    // 创建目录
    fs.mkdirSync(`${fileDir}`, { recursive: true });
    // 打印接口文件信息
    console.log(
      chalk.whiteBright(`\n📁 ${fileName} [${interfaceData[0].tags}]`)
    );
    // 写入接口文件
    fs.writeFileSync(`${fileDir}/index.ts`, `${apiFileTemplete}`);
    console.log(chalk.whiteBright(`   |`));
    console.log(chalk.whiteBright(`   |__ 📄 index.ts`));
    // 如果存在类型文件，则写入类型文件
    if (typeFileTemplate) {
      fs.writeFileSync(`${fileDir}/type.ts`, `${typeFileTemplate}`);
      console.log(chalk.whiteBright(`   |`));
      console.log(chalk.whiteBright(`   |__ 📄 type.ts`));
    }
  });
  // 打印生成成功信息
  console.log(chalk.green("\n🎉🎉🎉🎉🎉🎉🎉🎉🎉 生成成功 🎉🎉🎉🎉🎉🎉🎉🎉🎉"));
};

/**
 * 生成单个接口文件的模板
 * @returns {String} 单个接口文件的模板
 */
const generateSingleFile = (interfaceData, components) => {
  let fileTemplate = ""; // 接口文件模板
  let singleTemplate = ""; // 单个接口模板
  let typeTemplate = []; // 类型
  let fileDoc = ""; //  接口文件注释
  let typeFileTemplate = ""; // 类型文件模板
  interfaceData.map((item) => {
    let interfaceName = "any"; // 定义接口name
    let interfaceParams = "data?: any"; // 定义参数及类型
    let parametersType = "data"; // 请求类型
    // 如果存在请求体
    if (item.requestBody) {
      let schema = item.requestBody.content["application/json"].schema;
      // 如果请求体是引用类型
      if (schema["$ref"]) {
        let schemaArray = schema["$ref"].split("/");
        interfaceName = schemaArray[schemaArray.length - 1];
        typeTemplate.push(interfaceName);
        interfaceParams = `data${
          item.requestBody.required ? "" : "?"
        }: ${interfaceName}`;
      } else {
        Object.keys(schema.properties).map((x) => {
          // 如果请求体中的参数是binary类型
          if (schema.properties[x].format === "binary") {
            interfaceParams = `data: FormData`;
            parametersType = "data";
          }
        });
      }
    } else {
      interfaceName = ``;
      interfaceParams = ``;
      parametersType = ``;
    }

    // 如果存在query参数
    if (
      item.method.toLocaleLowerCase() === "get" ||
      item.method.toLocaleLowerCase() === "delete"
    ) {
      let queryParameters = item.parameters.filter((x) => x.in !== "header");
      if (queryParameters.length > 0) {
        interfaceName = ``;
        parametersType = ``;
        let requestPathArray = item.path.split("/").filter((x) => x !== "");
        for (let j = 0; j < requestPathArray.length; j++) {
          if (
            requestPathArray[j].indexOf("{") !== -1 &&
            requestPathArray[j].indexOf("}") !== -1
          ) {
            requestPathArray[j] = "$" + requestPathArray[j];
          }
        }
        item.path = requestPathArray.join("/");
        queryParameters.map((x, i) => {
          if (x.in === "path") {
            if (x.schema.type) {
              // 如果存在泛型
              if (x.schema.items) {
                interfaceName +=
                  `${x.name}${x.required ? "" : "?"}: ${dataType(
                    x.schema.type
                  )}` +
                  `<${dataType(x.schema.items.type)}>` +
                  `${i !== queryParameters.length - 1 ? "," : ""}`;
              } else {
                interfaceName +=
                  `${x.name}${x.required ? "" : "?"}: ${dataType(
                    x.schema.type
                  )}` + `${i !== queryParameters.length - 1 ? "," : ""}`;
              }
            }
            interfaceParams = `${interfaceName}`;
          } else {
            parametersType = "params";
            if (x.schema.type) {
              interfaceName +=
                `${i === 0 ? "{" : ""}` +
                `${x.name}${x.required ? "" : "?"}: ${dataType(
                  x.schema.type
                )}` +
                `${i !== queryParameters.length - 1 ? ";" : ""}` +
                `${i === queryParameters.length - 1 ? "}" : ""}`;
            } else if (x.schema.$ref) {
              let schemaArray = x.schema.$ref.split("/");
              interfaceName = schemaArray[schemaArray.length - 1];
              typeTemplate.push(interfaceName);
            }
            interfaceParams = `params: ${interfaceName}`;
          }
        });
      } else {
        parametersType = ``;
        interfaceParams = ``;
      }
    }

    // 处理接口名称
    let requestName = "";
    // 如果接口名称不是保留字
    if (!isReservedWord(item.operationId)) {
      requestName = item.operationId;
    } else {
      let requestPathArray = item.path.split("/").filter((x) => x !== "");
      requestPathArray = requestPathArray
        .map((x) => {
          if (x.indexOf("{") === -1 && x.indexOf("}") === -1) {
            return x;
          }
        })
        .filter((x) => x);
      requestName = getCamelCaseString(
        requestPathArray[requestPathArray.length - 2] +
          "/" +
          requestPathArray[requestPathArray.length - 1]
      );
    }
    item.path = "`" + item.path + "`";
    singleTemplate += `${apiConfig(
      item.summary,
      requestName,
      interfaceParams,
      item.method,
      item.path,
      parametersType
    )}\n`;
  });
  typeTemplate = Array.from(new Set(typeTemplate));
  if (typeTemplate.length) {
    typeTemplate.map((item) => {
      typeFileTemplate += `${interfaceTemplate(
        item,
        components["schemas"][item]
      )}\n\n`;
    });
    typeTemplate = `import {${typeTemplate.toString()}} from "./type"`;
  }
  fileDoc = `/**\n * @description ${interfaceData[0]["tags"].toString()}\n */`;
  fileTemplate = `${fileDoc}\n\n${topConfig}\n${typeTemplate}\n${singleTemplate}`;
  return {
    apiFileTemplete: prettier.format(fileTemplate, prettierConfig),
    typeFileTemplate: prettier.format(typeFileTemplate, prettierConfig),
  };
};

/**
 * @Description 生成单个类型模板
 * @param {*} interfaceName 类型名称
 * @param {*} interfaceParams 类型参数
 * @return {*} 类型模板
 */
const interfaceTemplate = (interfaceName, interfaceParams) => {
  let baseTemplate = `export type ${interfaceName} = `;
  let parametersTemplate = ``;
  if (interfaceParams.properties) {
    let propertyKeys = Object.keys(interfaceParams.properties);
    propertyKeys.forEach((propertyKey) => {
      let property = interfaceParams.properties[propertyKey];
      if (property.items) {
        parametersTemplate +=
          `${
            property.description
              ? "// " + property.description + "\n" + propertyKey
              : propertyKey
          }` +
          ":" +
          `${dataType(property.type)}` +
          `<${dataType(property.items.type)}>\n`;
      } else {
        parametersTemplate += `${
          property.description
            ? "// " + property.description + "\n" + propertyKey
            : propertyKey
        }: ${dataType(property.type)}\n`;
      }
    });
    parametersTemplate = `{\n${parametersTemplate}}`;
    baseTemplate += parametersTemplate;
    return baseTemplate;
  }
};

// 生成接口文件主函数
const generateApiFile = async () => {
  // 先删除已经生成的文件
  removeDir(API_PATH);
  // 检测目标文件夹是否存在
  try {
    isDirExist();
  } catch (error) {
    console.log(chalk.red("程序终止："));
    console.log(
      chalk.red(
        "创建文件夹失败！请检查package.json/config.apiPath路径是否正确！"
      )
    );
    return;
  }
  // 解析url获得
  const swaggerData = await fetch(process.env.npm_package_config_swaggerUrl)
    .then((res) => res.json())
    .catch((err) => {
      console.log(
        chalk.red(
          "程序终止：请检查package.json/config.swaggerUrl路径是否正确！"
        )
      );
    });
  // 类型数据解析
  const components = swaggerData.components;
  // generateType(components);
  // 接口数据解析
  const paths = swaggerData.paths;
  const pathsKeys = Object.keys(paths);
  const pathsKeysLen = pathsKeys.length;
  console.log(
    chalk.blue("\n开始解析，总共接口数量：") + chalk.yellow(pathsKeysLen)
  );

  // 处理swagger数据
  const updatedGroupedData = transformGroupedData(groupedData(paths));
  generateFiles(updatedGroupedData, components);
};

// 开始分析swagger并生成接口文件
export default generateApiFile;
