import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from '../config/firebaseConfig';

// نفس مشروع Firebase الذي تستخدمه لوحة التحكم (water-retention)
// الوصلات صارت تُرفع على Cloudinary، فلا حاجة لـ Firebase Storage هنا.
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
