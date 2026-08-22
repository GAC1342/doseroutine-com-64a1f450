CREATE TABLE public.foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_norm text NOT NULL,
  brand text,
  source text NOT NULL DEFAULT 'curated',
  external_id text,
  kcal_100g numeric NOT NULL DEFAULT 0,
  protein_100g numeric NOT NULL DEFAULT 0,
  carbs_100g numeric NOT NULL DEFAULT 0,
  fat_100g numeric NOT NULL DEFAULT 0,
  default_portion_g numeric NOT NULL DEFAULT 100,
  quality_score smallint NOT NULL DEFAULT 50,
  verified boolean NOT NULL DEFAULT false,
  times_logged integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX foods_source_external_idx ON public.foods (source, external_id) WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX foods_name_norm_source_idx ON public.foods (name_norm, source);
CREATE INDEX foods_name_norm_idx ON public.foods (name_norm);

CREATE TABLE public.food_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id uuid NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
  alias text NOT NULL,
  alias_norm text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX food_aliases_norm_idx ON public.food_aliases (alias_norm, food_id);
CREATE INDEX food_aliases_lookup_idx ON public.food_aliases (alias_norm);

CREATE TABLE public.food_portions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id uuid NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
  label text NOT NULL,
  grams numeric NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  reference_hint text,
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX food_portions_unique_idx ON public.food_portions (food_id, label);

CREATE TABLE public.meal_scan_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_id uuid,
  scan_id text,
  item_name text NOT NULL,
  item_name_norm text NOT NULL,
  food_id uuid REFERENCES public.foods(id) ON DELETE SET NULL,
  read_from text,
  resolved_source text,
  ai_portion text,
  user_portion text,
  ai_grams numeric,
  user_grams numeric,
  ai_calories numeric NOT NULL DEFAULT 0,
  ai_protein_g numeric NOT NULL DEFAULT 0,
  ai_carbs_g numeric NOT NULL DEFAULT 0,
  ai_fat_g numeric NOT NULL DEFAULT 0,
  user_calories numeric NOT NULL DEFAULT 0,
  user_protein_g numeric NOT NULL DEFAULT 0,
  user_carbs_g numeric NOT NULL DEFAULT 0,
  user_fat_g numeric NOT NULL DEFAULT 0,
  calorie_drift_pct numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX meal_scan_corrections_user_idx ON public.meal_scan_corrections (user_id, created_at DESC);
CREATE INDEX meal_scan_corrections_name_idx ON public.meal_scan_corrections (item_name_norm);

GRANT SELECT ON public.foods TO anon, authenticated;
GRANT SELECT ON public.food_aliases TO anon, authenticated;
GRANT SELECT ON public.food_portions TO anon, authenticated;
GRANT ALL ON public.foods TO service_role;
GRANT ALL ON public.food_aliases TO service_role;
GRANT ALL ON public.food_portions TO service_role;
GRANT SELECT, INSERT ON public.meal_scan_corrections TO authenticated;
GRANT ALL ON public.meal_scan_corrections TO service_role;

ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_portions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_scan_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Food catalog is readable by everyone" ON public.foods FOR SELECT USING (true);
CREATE POLICY "Food aliases are readable by everyone" ON public.food_aliases FOR SELECT USING (true);
CREATE POLICY "Food portions are readable by everyone" ON public.food_portions FOR SELECT USING (true);

CREATE POLICY "Users insert their own scan corrections" ON public.meal_scan_corrections
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read their own scan corrections" ON public.meal_scan_corrections
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

CREATE TRIGGER foods_set_updated_at BEFORE UPDATE ON public.foods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.foods (name, name_norm, source, kcal_100g, protein_100g, carbs_100g, fat_100g, default_portion_g, quality_score, verified) VALUES
('Chicken breast, cooked','chicken breast, cooked','curated',165,31,0,3.6,100,95,true),
('Chicken thigh, cooked','chicken thigh, cooked','curated',209,26,0,10.9,100,95,true),
('Chicken wings, cooked','chicken wings, cooked','curated',290,27,0,20,90,90,true),
('Ground beef 85/15, cooked','ground beef 85/15, cooked','curated',250,26,0,15,113,95,true),
('Ribeye steak, cooked','ribeye steak, cooked','curated',291,24,0,21,170,90,true),
('Sirloin steak, cooked','sirloin steak, cooked','curated',206,30,0,9,170,90,true),
('Salmon, cooked','salmon, cooked','curated',208,22,0,13,113,95,true),
('Tuna, canned in water','tuna, canned in water','curated',116,26,0,1,142,95,true),
('Shrimp, cooked','shrimp, cooked','curated',99,24,0.2,0.3,100,95,true),
('Cod, cooked','cod, cooked','curated',105,23,0,0.9,113,95,true),
('Pork chop, cooked','pork chop, cooked','curated',231,26,0,13,130,90,true),
('Bacon, cooked','bacon, cooked','curated',541,37,1.4,42,16,90,true),
('Turkey breast, cooked','turkey breast, cooked','curated',135,30,0,1,100,95,true),
('Egg, whole','egg, whole','curated',143,12.6,0.7,9.5,50,95,true),
('Egg white','egg white','curated',52,11,0.7,0.2,33,95,true),
('Whole milk','whole milk','curated',61,3.2,4.8,3.3,244,95,true),
('Skim milk','skim milk','curated',34,3.4,5,0.2,244,95,true),
('Greek yogurt, plain nonfat','greek yogurt, plain nonfat','curated',59,10,3.6,0.4,170,95,true),
('Cottage cheese, 2%','cottage cheese, 2%','curated',84,11,4.3,2.3,113,95,true),
('Cheddar cheese','cheddar cheese','curated',403,25,1.3,33,28,95,true),
('Mozzarella cheese','mozzarella cheese','curated',300,22,2.2,22,28,95,true),
('Butter','butter','curated',717,0.9,0.1,81,14,95,true),
('Olive oil','olive oil','curated',884,0,0,100,14,95,true),
('White rice, cooked','white rice, cooked','curated',130,2.7,28,0.3,158,95,true),
('Brown rice, cooked','brown rice, cooked','curated',123,2.7,26,1,195,95,true),
('Pasta, cooked','pasta, cooked','curated',158,5.8,31,0.9,140,95,true),
('White bread','white bread','curated',266,9,49,3.2,28,95,true),
('Whole wheat bread','whole wheat bread','curated',247,13,41,3.4,28,95,true),
('Oats, dry','oats, dry','curated',379,13,67,7,40,95,true),
('Quinoa, cooked','quinoa, cooked','curated',120,4.4,21,1.9,185,95,true),
('Potato, baked','potato, baked','curated',93,2.5,21,0.1,173,95,true),
('Sweet potato, baked','sweet potato, baked','curated',90,2,21,0.1,150,95,true),
('Flour tortilla','flour tortilla','curated',306,8,51,7,45,90,true),
('Bagel','bagel','curated',250,10,48,1.5,98,90,true),
('Banana','banana','curated',89,1.1,23,0.3,118,95,true),
('Apple','apple','curated',52,0.3,14,0.2,182,95,true),
('Orange','orange','curated',47,0.9,12,0.1,131,95,true),
('Blueberries','blueberries','curated',57,0.7,14,0.3,148,95,true),
('Strawberries','strawberries','curated',32,0.7,7.7,0.3,152,95,true),
('Avocado','avocado','curated',160,2,8.5,15,68,95,true),
('Broccoli, cooked','broccoli, cooked','curated',35,2.4,7.2,0.4,156,95,true),
('Spinach, raw','spinach, raw','curated',23,2.9,3.6,0.4,30,95,true),
('Mixed salad greens','mixed salad greens','curated',17,1.4,2.9,0.2,85,90,true),
('Carrot','carrot','curated',41,0.9,10,0.2,61,95,true),
('Tomato','tomato','curated',18,0.9,3.9,0.2,123,95,true),
('Onion','onion','curated',40,1.1,9.3,0.1,110,95,true),
('Corn, cooked','corn, cooked','curated',96,3.4,21,1.5,164,95,true),
('Black beans, cooked','black beans, cooked','curated',132,8.9,24,0.5,172,95,true),
('Chickpeas, cooked','chickpeas, cooked','curated',164,8.9,27,2.6,164,95,true),
('Lentils, cooked','lentils, cooked','curated',116,9,20,0.4,198,95,true),
('Tofu, firm','tofu, firm','curated',144,17,2.8,9,126,95,true),
('Almonds','almonds','curated',579,21,22,50,28,95,true),
('Peanut butter','peanut butter','curated',588,25,20,50,32,95,true),
('Walnuts','walnuts','curated',654,15,14,65,28,95,true),
('Whey protein powder','whey protein powder','curated',400,80,8,6,30,85,true),
('Protein bar','protein bar','curated',380,25,40,12,60,70,true),
('Cheeseburger','cheeseburger','curated',250,13,20,13,150,75,true),
('Cheese pizza','cheese pizza','curated',266,11,33,10,107,80,true),
('French fries','french fries','curated',312,3.4,41,15,117,80,true),
('Caesar salad with chicken','caesar salad with chicken','curated',130,9,4,8,250,70,true),
('California sushi roll','california sushi roll','curated',130,4,26,1,170,75,true),
('Chicken burrito','chicken burrito','curated',180,10,22,6,300,70,true),
('Pad thai','pad thai','curated',160,7,21,5,300,70,true),
('Fried rice','fried rice','curated',163,5,21,6,200,75,true),
('Mac and cheese','mac and cheese','curated',164,6.7,20,6.6,200,80,true),
('Pancakes','pancakes','curated',227,6.4,28,9.7,77,85,true),
('Corn flakes cereal','corn flakes cereal','curated',357,7,84,0.4,28,90,true),
('Orange juice','orange juice','curated',45,0.7,10,0.2,248,95,true),
('Cola','cola','curated',41,0,10.6,0,355,95,true),
('Beer','beer','curated',43,0.5,3.6,0,355,90,true),
('Red wine','red wine','curated',85,0.1,2.6,0,147,90,true),
('Black coffee','black coffee','curated',1,0.1,0,0,240,95,true),
('Vanilla ice cream','vanilla ice cream','curated',207,3.5,24,11,66,90,true),
('Milk chocolate','milk chocolate','curated',535,7.6,59,30,28,90,true),
('Honey','honey','curated',304,0.3,82,0,21,95,true),
('Ketchup','ketchup','curated',101,1,25,0.1,17,95,true),
('Mayonnaise','mayonnaise','curated',680,1,0.6,75,14,95,true),
('Ranch dressing','ranch dressing','curated',430,1,6,45,30,90,true),
('Hummus','hummus','curated',166,7.9,14,9.6,30,90,true),
('Granola','granola','curated',471,10,64,20,61,85,true);

INSERT INTO public.food_aliases (food_id, alias, alias_norm)
SELECT f.id, v.alias, lower(v.alias) FROM (VALUES
  ('chicken breast, cooked','grilled chicken'),
  ('chicken breast, cooked','chicken'),
  ('chicken breast, cooked','chicken breast'),
  ('ground beef 85/15, cooked','ground beef'),
  ('ground beef 85/15, cooked','hamburger meat'),
  ('salmon, cooked','grilled salmon'),
  ('salmon, cooked','salmon fillet'),
  ('egg, whole','eggs'),
  ('egg, whole','scrambled eggs'),
  ('egg, whole','fried egg'),
  ('white rice, cooked','rice'),
  ('white rice, cooked','steamed rice'),
  ('brown rice, cooked','brown rice'),
  ('pasta, cooked','spaghetti'),
  ('pasta, cooked','noodles'),
  ('white bread','bread'),
  ('white bread','toast'),
  ('oats, dry','oatmeal'),
  ('oats, dry','porridge'),
  ('potato, baked','potato'),
  ('sweet potato, baked','sweet potato'),
  ('greek yogurt, plain nonfat','greek yogurt'),
  ('greek yogurt, plain nonfat','yogurt'),
  ('cheddar cheese','cheese'),
  ('french fries','fries'),
  ('cheese pizza','pizza'),
  ('mixed salad greens','salad'),
  ('mixed salad greens','side salad'),
  ('whey protein powder','protein shake'),
  ('whey protein powder','protein powder'),
  ('black coffee','coffee'),
  ('cola','soda'),
  ('cola','soft drink'),
  ('turkey breast, cooked','turkey'),
  ('shrimp, cooked','prawns'),
  ('tofu, firm','tofu'),
  ('flour tortilla','tortilla'),
  ('chicken burrito','burrito')
) AS v(food_norm, alias)
JOIN public.foods f ON f.name_norm = v.food_norm AND f.source = 'curated';

INSERT INTO public.food_portions (food_id, label, grams, is_default, reference_hint, sort_order)
SELECT f.id, v.label, v.grams, v.is_default, v.hint, v.sort_order FROM (VALUES
  ('chicken breast, cooked','1 palm (100 g)',100::numeric,true,'A palm-sized piece, deck-of-cards thick',1),
  ('chicken breast, cooked','1 small breast (140 g)',140::numeric,false,NULL,2),
  ('chicken breast, cooked','1 large breast (200 g)',200::numeric,false,NULL,3),
  ('chicken breast, cooked','3 oz (85 g)',85::numeric,false,'Deck of cards',4),
  ('chicken thigh, cooked','1 thigh (95 g)',95::numeric,true,NULL,1),
  ('chicken wings, cooked','1 wing (30 g)',30::numeric,true,NULL,1),
  ('chicken wings, cooked','6 wings (180 g)',180::numeric,false,NULL,2),
  ('ground beef 85/15, cooked','1 patty (113 g)',113::numeric,true,'Palm-sized patty',1),
  ('salmon, cooked','1 fillet (113 g)',113::numeric,true,'Checkbook-sized fillet',1),
  ('tuna, canned in water','1 can, drained (142 g)',142::numeric,true,NULL,1),
  ('shrimp, cooked','6 medium shrimp (60 g)',60::numeric,true,NULL,1),
  ('bacon, cooked','1 slice (16 g)',16::numeric,true,NULL,1),
  ('bacon, cooked','3 slices (48 g)',48::numeric,false,NULL,2),
  ('egg, whole','1 large egg (50 g)',50::numeric,true,NULL,1),
  ('egg, whole','2 large eggs (100 g)',100::numeric,false,NULL,2),
  ('egg, whole','3 large eggs (150 g)',150::numeric,false,NULL,3),
  ('egg white','1 egg white (33 g)',33::numeric,true,NULL,1),
  ('whole milk','1 cup (244 g)',244::numeric,true,'A standard drinking glass',1),
  ('skim milk','1 cup (244 g)',244::numeric,true,NULL,1),
  ('greek yogurt, plain nonfat','1 single-serve pot (170 g)',170::numeric,true,NULL,1),
  ('greek yogurt, plain nonfat','1 cup (245 g)',245::numeric,false,NULL,2),
  ('cottage cheese, 2%','1/2 cup (113 g)',113::numeric,true,NULL,1),
  ('cheddar cheese','1 slice (28 g)',28::numeric,true,'Two thumbs',1),
  ('cheddar cheese','1 cup shredded (113 g)',113::numeric,false,NULL,2),
  ('mozzarella cheese','1 oz (28 g)',28::numeric,true,NULL,1),
  ('butter','1 tbsp (14 g)',14::numeric,true,'Thumb tip',1),
  ('olive oil','1 tbsp (14 g)',14::numeric,true,'Thumb tip',1),
  ('olive oil','1 tsp (5 g)',5::numeric,false,NULL,2),
  ('white rice, cooked','1 cup (158 g)',158::numeric,true,'One cupped hand',1),
  ('white rice, cooked','1/2 cup (79 g)',79::numeric,false,NULL,2),
  ('brown rice, cooked','1 cup (195 g)',195::numeric,true,'One cupped hand',1),
  ('pasta, cooked','1 cup (140 g)',140::numeric,true,'One fist',1),
  ('pasta, cooked','2 cups (280 g)',280::numeric,false,NULL,2),
  ('white bread','1 slice (28 g)',28::numeric,true,NULL,1),
  ('whole wheat bread','1 slice (28 g)',28::numeric,true,NULL,1),
  ('oats, dry','1/2 cup dry (40 g)',40::numeric,true,NULL,1),
  ('quinoa, cooked','1 cup (185 g)',185::numeric,true,NULL,1),
  ('potato, baked','1 medium (173 g)',173::numeric,true,'Computer mouse',1),
  ('sweet potato, baked','1 medium (150 g)',150::numeric,true,NULL,1),
  ('flour tortilla','1 medium (45 g)',45::numeric,true,NULL,1),
  ('bagel','1 medium (98 g)',98::numeric,true,'Hockey puck',1),
  ('banana','1 medium (118 g)',118::numeric,true,NULL,1),
  ('apple','1 medium (182 g)',182::numeric,true,'Baseball',1),
  ('orange','1 medium (131 g)',131::numeric,true,'Tennis ball',1),
  ('blueberries','1 cup (148 g)',148::numeric,true,NULL,1),
  ('strawberries','1 cup (152 g)',152::numeric,true,NULL,1),
  ('avocado','1/2 avocado (68 g)',68::numeric,true,NULL,1),
  ('broccoli, cooked','1 cup (156 g)',156::numeric,true,'One fist',1),
  ('spinach, raw','1 cup (30 g)',30::numeric,true,'Two loose handfuls',1),
  ('mixed salad greens','1 side salad (85 g)',85::numeric,true,NULL,1),
  ('carrot','1 medium (61 g)',61::numeric,true,NULL,1),
  ('tomato','1 medium (123 g)',123::numeric,true,NULL,1),
  ('corn, cooked','1 cup (164 g)',164::numeric,true,NULL,1),
  ('black beans, cooked','1 cup (172 g)',172::numeric,true,'One cupped hand',1),
  ('chickpeas, cooked','1 cup (164 g)',164::numeric,true,NULL,1),
  ('lentils, cooked','1 cup (198 g)',198::numeric,true,NULL,1),
  ('tofu, firm','1/2 block (126 g)',126::numeric,true,NULL,1),
  ('almonds','1 oz, ~23 nuts (28 g)',28::numeric,true,'One small handful',1),
  ('peanut butter','2 tbsp (32 g)',32::numeric,true,'Golf ball',1),
  ('peanut butter','1 tbsp (16 g)',16::numeric,false,'Thumb',2),
  ('walnuts','1 oz (28 g)',28::numeric,true,'One small handful',1),
  ('whey protein powder','1 scoop (30 g)',30::numeric,true,NULL,1),
  ('protein bar','1 bar (60 g)',60::numeric,true,NULL,1),
  ('cheeseburger','1 burger (150 g)',150::numeric,true,NULL,1),
  ('cheese pizza','1 slice (107 g)',107::numeric,true,'One hand span',1),
  ('cheese pizza','2 slices (214 g)',214::numeric,false,NULL,2),
  ('french fries','1 medium serving (117 g)',117::numeric,true,NULL,1),
  ('caesar salad with chicken','1 bowl (250 g)',250::numeric,true,NULL,1),
  ('california sushi roll','1 roll, 8 pieces (170 g)',170::numeric,true,NULL,1),
  ('chicken burrito','1 burrito (300 g)',300::numeric,true,'Rolled newspaper',1),
  ('pad thai','1 plate (300 g)',300::numeric,true,NULL,1),
  ('fried rice','1 cup (200 g)',200::numeric,true,NULL,1),
  ('mac and cheese','1 cup (200 g)',200::numeric,true,NULL,1),
  ('pancakes','1 pancake (77 g)',77::numeric,true,NULL,1),
  ('pancakes','3 pancakes (231 g)',231::numeric,false,NULL,2),
  ('corn flakes cereal','1 cup (28 g)',28::numeric,true,NULL,1),
  ('orange juice','1 cup (248 g)',248::numeric,true,NULL,1),
  ('cola','1 can (355 g)',355::numeric,true,NULL,1),
  ('beer','1 can (355 g)',355::numeric,true,NULL,1),
  ('red wine','1 glass (147 g)',147::numeric,true,NULL,1),
  ('black coffee','1 cup (240 g)',240::numeric,true,NULL,1),
  ('vanilla ice cream','1/2 cup (66 g)',66::numeric,true,'Tennis ball',1),
  ('milk chocolate','1 oz (28 g)',28::numeric,true,NULL,1),
  ('honey','1 tbsp (21 g)',21::numeric,true,NULL,1),
  ('ketchup','1 tbsp (17 g)',17::numeric,true,NULL,1),
  ('mayonnaise','1 tbsp (14 g)',14::numeric,true,NULL,1),
  ('ranch dressing','2 tbsp (30 g)',30::numeric,true,'Golf ball',1),
  ('hummus','2 tbsp (30 g)',30::numeric,true,NULL,1),
  ('granola','1/2 cup (61 g)',61::numeric,true,NULL,1),
  ('ribeye steak, cooked','1 steak (170 g)',170::numeric,true,'Two decks of cards',1),
  ('sirloin steak, cooked','1 steak (170 g)',170::numeric,true,NULL,1),
  ('pork chop, cooked','1 chop (130 g)',130::numeric,true,NULL,1),
  ('turkey breast, cooked','3 oz (85 g)',85::numeric,true,'Deck of cards',1),
  ('cod, cooked','1 fillet (113 g)',113::numeric,true,NULL,1),
  ('onion','1/2 medium (55 g)',55::numeric,true,NULL,1)
) AS v(food_norm, label, grams, is_default, hint, sort_order)
JOIN public.foods f ON f.name_norm = v.food_norm AND f.source = 'curated';