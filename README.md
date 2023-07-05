### 基于swagger3生成前端接口代码文件

在需要生成接口文件的项目里package.json中添加

```jsona
"config": {
    "swaggerUrl": "http://192.168.x.x/maotiao_backend/v3/api-docs/all",
    "apiPath": "/src/api",
    "httpDirPath": "@/utils/axios"
}
