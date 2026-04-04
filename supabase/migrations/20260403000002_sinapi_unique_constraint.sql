-- Add unique constraint for SINAPI upsert
ALTER TABLE ob_sinapi_composicoes ADD CONSTRAINT ob_sinapi_composicoes_codigo_uf_data_unique 
  UNIQUE (codigo, uf, data_base);
