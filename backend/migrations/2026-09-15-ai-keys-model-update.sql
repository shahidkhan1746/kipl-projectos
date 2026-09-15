-- Update deprecated/retired AI model endpoints in ai_keys to current active versions.
-- Safe to re-run.
UPDATE ai_keys
SET model = 'gemini-3.5-flash', updated_at = now()
WHERE provider = 'gemini' AND (model = 'gemini-3.6-flash' OR model = 'gemini-2.5-flash' OR model IS NULL OR model = '');

UPDATE ai_keys
SET model = 'meta/llama-3.2-11b-vision-instruct', updated_at = now()
WHERE provider = 'nvidia' AND (model = 'meta/llama-3.1-70b-instruct' OR model = 'meta/llama-3.1-8b-instruct' OR model = 'nvidia/nemotron-3-super-120b-a12b' OR model IS NULL OR model = '');
