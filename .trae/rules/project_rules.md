# 项目规则

## 核心功能保护（请勿改动）

以下三个功能是经过重点调试的核心功能，除非用户明确要求，否则不要修改其逻辑、行为或相关文件：

### 1. 搜索（按昵称/姓名/ID）
- 位置：`app/src/components/SearchPanel.tsx` 顶部搜索框区域
- 逻辑：`app/src/pages/Home.tsx` 中 `handleSearch` / `handleResetSearch` 及 `filteredRows` 内的关键词搜索部分
- 说明：关键词模糊/精确匹配，前端过滤

### 2. 多条件筛选（字段 + 值）
- 位置：`app/src/components/SearchPanel.tsx` 中条件行列表区域
- 逻辑：`app/src/pages/Home.tsx` 中 `filteredRows`（目的筛选部分）
- 说明：用户添加多个字段条件后，通过目的/字段进行筛选

### 3. 多条件匹配
- 位置：`app/src/components/SearchPanel.tsx` 中“开始匹配”按钮
- 逻辑：`app/src/pages/Home.tsx` 中 `results` 计算逻辑
- 服务：`app/src/services/match.service.ts`
- 说明：点击“开始匹配”后，根据所有活跃条件进行 AND 匹配，只显示满足全部条件的结果

## 通用约束

- 不要修改上述核心功能的算法、返回值结构或交互行为
- 可以在此基础上增加不干扰现有逻辑的辅助功能，但必须经过用户确认
- 如果用户报告上述功能有 bug，先定位问题再最小化修复，不要重构
