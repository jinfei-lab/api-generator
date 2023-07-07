// 文件顶部注释模板
const fileDoc = (desc) => {
  return `/**
 * @description ${desc}
 */`;
};

// 文件头部配置模板
const topConfig = `import request from "${process.env.npm_package_config_httpDirPath}";`;

// 单个接口的模板结构
const apiConfig = (
  summary, // 接口描述
  requestName, // 接口名称
  interfaceParams, // 接口传入参数及类型
  requestMethod, // 请求方法 get post delete等
  requestUrl, // 接口地址
  dataType // 传参类型 data params
) => {
  return `\n// ${summary}
export const ${requestName} = (${interfaceParams}) => {
  return request.${requestMethod}({url:${requestUrl}, ${dataType}});
};`;
};

export { topConfig, apiConfig, fileDoc };
