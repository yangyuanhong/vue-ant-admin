import unittest

import numpy as np
from PIL import Image

from app.ancient_image_processing import (
    crop_polygon_with_padding,
    is_red_stamp,
    prepare_for_ocr,
)


class AncientImageProcessingTests(unittest.TestCase):
    def test_crop_polygon_with_padding_keeps_margin_around_text(self) -> None:
        image = np.zeros((100, 120, 3), dtype=np.uint8)
        polygon = [[40, 20], [80, 20], [80, 60], [40, 60]]

        crop = crop_polygon_with_padding(
            image,
            polygon,
            padding_ratio=0.1,
            min_padding=3,
        )

        self.assertIsNotNone(crop)
        self.assertEqual(crop.shape[:2], (48, 48))

    def test_prepare_for_ocr_makes_faded_ink_more_distinct(self) -> None:
        pixels = np.full((40, 40, 3), 190, dtype=np.uint8)
        pixels[10:30, 18:22] = 145
        image = Image.fromarray(pixels, mode="RGB")

        prepared = prepare_for_ocr(image)
        prepared_gray = np.asarray(prepared.convert("L"))

        original_contrast = 190 - 145
        prepared_contrast = int(prepared_gray[0, 0]) - int(prepared_gray[20, 20])
        self.assertGreater(prepared_contrast, original_contrast)
        self.assertEqual(prepared.mode, "RGB")

    def test_is_red_stamp_distinguishes_red_seal_from_black_text(self) -> None:
        red_stamp_bgr = np.full((30, 30, 3), 230, dtype=np.uint8)
        red_stamp_bgr[5:25, 5:25] = [45, 55, 185]

        black_text_bgr = np.full((30, 30, 3), 230, dtype=np.uint8)
        black_text_bgr[5:25, 13:17] = [35, 35, 35]

        self.assertTrue(is_red_stamp(red_stamp_bgr))
        self.assertFalse(is_red_stamp(black_text_bgr))

    def test_is_red_stamp_does_not_treat_yellow_paper_as_a_seal(self) -> None:
        yellow_paper_bgr = np.full(
            (30, 30, 3),
            [110, 170, 220],
            dtype=np.uint8,
        )
        yellow_paper_bgr[5:25, 13:17] = [35, 35, 35]

        self.assertFalse(is_red_stamp(yellow_paper_bgr))


if __name__ == "__main__":
    unittest.main()
