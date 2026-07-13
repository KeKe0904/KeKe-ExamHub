/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import type { FastifyInstance } from "fastify";
import { pool } from "../config/database.js";
import { successResponse, errorResponse, formatExam, formatClassroom, type ExamRow, type ClassroomRow } from "../utils/response.js";
import { authMiddleware } from "../middleware/auth.js";
import { sanitizeText } from "../utils/xss.js";
import { likePattern } from "../utils/db.js";
import { logAdminAction } from "../utils/audit-log.js";

export default async function examRoutes(fastify: FastifyInstance) {
  // 检测 exams 表是否有 is_active 字段
  let hasIsActiveColumn: boolean | null = null;

  async function checkIsActiveColumn(): Promise<boolean> {
    if (hasIsActiveColumn !== null) return hasIsActiveColumn;
    try {
      const [rows] = await pool.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exams' AND COLUMN_NAME = 'is_active'"
      );
      hasIsActiveColumn = (rows as any[]).length > 0;
    } catch {
      hasIsActiveColumn = false;
    }
    return hasIsActiveColumn;
  }

  // 获取所有考试(公开接口)
  fastify.get("/", async (request, reply) => {
    try {
      const { search, status } = request.query as {
        search?: string;
        status?: string;
      };

      const hasActive = await checkIsActiveColumn();
      let query = "SELECT * FROM exams";
      const params: any[] = [];
      const conditions: string[] = [];

      if (hasActive) {
        conditions.push("is_active = 1");
      }

      // 搜索条件
      if (search) {
        conditions.push("(subject LIKE ? OR location LIKE ? OR invigilator LIKE ?)");
        const searchPattern = likePattern(search);
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
      const hasActive = await checkIsActiveColumn();

      let query = "SELECT * FROM exams WHERE id = ?";
      const params: any[] = [id];

      if (hasActive) {
        query += " AND is_active = 1";
      }

      const [rows] = await pool.execute(query, params);

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
      const user = (request as any).user;
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

      const safeSubject = sanitizeText(subject);
      const safeLocation = sanitizeText(location);
      const safeInvigilator = sanitizeText(invigilator);
      const safeNotes = sanitizeText(notes || "");

      // 转换日期格式
      const examDateObj = new Date(examDate);

      const [result] = await pool.execute(
        `INSERT INTO exams (subject, exam_date, duration, location, invigilator, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [safeSubject, examDateObj, duration, safeLocation, safeInvigilator, safeNotes]
      );

      const insertId = (result as any).insertId;
      const [rows] = await pool.execute(
        "SELECT * FROM exams WHERE id = ?",
        [insertId]
      );

      // 记录操作日志
      logAdminAction(user.id, user.username, "exam_create", {
        examId: insertId,
        subject: safeSubject,
      });

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
      const user = (request as any).user;
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

      const safeSubject = sanitizeText(subject);
      const safeLocation = sanitizeText(location);
      const safeInvigilator = sanitizeText(invigilator);
      const safeNotes = sanitizeText(notes || "");

      const examDateObj = new Date(examDate);

      const [result] = await pool.execute(
        `UPDATE exams
         SET subject = ?, exam_date = ?, duration = ?, location = ?, invigilator = ?, notes = ?
         WHERE id = ?`,
        [safeSubject, examDateObj, duration, safeLocation, safeInvigilator, safeNotes, id]
      );

      if ((result as any).affectedRows === 0) {
        return reply.status(404).send(errorResponse("考试不存在"));
      }

      const [rows] = await pool.execute(
        "SELECT * FROM exams WHERE id = ?",
        [id]
      );

      logAdminAction(user.id, user.username, "exam_update", {
        examId: id,
        subject: safeSubject,
      });

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
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const [examRows] = await pool.execute(
        "SELECT subject FROM exams WHERE id = ?",
        [id]
      );
      const exam = (examRows as any[])[0];

      if (!exam) {
        return reply.status(404).send(errorResponse("考试不存在"));
      }

      let affectedRows = 0;
      try {
        const [result] = await pool.execute(
          "UPDATE exams SET is_active = 0 WHERE id = ? AND is_active = 1",
          [id]
        );
        affectedRows = (result as any).affectedRows;
      } catch {
        const [result] = await pool.execute(
          "DELETE FROM exams WHERE id = ?",
          [id]
        );
        affectedRows = (result as any).affectedRows;
      }

      if (affectedRows === 0) {
        return reply.status(404).send(errorResponse("考试不存在或已删除"));
      }

      // 删除考试关联数据(教室分配、监考老师、学生分配)
      try {
        await pool.execute("DELETE FROM exam_classrooms WHERE exam_id = ?", [id]);
        await pool.execute("DELETE FROM exam_invigilators WHERE exam_id = ?", [id]);
        await pool.execute("DELETE FROM exam_students WHERE exam_id = ?", [id]);
      } catch (err) {
        // 关联表清理失败不阻断主流程,仅记录日志
        console.error("清理考试关联数据失败:", err);
      }

      logAdminAction(user.id, user.username, "exam_delete", {
        examId: id,
        subject: exam?.subject || "",
      });

      return reply.send(successResponse(null, "考试删除成功"));
    } catch (error) {
      console.error("删除考试失败:", error);
      return reply.status(500).send(errorResponse("删除考试失败"));
    }
  });

  // 批量删除考试
  fastify.delete("/batch", {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as any).user;
      const { ids } = request.body as { ids: number[] };

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return reply.status(400).send(errorResponse("请选择要操作的数据"));
      }
      if (ids.length > 100) {
        return reply.status(400).send(errorResponse("单次操作不能超过100条"));
      }

      const placeholders = ids.map(() => "?").join(", ");
      let affectedRows = 0;

      try {
        const [result] = await pool.execute(
          `UPDATE exams SET is_active = 0 WHERE id IN (${placeholders}) AND is_active = 1`,
          ids
        );
        affectedRows = (result as any).affectedRows;
      } catch {
        const [result] = await pool.execute(
          `DELETE FROM exams WHERE id IN (${placeholders})`,
          ids
        );
        affectedRows = (result as any).affectedRows;
      }

      // 清理关联表数据
      try {
        await pool.execute(
          `DELETE FROM exam_classrooms WHERE exam_id IN (${placeholders})`,
          ids
        );
        await pool.execute(
          `DELETE FROM exam_invigilators WHERE exam_id IN (${placeholders})`,
          ids
        );
        await pool.execute(
          `DELETE FROM exam_students WHERE exam_id IN (${placeholders})`,
          ids
        );
      } catch (err) {
        console.error("清理批量删除考试的关联数据失败:", err);
      }

      logAdminAction(user.id, user.username, "exam_batch_delete", {
        count: affectedRows,
        ids,
      });

      return reply.send(successResponse({ count: affectedRows }, `成功删除 ${affectedRows} 场考试`));
    } catch (error) {
      console.error("批量删除考试失败:", error);
      return reply.status(500).send(errorResponse("批量删除失败"));
    }
  });

  // 批量修改考试
  fastify.put("/batch", {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as any).user;
      const { ids, updates } = request.body as {
        ids: number[];
        updates: {
          examDate?: string;
          duration?: number;
          location?: string;
          invigilator?: string;
        };
      };

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return reply.status(400).send(errorResponse("请选择要操作的数据"));
      }
      if (ids.length > 100) {
        return reply.status(400).send(errorResponse("单次操作不能超过100条"));
      }

      if (!updates || Object.keys(updates).length === 0) {
        return reply.status(400).send(errorResponse("请选择要修改的字段"));
      }

      const fields: string[] = [];
      const params: any[] = [];

      if (updates.examDate !== undefined) {
        fields.push("exam_date = ?");
        params.push(new Date(updates.examDate));
      }
      if (updates.duration !== undefined) {
        fields.push("duration = ?");
        params.push(updates.duration);
      }
      if (updates.location !== undefined) {
        fields.push("location = ?");
        params.push(sanitizeText(updates.location));
      }
      if (updates.invigilator !== undefined) {
        fields.push("invigilator = ?");
        params.push(sanitizeText(updates.invigilator));
      }

      const placeholders = ids.map(() => "?").join(", ");
      params.push(...ids);

      const [result] = await pool.execute(
        `UPDATE exams SET ${fields.join(", ")} WHERE id IN (${placeholders})`,
        params
      );

      const affectedRows = (result as any).affectedRows;

      logAdminAction(user.id, user.username, "exam_batch_update", {
        count: affectedRows,
        ids,
        updates,
      });

      return reply.send(successResponse({ count: affectedRows }, `成功更新 ${affectedRows} 场考试`));
    } catch (error) {
      console.error("批量修改考试失败:", error);
      return reply.status(500).send(errorResponse("批量修改失败"));
    }
  });

  // 获取统计数据(公开接口)
  fastify.get("/stats/overview", async (request, reply) => {
    try {
      const hasActive = await checkIsActiveColumn();
      let query = "SELECT * FROM exams";
      if (hasActive) {
        query += " WHERE is_active = 1";
      }
      const [rows] = await pool.execute(query);
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

  // 获取大屏数据(公开接口)
  fastify.get("/stats/dashboard", async (request, reply) => {
    try {
      const hasActive = await checkIsActiveColumn();
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      // 获取所有考试
      let examQuery = "SELECT * FROM exams";
      if (hasActive) {
        examQuery += " WHERE is_active = 1";
      }
      examQuery += " ORDER BY exam_date ASC";
      const [examRows] = await pool.execute(examQuery);
      const exams = examRows as ExamRow[];

      // 获取所有已审核通过的教室
      const [classroomRows] = await pool.execute(
        "SELECT c.*, b.name AS building_name FROM classrooms c JOIN buildings b ON c.building_id = b.id WHERE c.status = 'approved'"
      );
      const approvedClassrooms = classroomRows as Array<{ id: number; building_id: number; building_name: string; room_number: string }>;

      // 获取所有教学楼
      const [buildingRows] = await pool.execute("SELECT * FROM buildings ORDER BY name ASC");
      const buildings = buildingRows as Array<{ id: number; name: string }>;

      // 获取考试-教室分配关系
      const [examClassroomRows] = await pool.execute(
        "SELECT ec.exam_id, ec.classroom_id FROM exam_classrooms ec JOIN exams e ON ec.exam_id = e.id" +
        (hasActive ? " WHERE e.is_active = 1" : "")
      );
      const examClassrooms = examClassroomRows as Array<{ exam_id: number; classroom_id: number }>;

      let totalExams = 0;
      let upcomingExams = 0;
      let ongoingExams = 0;
      let endedExams = 0;
      let todayExams = 0;
      const ongoingExamList: Array<{
        id: string;
        subject: string;
        examDate: string;
        duration: number;
        location: string;
        progress: number;
        startTime: string;
        endTime: string;
      }> = [];
      const upcomingExamList: Array<{
        id: string;
        subject: string;
        examDate: string;
        duration: number;
        location: string;
      }> = [];
      const recentEndedList: Array<{
        id: string;
        subject: string;
        examDate: string;
        duration: number;
        location: string;
        endedAt: string;
      }> = [];

      const endedExamsList: Array<{
        exam: ExamRow;
        endTime: Date;
      }> = [];

      exams.forEach((exam) => {
        totalExams++;
        const startTime = new Date(exam.exam_date);
        const endTime = new Date(startTime.getTime() + exam.duration * 60 * 1000);

        // 今日考试
        if (startTime >= todayStart && startTime < todayEnd) {
          todayExams++;
        }

        if (now < startTime) {
          upcomingExams++;
          if (upcomingExamList.length < 5) {
            upcomingExamList.push({
              id: String(exam.id),
              subject: exam.subject,
              examDate: exam.exam_date.toISOString(),
              duration: exam.duration,
              location: exam.location,
            });
          }
        } else if (now >= startTime && now <= endTime) {
          ongoingExams++;
          const elapsed = now.getTime() - startTime.getTime();
          const total = endTime.getTime() - startTime.getTime();
          const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
          ongoingExamList.push({
            id: String(exam.id),
            subject: exam.subject,
            examDate: exam.exam_date.toISOString(),
            duration: exam.duration,
            location: exam.location,
            progress: Math.round(progress * 10) / 10,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
          });
        } else {
          endedExams++;
          endedExamsList.push({ exam, endTime });
        }
      });

      // 最近结束的考试（按结束时间倒序取最近5场）
      endedExamsList
        .sort((a, b) => b.endTime.getTime() - a.endTime.getTime())
        .slice(0, 5)
        .forEach((item) => {
          recentEndedList.push({
            id: String(item.exam.id),
            subject: item.exam.subject,
            examDate: item.exam.exam_date.toISOString(),
            duration: item.exam.duration,
            location: item.exam.location,
            endedAt: item.endTime.toISOString(),
          });
        });

      // 今日有考试的教室（去重）
      const todayExamIds = exams
        .filter((exam) => {
          const startTime = new Date(exam.exam_date);
          const endTime = new Date(startTime.getTime() + exam.duration * 60 * 1000);
          return (
            (startTime >= todayStart && startTime < todayEnd) ||
            (endTime > todayStart && endTime <= todayEnd) ||
            (startTime <= todayStart && endTime >= todayEnd)
          );
        })
        .map((e) => e.id);

      const todayClassroomIds = new Set<number>();
      examClassrooms.forEach((ec) => {
        if (todayExamIds.includes(ec.exam_id)) {
          todayClassroomIds.add(ec.classroom_id);
        }
      });
      const activeClassrooms = todayClassroomIds.size;

      // 教室使用率
      const totalClassrooms = approvedClassrooms.length;
      const classroomUtilization =
        totalClassrooms > 0
          ? Math.round((activeClassrooms / totalClassrooms) * 100 * 10) / 10
          : 0;

      // 各教学楼考试数量统计
      const buildingStats: Array<{
        name: string;
        examCount: number;
        classroomCount: number;
      }> = buildings.map((building) => {
        const buildingClassroomIds = approvedClassrooms
          .filter((c) => c.building_id === building.id)
          .map((c) => c.id);
        const buildingExamIds = new Set<number>();
        examClassrooms.forEach((ec) => {
          if (buildingClassroomIds.includes(ec.classroom_id)) {
            buildingExamIds.add(ec.exam_id);
          }
        });
        return {
          name: building.name,
          examCount: buildingExamIds.size,
          classroomCount: buildingClassroomIds.length,
        };
      });

      const totalBuildings = buildings.length;

      return reply.send(
        successResponse({
          totalExams,
          upcomingExams,
          ongoingExams,
          endedExams,
          todayExams,
          totalClassrooms,
          totalBuildings,
          activeClassrooms,
          classroomUtilization,
          ongoingExamList,
          upcomingExamList,
          recentEndedList,
          buildingStats,
        })
      );
    } catch (error) {
      console.error("获取大屏数据失败:", error);
      return reply.status(500).send(errorResponse("获取大屏数据失败"));
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
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const { classroomIds, checkConflicts } = request.body as { 
          classroomIds: string[];
          checkConflicts?: boolean;
        };

        if (!Array.isArray(classroomIds) || classroomIds.length === 0) {
          return reply
            .status(400)
            .send(errorResponse("请选择要分配的教室"));
        }

        // 验证考试存在
        const [examRows] = await pool.execute(
          "SELECT * FROM exams WHERE id = ?",
          [id]
        );
        const exams = examRows as ExamRow[];
        if (exams.length === 0) {
          return reply.status(404).send(errorResponse("考试不存在"));
        }

        const currentExam = exams[0];
        const examStartTime = currentExam.exam_date;
        const examEndTime = new Date(
          examStartTime.getTime() + currentExam.duration * 60 * 1000
        );

        // 如果需要检测冲突
        if (checkConflicts) {
          const placeholders = classroomIds.map(() => "?").join(", ");
          const [conflictRows] = await pool.execute(
            `SELECT 
              e.id AS exam_id,
              e.subject,
              e.exam_date,
              e.duration,
              c.id AS classroom_id,
              c.room_number AS classroom_name,
              b.name AS building_name
             FROM exam_classrooms ec
             JOIN exams e ON ec.exam_id = e.id
             JOIN classrooms c ON ec.classroom_id = c.id
             JOIN buildings b ON c.building_id = b.id
             WHERE ec.classroom_id IN (${placeholders})
               AND ec.exam_id != ?
               AND (
                 (e.exam_date <= ? AND DATE_ADD(e.exam_date, INTERVAL e.duration MINUTE) > ?)
                 OR (e.exam_date >= ? AND e.exam_date < ?)
                 OR (e.exam_date <= ? AND DATE_ADD(e.exam_date, INTERVAL e.duration MINUTE) >= ?)
               )
             ORDER BY e.exam_date ASC, b.name ASC, c.room_number ASC`,
            [...classroomIds, id, examStartTime, examStartTime, examStartTime, examEndTime, examStartTime, examEndTime]
          );

          const conflicts = (conflictRows as Array<{
            exam_id: number;
            subject: string;
            exam_date: Date;
            duration: number;
            classroom_id: number;
            classroom_name: string;
            building_name: string;
          }>).map((row) => ({
            examId: String(row.exam_id),
            subject: row.subject,
            examDate: row.exam_date.toISOString(),
            duration: row.duration,
            classroomId: String(row.classroom_id),
            classroomName: row.classroom_name,
            buildingName: row.building_name,
          }));

          if (conflicts.length > 0) {
            return reply.status(409).send({
              success: false,
              message: "存在教室时段冲突",
              code: "CONFLICT",
              data: { conflicts },
            });
          }
        }

        // 批量插入关联(忽略重复)
        const values = classroomIds.map(() => "(?, ?)").join(", ");
        const params = classroomIds.flatMap((cid) => [id, cid]);
        await pool.execute(
          `INSERT IGNORE INTO exam_classrooms (exam_id, classroom_id) VALUES ${values}`,
          params
        );

        logAdminAction(user.id, user.username, "exam_assign_classrooms", {
          examId: id,
          subject: currentExam.subject,
          classroomCount: classroomIds.length,
        });

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
        const user = (request as any).user;
        const { id, classroomId } = request.params as {
          id: string;
          classroomId: string;
        };

        const [examRows] = await pool.execute(
          "SELECT subject FROM exams WHERE id = ?",
          [id]
        );
        const exam = (examRows as any[])[0];

        const [classroomRows] = await pool.execute(
          "SELECT room_number FROM classrooms WHERE id = ?",
          [classroomId]
        );
        const classroom = (classroomRows as any[])[0];

        await pool.execute(
          "DELETE FROM exam_classrooms WHERE exam_id = ? AND classroom_id = ?",
          [id, classroomId]
        );

        logAdminAction(user.id, user.username, "exam_unassign_classroom", {
          examId: id,
          subject: exam?.subject || "",
          classroomId,
          roomNumber: classroom?.room_number || "",
        });

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

  // 检测考试教室分配冲突
  fastify.get(
    "/:id/conflicts",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { classroomIds } = request.query as { classroomIds?: string };

        const [examRows] = await pool.execute(
          "SELECT * FROM exams WHERE id = ?",
          [id]
        );
        const exams = examRows as ExamRow[];
        if (exams.length === 0) {
          return reply.status(404).send(errorResponse("考试不存在"));
        }

        const currentExam = exams[0];
        const examStartTime = currentExam.exam_date;
        const examEndTime = new Date(
          examStartTime.getTime() + currentExam.duration * 60 * 1000
        );

        let classroomIdList: string[] = [];
        if (classroomIds) {
          classroomIdList = classroomIds.split(",").filter(Boolean);
        }

        let conflictRows: any[];

        if (classroomIdList.length > 0) {
          const placeholders = classroomIdList.map(() => "?").join(", ");
          const [rows] = await pool.execute(
            `SELECT 
              e.id AS exam_id,
              e.subject,
              e.exam_date,
              e.duration,
              c.id AS classroom_id,
              c.room_number AS classroom_name,
              b.name AS building_name
             FROM exam_classrooms ec
             JOIN exams e ON ec.exam_id = e.id
             JOIN classrooms c ON ec.classroom_id = c.id
             JOIN buildings b ON c.building_id = b.id
             WHERE ec.classroom_id IN (${placeholders})
               AND ec.exam_id != ?
               AND (
                 (e.exam_date <= ? AND DATE_ADD(e.exam_date, INTERVAL e.duration MINUTE) > ?)
                 OR (e.exam_date >= ? AND e.exam_date < ?)
                 OR (e.exam_date <= ? AND DATE_ADD(e.exam_date, INTERVAL e.duration MINUTE) >= ?)
               )
             ORDER BY e.exam_date ASC, b.name ASC, c.room_number ASC`,
            [...classroomIdList, id, examStartTime, examStartTime, examStartTime, examEndTime, examStartTime, examEndTime]
          );
          conflictRows = rows as any[];
        } else {
          const [rows] = await pool.execute(
            `SELECT 
              e.id AS exam_id,
              e.subject,
              e.exam_date,
              e.duration,
              c.id AS classroom_id,
              c.room_number AS classroom_name,
              b.name AS building_name
             FROM exam_classrooms ec_current
             JOIN exam_classrooms ec_other 
               ON ec_current.classroom_id = ec_other.classroom_id
             JOIN exams e ON ec_other.exam_id = e.id
             JOIN classrooms c ON ec_current.classroom_id = c.id
             JOIN buildings b ON c.building_id = b.id
             WHERE ec_current.exam_id = ?
               AND ec_other.exam_id != ?
               AND (
                 (e.exam_date <= ? AND DATE_ADD(e.exam_date, INTERVAL e.duration MINUTE) > ?)
                 OR (e.exam_date >= ? AND e.exam_date < ?)
                 OR (e.exam_date <= ? AND DATE_ADD(e.exam_date, INTERVAL e.duration MINUTE) >= ?)
               )
             ORDER BY e.exam_date ASC, b.name ASC, c.room_number ASC`,
            [id, id, examStartTime, examStartTime, examStartTime, examEndTime, examStartTime, examEndTime]
          );
          conflictRows = rows as any[];
        }

        const conflicts = (conflictRows as Array<{
          exam_id: number;
          subject: string;
          exam_date: Date;
          duration: number;
          classroom_id: number;
          classroom_name: string;
          building_name: string;
        }>).map((row) => ({
          examId: String(row.exam_id),
          subject: row.subject,
          examDate: row.exam_date.toISOString(),
          duration: row.duration,
          classroomId: String(row.classroom_id),
          classroomName: row.classroom_name,
          buildingName: row.building_name,
        }));

        return reply.send(successResponse({ conflicts }));
      } catch (error) {
        console.error("检测考试冲突失败:", error);
        return reply.status(500).send(errorResponse("检测冲突失败"));
      }
    }
  );

  // ==================== 考试-学生分配接口(需管理员认证) ====================

  // 获取某场考试已分配的学生列表
  fastify.get(
    "/:id/students",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const [rows] = await pool.execute(
          `SELECT es.id, es.exam_id, es.classroom_id, es.student_id, es.seat_number, es.score, es.status,
                  s.student_no, s.name, s.class_id, s.gender,
                  c.name AS class_name, c.grade,
                  cr.room_number, b.name AS building_name
           FROM exam_students es
           JOIN students s ON es.student_id = s.id
           LEFT JOIN classes c ON s.class_id = c.id
           LEFT JOIN classrooms cr ON es.classroom_id = cr.id
           LEFT JOIN buildings b ON cr.building_id = b.id
           WHERE es.exam_id = ?
           ORDER BY es.seat_number IS NULL, es.seat_number ASC, s.student_no ASC`,
          [id]
        );

        const students = (rows as any[]).map((row) => ({
          id: String(row.id),
          examId: String(row.exam_id),
          classroomId: row.classroom_id ? String(row.classroom_id) : null,
          classroomName: row.room_number || "",
          buildingName: row.building_name || "",
          studentId: String(row.student_id),
          studentNo: row.student_no,
          name: row.name,
          classId: row.class_id ? String(row.class_id) : null,
          className: row.class_name || "",
          grade: row.grade || "",
          gender: row.gender,
          seatNumber: row.seat_number || "",
          score: row.score,
          status: row.status,
        }));

        return reply.send(successResponse(students));
      } catch (error) {
        console.error("获取考试学生列表失败:", error);
        return reply.status(500).send(errorResponse("获取学生列表失败"));
      }
    }
  );

  // 批量分配学生到考试
  fastify.post(
    "/:id/students",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const { students, classroomId, autoAssignSeats } = request.body as {
          students: Array<{ studentId: string; seatNumber?: string; classroomId?: string }>;
          classroomId?: string;
          autoAssignSeats?: boolean;
        };

        if (!Array.isArray(students) || students.length === 0) {
          return reply.status(400).send(errorResponse("请选择要分配的学生"));
        }

        const [examRows] = await pool.execute(
          "SELECT id, subject FROM exams WHERE id = ?",
          [id]
        );
        if ((examRows as any[]).length === 0) {
          return reply.status(404).send(errorResponse("考试不存在"));
        }

        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();

          let assignedCount = 0;
          let seatCounter = 1;

          for (const stu of students) {
            let seatNum = stu.seatNumber;
            if (autoAssignSeats && !seatNum) {
              seatNum = String(seatCounter++);
            }

            const classId = stu.classroomId || classroomId;

            await conn.execute(
              `INSERT IGNORE INTO exam_students (exam_id, student_id, classroom_id, seat_number)
               VALUES (?, ?, ?, ?)`,
              [id, stu.studentId, classId || null, seatNum || null]
            );
            assignedCount++;
          }

          await conn.commit();

          logAdminAction(user.id, user.username, "exam_assign_students", {
            examId: id,
            subject: (examRows as any[])[0].subject,
            studentCount: assignedCount,
          });

          return reply.send(
            successResponse({ count: assignedCount }, `成功分配 ${assignedCount} 名学生`)
          );
        } catch (err) {
          await conn.rollback();
          throw err;
        } finally {
          conn.release();
        }
      } catch (error) {
        console.error("分配学生失败:", error);
        return reply.status(500).send(errorResponse("分配学生失败"));
      }
    }
  );

  // 更新考试学生的座位号或教室
  fastify.put(
    "/:id/students/:studentId",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const user = (request as any).user;
        const { id, studentId } = request.params as {
          id: string;
          studentId: string;
        };
        const { seatNumber, classroomId } = request.body as {
          seatNumber?: string;
          classroomId?: string;
        };

        const [existingRows] = await pool.execute(
          "SELECT id FROM exam_students WHERE exam_id = ? AND student_id = ?",
          [id, studentId]
        );
        if ((existingRows as any[]).length === 0) {
          return reply.status(404).send(errorResponse("该学生未分配到此考试"));
        }

        await pool.execute(
          `UPDATE exam_students 
           SET seat_number = COALESCE(?, seat_number),
               classroom_id = COALESCE(?, classroom_id)
           WHERE exam_id = ? AND student_id = ?`,
          [seatNumber !== undefined ? seatNumber : null, classroomId !== undefined ? classroomId : null, id, studentId]
        );

        logAdminAction(user.id, user.username, "exam_update_student", {
          examId: id,
          studentId,
        });

        return reply.send(successResponse(null, "更新成功"));
      } catch (error) {
        console.error("更新学生信息失败:", error);
        return reply.status(500).send(errorResponse("更新失败"));
      }
    }
  );

  // 移除考试中的学生
  fastify.delete(
    "/:id/students/:studentId",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const user = (request as any).user;
        const { id, studentId } = request.params as {
          id: string;
          studentId: string;
        };

        const [studentRows] = await pool.execute(
          "SELECT name, student_no FROM students WHERE id = ?",
          [studentId]
        );

        const [result] = await pool.execute(
          "DELETE FROM exam_students WHERE exam_id = ? AND student_id = ?",
          [id, studentId]
        );

        if ((result as any).affectedRows === 0) {
          return reply.status(404).send(errorResponse("该学生未分配到此考试"));
        }

        logAdminAction(user.id, user.username, "exam_remove_student", {
          examId: id,
          studentId,
          studentName: (studentRows as any[])[0]?.name || "",
          studentNo: (studentRows as any[])[0]?.student_no || "",
        });

        return reply.send(successResponse(null, "已移除学生"));
      } catch (error) {
        console.error("移除学生失败:", error);
        return reply.status(500).send(errorResponse("移除失败"));
      }
    }
  );

  // 按班级批量分配学生（简化版）
  fastify.post(
    "/:id/students/batch-by-class",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const { classIds, classroomId, autoAssignSeats } = request.body as {
          classIds: string[];
          classroomId?: string;
          autoAssignSeats?: boolean;
        };

        if (!Array.isArray(classIds) || classIds.length === 0) {
          return reply.status(400).send(errorResponse("请选择班级"));
        }

        const [examRows] = await pool.execute(
          "SELECT id, subject FROM exams WHERE id = ?",
          [id]
        );
        if ((examRows as any[]).length === 0) {
          return reply.status(404).send(errorResponse("考试不存在"));
        }

        const placeholders = classIds.map(() => "?").join(", ");
        const [studentRows] = await pool.execute(
          `SELECT id, student_no FROM students 
           WHERE class_id IN (${placeholders}) AND status = 'active'
           ORDER BY student_no ASC`,
          classIds
        );

        const students = studentRows as any[];
        if (students.length === 0) {
          return reply.status(400).send(errorResponse("所选班级没有学生"));
        }

        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();

          let assignedCount = 0;

          for (let i = 0; i < students.length; i++) {
            const stu = students[i];
            const seatNum = autoAssignSeats ? String(i + 1) : null;

            await conn.execute(
              `INSERT IGNORE INTO exam_students (exam_id, student_id, classroom_id, seat_number)
               VALUES (?, ?, ?, ?)`,
              [id, stu.id, classroomId || null, seatNum]
            );
            assignedCount++;
          }

          await conn.commit();

          logAdminAction(user.id, user.username, "exam_assign_students_by_class", {
            examId: id,
            subject: (examRows as any[])[0].subject,
            classCount: classIds.length,
            studentCount: assignedCount,
          });

          return reply.send(
            successResponse({ count: assignedCount }, `成功分配 ${assignedCount} 名学生`)
          );
        } catch (err) {
          await conn.rollback();
          throw err;
        } finally {
          conn.release();
        }
      } catch (error) {
        console.error("按班级分配学生失败:", error);
        return reply.status(500).send(errorResponse("分配学生失败"));
      }
    }
  );
}
