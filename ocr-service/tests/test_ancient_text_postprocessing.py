import unittest

from app.ancient_text_postprocessing import (
    normalize_ancient_page_text,
    normalize_ancient_text,
)


class AncientTextPostprocessingTests(unittest.TestCase):
    def test_normalizes_mixed_glyphs_and_known_ancient_book_confusions(self) -> None:
        recognized = (
            "晋部璞註\n"
            "穆天子僖\n"
            "快開藏板\n"
            "穆天子傳叙\n"
            "世之史学有三一编年一纪傳一實錄\n"
            "實錄之書初無制作意以備史官採擇\n"
            "而巳年所載一國之事爲詳紀傳所\n"
            "載一人之事爲詳用此言之傳雖便\n"
            "手披阅實非正史盖自司馬氏始作史\n"
            "記有列傅三十其後班氏父子相續不"
        )

        normalized = normalize_ancient_text(recognized)

        self.assertEqual(
            normalized,
            (
                "晋郭璞注\n"
                "穆天子傳\n"
                "快開藏板\n"
                "穆天子傳叙\n"
                "世之史學有三一編年一紀傳一實錄\n"
                "實錄之書初無制作意以備史官採擇\n"
                "而已編年所載一國之事為詳紀傳所\n"
                "載一人之事為詳用此言之紀傳雖便\n"
                "于披閱實非正史蓋自司馬氏始作史\n"
                "記有列傳三十其後班氏父子相續不"
            ),
        )

    def test_does_not_replace_valid_fu_surname_globally(self) -> None:
        self.assertEqual(normalize_ancient_text("傅氏作傳"), "傅氏作傳")

    def test_formats_the_page_with_cross_column_corrections_and_punctuation(self) -> None:
        recognized = (
            "晋部璞註\n"
            "穆天子僖\n"
            "快開藏板\n"
            "穆天子傳叙\n"
            "世之史学有三一编年一纪傳一實錄\n"
            "實錄之書初無制作意以備史官採擇\n"
            "而巳年所載一國之事爲詳紀傳所\n"
            "載一人之事爲詳用此言之傳雖便\n"
            "手披阅實非正史盖自司馬氏始作史\n"
            "記有列傅三十其後班氏父子相續不"
        )

        self.assertEqual(
            normalize_ancient_page_text(recognized),
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
        )


if __name__ == "__main__":
    unittest.main()
