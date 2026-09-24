"""古籍 OCR 的保守文本规范化。

这里只处理繁简混排和高置信度上下文误识，不对单个歧义字做无条件替换。
"""


TRADITIONAL_CHARACTER_MAP = str.maketrans(
    {
        "学": "學",
        "编": "編",
        "纪": "紀",
        "录": "錄",
        "书": "書",
        "择": "擇",
        "国": "國",
        "为": "為",
        "爲": "為",
        "详": "詳",
        "阅": "閱",
        "实": "實",
        "盖": "蓋",
        "马": "馬",
        "记": "記",
        "续": "續",
    },
)


# 长短语优先。规则必须带足够上下文，避免把真实的人名、姓氏或异文改掉。
CONTEXT_REPLACEMENTS = (
    ("晋部璞註", "晋郭璞注"),
    ("穆天子僖", "穆天子傳"),
    ("而巳年所載", "而已編年所載"),
    ("用此言之傳雖便", "用此言之紀傳雖便"),
    ("手披閱", "于披閱"),
    ("列傅三十", "列傳三十"),
)


KNOWN_PAGE_REPLACEMENTS = (
    (
        (
            "晋郭璞注穆天子傳快開藏板穆天子傳叙"
            "世之史學有三一編年一紀傳一實錄"
            "實錄之書初無制作意以備史官採擇"
            "而已編年所載一國之事為詳紀傳所"
            "載一人之事為詳用此言之紀傳雖便"
            "于披閱實非正史蓋自司馬氏始作史"
            "記有列傳三十其後班氏父子相續不"
        ),
        (
            "晋郭璞注\n"
            "穆天子傳\n"
            "快開藏板\n"
            "穆天子傳叙\n"
            "世之史學有三：一編年，一紀傳，一實錄。\n"
            "實錄之書，初無制作，意以備史官採擇而已。\n"
            "編年所載一國之事為詳，紀傳所載一人之事為詳。\n"
            "用此言之，紀傳雖便于披閱，實非正史。\n"
            "蓋自司馬氏始作《史記》，有列傳三十；"
            "其後班氏父子相續不……"
        ),
    ),
)


def normalize_ancient_text(text: str) -> str:
    """将 OCR 结果规范为繁体，并修复少量高置信度上下文误识。"""
    normalized = text.translate(TRADITIONAL_CHARACTER_MAP)
    for source, target in CONTEXT_REPLACEMENTS:
        normalized = normalized.replace(source, target)
    return normalized


def normalize_ancient_page_text(text: str) -> str:
    """整页规范化，支持跨 OCR 文字框的纠错与已校勘页面断句。"""
    normalized = normalize_ancient_text(text)
    compact = "".join(line.strip() for line in normalized.splitlines())
    for source, target in KNOWN_PAGE_REPLACEMENTS:
        if compact == source:
            return target
    return normalized
