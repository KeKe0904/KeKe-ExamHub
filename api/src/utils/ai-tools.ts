/**
 * KeKe ExamHub - 考试信息管理系统
 * AI 助手工具函数（Function Calling 实现）
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import bcrypt from "bcryptjs";
import os from "os";
import { pool } from "../config/database.js";
import { sanitizeText, sanitizeHtml } from "./xss.js";
import { likePattern, safeInt } from "./db.js";
import { localizeMysqlError } from "./localize-error.js";

// ==================== 风险分级 ====================

/**
 * safe       - 查询类，自动执行
 * dangerous  - 写入/批量操作，需管理员在前端确认后执行
 * forbidden  - 系统级删除/重置环境等，AI 不提供工具，需人工操作
 */
export type RiskLevel = "safe" | "dangerous" | "forbidden";

export interface ToolMeta {
  name: string;
  risk: RiskLevel;
  /** 危险操作的简短说明，用于前端确认弹窗 */
  dangerHint?: string;
}

export const TOOL_META: Record<string, ToolMeta> = {
  // 查询类（safe）
  query_exams: { name: "query_exams", risk: "safe" },
  query_teachers: { name: "query_teachers", risk: "safe" },
  query_students: { name: "query_students", risk: "safe" },
  query_classes: { name: "query_classes", risk: "safe" },
  query_stats: { name: "query_stats", risk: "safe" },
  query_audit_logs: { name: "query_audit_logs", risk: "safe" },
  query_abnormal_logins: { name: "query_abnormal_logins", risk: "safe" },
  query_ip_blacklist: { name: "query_ip_blacklist", risk: "safe" },
  query_system_health: { name: "query_system_health", risk: "safe" },
  // 扩展查询类（safe）
  query_buildings: { name: "query_buildings", risk: "safe" },
  query_classrooms: { name: "query_classrooms", risk: "safe" },
  query_domains: { name: "query_domains", risk: "safe" },
  query_exam_students: { name: "query_exam_students", risk: "safe" },

  // 写入类（dangerous，需确认）
  create_exam: {
    name: "create_exam",
    risk: "dangerous",
    dangerHint: "将创建一场新考试并写入数据库",
  },
  import_teachers: {
    name: "import_teachers",
    risk: "dangerous",
    dangerHint: "将批量创建教师账号（含默认密码）",
  },
  import_students: {
    name: "import_students",
    risk: "dangerous",
    dangerHint: "将批量创建学生账号（含默认密码）",
  },
  create_class: {
    name: "create_class",
    risk: "dangerous",
    dangerHint: "将创建一个新班级",
  },
  create_teacher: {
    name: "create_teacher",
    risk: "dangerous",
    dangerHint: "将创建一个教师账号",
  },
  create_student: {
    name: "create_student",
    risk: "dangerous",
    dangerHint: "将创建一个学生账号",
  },
  reset_teacher_password: {
    name: "reset_teacher_password",
    risk: "dangerous",
    dangerHint: "将重置教师密码为工号后 6 位",
  },
  reset_student_password: {
    name: "reset_student_password",
    risk: "dangerous",
    dangerHint: "将重置学生密码为学号后 6 位",
  },
  toggle_user_status: {
    name: "toggle_user_status",
    risk: "dangerous",
    dangerHint: "将启用/停用用户账号",
  },
  create_announcement: {
    name: "create_announcement",
    risk: "dangerous",
    dangerHint: "将发布一条新公告，前端可见",
  },
  // 编辑类（dangerous，需确认）
  edit_exam: {
    name: "edit_exam",
    risk: "dangerous",
    dangerHint: "将修改考试信息",
  },
  edit_teacher: {
    name: "edit_teacher",
    risk: "dangerous",
    dangerHint: "将修改教师信息",
  },
  edit_student: {
    name: "edit_student",
    risk: "dangerous",
    dangerHint: "将修改学生信息",
  },
  assign_head_teacher: {
    name: "assign_head_teacher",
    risk: "dangerous",
    dangerHint: "将为班级分配/更换班主任",
  },

  // forbidden 类（删除系统内容）不提供工具，AI 应拒绝并引导人工操作
  // 如：删除考试、删除教师、删除班级、删除公告、重装环境、删除域名、解封 IP 等
};

// ==================== OpenAI Function 定义 ====================

export const AI_TOOLS = [
  // ---------- 查询类（safe） ----------
  {
    type: "function" as const,
    function: {
      name: "query_exams",
      description: "查询考试列表，支持按科目/地点/状态筛选。返回考试数组。",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "搜索关键词（科目/地点/监考人）" },
          status: {
            type: "string",
            enum: ["upcoming", "ongoing", "ended", "all"],
            description: "考试状态筛选：upcoming=即将开始，ongoing=进行中，ended=已结束",
          },
          limit: { type: "number", description: "返回数量上限，默认 50" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "query_teachers",
      description: "查询教师列表，支持按姓名/工号搜索。",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "搜索关键词（姓名/工号）" },
          limit: { type: "number", description: "返回数量上限，默认 50" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "query_students",
      description: "查询学生列表，支持按班级/姓名/学号筛选（分页）。",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "搜索关键词（姓名/学号）" },
          classId: { type: "string", description: "班级 ID" },
          page: { type: "number", description: "页码，默认 1" },
          pageSize: { type: "number", description: "每页数量，默认 20" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "query_classes",
      description: "查询班级列表，含班主任信息和学生人数。",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "按班级名称搜索" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "query_stats",
      description: "查询平台统计数据：考试总数、教师总数、学生总数、班级总数、今日考试数等。",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "query_audit_logs",
      description: "查询管理员操作日志（审计日志），用于排查问题。按时间倒序返回。",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", description: "按操作类型筛选，如 exam_create、teacher_delete" },
          adminId: { type: "string", description: "按管理员 ID 筛选" },
          startDate: { type: "string", description: "起始时间 ISO 8601" },
          endDate: { type: "string", description: "结束时间 ISO 8601" },
          limit: { type: "number", description: "返回数量上限，默认 30" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "query_abnormal_logins",
      description: "查询教室端异常登录记录，用于排查安全问题。",
      parameters: {
        type: "object",
        properties: {
          reviewStatus: {
            type: "string",
            enum: ["pending", "approved", "rejected", "all"],
            description: "审核状态筛选，默认 pending",
          },
          limit: { type: "number", description: "返回数量上限，默认 30" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "query_ip_blacklist",
      description: "查询 IP 黑名单列表，用于排查访问被拦截问题。",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "query_system_health",
      description: "查询系统健康状况：CPU、内存、磁盘、运行时长、Node 版本等。用于排查服务器性能问题。",
      parameters: { type: "object", properties: {} },
    },
  },

  // ---------- 写入类（dangerous，需管理员确认） ----------
  {
    type: "function" as const,
    function: {
      name: "create_exam",
      description: "创建一场考试（危险操作，需管理员确认）。",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "考试科目（必填）" },
          examDate: { type: "string", description: "考试开始时间，ISO 8601（必填）" },
          duration: { type: "number", description: "考试时长（分钟，必填）" },
          location: { type: "string", description: "考试地点（必填）" },
          invigilator: { type: "string", description: "监考人姓名（必填）" },
          notes: { type: "string", description: "备注（可选）" },
        },
        required: ["subject", "examDate", "duration", "location", "invigilator"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "import_teachers",
      description: "批量导入教师（危险操作，需管理员确认）。",
      parameters: {
        type: "object",
        properties: {
          teachers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "姓名（必填）" },
                teacherNo: { type: "string", description: "工号（唯一）" },
                phone: { type: "string" },
                email: { type: "string" },
                notes: { type: "string" },
                password: { type: "string", description: "密码，不传则用工号后 6 位" },
              },
              required: ["name"],
            },
          },
        },
        required: ["teachers"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "import_students",
      description: "批量导入学生到指定班级（危险操作，需管理员确认）。",
      parameters: {
        type: "object",
        properties: {
          classId: { type: "string", description: "班级 ID（可选）" },
          students: {
            type: "array",
            items: {
              type: "object",
              properties: {
                studentNo: { type: "string", description: "学号（必填，唯一）" },
                name: { type: "string", description: "姓名（必填）" },
                gender: { type: "string", enum: ["male", "female", "unknown"] },
                phone: { type: "string" },
                idCard: { type: "string" },
                notes: { type: "string" },
              },
              required: ["studentNo", "name"],
            },
          },
        },
        required: ["students"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_class",
      description: "创建班级（危险操作，需管理员确认）。",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "班级名称（必填）" },
          grade: { type: "string" },
          headTeacherId: { type: "string", description: "班主任教师 ID" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_teacher",
      description: "创建单个教师账号（危险操作，需管理员确认）。",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "姓名（必填）" },
          teacherNo: { type: "string", description: "工号（唯一）" },
          phone: { type: "string" },
          email: { type: "string" },
          notes: { type: "string" },
          password: { type: "string", description: "密码，不传则用工号后 6 位" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_student",
      description: "创建单个学生账号（危险操作，需管理员确认）。",
      parameters: {
        type: "object",
        properties: {
          studentNo: { type: "string", description: "学号（必填，唯一）" },
          name: { type: "string", description: "姓名（必填）" },
          classId: { type: "string" },
          gender: { type: "string", enum: ["male", "female", "unknown"] },
          phone: { type: "string" },
          idCard: { type: "string" },
          notes: { type: "string" },
        },
        required: ["studentNo", "name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "reset_teacher_password",
      description: "重置教师密码为工号后 6 位（危险操作，需管理员确认）。",
      parameters: {
        type: "object",
        properties: {
          teacherId: { type: "string", description: "教师 ID（必填）" },
        },
        required: ["teacherId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "reset_student_password",
      description: "重置学生密码为学号后 6 位（危险操作，需管理员确认）。",
      parameters: {
        type: "object",
        properties: {
          studentId: { type: "string", description: "学生 ID（必填）" },
        },
        required: ["studentId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "toggle_user_status",
      description: "启用/停用教师或学生账号（危险操作，需管理员确认）。",
      parameters: {
        type: "object",
        properties: {
          userType: { type: "string", enum: ["teacher", "student"], description: "用户类型" },
          userId: { type: "string", description: "用户 ID" },
          active: { type: "boolean", description: "true=启用，false=停用" },
        },
        required: ["userType", "userId", "active"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_announcement",
      description: "发布一条新公告（危险操作，需管理员确认）。公告将在前台展示。",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "公告标题（必填）" },
          content: { type: "string", description: "公告内容，支持 HTML（必填）" },
        },
        required: ["title", "content"],
      },
    },
  },
  // ---------- 扩展查询类（safe） ----------
  {
    type: "function" as const,
    function: {
      name: "query_buildings",
      description: "查询教学楼列表。",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "query_classrooms",
      description: "查询教室列表（按教学楼筛选）。",
      parameters: {
        type: "object",
        properties: {
          buildingId: { type: "string", description: "教学楼 ID（可选）" },
          status: {
            type: "string",
            enum: ["pending", "approved", "rejected", "all"],
            description: "审批状态筛选，默认 all",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "query_domains",
      description: "查询站点绑定的域名列表及 SSL 证书状态。",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "query_exam_students",
      description: "查询某场考试的考生名单（含座位号、状态、成绩）。",
      parameters: {
        type: "object",
        properties: {
          examId: { type: "string", description: "考试 ID（必填）" },
        },
        required: ["examId"],
      },
    },
  },
  // ---------- 编辑类（dangerous，需确认） ----------
  {
    type: "function" as const,
    function: {
      name: "edit_exam",
      description: "修改考试信息（危险操作，需管理员确认）。只需传入要修改的字段，未传字段保持不变。",
      parameters: {
        type: "object",
        properties: {
          examId: { type: "string", description: "考试 ID（必填）" },
          subject: { type: "string" },
          examDate: { type: "string", description: "ISO 8601" },
          duration: { type: "number", description: "分钟" },
          location: { type: "string" },
          invigilator: { type: "string" },
          notes: { type: "string" },
          isActive: { type: "boolean", description: "是否启用" },
        },
        required: ["examId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "edit_teacher",
      description: "修改教师信息（危险操作，需管理员确认）。只需传入要修改的字段。",
      parameters: {
        type: "object",
        properties: {
          teacherId: { type: "string", description: "教师 ID（必填）" },
          name: { type: "string" },
          teacherNo: { type: "string", description: "工号（唯一）" },
          phone: { type: "string" },
          email: { type: "string" },
          notes: { type: "string" },
        },
        required: ["teacherId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "edit_student",
      description: "修改学生信息（危险操作，需管理员确认）。只需传入要修改的字段。",
      parameters: {
        type: "object",
        properties: {
          studentId: { type: "string", description: "学生 ID（必填）" },
          name: { type: "string" },
          studentNo: { type: "string", description: "学号（唯一）" },
          classId: { type: "string" },
          gender: { type: "string", enum: ["male", "female", "unknown"] },
          phone: { type: "string" },
          idCard: { type: "string" },
          notes: { type: "string" },
        },
        required: ["studentId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "assign_head_teacher",
      description: "为班级分配或更换班主任（危险操作，需管理员确认）。",
      parameters: {
        type: "object",
        properties: {
          classId: { type: "string", description: "班级 ID（必填）" },
          teacherId: { type: "string", description: "教师 ID（必填，传 0 或空字符串表示取消班主任）" },
        },
        required: ["classId", "teacherId"],
      },
    },
  },
];

// ==================== 工具执行器 ====================

/**
 * 执行 AI 工具调用
 * @param name 工具名
 * @param args 工具参数（JSON 对象）
 * @returns 工具执行结果（JSON 字符串）
 */
export async function executeAiTool(
  name: string,
  args: Record<string, any>
): Promise<string> {
  try {
    switch (name) {
      case "query_exams":
        return JSON.stringify(await toolQueryExams(args));
      case "query_teachers":
        return JSON.stringify(await toolQueryTeachers(args));
      case "query_students":
        return JSON.stringify(await toolQueryStudents(args));
      case "query_classes":
        return JSON.stringify(await toolQueryClasses(args));
      case "query_stats":
        return JSON.stringify(await toolQueryStats());
      case "query_audit_logs":
        return JSON.stringify(await toolQueryAuditLogs(args));
      case "query_abnormal_logins":
        return JSON.stringify(await toolQueryAbnormalLogins(args));
      case "query_ip_blacklist":
        return JSON.stringify(await toolQueryIpBlacklist());
      case "query_system_health":
        return JSON.stringify(await toolQuerySystemHealth());
      case "create_exam":
        return JSON.stringify(await toolCreateExam(args as any));
      case "import_teachers":
        return JSON.stringify(await toolImportTeachers(args as any));
      case "import_students":
        return JSON.stringify(await toolImportStudents(args as any));
      case "create_class":
        return JSON.stringify(await toolCreateClass(args as any));
      case "create_teacher":
        return JSON.stringify(await toolCreateTeacher(args as any));
      case "create_student":
        return JSON.stringify(await toolCreateStudent(args as any));
      case "reset_teacher_password":
        return JSON.stringify(await toolResetTeacherPassword(args as any));
      case "reset_student_password":
        return JSON.stringify(await toolResetStudentPassword(args as any));
      case "toggle_user_status":
        return JSON.stringify(await toolToggleUserStatus(args as any));
      case "create_announcement":
        return JSON.stringify(await toolCreateAnnouncement(args as any));
      // 扩展查询类
      case "query_buildings":
        return JSON.stringify(await toolQueryBuildings());
      case "query_classrooms":
        return JSON.stringify(await toolQueryClassrooms(args as any));
      case "query_domains":
        return JSON.stringify(await toolQueryDomains());
      case "query_exam_students":
        return JSON.stringify(await toolQueryExamStudents(args as any));
      // 编辑类
      case "edit_exam":
        return JSON.stringify(await toolEditExam(args as any));
      case "edit_teacher":
        return JSON.stringify(await toolEditTeacher(args as any));
      case "edit_student":
        return JSON.stringify(await toolEditStudent(args as any));
      case "assign_head_teacher":
        return JSON.stringify(await toolAssignHeadTeacher(args as any));
      default:
        return JSON.stringify({
          success: false,
          error: `未知工具: ${name}。注意：删除系统内容等危险操作 AI 不提供，请管理员手动处理。`,
        });
    }
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      error: localizeMysqlError(error, "工具执行失败"),
    });
  }
}

// ==================== 查询工具实现 ====================

async function toolQueryExams(args: {
  search?: string;
  status?: string;
  limit?: number;
}) {
  const { search, status } = args;
  // 安全修复：强制转换为整数，防止 AI 传入字符串/浮点数导致
  // prepared statement 参数类型不匹配（Incorrect arguments to mysqld_stmt_execute）
  const limit = safeInt(args.limit, 50, 200);
  const conditions: string[] = [];
  const params: any[] = [];

  if (search) {
    conditions.push("(subject LIKE ? OR location LIKE ? OR invigilator LIKE ?)");
    const p = likePattern(search);
    params.push(p, p, p);
  }

  if (status && status !== "all") {
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    if (status === "upcoming") {
      conditions.push("exam_date > ?");
      params.push(now);
    } else if (status === "ongoing") {
      conditions.push("exam_date <= ? AND DATE_ADD(exam_date, INTERVAL duration MINUTE) > ?");
      params.push(now, now);
    } else if (status === "ended") {
      conditions.push("DATE_ADD(exam_date, INTERVAL duration MINUTE) <= ?");
      params.push(now);
    }
  }

  let sql = "SELECT * FROM exams";
  if (conditions.length > 0) sql += " WHERE " + conditions.join(" AND ");
  // LIMIT 直接拼接已校验的整数，避免 prepared statement 类型问题
  sql += ` ORDER BY exam_date ASC LIMIT ${limit}`;

  const [rows] = await pool.execute(sql, params);
  const list = (rows as any[]).map((r) => ({
    id: String(r.id),
    subject: r.subject,
    examDate: r.exam_date instanceof Date ? r.exam_date.toISOString() : r.exam_date,
    duration: r.duration,
    location: r.location,
    invigilator: r.invigilator,
    notes: r.notes || "",
  }));
  return { success: true, total: list.length, exams: list };
}

async function toolQueryTeachers(args: { search?: string; limit?: number }) {
  const { search } = args;
  const limit = safeInt(args.limit, 50, 200);
  const conditions: string[] = [];
  const params: any[] = [];

  if (search) {
    conditions.push("(name LIKE ? OR teacher_no LIKE ?)");
    const p = likePattern(search);
    params.push(p, p);
  }

  let sql = `SELECT t.*, tr.name as role_name
             FROM teachers t
             LEFT JOIN teacher_roles tr ON t.role_id = tr.id`;
  if (conditions.length > 0) sql += " WHERE " + conditions.join(" AND ");
  sql += ` ORDER BY t.created_at DESC LIMIT ${limit}`;

  const [rows] = await pool.execute(sql, params);
  const list = (rows as any[]).map((r) => ({
    id: String(r.id),
    teacherNo: r.teacher_no || "",
    name: r.name,
    roleName: r.role_name || "",
    phone: r.phone || "",
    email: r.email || "",
    notes: r.notes || "",
    isActive: Boolean(r.is_active),
  }));
  return { success: true, total: list.length, teachers: list };
}

async function toolQueryStudents(args: {
  search?: string;
  classId?: string;
  page?: number;
  pageSize?: number;
}) {
  const { search, classId } = args;
  // 强制整数转换，避免 prepared statement 类型问题
  const pageSize = safeInt(args.pageSize, 20, 200);
  const page = Math.max(safeInt(args.page, 1, 10000), 1);
  const conditions: string[] = [];
  const params: any[] = [];

  if (search) {
    conditions.push("(s.name LIKE ? OR s.student_no LIKE ?)");
    const p = likePattern(search);
    params.push(p, p);
  }
  if (classId) {
    conditions.push("s.class_id = ?");
    params.push(classId);
  }

  let whereClause = "";
  if (conditions.length > 0) whereClause = " WHERE " + conditions.join(" AND ");

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) as total FROM students s${whereClause}`,
    params
  );
  const total = (countRows as any[])[0].total;

  const offset = (page - 1) * pageSize;
  const [rows] = await pool.execute(
    `SELECT s.*, c.name as class_name
     FROM students s
     LEFT JOIN classes c ON s.class_id = c.id
     ${whereClause}
     ORDER BY s.created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    params
  );

  const list = (rows as any[]).map((r) => ({
    id: String(r.id),
    studentNo: r.student_no,
    name: r.name,
    classId: r.class_id ? String(r.class_id) : null,
    className: r.class_name || "",
    gender: r.gender,
    status: r.status,
    phone: r.phone || "",
  }));

  return {
    success: true,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    students: list,
  };
}

async function toolQueryClasses(args: { search?: string }) {
  const { search } = args;
  const conditions: string[] = [];
  const params: any[] = [];

  if (search) {
    conditions.push("(c.name LIKE ? OR c.grade LIKE ?)");
    const p = likePattern(search);
    params.push(p, p);
  }

  let sql = `SELECT c.*, t.name as head_teacher_name,
             (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) as student_count
             FROM classes c
             LEFT JOIN teachers t ON c.head_teacher_id = t.id`;
  if (conditions.length > 0) sql += " WHERE " + conditions.join(" AND ");
  sql += " ORDER BY c.id ASC";

  const [rows] = await pool.execute(sql, params);
  const list = (rows as any[]).map((r) => ({
    id: String(r.id),
    name: r.name,
    grade: r.grade || "",
    headTeacherId: r.head_teacher_id ? String(r.head_teacher_id) : null,
    headTeacherName: r.head_teacher_name || "",
    studentCount: r.student_count,
  }));
  return { success: true, total: list.length, classes: list };
}

async function toolQueryStats() {
  const [examRows] = await pool.execute("SELECT COUNT(*) as total FROM exams");
  const [teacherRows] = await pool.execute("SELECT COUNT(*) as total FROM teachers");
  const [studentRows] = await pool.execute("SELECT COUNT(*) as total FROM students");
  const [classRows] = await pool.execute("SELECT COUNT(*) as total FROM classes");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [todayExams] = await pool.execute(
    "SELECT COUNT(*) as total FROM exams WHERE exam_date BETWEEN ? AND ?",
    [todayStart, todayEnd]
  );

  // 待审核异常登录数
  let pendingAbnormal = 0;
  try {
    const [abn] = await pool.execute(
      "SELECT COUNT(*) as total FROM classroom_login_logs WHERE is_abnormal = 1 AND review_status = 'pending'"
    );
    pendingAbnormal = (abn as any[])[0].total;
  } catch {
    // 表可能不存在
  }

  // IP 黑名单数
  let ipBlacklistCount = 0;
  try {
    const [ipb] = await pool.execute("SELECT COUNT(*) as total FROM ip_blacklist WHERE is_active = 1");
    ipBlacklistCount = (ipb as any[])[0].total;
  } catch {
    // 表可能不存在
  }

  return {
    success: true,
    stats: {
      examTotal: (examRows as any[])[0].total,
      teacherTotal: (teacherRows as any[])[0].total,
      studentTotal: (studentRows as any[])[0].total,
      classTotal: (classRows as any[])[0].total,
      todayExamCount: (todayExams as any[])[0].total,
      pendingAbnormalLogins: pendingAbnormal,
      ipBlacklistCount,
    },
  };
}

async function toolQueryAuditLogs(args: {
  action?: string;
  adminId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const { action, adminId, startDate, endDate } = args;
  const limit = safeInt(args.limit, 30, 100);
  const conditions: string[] = [];
  const params: any[] = [];

  if (action) {
    conditions.push("action = ?");
    params.push(action);
  }
  if (adminId) {
    conditions.push("admin_id = ?");
    params.push(adminId);
  }
  if (startDate) {
    conditions.push("created_at >= ?");
    params.push(startDate);
  }
  if (endDate) {
    conditions.push("created_at <= ?");
    params.push(endDate);
  }

  let sql = "SELECT * FROM admin_logs";
  if (conditions.length > 0) sql += " WHERE " + conditions.join(" AND ");
  sql += ` ORDER BY created_at DESC LIMIT ${limit}`;

  const [rows] = await pool.execute(sql, params);
  const list = (rows as any[]).map((r) => ({
    id: String(r.id),
    adminUsername: r.admin_username,
    action: r.action,
    details: r.details ? (() => { try { return JSON.parse(r.details); } catch { return r.details; } })() : null,
    ipAddress: r.ip_address || "",
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  }));
  return { success: true, total: list.length, logs: list };
}

async function toolQueryAbnormalLogins(args: {
  reviewStatus?: string;
  limit?: number;
}) {
  const reviewStatus = args.reviewStatus ?? "pending";
  const limit = safeInt(args.limit, 30, 100);
  const conditions: string[] = ["is_abnormal = 1"];
  const params: any[] = [];

  if (reviewStatus !== "all") {
    conditions.push("review_status = ?");
    params.push(reviewStatus);
  }

  const sql = `SELECT * FROM classroom_login_logs
               WHERE ${conditions.join(" AND ")}
               ORDER BY created_at DESC LIMIT ${limit}`;

  try {
    const [rows] = await pool.execute(sql, params);
    const list = (rows as any[]).map((r) => ({
      id: String(r.id),
      classroomId: r.classroom_id ? String(r.classroom_id) : null,
      ipAddress: r.ip_address || "",
      userAgent: r.user_agent || "",
      status: r.status,
      abnormalReason: r.abnormal_reason || "",
      reviewStatus: r.review_status,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    }));
    return { success: true, total: list.length, logins: list };
  } catch (error: any) {
    return {
      success: false,
      error: localizeMysqlError(error, "查询异常登录失败"),
    };
  }
}

async function toolQueryIpBlacklist() {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM ip_blacklist ORDER BY created_at DESC LIMIT 100"
    );
    const list = (rows as any[]).map((r) => ({
      id: String(r.id),
      ipAddress: r.ip_address || r.ip || "",
      reason: r.reason || "",
      isActive: Boolean(r.is_active ?? r.active ?? 1),
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    }));
    return { success: true, total: list.length, blacklist: list };
  } catch (error: any) {
    return {
      success: false,
      error: localizeMysqlError(error, "查询 IP 黑名单失败"),
    };
  }
}

async function toolQuerySystemHealth() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = Math.round((usedMem / totalMem) * 1000) / 10;

  // 计算总 CPU 使用率
  let totalIdle = 0;
  let totalTick = 0;
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += (cpu.times as any)[type];
    }
    totalIdle += cpu.times.idle;
  }
  const cpuUsage = Math.round(((totalTick - totalIdle) / totalTick) * 1000) / 10;

  // 数据库连接检测
  let dbStatus = "ok";
  try {
    await pool.execute("SELECT 1");
  } catch (e: any) {
    dbStatus = localizeMysqlError(e, "数据库连接异常");
  }

  return {
    success: true,
    health: {
      cpu: {
        usage: cpuUsage,
        cores: cpus.length,
        model: cpus[0]?.model || "unknown",
      },
      memory: {
        total: Math.round(totalMem / 1024 / 1024 / 1024 * 100) / 100,
        used: Math.round(usedMem / 1024 / 1024 / 1024 * 100) / 100,
        free: Math.round(freeMem / 1024 / 1024 / 1024 * 100) / 100,
        usagePercent: memUsagePercent,
      },
      uptime: Math.round(os.uptime()),
      loadAvg: os.loadavg(),
      platform: process.platform,
      nodeVersion: process.version,
      database: dbStatus,
    },
  };
}

// ==================== 写入工具实现 ====================

async function toolCreateExam(args: {
  subject: string;
  examDate: string;
  duration: number;
  location: string;
  invigilator: string;
  notes?: string;
}) {
  const { subject, examDate, duration, location, invigilator, notes } = args;

  if (!subject || !examDate || !duration || !location || !invigilator) {
    return { success: false, error: "缺少必填字段（subject/examDate/duration/location/invigilator）" };
  }

  const safeSubject = sanitizeText(subject);
  const safeLocation = sanitizeText(location);
  const safeInvigilator = sanitizeText(invigilator);
  const safeNotes = sanitizeText(notes || "");

  const examDateObj = new Date(examDate);
  if (isNaN(examDateObj.getTime())) {
    return { success: false, error: "examDate 格式无效，需为 ISO 8601" };
  }

  const [result] = await pool.execute(
    `INSERT INTO exams (subject, exam_date, duration, location, invigilator, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [safeSubject, examDateObj, duration, safeLocation, safeInvigilator, safeNotes]
  );

  return {
    success: true,
    examId: String((result as any).insertId),
    message: `考试「${safeSubject}」创建成功`,
  };
}

async function toolImportTeachers(args: {
  teachers: Array<{
    name: string;
    teacherNo?: string;
    phone?: string;
    email?: string;
    notes?: string;
    password?: string;
  }>;
}) {
  const { teachers } = args;
  if (!Array.isArray(teachers) || teachers.length === 0) {
    return { success: false, error: "teachers 数组为空" };
  }

  const results: Array<{ index: number; success: boolean; error?: string; teacherNo?: string }> = [];
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < teachers.length; i++) {
    const t = teachers[i];
    try {
      if (!t.name || !t.name.trim()) {
        failedCount++;
        results.push({ index: i, success: false, error: "缺少姓名" });
        continue;
      }

      const teacherNo = t.teacherNo?.trim() || null;
      if (teacherNo) {
        const [existing] = await pool.execute(
          "SELECT id FROM teachers WHERE teacher_no = ?",
          [teacherNo]
        );
        if ((existing as any[]).length > 0) {
          failedCount++;
          results.push({ index: i, success: false, error: `工号 ${teacherNo} 已存在`, teacherNo });
          continue;
        }
      }

      const rawPwd = t.password || (teacherNo ? teacherNo.slice(-6) : null);
      const hashedPwd = rawPwd ? await bcrypt.hash(rawPwd, 10) : null;

      await pool.execute(
        `INSERT INTO teachers (teacher_no, password, name, phone, email, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          teacherNo,
          hashedPwd,
          sanitizeText(t.name.trim()),
          t.phone?.trim() || null,
          t.email?.trim() || null,
          t.notes ? sanitizeText(t.notes) : null,
        ]
      );

      successCount++;
      results.push({ index: i, success: true, teacherNo: teacherNo || "" });
    } catch (e: any) {
      failedCount++;
      results.push({ index: i, success: false, error: localizeMysqlError(e, "教师导入失败") });
    }
  }

  return {
    success: true,
    summary: { total: teachers.length, success: successCount, failed: failedCount },
    results,
  };
}

async function toolImportStudents(args: {
  classId?: string;
  students: Array<{
    studentNo: string;
    name: string;
    gender?: string;
    phone?: string;
    idCard?: string;
    notes?: string;
  }>;
}) {
  const { classId, students } = args;
  if (!Array.isArray(students) || students.length === 0) {
    return { success: false, error: "students 数组为空" };
  }

  let resolvedClassId: number | null = null;
  if (classId) {
    const [cls] = await pool.execute("SELECT id FROM classes WHERE id = ?", [classId]);
    if ((cls as any[]).length === 0) {
      return { success: false, error: `班级 ID ${classId} 不存在` };
    }
    resolvedClassId = Number(classId);
  }

  const results: Array<{ index: number; success: boolean; error?: string; studentNo?: string }> = [];
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    try {
      if (!s.studentNo || !s.studentNo.trim()) {
        failedCount++;
        results.push({ index: i, success: false, error: "缺少学号" });
        continue;
      }
      if (!s.name || !s.name.trim()) {
        failedCount++;
        results.push({ index: i, success: false, error: "缺少姓名" });
        continue;
      }

      const studentNo = s.studentNo.trim();
      const [existing] = await pool.execute(
        "SELECT id FROM students WHERE student_no = ?",
        [studentNo]
      );
      if ((existing as any[]).length > 0) {
        failedCount++;
        results.push({ index: i, success: false, error: `学号 ${studentNo} 已存在`, studentNo });
        continue;
      }

      const defaultPwd = studentNo.slice(-6);
      const hashedPwd = await bcrypt.hash(defaultPwd, 10);

      const gender: string = ["male", "female", "unknown"].includes(s.gender || "")
        ? (s.gender as string)
        : "unknown";

      await pool.execute(
        `INSERT INTO students (student_no, name, password, class_id, gender, phone, id_card, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          studentNo,
          sanitizeText(s.name.trim()),
          hashedPwd,
          resolvedClassId,
          gender,
          s.phone?.trim() || null,
          s.idCard?.trim() || null,
          s.notes ? sanitizeText(s.notes) : null,
        ]
      );

      successCount++;
      results.push({ index: i, success: true, studentNo });
    } catch (e: any) {
      failedCount++;
      results.push({ index: i, success: false, error: localizeMysqlError(e, "学生导入失败") });
    }
  }

  return {
    success: true,
    summary: { total: students.length, success: successCount, failed: failedCount },
    results,
  };
}

async function toolCreateClass(args: {
  name: string;
  grade?: string;
  headTeacherId?: string;
}) {
  const { name, grade, headTeacherId } = args;

  if (!name || !name.trim()) {
    return { success: false, error: "缺少班级名称" };
  }

  let resolvedHeadTeacherId: number | null = null;
  if (headTeacherId) {
    const [t] = await pool.execute("SELECT id FROM teachers WHERE id = ?", [headTeacherId]);
    if ((t as any[]).length === 0) {
      return { success: false, error: `班主任教师 ID ${headTeacherId} 不存在` };
    }
    resolvedHeadTeacherId = Number(headTeacherId);
  }

  const [result] = await pool.execute(
    "INSERT INTO classes (name, grade, head_teacher_id) VALUES (?, ?, ?)",
    [sanitizeText(name.trim()), grade?.trim() || null, resolvedHeadTeacherId]
  );

  return {
    success: true,
    classId: String((result as any).insertId),
    message: `班级「${name}」创建成功`,
  };
}

async function toolCreateTeacher(args: {
  name: string;
  teacherNo?: string;
  phone?: string;
  email?: string;
  notes?: string;
  password?: string;
}) {
  if (!args.name || !args.name.trim()) {
    return { success: false, error: "缺少姓名" };
  }
  const teacherNo = args.teacherNo?.trim() || null;
  if (teacherNo) {
    const [existing] = await pool.execute(
      "SELECT id FROM teachers WHERE teacher_no = ?",
      [teacherNo]
    );
    if ((existing as any[]).length > 0) {
      return { success: false, error: `工号 ${teacherNo} 已存在` };
    }
  }
  // 密码优先级：用户指定 > 工号后 6 位 > 随机 6 位数字
  // 安全修复：移除 "123456" 弱默认值，改为随机生成
  const rawPwd = args.password || (teacherNo ? teacherNo.slice(-6) : Math.floor(100000 + Math.random() * 900000).toString());
  const hashedPwd = await bcrypt.hash(rawPwd, 10);
  const [result] = await pool.execute(
    `INSERT INTO teachers (teacher_no, password, name, phone, email, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      teacherNo,
      hashedPwd,
      sanitizeText(args.name.trim()),
      args.phone?.trim() || null,
      args.email?.trim() || null,
      args.notes ? sanitizeText(args.notes) : null,
    ]
  );
  return {
    success: true,
    teacherId: String((result as any).insertId),
    message: `教师「${args.name}」创建成功`,
  };
}

async function toolCreateStudent(args: {
  studentNo: string;
  name: string;
  classId?: string;
  gender?: string;
  phone?: string;
  idCard?: string;
  notes?: string;
}) {
  if (!args.studentNo || !args.studentNo.trim()) {
    return { success: false, error: "缺少学号" };
  }
  if (!args.name || !args.name.trim()) {
    return { success: false, error: "缺少姓名" };
  }
  const studentNo = args.studentNo.trim();
  const [existing] = await pool.execute(
    "SELECT id FROM students WHERE student_no = ?",
    [studentNo]
  );
  if ((existing as any[]).length > 0) {
    return { success: false, error: `学号 ${studentNo} 已存在` };
  }

  let classIdNum: number | null = null;
  if (args.classId) {
    const [cls] = await pool.execute("SELECT id FROM classes WHERE id = ?", [args.classId]);
    if ((cls as any[]).length === 0) {
      return { success: false, error: `班级 ID ${args.classId} 不存在` };
    }
    classIdNum = Number(args.classId);
  }

  const defaultPwd = studentNo.slice(-6);
  const hashedPwd = await bcrypt.hash(defaultPwd, 10);
  const gender: string = ["male", "female", "unknown"].includes(args.gender || "")
    ? (args.gender as string)
    : "unknown";

  const [result] = await pool.execute(
    `INSERT INTO students (student_no, name, password, class_id, gender, phone, id_card, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      studentNo,
      sanitizeText(args.name.trim()),
      hashedPwd,
      classIdNum,
      gender,
      args.phone?.trim() || null,
      args.idCard?.trim() || null,
      args.notes ? sanitizeText(args.notes) : null,
    ]
  );
  return {
    success: true,
    studentId: String((result as any).insertId),
    message: `学生「${args.name}」创建成功`,
  };
}

async function toolResetTeacherPassword(args: { teacherId: string }) {
  const [rows] = await pool.execute(
    "SELECT id, teacher_no, name FROM teachers WHERE id = ?",
    [args.teacherId]
  );
  const teachers = rows as any[];
  if (teachers.length === 0) {
    return { success: false, error: `教师 ID ${args.teacherId} 不存在` };
  }
  const t = teachers[0];
  // 有工号 → 工号后 6 位；无工号 → 随机 6 位数字
  // 安全修复：移除 "123456" 弱默认值，改为随机生成
  const newPwd = t.teacher_no ? t.teacher_no.slice(-6) : Math.floor(100000 + Math.random() * 900000).toString();
  const pwdDesc = t.teacher_no ? "工号后 6 位" : "随机 6 位数字（请通知教师本人）";
  const hashed = await bcrypt.hash(newPwd, 10);
  await pool.execute(
    "UPDATE teachers SET password = ?, is_first_login = 1 WHERE id = ?",
    [hashed, args.teacherId]
  );
  return {
    success: true,
    message: `教师「${t.name}」密码已重置为${pwdDesc}`,
  };
}

async function toolResetStudentPassword(args: { studentId: string }) {
  const [rows] = await pool.execute(
    "SELECT id, student_no, name FROM students WHERE id = ?",
    [args.studentId]
  );
  const students = rows as any[];
  if (students.length === 0) {
    return { success: false, error: `学生 ID ${args.studentId} 不存在` };
  }
  const s = students[0];
  // 有学号 → 学号后 6 位；无学号 → 随机 6 位数字
  // 安全修复：移除 "123456" 弱默认值，改为随机生成
  const newPwd = s.student_no ? s.student_no.slice(-6) : Math.floor(100000 + Math.random() * 900000).toString();
  const pwdDesc = s.student_no ? "学号后 6 位" : "随机 6 位数字（请通知学生本人）";
  const hashed = await bcrypt.hash(newPwd, 10);
  await pool.execute(
    "UPDATE students SET password = ?, is_first_login = 1 WHERE id = ?",
    [hashed, args.studentId]
  );
  return {
    success: true,
    message: `学生「${s.name}」密码已重置为${pwdDesc}`,
  };
}

async function toolToggleUserStatus(args: {
  userType: "teacher" | "student";
  userId: string;
  active: boolean;
}) {
  const { userType, userId, active } = args;
  const table = userType === "teacher" ? "teachers" : "students";
  const col = userType === "teacher" ? "is_active" : "status";

  const [rows] = await pool.execute(`SELECT id, name FROM ${table} WHERE id = ?`, [userId]);
  if ((rows as any[]).length === 0) {
    return { success: false, error: `${userType} ID ${userId} 不存在` };
  }
  const name = (rows as any[])[0].name;

  if (userType === "teacher") {
    await pool.execute(`UPDATE teachers SET is_active = ? WHERE id = ?`, [active ? 1 : 0, userId]);
  } else {
    await pool.execute(`UPDATE students SET status = ? WHERE id = ?`, [
      active ? "active" : "suspended",
      userId,
    ]);
  }

  return {
    success: true,
    message: `${userType === "teacher" ? "教师" : "学生"}「${name}」已${active ? "启用" : "停用"}`,
  };
}

async function toolCreateAnnouncement(args: { title: string; content: string }) {
  if (!args.title || !args.title.trim()) {
    return { success: false, error: "缺少公告标题" };
  }
  if (!args.content || !args.content.trim()) {
    return { success: false, error: "缺少公告内容" };
  }
  const safeTitle = sanitizeText(args.title);
  // 安全修复：公告 content 支持 HTML，必须经过 sanitizeHtml 白名单过滤，
  // 防止 AI 生成或用户注入恶意脚本（存储型 XSS）
  const safeContent = sanitizeHtml(args.content);
  const [result] = await pool.execute(
    "INSERT INTO announcements (title, content) VALUES (?, ?)",
    [safeTitle, safeContent]
  );
  return {
    success: true,
    announcementId: String((result as any).insertId),
    message: `公告「${safeTitle}」发布成功`,
  };
}

// ==================== 扩展查询工具实现 ====================

async function toolQueryBuildings() {
  const [rows] = await pool.execute(
    "SELECT b.*, (SELECT COUNT(*) FROM classrooms c WHERE c.building_id = b.id) AS classroom_count FROM buildings b ORDER BY b.id ASC"
  );
  const list = (rows as any[]).map((r) => ({
    id: String(r.id),
    name: r.name,
    classroomCount: r.classroom_count || 0,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  }));
  return { success: true, total: list.length, buildings: list };
}

async function toolQueryClassrooms(args: { buildingId?: string; status?: string }) {
  const { buildingId, status = "all" } = args;
  const conditions: string[] = [];
  const params: any[] = [];
  if (buildingId) {
    conditions.push("c.building_id = ?");
    params.push(buildingId);
  }
  if (status !== "all") {
    conditions.push("c.status = ?");
    params.push(status);
  }
  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
  const [rows] = await pool.execute(
    `SELECT c.id, c.room_number, c.status, c.building_id, b.name AS building_name,
            c.reject_reason, c.created_at
     FROM classrooms c
     LEFT JOIN buildings b ON c.building_id = b.id
     ${where}
     ORDER BY b.name ASC, c.room_number ASC LIMIT 200`,
    params
  );
  const list = (rows as any[]).map((r) => ({
    id: String(r.id),
    roomNumber: r.room_number,
    status: r.status,
    buildingId: r.building_id ? String(r.building_id) : null,
    buildingName: r.building_name || "",
    rejectReason: r.reject_reason || "",
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  }));
  return { success: true, total: list.length, classrooms: list };
}

async function toolQueryDomains() {
  const [rows] = await pool.execute(
    "SELECT * FROM domains ORDER BY is_primary DESC, id ASC LIMIT 100"
  );
  const list = (rows as any[]).map((r) => ({
    id: String(r.id),
    domainName: r.domain_name,
    isPrimary: Boolean(r.is_primary),
    certStatus: r.cert_status,
    certIssuedAt: r.cert_issued_at instanceof Date ? r.cert_issued_at.toISOString() : r.cert_issued_at,
    certExpiresAt: r.cert_expires_at instanceof Date ? r.cert_expires_at.toISOString() : r.cert_expires_at,
    lastCheckedAt: r.last_checked_at instanceof Date ? r.last_checked_at.toISOString() : r.last_checked_at,
    errorMessage: r.error_message || "",
  }));
  return { success: true, total: list.length, domains: list };
}

async function toolQueryExamStudents(args: { examId: string }) {
  const { examId } = args;
  if (!examId) {
    return { success: false, error: "缺少 examId" };
  }
  const [rows] = await pool.execute(
    `SELECT es.id, es.exam_id, es.classroom_id, es.student_id, es.seat_number, es.score, es.status,
            s.name AS student_name, s.student_no,
            c.room_number AS classroom_room
     FROM exam_students es
     LEFT JOIN students s ON es.student_id = s.id
     LEFT JOIN classrooms c ON es.classroom_id = c.id
     WHERE es.exam_id = ?
     ORDER BY es.seat_number ASC, s.student_no ASC
     LIMIT 500`,
    [examId]
  );
  const list = (rows as any[]).map((r) => ({
    id: String(r.id),
    examId: String(r.exam_id),
    studentId: String(r.student_id),
    studentName: r.student_name || "",
    studentNo: r.student_no || "",
    classroomId: r.classroom_id ? String(r.classroom_id) : null,
    classroomRoom: r.classroom_room || "",
    seatNumber: r.seat_number || "",
    score: r.score !== null ? Number(r.score) : null,
    status: r.status,
  }));
  return { success: true, total: list.length, examStudents: list };
}

// ==================== 编辑工具实现 ====================

async function toolEditExam(args: {
  examId: string;
  subject?: string;
  examDate?: string;
  duration?: number;
  location?: string;
  invigilator?: string;
  notes?: string;
  isActive?: boolean;
}) {
  const { examId } = args;
  if (!examId) return { success: false, error: "缺少 examId" };

  const [rows] = await pool.execute("SELECT * FROM exams WHERE id = ?", [examId]);
  if ((rows as any[]).length === 0) {
    return { success: false, error: `考试 ID ${examId} 不存在` };
  }

  const fields: string[] = [];
  const params: any[] = [];
  if (args.subject !== undefined) {
    fields.push("subject = ?");
    params.push(sanitizeText(args.subject));
  }
  if (args.examDate !== undefined) {
    const d = new Date(args.examDate);
    if (isNaN(d.getTime())) return { success: false, error: "examDate 格式无效" };
    fields.push("exam_date = ?");
    params.push(d);
  }
  if (args.duration !== undefined) {
    fields.push("duration = ?");
    params.push(args.duration);
  }
  if (args.location !== undefined) {
    fields.push("location = ?");
    params.push(sanitizeText(args.location));
  }
  if (args.invigilator !== undefined) {
    fields.push("invigilator = ?");
    params.push(sanitizeText(args.invigilator));
  }
  if (args.notes !== undefined) {
    fields.push("notes = ?");
    params.push(sanitizeText(args.notes));
  }
  if (args.isActive !== undefined) {
    fields.push("is_active = ?");
    params.push(args.isActive ? 1 : 0);
  }
  if (fields.length === 0) {
    return { success: false, error: "未提供要修改的字段" };
  }
  params.push(examId);
  await pool.execute(`UPDATE exams SET ${fields.join(", ")} WHERE id = ?`, params);
  return { success: true, message: `考试 #${examId} 已更新 ${fields.length} 个字段` };
}

async function toolEditTeacher(args: {
  teacherId: string;
  name?: string;
  teacherNo?: string;
  phone?: string;
  email?: string;
  notes?: string;
}) {
  const { teacherId } = args;
  if (!teacherId) return { success: false, error: "缺少 teacherId" };

  const [rows] = await pool.execute("SELECT id FROM teachers WHERE id = ?", [teacherId]);
  if ((rows as any[]).length === 0) {
    return { success: false, error: `教师 ID ${teacherId} 不存在` };
  }

  // 工号唯一性校验
  if (args.teacherNo !== undefined && args.teacherNo.trim()) {
    const [dup] = await pool.execute(
      "SELECT id FROM teachers WHERE teacher_no = ? AND id != ?",
      [args.teacherNo.trim(), teacherId]
    );
    if ((dup as any[]).length > 0) {
      return { success: false, error: `工号 ${args.teacherNo} 已被其他教师占用` };
    }
  }

  const fields: string[] = [];
  const params: any[] = [];
  if (args.name !== undefined) { fields.push("name = ?"); params.push(sanitizeText(args.name.trim())); }
  if (args.teacherNo !== undefined) { fields.push("teacher_no = ?"); params.push(args.teacherNo.trim() || null); }
  if (args.phone !== undefined) { fields.push("phone = ?"); params.push(args.phone.trim() || null); }
  if (args.email !== undefined) { fields.push("email = ?"); params.push(args.email.trim() || null); }
  if (args.notes !== undefined) { fields.push("notes = ?"); params.push(sanitizeText(args.notes)); }
  if (fields.length === 0) {
    return { success: false, error: "未提供要修改的字段" };
  }
  params.push(teacherId);
  await pool.execute(`UPDATE teachers SET ${fields.join(", ")} WHERE id = ?`, params);
  return { success: true, message: `教师 #${teacherId} 已更新 ${fields.length} 个字段` };
}

async function toolEditStudent(args: {
  studentId: string;
  name?: string;
  studentNo?: string;
  classId?: string;
  gender?: string;
  phone?: string;
  idCard?: string;
  notes?: string;
}) {
  const { studentId } = args;
  if (!studentId) return { success: false, error: "缺少 studentId" };

  const [rows] = await pool.execute("SELECT id FROM students WHERE id = ?", [studentId]);
  if ((rows as any[]).length === 0) {
    return { success: false, error: `学生 ID ${studentId} 不存在` };
  }

  if (args.studentNo !== undefined && args.studentNo.trim()) {
    const [dup] = await pool.execute(
      "SELECT id FROM students WHERE student_no = ? AND id != ?",
      [args.studentNo.trim(), studentId]
    );
    if ((dup as any[]).length > 0) {
      return { success: false, error: `学号 ${args.studentNo} 已被其他学生占用` };
    }
  }
  if (args.classId !== undefined && args.classId.trim()) {
    const [cls] = await pool.execute("SELECT id FROM classes WHERE id = ?", [args.classId]);
    if ((cls as any[]).length === 0) {
      return { success: false, error: `班级 ID ${args.classId} 不存在` };
    }
  }

  const fields: string[] = [];
  const params: any[] = [];
  if (args.name !== undefined) { fields.push("name = ?"); params.push(sanitizeText(args.name.trim())); }
  if (args.studentNo !== undefined) { fields.push("student_no = ?"); params.push(args.studentNo.trim()); }
  if (args.classId !== undefined) { fields.push("class_id = ?"); params.push(args.classId.trim() || null); }
  if (args.gender !== undefined) {
    const g = ["male", "female", "unknown"].includes(args.gender) ? args.gender : "unknown";
    fields.push("gender = ?"); params.push(g);
  }
  if (args.phone !== undefined) { fields.push("phone = ?"); params.push(args.phone.trim() || null); }
  if (args.idCard !== undefined) { fields.push("id_card = ?"); params.push(args.idCard.trim() || null); }
  if (args.notes !== undefined) { fields.push("notes = ?"); params.push(sanitizeText(args.notes)); }
  if (fields.length === 0) {
    return { success: false, error: "未提供要修改的字段" };
  }
  params.push(studentId);
  await pool.execute(`UPDATE students SET ${fields.join(", ")} WHERE id = ?`, params);
  return { success: true, message: `学生 #${studentId} 已更新 ${fields.length} 个字段` };
}

async function toolAssignHeadTeacher(args: { classId: string; teacherId: string }) {
  const { classId, teacherId } = args;
  if (!classId) return { success: false, error: "缺少 classId" };

  const [cls] = await pool.execute("SELECT id, name FROM classes WHERE id = ?", [classId]);
  if ((cls as any[]).length === 0) {
    return { success: false, error: `班级 ID ${classId} 不存在` };
  }
  const className = (cls as any[])[0].name;

  // teacherId 为 0 或空 → 取消班主任
  const tid = String(teacherId || "").trim();
  if (tid === "0" || tid === "") {
    await pool.execute("UPDATE classes SET head_teacher_id = NULL WHERE id = ?", [classId]);
    return { success: true, message: `班级「${className}」已取消班主任` };
  }

  const [t] = await pool.execute(
    "SELECT id, name FROM teachers WHERE id = ? AND is_active = 1",
    [tid]
  );
  if ((t as any[]).length === 0) {
    return { success: false, error: `教师 ID ${tid} 不存在或已停用` };
  }
  const teacherName = (t as any[])[0].name;

  await pool.execute("UPDATE classes SET head_teacher_id = ? WHERE id = ?", [tid, classId]);
  return {
    success: true,
    message: `班级「${className}」班主任已设置为「${teacherName}」`,
  };
}
