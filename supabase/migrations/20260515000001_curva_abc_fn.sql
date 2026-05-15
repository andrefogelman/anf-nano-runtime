-- Sprint 4 — função RPC pra atualizar curva ABC dos itens de orçamento.
-- Classes: A (até 80% acumulado), B (80-95%), C (95-100%).
-- Lei de Pareto: ~20% dos itens (classe A) compõem ~80% do custo.

CREATE OR REPLACE FUNCTION atualizar_curva_abc(p_project_id uuid)
RETURNS TABLE(updated_count int) LANGUAGE plpgsql AS $$
DECLARE
  total numeric;
  n int;
BEGIN
  SELECT COALESCE(sum(custo_total), 0) INTO total
  FROM ob_orcamento_items
  WHERE project_id = p_project_id AND custo_total > 0;

  IF total IS NULL OR total = 0 THEN
    -- nada a fazer; zera campos pra consistência
    UPDATE ob_orcamento_items
       SET peso_percentual = NULL, curva_abc_classe = NULL
     WHERE project_id = p_project_id;
    GET DIAGNOSTICS n = ROW_COUNT;
    updated_count := n;
    RETURN NEXT;
    RETURN;
  END IF;

  WITH ranked AS (
    SELECT
      id,
      (custo_total / total) * 100 AS peso,
      sum(custo_total) OVER (ORDER BY custo_total DESC, id) / total * 100 AS acc
    FROM ob_orcamento_items
    WHERE project_id = p_project_id AND custo_total > 0
  )
  UPDATE ob_orcamento_items oi
     SET peso_percentual = r.peso,
         curva_abc_classe = CASE
           WHEN r.acc <= 80 THEN 'A'
           WHEN r.acc <= 95 THEN 'B'
           ELSE 'C'
         END,
         updated_at = now()
    FROM ranked r
   WHERE oi.id = r.id;

  GET DIAGNOSTICS n = ROW_COUNT;
  updated_count := n;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION atualizar_curva_abc(uuid) IS
  'Atualiza peso_percentual e curva_abc_classe (A/B/C) dos itens do projeto via Pareto 80/15/5.';
