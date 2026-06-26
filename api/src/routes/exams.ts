/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * @license MIT
 */
import type { FastifyInstance } from "fastify";
import { pool } from "../config/database.js";
import { successResponse, errorResponse, formatExam, formatClassroom, type ExamRow, type ClassroomRow } from "../utils/response.js";
import { authMiddleware } from "../middleware/auth.js";

export default async function examRoutes(fastify: FastifyInstance) {
  // 获取所有考试(公开接口)
  fastify.get("/", async (request, reply) => {
    try {
      const { search, status } = request.query as {
        search?: string;
        status?: string;
      };

      let query = "SELECT * FROM exams";
      const params: any[] = [];
      const conditions: string[] = [];

      // 搜索条件
      if (search) {
        conditions.push("(subject LIKE ? OR location LIKE ? OR invigilator LIKE ?)");
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      // 状态筛选(根据当前时间计算)
      if (status && status !== "all") {
        const now = new Date().toISOString().slice(0, 19).replace("T", " ");
        if (status === "upcoming") {
          conditions.push("exam_date > ?");
          params.push(now);
        } else if (status === "ongoing") {
          conditions.push(
            "exam_date <= ? AND DATE_ADD(exam_date, INTERVAL duration MINUTE) > ?"
          );
          params.push(now, now);
        } else if (status === "ended") {
          conditions.push(
            "DATE_ADD(exam_date, INTERVAL duration MINUTE) <= ?"
          );
          params.push(now);
        }
      }

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      query += " ORDER BY exam_date ASC";

      const [rows] = await pool.execute(query, params);
      const exams = (rows as ExamRow[]).map(formatExam);

      return reply.send(successResponse(exams));
    } catch (error) {
      console.error("获取考试列表失败:", error);
      return reply.status(500).send(errorResponse("获取考试列表失败"));
    }
  });

  // 获取单个考试详情(公开接口)
  fastify.get("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [rows] = await pool.execute(
        "SELECT * FROM exams WHERE id = ?",
        [id]
      );

      const exams = rows as ExamRow[];
      if (exams.length === 0) {
        return reply.status(404).send(errorResponse("考试不存在"));
      }

      return reply.send(successResponse(formatExam(exams[0])));
    } catch (error) {
      console.error("获取考试详情失败:", error);
      return reply.status(500).send(errorResponse("获取考试详情失败"));
    }
  });

  // 以下接口需要认证
  // 创建考试
  fastify.post("/", {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const { subject, examDate, duration, location, invigilator, notes } =
        request.body as {
          subject: string;
          examDate: string;
          duration: number;
          location: string;
          invigilator: string;
          notes: string;
        };

      // 验证必填字段
      if (!subject || !examDate || !duration || !location || !invigilator) {
        return reply.status(400).send(errorResponse("请填写所有必填字段"));
      }

      // 转换日期格式
      const examDateObj = new Date(examDate);

      const [result] = await pool.execute(
        `INSERT INTO exams (subject, exam_date, duration, location, invigilator, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [subject, examDateObj, duration, location, invigilator, notes || ""]
      );

      const insertId = (result as any).insertId;
      const [rows] = await pool.execute(
        "SELECT * FROM exams WHERE id = ?",
        [insertId]
      );

      return reply.status(201).send(
        successResponse(formatExam((rows as ExamRow[])[0]), "考试创建成功")
      );
    } catch (error) {
      console.error("创建考试失败:", error);
      return reply.status(500).send(errorResponse("创建考试失败"));
    }
  });

  // 更新考试
  fastify.put("/:id", {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { subject, examDate, duration, location, invigilator, notes } =
        request.body as {
          subject: string;
          examDate: string;
          duration: number;
          location: string;
          invigilator: string;
          notes: string;
        };

      // 验证必填字段
      if (!subject || !examDate || !duration || !location || !invigilator) {
        return reply.status(400).send(errorResponse("请填写所有必填字段"));
      }

      const examDateObj = new Date(examDate);

      const [result] = await pool.execute(
        `UPDATE exams
         SET subject = ?, exam_date = ?, duration = ?, location = ?, invigilator = ?, notes = ?
         WHERE id = ?`,
        [subject, examDateObj, duration, location, invigilator, notes || "", id]
      );

      if ((result as any).affectedRows === 0) {
        return reply.status(404).send(errorResponse("考试不存在"));
      }

      const [rows] = await pool.execute(
        "SELECT * FROM exams WHERE id = ?",
        [id]
      );

      return reply.send(
        successResponse(formatExam((rows as ExamRow[])[0]), "考试更新成功")
      );
    } catch (error) {
      console.error("更新考试失败:", error);
      return reply.status(500).send(errorResponse("更新考试失败"));
    }
  });

  // 删除考试
  fastify.delete("/:id", {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const [result] = await pool.execute(
        "DELETE FROM exams WHERE id = ?",
        [id]
      );

      if ((result as any).affectedRows === 0) {
        return reply.status(404).send(errorResponse("考试不存在"));
      }

      return reply.send(successResponse(null, "考试删除成功"));
    } catch (error) {
      console.error("删除考试失败:", error);
      return reply.status(500).send(errorResponse("删除考试失败"));
    }
  });

  // 获取统计数据(公开接口)
  fastify.get("/stats/overview", async (request, reply) => {
    try {
      const [rows] = await pool.execute("SELECT * FROM exams");
      const exams = rows as ExamRow[];
      const now = new Date();

      const stats = {
        total: exams.length,
        upcoming: 0,
        ongoing: 0,
        ended: 0,
      };

      exams.forEach((exam) => {
        const startTime = new Date(exam.exam_date);
        const endTime = new Date(
          startTime.getTime() + exam.duration * 60 * 1000
        );

        if (now < startTime) stats.upcoming++;
        else if (now >= startTime && now <= endTime) stats.ongoing++;
        else stats.ended++;
      });

      return reply.send(successResponse(stats));
    } catch (error) {
      console.error("获取统计数据失败:", error);
      return reply.status(500).send(errorResponse("获取统计数据失败"));
    }
  });

  // ==================== 考试-教室分配接口(需管理员认证) ====================

  // 获取某场考试已分配的教室列表
  fastify.get(
    "/:id/classrooms",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const [rows] = await pool.execute(
          `SELECT c.*, b.name AS building_name FROM exam_classrooms ec
           JOIN classrooms c ON ec.classroom_id = c.id
           JOIN buildings b ON c.building_id = b.id
           WHERE ec.exam_id = ?
           ORDER BY c.room_number ASC`,
          [id]
        );

        const classrooms = (rows as (ClassroomRow & { building_name: string })[]).map(
          formatClassroom
        );
        return reply.send(successResponse(classrooms));
      } catch (error) {
        console.error("获取考试分配教室失败:", error);
        return reply.status(500).send(errorResponse("获取分配教室失败"));
      }
    }
  );

  // 为考试分配教室(支持批量)
  fastify.post(
    "/:id/classrooms",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { classroomIds } = request.body as { classroomIds: string[] };

        if (!Array.isArray(classroomIds) || classroomIds.length === 0) {
          return reply
            .status(400)
            .send(errorResponse("请选择要分配的教室"));
        }

        // 验证考试存在
        const [examRows] = await pool.execute(
          "SELECT id FROM exams WHERE id = ?",
          [id]
        );
        if ((examRows as any[]).length === 0) {
          return reply.status(404).send(errorResponse("考试不存在"));
        }

        // 批量插入关联(忽略重复)
        const values = classroomIds.map(() => "(?, ?)").join(", ");
        const params = classroomIds.flatMap((cid) => [id, cid]);
        await pool.execute(
          `INSERT IGNORE INTO exam_classrooms (exam_id, classroom_id) VALUES ${values}`,
          params
        );

        return reply.send(
          successResponse(null, `成功分配 ${classroomIds.length} 个教室`)
        );
      } catch (error) {
        console.error("分配教室失败:", error);
        return reply.status(500).send(errorResponse("分配教室失败"));
      }
    }
  );

  // 取消考试的某个教室分配
  fastify.delete(
    "/:id/classrooms/:classroomId",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const { id, classroomId } = request.params as {
          id: string;
          classroomId: string;
        };

        await pool.execute(
          "DELETE FROM exam_classrooms WHERE exam_id = ? AND classroom_id = ?",
          [id, classroomId]
        );

        return reply.send(successResponse(null, "已取消分配"));
      } catch (error) {
        console.error("取消教室分配失败:", error);
        return reply.status(500).send(errorResponse("取消分配失败"));
      }
    }
  );

  // 获取所有已审核通过的教室(用于分配时选择)
  fastify.get(
    "/classrooms/available",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const [rows] = await pool.execute(
          `SELECT c.*, b.name AS building_name FROM classrooms c
           JOIN buildings b ON c.building_id = b.id
           WHERE c.status = 'approved'
           ORDER BY b.name ASC, c.room_number ASC`
        );

        const classrooms = (rows as (ClassroomRow & { building_name: string })[]).map(
          formatClassroom
        );
        return reply.send(successResponse(classrooms));
      } catch (error) {
        console.error("获取可用教室失败:", error);
        return reply.status(500).send(errorResponse("获取可用教室失败"));
      }
    }
  );
}
