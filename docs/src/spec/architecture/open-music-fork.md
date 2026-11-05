---
last-updated: 2026-11-05
title: Open Music 本地分支
last-reviewed: 2026-11-05
---

# Open Music 本地分支

本分支在上游 VutronMusic 的基础上修改界面与桌面歌词。上游仓库地址、作者与许可证保留在项目元数据中。

## 独立运行

为避免关闭或连接到用户原来运行的 VutronMusic，Open Music 使用独立名称与端口：

| 项目 | Open Music | 上游默认值 |
| --- | --- | --- |
| npm 名称 | `open-music` | `VutronMusic` |
| 应用名称 | `Open Music` | `VutronMusic` |
| 打包应用 ID / Windows AppUserModelID | `io.local.openmusic` | `io.github.stark81.VutronMusic` |
| 生产静态服务 / Vite 页面 origin | `http://localhost:41831` | `http://localhost:41830` |
| 开发 Fastify API 服务 | `http://127.0.0.1:40002` | `http://127.0.0.1:40001` |

生产页面和桌面歌词均使用 41831；开发时 Vite 仍使用 41831，并将网易云、封面、流媒体及 Last.fm 回调请求代理到 40002。窗口导航及 IPC 校验继续使用 `Constants.APP_ORIGIN`，保留端口占用时退出的策略，不回退到另一进程的服务。

本地与流媒体插件的回退封面、网易云插件的默认代理地址同步改为 41831。自定义插件地址仍按插件原有设置处理，不修改用户提供的远程服务地址。

自动更新默认关闭，防止本分支被上游发行版自动替换；手动检查更新仍保留上游来源。

## 验证与回滚

运行 `node --test tests/open-music-identity.test.cjs`，直接执行真实 Constants、Vite 配置工厂、打包配置及本地插件，检查可信页面 origin、开发代理与插件封面地址。该检查不启动 Electron，也不占用本地端口。真实应用的并行运行、个人数据目录和窗口行为由 Electron 集成测试另行验证。

回滚这组源文件变更可恢复上游名称和端口；回滚前应退出 Open Music，避免两个不同构建占用同一端口。不要删除、迁移或覆盖原 VutronMusic 的用户目录。
