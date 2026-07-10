export type TemplateCategory = "exam" | "academic" | "urgent" | "preexam";

export interface AnnouncementTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  title: string;
  content: string;
}

export const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: "exam", label: "考试通知" },
  { value: "academic", label: "教务通知" },
  { value: "urgent", label: "紧急通知" },
  { value: "preexam", label: "考前须知" },
];

export const announcementTemplates: AnnouncementTemplate[] = [
  {
    id: "midterm-exam",
    name: "期中考试通知",
    category: "exam",
    title: "关于202X-202X学年第X学期期中考试的通知",
    content: `
<h2>各位同学：</h2>
<p>根据学校教学工作安排，现将202X-202X学年第X学期期中考试相关事项通知如下：</p>
<h3>一、考试时间</h3>
<p>202X年X月X日 — 202X年X月X日</p>
<h3>二、考试科目</h3>
<ul>
<li>科目一：X月X日 上午 8:00-10:00</li>
<li>科目二：X月X日 下午 14:00-16:00</li>
<li>科目三：X月X日 上午 8:00-10:00</li>
</ul>
<h3>三、考试地点</h3>
<p>各考场安排详见准考证或教务系统查询。</p>
<h3>四、注意事项</h3>
<ol>
<li>请携带学生证、准考证等有效证件参加考试。</li>
<li>提前15分钟到达考场，迟到30分钟不得入场。</li>
<li>严禁携带任何通讯工具及与考试相关的资料进入考场。</li>
<li>遵守考场纪律，诚信应考。</li>
</ol>
<p>特此通知。</p>
<p style="text-align: right;">教务处</p>
<p style="text-align: right;">202X年X月X日</p>
    `.trim(),
  },
  {
    id: "final-exam",
    name: "期末考试安排",
    category: "exam",
    title: "关于202X-202X学年第X学期期末考试安排的通知",
    content: `
<h2>各位同学：</h2>
<p>现将202X-202X学年第X学期期末考试安排通知如下：</p>
<h3>一、考试时间</h3>
<p>202X年X月X日 — 202X年X月X日</p>
<h3>二、考试科目及安排</h3>
<table>
<thead>
<tr><th>日期</th><th>时间</th><th>科目</th><th>地点</th></tr>
</thead>
<tbody>
<tr><td>X月X日</td><td>8:00-10:00</td><td>科目一</td><td>待定</td></tr>
<tr><td>X月X日</td><td>14:00-16:00</td><td>科目二</td><td>待定</td></tr>
<tr><td>X月X日</td><td>8:00-10:00</td><td>科目三</td><td>待定</td></tr>
</tbody>
</table>
<h3>三、相关要求</h3>
<ol>
<li>请同学们认真复习，做好考试准备。</li>
<li>严格遵守考试纪律，杜绝作弊行为。</li>
<li>按时参加考试，不得无故缺考。</li>
<li>如有特殊情况不能参加考试，须提前办理缓考手续。</li>
</ol>
<p>请相互转告。</p>
<p style="text-align: right;">教务处</p>
<p style="text-align: right;">202X年X月X日</p>
    `.trim(),
  },
  {
    id: "exam-rules",
    name: "考前须知（考场规则）",
    category: "preexam",
    title: "考试考场规则与考前须知",
    content: `
<h2>考生考前须知</h2>
<h3>一、入场要求</h3>
<ul>
<li>考生须凭<strong>学生证</strong>和<strong>准考证</strong>进入考场，对号入座。</li>
<li>考试开始前<strong>15分钟</strong>入场，考试开始<strong>30分钟后</strong>不得入场。</li>
<li>考试开始后<strong>30分钟内</strong>不得交卷退场。</li>
</ul>
<h3>二、携带物品规定</h3>
<ul>
<li>可携带：必要的文具（钢笔、铅笔、橡皮、直尺等）。</li>
<li>严禁携带：手机、智能手表、耳机、计算器（非指定科目）、草稿纸等。</li>
<li>随身物品请放在考场指定位置。</li>
</ul>
<h3>三、考场纪律</h3>
<ol>
<li>保持考场安静，不得交头接耳、左顾右盼。</li>
<li>不得传递任何物品，不得偷看他人试卷。</li>
<li>不得要求监考人员解释试题。</li>
<li>如有问题请举手示意。</li>
</ol>
<h3>四、答题要求</h3>
<ul>
<li>在规定位置填写姓名、学号等信息。</li>
<li>字迹工整，卷面整洁。</li>
<li>考试结束铃声响起后立即停笔。</li>
</ul>
<blockquote>
<p>诚信应考，从我做起。祝各位考生取得好成绩！</p>
</blockquote>
    `.trim(),
  },
  {
    id: "cheating-policy",
    name: "作弊处理办法",
    category: "preexam",
    title: "关于考试作弊行为的处理办法",
    content: `
<h2>关于严肃考风考纪、严惩考试作弊的通知</h2>
<p>为维护考试公平公正，严肃考风考纪，根据学校相关规定，现就考试作弊行为的处理办法通知如下：</p>
<h3>一、作弊行为认定</h3>
<p>以下行为均认定为考试作弊：</p>
<ul>
<li>携带与考试内容相关的文字材料或电子设备参加考试</li>
<li>抄袭或协助他人抄袭试题答案</li>
<li>抢夺、窃取他人试卷、答卷</li>
<li>交换试卷、答卷、草稿纸</li>
<li>在答卷上填写与本人身份不符的姓名、考号等信息</li>
<li>传接物品或交换试卷</li>
<li>其他作弊行为</li>
</ul>
<h3>二、处理措施</h3>
<ol>
<li><strong>取消成绩</strong>：该课程考试成绩以零分计。</li>
<li><strong>纪律处分</strong>：视情节轻重给予警告、记过、留校察看直至开除学籍处分。</li>
<li><strong>记录档案</strong>：作弊行为记入学生档案。</li>
<li><strong>取消资格</strong>：取消学位授予资格、评优评先资格。</li>
</ol>
<h3>三、申诉渠道</h3>
<p>如对处理决定有异议，可在收到处理决定之日起5个工作日内向学校申诉委员会提出书面申诉。</p>
<p>请各位同学引以为戒，诚信应考。</p>
<p style="text-align: right;">教务处、学生处</p>
<p style="text-align: right;">202X年X月X日</p>
    `.trim(),
  },
  {
    id: "class-reschedule",
    name: "调课通知",
    category: "academic",
    title: "关于调整XX课程上课时间的通知",
    content: `
<h2>各位同学：</h2>
<p>因教师工作安排调整，现将XX课程上课时间调整如下：</p>
<h3>调整内容</h3>
<table>
<thead>
<tr><th>项目</th><th>原安排</th><th>调整后</th></tr>
</thead>
<tbody>
<tr><td>课程名称</td><td>XXXX</td><td>XXXX</td></tr>
<tr><td>上课时间</td><td>周X 第X-X节</td><td>周X 第X-X节</td></tr>
<tr><td>上课地点</td><td>XXX教室</td><td>XXX教室</td></tr>
<tr><td>生效日期</td><td colspan="2">202X年X月X日起</td></tr>
</tbody>
</table>
<h3>注意事项</h3>
<ul>
<li>请同学们及时调整学习计划，按时上课。</li>
<li>如有疑问，请联系教务处或任课教师。</li>
</ul>
<p>特此通知，请相互转告。</p>
<p style="text-align: right;">教务处</p>
<p style="text-align: right;">202X年X月X日</p>
    `.trim(),
  },
  {
    id: "class-cancel",
    name: "停课通知",
    category: "academic",
    title: "关于XX课程停课的通知",
    content: `
<h2>各位同学：</h2>
<p>因XX原因，经研究决定，XX课程暂停上课，具体安排如下：</p>
<h3>停课信息</h3>
<ul>
<li><strong>课程名称：</strong>XXXX</li>
<li><strong>任课教师：</strong>XXX</li>
<li><strong>停课时间：</strong>202X年X月X日（周X）第X-X节</li>
<li><strong>停课次数：</strong>共X次</li>
</ul>
<h3>后续安排</h3>
<ul>
<li>缺课时数将另行安排补课，具体时间另行通知。</li>
<li>请同学们利用停课时间自主复习，完成课后作业。</li>
<li>如有疑问，请联系任课教师或教务处。</li>
</ul>
<p>特此通知。</p>
<p style="text-align: right;">教务处</p>
<p style="text-align: right;">202X年X月X日</p>
    `.trim(),
  },
  {
    id: "weather-emergency",
    name: "紧急通知（恶劣天气）",
    category: "urgent",
    title: "【紧急】关于恶劣天气停课及考试调整的紧急通知",
    content: `
<h1 style="text-align: center;"><strong>紧急通知</strong></h1>
<h2>各位师生：</h2>
<p>据气象部门预报，受XX天气影响，预计未来24小时内将出现<strong>暴雨/暴雪/台风/高温</strong>等恶劣天气。为保障广大师生生命安全，经学校研究决定：</p>
<h3>一、停课安排</h3>
<ul>
<li><strong>停课时间：</strong>202X年X月X日（全天）</li>
<li><strong>停课范围：</strong>全校所有课程</li>
<li><strong>补课安排：</strong>另行通知</li>
</ul>
<h3>二、考试调整</h3>
<ul>
<li>原定于X月X日的考试<strong>延期举行</strong></li>
<li>补考时间另行通知，请密切关注公告</li>
</ul>
<h3>三、安全提示</h3>
<ol>
<li>尽量减少外出，注意人身安全。</li>
<li>关好门窗，做好防范措施。</li>
<li>注意用电、用气安全。</li>
<li>如遇紧急情况，请及时联系学校值班人员。</li>
</ol>
<p style="color: #ef4444;"><strong>请相互转告，注意安全！</strong></p>
<p style="text-align: right;">学校应急办公室</p>
<p style="text-align: right;">202X年X月X日</p>
    `.trim(),
  },
  {
    id: "score-release",
    name: "成绩公布通知",
    category: "academic",
    title: "关于202X-202X学年第X学期考试成绩公布的通知",
    content: `
<h2>各位同学：</h2>
<p>202X-202X学年第X学期考试成绩已完成评定，现将成绩查询相关事项通知如下：</p>
<h3>一、查询时间</h3>
<p>202X年X月X日 起</p>
<h3>二、查询方式</h3>
<ol>
<li>登录学校教务管理系统</li>
<li>进入"成绩查询"栏目</li>
<li>选择对应学期查看成绩</li>
</ol>
<h3>三、成绩复核</h3>
<p>如对成绩有异议，可在成绩公布后<strong>5个工作日内</strong>申请成绩复核：</p>
<ul>
<li>填写《成绩复核申请表》</li>
<li>提交至所在学院教学办公室</li>
<li>复核结果将在3个工作日内反馈</li>
</ul>
<h3>四、补考安排</h3>
<ul>
<li>不及格课程可参加下学期开学初补考</li>
<li>补考报名时间：202X年X月X日 — X月X日</li>
<li>补考具体安排另行通知</li>
</ul>
<p>祝同学们取得理想成绩！</p>
<p style="text-align: right;">教务处</p>
<p style="text-align: right;">202X年X月X日</p>
    `.trim(),
  },
  {
    id: "parent-meeting",
    name: "家长会通知",
    category: "academic",
    title: "关于召开202X-202X学年第X学期家长会的通知",
    content: `
<h2>尊敬的各位家长：</h2>
<p>您好！</p>
<p>为加强家校沟通，共同促进学生成长，经研究决定召开本学期家长会。现将相关事项通知如下：</p>
<h3>一、会议时间</h3>
<p>202X年X月X日（周X）下午 14:30 — 16:30</p>
<h3>二、会议地点</h3>
<ul>
<li><strong>主会场：</strong>学校大礼堂（年级大会）</li>
<li><strong>分会场：</strong>各班教室（班级家长会）</li>
</ul>
<h3>三、参会人员</h3>
<p>全体学生家长（建议父亲或母亲亲自参加）</p>
<h3>四、会议内容</h3>
<ol>
<li>本学期教育教学工作汇报</li>
<li>学生学习情况反馈</li>
<li>家校共育建议</li>
<li>期末复习指导</li>
<li>个别交流</li>
</ol>
<h3>五、注意事项</h3>
<ul>
<li>请提前15分钟签到入场</li>
<li>请将手机调至静音或震动模式</li>
<li>建议绿色出行，校园内请遵守秩序</li>
<li>如确有特殊情况不能参加，请提前与班主任联系</li>
</ul>
<p>期待您的光临！</p>
<p style="text-align: right;">XX学校</p>
<p style="text-align: right;">202X年X月X日</p>
    `.trim(),
  },
  {
    id: "holiday-schedule",
    name: "放假安排通知",
    category: "academic",
    title: "关于202X年XX节放假安排的通知",
    content: `
<h2>全体师生：</h2>
<p>根据国务院办公厅通知精神，结合学校实际，现将202X年XX节放假安排通知如下：</p>
<h3>一、放假时间</h3>
<p>202X年X月X日（周X）— 202X年X月X日（周X），共X天</p>
<h3>二、调课安排</h3>
<ul>
<li>X月X日（周X）补上X月X日（周X）的课</li>
<li>X月X日（周X）补上X月X日（周X）的课</li>
</ul>
<h3>三、注意事项</h3>
<ol>
<li><strong>安全第一：</strong>注意交通安全、人身安全、财产安全。</li>
<li><strong>离校登记：</strong>离校学生须向辅导员报备。</li>
<li><strong>假期作业：</strong>合理安排学习时间，按时完成作业。</li>
<li><strong>返校时间：</strong>X月X日（周X）晚前返校，X月X日（周X）正常上课。</li>
</ol>
<h3>四、值班安排</h3>
<p>假期各部门安排值班人员，确保校园安全。如有紧急事务，请联系：</p>
<ul>
<li>学校总值班：XXX-XXXXXXX</li>
<li>保卫处：XXX-XXXXXXX</li>
</ul>
<p>祝大家节日快乐！</p>
<p style="text-align: right;">学校办公室</p>
<p style="text-align: right;">202X年X月X日</p>
    `.trim(),
  },
];
