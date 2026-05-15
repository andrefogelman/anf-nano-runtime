"""SINAPI matcher (Sprint 3).

Pipeline:
  descricao_pt_br
    → embedding 384-dim (OpenAI text-embedding-3-small, dimensions=384)
    → supabase RPC search_sinapi_chunks(query_embedding, threshold, count)
    → LLM rerank (gpt-5-mini, JSON output) com motivo em pt-BR
    → enriquece com preço atualizado de ob_sinapi_composicoes por (codigo, uf, max data_base)

Decisão importante de Sprint 0: usamos OpenAI ao invés de sentence-transformers
porque torch+sentence-transformers explode bundle p/ 5GB no Vercel Lambda
(estoura 500MB ephemeral). text-embedding-3-small com dimensions=384 mantém
schema atual `ob_sinapi_chunks.embedding vector(384)` e custa ~$0.02/1M tokens.

⚠️ Embeddings stored hoje (Sprint 0) foram criados com MiniLM-L6-v2. Espaço
vetorial é INCOMPATÍVEL com OpenAI text-embedding-3-small. É preciso rodar o
endpoint /api/admin/sinapi/reembed antes que /api/sinapi/match retorne resultados
relevantes.
"""
from __future__ import annotations

import json
import logging
import os
import re
from functools import lru_cache
from typing import Any

from openai import OpenAI

from ..lib.supabase import get_supabase

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIM = 384
RERANK_MODEL = "gpt-5-mini"


@lru_cache(maxsize=1)
def _client() -> OpenAI:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY não configurada")
    return OpenAI(api_key=api_key)


def embed_text(text: str) -> list[float]:
    """Embed um único texto. Retorna lista de floats com EMBEDDING_DIM dimensões."""
    response = _client().embeddings.create(
        model=EMBEDDING_MODEL,
        input=text,
        dimensions=EMBEDDING_DIM,
    )
    return response.data[0].embedding


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embeda múltiplos textos em uma única chamada (até 2048 inputs)."""
    if not texts:
        return []
    response = _client().embeddings.create(
        model=EMBEDDING_MODEL,
        input=texts,
        dimensions=EMBEDDING_DIM,
    )
    # OpenAI devolve em ordem; mapeia por index pra garantir
    by_index = {item.index: item.embedding for item in response.data}
    return [by_index[i] for i in range(len(texts))]


def search_sinapi(
    descricao: str,
    *,
    uf: str = "SP",
    top_k: int = 10,
    rerank_k: int = 3,
    match_threshold: float = 0.4,
) -> dict[str, Any]:
    """Busca SINAPI completa: embed → vector search → LLM rerank → enriquece preço.

    Retorna dict com:
      - results: lista de dicts {codigo, titulo, motivo, similarity, preco?}
      - n_candidates: quantos chunks o vector search devolveu
      - n_returned: quantos foram após rerank
    """
    sb = get_supabase()

    query_emb = embed_text(descricao.strip())

    rpc = sb.rpc(
        "search_sinapi_chunks",
        {
            "query_embedding": query_emb,
            "match_threshold": match_threshold,
            "match_count": top_k,
        },
    ).execute()
    chunks: list[dict[str, Any]] = list(rpc.data or [])
    if not chunks:
        return {"results": [], "n_candidates": 0, "n_returned": 0}

    reranked = _llm_rerank(descricao, chunks, rerank_k)

    # Enriquece com preço SINAPI por UF (max data_base)
    for item in reranked:
        codigo = (item.get("codigo") or "").strip()
        if not codigo:
            continue
        try:
            preco_res = (
                sb.table("ob_sinapi_composicoes")
                .select(
                    "codigo, descricao, unidade, custo_com_desoneracao, "
                    "custo_sem_desoneracao, data_base, uf"
                )
                .eq("codigo", codigo)
                .eq("uf", uf)
                .order("data_base", desc=True)
                .limit(1)
                .execute()
            )
            if preco_res.data:
                item["preco"] = preco_res.data[0]
        except Exception:
            logger.exception("falha enriquecendo preço para codigo=%s uf=%s", codigo, uf)

    return {
        "results": reranked,
        "n_candidates": len(chunks),
        "n_returned": len(reranked),
    }


def _llm_rerank(
    descricao: str,
    chunks: list[dict[str, Any]],
    k: int,
) -> list[dict[str, Any]]:
    """Pede pro gpt-5-mini escolher os top-k chunks mais aderentes ao serviço.

    Devolve lista de dicts {codigo, titulo, motivo, similarity}. Códigos SINAPI
    são extraídos do source_title quando o LLM não conseguir achar.
    """
    chunks_text = "\n\n".join(
        f"[{i}] source_title: {c.get('source_title') or ''}\n"
        f"file: {c.get('source_file') or ''}\n"
        f"similarity: {c.get('similarity', 0):.3f}\n"
        f"content: {(c.get('content') or '')[:600]}"
        for i, c in enumerate(chunks)
    )

    prompt = (
        f"Serviço de obra procurado (pt-BR): {descricao}\n\n"
        f"Composições SINAPI candidatas (vector search top-{len(chunks)}):\n"
        f"{chunks_text}\n\n"
        f"Sua tarefa: escolha os {k} chunks MAIS ADERENTES ao serviço procurado. "
        "Para cada escolhido, retorne JSON com:\n"
        '- "index": índice do chunk (inteiro entre 0 e N-1)\n'
        '- "codigo": código SINAPI (5-6 dígitos numéricos) extraído do source_title '
        'ou do content. Se não conseguir extrair, retorne "" e isso fica como '
        "fallback pra busca textual.\n"
        '- "titulo": título descritivo curto em pt-BR (até 120 chars)\n'
        '- "motivo": 1 frase explicando por que essa composição é aderente\n\n'
        f'Formato: {{"results": [{{"index": ..., "codigo": ..., "titulo": ..., "motivo": ...}}]}}'
        " — ordene por relevância decrescente."
    )

    try:
        response = _client().chat.completions.create(
            model=RERANK_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content or "{}"
        parsed = json.loads(raw)
        items: list[dict[str, Any]] = parsed.get("results", [])[:k]
    except Exception:
        logger.exception("rerank LLM falhou — fallback p/ top-k por similarity")
        return [
            {
                "codigo": _extract_codigo(c.get("source_title") or c.get("content", "")),
                "titulo": (c.get("source_title") or "")[:120],
                "motivo": "Selecionado por similaridade vetorial (rerank LLM falhou).",
                "similarity": float(c.get("similarity", 0.0)),
            }
            for c in chunks[:k]
        ]

    enriched: list[dict[str, Any]] = []
    for item in items:
        idx = item.get("index")
        chunk: dict[str, Any] = {}
        if isinstance(idx, int) and 0 <= idx < len(chunks):
            chunk = chunks[idx]
        codigo = (item.get("codigo") or "").strip() or _extract_codigo(
            chunk.get("source_title") or chunk.get("content", "")
        )
        enriched.append(
            {
                "codigo": codigo,
                "titulo": item.get("titulo", "")[:200],
                "motivo": item.get("motivo", ""),
                "similarity": float(chunk.get("similarity", 0.0)),
                "source_title": chunk.get("source_title"),
                "source_file": chunk.get("source_file"),
            }
        )
    return enriched


_CODIGO_RE = re.compile(r"\b(\d{5,6})\b")


def _extract_codigo(text: str) -> str:
    """Extrai um código SINAPI (5 ou 6 dígitos) de uma string. '' se não achar."""
    if not text:
        return ""
    match = _CODIGO_RE.search(text)
    return match.group(1) if match else ""
