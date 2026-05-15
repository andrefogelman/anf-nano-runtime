"""Vision Q&A engine — wrapper sobre gaik VisionExtractor multi-provider.

Sprint 1: leitura de uma planta PDF + pergunta em pt-BR -> RespostaOutput
estruturada com valor numérico, unidade, raciocínio, confiança e observações.

Provider default OpenAI gpt-5 (alternativas: Claude Sonnet 4.6, Gemini 3 Pro).
"""
from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path
from typing import Any

from gaik.software_components.extractor import ExtractionRequirements, FieldSpec
from gaik.software_components.vision_extractor import VisionExtractor

from ..schemas.ask import PerguntaInput, RespostaOutput

_DEFAULT_MODELS: dict[str, str] = {
    "openai": "gpt-5",
    "claude": "claude-sonnet-4-6",
    "google": "gemini-3-pro-preview",
}


def hash_pdf(pdf_bytes: bytes) -> str:
    """SHA-256 do conteúdo binário do PDF — chave principal do ob_vision_cache."""
    return hashlib.sha256(pdf_bytes).hexdigest()


def hash_question(payload: PerguntaInput) -> str:
    """Hash determinístico do conjunto pergunta+variáveis+provider+model+reasoning.

    Variáveis são serializadas como JSON ordenado para idempotência: a mesma
    pergunta com as mesmas variáveis (em qualquer ordem) gera o mesmo hash.
    """
    canonical = json.dumps(
        {
            "pergunta": payload.pergunta.strip().lower(),
            "variaveis": dict(sorted(payload.variaveis.items())),
            "provider": payload.provider,
            "model": payload.model or "default",
            "reasoning_effort": payload.reasoning_effort,
            "include_verification": payload.include_verification,
        },
        sort_keys=True,
        ensure_ascii=False,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _build_requirements() -> ExtractionRequirements:
    # use_case_name precisa ser CURTO — OpenAI Responses API limita
    # text.format.name a 64 chars e gaik adiciona sufixos (~30 chars).
    return ExtractionRequirements(
        use_case_name="qa_planta",
        fields=[
            FieldSpec(
                field_name="valor_numerico",
                field_type="float",
                description="Número principal extraído. null se a planta não tem informação suficiente.",
            ),
            FieldSpec(
                field_name="unidade",
                field_type="str",
                description="Unidade do valor (m, m2, m3, unid, pontos, etc.). null se não aplicável.",
            ),
            FieldSpec(
                field_name="raciocinio",
                field_type="str",
                description="Como chegou no resultado, incluindo contagens, áreas e fórmulas usadas.",
            ),
            FieldSpec(
                field_name="confianca",
                field_type="float",
                description="Autoestimativa de 0.0 a 1.0. Use < 0.5 quando a planta está ambígua.",
            ),
            FieldSpec(
                field_name="observacoes",
                field_type="str",
                description="Ressalvas, suposições e dados que o orçamentista deve revisar.",
            ),
        ],
    )


def _build_user_prompt(payload: PerguntaInput) -> str:
    vars_text = ""
    if payload.variaveis:
        vars_text = "\n\nVariáveis fornecidas:\n" + "\n".join(
            f"- {k}: {v}" for k, v in payload.variaveis.items()
        )
    return (
        "Você é um engenheiro civil orçamentista lendo uma planta brasileira em pt-BR. "
        "Responda APENAS o que foi perguntado. Conte/meça/calcule diretamente no desenho. "
        "Não invente dados que não estão no PDF. "
        "Se a planta não tem informação suficiente, retorne valor_numerico=null e "
        "explique em 'observacoes' o que está faltando.\n\n"
        f"PERGUNTA: {payload.pergunta}{vars_text}\n\n"
        "Retorne valor_numerico, unidade, raciocinio, confianca (0-1), observacoes."
    )


def _default_model(provider: str) -> str:
    return _DEFAULT_MODELS[provider]


def run_vision(pdf_path: Path, payload: PerguntaInput) -> tuple[RespostaOutput, dict[str, Any]]:
    """Roda o vision model contra o PDF. Retorna (resposta_estruturada, metadata).

    Metadata inclui: provider, model, duracao_s, custo_usd, input_tokens, output_tokens.
    """
    model = payload.model or _default_model(payload.provider)
    extractor = VisionExtractor(
        model_provider=payload.provider,
        model=model,
        use_azure=False,
        reasoning_effort=payload.reasoning_effort,
        merge_table=False,
        include_verification=payload.include_verification,
    )

    started = time.perf_counter()
    result = extractor.extract(
        file_paths=[pdf_path],
        user_requirements=_build_user_prompt(payload),
        requirements=_build_requirements(),
    )
    elapsed = round(time.perf_counter() - started, 2)

    resposta = RespostaOutput(**result.data)

    usage = getattr(result, "usage", None)
    cost_usd = float(getattr(usage, "cost_usd", 0.0) or 0.0) if usage else 0.0
    input_tokens = int(getattr(usage, "input_tokens", 0) or 0) if usage else 0
    output_tokens = int(getattr(usage, "output_tokens", 0) or 0) if usage else 0

    return resposta, {
        "provider": payload.provider,
        "model": model,
        "duracao_s": elapsed,
        "custo_usd": cost_usd,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
    }
