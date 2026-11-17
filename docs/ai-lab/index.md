# AI Cybersecurity Intelligence

Discover and evaluate AI systems for application security, vulnerability research, offensive-security workflows and security operations.

> **Zero2Root editorial standard:** a model is not labelled “best” because of downloads, marketing claims or parameter count. Every listing distinguishes verified model-card facts, vendor-reported evaluations and Zero2Root test results.

## Explore the AI Lab

| Collection | What you will find |
|---|---|
| [Model directory](models/index.md) | Open-weight and hosted AI models, intended tasks, deployment options and official links |
| [Benchmarks & methodology](benchmarks/index.md) | How Zero2Root will evaluate models and report reproducible results |
| [AI security testing](../ai-security/index.md) | Prompt injection, RAG, agent and tool-use security testing |
| [AI-assisted workflows](../ai-workflows/index.md) | Human-reviewed workflows for authorized VAPT and bug bounty work |

## Availability labels

- **Open weights / local:** downloadable model weights; inference can run on compatible local hardware. Compute, electricity and storage still have costs.
- **Hosted free tier:** a provider offers limited hosted access. Limits and terms can change.
- **Paid hosted/API:** usage is billed by subscription, credits or tokens. The provider's current pricing page must be linked.
- **Research / task-specific:** a model is designed for a narrow task and may not behave like a chat assistant.

A model may have more than one availability path. We record the model license separately from hosting prices. “Open weights” does not automatically mean unrestricted commercial use.

## Initial verified model shortlist

| Model | Best-fit task | Model type | Availability |
|---|---|---|---|
| [WhiteRabbitNeo 2.5 Qwen Coder 7B](https://huggingface.co/WhiteRabbitNeo/WhiteRabbitNeo-2.5-Qwen-2.5-Coder-7B) | Offensive and defensive security assistance; code-oriented security discussion | Generative, 7B-class | Open weights; check model-specific terms |
| [Foundation-Sec-8B](https://huggingface.co/fdtn-ai/Foundation-Sec-8B) | Cybersecurity-focused language tasks | Generative, 8B | Open weights; check model card |
| [SecureBERT 2.0 Base](https://huggingface.co/cisco-ai/SecureBERT2.0-base) | Security text/code embeddings, semantic search, NER and downstream classification | Encoder / masked-language model | Open weights; Apache-2.0 stated on model card |
| [Antares-1B](https://huggingface.co/fdtn-ai/antares-1b) | Repository-level vulnerability localization | Task-specific generative model / agent component | Open weights; Apache-2.0 stated on model card |
| [Antares-350M](https://huggingface.co/fdtn-ai/antares-350m) | Lightweight vulnerability localization research | Task-specific small model | Open weights; verify current model card |

**Important:** these are not interchangeable. SecureBERT is not a chat-based pentesting assistant; Antares localizes candidate files for a vulnerability class and does not prove a vulnerability exists. All model-generated findings require analyst verification.

## Free vs paid: how the directory classifies access

| Access class | What it means | What we display |
|---|---|---|
| Free download / open weights | Model files can be downloaded under the stated license | License, file size, runtime compatibility and hardware notes |
| Free hosted tier | Limited hosted inference without payment | Limits, region, data handling and provider terms |
| Paid hosted/API | Inference requires payment or a paid plan | Official pricing link, billing unit and last-checked date |
| Enterprise / private deployment | Commercial support or dedicated deployment | Vendor contact and published deployment information |

We will not invent prices or label a model “free” merely because its demo is accessible. Paid-provider entries will be added only when an official pricing page and service terms are available.

## Model submission and corrections

Found a new security model, an outdated link or a better official evaluation? Open a [GitHub issue](https://github.com/Zero2Root-VK/Zero2Root/issues) with the model card, license, intended task and evidence. Community submissions are reviewed before appearing in the directory.

---

*Directory status: initial curated seed. Model cards, licenses and hosting terms should be rechecked before deployment or commercial use.*
