# 开源项目调研记录

本轮检查了公开项目 **Crimson Tide**：

- Repository: https://github.com/AscendRyan/opensource-rts-game
- License: MIT
- 技术方向：纯 HTML5 Canvas / Vanilla JavaScript 的浏览器 RTS。
- 公开说明包含 2.5D 等距视角、三阵营、18 种单位、经济、战争迷雾与 AI。

## 复用决策

本轮没有直接复制其代码，也没有把现有工程整体迁移到另一套引擎。原因是当前项目已经有自定义的 PIBT 多单位预约寻路、CAFF 协同寻路研究代码以及现有的兵种战斗数据；直接替换整个模拟内核会增加回归风险。

后续可继续参考其等距 2.5D 渲染、阵营配置、任务系统与 AI 分层设计；在正式复用代码前，应再次核对上游当前许可证文本、具体文件版权声明和依赖许可证。
