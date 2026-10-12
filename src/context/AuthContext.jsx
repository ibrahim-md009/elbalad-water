import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import { COLLECTIONS } from "../config/app";

const AuthContext = createContext(null);

/**
 * حالة تسجيل دخول الزائر:
 * status: loading | anon | authed
 * profile: وثيقة users/{uid} (الاسم، الهاتف، weeklyBookingLimit...)
 *
 * البروفايل بيتتابع لحظيًا (onSnapshot) بدل جلبه مرة واحدة، عشان
 * لما الوثيقة تتكتب بعد التسجيل الجديد أو المسؤول يعدّل الحد الأسبوعي
 * القيمة تتحدّث تلقائيًا من غير ريفريش.
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: "loading", user: null, profile: null });

  useEffect(() => {
    let unsubProfile = () => {};

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubProfile();
      unsubProfile = () => {};

      if (!user) {
        setState({ status: "anon", user: null, profile: null });
        return;
      }

      unsubProfile = onSnapshot(
        doc(db, COLLECTIONS.users, user.uid),
        (snap) => {
          setState({
            status: "authed",
            user,
            profile: snap.exists() ? { id: snap.id, ...snap.data() } : null,
          });
        },
        (err) => {
          // فشل جلب الوثيقة لا يمنع بقاء المستخدم مسجلًا
          console.error("[AuthContext] فشل قراءة users/" + user.uid, err.code, err.message);
          setState({ status: "authed", user, profile: null });
        },
      );
    });

    return () => {
      unsubAuth();
      unsubProfile();
    };
  }, []);

  const value = useMemo(() => ({ ...state, logout: () => signOut(auth) }), [state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
