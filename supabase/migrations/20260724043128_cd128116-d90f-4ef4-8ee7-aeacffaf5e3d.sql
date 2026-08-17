
-- Repoint interaction rules from the doomed Creatine row to the surviving one
UPDATE interaction_rules
SET compound_a_id = '5e542718-b214-417d-8413-9f48fdd89248'
WHERE compound_a_id = '32c399d3-75d3-4a92-a928-ce9074e6a3a9';
UPDATE interaction_rules
SET compound_b_id = '5e542718-b214-417d-8413-9f48fdd89248'
WHERE compound_b_id = '32c399d3-75d3-4a92-a928-ce9074e6a3a9';

-- Free the friendly slug before reassigning it
DELETE FROM compound_content WHERE compound_id = '32c399d3-75d3-4a92-a928-ce9074e6a3a9';
DELETE FROM compounds        WHERE id          = '32c399d3-75d3-4a92-a928-ce9074e6a3a9';
UPDATE compounds SET slug = 'creatine' WHERE id = '5e542718-b214-417d-8413-9f48fdd89248';

-- Collagen dedupe (keep the richer 'collagen' slug row)
DELETE FROM compound_content WHERE compound_id = '686cee31-2d45-4307-8595-c1a914ac124b';
DELETE FROM compounds        WHERE id          = '686cee31-2d45-4307-8595-c1a914ac124b';
