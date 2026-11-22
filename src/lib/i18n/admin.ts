/* SYRIA AI — admin view dictionary (prefix: adm.) */

export const admin = {
  ar: {
    "adm.title": "إدارة النظام",
    "adm.subtitle": "مراقبة المحركات والموارد والسجلات والصلاحيات",

    // engines
    "adm.engines.title": "حالة المحركات",
    "adm.engines.subtitle": "خمسة محركات تشغّل منظومة SYRIA AI المفتوحة",
    "adm.engines.running": "يعمل",
    "adm.engines.runningAria": "المحرك يعمل بشكل طبيعي",
    "adm.engine.models": "محرك النماذج",
    "adm.engine.models.desc": "إدارة تعريفات النماذج وبطاقاتها الفنية",
    "adm.engine.training": "محرك التدريب",
    "adm.engine.training.desc": "جدولة التجارب وضبط المعاملات ومتابعة الخسارة",
    "adm.engine.inference": "محرك الاستدلال",
    "adm.engine.inference.desc": "خدمة التوليد والمحادثة وتدفق النصوص",
    "adm.engine.dataEngine": "محرك البيانات",
    "adm.engine.dataEngine.desc": "جمع البيانات وتنظيفها وتفريغها وترخيصها",
    "adm.engine.platform": "المنصة",
    "adm.engine.platform.desc": "الواجهة والمصادقة والسجلات وواجهات API",
    "adm.engine.version": "الإصدار",

    // infrastructure
    "adm.infra.title": "الموارد البنيوية",
    "adm.infra.subtitle": "استهلاك العتاد في الزمن الحقيقي عبر وحدات التدريب",
    "adm.infra.lastSync": "آخر مزامنة",
    "adm.infra.autoRefresh": "تحديث تلقائي كل 15 ثانية",

    // roles
    "adm.roles.title": "الأدوار والصلاحيات",
    "adm.roles.subtitle": "مصفوفة صلاحيات مبنية على مبدأ الحد الأدنى",
    "adm.roles.col.role": "الدور",
    "adm.roles.col.training": "التدريب",
    "adm.roles.col.data": "البيانات",
    "adm.roles.col.inference": "الاستدلال",
    "adm.roles.col.keys": "المفاتيح",
    "adm.roles.col.settings": "الإعدادات",
    "adm.roles.superAdmin": "مدير أعلى",
    "adm.roles.researchAdmin": "مدير الأبحاث",
    "adm.roles.trainingOp": "مشغّل التدريب",
    "adm.roles.dataReviewer": "مراجع البيانات",
    "adm.roles.developer": "مطوّر",
    "adm.roles.publicUser": "مستخدم عام",
    "adm.roles.granted": "مسموح",
    "adm.roles.denied": "غير مسموح",

    // activity log
    "adm.activity.title": "سجل النشاط",
    "adm.activity.subtitle": "أحدث الأحداث المسجلة في مختلف محركات المنصة",
    "adm.activity.empty": "لا أحداث مسجلة بعد",
    "adm.level.info": "معلومة",
    "adm.level.success": "نجاح",
    "adm.level.warn": "تحذير",
    "adm.level.error": "خطأ",
    "adm.kind.training": "تدريب",
    "adm.kind.data": "بيانات",
    "adm.kind.api": "واجهة",
    "adm.kind.system": "النظام",
    "adm.kind.security": "أمان",
    "adm.kind.inference": "استدلال",

    // transparency
    "adm.transparency.title": "شفافية البيانات",
    "adm.transparency.text":
      "كل الأرقام المعروضة تتبع سجلات التجارب المسجلة في المنصة؛ المحاكاة الحية للتدريب تُشتق من نقطة الأساس الموثقة.",

    // danger zone
    "adm.danger.title": "منطقة الخطر",
    "adm.danger.cardTitle": "إعادة تهيئة البيانات التجريبية",
    "adm.danger.desc":
      "يعيد هذا الإجراء تعبئة قاعدة البيانات بالبيانات التجريبية الأصلية — ستفقد أي تعديلات أو جلسات حديثة أُنشئت أثناء التجربة.",
    "adm.danger.reset": "إعادة التهيئة",
    "adm.danger.dialogTitle": "تأكيد إعادة تهيئة البيانات التجريبية",
    "adm.danger.dialogDesc":
      "سيتم حذف السجلات الحالية واستبدالها بالبيانات التجريبية الأصلية. لا يمكن التراجع عن هذا الإجراء.",
    "adm.danger.confirm": "نعم، أعد التهيئة",
    "adm.danger.busy": "جارٍ إعادة التهيئة...",
    "adm.danger.success": "أُعيدت تهيئة البيانات التجريبية بنجاح",
    "adm.danger.failure": "فشلت إعادة التهيئة",
    "adm.danger.warning": "إجراء لا يمكن التراجع عنه",
  },
  en: {
    "adm.title": "System Administration",
    "adm.subtitle": "Monitor engines, resources, logs, and permissions",

    // engines
    "adm.engines.title": "Engine Status",
    "adm.engines.subtitle": "Five engines powering the open SYRIA AI stack",
    "adm.engines.running": "Running",
    "adm.engines.runningAria": "Engine is running normally",
    "adm.engine.models": "Models Engine",
    "adm.engine.models.desc": "Manages model definitions and their technical cards",
    "adm.engine.training": "Training Engine",
    "adm.engine.training.desc": "Schedules experiments, tuning, and loss tracking",
    "adm.engine.inference": "Inference Engine",
    "adm.engine.inference.desc": "Serves generation, chat, and text streaming",
    "adm.engine.dataEngine": "Data Engine",
    "adm.engine.dataEngine.desc": "Collects, cleans, deduplicates, and licenses data",
    "adm.engine.platform": "Platform",
    "adm.engine.platform.desc": "UI, authentication, logs, and API interfaces",
    "adm.engine.version": "Version",

    // infrastructure
    "adm.infra.title": "Infrastructure",
    "adm.infra.subtitle": "Live hardware utilization across training units",
    "adm.infra.lastSync": "Last sync",
    "adm.infra.autoRefresh": "Auto-refresh every 15s",

    // roles
    "adm.roles.title": "Roles & Permissions",
    "adm.roles.subtitle": "Permission matrix built on the least-privilege principle",
    "adm.roles.col.role": "Role",
    "adm.roles.col.training": "Training",
    "adm.roles.col.data": "Data",
    "adm.roles.col.inference": "Inference",
    "adm.roles.col.keys": "Keys",
    "adm.roles.col.settings": "Settings",
    "adm.roles.superAdmin": "Super Admin",
    "adm.roles.researchAdmin": "Research Admin",
    "adm.roles.trainingOp": "Training Operator",
    "adm.roles.dataReviewer": "Data Reviewer",
    "adm.roles.developer": "Developer",
    "adm.roles.publicUser": "Public User",
    "adm.roles.granted": "Granted",
    "adm.roles.denied": "Denied",

    // activity log
    "adm.activity.title": "Activity Log",
    "adm.activity.subtitle": "Latest events recorded across the platform engines",
    "adm.activity.empty": "No events logged yet",
    "adm.level.info": "Info",
    "adm.level.success": "Success",
    "adm.level.warn": "Warning",
    "adm.level.error": "Error",
    "adm.kind.training": "Training",
    "adm.kind.data": "Data",
    "adm.kind.api": "API",
    "adm.kind.system": "System",
    "adm.kind.security": "Security",
    "adm.kind.inference": "Inference",

    // transparency
    "adm.transparency.title": "Data Transparency",
    "adm.transparency.text":
      "Every figure shown follows the experiment records logged in the platform; the live training simulation is derived from the documented baseline point.",

    // danger zone
    "adm.danger.title": "Danger Zone",
    "adm.danger.cardTitle": "Reset Demo Data",
    "adm.danger.desc":
      "This action reseeds the database with the original demo data — any recent edits or sessions created during the trial will be lost.",
    "adm.danger.reset": "Reset Data",
    "adm.danger.dialogTitle": "Confirm demo data reset",
    "adm.danger.dialogDesc":
      "Current records will be deleted and replaced with the original demo data. This action cannot be undone.",
    "adm.danger.confirm": "Yes, reset data",
    "adm.danger.busy": "Resetting...",
    "adm.danger.success": "Demo data reset successfully",
    "adm.danger.failure": "Reset failed",
    "adm.danger.warning": "This action cannot be undone",
  },
}
