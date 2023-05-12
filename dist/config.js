/**
 * 配置项
 * swaggerUrl：swagger文档地址
 * topConfig：单个ts文件顶部配置，如引入axios，定义返回数据类型等等
 * apiConfig： 单个接口的模板结构
 */

// 文件顶部注释模板
const fileDoc = (desc) => {
  return `/**
 * @description ${desc}
 */`;
};


// 文件头部配置模板
const topConfig = `import request from "${process.env.npm_package_config_httpDirPath}";
interface ResponseType extends Promise<any> {
  data?: object;
  code?: number;
  message?: string;
}`;

// 单个接口的模板结构
const apiConfig = (
  summary, // 接口描述
  interfaceType, // 接口类型定义
  requestName, // 接口名称
  interfaceParams, // 接口传入参数及类型
  requestMethod, // 请求方法 get post delete等
  requestUrl, // 接口地址
  dataType // 传参类型 data params
) => {
  return `\n// ${summary}
${interfaceType}
export const ${requestName} = (${interfaceParams}): ResponseType => {
  return request.${requestMethod}("${requestUrl}", ${dataType});
};`;
};

module.exports = { topConfig, apiConfig, fileDoc };
