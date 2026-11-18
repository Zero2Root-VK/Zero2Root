# AI Security Benchmarks

Zero2Root will publish reproducible evaluations instead of unverified “best model” rankings.

## Benchmark principles

- **Task-specific:** compare models only on tasks they are designed to perform.
- **Reproducible:** publish dataset version, prompts, environment, runtime, quantization and scoring rules.
- **Evidence-led:** separate vendor-reported results from independent Zero2Root results.
- **Human-verified:** a model's claim is not proof of a vulnerability.
- **Safe by design:** use owned repositories, intentionally vulnerable labs, synthetic data and instrumented tools.

## Benchmark tracks

| Track | What is measured | Example evidence |
|---|---|---|
| Vulnerability localization | Whether the model identifies files changed by a security fix | File precision, recall and F1 |
| Source-code review | Whether reported issues are real and correctly explained | Verified true positives, false positives, CWE mapping |
| Security Q&A | Factual correctness and source support | Expert-reviewed rubric |
| Threat-intelligence extraction | Extraction of entities, indicators and relationships | Precision, recall and entity-level F1 |
| Prompt-injection resistance | Whether untrusted input causes policy violations or unauthorized tool actions | Attack success rate, benign task success, action logs |
| Report generation | Accuracy, reproducibility and remediation quality | Reviewer rubric and factual error count |

## Score reporting

Every benchmark result must include:

- Model name, exact revision and model-card URL.
- Test date, dataset version and sample count.
- Hardware, runtime, quantization and generation settings.
- Baseline and comparator models.
- Metric definitions and scoring script.
- Confidence interval or uncertainty notes where meaningful.
- Human-review procedure and disagreement handling.

Do not combine unlike metrics into one score without publishing the weighting and rationale. For example, Antares File F1 is not comparable to a chat model's answer-quality score.

## Result labels

| Label | Meaning |
|---|---|
| Vendor-reported | Published by the model developer; not independently reproduced by Zero2Root |
| Independently reproduced | Zero2Root ran the documented evaluation and preserved the test configuration |
| Zero2Root experimental | Internal exploratory test; limited sample or not yet independently validated |
| Not evaluated | No valid benchmark result is available |

## Current status

**No independent Zero2Root benchmark scores have been published yet.** The initial model directory links to official model cards and labels externally reported metrics as such. Scores will appear only after a documented run and review.

## Proposed test protocol

1. Freeze the dataset and model revision.
2. Separate training examples from evaluation examples to reduce leakage.
3. Use safe, intentionally vulnerable repositories and synthetic secrets.
4. Run each test under the same hardware and inference settings where possible.
5. Blind the human reviewers to model identity when practical.
6. Record failures, timeouts and unsupported cases separately; never count them as successful blocks.
7. Publish the scripts, raw aggregate results and limitations.

## Contribute a benchmark

Submit the model revision, task definition, dataset provenance, evaluation script, hardware and raw results through [GitHub Issues](https://github.com/Zero2Root-VK/Zero2Root/issues). Do not submit private client code, secrets or data without explicit authorization.
