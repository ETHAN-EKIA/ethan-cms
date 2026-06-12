# Plan: CMS 产品自动化 — 最后缺口修复

**Source**: 用户需求文档 (PRD)
**Complexity**: Small

## Summary
需求文档 16/18 项已在前几轮迭代中实现。剩余 2 项：SEO 多语言存储 + 规格参数值智能判断。

## 已完成（无需改动）

16 项已实现，对应 commit `0dceeca`：
- 🌐 自动翻译按钮 + 保存时自动翻译
- 产品名称/简介/亮点/规格参数名/物流文本 → EN/ES 翻译
- SKU/价格/品牌/图片路径 → 直接复用
- Slug 自动生成 + 唯一性校验 (-1/-2)
- SEO 标题/描述/关键词自动生成 + 截断
- 翻译失败 → 中文降级，不阻断

## 待实现

### Task 1: SEO 多语言独立存储（P1）

**问题**：当前 `seoTitle/seoDesc/seoKeywords` 是单值字段。翻译后统一用英文，但需求要求每种语言独立 SEO。

**方案**：
1. Prisma schema：将 Product 的 SEO 字段改为 JSON 类型
   ```
   seoTitle   String? → Json?  // { zh, en, es }
   seoDesc    String? → Json?
   seoKeywords String? → Json?
   ```
2. ProductForm：SEO 区域按当前 Tab 语言显示/编辑
3. 翻译后：自动为每种语言生成独立 SEO
4. DB 迁移：`prisma db push`

**影响文件**：
| File | Action |
|------|:--:|
| `prisma/schema.prisma` | UPDATE — SEO 字段 String→Json |
| `src/components/admin/ProductForm.tsx` | UPDATE — SEO 按语言切换 |
| `src/app/api/products/route.ts` | UPDATE — 读写适配 JSON |

### Task 2: 规格参数值智能判断（P2）

**问题**：当前全部参数值都发送翻译。纯数字/单位值（如"10m""5kg"）不应翻译。

**方案**：在 `autoTranslateAll` 收集 tasks 时，跳过明显不需要翻译的值：
```typescript
// 跳过纯数字+单位组合
if (/^[\d.,\s]+[a-zA-Z]*$/.test(val) && val.length < 20) continue
```

**影响文件**：
| File | Action |
|------|:--:|
| `src/components/admin/ProductForm.tsx` | UPDATE — L160 加判断 |

## Validation
```bash
cd ethan-cms && npx prisma db push && npx next build
```

## Risks
| Risk | Likelihood | Mitigation |
|------|:--:|------|
| SEO JSON 迁移丢失旧数据 | Low | 旧 String→JSON 兼容读写 |
| Prisma JSON 查询复杂化 | Low | 仅表单侧改，API 查询不变 |

## Acceptance
- [ ] SEO 三种语言独立存储和编辑
- [ ] 纯数字/单位参数值不翻译
- [ ] prisma db push + next build 通过
