# 实时工具层

```text
worker/
  api.mjs             账号校验、加密密钥、模型代理、/api/tools
  tools.mjs           routeTools / timeTool / weatherTool / searchTool / augmentChat
public/
  app.js              发送浏览器时区、展示来源和更新时间
  cloud-account.js    浏览器请求转到同源后端，不暴露后端服务密钥
scripts/build.mjs     将 Worker 模块和静态资源打包
.env.example          只列配置名，不含真实密钥
tests/
  tools.test.mjs      路由、时间/天气/搜索、失败及无密钥测试
  sync.test.mjs       真实后端函数联调（上游使用受控响应）和账号隔离回归
```

## 流程

聊天请求携带 `app_tools: {mode: 'auto', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone}`。后端独立判断是否需要工具；普通回答与问题整理不会执行不必要的搜索。后端只访问写死的服务地址，调用工具后将结果及禁止编造/忽略网页指令的 system 约束发给模型。来源元数据直接从工具结果返回页面，不由模型生成。数据与来源会随回答同步到账号，历史结果保留当时查询时间，不伪装成新查询。

- 时间：系统时钟，合法浏览器 IANA 时区优先，非法或缺省回退 Asia/Shanghai。返回日期、时分秒、星期和时区。
- 天气：默认 Open-Meteo（GeoNames 地名搜索 + 当前天气），明确标示气象模型估算与更新时间；找不到城市或缺少城市时追问，不猜位置。可通过环境配置替换为 OpenWeather。
- 搜索：默认 DeepSeek Search `/v1/tools/search`，优先用 `SEARCH_API_KEY`，未设置则只在后端读取当前用户已有的加密 DeepSeek 密钥。可替换为 Tavily / Brave。未配置、无结果、限流和失败分别返回状态。无自动重试，避免额外搜索费用。
- 路由为可测试的规则层（不是让模型假装调用工具）。实现型问题如“如何开发天气API”直接解释；真实查询如“北京今天多少度”才调工具。支持上一轮天气的简短城市追问。当前天气不冒充未来天气预报。

搜索默认最多5个结果，返回标题、短摘要、链接、发布时间（未知为null）和查询时间。对新闻添加日期约束，但检索不保证覆盖所有新闻；未知日期不能称为今日新闻。只传摘要，不自行任意抓取用户 URL。

## 配置与费用

环境变量见 `.env.example`。通过 Sites runtime 设置服务端变量，配置后部署；不要在网页填写独立搜索/天气服务密钥，不要把密钥写进 `.openai/hosting.json`。DeepSeek 账号密钥继续沿用已有的后端加密账号配置。`SYNC_KEY_ENCRYPTION` 不得重新生成。

DeepSeek Search 官方当前价格为每1000次成功且有结果的请求5元，另有模型本身的调用成本。时间不调用搜索，天气默认不调用模型供应商的搜索服务。Open-Meteo 免费接口用于本个人演示；如商用应按其许可选购或替换服务。

## 验证

```sh
node tests/tools.test.mjs
node tests/sync.test.mjs
node scripts/build.mjs
```

已登录网页的同源控制台可单独测试工具（不生成模型回答；新闻搜索会计入搜索费用）：

```js
for (const question of ['现在几点', '北京今天多少度', '今天有什么新闻']) {
  const r = await fetch('/api/tools', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({question, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone})
  });
  console.log(question, await r.json());
}
```

本次测试不读取用户真实密钥。时间使用真实系统时钟；Open-Meteo 上游通过执行环境代理完成真实查询。新闻完整链路使用受控上游响应验证，未配置路径使用真实空配置验证；用户账号的实际搜索可用性和余额必须在登录状态下实际提问确认。

## 官方资料

- https://api-docs.deepseek.com/zh-cn/api/search/
- https://api-docs.deepseek.com/zh-cn/guides/search/
- https://open-meteo.com/en/docs
- https://open-meteo.com/en/docs/geocoding-api

## 郑州查询回归修复
识别“几度/多少度/气温/天气”，清理“我想知道/帮我查一下/今天/当前”等非地名成分，规范中文逗号和省份限定。连续重查与城市补充回溯最近的天气提问并执行新的工具请求。即便本轮未执行工具，也显式把空结果上下文传给模型，禁止把历史报错和时间当作本轮查询。天气结果附实际请求城市。

测试：`node tests/weather-routing.test.mjs`；经执行环境代理的真实接口测试：`node tests/live-weather.mjs`，已覆盖“今天郑州几度”“我想知道郑州现在多少度”“河南郑州今天几度”和“再查一次”。这些测试验证真实地名与天气服务，不使用用户的模型密钥。
