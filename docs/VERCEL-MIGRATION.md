# 从 Netlify 迁移到 Vercel + Supabase

迁移分支：`migration/vercel-supabase`。现有 Netlify 生产站不切换、不删除。新站通过邮箱和密码注册登录，无第三方授权入口、无 Netlify 页面标志。免费额度可以用于先行测试，实际额度和费用以服务商控制台为准。

## 1. Supabase 项目

在自己的 Supabase 账号创建项目，保存数据库密码。打开 SQL Editor，在新数据库执行 `supabase/migrations/202611020001_account_objects.sql`。此脚本仅创建新站表、按登录用户限制的 RLS 策略和条件写入函数，不连接或改变旧站数据库。

Auth → Providers / Sign In → Email：开启邮箱登录。需要直接注册成功时，关闭 Confirm email。未关闭时，网页会提示查收确认邮件。可在 Auth → URL Configuration 中添加新站网址作为 Site URL，并将 `https://你的网址/login.html`、`https://你的网址/login.html?recovery=1` 加入允许的重定向地址。

在项目的 API / Connect 设置查找：

- Project URL → `SUPABASE_URL`
- Publishable key（或旧式 anon public key）→ `SUPABASE_PUBLISHABLE_KEY`

这两个值用于浏览器连接，属于公开配置。**不要使用 Secret key 或 service_role key**，构建程序会拒绝将这些高权限密钥打包进浏览器。数据库密码也不需要交给网页。

## 2. Vercel 连接 GitHub

用自己的 Vercel 账号导入 GitHub 仓库 `jianguogao99-hue/-`。第一次验证时，将 Production Branch 设置为 `migration/vercel-supabase`，避免使用仍在运行 Netlify 版本的 main。Framework Preset 选 Other，项目根目录保留默认。

`vercel.json` 已声明：构建命令 `npm run build:vercel`，输出目录 `web-dist`，API 函数位于 `api/[...path].js`。无需安装 Netlify 插件。

配置环境变量（先配置 Production，Preview 不复制生产个人数据）：

| 名称 | 用途 |
| --- | --- |
| `SUPABASE_URL` | 项目 HTTPS URL，可公开 |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable / anon 公共 key，可公开 |
| `SYNC_KEY_ENCRYPTION` | 新的 32 字节随机数 Base64，秘密，只在服务端使用；创建后不能随意更换 |
| `SEARCH_PROVIDER` | 可选，默认 deepseek，使用当前用户自己的模型密钥 |
| `WEATHER_PROVIDER` | 可选，默认 open-meteo |

`SYNC_KEY_ENCRYPTION` 不进入浏览器、源码或备份。不要把真实值提交到 GitHub。不要配置站长共享模型 API 密钥；各用户自行保存自己的密钥。

## 3. 验证后再迁移

先测试以下真实流程：新邮箱注册、退出和密码登录、两账号互不可见、各自配置 API、提问、收录入图、跨设备同步、备份导入。构建和本地测试通过不能代替实际部署后的登录验证。

旧站设置中下载 JSON 备份；新站登录自己的账号后，用“导入旧站备份”核对账号及数量并确认。备份不包含 API 密钥，需在新站重新填写。不要按邮箱自动合并不同平台账号，避免把内容转到他人账号。

新站未验证前不要停止旧 Netlify 服务、删除项目或复制旧数据库的原始密钥记录。正式切换后可以继续使用 Vercel 默认域名；确认自动部署绑定的分支后，再按需整理 main 分支和旧托管配置。

## 自动更新

在 Vercel 设置的 Production Branch 推送代码会触发自动部署。部署成功后，重新打开或刷新页面读取新版本；正在使用的聊天页不会强行刷新。测试预览不要共享真实个人数据。

## 验证命令

```sh
npm ci
npm test
node tests/supabase-isolation.test.mjs
SUPABASE_URL=https://example.supabase.co SUPABASE_PUBLISHABLE_KEY=sb_publishable_build_fixture npm run build:vercel
```

示例配置仅验证构建，不能用于登录。真实项目的配置必须在部署平台设置。
