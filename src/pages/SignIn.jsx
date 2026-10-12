import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, LogOut, UserCheck, UserPlus } from "lucide-react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { COLLECTIONS } from "../config/app";
import { normalizePhone, phoneToEmail, phoneToPassword, validatePhone } from "../lib/phone";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const initialForm = { name: "", phone: "" };

/** الشاشة اللي بتظهر لما الزائر يكون مسجل دخول بالفعل */
function AlreadyRegistered({ profile, fallbackPhone, profileError, onLogout }) {
  const navigate = useNavigate();
  return (
    <section className="signin-page">
      <div className="signin-card card">
        <div className="signin-head">
          <span className="signin-icon">
            <UserCheck size={26} aria-hidden="true" />
          </span>
          <div>
            <h1>أنت مسجل دخول ✅</h1>
            <p>أهلًا بك مرة أخرى.</p>
          </div>
        </div>

        <dl className="success-details" style={{ margin: "1.25rem 0" }}>
          <div>
            <dt>الاسم</dt>
            <dd>{profile?.name || "—"}</dd>
          </div>
          <div>
            <dt>رقم الهاتف</dt>
            <dd dir="ltr">{profile?.phone || fallbackPhone || "—"}</dd>
          </div>
          <div>
            <dt>حد الحجوزات الأسبوعي</dt>
            <dd>{profile?.weeklyBookingLimit ?? 1} حجز</dd>
          </div>
        </dl>

        {!profile && profileError && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: "1rem" }}>
            <span>
              تعذّر تحميل بياناتك من الخادم ({profileError}). غالبًا السبب صلاحيات Firestore Rules على مجموعة users.
            </span>
          </div>
        )}

        <div className="stack">
          <button type="button" className="btn btn-primary btn-block" onClick={() => navigate("/")}>
            الذهاب إلى الحجوزات
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={onLogout}>
            <LogOut size={18} aria-hidden="true" /> تسجيل الخروج (ليس أنت؟)
          </button>
        </div>
      </div>
    </section>
  );
}

export default function SignIn() {
  const navigate = useNavigate();
  const toast = useToast();
  const { status, user, profile, profileError, logout } = useAuth();
  const [mode, setMode] = useState("login"); // login | register
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  // بيانات المستخدم اللي لسه مسجلها — بنستخدمها لو الـ profile لسه ماتحمّلش من Firestore
  const [justRegistered, setJustRegistered] = useState(null);

  const isLogin = mode === "login";

  const switchMode = (next) => {
    if (loading || next === mode) return;
    setMode(next);
    // نحتفظ بالهاتف ونفضّي الاسم
    setForm((f) => ({ ...initialForm, phone: f.phone }));
  };

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  /** تسجيل الدخول: رقم الهاتف فقط */
  const handleLogin = async () => {
    const phoneError = validatePhone(form.phone);
    if (phoneError) return toast.error(phoneError);

    setLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, phoneToEmail(form.phone), phoneToPassword(form.phone));

      // لو المسؤول حذف المستخدم من لوحة التحكم، حساب الدخول يفضل موجود لكن وثيقته اتمسحت
      const snap = await getDoc(doc(db, COLLECTIONS.users, user.uid));
      if (!snap.exists()) {
        await signOut(auth);
        toast.error("الرقم ده مش مسجل عندنا (يمكن اتحذف)، أنشئ حساب جديد.");
        setMode("register");
        return;
      }

      toast.success("تم تسجيل الدخول، أهلًا بك! 👋");
      setForm(initialForm);
      navigate("/");
    } catch (err) {
      console.error(err);
      switch (err.code) {
        case "auth/invalid-credential":
        case "auth/user-not-found":
        case "auth/wrong-password":
          toast.error("الرقم ده مش مسجل عندنا، أنشئ حساب جديد الأول.");
          setMode("register");
          break;
        case "auth/invalid-email":
          toast.error("رقم الهاتف غير صالح.");
          break;
        case "auth/too-many-requests":
          toast.error("محاولات كتير، استنى شوية وحاول تاني.");
          break;
        case "auth/network-request-failed":
          toast.error("مشكلة في الاتصال بالإنترنت، حاول تاني.");
          break;
        default:
          toast.error("حصل خطأ أثناء تسجيل الدخول، حاول تاني.");
      }
    } finally {
      setLoading(false);
    }
  };

  /** وثيقة المستخدم: الاسم ورقم الهاتف (+ الدور وحد الحجز). مفيش أي كلمة مرور. */
  const saveProfile = async (uid, name, phone) => {
    const userData = {
      name,
      phone,
      role: "user",
      weeklyBookingLimit: 1, // الافتراضي — المسؤول يعدّله من لوحة التحكم
    };
    await setDoc(doc(db, COLLECTIONS.users, uid), { ...userData, createdAt: serverTimestamp() });
    setJustRegistered(userData);
  };

  /**
   * الرقم له حساب دخول موجود: يا إما مسجل فعلًا (ندخّله)،
   * يا إما المسؤول حذفه من لوحة التحكم (نعيد إنشاء وثيقته بالاسم الجديد).
   */
  const recoverExistingAccount = async (name, phone) => {
    const { user } = await signInWithEmailAndPassword(auth, phoneToEmail(phone), phoneToPassword(phone));
    const snap = await getDoc(doc(db, COLLECTIONS.users, user.uid));
    if (snap.exists()) {
      toast.success("رقمك مسجل بالفعل، تم تسجيل دخولك. 👋");
    } else {
      await saveProfile(user.uid, name, normalizePhone(phone));
      toast.success("تم إنشاء حسابك بنجاح، أهلًا بك! 🎉");
    }
    setForm(initialForm);
    navigate("/");
  };

  /** إنشاء حساب جديد: الاسم ورقم الهاتف فقط */
  const handleRegister = async () => {
    const name = form.name.trim();
    if (name.length < 2) return toast.error("اكتب اسمك بالكامل.");

    const phoneError = validatePhone(form.phone);
    if (phoneError) return toast.error(phoneError);

    setLoading(true);
    let createdUser = null;
    try {
      const phone = normalizePhone(form.phone);
      const { user } = await createUserWithEmailAndPassword(
        auth,
        phoneToEmail(form.phone),
        phoneToPassword(form.phone),
      );
      createdUser = user;

      await saveProfile(user.uid, name, phone);

      toast.success("تم إنشاء حسابك بنجاح، أهلًا بك! 🎉");
      setForm(initialForm);
      navigate("/");
    } catch (err) {
      console.error(err);

      // لو الحساب اتعمل في Auth وفشل حفظ البيانات: نمسحه عشان ما يبقاش حساب بدون بيانات
      if (createdUser && !err.code?.startsWith("auth/")) {
        try {
          await createdUser.delete();
        } catch (delErr) {
          console.error(delErr);
        }
        toast.error("تعذّر حفظ بياناتك، حاول تاني.");
      } else if (err.code === "auth/email-already-in-use") {
        try {
          await recoverExistingAccount(name, form.phone);
        } catch (recErr) {
          console.error(recErr);
          toast.error("الرقم ده مسجل بطريقة قديمة، كلّم الإدارة.");
        }
      } else if (err.code === "auth/invalid-email") {
        toast.error("رقم الهاتف غير صالح.");
      } else if (err.code === "auth/network-request-failed") {
        toast.error("مشكلة في الاتصال بالإنترنت، حاول تاني.");
      } else {
        toast.error("حصل خطأ أثناء إنشاء الحساب، حاول تاني.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;
    return isLogin ? handleLogin() : handleRegister();
  };

  // لو الزائر مسجل دخول: نعرض بياناته بدل الفورم
  // (مش بنعرضها أثناء عملية الدخول/التسجيل نفسها عشان ما تظهرش بيانات فاضية)
  if (status === "authed" && !loading) {
    // رقم الهاتف مشتق من الإيميل الصناعي (phone@user...) كاحتياط لو وثيقة المستخدم لم تُقرأ
    const fallbackPhone = user?.email?.split("@")[0] || "";
    return (
      <AlreadyRegistered
        profile={profile ?? justRegistered}
        fallbackPhone={fallbackPhone}
        profileError={profileError}
        onLogout={logout}
      />
    );
  }

  return (
    <section className="signin-page">
      <div className="signin-card card">
        <div className="signin-head">
          <span className="signin-icon">
            {isLogin ? <LogIn size={26} aria-hidden="true" /> : <UserPlus size={26} aria-hidden="true" />}
          </span>
          <div>
            <h1>{isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}</h1>
            <p>{isLogin ? "ادخل برقم هاتفك المسجل" : "سجّل مرة واحدة باسمك ورقمك وارجع تحجز بضغطة زر"}</p>
          </div>
        </div>

        <div role="tablist" aria-label="طريقة الدخول" style={{ display: "flex", gap: "0.5rem", margin: "1rem 0" }}>
          <button
            type="button"
            role="tab"
            aria-selected={isLogin}
            className={`btn btn-sm ${isLogin ? "btn-primary" : "btn-ghost"}`}
            style={{ flex: 1 }}
            onClick={() => switchMode("login")}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isLogin}
            className={`btn btn-sm ${!isLogin ? "btn-primary" : "btn-ghost"}`}
            style={{ flex: 1 }}
            onClick={() => switchMode("register")}
          >
            حساب جديد
          </button>
        </div>

        <form className="signin-form" onSubmit={handleSubmit} noValidate>
          {!isLogin && (
            <div className="field">
              <label htmlFor="name">الاسم بالكامل</label>
              <input
                id="name"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="مثال: أحمد محمود"
                autoComplete="name"
                required
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="phone">رقم الهاتف</label>
            <input
              id="phone"
              type="tel"
              name="phone"
              dir="ltr"
              value={form.phone}
              onChange={handleChange}
              placeholder="0599 123 456"
              autoComplete="tel"
              required
            />
            {!isLogin && <small className="field-hint">هتسجل دخولك بهذا الرقم لاحقًا.</small>}
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading
              ? isLogin
                ? "جاري تسجيل الدخول..."
                : "جاري إنشاء الحساب..."
              : isLogin
                ? "تسجيل الدخول"
                : "إنشاء الحساب"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1rem" }}>
          {isLogin ? "لا يوجد لديك حساب؟ " : "عندك حساب بالفعل؟ "}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => switchMode(isLogin ? "register" : "login")}
          >
            {isLogin ? "أنشئ حساب جديد" : "سجّل الدخول"}
          </button>
        </p>
      </div>
    </section>
  );
}
