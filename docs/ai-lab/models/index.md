# Cybersecurity AI Model Directory

A task-oriented directory of AI models relevant to cybersecurity. Use the official model card as the source of truth for weights, license, architecture, supported tasks and usage conditions.

## Model catalogue

### WhiteRabbitNeo 2.5 — Qwen 2.5 Coder 7B

- **Focus:** offensive and defensive cybersecurity assistance, with a code-oriented base.
- **Architecture:** generative language model fine-tuned from Qwen2.5-Coder-7B.
- **Access:** [Hugging Face model card](https://huggingface.co/WhiteRabbitNeo/WhiteRabbitNeo-2.5-Qwen-2.5-Coder-7B).
- **Runtime:** model card documents Transformers and vLLM usage; quantized variants may be available for compatible local runtimes.
- **License / terms:** the card identifies Apache-2.0 and also publishes an additional WhiteRabbitNeo usage-restrictions notice. Read the complete current terms; do not assume the base license is the only applicable condition.
- **Good for:** security Q&A, code-oriented reasoning and supervised lab exercises.
- **Limitations:** outputs can be inaccurate or unsafe; do not treat generated commands or exploit explanations as verified.

### Cisco Foundation-Sec-8B

- **Focus:** cybersecurity-specialized language tasks.
- **Architecture:** 8-billion-parameter open-weight model.
- **Access:** [Official Hugging Face model card](https://huggingface.co/fdtn-ai/Foundation-Sec-8B) · [Cisco Foundation AI](https://www.cisco.com/site/us/en/solutions/artificial-intelligence/foundation-ai/foundation-models.html).
- **Good for:** security-focused language analysis and experimentation.
- **Deployment:** check the model card for the current format, license, runtime requirements and supported inference paths.
- **Limitations:** task performance must be measured on the intended workload; a cybersecurity fine-tune is not automatically a SOC-ready product.

### Cisco SecureBERT 2.0 Base

- **Focus:** contextual understanding of cybersecurity text and code.
- **Architecture:** ModernBERT-based encoder / masked-language model.
- **Published uses:** masked language modelling, embeddings for semantic search, named-entity recognition, vulnerability detection and code analysis.
- **Access:** [Official model card](https://huggingface.co/cisco-ai/SecureBERT2.0-base).
- **License:** Apache-2.0, as stated on the model card.
- **Good for:** security knowledge-base search, document classification and downstream fine-tuning.
- **Important limitation:** this is not a general-purpose chat model. Use an embedding or classification pipeline suited to the task.

### Cisco Antares-1B

- **Focus:** locating candidate vulnerable files in source-code repositories when given a weakness category.
- **Architecture:** 1-billion-parameter model based on IBM Granite 4.0 1B.
- **Access:** [Official model card](https://huggingface.co/fdtn-ai/antares-1b) · [Cisco technical introduction](https://blogs.cisco.com/ai/introducing-antares-the-most-efficient-open-weight-ai-models-for-vulnerability-localization).
- **License:** Apache-2.0, as stated on the model card.
- **Published evaluation:** VLoc Bench; the model card reports File F1 of 0.209 for Antares-1B. This is a file-localization metric, not a general vulnerability-detection accuracy score.
- **Good for:** prioritizing files for manual source review and helping navigate large repositories.
- **Limitations:** candidate files are leads, not confirmed vulnerabilities. Validate every result manually and alongside static analysis.

### Cisco Antares-350M

- **Focus:** compact vulnerability-localization research.
- **Access:** [Official Hugging Face model card](https://huggingface.co/fdtn-ai/antares-350m) · [Cisco Antares announcement](https://blogs.cisco.com/ai/introducing-antares-the-most-efficient-open-weight-ai-models-for-vulnerability-localization).
- **Good for:** evaluating a smaller task-specific model in repository-analysis workflows.
- **Limitations:** confirm current hardware, license, interface and evaluation details from its model card before use.

## Compare models by task

| If your task is… | Start by evaluating… | Why |
|---|---|---|
| Security-focused conversational assistance | WhiteRabbitNeo; Foundation-Sec-8B | Generative models intended for security-related language tasks |
| Search across threat reports and security notes | SecureBERT 2.0 Base | Encoder model with embedding and semantic-search use cases |
| Find likely vulnerable files in a repository | Antares-1B / Antares-350M | Built specifically for vulnerability localization |
| Build an AI-assisted source-review workflow | Antares + a code-capable assistant + static analysis | Combines localization, explanation and deterministic checks |

## Local deployment checklist

1. Read the model card and license, including any additional usage terms.
2. Confirm the exact parameter count, weight format, quantization and context length.
3. Check the supported runtime (Transformers, vLLM, llama.cpp, Ollama or other). Do not assume compatibility.
4. Estimate RAM/VRAM from the actual quantized artifact, not only the parameter count.
5. Run a small, harmless evaluation set before connecting the model to tools.
6. Keep source repositories read-only and remove credentials, tokens and personal data.
7. Require human approval before any agent executes a command or changes a target.

## Pricing and availability policy

The model weights may be downloadable without a subscription while hosted inference, GPU rental, commercial support or managed agents may cost money. We will publish a price only with a link to the provider's official pricing page and a date checked. No third-party price estimates are presented as vendor prices.

---

*Last editorial review: 17 November 2026. Always check the linked model card for changes.*
