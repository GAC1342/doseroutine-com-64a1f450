import { exerciseOptions } from "@/lib/exercise-options";
import { exerciseArt } from "@/lib/exercise-art";
const types = [
  "strength",
  "bodyweight",
  "crossfit",
  "kettlebell",
  "hiit",
  "run",
  "trail_run",
  "bike",
  "spin",
  "row",
  "swim",
  "walk",
  "hike",
  "elliptical",
  "stairs",
  "ski_erg",
  "jump_rope",
  "yoga",
  "pilates",
  "mobility",
  "stretching",
  "breathwork",
  "recovery",
  "martial_arts",
  "boxing",
  "climbing",
  "dance",
  "racquet",
  "team_sport",
  "golf",
  "surf_paddle",
  "sport",
];
for (const t of types) {
  const miss = exerciseOptions(t).filter((n) => !exerciseArt(n));
  if (miss.length) console.log(t, "→", miss.join(", "));
}
