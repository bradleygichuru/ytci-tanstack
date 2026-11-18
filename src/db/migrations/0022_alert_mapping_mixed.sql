ALTER TABLE "alerts" DROP CONSTRAINT IF EXISTS "alerts_mapping_method_check";
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_mapping_method_check"
  CHECK (mapping_method IN ('polygon','area_desc','region','mixed','national','manual','unmapped'));
