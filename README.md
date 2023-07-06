### 基于 swagger3 生成前端接口代码文件

在需要生成接口文件的项目里 package.json 中添加

<pre>
"config": {
    "swaggerUrl": "http://192.168.x.x/maotiao_backend/v3/api-docs/all",
    "apiPath": "/src/api",
    "httpDirPath": "@/utils/axios"
}
</pre>
在需要生成接口文件的项目里 script 中添加

<pre>
"script": {
    "generate":"node generate"
}
</pre>
