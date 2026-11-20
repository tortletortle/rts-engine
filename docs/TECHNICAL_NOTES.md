# V2.2 技术说明

在 V2.1 单文件基础上增加 Strategy 的 points/vp/aiPlan/pointEvents、updateTerritory、income、checkPointVictory、planTerritoryAI 方法。每个 0.05 s 仿真步扫描活地面部队更新据点人数及有符号进度。占点推进速度为 min(1.8, 0.20+0.15*min(10,人数))，因人数限幅实际最大 1.7/s；状态由进度端点与过零决定。占点加分发生于更新所属之后，漸进误差最多一个 tick。复杂度 O(P*N)，P=5。

Battle.decide 按玩家订单后 AI 分组订单依序分配目标格，继续沿用既有 PIBT 预约机制。AI 以固定 id % 3 分组，不宣称最优；目标未变化时不重复重发。公开领土面板不透视具体驻军；现有统计及生产 AI 的敌空军计数仍是全局的，严格战争迷雾属于后续工作。

生产 spawn 同时检查当前 p 和预约 q；保持双层独立。固定 dt 仿真由 requestAnimationFrame 实时时间预算驱动，慢速机器不会无限累积补偿；实际速度可能低于选择的倍率。

开源评估沿用 V2.1 的 docs/OPEN_SOURCE_REVIEW.md，未引入外部源码。后续需要优化据点附近集群堵塞、AI 编队编成与补给、数值平衡、地形系统与三阵营改造。
