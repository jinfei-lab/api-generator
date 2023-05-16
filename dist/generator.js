import { topConfig, apiConfig, fileDoc } from "./conf.js";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import parse from "swagger-parser";
import { fileURLToPath } from "url";
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

// 设置接口名称
const setInterfaceName = (operationId) => {
  return operationId.replace(/Using(POST|GET)/g, "");
};
// 数据类型
const dataType = (key) => {
  const type = {
    string: "string",
    integer: "number",
    int: "number",
    long: "string",
    Array: "array",
    file: "Blob",
    boolean: "boolean",
  };
  return type[key] ? type[key] : "any";
};

// 获取模块
const getModules = (map) => {
  map.forEach((value, key) => {
    writeFileApi(key, value);
  });
  console.log(chalk.green("----------------------------------------------"));
  console.log(chalk.green("导出成功！"));
};

// 参数item类型
const interfaceParamsList = (params) => {
  console.log(99, params);
  let str = "";
  params.forEach((item) => {
    str = `${str}
      /** ${item.description ? item.description : ""} **/
      ${item.name}${item.required ? "?" : ""}: ${dataType(item.type)}; 
    `;
  });
  return str;
};

// 定义参数类型
const interfaceParamsTpl = (params, interfaceName) => {
  if (!params || params.length === 0) {
    return "";
  } else {
    return `interface ${interfaceName} {
      ${interfaceParamsList(params)}
    }`;
  }
};

// 写入文件头部注释
const writeHeaderDoc = (apiInfo) => {
  const keys = Object.keys(apiInfo);
  // 请求类型
  const methodType = keys[0];
  const methodParams = apiInfo[methodType];
  const parameterTag = methodParams.tags[0]; // 接口参数
  return fileDoc(parameterTag);
};

// 写入单个接口模板
const writeSingleTemplate = (apiInfo) => {
  const keys = Object.keys(apiInfo);
  const methodType = keys[0]; // 请求类型
  const methodParams = apiInfo[methodType];
  const parameters = methodParams.parameters; // 接口参数
  const operationId = methodParams.operationId;
  const allPath = apiInfo.allPath; // 接口地址
  const summary = methodParams.summary; // 接口描述
  const requestName = setInterfaceName(operationId); // 接口名称格式化

  let interfaceName = "any"; // 定义接口name
  let interfaceParams = "data?: any"; // 定义参数及类型
  let parametersType = "data"; // 请求类型

  if (parameters && parameters.length > 0) {
    interfaceName = `${requestName}Ife`;
    interfaceParams = `data?: ${interfaceName}`;
  }
  // get请求默认为json传参
  if (methodType.toLocaleLowerCase() === "get") {
    parametersType = "params";
    interfaceParams = `params?: ${interfaceName}`;
  }
  return apiConfig(
    summary,
    interfaceParamsTpl(parameters, interfaceName),
    requestName,
    interfaceParams,
    methodType,
    allPath,
    parametersType
  );
};

// 写入文件
const writeFileApi = (fileName, interfaceData) => {
  // 设置文件顶部配置（如引入axios/定义响应类型等）
  let fileTemplate = topConfig;
  for (let i = 0; i < interfaceData.length; i++) {
    const item = interfaceData[i];
    fileTemplate = `${fileTemplate}\n${writeSingleTemplate(item)}`;
  }
  fileTemplate = `${writeHeaderDoc(interfaceData[0])}\n\n${fileTemplate}`;
  fs.writeFileSync(`${API_PATH}/${fileName}.ts`, fileTemplate);
  console.log(
    chalk.blue(
      `${fileName}.ts` +
        chalk.green(" ------------ ") +
        chalk.yellow("[" + interfaceData.length + "]") +
        chalk.green("个接口写入完成")
    )
  );
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
  try {
    // 解析url获得
    let parsed = await parse.parse(process.env.npm_package_config_swaggerUrl);
    const paths = parsed.paths;
    const pathsKeys = Object.keys(paths);
    const pathsKeysLen = pathsKeys.length;
    console.log(" ");
    console.log(
      chalk.blue("开始解析，总共接口数量：") + chalk.yellow(pathsKeysLen)
    );
    console.log(chalk.red("----------------------------------------------"));

    const modulesMap = new Map();
    for (let i = 0; i < pathsKeysLen; i++) {
      const item = pathsKeys[i];
      let methodKey = "";
      for (let i = 0; i < Object.keys(paths[item]).length; i++) {
        methodKey = Object.keys(paths[item])[i];
      }
      const itemAry = item.split("/");
      const pathsItem = paths[item];
      let fileName = itemAry[2];
      if (!fileName) {
        continue;
      }
      fileName = fileName.toLowerCase();
      pathsItem.allPath = item;
      if (modulesMap.has(fileName)) {
        // 继续添加到当前 fileName 文件内
        const fileNameAry = modulesMap.get(fileName);
        // 相同前缀的接口放在同一个文件内
        fileNameAry.push(pathsItem);
        // 重新设置
        modulesMap.set(fileName, fileNameAry);
      } else {
        modulesMap.set(fileName, [pathsItem]);
      }
    }
    // 获取模块，并写入文件
    getModules(modulesMap);
  } catch (e) {
    console.log(chalk.red("程序终止："));
    console.log(
      chalk.red(
        "swagger地址请求失败！请检查package.json/config.swaggerUrl是否正确！"
      )
    );
    return;
  }
};

// 开始分析swagger并生成接口文件
export default generateApiFile;
