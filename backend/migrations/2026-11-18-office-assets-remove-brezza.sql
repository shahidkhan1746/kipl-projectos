-- Takes the Maruti Suzuki Brezza out of the asset register. It was loaded with
-- the opening inventory (2026-11-14b) but is not part of it, so the record and
-- its history are removed rather than marked disposed. Its tag, KIPL-AST-000005
-- on the live register, is not reused.
--
-- Matched by the fixed id the opening inventory gave it, so nothing a person
-- registered is touched. The opening inventory no longer lists it, so it is
-- not added back on the next boot. A no-op once it has run.

DELETE FROM office_asset_events WHERE asset_id = 'a55e7000-0000-4000-8000-000000000004';
DELETE FROM office_assets WHERE id = 'a55e7000-0000-4000-8000-000000000004';
