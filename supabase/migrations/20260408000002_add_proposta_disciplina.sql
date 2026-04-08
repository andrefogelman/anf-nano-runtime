-- Expand disciplina CHECK on ob_project_files to include 'proposta'
ALTER TABLE ob_project_files DROP CONSTRAINT IF EXISTS ob_project_files_disciplina_check;
ALTER TABLE ob_project_files ADD CONSTRAINT ob_project_files_disciplina_check
  CHECK (disciplina IN ('arq', 'est', 'hid', 'ele', 'memorial', 'proposta'));
