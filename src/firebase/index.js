import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from '../config/firebaseConfig';

// نفس مشروع Firebase الذي تستخدمه لوحة التحكم (water-retention)
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
// الافتراضي 10 دقايق من إعادة المحاولة (وده اللي بيخلي الزرار يفضل يحمّل)
storage.maxUploadRetryTime = 20000;
storage.maxOperationRetryTime = 15000;
