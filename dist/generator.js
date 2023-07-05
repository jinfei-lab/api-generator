import { topConfig, apiConfig, fileDoc } from "./conf.js";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import parse from "swagger-parser";
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
 * 通过查找每个标签的路径中的公共路径并将其转换为驼峰式来更新分组数据。
 * @param {Object} groupedData - 具有标签作为键和包含路径、方法、标签、摘要和操作ID的对象数组为值的对象。
 * @returns {Object} - 具有每个标签路径中的公共路径转换为驼峰式作为键和包含路径、方法、标签、摘要和操作ID的对象数组为值的对象。
 */
const transformGroupedData = (groupedData) => {
  const updatedGroupedData = {};
  for (const section in groupedData) {
    const sectionData = groupedData[section];
    const paths = sectionData.map((item) => item.path);
    let commonPath = "";
    if (paths.length > 0) {
      const firstPath = paths[0];
      for (let i = 0; i < firstPath.length; i++) {
        const char = firstPath.charAt(i);
        if (paths.every((path) => path.charAt(i) === char)) {
          commonPath += char;
        } else {
          break;
        }
      }
    }
    const lastSlashIndex = commonPath.lastIndexOf("/");
    if (lastSlashIndex >= 0) {
      commonPath = commonPath.substring(0, lastSlashIndex + 1);
    }
    let commonPathAry = commonPath.split("/").filter((item) => item !== "");
    if (commonPathAry.length > 1) {
      commonPathAry.splice(0, 1);
    }

    commonPath = getCamelCaseString(commonPathAry.join("/"));
    updatedGroupedData[commonPath] = sectionData;
  }

  return updatedGroupedData;
};

/**
 * 生成接口文件
 * @param {Object} apiData - 包含API路径的对象。
 */
const generateFiles = (apiData) => {
  Object.keys(apiData).forEach((fileName) => {
    const interfaceData = apiData[fileName];
    const singleTemplate = generateSingleFile(interfaceData);
    fs.writeFileSync(`${API_PATH}/${fileName}.ts`, `${singleTemplate}`);
  });
};

/**
 * 生成单个接口文件的模板
 * @returns {String} 单个接口文件的模板
 */
const generateSingleFile = (interfaceData) => {
  let fileTemplate = "";
  let singleTemplate = "";
  let typeTemplate = [];
  let fileDoc = "";
  interfaceData.map((item) => {
    let interfaceName = "any"; // 定义接口name
    let interfaceParams = "data?: any"; // 定义参数及类型
    let parametersType = "data"; // 请求类型
    // console.log(item);
    // post请求默认为json传参
    if (item.requestBody) {
      // 正常的post/put请求
      let schema = item.requestBody.content["application/json"].schema;
      if (schema["$ref"]) {
        let schemaArray = schema["$ref"].split("/");
        interfaceName = schemaArray[schemaArray.length - 1];
        // typeTemplate += `${interfaceName},`;
        typeTemplate.push(interfaceName);
        interfaceParams = `data${
          item.requestBody.required ? "" : "?"
        }: ${interfaceName}`;
      } else {
        Object.keys(schema.properties).map((x) => {
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

    // get/delete请求参数放在params中
    if (
      item.method.toLocaleLowerCase() === "get" ||
      item.method.toLocaleLowerCase() === "delete"
    ) {
      let queryParameters = item.parameters.filter((x) => x.in !== "header");
      if (queryParameters.length > 0) {
        interfaceName = ``;
        parametersType = ``;
        queryParameters.map((x, i) => {
          if (x.in !== "path") {
            parametersType = "params";
          }
          if (x.schema.type) {
            interfaceName +=
              `${i === 0 ? "{" : ""}` +
              `${x.name}${x.required ? "" : "?"}: ${dataType(x.schema.type)}` +
              `${i !== queryParameters.length - 1 ? ";" : ""}` +
              `${i === queryParameters.length - 1 ? "}" : ""}`;
          } else if (x.schema.$ref) {
            let schemaArray = x.schema.$ref.split("/");
            interfaceName = schemaArray[schemaArray.length - 1];
            // typeTemplate += `${interfaceName},`;
            typeTemplate.push(interfaceName);
          }
        });
        // interfaceName = `${interfaceName}`;
        interfaceParams = `params: ${interfaceName}`;
      } else {
        parametersType = ``;
        interfaceParams = ``;
      }
    }

    // 处理接口名称
    let requestName = "";
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
    typeTemplate = `import {${typeTemplate.toString()}} from "./typings"`;
  }
  fileDoc = `/**\n * @description ${interfaceData[0]["tags"].toString()}\n */`;
  fileTemplate = `${fileDoc}\n\n${topConfig}\n${typeTemplate}\n${singleTemplate}`;
  return prettier.format(fileTemplate, prettierConfig);
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
  let parsed = await parse.parse(process.env.npm_package_config_swaggerUrl);
  // 类型文件生成
  const components = parsed.components;
  generateType(components);

  // 接口文件生成
  const paths = parsed.paths;
  const pathsKeys = Object.keys(paths);
  const pathsKeysLen = pathsKeys.length;
  console.log(" ");
  console.log(
    chalk.blue("开始解析，总共接口数量：") + chalk.yellow(pathsKeysLen)
  );
  console.log(chalk.red("----------------------------------------------"));

  // 处理swagger数据
  const updatedGroupedData = transformGroupedData(groupedData(paths));
  generateFiles(updatedGroupedData);
};

// 开始分析swagger并生成接口文件
export default generateApiFile;
