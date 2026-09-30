import { AppError } from './errors';

/** يفشّل العملية برسالة واضحة بدل ما تفضل تحمّل للأبد */
export function withTimeout(promise, ms, message, code = 'timeout') {
  let id;
  const timer = new Promise((_, reject) => {
    id = setTimeout(() => reject(new AppError(message, code)), ms);
  });
  return Promise.race([promise, timer]).finally(() => clearTimeout(id));
}
