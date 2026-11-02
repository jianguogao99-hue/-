# 问迹 · Wenji

手机和 iPad 友好的聊天与问题地图。对话、收录、临时区、收藏、搜索、分支、合并拆分、跨设备同步，以及可关闭的 ASCII 字符眨眼背景。

## 更新方式

GitHub 是代码源。将本仓库连接到 Netlify 后，推送 `main` 会自动构建并部署。其他分支可通过 PR 生成预览。代码不包含用户聊天记录、数据库内容、API 密钥或旧网站的部署凭据。

```sh
npm ci
npm test
npm run build
```

Netlify 自动读取根目录 `netlify.toml`：构建命令 `npm run build`，静态目录 `web-dist`，后端目录 `netlify/functions`。请不要使用 `public` 作为发布目录，它是原始源码目录。

## 首次连接（需要网站所有者操作）

1. Netlify → Add new project → Import an existing project → GitHub → 选择本仓库。授权 Netlify GitHub App 读取该仓库，生产分支选 `main`。
2. 在 Netlify 的 Identity 页面启用身份服务。先用 Invite only（仅邀请）测试，Google 在 External providers 内开启。这里的设置只能在控制台修改，代码不能替代此步骤。
3. 配置 Functions 范围的秘密环境变量 `SYNC_KEY_ENCRYPTION`：安全生成的 32 字节随机数的 Base64。设置一次后保持不变；更换会导致已保存的用户 API 密钥无法解密。不要把值写入 GitHub 或 `netlify.toml`。
4. 安装的 `@netlify/database` 与 `netlify/database/migrations` 用于自动创建数据库并在部署时应用表结构。Netlify Database 需要支持的 Credit-based 计划，并可能产生存储、计算、流量费用。确认控制台已提供数据库能力后再启用正式使用。
5. 完成一次部署后测试登录、两账号隔离、各自配置 API 和跨设备同步。Identity 登录必须在实际部署上测试，不支持本地模拟完整登录。
6. 测试通过后再决定是否开放注册和网址访问；这里没有自动修改现有网站的访问权限。

Google 按 Identity 设置中实际开启的提供商显示。邮箱登录、注册确认邮件、密码找回均使用官方 `@netlify/identity`。微信登录尚未实现，需单独的账号接入方案及微信资质。

## 数据隔离与密钥

每个请求先用 Netlify 验证登录身份。服务端忽略浏览器传入的 `oai-authenticated-user-id`，改用已验证的身份；数据库查询同时限制账户和记录键。保存使用 ETag 条件写入，避免两台设备互相覆盖。模型密钥使用 AES-GCM 加密，附加绑定个人身份；取密钥只用于该用户的服务端模型调用，不返回明文到浏览器。

每位用户登录后在设置里填写自己的模型 API，不使用站长的共享模型密钥。实时搜索默认使用该用户自己的 DeepSeek 密钥。时间来自系统，天气使用 Open-Meteo。不要把数据库复制出来的个人信息放进公开的 Deploy Preview。

## 现有问迹与数据迁移

现有 ChatGPT Sites 网站继续独立运行。此仓库保留 `public/`、`worker/` 的当前源码，Netlify 构建在 `web-dist` 中替换登录入口，后端通过 Netlify Identity 与 Postgres 适配，不能直接把 Cloudflare Worker 当成 Netlify Function 上传。

两个平台的账号 ID 不相同。不要按邮箱自动绑定或复制密钥。已有用户可先在旧站设置中备份聊天数据，确认新账号归属后再实现/执行受控导入；当前仓库没有自动迁移生产数据。新站需要重新填写个人 API 密钥。保留旧站直到迁移核验完成。

## 目录

- `public/`：当前问迹的界面、交互和背景源码。
- `src/`：Netlify 邮箱/第三方登录页面与 SDK 启动代码。
- `worker/`：现有业务接口与时间/天气/搜索工具。
- `netlify/functions/`：Netlify 的认证与业务适配入口。
- `netlify/lib/`：按账户限制的 Postgres 条件读写。
- `netlify/database/migrations/`：部署时执行的数据库表结构。
- `scripts/build-netlify.mjs`：生成前端构建结果，保留源文件不变。
- `tests/`：账号隔离、同步、地图操作、实时工具、字符动画等检查。

`.netlify/` 已加入 `.gitignore`，不会上传本机 Netlify 绑定文件或认证状态。`.env*`、构建产物和原托管平台标识也排除在 GitHub 之外。
