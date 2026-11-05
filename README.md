# Open Music

基于 [stark81/VutronMusic](https://github.com/stark81/VutronMusic) 定制的桌面音乐播放器。本仓库保留上游作者、许可证和历史记录。

- 主界面参考 Spotify；播放和歌词页面参考网易云音乐。
- 点击底部歌曲封面进入同步歌词，支持收起、Esc 与键盘操作。
- 修复桌面歌词锁定后静止变透明，以及快速关闭和切换模式时的窗口回调问题。
- 独立应用名称和本地端口，可与原播放器并行运行。

## 开发与运行

需要 Node.js >= 22.6.0、Yarn 1.22.22。

```sh
yarn install --frozen-lockfile
yarn dev
```

构建 Windows 可运行目录：

```sh
yarn vue-tsc --noEmit
yarn vite build
yarn electron-builder --win --dir --config=buildAssets/builder/config.js --publish never
```

运行生成的 `release/3.3.5/win-unpacked/Open Music.exe`，或 Windows 下双击根目录的 `启动 Open Music.cmd`。运行包和 `node_modules` 不存入 Git。

## 文档与验证

- [使用说明、验证范围与回滚方法](OPEN-MUSIC-使用说明.md)
- [界面设计记录](DESIGN.md)
- [独立应用身份与端口](docs/src/spec/architecture/open-music-fork.md)
- 本机验证：31 项行为回归、15 项 Electron 集成及安全测试通过，Windows x64 运行包已实际启动。其他系统和全部在线账号功能尚未实机验收。

音质选择入口在“设置 → 音乐设置 → 音质选择”。当前上游网易云和酷狗插件仍使用固定请求参数，界面选择不保证改变实际音质；本地音乐按源文件播放。此限制尚未修复。

## 许可证与上游说明

保留根目录 [LICENSE](LICENSE) 及各文件原有的许可证、版权说明。下方保留上游项目说明，描述的截图和功能以其原项目为准。

---

<div align="center">
  <a href="https://github.com/stark81/VutronMusic" target="blank">
    <img src="buildAssets/icons/icon.png" alt="Logo" width="156" height="156">
  </a>
  <h2  style="font-weight: 600">VutronMusic</h2>
  <p>多数据源桌面音乐播放器</p>
</div>

[![LocalMusic][localMusic-screenShot]](https://github.com/stark81/VutronMusic)

## 说明

- 本项目为本人个人项目，仅用于个人学习研究，请勿用于商业用途。
- 本项目大部份界面和功能参考 [YesPlayMusic](https://github.com/qier222/YesPlayMusic)，侧边导航栏设计参考"方格音乐"，本地音乐top部分的信息统计参考 [NSMusicS](https://github.com/Super-Badmen-Viper/NSMusicS)。
- 本地歌曲的内嵌歌词以及外挂lrc歌词支持从[LDDC](https://github.com/chenmozhijin/LDDC)下载的逐字歌词歌词格式。

- 账号登录问题可以从 [wiki - 账号登录](https://github.com/stark81/VutronMusic/wiki/%E8%B4%A6%E5%8F%B7%E7%99%BB%E9%99%86) 里查看解决方法。此外，[wiki](https://github.com/stark81/VutronMusic/wiki/) 里也包含了linux插件、逐字歌词、流媒体等方面的简要说明。

## 特点

- ⚡️ 手脚架为：[vutron](https://github.com/jooy2/vutron)；
- ⚡️ 使用 Vue3 + TypeScript + Pinia + Fastify + better-sqlite3 + Zod 进行开发；
- ⚡️ 插件化架构：支持多数据源聚合，可通过插件扩展新的音乐平台
- ⚡️ 支持本地歌曲、离线歌单功能，本地歌曲支持读取外挂和内嵌封面歌词，支持逐字歌词功能，支持线上信息匹配；
- ⚡️ 支持流媒体音乐，暂时包括：navidrome、jellyfin和emby；
- ⚡️ 支持网易云、酷狗等在线音乐平台（通过插件系统）
- ⚡️ 跨平台歌曲匹配：播放时自动匹配在线插件，获取歌词、评论等元数据
- ⚡️ 支持Mac状态栏歌词、TouchBar歌词等；Linux下可通过[media-controls](https://github.com/stark81/media-controls)、[dynamic-music-pill](https://extensions.gnome.org/extension/9334/dynamic-music-pill/)插件(gnome桌面)或者[vutronmusic-lyrics](http://github.com/cmachsocket/org.kde.plasma.vutronmusic-lyrics)插件(kde桌面)将歌词显示在TopBar里；
- ⚡️ 支持音效设置、变调变速等高级音频功能；
- ⚡️ 支持云盘、歌曲评论等功能；

## 配置开发环境

```
# 环境要求：Node.js >= 22.6.0，Yarn 1.22.22
# 安装依赖
yarn install

# 运行
yarn dev（开发）
yarn build（构建）
```

## 开源许可

本项目仅供个人学习研究使用，禁止用于商业及非法用途。

基于 [MIT license](https://opensource.org/licenses/MIT) 许可进行开源。

## 截图

![home-screenShot][home-screenShot] ![explore-screenShot][explore-screenShot] ![library-screenShot][library-screenShot] ![likepage-screenShot][likepage-screenShot] ![local-music-screenShot][local-music-screenShot] ![playlist-screenShot][playlist-screenShot] ![playpage-screenShot][playpage-screenShot] ![comment-screenShot][comment-screenShot] ![search-screenShot][search-screenShot] ![user-screenShot][user-screenShot] ![mv-screenShot][mv-screenShot] ![tray-lyric-screenShot][tray-lyric-screenShot] ![media-controls-screenShot][media-controls-screenShot]

[localMusic-screenShot]: images/localMusic.jpg
[home-screenShot]: images/home.jpg
[explore-screenShot]: images/explore.jpg
[library-screenShot]: images/library.jpg
[likepage-screenShot]: images/like-page.jpg
[local-music-screenShot]: images/local-music.jpg
[playlist-screenShot]: images/playlists.jpg
[playpage-screenShot]: images/play-page.jpg
[comment-screenShot]: images/comment-page.jpg
[search-screenShot]: images/search-lyric.jpg
[setConvolver-screenShot]: images/setConvolver.jpg
[user-screenShot]: images/user.jpg
[tray-lyric-screenShot]: images/tray-TouchBar-lyric.jpg
[mv-screenShot]: images/mv.jpg
[media-controls-screenShot]: images/media-control-lyric.png

## star趋势

[![Stargazers over time](https://starchart.cc/stark81/VutronMusic.svg?variant=adaptive)](https://starchart.cc/stark81/VutronMusic)
