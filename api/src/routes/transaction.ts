import { Router } from "express";
import { Transaction } from "../models/Transaction.js";
import { authRequired } from "../middleware/auth.js";
import { isEmptyObject } from "../utils/index.js";
import moment from "moment";

const router = Router();

router.get("/transaction", authRequired, async (req, res) => {
  try {
    const list = await Transaction.find().sort({ timeStamp: -1 });
    return res.json({
      code: 20000,
      data: {
        total: list.length,
        items: list.splice(0, 20),
      },
      message: "数据请求成功！",
    });
  } catch (error) {
    res.status(404).json({ message: "User not found" });
  }
});

router.post("/transaction", authRequired, async (req, res) => {
  let body = !isEmptyObject(req.body) ? req.body : req.query;
  console.log(body);
  try {
    let data = await Transaction.create({
      ...body,
      timeStamp: moment().format("YYYY-MM-DD HH:mm:ss"),
      price: Number(body.price).toFixed(2),
    });
    res.json({
      code: 20000,
      msg: "创建成功",
      data: data,
    });
  } catch (error) {
    res.status(404).json({
      code: 20002,
      msg: "创建失败",
      data: null,
    });
  }
});

router.delete("/transaction/:id", authRequired, (req, res) => {
  let id = req.params.id;
  // 删除
  Transaction.deleteOne({ _id: id })
    .then((data) => {
      // res.render("success", { msg: "删除成功", url: "/account" })
      res.json({
        code: 20000,
        msg: "删除成功",
        data: data,
      });
    })
    .catch((err) => {
      res.status(404).json({
        code: 1003,
        msg: "删除账单失败",
        data: null,
      });
    });
});

// 获取单个账单信息
router.get("/transaction/:id", authRequired, (req, res) => {
  let { id } = req.params;
  Transaction.findById(id)
    .then((data) => {
      res.json({
        code: 20000,
        msg: "读取成功！",
        data: data,
      });
    })
    .catch((err) => {
      res.status(404).json({
        code: 1004,
        msg: "读取失败~~",
        data: null,
      });
    });
});

router.patch("/transaction/:id", authRequired, (req, res) => {
  // 获取id参数值
  let { id } = req.params;
  Transaction.updateOne({ _id: id }, req.body)
    .then(() => {
      Transaction.findById(id)
        .then((data) => {
          res.json({
            code: 20000,
            msg: "更新成功！",
            data: data,
          });
        })
        .catch((err) => {
          res.json({
            code: 1004,
            msg: "读取失败~~",
            data: null,
          });
        });
    })
    .catch((err) => {
      res.status(404).json({
        code: 1005,
        msg: "更新失败~~",
        data: null,
      });
    });
});

export default router;
