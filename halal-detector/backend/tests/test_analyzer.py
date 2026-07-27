from app.models.schemas import HalalStatus, ScholarSchool
from app.services.analyzer import analyze_ingredient_list, analyze_single_query
from app.services.chat import answer_question
from app.services.ocr import parse_label_text


def test_pork_gelatin_haram():
    result = analyze_ingredient_list("sugar, pork gelatin, water")
    assert result.status == HalalStatus.HARAM
    assert any(i.id in {"gelatin", "pork", "e441"} for i in result.ingredients)


def test_e471_doubtful():
    hit = analyze_single_query("E471", ScholarSchool.GENERAL_SUNNI)
    assert hit is not None
    assert hit.status == HalalStatus.DOUBTFUL


def test_citric_acid_halal():
    result = analyze_ingredient_list("water, sugar, citric acid, soy lecithin")
    assert result.status == HalalStatus.HALAL


def test_strictest_upgrades_some_doubtful():
    result = analyze_ingredient_list("mono diglycerides", school=ScholarSchool.CUSTOM_STRICTEST)
    assert result.status in {HalalStatus.HARAM, HalalStatus.DOUBTFUL}


def test_ocr_highlights():
    parsed = parse_label_text("Ingredients: Water, Sugar, Gelatin, Citric Acid, Natural Flavor")
    marks = {line["text"].lower(): line["mark"] for line in parsed["lines"]}
    assert any("❌" in (v or "") or "⚠️" in (v or "") for v in marks.values())


def test_chat_gelatin():
    resp = answer_question("Why is gelatin haram?")
    assert "gelatin" in resp.answer.lower()
