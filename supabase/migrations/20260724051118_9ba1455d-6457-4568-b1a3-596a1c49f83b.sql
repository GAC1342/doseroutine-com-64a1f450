
-- Linkify NIH ODS fact sheets and peer-reviewed citations in vitamin overview references.
UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'NIH ODS Vitamin D fact sheet (2022)',
  '[NIH ODS Vitamin D fact sheet (2022)](https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/)')
FROM compounds c WHERE c.id=cc.compound_id;

UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'NIH ODS Vitamin B12 fact sheet (2022)',
  '[NIH ODS Vitamin B12 fact sheet (2022)](https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/)')
FROM compounds c WHERE c.id=cc.compound_id;

UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'NIH ODS Folate fact sheet (2022)',
  '[NIH ODS Folate fact sheet (2022)](https://ods.od.nih.gov/factsheets/Folate-HealthProfessional/)')
FROM compounds c WHERE c.id=cc.compound_id;

UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'NIH ODS Vitamin C fact sheet (2021)',
  '[NIH ODS Vitamin C fact sheet (2021)](https://ods.od.nih.gov/factsheets/VitaminC-HealthProfessional/)')
FROM compounds c WHERE c.id=cc.compound_id;

UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'NIH ODS Vitamin E fact sheet (2021)',
  '[NIH ODS Vitamin E fact sheet (2021)](https://ods.od.nih.gov/factsheets/VitaminE-HealthProfessional/)')
FROM compounds c WHERE c.id=cc.compound_id;

UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'NIH ODS Biotin fact sheet (2022)',
  '[NIH ODS Biotin fact sheet (2022)](https://ods.od.nih.gov/factsheets/Biotin-HealthProfessional/)')
FROM compounds c WHERE c.id=cc.compound_id;

UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'NIH ODS Vitamin K fact sheet (2021)',
  '[NIH ODS Vitamin K fact sheet (2021)](https://ods.od.nih.gov/factsheets/VitaminK-HealthProfessional/)')
FROM compounds c WHERE c.id=cc.compound_id;

UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'NIH ODS Thiamin fact sheet (2022)',
  '[NIH ODS Thiamin fact sheet (2022)](https://ods.od.nih.gov/factsheets/Thiamin-HealthProfessional/)')
FROM compounds c WHERE c.id=cc.compound_id;

UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'NIH ODS Riboflavin fact sheet (2022)',
  '[NIH ODS Riboflavin fact sheet (2022)](https://ods.od.nih.gov/factsheets/Riboflavin-HealthProfessional/)')
FROM compounds c WHERE c.id=cc.compound_id;

UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'NIH ODS Niacin fact sheet (2022)',
  '[NIH ODS Niacin fact sheet (2022)](https://ods.od.nih.gov/factsheets/Niacin-HealthProfessional/)')
FROM compounds c WHERE c.id=cc.compound_id;

UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'NIH ODS Pantothenic Acid fact sheet (2021)',
  '[NIH ODS Pantothenic Acid fact sheet (2021)](https://ods.od.nih.gov/factsheets/PantothenicAcid-HealthProfessional/)')
FROM compounds c WHERE c.id=cc.compound_id;

UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'NIH ODS Choline fact sheet (2022)',
  '[NIH ODS Choline fact sheet (2022)](https://ods.od.nih.gov/factsheets/Choline-HealthProfessional/)')
FROM compounds c WHERE c.id=cc.compound_id;

UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'NIH ODS B-vitamin fact sheets (2022)',
  '[NIH ODS B-vitamin fact sheets (2022)](https://ods.od.nih.gov/factsheets/list-all/)')
FROM compounds c WHERE c.id=cc.compound_id;

-- Peer-reviewed citations → PubMed
UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'Owens DJ et al. Vitamin D and the athlete: current perspectives and new challenges. Nutrients. 2018;10(2):220',
  '[Owens DJ et al. Vitamin D and the athlete: current perspectives and new challenges. Nutrients. 2018;10(2):220](https://pubmed.ncbi.nlm.nih.gov/29462973/)')
FROM compounds c WHERE c.id=cc.compound_id;

UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'Owens DJ et al. Vitamin D and the athlete. Nutrients. 2018;10(2):220',
  '[Owens DJ et al. Vitamin D and the athlete. Nutrients. 2018;10(2):220](https://pubmed.ncbi.nlm.nih.gov/29462973/)')
FROM compounds c WHERE c.id=cc.compound_id;

UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'Holick MF et al. Endocrine Society Clinical Practice Guideline. J Clin Endocrinol Metab. 2011;96(7):1911-30',
  '[Holick MF et al. Endocrine Society Clinical Practice Guideline. J Clin Endocrinol Metab. 2011;96(7):1911-30](https://pubmed.ncbi.nlm.nih.gov/21646368/)')
FROM compounds c WHERE c.id=cc.compound_id;

UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'Allen LH. How common is vitamin B-12 deficiency? Am J Clin Nutr. 2009;89(2):693S-6S',
  '[Allen LH. How common is vitamin B-12 deficiency? Am J Clin Nutr. 2009;89(2):693S-6S](https://pubmed.ncbi.nlm.nih.gov/19116323/)')
FROM compounds c WHERE c.id=cc.compound_id;

UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'Andrès E et al. Vitamin B12 (cobalamin) deficiency in elderly patients. CMAJ. 2004;171(3):251-9',
  '[Andrès E et al. Vitamin B12 (cobalamin) deficiency in elderly patients. CMAJ. 2004;171(3):251-9](https://pubmed.ncbi.nlm.nih.gov/15289425/)')
FROM compounds c WHERE c.id=cc.compound_id;

UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'Woolf K, Manore MM. B-vitamins and exercise. Int J Sport Nutr Exerc Metab. 2006;16(5):453-84',
  '[Woolf K, Manore MM. B-vitamins and exercise. Int J Sport Nutr Exerc Metab. 2006;16(5):453-84](https://pubmed.ncbi.nlm.nih.gov/17240780/)')
FROM compounds c WHERE c.id=cc.compound_id;

UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'Paulsen G et al. Vitamin C and E supplementation hampers cellular adaptation to endurance training. J Physiol. 2014;592(8):1887-901',
  '[Paulsen G et al. Vitamin C and E supplementation hampers cellular adaptation to endurance training. J Physiol. 2014;592(8):1887-901](https://pubmed.ncbi.nlm.nih.gov/24492839/)')
FROM compounds c WHERE c.id=cc.compound_id;

UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'Braakhuis AJ. Effect of vitamin C supplements on physical performance. Curr Sports Med Rep. 2012;11(4):180-4',
  '[Braakhuis AJ. Effect of vitamin C supplements on physical performance. Curr Sports Med Rep. 2012;11(4):180-4](https://pubmed.ncbi.nlm.nih.gov/22777329/)')
FROM compounds c WHERE c.id=cc.compound_id;

UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'Maresz K. Proper calcium use: vitamin K2 as a promoter of bone and cardiovascular health. Integr Med (Encinitas). 2015;14(1):34-9',
  '[Maresz K. Proper calcium use: vitamin K2 as a promoter of bone and cardiovascular health. Integr Med (Encinitas). 2015;14(1):34-9](https://pubmed.ncbi.nlm.nih.gov/26770129/)')
FROM compounds c WHERE c.id=cc.compound_id;

UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'Manore MM. Effect of physical activity on thiamine, riboflavin, and vitamin B-6 requirements. Am J Clin Nutr. 2000;72(2 Suppl):598S-606S',
  '[Manore MM. Effect of physical activity on thiamine, riboflavin, and vitamin B-6 requirements. Am J Clin Nutr. 2000;72(2 Suppl):598S-606S](https://pubmed.ncbi.nlm.nih.gov/10919968/)')
FROM compounds c WHERE c.id=cc.compound_id;

UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'Moll S, Varga EA. Homocysteine and MTHFR mutations. Circulation. 2015;132(1):e6-9',
  '[Moll S, Varga EA. Homocysteine and MTHFR mutations. Circulation. 2015;132(1):e6-9](https://pubmed.ncbi.nlm.nih.gov/26149435/)')
FROM compounds c WHERE c.id=cc.compound_id;

UPDATE compound_content cc SET overview_md = replace(cc.overview_md,
  'Corbin KD, Zeisel SH. Choline metabolism''s role in NAFLD. Curr Opin Gastroenterol. 2012;28(2):159-65',
  '[Corbin KD, Zeisel SH. Choline metabolism''s role in NAFLD. Curr Opin Gastroenterol. 2012;28(2):159-65](https://pubmed.ncbi.nlm.nih.gov/22134222/)')
FROM compounds c WHERE c.id=cc.compound_id;
