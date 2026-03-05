import React, { createContext, useContext, useEffect, useState } from 'react'

const translations: Record<string, Record<string, string>> = {
  en: {
    signIn: 'Sign in',
    signUp: 'Sign up',
    username: 'Username',
    email: 'Email',
    password: 'Password',
    createAccount: 'Create account',
    forgotPassword: 'Forgot password?',
    emailOrUsername: 'Email or Username',
    sendOtp: 'Send OTP',
    otp: 'OTP',
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    resetPassword: 'Reset password',
    activationTitle: 'Activate your account',
    activationButton: 'Activate',
    resendOtp: 'Resend OTP',
    passwordReq: 'Password must be at least 6 characters and contain a number or special character.',
    homeTitle: 'My Home Server',
    welcomeBack: 'Welcome back',
    logout: 'Logout',
  },
  ar: {
    signIn: 'تسجيل الدخول',
    signUp: 'إنشاء حساب',
    username: 'اسم المستخدم',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    createAccount: 'إنشاء حساب',
    forgotPassword: 'نسيت كلمة المرور؟',
    emailOrUsername: 'البريد أو اسم المستخدم',
    sendOtp: 'إرسال رمز',
    otp: 'الرمز',
    newPassword: 'كلمة المرور الجديدة',
    confirmPassword: 'تأكيد كلمة المرور',
    resetPassword: 'إعادة تعيين كلمة المرور',
    activationTitle: 'تفعيل حسابك',
    activationButton: 'تفعيل',
    resendOtp: 'إعادة إرسال الرمز',
    passwordReq: 'يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل ورقم واحد أو رمز خاص.',
    homeTitle: 'خادمي المنزلي',
    welcomeBack: 'مرحباً بعودتك',
    logout: 'تسجيل خروج',
  }
}

const I18nContext = createContext<any>(null)

export function I18nProvider({ children }: any) {
  const [lang, setLang] = useState<string>(() => localStorage.getItem('lang') || 'en')

  useEffect(() => {
    localStorage.setItem('lang', lang)
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  function t(key: string) {
    return translations[lang]?.[key] ?? key
  }

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)

export default I18nContext
