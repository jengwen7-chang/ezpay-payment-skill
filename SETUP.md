# SETUP.md

本 skill 可安裝到支援本地知識檔案的 AI coding assistant，例如 Claude Code、OpenClaw、Cursor、GitHub Copilot（搭配 instructions）、以及 OpenAI Custom GPTs。

## Claude Code

```bash
git clone https://github.com/jengwen7-chang/ezpay-payment-skill.git ~/.claude/skills/ezpay
```

## OpenClaw

將 repo 置於專案工作區，並在需要時讀取 `SKILL.md` 作為 ezPay 知識入口。

## Cursor / AGENTS

可在專案 `AGENTS.md` 中加入：

```md
## ezPay API Skill
讀取 `.ezpay-skill/SKILL.md` 作為 ezPay 整合知識入口。
完整指南位於 `.ezpay-skill/guides/`，規格來源位於 `.ezpay-skill/references/`。
```

## GitHub Copilot

若要在其他專案中使用，請將 `.github/copilot-instructions.md` 的內容複製到目標專案的 instructions 中。

## OpenAI GPTs

可將 `SKILL_OPENAI.md` 與核心 guides/references 上傳到 Knowledge。
