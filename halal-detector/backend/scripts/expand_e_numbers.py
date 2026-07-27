#!/usr/bin/env python3
"""Expand the offline DB with common EU additive codes (heuristic defaults)."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PATH = ROOT / "data" / "ingredients.json"

# Common additives with conservative defaults (unknown origin → doubtful).
EXTRA = [
    ("e100", "Curcumin", "colorant", "halal", "Usually plant-derived turmeric color."),
    ("e101", "Riboflavin", "colorant", "halal", "Vitamin B2 color; typically fermentation."),
    ("e140", "Chlorophylls", "colorant", "halal", "Plant leaf pigments."),
    ("e150a", "Plain Caramel", "colorant", "halal", "Caramel color from sugars."),
    ("e160a", "Carotene", "colorant", "halal", "Usually plant or synthetic beta-carotene."),
    ("e160c", "Paprika Extract", "colorant", "halal", "Plant color from peppers."),
    ("e200", "Sorbic Acid", "preservative", "halal", "Common preservative."),
    ("e202", "Potassium Sorbate", "preservative", "halal", "Common preservative salt."),
    ("e211", "Sodium Benzoate", "preservative", "halal", "Common preservative."),
    ("e221", "Sodium Sulfite", "preservative", "halal", "Preservative / antioxidant."),
    ("e250", "Sodium Nitrite", "preservative", "doubtful", "Used in cured meats — verify meat source."),
    ("e252", "Potassium Nitrate", "preservative", "doubtful", "Used in cured meats — verify meat source."),
    ("e270", "Lactic Acid", "acidulant", "halal", "Usually fermentation-derived."),
    ("e296", "Malic Acid", "acidulant", "halal", "Fruit acid / synthetic."),
    ("e300", "Ascorbic Acid", "antioxidant", "halal", "Vitamin C."),
    ("e306", "Tocopherols", "antioxidant", "halal", "Vitamin E; usually plant."),
    ("e322", "Lecithins", "emulsifier", "halal", "Often soy/sunflower; egg possible."),
    ("e330", "Citric Acid", "acidulant", "halal", "Usually fermentation."),
    ("e407", "Carrageenan", "gelling_agent", "halal", "Seaweed extract."),
    ("e410", "Locust Bean Gum", "thickener", "halal", "Plant gum."),
    ("e412", "Guar Gum", "thickener", "halal", "Plant gum."),
    ("e415", "Xanthan Gum", "thickener", "halal", "Fermentation gum."),
    ("e420", "Sorbitol", "sweetener", "halal", "Sugar alcohol; usually plant."),
    ("e421", "Mannitol", "sweetener", "halal", "Sugar alcohol."),
    ("e422", "Glycerol", "humectant", "doubtful", "May be plant or animal."),
    ("e430", "Polyoxyethylene Stearate", "emulsifier", "doubtful", "Fatty acid origin may vary."),
    ("e432", "Polysorbate 20", "emulsifier", "doubtful", "Fatty acid origin may vary."),
    ("e433", "Polysorbate 80", "emulsifier", "doubtful", "Fatty acid origin may vary."),
    ("e435", "Polysorbate 60", "emulsifier", "doubtful", "Fatty acid origin may vary."),
    ("e440", "Pectins", "gelling_agent", "halal", "Fruit fiber gel."),
    ("e441", "Gelatin", "gelling_agent", "doubtful", "Animal collagen gel — source critical."),
    ("e442", "Ammonium Phosphatides", "emulsifier", "doubtful", "May involve animal fats."),
    ("e450", "Diphosphates", "stabilizer", "halal", "Mineral phosphate salts."),
    ("e460", "Cellulose", "bulking_agent", "halal", "Plant fiber."),
    ("e471", "Mono- and Diglycerides of Fatty Acids", "emulsifier", "doubtful", "Plant or animal fat origin."),
    ("e472a", "Acetic Acid Esters of Mono- and Diglycerides", "emulsifier", "doubtful", "Fat origin may vary."),
    ("e472b", "Lactic Acid Esters of Mono- and Diglycerides", "emulsifier", "doubtful", "Fat origin may vary."),
    ("e472c", "Citric Acid Esters of Mono- and Diglycerides", "emulsifier", "doubtful", "Fat origin may vary."),
    ("e472e", "DATEM", "emulsifier", "doubtful", "Fat origin may vary."),
    ("e473", "Sucrose Esters of Fatty Acids", "emulsifier", "doubtful", "Fat origin may vary."),
    ("e475", "Polyglycerol Esters of Fatty Acids", "emulsifier", "doubtful", "Fat origin may vary."),
    ("e476", "Polyglycerol Polyricinoleate", "emulsifier", "doubtful", "Often castor oil — verify."),
    ("e481", "Sodium Stearoyl Lactylate", "emulsifier", "doubtful", "Stearic acid may be plant/animal."),
    ("e482", "Calcium Stearoyl Lactylate", "emulsifier", "doubtful", "Stearic acid may be plant/animal."),
    ("e491", "Sorbitan Monostearate", "emulsifier", "doubtful", "Stearate origin may vary."),
    ("e500", "Sodium Carbonates", "acidity_regulator", "halal", "Mineral salts."),
    ("e501", "Potassium Carbonates", "acidity_regulator", "halal", "Mineral salts."),
    ("e503", "Ammonium Carbonates", "acidity_regulator", "halal", "Mineral salts."),
    ("e620", "Glutamic Acid", "flavor_enhancer", "doubtful", "May be plant/microbial/animal process."),
    ("e621", "Monosodium Glutamate", "flavor_enhancer", "halal", "Usually fermentation; widely accepted."),
    ("e627", "Disodium Guanylate", "flavor_enhancer", "doubtful", "May be meat or microbial."),
    ("e631", "Disodium Inosinate", "flavor_enhancer", "doubtful", "May be meat or microbial."),
    ("e635", "Disodium 5'-Ribonucleotides", "flavor_enhancer", "doubtful", "May be meat or microbial."),
    ("e901", "Beeswax", "glazing_agent", "doubtful", "Insect secretion — opinions differ."),
    ("e903", "Carnauba Wax", "glazing_agent", "halal", "Plant wax."),
    ("e904", "Shellac", "glazing_agent", "doubtful", "Lac insect resin — opinions differ."),
    ("e920", "L-Cysteine", "dough_conditioner", "doubtful", "May be human hair, feathers, or fermentation."),
    ("e950", "Acesulfame K", "sweetener", "halal", "Synthetic sweetener."),
    ("e951", "Aspartame", "sweetener", "halal", "Synthetic sweetener."),
    ("e955", "Sucralose", "sweetener", "halal", "Synthetic sweetener."),
    ("e960", "Steviol Glycosides", "sweetener", "halal", "Stevia plant sweetener."),
    ("e965", "Maltitol", "sweetener", "halal", "Sugar alcohol."),
    ("e967", "Xylitol", "sweetener", "halal", "Sugar alcohol."),
]


def main() -> None:
    data = json.loads(PATH.read_text(encoding="utf-8"))
    existing = {i["id"] for i in data["ingredients"]}
    existing_e = {((i.get("e_number") or "").lower()) for i in data["ingredients"]}
    added = 0
    for code, name, category, status, definition in EXTRA:
        if code in existing or code.upper() in existing_e or code in existing_e:
            continue
        # skip if e_number already present
        if any((i.get("e_number") or "").lower() == code for i in data["ingredients"]):
            continue
        differs = status == "doubtful"
        data["ingredients"].append(
            {
                "id": code,
                "name": name,
                "aliases": [code.upper(), code, name.lower()],
                "e_number": code.upper().replace("E", "E"),
                "category": category,
                "default_status": status,
                "definition": definition,
                "scientific": definition,
                "found_in": ["Processed foods"],
                "reason_templates": {
                    "haram": f"{name} confirmed from an impermissible source.",
                    "doubtful": f"{name} ({code.upper()}) may require source verification.",
                    "halal": f"{name} is generally accepted as halal in standard food use.",
                },
                "scholarly_notes": {
                    "general_sunni": definition
                    + (" Source verification recommended." if differs else ""),
                    "hanafi": "Follow source verification when origin can vary.",
                    "shafii": "Follow source verification when origin can vary.",
                    "maliki": "Follow source verification when origin can vary.",
                    "hanbali": "Follow source verification when origin can vary.",
                    "custom_strictest": "Avoid if origin is unspecified."
                    if differs
                    else "Acceptable.",
                },
                "differs_by_school": differs,
                "color_blind_token": "amber" if status == "doubtful" else "green" if status == "halal" else "red",
            }
        )
        # normalize e_number display
        data["ingredients"][-1]["e_number"] = "E" + code[1:].upper() if code.startswith("e") else code.upper()
        added += 1

    # Add common alcohol derivative aliases as separate searchable rows if missing
    alcohols = [
        ("ethanol", "Ethanol", "solvent", "haram"),
        ("isopropyl_alcohol", "Isopropyl Alcohol", "solvent", "doubtful"),
        ("cetyl_alcohol", "Cetyl Alcohol", "cosmetic_emollient", "doubtful"),
        ("stearyl_alcohol", "Stearyl Alcohol", "cosmetic_emollient", "doubtful"),
        ("benzyl_alcohol", "Benzyl Alcohol", "preservative", "doubtful"),
        ("fatty_alcohol", "Fatty Alcohol", "cosmetic_emollient", "doubtful"),
    ]
    for iid, name, category, status in alcohols:
        if iid in existing:
            continue
        differs = status != "halal"
        data["ingredients"].append(
            {
                "id": iid,
                "name": name,
                "aliases": [name.lower()],
                "e_number": None,
                "category": category,
                "default_status": status,
                "definition": f"{name} appears on some food/cosmetic labels. Status depends on type and use.",
                "scientific": f"{name} is an alcohol-class ingredient; consumable ethanol is distinct from many fatty alcohols used externally.",
                "found_in": ["Cosmetics", "Medicines", "Some foods"],
                "reason_templates": {
                    "haram": f"Contains consumable intoxicating alcohol ({name}).",
                    "doubtful": f"{name} needs context (food vs cosmetic, remaining amount, source).",
                    "halal": f"{name} assessed as acceptable in this context.",
                },
                "scholarly_notes": {
                    "general_sunni": "Distinguish ethanol for drinking from fatty alcohols in cosmetics; opinions vary on residues.",
                    "hanafi": "Context matters; ask a scholar for edge cases.",
                    "shafii": "Context matters; ask a scholar for edge cases.",
                    "maliki": "Context matters; ask a scholar for edge cases.",
                    "hanbali": "Context matters; ask a scholar for edge cases.",
                    "custom_strictest": "Avoid ambiguous alcohol listings when possible.",
                },
                "differs_by_school": differs,
                "color_blind_token": "red" if status == "haram" else "amber",
            }
        )
        added += 1

    PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Added {added} entries. Total ingredients: {len(data['ingredients'])}")


if __name__ == "__main__":
    main()
