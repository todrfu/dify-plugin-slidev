# Slidev Backend - Dify Plugin

一个为Dify平台开发的插件，用于将Markdown内容转换为专业的PPT演示文稿。

## 项目概述

本项目是一个基于[Slidev](https://cn.sli.dev/guide/)的服务，提供API接口将Markdown内容转换为PPTX格式的演示文稿。它可作为Dify平台的 `dify-plugin-slidev` 插件的服务端。

### 主要功能

通过API接收Markdown内容，将Markdown转换为PPTX格式的演示文稿

## 项目结构

包含两个主要部分：

1. **slidev-node**：基于NestJS的后端服务，提供API接口
2. **slidev-client**：基于Slidev的前端部分，负责演示文稿的渲染和导出

## 安装与运行

### 环境要求

- Node.js >= 20
- pnpm >= 10.4.1

### 安装依赖

```bash
# 安装项目依赖
pnpm install
```

### 启动服务

```bash
# 启动后端服务
pnpm start
```

服务默认运行在 http://localhost:3000

## API使用指南

### 生成PPT接口

**API**：`POST /slidev/generate`

**请求体**：

```json
{
  "markdown": "# 我的演示文稿",
  "title": "我的PPT" // 可选，用于设置文件名
}
```

**响应**：

- 成功：返回PPTX二进制文件，Content-Type为`application/vnd.openxmlformats-officedocument.presentationml.presentation`

- 失败：返回JSON格式错误消息
```json
{
  "success": false,
  "message": "生成PPT失败"
}
```

## Markdown格式指南

本服务使用[Slidev](https://cn.sli.dev/guide/)处理Markdown，支持以下特性：

- 使用 `---` 分隔幻灯片
- 支持标准Markdown语法
- 支持Slidev特有的前置元数据（frontmatter）
- 支持代码高亮
- 支持表格、列表等常见元素
