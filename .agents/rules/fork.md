# Fork 开发规范（草稿）

本仓库是 [QuantumNous/new-api](https://github.com/QuantumNous/new-api) 的 fork（`github.com/qilanai/new-api`），目标是在持续跟进上游的前提下增强功能。本文件只回答三个问题：改动放在哪里才不会和上游冲突、哪些改动应该推回上游、怎样低成本持续同步。代码风格、数据库兼容、计费、认证安全、测试质量等要求全部沿用上游规则，本文件不重复、不削弱。

措辞与 `AGENTS.md` 一致：MUST / 禁止 为强制项，"建议"为默认做法。

## 0. 阅读门禁与规则分层

- 任何规划、编码、评审开始前，MUST 先完整读取根目录 `AGENTS.md`，再读取本文件。涉及 `web/` 时再读 `web/AGENTS.md`；涉及计费时再读 `.agents/rules/billing.md`。本文件不替代任何上游规则。
- 上游规则文件（`AGENTS.md`、`CLAUDE.md`、`web/AGENTS.md`、`.agents/github/`、`.agents/rules/billing.md`、`.agents/skills/`）MUST 保持与上游一致，禁止在 fork 中修改。fork 自己的规则只写在本文件；需要让 AI 助手读到本文件时，在 `CLAUDE.md` 末尾追加一行读取指令即可，不改其他内容。
- 本文件与上游规则冲突时，以上游规则为准，并在本文件"待决事项"中记录冲突。

## 1. 硬约束

**许可证与品牌（禁止触碰）**

- 项目许可证为 AGPLv3，并附 `NOTICE` 中的第 7 条附加条款。修改版 MUST 在界面的关于、法律、页脚或署名位置保留文案 `Frontend design and development by New API contributors.` 和指向 <https://github.com/QuantumNous/new-api> 的可见链接；MUST 标注改动，禁止误导软件来源。
- `AGENTS.md`"Project Governance" 列出的受保护信息（new-api / QuantumNous 的品牌、版权声明、Go module path、包名与 import path、Docker 镜像名、CI 引用等）禁止修改、删除或替换。fork 的品牌只能叠加显示，不能替换。
- Go module path 保持 `github.com/QuantumNous/new-api`，fork 新增包的 import path 仍在其下。
- 发布镜像名保留 `new-api`，例如 `ghcr.io/qilanai/new-api`。
- fork 自身的修改声明追加在 `NOTICE` 末尾的独立小节中，不改动既有内容。

**渠道类型 ID（fork 内禁止新增）**

- `constant/channel.go` 的 `ChannelType*` 是密集递增整数，以 `ChannelTypeDummy` 作为计数上界；`ChannelBaseURLs` 按下标对齐；`controller/model.go` 用 `1..ChannelTypeDummy` 循环；`web/src/features/channels/constants.ts` 按数字键映射；该 ID 持久化在 `channels.type`。
- fork 内新增渠道类型几乎必然与上游下一个渠道撞号，撞号后同步会污染线上数据。因此 fork 内禁止分配新的 `ChannelType*` / `APIType*`。新供应商按第 4 节的优先级接入；确需新 Adaptor 的，MUST 先向上游提交并取得正式 ID。

**数据库**

- 所有数据库改动 MUST 同时兼容 SQLite、MySQL >= 5.7.8、PostgreSQL >= 9.6，并按 `AGENTS.md` 的要求在真实三库上验证新装、升级、幂等，把版本与命令写入 PR。
- 测试通过 `TEST_MYSQL_DSN` / `TEST_POSTGRES_DSN` 启用 MySQL 与 PostgreSQL 用例，未配置时会被跳过；三库验证不得以"跳过即通过"结案。

**上游拒收范围**

- 上游明确不接受：Coding Plan、逆向渠道、第三方封装接口、Codex 渠道类型改动、纯透传转发、第三方托管站点。这些功能若 fork 需要，只能作为 B 类改动留在扩展层，禁止向上游提交。

## 2. 改动分类与提交信息

每个改动在动手前 MUST 分类，并在 PR 描述首行标明。

- **A 类：可回上游。** 通用 bug 修复、符合上游范围的功能。MUST 从 `upstream/main` 切分支，按上游流程提交（先建 Issue，PR 正文使用 `.agents/github/PR.md`，真实命令与观察结果作为验证，非核心开发者声明 AI 辅助）。合入后随同步回到 fork，不在 fork 中重复实现；上游未合入前确需先用的，可临时以 B 类方式落地并在第 11 节登记，待上游合入后删除。
- **B 类：仅 fork。** 业务特有功能或上游拒收范围。MUST 写在第 3、5 节定义的扩展层命名空间内，触碰上游文件须在第 11 节登记。

提交信息沿用上游的 Conventional Commits：

- B 类提交 scope 固定以 `ext` 开头，例如 `feat(ext/report): add daily usage report`、`fix(ext/billing-hook): ...`。
- A 类提交沿用上游 scope（`web`、`relay`、`billing`、`auth`、`plugins` 等），不加 `ext`。
- 同步上游的 merge commit 使用 `chore(sync): merge upstream v1.0.0-rc.NN`。

## 3. 后端扩展层

**目录与命名空间**

- fork 新增的 Go 代码 MUST 放在根目录 `ext/` 下，按层分子包：`ext/controller`、`ext/service`、`ext/model`、`ext/setting`、`ext/router`、`ext/relay`（如需要）。禁止在上游目录新建业务文件。
- `ext/` 内部遵守 `AGENTS.md` 的全部后端规则：JSON 走 `common.Marshal` 等包装函数，行锁用 `lockForUpdate(tx)`，测试用 testify，可选标量字段用指针加 `omitempty`。
- `ext/` 只依赖上游包的导出 API，禁止依赖上游未导出符号或复制上游私有函数。能用接口（`channel.Adaptor`、`channel.TaskAdaptor`、插件 API v1）解决的不要改上游实现。

**唯一注册入口**

- `ext/register.go` 是扩展层唯一入口，提供 `ext.Init()`。上游代码允许的改动上限为三行：
  1. `main.go` import 块加 `_ "github.com/QuantumNous/new-api/ext"`，让各子包的 `init()` 完成设置与权限注册；
  2. `main.go` 在 `InitResources()` 成功后调用 `ext.Init()`，执行 fork 自己的迁移和运行时装配；
  3. `router/main.go` 的 `SetRouter` 中调用 `extrouter.SetExtRouter(router)`。
- 超出这三行的上游改动一律视为例外，MUST 在第 11 节登记原因。

**配置、权限、环境变量**

- 配置 MUST 通过 `config.GlobalConfig.Register("ext_<module>", &struct)` 注册，option 键自动带 `ext_<module>.` 前缀；禁止向 `model/option.go` 的 `OptionMap` 初始化列表追加键。
- 权限 MUST 通过 `authz.RegisterResource` 在 `ext/` 的 `init()` 中注册，资源名以 `ext.` 开头；禁止修改 `service/authz/resources_*.go`。
- 环境变量统一 `EXT_` 前缀，并在 `.env.example` 末尾的"Fork 扩展"小节中登记。
- 日志统一通过 `common.LogText` / `logger.*`，消息前缀 `ext:` 便于检索。

## 4. 新供应商接入优先级

按顺序评估，选中前一项就不往下走：

1. **现有渠道或 Advanced Custom（type 58）。** 兼容 OpenAI、Claude、Gemini 协议的上游直接配置即可；Advanced Custom 支持按端点配置地址、鉴权与协议转换。
2. **JS task plugin。** 异步任务型供应商（图片、视频、文档等）MUST 以插件实现，放在 `plugins/tasks/<key>/`，遵守 `docs/plugin-api/v1.md` 及其 schema 与 `.d.ts`。插件可运行时上传、可声明自己的路由，也可通过 `TaskPluginMarketplaceSources` 指向 fork 自建的插件市场，实现零 Go 代码接入。插件目录内禁止放文档文件。
3. **新 Adaptor。** 先推上游取得正式渠道 ID（见第 1 节）。上游合入前 fork 内的临时实现 MUST 在第 11 节登记，并注明"同步时可能改号"的风险。

## 5. 前端扩展层

- fork 功能 MUST 放在 `web/src/features/ext-<name>/`，内部结构沿用 `web/AGENTS.md` 的 `components/`、`lib/`、`hooks/`、`api.ts`、`types.ts` 约定。
- 路由使用文件式路由，放在 `web/src/routes/_authenticated/ext/<name>/` 下，由 TanStack Router 自动生成到 `routeTree.gen.ts`；禁止改动上游路由文件。
- 以下热点文件无法避开，改动规则为"一行 import 加一个数组元素"，禁止在其中写逻辑：
  - `web/src/components/layout/lib/sidebar-view-registry.ts`（侧边栏嵌套视图）
  - `web/src/components/layout/config/system-settings.config.ts`（系统设置导航）
  - `web/.oxlintrc.json` 的 `react/only-export-components.allowExportNames`（新增设置分区的导出名）
- 系统设置新分区 MUST 以独立的 `section-registry.tsx` 提供导航项，与上游分区同构。
- 组件复用、typecheck 零错误、lint 零 error、测试放模块自己的 `__tests__/` 目录等要求全部沿用 `web/AGENTS.md`。
- 版权头由 `bun run copyright` 统一插入，fork 新文件同样执行该脚本；禁止逐文件改写版权头。fork 署名在仓库级 `NOTICE` 中声明。

## 6. 数据库与迁移

- fork 新表 MUST 使用 `ext_` 前缀，并通过 `TableName()` 显式指定。
- 禁止向上游表追加列。需要关联时建旁表，以上游表主键作为外键字段。
- 能用 options 表（`config.GlobalConfig.Register`）表达的配置禁止建表。
- 迁移写在 `ext/model/` 下的独立文件，由 `ext.Init()` 在 `model.InitDB()` 之后执行；禁止改动 `model/main.go` 的 `migrateDB`。
- 迁移 MUST 可重复执行；涉及 SQLite 时只用 `ADD COLUMN`，不用 `ALTER COLUMN`；禁止依赖 GORM 布尔 `default` 标签。
- 日志库同样支持 ClickHouse，若 fork 新表要进日志库，须同时验证 ClickHouse。
- 本地三库环境：`docker-compose.dev.yml` 已提供 PostgreSQL 15 与 Redis，fork 需补充一个 MySQL 服务（建议同时提供 5.7 与 8.x 两个 profile）。

## 7. 国际化

- 沿用同一套七个 locale 文件（`en`、`zh`、`zh-TW`、`fr`、`ja`、`ru`、`vi`）与"英文原文即键"的规则。fork 不另开 i18next namespace：`web/src/i18n/config.ts` 关闭了 `nsSeparator`，同步脚本也只识别主文件。
- 任何 locale 写入 MUST 按 `.agents/skills/i18n-translate/SKILL.md` 走脚本，再执行 `bun run i18n:sync`；禁止手工编辑 `web/src/i18n/locales/*.json`。
- 同步上游后若 locale 文件冲突，先接受双方改动，再执行 `bun run i18n:sync` 归一排序，并检查 `_sync-report.json` 的 missing 与 untranslated 为零。
- 后端面向 AI 客户端的错误走 `i18n.T`；控制台消息走 `common.NewMessage` 并在七份 locale 中补齐键。

## 8. 分支与上游同步

**分支模型**

- `upstream`：指向 QuantumNous/new-api，只读。
- `main`：上游镜像分支，MUST 与 `upstream/main` 保持一致，禁止直接提交。
- `develop`：集成分支，等于上游加 fork 增量；功能分支从 `develop` 切出（B 类）或从 `upstream/main` 切出（A 类）。
- 发布从 `develop` 打 tag。

**同步流程**

- 同步 MUST 使用 merge，禁止 rebase `develop`。
- 节奏跟随上游 rc tag，两次同步间隔不超过两周；上游发布安全修复时立即同步。
- 同步前后各执行一次"维护债务"统计，触碰上游文件数超过 15 个时，下一个迭代 MUST 优先偿还（上游化或迁入 `ext/`）。

```bash
git remote add upstream https://github.com/QuantumNous/new-api.git
git fetch upstream --tags

# 更新镜像分支
git checkout main && git merge --ff-only upstream/main && git push origin main

# 合并到集成分支
git checkout develop
git merge upstream/main -m "chore(sync): merge upstream v1.0.0-rc.NN"

# 维护债务：排除扩展层后 fork 触碰的上游文件
git diff --stat upstream/main...develop -- . ':!ext' ':!web/src/features/ext-*' ':!web/src/routes/_authenticated/ext' ':!.agents/rules/fork.md'
```

- 冲突解决顺序：先保留上游改动，再把 fork 逻辑迁回 `ext/`；只有确认无法迁出时才在上游文件内合并，并更新第 11 节。
- 同步后 MUST 完整跑第 10 节的本地门禁，再推送。
- 建议增加每周定时 CI：试合并 `upstream/main` 到 `develop` 并跑全部测试，仅报告不推送。

## 9. 版本与发布

- 版本号沿上游格式并追加 fork 序号：`v1.0.0-rc.42-ext.1`。禁止使用 `+`（Docker tag 不支持）；避免 `-alpha` 后缀（`release.yml` 排除）与 `nightly` 前缀（`docker-build.yml` 排除）。
- `VERSION` 由 CI 从 tag 写入并通过 ldflags 注入 `common.Version`，不要手工提交 `VERSION` 内容。
- 发布说明 MUST 注明基于的上游版本，并列出本次包含的 B 类改动。
- 界面"关于"与页脚保留上游署名和链接，fork 名称叠加显示。

## 10. 质量门禁

上游 CI 只跑 vet、build、三模块测试以及前端 typecheck 与 vitest；`AGENTS.md` 要求但 CI 未覆盖的检查由 fork 补齐。提交前 MUST 在本地全部通过：

```bash
# 后端（三个模块独立构建，与 CI 一致）
gofmt -l . relaykit tokenkit
GOWORK=off go vet ./... && (cd relaykit && GOWORK=off go vet ./...) && (cd tokenkit && GOWORK=off go vet ./...)
make test

# 前端（bun 1.4.0，与 CI / Dockerfile 锁定版本一致）
cd web && bun install --frozen-lockfile
bun run typecheck && bun run lint && bun run format:check && bun run copyright:check && bun run test
bun run i18n:sync   # 改动过 locale 或 t() 文案时
```

- fork CI MUST 在上游 CI 基础上增加：`gofmt -l` 为空、`bun run lint`、`bun run format:check`、`bun run copyright:check`。
- `relaykit/` 与 `tokenkit/` 的改动 MUST 在模块内以 `GOWORK=off go build ./...` 验证；禁止反向依赖根模块。
- 触发 `AGENTS.md` 计费门禁或认证安全条款的改动，验证要求以上游规则为准。
- 涉及三库的改动，PR MUST 附上实际使用的数据库版本、命令与结果。

## 11. 触碰上游文件清单

B 类改动每触碰一个上游文件（`ext/`、`web/src/features/ext-*`、`web/src/routes/_authenticated/ext/`、本文件之外的任何文件）MUST 在此登记。同步上游时按本表逐项核对；条目被上游化或迁入扩展层后删除。

| 文件 | 改动摘要 | 原因 | 引入提交 | 退出条件 |
| --- | --- | --- | --- | --- |
| `main.go` | 增加 `ext` blank import 与 `ext.Init()` 调用 | 扩展层注册入口（第 3 节允许） | 待填 | 长期保留 |
| `router/main.go` | 调用 `SetExtRouter` | 扩展层路由入口（第 3 节允许） | 待填 | 长期保留 |
| `CLAUDE.md` | 末尾追加读取本文件的指令 | 让 AI 助手读到 fork 规则 | develop 首批提交 2026-10-11 | 长期保留 |
| `NOTICE` | 末尾追加 fork 修改声明 | AGPLv3 第 7(c) 条 | develop 首批提交 2026-10-11 | 长期保留 |
| `web/public/brand/` | 新增 Elink Nexus 品牌 SVG（图标、横版组合标）与 `clients/` 下 4 个客户端图标 | 控制台 Logo 与首页共用的品牌资源 | edf732c99 | 长期保留 |
| `web/src/features/home/index.tsx` | 默认首页分支改为渲染 `@/features/ext-landing` 的 `Landing`，删除上游 Hero/Stats/Features/HowItWorks/CTA 的引用 | 品牌首页替换上游默认首页；自定义首页内容（iframe / Markdown / HTML）分支与页头页脚保持上游 | edf732c99 | 长期保留；同步时若上游重构 Home 需重新套用这一处替换 |
| `web/src/i18n/locales/*.json` | 通过 i18n 脚本新增首页文案 179 个键（七种语言） | 首页文案 i18n；按 §7 走脚本写入 | edf732c99 | 长期保留 |
| `web/src/components/layout/components/footer.tsx` | 底栏改为居中两行：版权行在上，New API 署名缩小放在下一行；署名文案与链接原样保留。收紧页脚上下留白（容器 `pt-10 pb-5 md:pt-12 md:pb-6`，底栏 `mt-8 pt-4 gap-y-1`） | 品牌页脚排版；署名按 NOTICE 第 7 条与 §1 不得删除 | edf732c99 | 长期保留 |
| `web/src/components/layout/components/app-header.tsx` | 删除页头里的 `SystemUpdateAction`（版本号 / 上游更新检查）及其 import | 品牌站不展示上游版本号；更新检查仍保留在系统设置 → 维护 | edf732c99 | 长期保留 |
| `web/src/components/layout/components/public-header.tsx` | 同上，删除公共页头里的 `SystemUpdateAction` 及其 import | 同上 | edf732c99 | 长期保留 |
| `controller/subscription_payment_stripe.go` | 订阅走 Stripe Checkout 时不再传 `customer_creation`（subscription 模式下 Stripe 直接 400 拒绝，导致无法购买套餐） | A 类通用 bug 修复，先在 fork 落地 | 8312cb653 | 向上游提交 PR，合入并同步后删除 |

## 12. 待决事项

- 扩展层命名 `ext` 为占位，可在第一个 B 类功能落地前改为品牌前缀；一旦落地禁止再改。
- 同步节奏（每个 rc tag 或固定两周）由团队确认。
- 维护债务上限（默认 15 个上游文件）由团队确认。
- `docker-compose.dev.yml` 的 MySQL 服务是否直接改上游文件，或另建 `docker-compose.ext.yml` 叠加。
- fork 是否发布 Electron 桌面版；若不发布，`electron-build.yml` 在 fork 中禁用。

## 更新日志

- **2026-10-10**：初稿，基于上游 `v1.0.0-rc.42`（commit `1d4328e97`）的仓库调研。
- **2026-10-11**：首次同步上游 main `42e694eb6`（`v1.0.0-rc.43` 之后 15 个提交），无冲突；fork 发布版本号从 `v1.0.0-rc.43-ext.1` 起。
